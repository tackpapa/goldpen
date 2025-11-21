-- =====================================================
-- Add transaction categories and teacher salaries
-- Created: 2025-11-21
-- Purpose: Complete billing page migration
-- =====================================================

-- 1. Add category field to billing_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_transactions'
    AND column_name = 'category'
  ) THEN
    ALTER TABLE billing_transactions
    ADD COLUMN category TEXT CHECK (category IN ('수강료', '자릿세', '룸이용료', '교재판매'));

    -- Set default category for existing records
    UPDATE billing_transactions SET category = '수강료' WHERE category IS NULL;
  END IF;
END $$;

-- 2. Create teacher_salaries table (without teachers FK for now)
CREATE TABLE IF NOT EXISTS teacher_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  teacher_id UUID, -- No FK constraint since teachers table may not exist yet
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('정규직', '시간강사')),
  salary BIGINT NOT NULL, -- In cents (원 * 100)
  hours INTEGER, -- For 시간강사 only
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_teacher_salaries_org_id ON teacher_salaries(org_id);
CREATE INDEX IF NOT EXISTS idx_teacher_salaries_teacher_id ON teacher_salaries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_salaries_payment_date ON teacher_salaries(payment_date);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_category ON billing_transactions(category);

-- 4. Enable RLS
ALTER TABLE teacher_salaries ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for teacher_salaries
CREATE POLICY "teacher_salaries_select_policy" ON teacher_salaries
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "teacher_salaries_insert_policy" ON teacher_salaries
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "teacher_salaries_update_policy" ON teacher_salaries
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "teacher_salaries_delete_policy" ON teacher_salaries
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- 6. Create trigger for automatic updated_at
CREATE OR REPLACE FUNCTION update_teacher_salaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teacher_salaries_updated_at_trigger
  BEFORE UPDATE ON teacher_salaries
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_salaries_updated_at();

-- 7. Insert seed data for teacher salaries
INSERT INTO teacher_salaries (org_id, name, type, salary, hours, payment_date) VALUES
('a0000000-0000-0000-0000-000000000000', '김수학', '정규직', 350000000, NULL, '2025-06-25'),
('a0000000-0000-0000-0000-000000000000', '이영어', '정규직', 320000000, NULL, '2025-06-25'),
('a0000000-0000-0000-0000-000000000000', '박과학', '시간강사', 180000000, 60, '2025-06-25'),
('a0000000-0000-0000-0000-000000000000', '최국어', '정규직', 300000000, NULL, '2025-06-25'),
('a0000000-0000-0000-0000-000000000000', '정사회', '시간강사', 120000000, 40, '2025-06-25')
ON CONFLICT DO NOTHING;

-- 8. Update existing billing_transactions with categories
DO $$
BEGIN
  -- Set categories based on description patterns (only if category is NULL)
  UPDATE billing_transactions
  SET category = CASE
    WHEN description LIKE '%자릿세%' OR description LIKE '%독서실%' THEN '자릿세'
    WHEN description LIKE '%룸%' THEN '룸이용료'
    WHEN description LIKE '%교재%' THEN '교재판매'
    ELSE '수강료'
  END
  WHERE category IS NULL;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Added:
-- - billing_transactions.category field (수강료, 자릿세, 룸이용료, 교재판매)
-- - teacher_salaries table with RLS policies
-- - 5 sample teacher salary records
-- =====================================================
