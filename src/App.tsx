import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Calculator, Wind, Gauge, Share2 } from 'lucide-react';
import { calculateGHGIntensity, getWindRewardFactor, calculateETSCost, getCO2FactorPerTon, loadCO2Factors } from './utils';
import { YEARLY_TARGETS, VLSFO_ENERGY, PENALTY_RATE } from './constants';
import type { ShipConfig, YearlyResults, ShipType, CIIResults } from './types';
import { calculateCIIResults } from './utils';
import { InputSection } from './components/InputSection';
import { TabNavigation } from './components/TabNavigation';
import { CostBenefitTab } from './components/CostBenefitTab';
import { CIITab } from './components/CIITab';
import { EmissionsTab } from './components/EmissionsTab';
import { ExportButton } from './components/ExportButton';
import { formatCurrency } from './utils';

// Set this to true during development to show debug info
const SHOW_DEBUG_INFO = false;


const DEFAULT_SHIP: ShipConfig = {
  name: "HMM SGS",
  main: { fuel: 'HFO', consumption: 5000 },
  aux: { fuel: 'MDO', consumption: 200 }
};

const TABS = [
  { id: 'cost-benefit', label: 'Cost-Benefit Analysis', icon: Calculator },
  { id: 'cii', label: 'CII Performance', icon: Gauge },
  { id: 'emissions', label: 'Emissions', icon: Wind }
] as const;

type TabId = typeof TABS[number]['id'];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('cost-benefit');
  const [startYear, setStartYear] = useState(2026);
  const [endYear, setEndYear] = useState(2050);
  const [shipType, setShipType] = useState<ShipType>('Bulk Carrier');
  const [dwt, setDwt] = useState(61000);
  const [distance, setDistance] = useState(40000);
  const [shipConfig, setShipConfig] = useState<ShipConfig>(DEFAULT_SHIP);
  const [windSavings, setWindSavings] = useState(0.20);
  const [euExposure, setEuExposure] = useState(0.5);
  const [fuelPrice, setFuelPrice] = useState(600);
  const [carbonPrice, setCarbonPrice] = useState(65);
  const [upfrontCost, setUpfrontCost] = useState(6000000);
  const [yearlyCost, setYearlyCost] = useState(0);
  const [mainFuelError, setMainFuelError] = useState<string>();
  const [auxFuelError, setAuxFuelError] = useState<string>();
  const [calculations, setCalculations] = useState<YearlyResults[]>([]);
  const [ghgIntensity, setGhgIntensity] = useState(0);
  const [adjustedWindGHGIntensity, setAdjustedWindGHGIntensity] = useState(0);
  const [energyContent, setEnergyContent] = useState(0);
  const [mainCO2Factor, setMainCO2Factor] = useState(0);
  const [auxCO2Factor, setAuxCO2Factor] = useState(0);
  const [ciiResults, setCiiResults] = useState<CIIResults | null>(null);
  const [shareTooltip, setShareTooltip] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Load CO2 factors when component mounts
  useEffect(() => {
    loadCO2Factors();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('startYear')) setStartYear(Number(params.get('startYear')));
    if (params.has('endYear')) setEndYear(Number(params.get('endYear')));
    if (params.has('shipType')) setShipType(params.get('shipType') as ShipType);
    if (params.has('dwt')) setDwt(Number(params.get('dwt')));
    if (params.has('distance')) setDistance(Number(params.get('distance')));
    if (params.has('windSavings')) setWindSavings(Number(params.get('windSavings')));
    if (params.has('euExposure')) setEuExposure(Number(params.get('euExposure')));
    if (params.has('fuelPrice')) setFuelPrice(Number(params.get('fuelPrice')));
    if (params.has('carbonPrice')) setCarbonPrice(Number(params.get('carbonPrice')));
    if (params.has('upfrontCost')) setUpfrontCost(Number(params.get('upfrontCost')));
    if (params.has('yearlyCost')) setYearlyCost(Number(params.get('yearlyCost')));
    if (params.has('mainFuel') && params.has('mainConsumption')) {
      setShipConfig(prev => ({
        ...prev,
        main: {
          fuel: params.get('mainFuel') || prev.main.fuel,
          consumption: Number(params.get('mainConsumption'))
        }
      }));
    }
    if (params.has('auxFuel') && params.has('auxConsumption')) {
      setShipConfig(prev => ({
        ...prev,
        aux: {
          fuel: params.get('auxFuel') || prev.aux.fuel,
          consumption: Number(params.get('auxConsumption'))
        }
      }));
    }
  }, []);

  const handleShare = useCallback(() => {
    const params = new URLSearchParams();
    params.set('startYear', startYear.toString());
    params.set('endYear', endYear.toString());
    params.set('shipType', shipType);
    params.set('dwt', dwt.toString());
    params.set('distance', distance.toString());
    params.set('windSavings', windSavings.toString());
    params.set('euExposure', euExposure.toString());
    params.set('fuelPrice', fuelPrice.toString());
    params.set('carbonPrice', carbonPrice.toString());
    params.set('upfrontCost', upfrontCost.toString());
    params.set('yearlyCost', yearlyCost.toString());
    params.set('mainFuel', shipConfig.main.fuel);
    params.set('mainConsumption', shipConfig.main.consumption.toString());
    params.set('auxFuel', shipConfig.aux.fuel);
    params.set('auxConsumption', shipConfig.aux.consumption.toString());

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareTooltip('URL copied to clipboard!');
      setTimeout(() => setShareTooltip(''), 2000);
    });
  }, [startYear, endYear, shipType, dwt, distance, windSavings, euExposure, fuelPrice, carbonPrice, upfrontCost, yearlyCost, shipConfig]);

  const handleMainFuelChange = useCallback((fuelName: string, co2eq: number, lcv: number) => {
    setMainFuelError(undefined);
    setShipConfig(prev => ({
      ...prev,
      main: { ...prev.main, fuel: fuelName }
    }));
  }, []);

  const handleAuxFuelChange = useCallback((fuelName: string, co2eq: number, lcv: number) => {
    setAuxFuelError(undefined);
    setShipConfig(prev => ({
      ...prev,
      aux: { ...prev.aux, fuel: fuelName }
    }));
  }, []);

  useEffect(() => {
    const updateCIIResults = () => {
      const mainCO2 = shipConfig.main.consumption * getCO2FactorPerTon(shipConfig.main.fuel);
      const auxCO2 = shipConfig.aux.consumption * getCO2FactorPerTon(shipConfig.aux.fuel);
      const totalCO2 = mainCO2 + auxCO2;

      const results = calculateCIIResults(
        shipType,
        dwt,
        startYear,
        totalCO2,
        distance,
        windSavings
      );

      setCiiResults(results);
    };

    updateCIIResults();
  }, [shipType, dwt, startYear, distance, windSavings, shipConfig]);

  useEffect(() => {
    const updateCalculations = async () => {
      // Calculate baseline GHG intensity and energy content
      const { ghgIntensity: baseGHG, energyContent: baseEnergy, mainFuelData, auxFuelData } =
        await calculateGHGIntensity(shipConfig);
  
      setGhgIntensity(baseGHG);
      setEnergyContent(baseEnergy);
  
      if (!mainFuelData || !auxFuelData) return;
  
      setMainCO2Factor(mainFuelData.co2eq_wtw_gco2eq_per_mj);
      setAuxCO2Factor(auxFuelData.co2eq_wtw_gco2eq_per_mj);
  
      // Adjust main engine consumption for wind savings
      const windShipConfig = {
        ...shipConfig,
        main: {
          ...shipConfig.main,
          consumption: shipConfig.main.consumption * (1 - windSavings) // Apply wind savings
        }
      };
  
      // Recalculate GHG intensity and energy content for wind-assisted ship
      const { ghgIntensity: recalculatedWindGHG, energyContent: recalculatedWindEnergy } =
        await calculateGHGIntensity(windShipConfig);
  
      // Apply wind reward factor to recalculate adjusted GHG intensity
      // Apply wind reward factor to recalculate adjusted GHG intensity
      const windRewardFactor = getWindRewardFactor(windSavings);
      const adjustedWindGHGIntensity = recalculatedWindGHG * windRewardFactor;
      setAdjustedWindGHGIntensity(adjustedWindGHGIntensity);

  
      let consecutiveYearsBase = 0;
      let consecutiveYearsWind = 0;
  
      const results = Object.entries(YEARLY_TARGETS)
        .filter(([year]) => {
          const yearNum = parseInt(year);
          return yearNum >= startYear && yearNum <= endYear;
        })
        .map(([year, target]) => {
          const yearNum = parseInt(year);
  
          // Calculate deficits
          const baseDeficit = baseGHG - target;
          const windDeficit = adjustedWindGHGIntensity - target;
  
          // Compliance balances
          const baseComplianceBalance = (target - baseGHG) * baseEnergy * euExposure;
          const windComplianceBalance = (target - adjustedWindGHGIntensity) * recalculatedWindEnergy * euExposure;
  
          // Debug info for first year
          if (yearNum === startYear) {
            setDebugInfo({
              target,
              baseGHG,
              adjustedWindGHGIntensity,
              baseEnergy,
              recalculatedWindEnergy,
              euExposure,
              baseComplianceBalance,
              windComplianceBalance,
              baseDeficit,
              windDeficit
            });
          }
  
          // Penalty calculations with proper multiplier logic
          let basePenalty = 0;
          let baseMultiplier = 1.0;
          if (baseComplianceBalance < 0) {
            consecutiveYearsBase += 1;
            baseMultiplier += Math.max(0, consecutiveYearsBase - 1) * 0.1; // Increment multiplier for consecutive non-compliance years
            basePenalty =
              (Math.abs(baseComplianceBalance) / (baseGHG * VLSFO_ENERGY)) *
              PENALTY_RATE *
              baseMultiplier;
          } else {
            consecutiveYearsBase = 0; // Reset multiplier if compliant
          }
  
          let windPenalty = 0;
          let windMultiplier = 1.0;
          if (windComplianceBalance < 0) {
            consecutiveYearsWind += 1;
            windMultiplier += Math.max(0, consecutiveYearsWind - 1) * 0.1; // Increment multiplier for consecutive non-compliance years
            windPenalty =
              (Math.abs(windComplianceBalance) / (adjustedWindGHGIntensity * VLSFO_ENERGY)) *
              PENALTY_RATE *
              windMultiplier;
          } else {
            consecutiveYearsWind = 0; // Reset multiplier if compliant
          }
  
          // ETS cost calculations
          const baseETSCost = calculateETSCost(
            shipConfig.main.consumption,
            shipConfig.aux.consumption,
            shipConfig.main.fuel,
            shipConfig.aux.fuel,
            carbonPrice,
            euExposure,
            yearNum
          );
  
          const windETSCost = calculateETSCost(
            shipConfig.main.consumption * (1 - windSavings),
            shipConfig.aux.consumption,
            shipConfig.main.fuel,
            shipConfig.aux.fuel,
            carbonPrice,
            euExposure,
            yearNum
          );
  
          // Savings calculations
          const fuelSavings = shipConfig.main.consumption * windSavings * fuelPrice;
          const penaltySavings = basePenalty - windPenalty;
          const etsSavings = baseETSCost - windETSCost;
          const totalSavings = fuelSavings + penaltySavings + etsSavings - yearlyCost;
  
          return {
            year: yearNum,
            target,
            baseGHGIntensity: baseGHG,
            windGHGIntensity: adjustedWindGHGIntensity,
            baseDeficit,
            windDeficit,
            baseMultiplier,
            windMultiplier,
            basePenalty,
            windPenalty,
            baseETSCost,
            windETSCost,
            fuelSavings,
            penaltySavings,
            etsSavings,
            yearlyCost,
            totalSavings,
            cumulativeSavings: 0, // Cumulative savings will be calculated below
            baseComplianceBalance,
            windComplianceBalance
          };
        });
  
      // Calculate cumulative savings over the years
      let cumulative = 0;
      results.forEach(result => {
        cumulative += result.totalSavings;
        result.cumulativeSavings = cumulative;
      });
  
      setCalculations(results);
    };
  
    updateCalculations();
  }, [shipConfig, windSavings, euExposure, fuelPrice, startYear, endYear, carbonPrice, yearlyCost]);
  

  const savingsChartData = useMemo(() => {
    if (!calculations.length) return null;

    return {
      labels: calculations.map(calc => calc.year.toString()),
      datasets: [
        {
          label: 'Cumulative Savings',
          data: calculations.map(calc => calc.cumulativeSavings),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          tension: 0,
          pointRadius: 0,
          borderWidth: 2
        },
        {
          label: 'Total Cost',
          data: calculations.map((_, index) => upfrontCost + (yearlyCost * (index + 1))),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          borderDash: [5, 5],
          pointRadius: 0,
          borderWidth: 2
        }
      ]
    };
  }, [calculations, upfrontCost, yearlyCost]);

  const emissionsChartData = useMemo(() => {
    if (!calculations.length) return null;

    return {
      labels: calculations.map(calc => calc.year.toString()),
      datasets: [
        {
          label: 'Baseline Emissions',
          data: calculations.map(calc => calc.baseETSCost / carbonPrice),
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1
        },
        {
          label: 'Wind-Assisted Emissions',
          data: calculations.map(calc => calc.windETSCost / carbonPrice),
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1
        }
      ]
    };
  }, [calculations, carbonPrice]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Cumulative Savings vs Total Cost',
        padding: 20,
        color: 'rgb(32, 42, 68)'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => formatCurrency(value),
          color: 'rgb(32, 42, 68)'
        },
        grid: {
          color: 'rgba(32, 42, 68, 0.1)'
        }
      },
      x: {
        ticks: {
          color: 'rgb(32, 42, 68)'
        },
        grid: {
          color: 'rgba(32, 42, 68, 0.1)'
        }
      }
    }
  }), []);

  const emissionsChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Annual CO2 Emissions',
        padding: 20,
        color: 'rgb(32, 42, 68)'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Tonnes CO2',
          color: 'rgb(32, 42, 68)'
        },
        ticks: {
          color: 'rgb(32, 42, 68)'
        },
        grid: {
          color: 'rgba(32, 42, 68, 0.1)'
        }
      },
      x: {
        ticks: {
          color: 'rgb(32, 42, 68)'
        },
        grid: {
          color: 'rgba(32, 42, 68, 0.1)'
        }
      }
    }
  }), []);

  return (
    <div className="min-h-screen bg-ice p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-ice rounded-lg p-8 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <img 
                src="https://jvxtnyhhllovehvpqfqy.supabase.co/storage/v1/object/sign/Brand/White%20Horizontal%20Stack.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJCcmFuZC9XaGl0ZSBIb3Jpem9udGFsIFN0YWNrLnBuZyIsImlhdCI6MTc0MDA0MjE5OSwiZXhwIjoyMDU1NDAyMTk5fQ.v_zdarncxH4upuAcg-WRJDAHK3ltFNEhW5iU2VnC0Zo"
                alt="Logo"
                className="h-12"
              />
              <h1 className="text-2xl font-medium text-deep-blue">FastRig Buisness Case Builder</h1>
            </div>
            <div className="flex items-center gap-4">
              <ExportButton
                calculations={calculations}
                shipConfig={shipConfig}
                ciiResults={ciiResults}
                inputs={{
                  startYear,
                  endYear,
                  shipType,
                  dwt,
                  distance,
                  windSavings,
                  euExposure,
                  fuelPrice,
                  carbonPrice,
                  upfrontCost,
                  yearlyCost
                }}
              />
              <div className="relative">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 bg-action-green text-ice rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                {shareTooltip && (
                  <div className="absolute right-0 top-full mt-2 px-3 py-1 bg-deep-blue text-ice text-sm rounded shadow-lg whitespace-nowrap">
                    {shareTooltip}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <InputSection
            startYear={startYear}
            setStartYear={setStartYear}
            endYear={endYear}
            setEndYear={setEndYear}
            shipConfig={shipConfig}
            setShipConfig={setShipConfig}
            windSavings={windSavings}
            setWindSavings={setWindSavings}
            euExposure={euExposure}
            setEuExposure={setEuExposure}
            fuelPrice={fuelPrice}
            setFuelPrice={setFuelPrice}
            carbonPrice={carbonPrice}
            setCarbonPrice={setCarbonPrice}
            upfrontCost={upfrontCost}
            setUpfrontCost={setUpfrontCost}
            yearlyCost={yearlyCost}
            setYearlyCost={setYearlyCost}
            mainFuelError={mainFuelError}
            auxFuelError={auxFuelError}
            handleMainFuelChange={handleMainFuelChange}
            handleAuxFuelChange={handleAuxFuelChange}
            ghgIntensity={ghgIntensity}
            ghgIntensity={ghgIntensity}
            adjustedWindGHGIntensity={adjustedWindGHGIntensity}
          />

          {debugInfo && SHOW_DEBUG_INFO && (
            <div className="mb-4 p-4 bg-deep-blue/5 rounded-lg text-xs font-mono">
              <h3 className="font-bold mb-2">Debug Info (First Year):</h3>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}

          <div className="border-t border-deep-blue/10 pt-8">
            <TabNavigation
              tabs={TABS}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <div className="mt-6">
              {activeTab === 'cost-benefit' && (
                <CostBenefitTab
                  calculations={calculations}
                  upfrontCost={upfrontCost}
                  yearlyCost={yearlyCost}
                  startYear={startYear}
                  chartData={savingsChartData}
                  chartOptions={chartOptions}
                  carbonPrice={carbonPrice}
                />
              )}
              {activeTab === 'cii' && (
                <CIITab
                  ciiResults={ciiResults}
                  shipType={shipType}
                  setShipType={setShipType}
                  dwt={dwt}
                  setDwt={setDwt}
                  distance={distance}
                  setDistance={setDistance}
                  startYear={startYear}
                />
              )}
              {activeTab === 'emissions' && (
                <EmissionsTab
                  calculations={calculations}
                  carbonPrice={carbonPrice}
                  chartData={emissionsChartData}
                  chartOptions={emissionsChartOptions}
                  shipConfig={shipConfig}
                  windSavings={windSavings}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;