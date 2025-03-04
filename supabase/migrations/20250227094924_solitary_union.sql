/*
  # Add ETS exempt column to fuel_data table

  1. Changes
    - Add `ets_exempt` boolean column to `fuel_data` table with default value of false
    - Update biofuels to be ETS exempt
  
  2. Purpose
    - Allow certain fuels to be exempt from ETS carbon pricing
    - This applies to biofuels which have zero-rated CO2 for ETS purposes
*/

-- Add ets_exempt column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fuel_data' AND column_name = 'ets_exempt'
  ) THEN
    ALTER TABLE fuel_data ADD COLUMN ets_exempt boolean DEFAULT false;
  END IF;
END $$;

-- Update biofuels to be ETS exempt
UPDATE fuel_data
SET ets_exempt = true
WHERE fuel_name IN ('Bio-Methanol', 'Bio-diesel');