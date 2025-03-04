import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, formatPercent, formatNumber } from '../utils';
import type { YearlyResults } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface CostBenefitTabProps {
  calculations: YearlyResults[];
  upfrontCost: number;
  yearlyCost: number;
  startYear: number;
  chartData: any;
  chartOptions: any;
  carbonPrice: number;
}

export function CostBenefitTab({ calculations, upfrontCost, yearlyCost, startYear, chartData, chartOptions, carbonPrice }: CostBenefitTabProps) {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const getYearResult = (targetYear: number) => 
    calculations.find(calc => calc.year === targetYear);

  const years = [2026, 2030, 2035, 2045];
  
  const paybackYear = calculations.find(calc => calc.cumulativeSavings >= (upfrontCost + (calc.year - startYear + 1) * yearlyCost))?.year;
  const totalCosts = calculations.length > 0 
    ? upfrontCost + yearlyCost * (calculations.length)
    : upfrontCost;
  const roi = calculations.length > 0 
    ? (calculations[calculations.length - 1].cumulativeSavings / totalCosts) * 100 
    : 0;

  // Calculate cumulative values for each year
  const calculationsWithCumulative = calculations.map((calc, index) => {
    const rawSavings = calc.fuelSavings + calc.penaltySavings + calc.etsSavings;
    const cumulativeRawSavings = calculations
      .slice(0, index + 1)
      .reduce((sum, c) => sum + c.fuelSavings + c.penaltySavings + c.etsSavings, 0);
    const cumulativeCosts = yearlyCost * (index + 1);
    
    return {
      ...calc,
      rawSavings,
      cumulativeRawSavings,
      cumulativeCosts,
      netCumulative: cumulativeRawSavings - cumulativeCosts,
      baseETSCO2e: calc.baseETSCost / carbonPrice,
      windETSCO2e: calc.windETSCost / carbonPrice
    };
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-mist rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-medium text-deep-blue mb-4">Financial Metrics</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-deep-blue/60">Payback Period</p>
              <p className="text-2xl font-medium text-deep-blue">
                {paybackYear ? `${paybackYear - startYear} years` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-deep-blue/60">Return on Investment</p>
              <p className="text-2xl font-bold text-action-green">
                {formatPercent(roi / 100)}
              </p>
            </div>
          </div>
        </div>
        {years.map(year => {
          const result = calculationsWithCumulative.find(calc => calc.year === year);
          if (!result) return null;
          return (
            <div key={year} className="bg-mist rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-medium text-deep-blue mb-4">Year {year}</h3>
              <div className="space-y-2">
                <p className="text-deep-blue">
                  Annual Savings: <span className="font-bold text-action-green">{formatCurrency(result.totalSavings)}</span>
                </p>
                <p className="text-deep-blue">
                  Net Cumulative: <span className="font-bold text-action-green">{formatCurrency(result.netCumulative)}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {chartData && (
        <div className="bg-mist rounded-lg p-4 shadow-md" style={{ height: '400px' }}>
          <Line 
            data={chartData} 
            options={chartOptions} 
          />
        </div>
      )}

      <div className="bg-mist rounded-lg shadow-md">
        <button
          onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
          className="w-full px-6 py-4 flex items-center justify-between text-lg font-medium text-deep-blue hover:bg-mist/80 transition-colors rounded-lg"
        >
          <span>Yearly Breakdown</span>
          {isBreakdownOpen ? (
            <ChevronUp className="w-5 h-5 text-deep-blue/60" />
          ) : (
            <ChevronDown className="w-5 h-5 text-deep-blue/60" />
          )}
        </button>
        
        {isBreakdownOpen && (
          <div className="p-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-deep-blue/10 text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-deep-blue">Year</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Target</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Base GHG</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Wind GHG</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Base Deficit</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Wind Deficit</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Base Compliance</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Wind Compliance</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Base Mult.</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Wind Mult.</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Base Penalty</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Wind Penalty</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Base ETS</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Wind ETS</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Base ETS CO2e</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Wind ETS CO2e</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Fuel Savings</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Penalty Savings</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">ETS Savings</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Yearly Cost</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Total Savings</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Raw Cumulative</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Cumulative Costs</th>
                  <th className="px-4 py-2 text-right font-medium text-deep-blue">Net Cumulative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-deep-blue/10">
                {calculationsWithCumulative.map((calc, index) => (
                  <tr key={calc.year} className={index % 2 === 0 ? 'bg-ice' : 'bg-mist'}>
                    <td className="px-4 py-2 font-medium text-deep-blue">{calc.year}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatNumber(calc.target)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatNumber(calc.baseGHGIntensity)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatNumber(calc.windGHGIntensity)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatNumber(calc.baseDeficit)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatNumber(calc.windDeficit)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatNumber(calc.baseComplianceBalance || 0)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatNumber(calc.windComplianceBalance || 0)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatNumber(calc.baseMultiplier)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatNumber(calc.windMultiplier)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatCurrency(calc.basePenalty)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatCurrency(calc.windPenalty)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatCurrency(calc.baseETSCost)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatCurrency(calc.windETSCost)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatNumber(calc.baseETSCO2e)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatNumber(calc.windETSCO2e)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatCurrency(calc.fuelSavings)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatCurrency(calc.penaltySavings)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatCurrency(calc.etsSavings)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatCurrency(calc.yearlyCost)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatCurrency(calc.totalSavings)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatCurrency(calc.cumulativeRawSavings)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatCurrency(calc.cumulativeCosts)}</td>
                    <td className="px-4 py-2 text-right text-deep-blue">{formatCurrency(calc.netCumulative)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}