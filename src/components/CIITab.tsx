import React from 'react';
import { formatNumber, getCIIRating } from '../utils';
import type { CIIResults, ShipType } from '../types';
import { CII_REDUCTION_FACTORS } from '../constants';

const CII_RATING_COLORS = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-green-50 text-green-600',
  C: 'bg-yellow-100 text-yellow-800',
  D: 'bg-orange-100 text-orange-800',
  E: 'bg-red-100 text-red-800'
} as const;

interface CIITabProps {
  ciiResults: CIIResults | null;
  shipType: ShipType;
  setShipType: (type: ShipType) => void;
  dwt: number;
  setDwt: (dwt: number) => void;
  distance: number;
  setDistance: (distance: number) => void;
  startYear: number;
}

export function CIITab({ 
  ciiResults,
  shipType,
  setShipType,
  dwt,
  setDwt,
  distance,
  setDistance,
  startYear
}: CIITabProps) {
  if (!ciiResults) return null;

  // Generate yearly data from start year to 2030
  const yearlyData = [];
  for (let year = startYear; year <= 2030; year++) {
    const reductionFactor = CII_REDUCTION_FACTORS[year] || CII_REDUCTION_FACTORS[2030];
    const requiredCII = ciiResults.baselineCII * (1 - reductionFactor);
    const baseRatio = ciiResults.attainedCII / requiredCII;
    const windRatio = ciiResults.attainedCIIWithWind / requiredCII;
    
    yearlyData.push({
      year,
      requiredCII,
      baseRatio,
      windRatio,
      baseRating: getCIIRating(ciiResults.attainedCII, requiredCII, shipType),
      windRating: getCIIRating(ciiResults.attainedCIIWithWind, requiredCII, shipType)
    });
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-4">Ship Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ship Type
            </label>
            <select
              value={shipType}
              onChange={(e) => setShipType(e.target.value as ShipType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Bulk Carrier">Bulk Carrier</option>
              <option value="Tanker">Tanker</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadweight Tonnage (DWT)
            </label>
            <input
              type="number"
              value={dwt}
              onChange={(e) => setDwt(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Distance Traveled (nm/year)
            </label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assessment Year
            </label>
            <input
              type="number"
              value={startYear}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-4">Current CII Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600">Baseline CII</p>
            <p className="text-2xl font-bold">{formatNumber(ciiResults.baselineCII)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Attained CII (Base)</p>
            <div className={`mt-1 px-3 py-1 rounded-full inline-block ${CII_RATING_COLORS[yearlyData[0].baseRating]}`}>
              {formatNumber(ciiResults.attainedCII)} (Rating {yearlyData[0].baseRating})
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Attained CII (Wind)</p>
            <div className={`mt-1 px-3 py-1 rounded-full inline-block ${CII_RATING_COLORS[yearlyData[0].windRating]}`}>
              {formatNumber(ciiResults.attainedCIIWithWind)} (Rating {yearlyData[0].windRating})
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-md overflow-x-auto">
        <h3 className="text-lg font-semibold mb-4">CII Projections (2026-2030)</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Required CII</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Base Ratio</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Base Rating</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Wind Ratio</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Wind Rating</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {yearlyData.map((data, index) => (
              <tr key={data.year} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {data.year}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatNumber(data.requiredCII)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatNumber(data.baseRatio)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className={`px-2 py-1 rounded-full ${CII_RATING_COLORS[data.baseRating]}`}>
                    {data.baseRating}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatNumber(data.windRatio)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className={`px-2 py-1 rounded-full ${CII_RATING_COLORS[data.windRating]}`}>
                    {data.windRating}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}