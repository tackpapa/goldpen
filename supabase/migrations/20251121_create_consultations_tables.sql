-- =====================================================
-- Consultations Tables Migration
-- Created: 2025-11-21
-- Purpose: Create consultations, waitlists, and junction tables
-- =====================================================

-- =====================================================
-- PHASE 1: consultations table
-- =====================================================

CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Student Information
  student_name TEXT NOT NULL,
  student_grade INTEGER CHECK (student_grade >= 1 AND student_grade <= 12),

  -- Parent Information
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,

  -- Consultation Details
  goals TEXT,
  preferred_times TEXT,
  scheduled_date TIMESTAMPTZ,

  -- Status Management
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'scheduled', 'enrolled', 'rejected', 'on_hold', 'waitlist')),

  -- Notes and Results
  notes TEXT,
  result TEXT,

  -- Enrollment Tracking
  enrolled_date TIMESTAMPTZ,

  -- Attachments
  images JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_consultations_org_id ON consultations(org_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(org_id, status);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_scheduled_date ON consultations(scheduled_date)
  WHERE scheduled_date IS NOT NULL;

COMMENT ON TABLE consultations IS 'Student consultation records (상담 관리)';
COMMENT ON COLUMN consultations.images IS 'JSONB array of image URLs or Base64 strings';
COMMENT ON COLUMN consultations.enrolled_date IS 'Auto-set when status changes to enrolled';

-- =====================================================
-- PHASE 2: waitlists table
-- =====================================================

CREATE TABLE IF NOT EXISTS waitlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  -- Denormalized count for performance
  consultation_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_waitlists_org_id ON waitlists(org_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_status ON waitlists(org_id, status);

COMMENT ON TABLE waitlists IS 'Consultation waitlists (대기자 명단)';
COMMENT ON COLUMN waitlists.consultation_count IS 'Denormalized count, updated by trigger';

-- =====================================================
-- PHASE 3: waitlist_consultations junction table
-- =====================================================

CREATE TABLE IF NOT EXISTS waitlist_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  waitlist_id UUID NOT NULL REFERENCES waitlists(id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,

  position INTEGER NOT NULL DEFAULT 0,
  added_by UUID,
  notes TEXT,

  UNIQUE(waitlist_id, consultation_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_consultations_waitlist_id ON waitlist_consultations(waitlist_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_consultations_consultation_id ON waitlist_consultations(consultation_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_consultations_position ON waitlist_consultations(waitlist_id, position);

COMMENT ON TABLE waitlist_consultations IS 'Many-to-many relationship between waitlists and consultations';

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_consultations ENABLE ROW LEVEL SECURITY;

-- ===== consultations policies =====
CREATE POLICY "consultations_select_policy" ON consultations
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "consultations_insert_policy" ON consultations
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

CREATE POLICY "consultations_update_policy" ON consultations
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

CREATE POLICY "consultations_delete_policy" ON consultations
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- ===== waitlists policies =====
CREATE POLICY "waitlists_select_policy" ON waitlists
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "waitlists_insert_policy" ON waitlists
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

CREATE POLICY "waitlists_update_policy" ON waitlists
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

CREATE POLICY "waitlists_delete_policy" ON waitlists
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- ===== waitlist_consultations policies =====
CREATE POLICY "waitlist_consultations_select_policy" ON waitlist_consultations
  FOR SELECT
  USING (
    waitlist_id IN (
      SELECT id FROM waitlists WHERE org_id = get_user_org_id()
    )
  );

CREATE POLICY "waitlist_consultations_insert_policy" ON waitlist_consultations
  FOR INSERT
  WITH CHECK (
    waitlist_id IN (
      SELECT id FROM waitlists
      WHERE org_id = get_user_org_id()
    ) AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

CREATE POLICY "waitlist_consultations_delete_policy" ON waitlist_consultations
  FOR DELETE
  USING (
    waitlist_id IN (
      SELECT id FROM waitlists WHERE org_id = get_user_org_id()
    ) AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger 1: Auto-update updated_at
CREATE TRIGGER consultations_updated_at_trigger
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER waitlists_updated_at_trigger
  BEFORE UPDATE ON waitlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger 2: Auto-set enrolled_date
CREATE OR REPLACE FUNCTION auto_set_enrolled_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'enrolled' AND (OLD.status IS NULL OR OLD.status != 'enrolled') THEN
    NEW.enrolled_date = NOW();
  END IF;

  IF NEW.status != 'enrolled' AND OLD.status = 'enrolled' THEN
    NEW.enrolled_date = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_enrolled_date
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_enrolled_date();

-- Trigger 3: Remove from waitlist when enrolled/rejected
CREATE OR REPLACE FUNCTION remove_from_waitlist_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('enrolled', 'rejected') THEN
    DELETE FROM waitlist_consultations
    WHERE consultation_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_remove_from_waitlist
  AFTER UPDATE ON consultations
  FOR EACH ROW
  WHEN (NEW.status IN ('enrolled', 'rejected'))
  EXECUTE FUNCTION remove_from_waitlist_on_status_change();

-- Trigger 4: Update waitlist count
CREATE OR REPLACE FUNCTION update_waitlist_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE waitlists
    SET consultation_count = consultation_count + 1
    WHERE id = NEW.waitlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE waitlists
    SET consultation_count = consultation_count - 1
    WHERE id = OLD.waitlist_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_waitlist_count
  AFTER INSERT OR DELETE ON waitlist_consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_waitlist_count();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Created 3 new tables:
--   1. consultations (consultation records)
--   2. waitlists (waitlist management)
--   3. waitlist_consultations (many-to-many junction)
--
-- All tables have:
--   - RLS policies (org_id isolation)
--   - Indexes for performance
--   - Business logic triggers
--   - Comments for documentation
-- =====================================================
