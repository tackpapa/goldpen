-- ============================================
-- GoldPen Lessons Table
-- 수업 관리 테이블 생성
-- ============================================

-- 1. lessons 테이블 (수업)
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  lesson_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  materials JSONB DEFAULT '[]',
  attendance_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX idx_lessons_org_id ON lessons(org_id);
CREATE INDEX idx_lessons_class_id ON lessons(class_id);
CREATE INDEX idx_lessons_teacher_id ON lessons(teacher_id);
CREATE INDEX idx_lessons_room_id ON lessons(room_id);
CREATE INDEX idx_lessons_lesson_date ON lessons(lesson_date);
CREATE INDEX idx_lessons_status ON lessons(status);

-- 3. updated_at 자동 업데이트 트리거
CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON lessons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 - lessons
CREATE POLICY "Users can view lessons in own organization"
  ON lessons FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create lessons in own organization"
  ON lessons FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update lessons in own organization"
  ON lessons FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Owners/Managers/Teachers can delete lessons"
  ON lessons FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager', 'teacher')));
