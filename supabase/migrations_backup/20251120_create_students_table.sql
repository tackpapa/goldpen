-- ============================================
-- GoldPen Students Table
-- 학생 관리 테이블 생성
-- ============================================

-- 1. students 테이블 (학생)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT,
  phone TEXT,
  parent_phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX idx_students_org_id ON students(org_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_name ON students(name);

-- 3. updated_at 자동 업데이트 트리거
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 - students
-- 같은 조직의 사용자만 조회 가능
CREATE POLICY "Users can view students in own organization"
  ON students FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- 같은 조직의 사용자가 학생 생성 가능
CREATE POLICY "Users can create students in own organization"
  ON students FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- 같은 조직의 사용자가 학생 정보 수정 가능
CREATE POLICY "Users can update students in own organization"
  ON students FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- 같은 조직의 owner/manager만 학생 삭제 가능
CREATE POLICY "Owners/Managers can delete students"
  ON students FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );
