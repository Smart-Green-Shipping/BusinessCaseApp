-- Create the fuel data table
CREATE TABLE IF NOT EXISTS fuel_data (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  fuel_name text UNIQUE NOT NULL,
  co2eq_wtw_gco2eq_per_mj numeric NOT NULL,
  lcv_mj_per_gfuel numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE fuel_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow public read access" ON fuel_data;

-- Create policy for public read access
CREATE POLICY "Allow public read access"
  ON fuel_data
  FOR SELECT
  TO public
  USING (true);

-- Insert initial fuel data
INSERT INTO fuel_data (fuel_name, co2eq_wtw_gco2eq_per_mj, lcv_mj_per_gfuel)
VALUES 
  ('HFO', 91.60, 0.0405),
  ('MDO', 90.63, 0.0427),
  ('LNG', 82.8, 0.0491),
  ('Methanol', 78.9, 0.0199),
  ('Bio-Methanol', 31.5, 0.0199),
  ('Ammonia', 0, 0.0186),
  ('Green Ammonia', 0, 0.0186),
  ('Bio-diesel', 28.58, 0.0370)
ON CONFLICT (fuel_name) DO UPDATE 
SET 
  co2eq_wtw_gco2eq_per_mj = EXCLUDED.co2eq_wtw_gco2eq_per_mj,
  lcv_mj_per_gfuel = EXCLUDED.lcv_mj_per_gfuel;