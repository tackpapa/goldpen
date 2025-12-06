-- ============================================
-- GoldPen Classes Table
-- 반 관리 테이블 생성
-- ============================================

-- 1. classes 테이블 (반)
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  schedule JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX idx_classes_org_id ON classes(org_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_status ON classes(status);
CREATE INDEX idx_classes_subject ON classes(subject);

-- 3. updated_at 자동 업데이트 트리거
CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON classes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 - classes
-- 같은 조직의 사용자만 조회 가능
CREATE POLICY "Users can view classes in own organization"
  ON classes FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- 같은 조직의 사용자가 반 생성 가능
CREATE POLICY "Users can create classes in own organization"
  ON classes FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- 같은 조직의 사용자가 반 정보 수정 가능
CREATE POLICY "Users can update classes in own organization"
  ON classes FOR UPDATE
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

-- 같은 조직의 owner/manager만 반 삭제 가능
CREATE POLICY "Owners/Managers can delete classes"
  ON classes FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );
