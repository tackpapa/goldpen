-- ============================================
-- GoldPen Billing Table
-- 청구/수납 관리 테이블 생성
-- ============================================

-- 1. billing 테이블 (청구/수납)
CREATE TABLE IF NOT EXISTS billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  billing_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer', 'other')),
  description TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX idx_billing_org_id ON billing(org_id);
CREATE INDEX idx_billing_student_id ON billing(student_id);
CREATE INDEX idx_billing_billing_date ON billing(billing_date);
CREATE INDEX idx_billing_due_date ON billing(due_date);
CREATE INDEX idx_billing_paid_date ON billing(paid_date);
CREATE INDEX idx_billing_status ON billing(status);

-- 3. updated_at 자동 업데이트 트리거
CREATE TRIGGER update_billing_updated_at
BEFORE UPDATE ON billing
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 - billing
CREATE POLICY "Users can view billing in own organization"
  ON billing FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Owners/Managers can create billing"
  ON billing FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Owners/Managers can update billing"
  ON billing FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Owners/Managers can delete billing"
  ON billing FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager')));
