-- =====================================================
-- Attendance Table Migration
-- Created: 2025-11-21
-- Purpose: Create attendance table for tracking student attendance
-- =====================================================

-- =====================================================
-- PHASE 1: attendance table
-- =====================================================

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Date and Time
  date DATE NOT NULL,

  -- Relationships
  class_id UUID, -- No FK constraint - classes table doesn't exist yet
  student_id UUID, -- No FK constraint - students table already exists

  -- Denormalized for display
  class_name TEXT,
  student_name TEXT,

  -- Attendance Status
  status TEXT NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'late', 'excused')),

  -- Notes
  notes TEXT,

  -- Unique constraint: one attendance record per student per class per date
  UNIQUE(org_id, class_id, student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_org_id ON attendance(org_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(org_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(org_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date DESC) WHERE student_id IS NOT NULL;

COMMENT ON TABLE attendance IS 'Student attendance records (출결 기록)';
COMMENT ON COLUMN attendance.date IS 'Date of attendance';
COMMENT ON COLUMN attendance.status IS 'Attendance status (present/absent/late/excused)';
COMMENT ON COLUMN attendance.class_name IS 'Denormalized for display when class is deleted';
COMMENT ON COLUMN attendance.student_name IS 'Denormalized for display when student is deleted';

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_select_policy" ON attendance
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "attendance_insert_policy" ON attendance
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff', 'teacher'))
  );

CREATE POLICY "attendance_update_policy" ON attendance
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff', 'teacher'))
  );

CREATE POLICY "attendance_delete_policy" ON attendance
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger 1: Auto-update updated_at
CREATE TRIGGER attendance_updated_at_trigger
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Created 1 new table:
--   1. attendance (student attendance records)
--
-- Table has:
--   - RLS policies (org_id isolation)
--   - Indexes for performance
--   - Unique constraint (one record per student per class per date)
--   - Comments for documentation
-- =====================================================
