-- 매니저 관리를 위한 users 테이블 확장
-- 급여, 고용 정보를 users 테이블에 추가 (role이 manager, teacher인 경우 사용)

-- 고용 형태
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20) DEFAULT 'full_time';

-- 급여 유형 (월급/시급)
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary_type VARCHAR(20) DEFAULT 'monthly';

-- 급여 금액
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary_amount BIGINT DEFAULT 0;

-- 급여일 (매월 N일)
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_day INTEGER DEFAULT 25;

-- 입사일
ALTER TABLE users ADD COLUMN IF NOT EXISTS hire_date DATE;

-- 메모
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;

-- 코멘트 추가
COMMENT ON COLUMN users.employment_type IS '고용형태: full_time, part_time, contract';
COMMENT ON COLUMN users.salary_type IS '급여유형: monthly, hourly';
COMMENT ON COLUMN users.salary_amount IS '급여금액 (원)';
COMMENT ON COLUMN users.payment_day IS '급여일 (1-31)';
COMMENT ON COLUMN users.hire_date IS '입사일';
COMMENT ON COLUMN users.notes IS '메모';
