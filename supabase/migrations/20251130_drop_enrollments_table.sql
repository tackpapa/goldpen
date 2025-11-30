-- =====================================================
-- Drop enrollments table migration
-- Created: 2025-11-30
-- Purpose: Remove unused enrollments table (replaced by class_enrollments)
-- =====================================================

-- 1. billing_transactions에서 enrollment_id FK 제약 조건 제거
ALTER TABLE billing_transactions
  DROP CONSTRAINT IF EXISTS billing_transactions_enrollment_id_fkey;

-- 2. billing_transactions에서 enrollment_id 컬럼 제거 (사용되지 않음)
ALTER TABLE billing_transactions
  DROP COLUMN IF EXISTS enrollment_id;

-- 3. enrollments 테이블의 RLS 정책 제거
DROP POLICY IF EXISTS "Allow authenticated users to view enrollments" ON enrollments;
DROP POLICY IF EXISTS "Allow authenticated users to manage enrollments" ON enrollments;

-- 4. enrollments 테이블 트리거 제거
DROP TRIGGER IF EXISTS update_enrollments_updated_at ON enrollments;

-- 5. enrollments 테이블 제거 (cascade로 인덱스도 함께 제거됨)
DROP TABLE IF EXISTS enrollments CASCADE;

-- 6. 참고: class_enrollments 테이블이 enrollments를 대체함
-- class_enrollments 테이블은 그대로 유지
COMMENT ON TABLE class_enrollments IS 'Student enrollments in classes (반 학생 배정) - replaces old enrollments table';
