-- Add org_id and proper FKs to high-risk tables

-- call_records
ALTER TABLE call_records ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE call_records ADD COLUMN IF NOT EXISTS student_id_tmp UUID;
UPDATE call_records SET student_id_tmp = student_id::uuid WHERE student_id::text ~* '^[0-9a-fA-F-]{36}$';
DELETE FROM call_records WHERE student_id_tmp IS NULL;
ALTER TABLE call_records DROP COLUMN student_id;
ALTER TABLE call_records RENAME COLUMN student_id_tmp TO student_id;
ALTER TABLE call_records ALTER COLUMN student_id SET NOT NULL;
UPDATE call_records c SET org_id = s.org_id FROM students s WHERE c.student_id = s.id AND c.org_id IS NULL;
ALTER TABLE call_records ALTER COLUMN org_id SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'call_records_org_id_fkey'
  ) THEN
    ALTER TABLE call_records ADD CONSTRAINT call_records_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'call_records_student_id_fkey'
  ) THEN
    ALTER TABLE call_records ADD CONSTRAINT call_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_call_records_org_id ON call_records(org_id);
CREATE INDEX IF NOT EXISTS idx_call_records_org_student ON call_records(org_id, student_id);
DO $$BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'call_records_org_isolation') THEN
    CREATE POLICY call_records_org_isolation ON call_records FOR ALL USING (org_id = get_user_org_id());
  END IF;
END$$;

-- livescreen_state
ALTER TABLE livescreen_state ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE livescreen_state ADD COLUMN IF NOT EXISTS student_id_tmp UUID;
UPDATE livescreen_state SET student_id_tmp = student_id::uuid WHERE student_id::text ~* '^[0-9a-fA-F-]{36}$';
DELETE FROM livescreen_state WHERE student_id_tmp IS NULL;
ALTER TABLE livescreen_state DROP COLUMN student_id;
ALTER TABLE livescreen_state RENAME COLUMN student_id_tmp TO student_id;
ALTER TABLE livescreen_state ALTER COLUMN student_id SET NOT NULL;
UPDATE livescreen_state l SET org_id = s.org_id FROM students s WHERE l.student_id = s.id AND l.org_id IS NULL;
ALTER TABLE livescreen_state ALTER COLUMN org_id SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'livescreen_state_org_id_fkey'
  ) THEN
    ALTER TABLE livescreen_state ADD CONSTRAINT livescreen_state_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'livescreen_state_student_id_fkey'
  ) THEN
    ALTER TABLE livescreen_state ADD CONSTRAINT livescreen_state_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_livescreen_state_org_id ON livescreen_state(org_id);
CREATE INDEX IF NOT EXISTS idx_livescreen_state_org_student ON livescreen_state(org_id, student_id);
DO $$BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'livescreen_state_org_isolation') THEN
    CREATE POLICY livescreen_state_org_isolation ON livescreen_state FOR ALL USING (org_id = get_user_org_id());
  END IF;
END$$;

-- manager_calls
ALTER TABLE manager_calls ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE manager_calls ADD COLUMN IF NOT EXISTS student_id_tmp UUID;
UPDATE manager_calls SET student_id_tmp = student_id::uuid WHERE student_id::text ~* '^[0-9a-fA-F-]{36}$';
DELETE FROM manager_calls WHERE student_id_tmp IS NULL;
ALTER TABLE manager_calls DROP COLUMN student_id;
ALTER TABLE manager_calls RENAME COLUMN student_id_tmp TO student_id;
ALTER TABLE manager_calls ALTER COLUMN student_id SET NOT NULL;
UPDATE manager_calls m SET org_id = s.org_id FROM students s WHERE m.student_id = s.id AND m.org_id IS NULL;
ALTER TABLE manager_calls ALTER COLUMN org_id SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'manager_calls_org_id_fkey'
  ) THEN
    ALTER TABLE manager_calls ADD CONSTRAINT manager_calls_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'manager_calls_student_id_fkey'
  ) THEN
    ALTER TABLE manager_calls ADD CONSTRAINT manager_calls_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_manager_calls_org_id ON manager_calls(org_id);
CREATE INDEX IF NOT EXISTS idx_manager_calls_org_student ON manager_calls(org_id, student_id);
DO $$BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manager_calls_org_isolation') THEN
    CREATE POLICY manager_calls_org_isolation ON manager_calls FOR ALL USING (org_id = get_user_org_id());
  END IF;
END$$;

-- outing_records
ALTER TABLE outing_records ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE outing_records ADD COLUMN IF NOT EXISTS student_id_tmp UUID;
UPDATE outing_records SET student_id_tmp = student_id::uuid WHERE student_id::text ~* '^[0-9a-fA-F-]{36}$';
DELETE FROM outing_records WHERE student_id_tmp IS NULL;
ALTER TABLE outing_records DROP COLUMN student_id;
ALTER TABLE outing_records RENAME COLUMN student_id_tmp TO student_id;
ALTER TABLE outing_records ALTER COLUMN student_id SET NOT NULL;
UPDATE outing_records o SET org_id = s.org_id FROM students s WHERE o.student_id = s.id AND o.org_id IS NULL;
ALTER TABLE outing_records ALTER COLUMN org_id SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outing_records_org_id_fkey'
  ) THEN
    ALTER TABLE outing_records ADD CONSTRAINT outing_records_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outing_records_student_id_fkey'
  ) THEN
    ALTER TABLE outing_records ADD CONSTRAINT outing_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_outing_records_org_id ON outing_records(org_id);
CREATE INDEX IF NOT EXISTS idx_outing_records_org_student ON outing_records(org_id, student_id);
DO $$BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'outing_records_org_isolation') THEN
    CREATE POLICY outing_records_org_isolation ON outing_records FOR ALL USING (org_id = get_user_org_id());
  END IF;
END$$;

-- sleep_records
ALTER TABLE sleep_records ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE sleep_records ADD COLUMN IF NOT EXISTS student_id_tmp UUID;
UPDATE sleep_records SET student_id_tmp = student_id::uuid WHERE student_id::text ~* '^[0-9a-fA-F-]{36}$';
DELETE FROM sleep_records WHERE student_id_tmp IS NULL;
ALTER TABLE sleep_records DROP COLUMN student_id;
ALTER TABLE sleep_records RENAME COLUMN student_id_tmp TO student_id;
ALTER TABLE sleep_records ALTER COLUMN student_id SET NOT NULL;
UPDATE sleep_records o SET org_id = s.org_id FROM students s WHERE o.student_id = s.id AND o.org_id IS NULL;
ALTER TABLE sleep_records ALTER COLUMN org_id SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sleep_records_org_id_fkey'
  ) THEN
    ALTER TABLE sleep_records ADD CONSTRAINT sleep_records_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sleep_records_student_id_fkey'
  ) THEN
    ALTER TABLE sleep_records ADD CONSTRAINT sleep_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_sleep_records_org_id ON sleep_records(org_id);
CREATE INDEX IF NOT EXISTS idx_sleep_records_org_student ON sleep_records(org_id, student_id);
DO $$BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sleep_records_org_isolation') THEN
    CREATE POLICY sleep_records_org_isolation ON sleep_records FOR ALL USING (org_id = get_user_org_id());
  END IF;
END$$;
