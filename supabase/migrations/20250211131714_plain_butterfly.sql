/*
  # Create fuel data table

  1. New Tables
    - `fuel_data`
      - `id` (int, primary key)
      - `fuel_name` (text, unique)
      - `co2eq_wtw_gco2eq_per_mj` (numeric)
      - `lcv_mj_per_gfuel` (numeric)

  2. Security
    - Enable RLS on `fuel_data` table
    - Add policy for public read access
*/

CREATE TABLE IF NOT EXISTS fuel_data (
  id serial PRIMARY KEY,
  fuel_name text UNIQUE NOT NULL,
  co2eq_wtw_gco2eq_per_mj numeric NOT NULL,
  lcv_mj_per_gfuel numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE fuel_data ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access"
  ON fuel_data
  FOR SELECT
  TO public
  USING (true);

-- Insert initial fuel data
INSERT INTO fuel_data (fuel_name, co2eq_wtw_gco2eq_per_mj, lcv_mj_per_gfuel)
VALUES 
  ('HFO', 91.60, 0.0405),
  ('LFO', 91.25, 0.0410),
  ('MDO', 90.63, 0.0427),
  ('MGO', 90.63, 0.0427),
  ('LNG Otto - Medium Speed', 91.03, 0.0491),
  ('LNG Otto - Slow Speed', 83.83, 0.0491),
  ('LNG Diesel - Slow Speed', 76.13, 0.0491),
  ('LNG - LBSI', 88.46, 0.0491),
  ('LPG', 74.08, 0.0460),
  ('H2', 132.40, 0.1200),
  ('NH3', 123.56, 0.0186),
  ('Methanol', 102.79, 0.0199),
  ('Ethanol', 32.52, 0.0270),
  ('Bio-diesel', 28.58, 0.0370),
  ('HVO', 38.49, 0.0440),
  ('Bio-LNG Otto - Medium Speed', 46.20, 0.0500),
  ('Bio-LNG Otto - Slow Speed', 39.14, 0.0500),
  ('Bio-LNG Diesel - Slow Speed', 31.57, 0.0500),
  ('Bio-LNG - LBSI', 43.68, 0.0500),
  ('Bio-methanol', 15.76, 0.0200),
  ('Bio-H2', 30.38, 0.1200),
  ('e-diesel', 51.74, 0.0427),
  ('e-methanol', 42.47, 0.0199),
  ('e-LNG Otto - Medium Speed', 51.25, 0.0491),
  ('e-LNG Otto - Slow Speed', 47.66, 0.0491),
  ('e-LNG Diesel - Slow Speed', 43.80, 0.0491),
  ('e-LNG - LBSI', 49.97, 0.0491),
  ('e-H2', 15.19, 0.1200),
  ('e-NH3', 16.27, 0.0186),
  ('e-LPG', 48.13, 0.0460),
  ('e-DME', 49.00, 0.0288);