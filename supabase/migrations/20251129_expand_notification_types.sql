-- =====================================================
-- Expand notification_logs types for real-time API notifications
-- Created: 2025-11-29
-- Purpose: Add new notification types for API events
-- =====================================================

-- Drop and recreate the CHECK constraint with expanded types
ALTER TABLE notification_logs DROP CONSTRAINT IF EXISTS notification_logs_type_check;

ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_type_check
CHECK (type IN (
  -- 기존 타입 (독서실/강의 출결)
  'study_late',      -- 독서실 지각
  'study_absent',    -- 독서실 결석
  'class_late',      -- 강의 지각
  'class_absent',    -- 강의 결석
  -- 새 타입 (실시간 API 알림)
  'academy_checkin',    -- 학원 등원
  'academy_checkout',   -- 학원 하원
  'study_checkin',      -- 독서실 입실
  'study_checkout',     -- 독서실 퇴실
  'study_out',          -- 독서실 외출
  'study_return',       -- 독서실 복귀
  'lesson_report',      -- 수업 리포트
  'exam_result',        -- 시험 결과
  'assignment_new'      -- 새 과제 알림
));

-- Add metadata column if not exists (for storing extra notification info)
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Update comment
COMMENT ON TABLE notification_logs IS 'Notification history for all types of alerts (출결, 수업 리포트, 시험 결과, 과제 알림 등)';
COMMENT ON COLUMN notification_logs.type IS 'Notification type: study_*/class_* for attendance, academy_* for checkin/out, lesson_report, exam_result, assignment_new';
