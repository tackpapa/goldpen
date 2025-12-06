-- =====================================================
-- Classes Tables Migration
-- Created: 2025-11-21
-- Purpose: Create classes and class_enrollments tables
-- =====================================================

-- =====================================================
-- PHASE 1: classes table
-- =====================================================

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Class Information
  name TEXT NOT NULL,
  subject TEXT NOT NULL,

  -- Teacher Relationship
  teacher_id UUID, -- No FK constraint - teachers table doesn't exist yet
  teacher_name TEXT NOT NULL,

  -- Capacity Management
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  current_students INTEGER NOT NULL DEFAULT 0 CHECK (current_students >= 0),

  -- Schedule (JSONB array of {day, start_time, end_time})
  schedule JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Room
  room TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),

  -- Notes
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_classes_org_id ON classes(org_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id) WHERE teacher_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(org_id, status);
CREATE INDEX IF NOT EXISTS idx_classes_subject ON classes(org_id, subject);
CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(org_id, name);

COMMENT ON TABLE classes IS 'Class management (반 관리)';
COMMENT ON COLUMN classes.schedule IS 'JSONB array: [{day, start_time, end_time}]';
COMMENT ON COLUMN classes.current_students IS 'Current number of enrolled students (denormalized)';
COMMENT ON COLUMN classes.teacher_name IS 'Denormalized for display when teacher is deleted';

-- =====================================================
-- PHASE 2: class_enrollments table (junction table)
-- =====================================================

CREATE TABLE IF NOT EXISTS class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Relationships
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID, -- No FK constraint - students table already exists but no ON DELETE CASCADE
  student_name TEXT NOT NULL,

  -- Enrollment Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),

  -- Enrollment Date
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one enrollment per student per class
  UNIQUE(class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON class_enrollments(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_class_enrollments_status ON class_enrollments(class_id, status);

COMMENT ON TABLE class_enrollments IS 'Student enrollments in classes (반 학생 배정)';
COMMENT ON COLUMN class_enrollments.student_name IS 'Denormalized for display when student is deleted';

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

-- ===== classes policies =====
CREATE POLICY "classes_select_policy" ON classes
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "classes_insert_policy" ON classes
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

CREATE POLICY "classes_update_policy" ON classes
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

CREATE POLICY "classes_delete_policy" ON classes
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- ===== class_enrollments policies =====
CREATE POLICY "class_enrollments_select_policy" ON class_enrollments
  FOR SELECT
  USING (
    class_id IN (
      SELECT id FROM classes WHERE org_id = get_user_org_id()
    )
  );

CREATE POLICY "class_enrollments_insert_policy" ON class_enrollments
  FOR INSERT
  WITH CHECK (
    class_id IN (
      SELECT id FROM classes WHERE org_id = get_user_org_id()
    ) AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

CREATE POLICY "class_enrollments_update_policy" ON class_enrollments
  FOR UPDATE
  USING (
    class_id IN (
      SELECT id FROM classes WHERE org_id = get_user_org_id()
    ) AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

CREATE POLICY "class_enrollments_delete_policy" ON class_enrollments
  FOR DELETE
  USING (
    class_id IN (
      SELECT id FROM classes WHERE org_id = get_user_org_id()
    ) AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger 1: Auto-update updated_at
CREATE TRIGGER classes_updated_at_trigger
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER class_enrollments_updated_at_trigger
  BEFORE UPDATE ON class_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger 2: Auto-update current_students count in classes table
CREATE OR REPLACE FUNCTION update_class_current_students()
RETURNS TRIGGER AS $$
BEGIN
  -- When enrollment is added or status changes to active
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      UPDATE classes
      SET current_students = current_students + 1
      WHERE id = NEW.class_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changed from inactive to active
    IF OLD.status = 'inactive' AND NEW.status = 'active' THEN
      UPDATE classes
      SET current_students = current_students + 1
      WHERE id = NEW.class_id;
    -- Status changed from active to inactive
    ELSIF OLD.status = 'active' AND NEW.status = 'inactive' THEN
      UPDATE classes
      SET current_students = current_students - 1
      WHERE id = NEW.class_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' THEN
      UPDATE classes
      SET current_students = current_students - 1
      WHERE id = OLD.class_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_class_current_students
  AFTER INSERT OR UPDATE OR DELETE ON class_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_class_current_students();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Created 2 new tables:
--   1. classes (class management)
--   2. class_enrollments (student enrollments)
--
-- Both tables have:
--   - RLS policies (org_id isolation)
--   - Indexes for performance
--   - Business logic triggers (current_students count)
--   - Comments for documentation
-- =====================================================
