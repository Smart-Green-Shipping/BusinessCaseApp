import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useFuelData } from '../hooks/useFuelData';
import type { FuelSelectProps } from '../types';

export function FuelSelect({ label, value, onChange, error }: FuelSelectProps) {
  const { data: fuelOptions, isLoading, error: fetchError } = useFuelData();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedFuel = fuelOptions?.find(fuel => fuel.fuel_name === e.target.value);
    if (selectedFuel) {
      onChange(
        selectedFuel.fuel_name,
        selectedFuel.co2eq_wtw_gco2eq_per_mj,
        selectedFuel.lcv_mj_per_gfuel
      );
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-mist rounded w-3/4 mb-1"></div>
        <div className="h-10 bg-mist rounded"></div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="text-error flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span>Failed to load fuel options</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-deep-blue">
        {label}
      </label>
      <select
        value={value}
        onChange={handleChange}
        className={`w-full h-10 px-3 bg-ice border rounded-md focus:outline-none focus:ring-2 focus:ring-action-green text-deep-blue ${
          error ? 'border-error' : 'border-deep-blue/20'
        }`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${label}-error` : undefined}
      >
        <option value="">Select a fuel</option>
        {fuelOptions?.map(fuel => (
          <option key={fuel.id} value={fuel.fuel_name}>
            {fuel.fuel_name}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-error text-sm" id={`${label}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}