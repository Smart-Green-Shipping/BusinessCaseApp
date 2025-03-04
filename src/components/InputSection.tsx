import React, { useEffect, useState } from 'react';
import { Calculator, Wind, Gauge, Share2 } from 'lucide-react';
import { formatNumber, getWindRewardFactor, getCO2FactorPerTon, isETSExempt } from '../utils';
import type { ShipConfig, ShipType } from '../types';
import { YEARLY_TARGETS } from '../constants';
import { FuelSelect } from './FuelSelect';
import { useFuelData } from '../hooks/useFuelData';

interface InputSectionProps {
  startYear: number;
  setStartYear: (year: number) => void;
  endYear: number;
  setEndYear: (year: number) => void;
  shipConfig: ShipConfig;
  setShipConfig: (config: ShipConfig) => void;
  windSavings: number;
  setWindSavings: (savings: number) => void;
  euExposure: number;
  setEuExposure: (exposure: number) => void;
  fuelPrice: number;
  setFuelPrice: (price: number) => void;
  carbonPrice: number;
  setCarbonPrice: (price: number) => void;
  upfrontCost: number;
  setUpfrontCost: (cost: number) => void;
  yearlyCost: number;
  setYearlyCost: (cost: number) => void;
  mainFuelError?: string;
  auxFuelError?: string;
  handleMainFuelChange: (value: string, co2eq: number, lcv: number) => void;
  handleAuxFuelChange: (value: string, co2eq: number, lcv: number) => void;
  ghgIntensity: number;
  adjustedWindGHGIntensity: number;
}

const inputClasses = "w-full h-10 px-3 bg-ice border border-deep-blue/20 text-deep-blue rounded-md focus:outline-none focus:ring-2 focus:ring-action-green";

export function InputSection({
  startYear,
  setStartYear,
  endYear,
  setEndYear,
  shipConfig,
  setShipConfig,
  windSavings,
  setWindSavings,
  euExposure,
  setEuExposure,
  fuelPrice,
  setFuelPrice,
  carbonPrice,
  setCarbonPrice,
  upfrontCost,
  setUpfrontCost,
  yearlyCost,
  setYearlyCost,
  mainFuelError,
  auxFuelError,
  handleMainFuelChange,
  handleAuxFuelChange,
  ghgIntensity,
  adjustedWindGHGIntensity,
}) {
  const { data: fuelData } = useFuelData();
  const [mainEtsExempt, setMainEtsExempt] = useState(false);
  const [auxEtsExempt, setAuxEtsExempt] = useState(false);
  
  // Find fuel data for main and aux engines
  const mainFuelData = fuelData?.find(fuel => fuel.fuel_name === shipConfig.main.fuel);
  const auxFuelData = fuelData?.find(fuel => fuel.fuel_name === shipConfig.aux.fuel);
  
  // Update ETS exempt status when fuel data changes
  useEffect(() => {
    setMainEtsExempt(mainFuelData?.ets_exempt || false);
    setAuxEtsExempt(auxFuelData?.ets_exempt || false);
  }, [mainFuelData, auxFuelData]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="space-y-4 bg-mist p-6 rounded-lg">
        <h2 className="font-medium text-deep-blue">Engine Configuration</h2>
        <div>
          <label className="block text-sm font-medium text-deep-blue mb-1">
            Start Year
          </label>
          <select
            value={startYear}
            onChange={(e) => setStartYear(parseInt(e.target.value))}
            className={inputClasses}
          >
            {Object.keys(YEARLY_TARGETS)
              .map(year => parseInt(year))
              .filter(year => year <= endYear)
              .map(year => (
                <option key={year} value={year}>{year}</option>
              ))
            }
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-deep-blue mb-1">
            End Year
          </label>
          <select
            value={endYear}
            onChange={(e) => setEndYear(parseInt(e.target.value))}
            className={inputClasses}
          >
            {Object.keys(YEARLY_TARGETS)
              .map(year => parseInt(year))
              .filter(year => year >= startYear)
              .map(year => (
                <option key={year} value={year}>{year}</option>
              ))
            }
          </select>
        </div>
        <FuelSelect
          label="Main Engine Fuel Type"
          value={shipConfig.main.fuel}
          onChange={handleMainFuelChange}
          error={mainFuelError}
        />
        <div>
          <label className="block text-sm font-medium text-deep-blue mb-1">
            Main Engine Consumption (tons/year)
          </label>
          <input
            type="number"
            value={shipConfig.main.consumption}
            onChange={(e) => setShipConfig(prev => ({
              ...prev,
              main: { ...prev.main, consumption: parseFloat(e.target.value) || 0 }
            }))}
            className={inputClasses}
          />
        </div>
        <FuelSelect
          label="Auxiliary Engine Fuel Type"
          value={shipConfig.aux.fuel}
          onChange={handleAuxFuelChange}
          error={auxFuelError}
        />
        <div>
          <label className="block text-sm font-medium text-deep-blue mb-1">
            Auxiliary Engine Consumption (tons/year)
          </label>
          <input
            type="number"
            value={shipConfig.aux.consumption}
            onChange={(e) => setShipConfig(prev => ({
              ...prev,
              aux: { ...prev.aux, consumption: parseFloat(e.target.value) || 0 }
            }))}
            className={inputClasses}
          />
        </div>
      </div>
      
      <div className="space-y-4 bg-mist p-6 rounded-lg">
        <h2 className="font-medium text-deep-blue">Costs & Factors</h2>
        <div>
          <label className="block text-sm font-medium text-deep-blue mb-1">
            Fuel Price (€/ton)
          </label>
          <input
            type="number"
            value={fuelPrice}
            onChange={(e) => setFuelPrice(parseFloat(e.target.value) || 0)}
            className={inputClasses}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-deep-blue mb-1">
            ETS Carbon Price (€/ton CO2)
          </label>
          <input
            type="number"
            value={carbonPrice}
            onChange={(e) => setCarbonPrice(parseFloat(e.target.value) || 0)}
            className={inputClasses}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-deep-blue mb-1">
            Upfront Cost (€)
          </label>
          <input
            type="number"
            value={upfrontCost}
            onChange={(e) => setUpfrontCost(parseFloat(e.target.value) || 0)}
            className={inputClasses}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-deep-blue mb-1">
            Yearly Cost (€)
          </label>
          <input
            type="number"
            value={yearlyCost}
            onChange={(e) => setYearlyCost(parseFloat(e.target.value) || 0)}
            className={inputClasses}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-deep-blue mb-1">
            Wind Savings (%)
          </label>
          <input
            type="number"
            value={windSavings * 100}
            onChange={(e) => setWindSavings(parseFloat(e.target.value) / 100)}
            min="0"
            max="100"
            step="1"
            className={inputClasses}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-deep-blue mb-1">
            EU Time Percentage (%)
          </label>
          <input
            type="number"
            value={euExposure * 100}
            onChange={(e) => setEuExposure(parseFloat(e.target.value) / 100)}
            min="0"
            max="100"
            step="1"
            className={inputClasses}
          />
        </div>
      </div>
      
      <div className="space-y-4 bg-mist p-6 rounded-lg">
        <h2 className="font-medium text-deep-blue">GHG Intensity</h2>
        <div>
          <label className="block text-sm font-medium text-deep-blue mb-1">
            Wind Reward Factor
          </label>
          <input
            type="text"
            value={formatNumber(getWindRewardFactor(windSavings))}
            disabled
            className="w-full h-10 px-3 bg-deep-blue/5 border border-deep-blue/20 text-deep-blue rounded-md"
          />
        </div>
        <div className="space-y-2 bg-deep-blue p-4 rounded-lg">
          <p className="flex justify-between text-ice">
            <span>Base:</span>
            <span className="font-mono">{formatNumber(ghgIntensity)} gCO2eq/MJ</span>
          </p>
          <p className="flex justify-between text-ice">
            <span>With Wind:</span>
            <span className="font-mono">{formatNumber(adjustedWindGHGIntensity)} gCO2eq/MJ</span>
          </p>
          <p className="text-xs text-ice/80 mt-1">Values should be confirmed with fuel supplier</p>
          <div className="mt-4 pt-4 border-t border-ice/20">
            <p className="text-sm font-medium text-ice mb-2">Carbon Factors:</p>
            <p className="flex justify-between text-sm text-ice">
              <span>Main Engine ({shipConfig.main.fuel}):</span>
              <span className="font-mono">{formatNumber(getCO2FactorPerTon(shipConfig.main.fuel))} tonne CO2/tonne</span>
            </p>
            {mainEtsExempt && (
              <p className="text-xs text-ice/80 mt-1">CO2 from biofuels is zero rated for ETS</p>
            )}
            <p className="flex justify-between text-sm text-ice mt-2">
              <span>Aux Engine ({shipConfig.aux.fuel}):</span>
              <span className="font-mono">{formatNumber(getCO2FactorPerTon(shipConfig.aux.fuel))} tonne CO2/tonne</span>
            </p>
            {auxEtsExempt && (
              <p className="text-xs text-ice/80 mt-1">CO2 from biofuels is zero rated for ETS</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
