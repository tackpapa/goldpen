-- Add org_id to class_enrollments and backfill
ALTER TABLE class_enrollments ADD COLUMN IF NOT EXISTS org_id UUID;

-- Backfill from classes.org_id
UPDATE class_enrollments ce
SET org_id = c.org_id
FROM classes c
WHERE ce.class_id = c.id AND ce.org_id IS NULL;

-- Set NOT NULL and FK
ALTER TABLE class_enrollments
  ALTER COLUMN org_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_enrollments_org_id_fkey'
  ) THEN
    ALTER TABLE class_enrollments
      ADD CONSTRAINT class_enrollments_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure student FK exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'class_enrollments_student_id_fkey'
  ) THEN
    ALTER TABLE class_enrollments
      ADD CONSTRAINT class_enrollments_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes for org + class
CREATE INDEX IF NOT EXISTS idx_class_enrollments_org_id ON class_enrollments(org_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_org_class ON class_enrollments(org_id, class_id);

-- RLS policy aligning with org_id (keep class-based guard too)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'class_enrollments_org_isolation'
  ) THEN
    CREATE POLICY "class_enrollments_org_isolation" ON class_enrollments
      FOR ALL
      USING (org_id = get_user_org_id());
  END IF;
END $$;
