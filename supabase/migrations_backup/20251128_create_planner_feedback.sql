-- planner_feedback 테이블: 선생님이 학생 플래너에 피드백을 남기는 테이블
-- 학생당 1개의 피드백만 존재 (upsert 방식)

CREATE TABLE IF NOT EXISTS planner_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  feedback TEXT NOT NULL,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  teacher_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 학생당 1개의 피드백만 허용
  UNIQUE(org_id, student_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_planner_feedback_org_id ON planner_feedback(org_id);
CREATE INDEX IF NOT EXISTS idx_planner_feedback_student_id ON planner_feedback(student_id);

-- RLS 활성화
ALTER TABLE planner_feedback ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 같은 org의 데이터만 접근
CREATE POLICY "Users can view planner_feedback in their org"
  ON planner_feedback FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert planner_feedback in their org"
  ON planner_feedback FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update planner_feedback in their org"
  ON planner_feedback FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete planner_feedback in their org"
  ON planner_feedback FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_planner_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_planner_feedback_updated_at ON planner_feedback;
CREATE TRIGGER trigger_update_planner_feedback_updated_at
  BEFORE UPDATE ON planner_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_planner_feedback_updated_at();
