-- =====================================================
-- Simplify Homework Structure Migration
-- Created: 2025-11-30
-- Purpose: homework 테이블 중심으로 구조 통합
--         homework_assignments 테이블 제거
-- =====================================================

-- 1. 기존 homework_submissions 데이터 삭제 (FK 변경 전)
DELETE FROM homework_submissions;

-- 2. 기존 FK 제약 조건 제거
ALTER TABLE homework_submissions
  DROP CONSTRAINT IF EXISTS homework_submissions_assignment_id_fkey;

-- 3. assignment_id 컬럼을 homework_id로 이름 변경
ALTER TABLE homework_submissions
  RENAME COLUMN assignment_id TO homework_id;

-- 4. 새 FK 제약 조건 추가 (homework 테이블 참조)
ALTER TABLE homework_submissions
  ADD CONSTRAINT homework_submissions_homework_id_fkey
  FOREIGN KEY (homework_id) REFERENCES homework(id) ON DELETE CASCADE;

-- 5. student_name 컬럼 추가
ALTER TABLE homework_submissions
  ADD COLUMN IF NOT EXISTS student_name TEXT;

-- 6. homework_assignments 테이블 제거
DROP TABLE IF EXISTS homework_assignments CASCADE;

-- 7. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_homework_submissions_homework_id
  ON homework_submissions(homework_id);

CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_id
  ON homework_submissions(student_id);

-- =====================================================
-- 완료 메시지
-- =====================================================
-- 마이그레이션 완료:
-- - homework_submissions.assignment_id → homework_id로 변경
-- - FK가 homework_assignments → homework로 변경됨
-- - student_name 컬럼 추가됨
-- - homework_assignments 테이블 제거됨
