-- ============================================
-- GoldPen Expenses Table
-- 지출 관리 테이블 생성
-- ============================================

-- 1. expenses 테이블 (지출)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('salary', 'rent', 'utilities', 'supplies', 'marketing', 'maintenance', 'other')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer', 'other')),
  receipt_url TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX idx_expenses_org_id ON expenses(org_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_approved_by ON expenses(approved_by);

-- 3. updated_at 자동 업데이트 트리거
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 - expenses
CREATE POLICY "Users can view expenses in own organization"
  ON expenses FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Owners/Managers can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Owners/Managers can update expenses"
  ON expenses FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Owners can delete expenses"
  ON expenses FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role = 'owner'));
