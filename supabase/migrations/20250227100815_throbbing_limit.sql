/*
  # Update fuel data with additional fields

  1. Changes
    - Add gCH4pergFuel and gN2OpergFuel columns to fuel_data table
    - Update existing fuel data with CH4 and N2O emission values
  2. Security
    - Maintains existing RLS policies
*/

-- Add CH4 and N2O columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fuel_data' AND column_name = 'gCH4pergFuel'
  ) THEN
    ALTER TABLE fuel_data ADD COLUMN gCH4pergFuel numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fuel_data' AND column_name = 'gN2OpergFuel'
  ) THEN
    ALTER TABLE fuel_data ADD COLUMN gN2OpergFuel numeric DEFAULT 0;
  END IF;
END $$;

-- Update fuel data with CH4 and N2O values
UPDATE fuel_data
SET 
  gCH4pergFuel = CASE 
    WHEN fuel_name = 'HFO' THEN 0.00006
    WHEN fuel_name = 'MDO' THEN 0.00004
    WHEN fuel_name = 'LNG' THEN 0.00185
    WHEN fuel_name = 'Methanol' THEN 0.00002
    WHEN fuel_name = 'Bio-Methanol' THEN 0.00002
    WHEN fuel_name = 'Ammonia' THEN 0.00001
    WHEN fuel_name = 'Green Ammonia' THEN 0.00001
    WHEN fuel_name = 'Bio-diesel' THEN 0.00004
    ELSE 0.00004
  END,
  gN2OpergFuel = CASE 
    WHEN fuel_name = 'HFO' THEN 0.00002
    WHEN fuel_name = 'MDO' THEN 0.00001
    WHEN fuel_name = 'LNG' THEN 0.00001
    WHEN fuel_name = 'Methanol' THEN 0.00001
    WHEN fuel_name = 'Bio-Methanol' THEN 0.00001
    WHEN fuel_name = 'Ammonia' THEN 0.00001
    WHEN fuel_name = 'Green Ammonia' THEN 0.00001
    WHEN fuel_name = 'Bio-diesel' THEN 0.00001
    ELSE 0.00001
  END;

-- Add Ethanol if it doesn't exist
INSERT INTO fuel_data (fuel_name, co2eq_wtw_gco2eq_per_mj, lcv_mj_per_gfuel, ets_exempt, gCH4pergFuel, gN2OpergFuel)
VALUES ('Ethanol', 32.52, 0.0270, true, 0.00002, 0.00001)
ON CONFLICT (fuel_name) DO UPDATE 
SET 
  co2eq_wtw_gco2eq_per_mj = EXCLUDED.co2eq_wtw_gco2eq_per_mj,
  lcv_mj_per_gfuel = EXCLUDED.lcv_mj_per_gfuel,
  ets_exempt = EXCLUDED.ets_exempt,
  gCH4pergFuel = EXCLUDED.gCH4pergFuel,
  gN2OpergFuel = EXCLUDED.gN2OpergFuel;