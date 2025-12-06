-- ============================================
-- GoldPen Homework Table
-- 숙제 관리 테이블 생성
-- ============================================

-- 1. homework 테이블 (숙제)
CREATE TABLE IF NOT EXISTS homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  assigned_date TIMESTAMPTZ DEFAULT NOW(),
  attachments JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- homework_submissions 테이블 (숙제 제출)
CREATE TABLE IF NOT EXISTS homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  content TEXT,
  attachments JSONB DEFAULT '[]',
  grade INT CHECK (grade >= 0 AND grade <= 100),
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'late')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(homework_id, student_id)
);

-- 2. 인덱스 생성
CREATE INDEX idx_homework_org_id ON homework(org_id);
CREATE INDEX idx_homework_class_id ON homework(class_id);
CREATE INDEX idx_homework_teacher_id ON homework(teacher_id);
CREATE INDEX idx_homework_due_date ON homework(due_date);
CREATE INDEX idx_homework_status ON homework(status);

CREATE INDEX idx_homework_submissions_homework_id ON homework_submissions(homework_id);
CREATE INDEX idx_homework_submissions_student_id ON homework_submissions(student_id);
CREATE INDEX idx_homework_submissions_org_id ON homework_submissions(org_id);
CREATE INDEX idx_homework_submissions_status ON homework_submissions(status);

-- 3. updated_at 자동 업데이트 트리거
CREATE TRIGGER update_homework_updated_at
BEFORE UPDATE ON homework
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homework_submissions_updated_at
BEFORE UPDATE ON homework_submissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 - homework
CREATE POLICY "Users can view homework in own organization"
  ON homework FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create homework in own organization"
  ON homework FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update homework in own organization"
  ON homework FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Owners/Managers/Teachers can delete homework"
  ON homework FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'teacher')));

-- 6. RLS 정책 - homework_submissions
CREATE POLICY "Users can view homework submissions in own organization"
  ON homework_submissions FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Students can create own homework submissions"
  ON homework_submissions FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update homework submissions in own organization"
  ON homework_submissions FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Owners/Managers/Teachers can delete homework submissions"
  ON homework_submissions FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'teacher')));
