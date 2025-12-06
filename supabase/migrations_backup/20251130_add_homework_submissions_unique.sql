-- =====================================================
-- Add Unique Constraint to homework_submissions
-- Created: 2025-11-30
-- Purpose: homework_id + student_id에 유니크 제약 조건 추가
--         (upsert를 위해 필요)
-- =====================================================

-- 기존 중복 데이터 제거 (가장 최근 것만 유지)
DELETE FROM homework_submissions a
USING homework_submissions b
WHERE a.id < b.id
  AND a.homework_id = b.homework_id
  AND a.student_id = b.student_id;

-- 유니크 제약 조건 추가
ALTER TABLE homework_submissions
  ADD CONSTRAINT homework_submissions_homework_student_unique
  UNIQUE (homework_id, student_id);

-- =====================================================
-- 완료 메시지
-- =====================================================
-- 마이그레이션 완료:
-- - homework_id + student_id 유니크 제약 조건 추가됨
-- - upsert (ON CONFLICT) 사용 가능해짐
