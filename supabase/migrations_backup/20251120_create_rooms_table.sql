-- ============================================
-- GoldPen Rooms Table
-- 강의실 관리 테이블 생성
-- ============================================

-- 1. rooms 테이블 (강의실)
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INT,
  location TEXT,
  equipment JSONB DEFAULT '[]', -- 빔프로젝터, 화이트보드 등
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX idx_rooms_org_id ON rooms(org_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_name ON rooms(name);

-- 3. updated_at 자동 업데이트 트리거
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 - rooms
CREATE POLICY "Users can view rooms in own organization"
  ON rooms FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create rooms in own organization"
  ON rooms FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update rooms in own organization"
  ON rooms FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Owners/Managers can delete rooms"
  ON rooms FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager')));
