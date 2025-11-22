-- ================================================================
-- Live Attendance Support (seat assignments + student codes)
-- Created: 2025-11-24
-- Purpose: Ensure frontend liveattendance page fields exist in DB
-- ================================================================

-- 1) Students: add attendance code + remaining minutes
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS student_code TEXT,
  ADD COLUMN IF NOT EXISTS remaining_minutes INTEGER;

-- Unique 4~10 char attendance code per org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'students'
      AND constraint_name = 'students_org_code_unique'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_org_code_unique
      UNIQUE (org_id, student_code);
  END IF;
END$$;

-- Backfill missing student_code with zero-padded sequence per org (4 digits)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT org_id FROM students LOOP
    UPDATE students s
      SET student_code = LPAD(t.rn::text, 4, '0')
      FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY org_id ORDER BY created_at, id) AS rn
        FROM students
        WHERE org_id = r.org_id AND student_code IS NULL
      ) t
      WHERE s.id = t.id
        AND s.org_id = r.org_id
        AND s.student_code IS NULL;
  END LOOP;
END$$;

-- 2) Seat assignments table (used by /api/seat-assignments & liveattendance)
CREATE TABLE IF NOT EXISTS seat_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'checked_out' CHECK (status IN ('checked_in', 'checked_out')),
  check_in_time TIMESTAMPTZ,
  session_start_time TIMESTAMPTZ,
  allocated_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_seat_assignments_org ON seat_assignments(org_id);
CREATE INDEX IF NOT EXISTS idx_seat_assignments_student ON seat_assignments(student_id);

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_table = 'seat_assignments'
      AND trigger_name = 'seat_assignments_set_updated_at'
  ) THEN
    CREATE TRIGGER seat_assignments_set_updated_at
      BEFORE UPDATE ON seat_assignments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- RLS
ALTER TABLE seat_assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view seat assignments in own org') THEN
    CREATE POLICY "Users can view seat assignments in own org"
      ON seat_assignments FOR SELECT
      USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage seat assignments in own org') THEN
    CREATE POLICY "Users can manage seat assignments in own org"
      ON seat_assignments FOR ALL
      USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
      WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));
  END IF;
END$$;

-- 3) Attendance table: add check-in / check-out timestamps
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ;

-- Helpful index for daily lookups
CREATE INDEX IF NOT EXISTS idx_attendance_org_student_date
  ON attendance(org_id, student_id, date);
