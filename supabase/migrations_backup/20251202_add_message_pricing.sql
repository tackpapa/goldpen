-- 메시지 비용 설정 테이블
-- SMS, LMS, MMS, 카카오 알림톡, 친구톡 등의 건당 비용을 관리

CREATE TABLE IF NOT EXISTS message_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_type VARCHAR(50) NOT NULL UNIQUE, -- sms, lms, mms, kakao_alimtalk, kakao_friendtalk
  price INTEGER NOT NULL DEFAULT 0, -- 건당 비용 (원)
  description TEXT, -- 설명
  is_active BOOLEAN DEFAULT TRUE, -- 활성화 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 비용 데이터 삽입
INSERT INTO message_pricing (message_type, price, description) VALUES
  ('sms', 20, 'SMS 단문 문자 (90자 이하)'),
  ('lms', 50, 'LMS 장문 문자 (2,000자 이하)'),
  ('mms', 100, 'MMS 멀티미디어 문자 (이미지 포함)'),
  ('kakao_alimtalk', 9, '카카오 알림톡 (템플릿 기반)'),
  ('kakao_friendtalk', 15, '카카오 친구톡 (광고성 메시지)')
ON CONFLICT (message_type) DO NOTHING;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_message_pricing_type ON message_pricing(message_type);

-- RLS 정책 (super_admin만 수정 가능)
ALTER TABLE message_pricing ENABLE ROW LEVEL SECURITY;

-- 모든 권한은 service_role만 가능 (Admin API에서만 접근)
CREATE POLICY "Service role full access" ON message_pricing
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 타입에 대한 주석
COMMENT ON TABLE message_pricing IS '메시지 종류별 건당 비용 설정';
COMMENT ON COLUMN message_pricing.message_type IS '메시지 타입: sms, lms, mms, kakao_alimtalk, kakao_friendtalk';
COMMENT ON COLUMN message_pricing.price IS '건당 비용 (원)';
