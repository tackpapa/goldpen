-- =====================================================
-- Teachers Table Migration
-- Created: 2025-11-21
-- Purpose: Create teachers table and add FK constraints
-- =====================================================

-- =====================================================
-- PHASE 1: teachers table
-- =====================================================

CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Teacher Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Subjects (JSONB array for flexibility)
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),

  -- Employment
  employment_type TEXT NOT NULL
    CHECK (employment_type IN ('full_time', 'part_time', 'contract')),

  -- Salary
  salary_type TEXT NOT NULL
    CHECK (salary_type IN ('monthly', 'hourly')),
  salary_amount NUMERIC(10, 2) NOT NULL CHECK (salary_amount >= 0),

  -- Hire Date
  hire_date DATE NOT NULL,

  -- Lesson Note Token (optional)
  lesson_note_token TEXT UNIQUE,

  -- Assigned Students (JSONB array of student IDs)
  assigned_students JSONB DEFAULT '[]'::jsonb,

  -- Part-time teacher tracking
  total_hours_worked NUMERIC(10, 2) DEFAULT 0 CHECK (total_hours_worked >= 0),
  earned_salary NUMERIC(10, 2) DEFAULT 0 CHECK (earned_salary >= 0),

  -- Notes
  notes TEXT,

  -- Unique constraint: email per org
  UNIQUE(org_id, email)
);

CREATE INDEX IF NOT EXISTS idx_teachers_org_id ON teachers(org_id);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(org_id, status);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(org_id, email);
CREATE INDEX IF NOT EXISTS idx_teachers_employment_type ON teachers(org_id, employment_type);
CREATE INDEX IF NOT EXISTS idx_teachers_lesson_note_token ON teachers(lesson_note_token) WHERE lesson_note_token IS NOT NULL;

COMMENT ON TABLE teachers IS 'Teacher management (강사 관리)';
COMMENT ON COLUMN teachers.subjects IS 'JSONB array of subject names';
COMMENT ON COLUMN teachers.assigned_students IS 'JSONB array of student IDs';
COMMENT ON COLUMN teachers.total_hours_worked IS 'Total hours worked (for part-time teachers)';
COMMENT ON COLUMN teachers.earned_salary IS 'Total earned salary (salary_amount × hours for hourly teachers)';
COMMENT ON COLUMN teachers.lesson_note_token IS 'Unique token for lesson note registration';

-- =====================================================
-- PHASE 2: Add FK constraints to existing tables
-- =====================================================

-- Add FK constraint to schedules table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedules') THEN
    -- Check if constraint doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_schedules_teacher_id'
      AND table_name = 'schedules'
    ) THEN
      ALTER TABLE schedules
        ADD CONSTRAINT fk_schedules_teacher_id
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Add FK constraint to room_schedules table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_schedules') THEN
    -- Check if constraint doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_room_schedules_teacher_id'
      AND table_name = 'room_schedules'
    ) THEN
      ALTER TABLE room_schedules
        ADD CONSTRAINT fk_room_schedules_teacher_id
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Add FK constraint to classes table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'classes') THEN
    -- Check if constraint doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_classes_teacher_id'
      AND table_name = 'classes'
    ) THEN
      ALTER TABLE classes
        ADD CONSTRAINT fk_classes_teacher_id
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teachers_select_policy" ON teachers
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "teachers_insert_policy" ON teachers
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

CREATE POLICY "teachers_update_policy" ON teachers
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

CREATE POLICY "teachers_delete_policy" ON teachers
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger 1: Auto-update updated_at
CREATE TRIGGER teachers_updated_at_trigger
  BEFORE UPDATE ON teachers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger 2: Auto-calculate earned_salary for hourly teachers
CREATE OR REPLACE FUNCTION update_teacher_earned_salary()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate for hourly teachers
  IF NEW.salary_type = 'hourly' THEN
    NEW.earned_salary = NEW.salary_amount * COALESCE(NEW.total_hours_worked, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teacher_earned_salary
  BEFORE INSERT OR UPDATE ON teachers
  FOR EACH ROW
  WHEN (NEW.salary_type = 'hourly')
  EXECUTE FUNCTION update_teacher_earned_salary();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Created 1 new table:
--   1. teachers (teacher management)
--
-- Added FK constraints to:
--   - schedules.teacher_id → teachers.id
--   - room_schedules.teacher_id → teachers.id
--   - classes.teacher_id → teachers.id
--
-- Table has:
--   - RLS policies (org_id isolation)
--   - Indexes for performance
--   - Business logic triggers (earned_salary calculation)
--   - Comments for documentation
-- =====================================================
