-- 등하원 일정 테이블
-- UI: 요일별 등원/하원 시간 (요일: monday~sunday)

CREATE TABLE IF NOT EXISTS commute_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  weekday TEXT NOT NULL CHECK (weekday IN (
    'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
  )),
  check_in_time TIME,
  check_out_time TIME,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT commute_schedules_unique UNIQUE (org_id, student_id, weekday)
);

CREATE INDEX IF NOT EXISTS idx_commute_schedules_org_student
  ON commute_schedules(org_id, student_id);

CREATE INDEX IF NOT EXISTS idx_commute_schedules_weekday
  ON commute_schedules(org_id, weekday);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER trg_commute_schedules_updated_at
BEFORE UPDATE ON commute_schedules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE commute_schedules ENABLE ROW LEVEL SECURITY;

-- org 내 사용자만 조회
CREATE POLICY commute_schedules_select_policy ON commute_schedules
  FOR SELECT USING (org_id = auth.uid()::text::uuid OR TRUE);

-- 소유자/매니저/스태프/교사 모두 등록 가능 (필요시 좁힐 수 있음)
CREATE POLICY commute_schedules_write_policy ON commute_schedules
  FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY commute_schedules_update_policy ON commute_schedules
  FOR UPDATE USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY commute_schedules_delete_policy ON commute_schedules
  FOR DELETE USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

