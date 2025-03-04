export interface ShipConfig {
  name: string;
  main: {
    fuel: string;
    consumption: number;
  };
  aux: {
    fuel: string;
    consumption: number;
  };
}

export interface FuelProperties {
  WtT: number;
  TtW: number;
  LCV: number;
}

export interface YearlyResults {
  year: number;
  target: number;
  baseGHGIntensity: number;
  windGHGIntensity: number;
  baseDeficit: number;
  windDeficit: number;
  baseMultiplier: number;
  windMultiplier: number;
  basePenalty: number;
  windPenalty: number;
  baseETSCost: number;
  windETSCost: number;
  fuelSavings: number;
  penaltySavings: number;
  etsSavings: number;
  totalSavings: number;
  yearlyCost: number;
  cumulativeSavings: number;
}

export interface FuelData {
  id: number;
  fuel_name: string;
  co2eq_wtw_gco2eq_per_mj: number;
  lcv_mj_per_gfuel: number;
  gCH4pergFuel: number;
  gN2OpergFuel: number;
  ets_exempt?: boolean;
  created_at?: string;
}

export interface FuelSelectProps {
  label: string;
  value: string;
  onChange: (value: string, co2eq: number, lcv: number) => void;
  error?: string;
}

export type ShipType = 'Bulk Carrier' | 'Tanker';

export interface CIIResults {
  baselineCII: number;
  requiredCII: number;
  attainedCII: number;
  attainedCIIWithWind: number;
  baseRating: 'A' | 'B' | 'C' | 'D' | 'E';
  windRating: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface EmissionsBreakdown {
  co2: {
    baseline: number;
    withWind: number;
    savings: number;
  };
  ch4: {
    baseline: number;
    withWind: number;
    savings: number;
  };
  n2o: {
    baseline: number;
    withWind: number;
    savings: number;
  };
}