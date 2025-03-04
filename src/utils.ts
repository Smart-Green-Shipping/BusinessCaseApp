import { supabase } from './supabase';
import { YEARLY_TARGETS, VLSFO_ENERGY, CII_REDUCTION_FACTORS, CII_RATING_BOUNDARIES, SHIP_TYPE_PARAMETERS } from './constants';
import type { ShipConfig, ShipType, CIIResults } from './types';

// This will be populated from the database
let CO2_FACTORS: Record<string, number> = {
  'HFO': 3.114,  // Default values until loaded from database
  'MDO': 3.206
};

// Load CO2 factors from database
export const loadCO2Factors = async () => {
  const { data, error } = await supabase
    .from('fuel_data')
    .select('fuel_name, gCO2pergFuel');
  
  if (error || !data) {
    console.error('Failed to load CO2 factors:', error);
    return;
  }
  
  // Update CO2_FACTORS with database values
  data.forEach(fuel => {
    CO2_FACTORS[fuel.fuel_name] = fuel.gCO2pergFuel;
  });
  
  console.log('CO2 factors loaded from database:', CO2_FACTORS);
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
  
  // Update CO2_FACTORS with the values from the database
  CO2_FACTORS[ship.main.fuel] = mainFuelData.gCO2pergFuel;
  CO2_FACTORS[ship.aux.fuel] = auxFuelData.gCO2pergFuel;
  
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
  // Get fuel data from database
  const getFuelData = async (fuelName: string) => {
    const { data, error } = await supabase
      .from('fuel_data')
      .select('*')
      .eq('fuel_name', fuelName)
      .single();
    
    if (error || !data) {
      console.error('Fuel data not found:', fuelName, error);
      return null;
    }
    
    return data;
  };

  // Calculate CO2e emissions including CH4 and N2O
  const calculateCO2e = (consumption: number, fuelData: any) => {
    if (!fuelData) return 0;
    
    const co2Factor = CO2_FACTORS[fuelData.fuel_name] || 3.114;
    const co2Emissions = consumption * co2Factor;
    
    // CH4 has a GWP of 28, N2O has a GWP of 265
    const ch4Emissions = consumption * fuelData.gCH4pergFuel * 28;
    const n2oEmissions = consumption * fuelData.gN2OpergFuel * 265;
    
    // For ETS exempt fuels, don't count the CO2 emissions, but still count CH4 and N2O
    const etsExempt = fuelData.ets_exempt || false;
    const etsCO2 = etsExempt ? 0 : co2Emissions;
    
    return etsCO2 + ch4Emissions + n2oEmissions;
  };

  // Use a synchronous approach with predefined CO2 factors for now
  // This will be enhanced when we have the full fuel data
  const mainCO2Factor = CO2_FACTORS[mainFuel] || 3.114; // Default to HFO if not found
  const auxCO2Factor = CO2_FACTORS[auxFuel] || 3.206; // Default to MDO if not found

  // Check if fuels are ETS exempt
  const isMainEtsExempt = ['Bio-Methanol', 'Bio-diesel', 'Ethanol'].includes(mainFuel);
  const isAuxEtsExempt = ['Bio-Methanol', 'Bio-diesel', 'Ethanol'].includes(auxFuel);

  // Calculate CO2 emissions (tonnes)
  const mainCO2 = isMainEtsExempt ? 0 : mainConsumption * mainCO2Factor;
  const auxCO2 = isAuxEtsExempt ? 0 : auxConsumption * auxCO2Factor;

  // Add CH4 and N2O emissions (CO2e)
  // Approximate values for demonstration
  const mainCH4 = mainConsumption * (mainFuel === 'LNG' ? 0.00185 : 0.00006) * 28;
  const mainN2O = mainConsumption * 0.00002 * 265;
  const auxCH4 = auxConsumption * 0.00004 * 28;
  const auxN2O = auxConsumption * 0.00001 * 265;

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
  
  // If the factor is undefined or null, return a default value
  if (factor === undefined || factor === null) {
    console.warn(`No CO2 factor found for fuel: ${fuelName}, using default`);
    return fuelName.toLowerCase().includes('bio') ? 3.206 : 3.114;
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
