-- 매니저 급여 관련 컬럼 추가
ALTER TABLE users
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full_time',
ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS salary_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hire_date DATE;

-- 코멘트 추가
COMMENT ON COLUMN users.employment_type IS '고용형태: full_time(정규직), part_time(파트타임), contract(계약직)';
COMMENT ON COLUMN users.salary_type IS '급여유형: monthly(월급), hourly(시급)';
COMMENT ON COLUMN users.salary_amount IS '급여액 (원)';
COMMENT ON COLUMN users.hire_date IS '입사일';
