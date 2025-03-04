import React from 'react';
import { Download } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';
import type { YearlyResults, ShipConfig, CIIResults } from '../types';

interface ExportButtonProps {
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

export function ExportButton({ calculations, shipConfig, ciiResults, inputs }: ExportButtonProps) {
  const handleExport = () => {
    exportToExcel({
      calculations,
      shipConfig,
      ciiResults,
      inputs
    });
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-marine text-ice rounded-lg hover:bg-opacity-90 transition-colors"
    >
      <Download className="w-4 h-4" />
      Export to Excel
    </button>
  );
}