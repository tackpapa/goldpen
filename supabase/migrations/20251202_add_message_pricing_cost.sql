-- message_pricing 테이블에 cost (원가) 컬럼 추가
-- 원가는 실제 통신사/카카오에 지불하는 비용

ALTER TABLE message_pricing ADD COLUMN IF NOT EXISTS cost INTEGER DEFAULT 0;

-- 기본 원가 값 설정 (대략적인 시장 가격)
UPDATE message_pricing SET cost = 8 WHERE message_type = 'sms';
UPDATE message_pricing SET cost = 30 WHERE message_type = 'lms';
UPDATE message_pricing SET cost = 70 WHERE message_type = 'mms';
UPDATE message_pricing SET cost = 7 WHERE message_type = 'kakao_alimtalk';
UPDATE message_pricing SET cost = 12 WHERE message_type = 'kakao_friendtalk';

-- 컬럼 주석
COMMENT ON COLUMN message_pricing.cost IS '원가 (통신사/카카오 실제 비용, 원)';
