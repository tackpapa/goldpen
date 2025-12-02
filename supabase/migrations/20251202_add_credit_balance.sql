-- organizations 테이블에 credit_balance 컬럼 추가
-- 조직별 충전금 잔액 관리

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS credit_balance INTEGER DEFAULT 0;

-- 충전금 변경 이력을 추적하기 위한 테이블 생성
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- 양수: 충전, 음수: 차감
  balance_after INTEGER NOT NULL, -- 거래 후 잔액
  type VARCHAR(20) DEFAULT 'free', -- 충전금 타입: 'free' (관리자 무료 부여), 'paid' (유저 직접 결제)
  description TEXT,
  admin_id UUID REFERENCES users(id), -- 처리한 관리자
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 타입 컬럼에 대한 주석
COMMENT ON COLUMN credit_transactions.type IS '충전금 타입: free (관리자 무료 부여), paid (유저 직접 결제)';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_credit_transactions_org_id ON credit_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- RLS 정책 (super_admin만 접근 가능)
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- 모든 권한은 service_role만 가능 (Admin API에서만 접근)
CREATE POLICY "Service role full access" ON credit_transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);
