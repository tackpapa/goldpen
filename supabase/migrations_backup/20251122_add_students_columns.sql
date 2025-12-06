-- Add missing columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name TEXT;

-- Verify
SELECT column_name FROM information_schema.columns WHERE table_name = 'students' ORDER BY ordinal_position;
