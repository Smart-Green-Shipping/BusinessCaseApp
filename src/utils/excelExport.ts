import { utils, writeFile } from 'xlsx';
import type { YearlyResults, ShipConfig, CIIResults } from '../types';
import { formatNumber, formatCurrency, getCO2FactorPerTon } from '../utils';
import { CII_REDUCTION_FACTORS } from '../constants';

interface ExportData {
  calculations: YearlyResults[];
  shipConfig: ShipConfig;
  ciiResults: CIIResults | null;
  inputs: {
    startYear: number;
    endYear: number;
    shipType: string;
    dwt: number;
    distance: number;
    windSavings: number;
    euExposure: number;
    fuelPrice: number;
    carbonPrice: number;
    upfrontCost: number;
    yearlyCost: number;
  };
}

export function exportToExcel(data: ExportData) {
  const workbook = utils.book_new();
  
  // Inputs Sheet
  const inputsData = [
    ['Parameter', 'Value'],
    ['Start Year', data.inputs.startYear],
    ['End Year', data.inputs.endYear],
    ['Ship Type', data.inputs.shipType],
    ['Deadweight Tonnage', data.inputs.dwt],
    ['Distance (nm/year)', data.inputs.distance],
    ['Wind Savings (%)', formatNumber(data.inputs.windSavings * 100)],
    ['EU Time (%)', formatNumber(data.inputs.euExposure * 100)],
    ['Fuel Price (€/ton)', data.inputs.fuelPrice],
    ['Carbon Price (€/ton CO2)', data.inputs.carbonPrice],
    ['Upfront Cost (€)', data.inputs.upfrontCost],
    ['Yearly Cost (€)', data.inputs.yearlyCost],
    [''],
    ['Engine Configuration'],
    ['Main Engine Fuel', data.shipConfig.main.fuel],
    ['Main Engine Consumption (tons/year)', data.shipConfig.main.consumption],
    ['Main Engine CO2 Factor (tonne CO2/tonne fuel)', getCO2FactorPerTon(data.shipConfig.main.fuel)],
    ['Auxiliary Engine Fuel', data.shipConfig.aux.fuel],
    ['Auxiliary Engine Consumption (tons/year)', data.shipConfig.aux.consumption],
    ['Auxiliary Engine CO2 Factor (tonne CO2/tonne fuel)', getCO2FactorPerTon(data.shipConfig.aux.fuel)],
    [''],
    ['GHG Intensities'],
    ['Base GHG Intensity (gCO2eq/MJ)', formatNumber(data.calculations[0]?.baseGHGIntensity || 0)],
    ['Wind-Assisted GHG Intensity (gCO2eq/MJ)', formatNumber(data.calculations[0]?.windGHGIntensity || 0)],
  ];
  const inputsSheet = utils.aoa_to_sheet(inputsData);
  utils.book_append_sheet(workbook, inputsSheet, 'Inputs');

  // Cost Benefit Analysis Sheet
  const cbaHeaders = [
    'Year',
    'Target',
    'Base GHG',
    'Wind GHG',
    'Base Deficit',
    'Wind Deficit',
    'Base Mult.',
    'Wind Mult.',
    'Base Penalty',
    'Wind Penalty',
    'Base ETS',
    'Wind ETS',
    'Fuel Savings',
    'Penalty Savings',
    'ETS Savings',
    'Yearly Cost',
    'Total Savings',
    'Raw Cumulative',
    'Cumulative Costs',
    'Net Cumulative'
  ];

  const cbaData = data.calculations.map(calc => [
    calc.year,
    formatNumber(calc.target),
    formatNumber(calc.baseGHGIntensity),
    formatNumber(calc.windGHGIntensity),
    formatNumber(calc.baseDeficit),
    formatNumber(calc.windDeficit),
    formatNumber(calc.baseMultiplier),
    formatNumber(calc.windMultiplier),
    calc.basePenalty,
    calc.windPenalty,
    calc.baseETSCost,
    calc.windETSCost,
    calc.fuelSavings,
    calc.penaltySavings,
    calc.etsSavings,
    calc.yearlyCost,
    calc.totalSavings,
    calc.cumulativeSavings,
    calc.yearlyCost * (data.calculations.indexOf(calc) + 1),
    calc.cumulativeSavings - (calc.yearlyCost * (data.calculations.indexOf(calc) + 1))
  ]);

  const cbaSheet = utils.aoa_to_sheet([cbaHeaders, ...cbaData]);
  utils.book_append_sheet(workbook, cbaSheet, 'Cost Benefit Analysis');

  // CII Performance Sheet
  if (data.ciiResults) {
    const ciiYearlyData = Array.from({ length: 5 }, (_, i) => {
      const year = data.inputs.startYear + i;
      const reductionFactor = CII_REDUCTION_FACTORS[year] || CII_REDUCTION_FACTORS[2030];
      const requiredCII = data.ciiResults.baselineCII * (1 - reductionFactor);
      const baseRatio = data.ciiResults.attainedCII / requiredCII;
      const windRatio = data.ciiResults.attainedCIIWithWind / requiredCII;

      return [
        year,
        formatNumber(data.ciiResults.baselineCII),
        formatNumber(requiredCII),
        formatNumber(reductionFactor * 100),
        formatNumber(data.ciiResults.attainedCII),
        formatNumber(data.ciiResults.attainedCIIWithWind),
        formatNumber(baseRatio),
        formatNumber(windRatio)
      ];
    });

    const ciiHeaders = [
      'Year',
      'Baseline CII',
      'Required CII',
      'Reduction Factor (%)',
      'Attained CII (Base)',
      'Attained CII (Wind)',
      'Base Ratio',
      'Wind Ratio'
    ];

    const ciiInputs = [
      ['Ship Parameters', ''],
      ['Ship Type', data.inputs.shipType],
      ['Deadweight Tonnage', data.inputs.dwt],
      ['Distance', data.inputs.distance],
      ['Assessment Year', data.inputs.startYear],
      [''],
      ['Current Performance', ''],
      ['Baseline CII', formatNumber(data.ciiResults.baselineCII)],
      ['Required CII', formatNumber(data.ciiResults.requiredCII)],
      ['Attained CII (Base)', formatNumber(data.ciiResults.attainedCII)],
      ['Base Rating', data.ciiResults.baseRating],
      ['Attained CII (Wind)', formatNumber(data.ciiResults.attainedCIIWithWind)],
      ['Wind Rating', data.ciiResults.windRating],
      [''],
      ['Yearly Projections', ''],
    ];

    const ciiSheet = utils.aoa_to_sheet([
      ...ciiInputs,
      ciiHeaders,
      ...ciiYearlyData
    ]);
    utils.book_append_sheet(workbook, ciiSheet, 'CII Performance');
  }

  // Emissions Sheet
  const latestCalc = data.calculations[0];
  if (latestCalc) {
    const baseEmissions = latestCalc.baseETSCost / data.inputs.carbonPrice;
    const windEmissions = latestCalc.windETSCost / data.inputs.carbonPrice;
    
    // Assuming CH4 and N2O emissions based on fuel consumption
    const baseCH4 = data.shipConfig.main.consumption * 0.00006 + data.shipConfig.aux.consumption * 0.00004;
    const baseN2O = data.shipConfig.main.consumption * 0.00002 + data.shipConfig.aux.consumption * 0.00001;
    
    const windCH4 = baseCH4 * (1 - data.inputs.windSavings);
    const windN2O = baseN2O * (1 - data.inputs.windSavings);

    // Calculate CO2e using GWP values (CH4 = 28, N2O = 265)
    const baseCO2e = baseEmissions + (baseCH4 * 28) + (baseN2O * 265);
    const windCO2e = windEmissions + (windCH4 * 28) + (windN2O * 265);

    const emissionsData = [
      ['Emissions Type', 'Base Case', 'Wind-Assisted', 'Reduction', 'Reduction (%)'],
      ['CO2 (tonnes/year)', 
        formatNumber(baseEmissions),
        formatNumber(windEmissions),
        formatNumber(baseEmissions - windEmissions),
        formatNumber((1 - windEmissions/baseEmissions) * 100)
      ],
      ['CH4 (tonnes/year)',
        formatNumber(baseCH4),
        formatNumber(windCH4),
        formatNumber(baseCH4 - windCH4),
        formatNumber((1 - windCH4/baseCH4) * 100)
      ],
      ['N2O (tonnes/year)',
        formatNumber(baseN2O),
        formatNumber(windN2O),
        formatNumber(baseN2O - windN2O),
        formatNumber((1 - windN2O/baseN2O) * 100)
      ],
      ['CO2e (tonnes/year)',
        formatNumber(baseCO2e),
        formatNumber(windCO2e),
        formatNumber(baseCO2e - windCO2e),
        formatNumber((1 - windCO2e/baseCO2e) * 100)
      ]
    ];

    const emissionsSheet = utils.aoa_to_sheet(emissionsData);
    utils.book_append_sheet(workbook, emissionsSheet, 'Emissions');
  }

  // Generate filename with current date/time
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `Wingsail Impact ${timestamp}.xlsx`;

  // Save the file
  writeFile(workbook, filename);
}