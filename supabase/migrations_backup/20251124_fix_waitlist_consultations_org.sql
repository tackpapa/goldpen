-- Add org_id to waitlist_consultations (junction table) and enforce org isolation

ALTER TABLE waitlist_consultations ADD COLUMN IF NOT EXISTS org_id UUID;

-- Backfill via waitlists org_id (authoritative)
UPDATE waitlist_consultations wc
SET org_id = w.org_id
FROM waitlists w
WHERE wc.waitlist_id = w.id
  AND wc.org_id IS NULL;

-- Fallback: if still NULL, try consultations
UPDATE waitlist_consultations wc
SET org_id = c.org_id
FROM consultations c
WHERE wc.consultation_id = c.id
  AND wc.org_id IS NULL;

-- Enforce NOT NULL + FK
ALTER TABLE waitlist_consultations
  ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE waitlist_consultations
  ADD CONSTRAINT waitlist_consultations_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_consultations_org_id ON waitlist_consultations(org_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_consultations_org_waitlist ON waitlist_consultations(org_id, waitlist_id);

-- RLS policy (org-based)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'waitlist_consultations_org_isolation') THEN
    CREATE POLICY waitlist_consultations_org_isolation ON waitlist_consultations
      FOR ALL
      USING (org_id = get_user_org_id());
  END IF;
END $$;
