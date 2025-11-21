-- =====================================================
-- Schedules Tables Migration
-- Created: 2025-11-21
-- Purpose: Create schedules and room_schedules tables
-- =====================================================

-- =====================================================
-- PHASE 1: schedules table (Class schedules)
-- =====================================================

-- Teacher/Class schedule table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_schedules_org_id ON schedules(org_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_teacher_id ON schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day_of_week ON schedules(org_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedules_time ON schedules(org_id, start_time, end_time);

COMMENT ON TABLE schedules IS 'Class schedules for group classes (반 수업 시간표)';
COMMENT ON COLUMN schedules.day_of_week IS 'Day of week (monday to sunday)';
COMMENT ON COLUMN schedules.start_time IS 'Start time (HH:MM format)';
COMMENT ON COLUMN schedules.end_time IS 'End time (HH:MM format)';

-- =====================================================
-- PHASE 2: room_schedules table (1:1 Room bookings)
-- =====================================================

-- Room schedule/booking table for 1:1 tutoring
CREATE TABLE IF NOT EXISTS room_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  teacher_name TEXT,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  student_name TEXT,
  student_grade INTEGER,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_room_schedules_org_id ON room_schedules(org_id);
CREATE INDEX IF NOT EXISTS idx_room_schedules_room_id ON room_schedules(room_id);
CREATE INDEX IF NOT EXISTS idx_room_schedules_teacher_id ON room_schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_room_schedules_student_id ON room_schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_room_schedules_day_of_week ON room_schedules(org_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_room_schedules_time ON room_schedules(org_id, start_time, end_time);

COMMENT ON TABLE room_schedules IS 'Room bookings for 1:1 tutoring (1:1 과외실 예약)';
COMMENT ON COLUMN room_schedules.student_name IS 'Denormalized for display when student is deleted';
COMMENT ON COLUMN room_schedules.teacher_name IS 'Denormalized for display when teacher is deleted';

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_schedules ENABLE ROW LEVEL SECURITY;

-- ===== schedules policies =====
CREATE POLICY "schedules_select_policy" ON schedules
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "schedules_insert_policy" ON schedules
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff'))
  );

CREATE POLICY "schedules_update_policy" ON schedules
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff'))
  );

CREATE POLICY "schedules_delete_policy" ON schedules
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff'))
  );

-- ===== room_schedules policies =====
CREATE POLICY "room_schedules_select_policy" ON room_schedules
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "room_schedules_insert_policy" ON room_schedules
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff'))
  );

CREATE POLICY "room_schedules_update_policy" ON room_schedules
  FOR UPDATE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff'))
  );

CREATE POLICY "room_schedules_delete_policy" ON room_schedules
  FOR DELETE
  USING (
    org_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff'))
  );

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Created 2 new tables:
--   1. schedules (class schedules)
--   2. room_schedules (1:1 room bookings)
--
-- Both tables have:
--   - RLS policies (org_id isolation)
--   - Indexes for performance
--   - Comments for documentation
-- =====================================================
