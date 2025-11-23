-- teachers 테이블에 payment_day (급여일) 추가
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS payment_day INTEGER
  CHECK (payment_day >= 1 AND payment_day <= 31)
  DEFAULT 25;

COMMENT ON COLUMN teachers.payment_day IS '월 급여 지급일 (1-31일, 기본값: 25일)';

-- 인덱스 추가: 급여 계산 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_lessons_teacher_date
  ON lessons(teacher_id, lesson_date DESC);

-- 기존 강사들에게 기본값(25일) 설정
UPDATE teachers
SET payment_day = 25
WHERE payment_day IS NULL;
