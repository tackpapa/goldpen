-- =====================================================
-- Update Consultations Schema Migration
-- Created: 2025-11-25
-- Purpose: Update consultations table to new schema and create waitlists tables
-- =====================================================

-- =====================================================
-- PHASE 1: Update consultations table
-- Add new columns if they don't exist
-- =====================================================

-- Add new columns to consultations
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS student_grade INTEGER CHECK (student_grade >= 1 AND student_grade <= 12);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS goals TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS preferred_times TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS enrolled_date TIMESTAMPTZ;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Update status constraint to include new values
-- First drop the old constraint if exists, then add new one
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_status_check;
ALTER TABLE consultations ADD CONSTRAINT consultations_status_check
  CHECK (status IN ('new', 'scheduled', 'enrolled', 'rejected', 'on_hold', 'waitlist', 'completed', 'cancelled'));

-- Set default for status
ALTER TABLE consultations ALTER COLUMN status SET DEFAULT 'new';

-- Migrate existing data: copy summary to notes if notes is empty
UPDATE consultations
SET notes = COALESCE(notes, summary)
WHERE notes IS NULL AND summary IS NOT NULL;

-- =====================================================
-- PHASE 2: Create waitlists table if not exists
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

-- =====================================================
-- PHASE 3: Create waitlist_consultations junction table if not exists
-- =====================================================

CREATE TABLE IF NOT EXISTS waitlist_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  waitlist_id UUID NOT NULL REFERENCES waitlists(id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  org_id UUID,

  position INTEGER NOT NULL DEFAULT 0,
  added_by UUID,
  notes TEXT,

  UNIQUE(waitlist_id, consultation_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_consultations_waitlist_id ON waitlist_consultations(waitlist_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_consultations_consultation_id ON waitlist_consultations(consultation_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_consultations_position ON waitlist_consultations(waitlist_id, position);

-- Add org_id FK if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'waitlist_consultations_org_id_fkey'
  ) THEN
    ALTER TABLE waitlist_consultations
      ADD CONSTRAINT waitlist_consultations_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- PHASE 4: RLS Policies
-- =====================================================

ALTER TABLE waitlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_consultations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "waitlists_select_policy" ON waitlists;
DROP POLICY IF EXISTS "waitlists_insert_policy" ON waitlists;
DROP POLICY IF EXISTS "waitlists_update_policy" ON waitlists;
DROP POLICY IF EXISTS "waitlists_delete_policy" ON waitlists;

CREATE POLICY "waitlists_select_policy" ON waitlists
  FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "waitlists_insert_policy" ON waitlists
  FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "waitlists_update_policy" ON waitlists
  FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "waitlists_delete_policy" ON waitlists
  FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Waitlist consultations policies
DROP POLICY IF EXISTS "waitlist_consultations_select_policy" ON waitlist_consultations;
DROP POLICY IF EXISTS "waitlist_consultations_insert_policy" ON waitlist_consultations;
DROP POLICY IF EXISTS "waitlist_consultations_delete_policy" ON waitlist_consultations;

CREATE POLICY "waitlist_consultations_select_policy" ON waitlist_consultations
  FOR SELECT
  USING (
    waitlist_id IN (SELECT id FROM waitlists WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "waitlist_consultations_insert_policy" ON waitlist_consultations
  FOR INSERT
  WITH CHECK (
    waitlist_id IN (SELECT id FROM waitlists WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "waitlist_consultations_delete_policy" ON waitlist_consultations
  FOR DELETE
  USING (
    waitlist_id IN (SELECT id FROM waitlists WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
  );

-- =====================================================
-- PHASE 5: Triggers
-- =====================================================

-- Trigger for updated_at on waitlists
DROP TRIGGER IF EXISTS waitlists_updated_at_trigger ON waitlists;
CREATE TRIGGER waitlists_updated_at_trigger
  BEFORE UPDATE ON waitlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for auto-set enrolled_date
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

DROP TRIGGER IF EXISTS trigger_auto_enrolled_date ON consultations;
CREATE TRIGGER trigger_auto_enrolled_date
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_enrolled_date();

-- Trigger for removing from waitlist when enrolled/rejected
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

DROP TRIGGER IF EXISTS trigger_remove_from_waitlist ON consultations;
CREATE TRIGGER trigger_remove_from_waitlist
  AFTER UPDATE ON consultations
  FOR EACH ROW
  WHEN (NEW.status IN ('enrolled', 'rejected'))
  EXECUTE FUNCTION remove_from_waitlist_on_status_change();

-- Trigger for updating waitlist count
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

DROP TRIGGER IF EXISTS trigger_update_waitlist_count ON waitlist_consultations;
CREATE TRIGGER trigger_update_waitlist_count
  AFTER INSERT OR DELETE ON waitlist_consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_waitlist_count();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
