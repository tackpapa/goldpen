-- Fix RLS policies for sleep_records and outing_records tables
-- These tables need SELECT policies for authenticated users to view records

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS sleep_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS outing_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to view sleep records" ON sleep_records;
DROP POLICY IF EXISTS "Allow authenticated users to insert sleep records" ON sleep_records;
DROP POLICY IF EXISTS "Allow authenticated users to update sleep records" ON sleep_records;

DROP POLICY IF EXISTS "Allow authenticated users to view outing records" ON outing_records;
DROP POLICY IF EXISTS "Allow authenticated users to insert outing records" ON outing_records;
DROP POLICY IF EXISTS "Allow authenticated users to update outing records" ON outing_records;

-- Create policies for sleep_records
CREATE POLICY "Allow authenticated users to view sleep records"
  ON sleep_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert sleep records"
  ON sleep_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sleep records"
  ON sleep_records FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for outing_records
CREATE POLICY "Allow authenticated users to view outing records"
  ON outing_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert outing records"
  ON outing_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update outing records"
  ON outing_records FOR UPDATE
  TO authenticated
  USING (true);

-- Also allow anon access for livescreen pages (students without login)
DROP POLICY IF EXISTS "Allow anon to view sleep records" ON sleep_records;
DROP POLICY IF EXISTS "Allow anon to insert sleep records" ON sleep_records;
DROP POLICY IF EXISTS "Allow anon to update sleep records" ON sleep_records;

DROP POLICY IF EXISTS "Allow anon to view outing records" ON outing_records;
DROP POLICY IF EXISTS "Allow anon to insert outing records" ON outing_records;
DROP POLICY IF EXISTS "Allow anon to update outing records" ON outing_records;

CREATE POLICY "Allow anon to view sleep records"
  ON sleep_records FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert sleep records"
  ON sleep_records FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update sleep records"
  ON sleep_records FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow anon to view outing records"
  ON outing_records FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert outing records"
  ON outing_records FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update outing records"
  ON outing_records FOR UPDATE
  TO anon
  USING (true);
