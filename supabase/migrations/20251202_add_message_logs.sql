-- 메시지 발송 로그 테이블
-- 발송된 SMS, 카카오 알림톡 기록을 저장하여 통계 및 손익 계산에 활용

CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  message_type VARCHAR(50) NOT NULL, -- sms, kakao_alimtalk
  recipient_count INTEGER NOT NULL DEFAULT 1, -- 수신자 수
  price_per_message INTEGER NOT NULL DEFAULT 0, -- 발송 당시 건당 판매가
  cost_per_message INTEGER NOT NULL DEFAULT 0, -- 발송 당시 건당 원가
  total_price INTEGER NOT NULL DEFAULT 0, -- 총 판매가 (price * count)
  total_cost INTEGER NOT NULL DEFAULT 0, -- 총 원가 (cost * count)
  profit INTEGER NOT NULL DEFAULT 0, -- 순이익 (total_price - total_cost)
  status VARCHAR(20) DEFAULT 'sent', -- sent, failed, pending
  sent_by UUID REFERENCES users(id), -- 발송자
  description TEXT, -- 발송 내용 요약
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_message_logs_org_id ON message_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_type ON message_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON message_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_logs_org_type_date ON message_logs(org_id, message_type, created_at DESC);

-- RLS 정책
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- Service role만 접근 가능 (Admin API에서만)
CREATE POLICY "Service role full access" ON message_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 테이블 주석
COMMENT ON TABLE message_logs IS '메시지 발송 로그 및 비용 기록';
COMMENT ON COLUMN message_logs.message_type IS 'sms, kakao_alimtalk';
COMMENT ON COLUMN message_logs.recipient_count IS '수신자 수';
COMMENT ON COLUMN message_logs.price_per_message IS '발송 당시 건당 판매가 (원)';
COMMENT ON COLUMN message_logs.cost_per_message IS '발송 당시 건당 원가 (원)';
COMMENT ON COLUMN message_logs.profit IS '순이익 = total_price - total_cost';
