-- ============================================
-- Add status column to users table
-- Teacher 및 모든 사용자의 활성화 상태 관리
-- ============================================

-- 1. status 컬럼 추가
ALTER TABLE users
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' NOT NULL;

-- 2. CHECK 제약 조건 추가
ALTER TABLE users
ADD CONSTRAINT users_status_check
CHECK (status IN ('active', 'inactive', 'suspended'));

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 4. 기존 데이터 업데이트 (이미 있는 users는 'active'로 설정)
UPDATE users SET status = 'active' WHERE status IS NULL;

-- 5. 코멘트 추가
COMMENT ON COLUMN users.status IS 'User account status: active, inactive, suspended';
