export const YEARLY_TARGETS: Record<number, number> = {
  2025: 89.3368,
  2026: 89.3368,
  2027: 89.3368,
  2028: 89.3368,
  2029: 89.3368,
  2030: 85.6904,
  2031: 85.6904,
  2032: 85.6904,
  2033: 85.6904,
  2034: 85.6904,
  2035: 77.9418,
  2036: 77.9418,
  2037: 77.9418,
  2038: 77.9418,
  2039: 77.9418,
  2040: 62.9004,
  2041: 62.9004,
  2042: 62.9004,
  2043: 62.9004,
  2044: 62.9004,
  2045: 34.6408,
  2046: 34.6408,
  2047: 34.6408,
  2048: 34.6408,
  2049: 34.6408,
  2050: 18.232
};

export const PENALTY_RATE = 2400; // € per gCO2eq/MJ of deficit
export const VLSFO_ENERGY = 41000; // MJ per metric ton of VLSFO

// CII Reduction Factors per year (from 2019 baseline)
export const CII_REDUCTION_FACTORS: Record<number, number> = {
  2023: 0.05,
  2024: 0.07,
  2025: 0.09,
  2026: 0.11,
  2027: 0.13,
  2028: 0.15,
  2029: 0.17,
  2030: 0.20,
};

// CII Rating Boundaries by ship type
export const CII_RATING_BOUNDARIES = {
  'Tanker': {
    d1: 0.82,
    d2: 0.93,
    d3: 1.08,
    d4: 1.28
  },
  'Bulk Carrier': {
    d1: 0.86,
    d2: 0.94,
    d3: 1.06,
    d4: 1.18
  }
} as const;

// Ship Type Parameters for CII Calculation
export const SHIP_TYPE_PARAMETERS = {
  'Bulk Carrier': {
    a: 4.745,
    c: 0.622,
    maxDWT: 279000
  },
  'Tanker': {
    a: 5.247,
    c: 0.610,
    maxDWT: Infinity
  }
} as const;