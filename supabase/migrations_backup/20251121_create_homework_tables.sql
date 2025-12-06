-- =====================================================
-- Homework Tables Migration
-- Created: 2025-11-21
-- Purpose: Create homework and homework_submissions tables
-- =====================================================

-- =====================================================
-- PHASE 1: homework table
-- =====================================================

CREATE TABLE IF NOT EXISTS homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Homework Information
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Class Relationship
  class_id UUID, -- No FK constraint - classes table doesn't exist yet
  class_name TEXT NOT NULL,

  -- Dates
  due_date DATE NOT NULL,

  -- Status Management
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'overdue')),

  -- Denormalized Counts (for performance)
  total_students INTEGER NOT NULL DEFAULT 0,
  submitted_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_homework_org_id ON homework(org_id);
CREATE INDEX IF NOT EXISTS idx_homework_class_id ON homework(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_homework_status ON homework(org_id, status);
CREATE INDEX IF NOT EXISTS idx_homework_due_date ON homework(org_id, due_date);
CREATE INDEX IF NOT EXISTS idx_homework_created_at ON homework(org_id, created_at DESC);

COMMENT ON TABLE homework IS 'Homework assignments (과제)';
COMMENT ON COLUMN homework.total_students IS 'Total students assigned to this homework (denormalized)';
COMMENT ON COLUMN homework.submitted_count IS 'Number of students who submitted (denormalized)';
COMMENT ON COLUMN homework.due_date IS 'Homework due date';

-- =====================================================
-- PHASE 2: homework_submissions table
-- =====================================================

CREATE TABLE IF NOT EXISTS homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Relationships
  homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID, -- No FK constraint - students table already exists but no ON DELETE CASCADE
  student_name TEXT NOT NULL,

  -- Submission Information
  submitted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'not_submitted'
    CHECK (status IN ('submitted', 'not_submitted', 'late')),

  -- Grading
  score INTEGER CHECK (score >= 0 AND score <= 100),
  feedback TEXT,

  -- Unique constraint: one submission per student per homework
  UNIQUE(homework_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_homework_submissions_homework_id ON homework_submissions(homework_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_id ON homework_submissions(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_homework_submissions_status ON homework_submissions(homework_id, status);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_submitted_at ON homework_submissions(submitted_at)
  WHERE submitted_at IS NOT NULL;

COMMENT ON TABLE homework_submissions IS 'Student homework submissions (과제 제출)';
COMMENT ON COLUMN homework_submissions.student_name IS 'Denormalized for display when student is deleted';
COMMENT ON COLUMN homework_submissions.score IS 'Score out of 100';

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;

-- ===== homework policies =====
CREATE POLICY "homework_select_policy" ON homework
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "homework_insert_policy" ON homework
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff', 'teacher'))
  );

CREATE POLICY "homework_update_policy" ON homework
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff', 'teacher'))
  );

CREATE POLICY "homework_delete_policy" ON homework
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

-- ===== homework_submissions policies =====
CREATE POLICY "homework_submissions_select_policy" ON homework_submissions
  FOR SELECT
  USING (
    homework_id IN (
      SELECT id FROM homework WHERE org_id = get_user_org_id()
    )
  );

CREATE POLICY "homework_submissions_insert_policy" ON homework_submissions
  FOR INSERT
  WITH CHECK (
    homework_id IN (
      SELECT id FROM homework WHERE org_id = get_user_org_id()
    ) AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff', 'teacher'))
  );

CREATE POLICY "homework_submissions_update_policy" ON homework_submissions
  FOR UPDATE
  USING (
    homework_id IN (
      SELECT id FROM homework WHERE org_id = get_user_org_id()
    ) AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff', 'teacher'))
  );

CREATE POLICY "homework_submissions_delete_policy" ON homework_submissions
  FOR DELETE
  USING (
    homework_id IN (
      SELECT id FROM homework WHERE org_id = get_user_org_id()
    ) AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger 1: Auto-update updated_at
CREATE TRIGGER homework_updated_at_trigger
  BEFORE UPDATE ON homework
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER homework_submissions_updated_at_trigger
  BEFORE UPDATE ON homework_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger 2: Auto-update submitted_count in homework table
CREATE OR REPLACE FUNCTION update_homework_submitted_count()
RETURNS TRIGGER AS $$
BEGIN
  -- When submission status changes to/from 'submitted' or 'late'
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('submitted', 'late') THEN
      UPDATE homework
      SET submitted_count = submitted_count + 1
      WHERE id = NEW.homework_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Old status was not submitted, new status is submitted/late
    IF OLD.status = 'not_submitted' AND NEW.status IN ('submitted', 'late') THEN
      UPDATE homework
      SET submitted_count = submitted_count + 1
      WHERE id = NEW.homework_id;
    -- Old status was submitted/late, new status is not submitted
    ELSIF OLD.status IN ('submitted', 'late') AND NEW.status = 'not_submitted' THEN
      UPDATE homework
      SET submitted_count = submitted_count - 1
      WHERE id = NEW.homework_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('submitted', 'late') THEN
      UPDATE homework
      SET submitted_count = submitted_count - 1
      WHERE id = OLD.homework_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_homework_submitted_count
  AFTER INSERT OR UPDATE OR DELETE ON homework_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_submitted_count();

-- Trigger 3: Auto-set submitted_at when status changes to submitted/late
CREATE OR REPLACE FUNCTION auto_set_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set submitted_at when status changes to submitted or late
  IF NEW.status IN ('submitted', 'late') AND (OLD.status IS NULL OR OLD.status = 'not_submitted') THEN
    NEW.submitted_at = NOW();
  END IF;

  -- Clear submitted_at when status changes back to not_submitted
  IF NEW.status = 'not_submitted' AND (OLD.status IS NULL OR OLD.status IN ('submitted', 'late')) THEN
    NEW.submitted_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_submitted_at
  BEFORE INSERT OR UPDATE ON homework_submissions
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_submitted_at();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Created 2 new tables:
--   1. homework (homework assignments)
--   2. homework_submissions (student submissions)
--
-- Both tables have:
--   - RLS policies (org_id isolation)
--   - Indexes for performance
--   - Business logic triggers (submitted_count, submitted_at)
--   - Comments for documentation
-- =====================================================
