import React from 'react';
import { formatNumber, formatPercent, getCO2FactorPerTon } from '../utils';
import type { YearlyResults, EmissionsBreakdown, ShipConfig } from '../types';
import { useFuelData } from '../hooks/useFuelData';

interface EmissionsTabProps {
  calculations: YearlyResults[];
  carbonPrice: number;
  chartData: any;
  chartOptions: any;
  shipConfig: ShipConfig;
  windSavings: number;
}

function formatEmissionValue(value: number): string {
  if (value < 100) {
    return formatNumber(value);
  }
  return Math.round(value).toLocaleString();
}

function formatMillions(value: number): string {
  return `${(value / 1000000).toFixed(1)} million`;
}

function calculateEmissionsBreakdown(
  calculations: YearlyResults[],
  windSavings: number,
  shipConfig: ShipConfig,
  fuelData: Record<string, { gCH4pergFuel: number; gN2OpergFuel: number; ets_exempt: boolean }> | null
): EmissionsBreakdown {
  const mainCO2 = shipConfig.main.consumption * getCO2FactorPerTon(shipConfig.main.fuel);
  const auxCO2 = shipConfig.aux.consumption * getCO2FactorPerTon(shipConfig.aux.fuel);
  const baseCO2 = mainCO2 + auxCO2;
  const windCO2 = (mainCO2 * (1 - windSavings)) + auxCO2;

  let mainCH4 = 0;
  let mainN2O = 0;
  let auxCH4 = 0;
  let auxN2O = 0;

  if (fuelData) {
    const mainFuelData = fuelData[shipConfig.main.fuel];
    const auxFuelData = fuelData[shipConfig.aux.fuel];

    if (mainFuelData) {
      mainCH4 = mainFuelData.gCH4pergFuel * shipConfig.main.consumption; // Already in correct units
      mainN2O = mainFuelData.gN2OpergFuel * shipConfig.main.consumption; // Already in correct units
    }

    if (auxFuelData) {
      auxCH4 = auxFuelData.gCH4pergFuel * shipConfig.aux.consumption; // Already in correct units
      auxN2O = auxFuelData.gN2OpergFuel * shipConfig.aux.consumption; // Already in correct units
    }
  }
  
  const baseCH4 = mainCH4 + auxCH4;
  const baseN2O = mainN2O + auxN2O;
  
  // Apply wind savings only to main engine emissions
  const windCH4 = (mainCH4 * (1 - windSavings)) + auxCH4;
  const windN2O = (mainN2O * (1 - windSavings)) + auxN2O;
  
  return {
    co2: {
      baseline: baseCO2,
      withWind: windCO2,
      savings: baseCO2 - windCO2
    },
    ch4: {
      baseline: baseCH4,
      withWind: windCH4,
      savings: baseCH4 - windCH4
    },
    n2o: {
      baseline: baseN2O,
      withWind: windN2O,
      savings: baseN2O - windN2O
    }
  };
}

function CO2EquivalentFacts({ totalSavings }: { totalSavings: number }) {
  const trees = Math.round(totalSavings / 0.022);
  const forestHectares = Math.round(trees / 1250);
  const forestAcres = Math.round(forestHectares * 2.471);
  const homes = Math.round(totalSavings / 7.88);
  const milesDriven = Math.round(totalSavings * 4600);
  const earthCircumnavigations = Math.round(milesDriven / 24901);
  const seaIceMelt = Math.round(totalSavings * 0.3);

  return (
    <div className="mt-8 bg-mist rounded-lg p-6 shadow-md">
      <h3 className="text-lg font-medium text-deep-blue mb-4">Environmental Impact Equivalents</h3>
      <p className="text-sm text-deep-blue mb-4">
        The annual CO₂e savings of <span className="font-bold">{formatNumber(totalSavings)}</span> tonnes is equivalent to:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-4 bg-action-green/10 border border-action-green/20 rounded-lg">
            <h4 className="font-medium text-deep-blue mb-2">Forest Equivalent</h4>
            <p className="text-deep-blue">
              The annual carbon sequestration capacity of about <span className="font-bold text-action-green">{trees.toLocaleString()}</span> mature oak trees, 
              or a forest covering approximately <span className="font-bold text-action-green">{forestHectares.toLocaleString()}</span> hectares 
              (<span className="font-bold text-action-green">{forestAcres.toLocaleString()}</span> acres).
            </p>
          </div>
          <div className="p-4 bg-marine/10 border border-marine/20 rounded-lg">
            <h4 className="font-medium text-deep-blue mb-2">Home Energy Use</h4>
            <p className="text-deep-blue">
              The annual energy use (electricity and heating) of approximately <span className="font-bold text-marine">{homes.toLocaleString()}</span> average 
              homes in Europe.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-pebble/50 border border-pebble rounded-lg">
            <h4 className="font-medium text-deep-blue mb-2">Car Travel</h4>
            <p className="text-deep-blue">
              Driving a gasoline-powered car for approximately <span className="font-bold text-error">{formatMillions(milesDriven)}</span> miles, 
              equivalent to circling the Earth <span className="font-bold text-error">{earthCircumnavigations.toLocaleString()}</span> times.
            </p>
          </div>
          <div className="p-4 bg-marine/10 border border-marine/20 rounded-lg">
            <h4 className="font-medium text-deep-blue mb-2">Arctic Impact</h4>
            <p className="text-deep-blue">
              Preventing the melting of approximately <span className="font-bold text-marine">{seaIceMelt.toLocaleString()}</span> square meters of Arctic 
              sea ice each year, helping preserve habitat for polar species.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmissionsTab({ calculations, carbonPrice, chartData, chartOptions, shipConfig, windSavings }: EmissionsTabProps) {
  const { data: fuelDataArray } = useFuelData();
  
  const fuelData = fuelDataArray?.reduce((acc, fuel) => ({
    ...acc,
    [fuel.fuel_name]: {
      gCH4pergFuel: fuel.gCH4pergFuel,
      gN2OpergFuel: fuel.gN2OpergFuel,
      ets_exempt: fuel.ets_exempt || false
    }
  }), {});

  const latestCalc = calculations[calculations.length - 1];

  const emissionsBreakdown = calculateEmissionsBreakdown(
    calculations,
    windSavings,
    shipConfig,
    fuelData
  );

  const EmissionsCard = ({ title, baseline, withWind, savings }: { 
    title: string;
    baseline: number;
    withWind: number;
    savings: number;
  }) => (
    <div className="bg-mist rounded-lg p-6 shadow-md">
      <h3 className="text-lg font-medium text-deep-blue mb-4">{title}</h3>
      <div className="space-y-3">
        <div>
          <p className="text-sm text-deep-blue/60">Annual Baseline Emissions</p>
          <p className="text-xl font-medium text-deep-blue">{formatEmissionValue(baseline)} tonnes/year</p>
        </div>
        <div>
          <p className="text-sm text-deep-blue/60">Annual With Wind System</p>
          <p className="text-xl font-medium text-deep-blue">{formatEmissionValue(withWind)} tonnes/year</p>
        </div>
        <div>
          <p className="text-sm text-deep-blue/60">Annual Savings</p>
          <p className="text-xl font-bold text-action-green">
            {formatEmissionValue(savings)} tonnes/year
            <span className="text-sm ml-2">
              ({formatPercent(savings / baseline)} reduction)
            </span>
          </p>
        </div>
      </div>
    </div>
  );

  if (!latestCalc) return null;

  // Calculate CO2e using GWP values (CH4 = 28, N2O = 265)
  const totalCO2eSavings = 
    emissionsBreakdown.co2.savings + 
    (emissionsBreakdown.ch4.savings * 28) + // Apply GWP
    (emissionsBreakdown.n2o.savings * 265); // Apply GWP

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <EmissionsCard
          title="CO₂ Emissions"
          baseline={emissionsBreakdown.co2.baseline}
          withWind={emissionsBreakdown.co2.withWind}
          savings={emissionsBreakdown.co2.savings}
        />
        <EmissionsCard
          title="CH₄ Emissions"
          baseline={emissionsBreakdown.ch4.baseline} // Already in correct units
          withWind={emissionsBreakdown.ch4.withWind} // Already in correct units
          savings={emissionsBreakdown.ch4.savings} // Already in correct units
        />
        <EmissionsCard
          title="N₂O Emissions"
          baseline={emissionsBreakdown.n2o.baseline} // Already in correct units
          withWind={emissionsBreakdown.n2o.withWind} // Already in correct units
          savings={emissionsBreakdown.n2o.savings} // Already in correct units
        />
      </div>
      
      <div className="bg-mist rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-medium text-deep-blue mb-4">Total Annual GHG Impact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-deep-blue/60">Annual CO₂e Savings</p>
            <p className="text-2xl font-bold text-action-green">
              {formatEmissionValue(totalCO2eSavings)} tonnes CO₂e/year
            </p>
          </div>
        </div>
      </div>

      <CO2EquivalentFacts totalSavings={totalCO2eSavings} />
    </div>
  );
}