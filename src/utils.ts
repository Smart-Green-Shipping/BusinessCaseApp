import { supabase } from './supabase';
import { YEARLY_TARGETS, VLSFO_ENERGY, CII_REDUCTION_FACTORS, CII_RATING_BOUNDARIES, SHIP_TYPE_PARAMETERS } from './constants';
import type { ShipConfig, ShipType, CIIResults } from './types';

// These will be populated from the database
let CO2_FACTORS: Record<string, number> = {};
let ETS_EXEMPT_FUELS: Record<string, boolean> = {};
let CH4_FACTORS: Record<string, number> = {};
let N2O_FACTORS: Record<string, number> = {};

// Load factors from database
export const loadCO2Factors = async () => {
  const { data, error } = await supabase
    .from('fuel_data')
    .select('fuel_name, gCO2pergFuel, ets_exempt, gCH4pergFuel, gN2OpergFuel');
  
  if (error || !data) {
    console.error('Failed to load fuel factors:', error);
    return;
  }
  
  // Update factors with database values
  data.forEach(fuel => {
    CO2_FACTORS[fuel.fuel_name] = fuel.gCO2pergFuel;
    CH4_FACTORS[fuel.fuel_name] = fuel.gCH4pergFuel;
    N2O_FACTORS[fuel.fuel_name] = fuel.gN2OpergFuel;
    
    if (fuel.ets_exempt) {
      ETS_EXEMPT_FUELS[fuel.fuel_name] = true;
    }
  });
  
  console.log('Fuel factors loaded from database:', {
    CO2: CO2_FACTORS,
    CH4: CH4_FACTORS,
    N2O: N2O_FACTORS,
    ETSExempt: ETS_EXEMPT_FUELS
  });
};

export const calculateGHGIntensity = async (ship: ShipConfig) => {
  // Convert fuel consumption to grams
  const mainConsumpG = ship.main.consumption * 1e6;
  const auxConsumpG = ship.aux.consumption * 1e6;
  
  // Get fuel properties from database
  const { data: mainFuelData, error: mainError } = await supabase
    .from('fuel_data')
    .select('*')
    .eq('fuel_name', ship.main.fuel)
    .single();
    
  const { data: auxFuelData, error: auxError } = await supabase
    .from('fuel_data')
    .select('*')
    .eq('fuel_name', ship.aux.fuel)
    .single();
  
  if (mainError || auxError || !mainFuelData || !auxFuelData) {
    console.error('Fuel type not found:', { main: ship.main.fuel, aux: ship.aux.fuel });
    return { ghgIntensity: 0, energyContent: 0, mainFuelData: null, auxFuelData: null };
  }
  
  // Update factors with the values from the database
  CO2_FACTORS[ship.main.fuel] = mainFuelData.gCO2pergFuel;
  CO2_FACTORS[ship.aux.fuel] = auxFuelData.gCO2pergFuel;
  CH4_FACTORS[ship.main.fuel] = mainFuelData.gCH4pergFuel;
  CH4_FACTORS[ship.aux.fuel] = auxFuelData.gCH4pergFuel;
  N2O_FACTORS[ship.main.fuel] = mainFuelData.gN2OpergFuel;
  N2O_FACTORS[ship.aux.fuel] = auxFuelData.gN2OpergFuel;
  
  // Update ETS_EXEMPT_FUELS
  if (mainFuelData.ets_exempt) {
    ETS_EXEMPT_FUELS[ship.main.fuel] = true;
  }
  if (auxFuelData.ets_exempt) {
    ETS_EXEMPT_FUELS[ship.aux.fuel] = true;
  }
  
  // Calculate energy content (MJ)
  const mainEnergy = mainConsumpG * mainFuelData.lcv_mj_per_gfuel;
  const auxEnergy = auxConsumpG * auxFuelData.lcv_mj_per_gfuel;
  const totalEnergy = mainEnergy + auxEnergy;
  
  // Calculate emissions
  const mainEmissions = mainEnergy * mainFuelData.co2eq_wtw_gco2eq_per_mj;
  const auxEmissions = auxEnergy * auxFuelData.co2eq_wtw_gco2eq_per_mj;
  const totalEmissions = mainEmissions + auxEmissions;
  
  return {
    ghgIntensity: totalEmissions / totalEnergy,
    energyContent: totalEnergy,
    mainFuelData,
    auxFuelData
  };
};

export const getWindRewardFactor = (windSavings: number) => {
  if (windSavings >= 0.15) return 0.95;
  if (windSavings >= 0.10) return 0.97;
  if (windSavings >= 0.05) return 0.99;
  return 1.0;
};

export const calculateETSCost = (
  mainConsumption: number,
  auxConsumption: number,
  mainFuel: string,
  auxFuel: string,
  carbonPrice: number,
  euExposure: number,
  year: number
) => {
  // Get CO2 factors from the database cache
  const mainCO2Factor = CO2_FACTORS[mainFuel];
  const auxCO2Factor = CO2_FACTORS[auxFuel];

  // Get CH4 and N2O factors from the database cache
  const mainCH4Factor = CH4_FACTORS[mainFuel];
  const mainN2OFactor = N2O_FACTORS[mainFuel];
  const auxCH4Factor = CH4_FACTORS[auxFuel];
  const auxN2OFactor = N2O_FACTORS[auxFuel];

  // Check if fuels are ETS exempt
  const isMainEtsExempt = ETS_EXEMPT_FUELS[mainFuel] || false;
  const isAuxEtsExempt = ETS_EXEMPT_FUELS[auxFuel] || false;

  // Calculate CO2 emissions (tonnes) - zero for ETS exempt fuels
  const mainCO2 = isMainEtsExempt ? 0 : mainConsumption * mainCO2Factor;
  const auxCO2 = isAuxEtsExempt ? 0 : auxConsumption * auxCO2Factor;

  // Add CH4 and N2O emissions (CO2e) - these always count for ETS
  // CH4 has a GWP of 28, N2O has a GWP of 265
  const mainCH4 = mainConsumption * mainCH4Factor * 28;
  const mainN2O = mainConsumption * mainN2OFactor * 265;
  const auxCH4 = auxConsumption * auxCH4Factor * 28;
  const auxN2O = auxConsumption * auxN2OFactor * 265;

  const totalCO2e = mainCO2 + auxCO2 + mainCH4 + mainN2O + auxCH4 + auxN2O;

  // Apply 70% rate for 2025
  const yearRate = year === 2025 ? 0.7 : 1.0;
  
  return totalCO2e * carbonPrice * euExposure * yearRate;
};

export const formatCurrency = (value: number) => 
  new Intl.NumberFormat('en-EU', { 
    style: 'currency', 
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.floor(value / 1000) * 1000);

export const formatPercent = (value: number) =>
  new Intl.NumberFormat('en-EU', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-EU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export const getCO2FactorPerTon = (fuelName: string): number => {
  // Always return the actual CO2 factor, regardless of ETS exemption status
  // This ensures we display the correct carbon factor in the UI
  const factor = CO2_FACTORS[fuelName];
  
  // If the factor is undefined or null, return 0
  if (factor === undefined || factor === null) {
    console.warn(`No CO2 factor found for fuel: ${fuelName}`);
    return 0;
  }
  
  return factor;
};

export const calculateBaselineCII = (shipType: ShipType, dwt: number): number => {
  const params = SHIP_TYPE_PARAMETERS[shipType];
  const cappedDWT = Math.min(dwt, params.maxDWT);
  return params.a * Math.pow(cappedDWT, -params.c) * 1000;
};

export const getReductionFactor = (year: number): number => {
  if (year < 2023) return 0;
  if (year > 2030) return CII_REDUCTION_FACTORS[2030];
  return CII_REDUCTION_FACTORS[year] || CII_REDUCTION_FACTORS[2030];
};

export const calculateRequiredCII = (shipType: ShipType, dwt: number, year: number): number => {
  const baselineCII = calculateBaselineCII(shipType, dwt);
  const reductionFactor = getReductionFactor(year);
  return baselineCII * (1 - reductionFactor);
};

export const calculateAttainedCII = (
  co2Emissions: number,
  dwt: number,
  distance: number,
  windSavings: number = 0
): number => {
  const adjustedCO2 = co2Emissions * (1 - windSavings);
  const transportWork = dwt * distance / 1000000; // Convert to million tonne-nautical miles
  return adjustedCO2 / transportWork; // CO2 is already in tonnes
};

export const getCIIRating = (attainedCII: number, requiredCII: number, shipType: ShipType): 'A' | 'B' | 'C' | 'D' | 'E' => {
  const boundaries = CII_RATING_BOUNDARIES[shipType];
  const ratio = attainedCII / requiredCII;
  
  if (ratio <= boundaries.d1) return 'A';
  if (ratio <= boundaries.d2) return 'B';
  if (ratio <= boundaries.d3) return 'C';
  if (ratio <= boundaries.d4) return 'D';
  return 'E';
};

export const calculateCIIResults = (
  shipType: ShipType,
  dwt: number,
  year: number,
  co2Emissions: number,
  distance: number,
  windSavings: number
): CIIResults => {
  const baselineCII = calculateBaselineCII(shipType, dwt);
  const requiredCII = calculateRequiredCII(shipType, dwt, year);
  const attainedCII = calculateAttainedCII(co2Emissions, dwt, distance);
  const attainedCIIWithWind = calculateAttainedCII(co2Emissions, dwt, distance, windSavings);

  return {
    baselineCII,
    requiredCII,
    attainedCII,
    attainedCIIWithWind,
    baseRating: getCIIRating(attainedCII, requiredCII, shipType),
    windRating: getCIIRating(attainedCIIWithWind, requiredCII, shipType)
  };
};

// Function to check if a fuel is ETS exempt
export const isETSExempt = async (fuelName: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('fuel_data')
    .select('ets_exempt')
    .eq('fuel_name', fuelName)
    .single();
  
  if (error || !data) {
    console.error('Error checking ETS exempt status:', error);
    return false;
  }
  
  return data.ets_exempt || false;
};
