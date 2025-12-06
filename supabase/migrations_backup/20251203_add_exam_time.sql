-- 시험 시작 시간 컬럼 추가
ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_time TIME;

-- 기존 데이터에 기본 시간 설정 (선택적)
-- UPDATE exams SET exam_time = '09:00' WHERE exam_time IS NULL;

COMMENT ON COLUMN exams.exam_time IS '시험 시작 시간 (HH:MM 형식)';
