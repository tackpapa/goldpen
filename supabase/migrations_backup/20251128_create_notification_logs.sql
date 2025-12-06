-- =====================================================
-- Notification Logs Table Migration
-- Created: 2025-11-28
-- Purpose: Track sent notifications to prevent duplicates
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Target
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Notification Type
  type TEXT NOT NULL CHECK (type IN (
    'study_late',      -- 독서실 지각
    'study_absent',    -- 독서실 결석
    'class_late',      -- 강의 지각
    'class_absent'     -- 강의 결석
  )),

  -- Reference (class_id for class notifications, null for study room)
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,

  -- Date for deduplication (one notification per type per day)
  target_date DATE NOT NULL,

  -- Scheduled time that triggered this notification
  scheduled_time TIME,

  -- Notification details
  recipient_phone TEXT,
  message TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,

  -- Unique constraint: one notification per student per type per class per date
  UNIQUE(org_id, student_id, type, class_id, target_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_org ON notification_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_student ON notification_logs(org_id, student_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_date ON notification_logs(org_id, target_date DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(org_id, type, target_date);

-- RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_logs_select_policy" ON notification_logs
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "notification_logs_insert_policy" ON notification_logs
  FOR INSERT WITH CHECK (TRUE); -- Allow cron worker to insert

CREATE POLICY "notification_logs_update_policy" ON notification_logs
  FOR UPDATE USING (org_id = get_user_org_id());

COMMENT ON TABLE notification_logs IS 'Notification history for attendance alerts (출결 알림 기록)';
COMMENT ON COLUMN notification_logs.type IS 'study_late/study_absent for 독서실, class_late/class_absent for 강의';
COMMENT ON COLUMN notification_logs.target_date IS 'Date for deduplication - one notification per type per day';
