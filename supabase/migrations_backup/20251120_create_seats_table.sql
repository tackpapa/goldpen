-- ============================================
-- GoldPen Seats Table
-- 좌석 관리 테이블 생성 (자습실 좌석 배정)
-- ============================================

-- 1. seats 테이블 (좌석)
CREATE TABLE IF NOT EXISTS seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  seat_number INT NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  assigned_date DATE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 강의실에서 좌석 번호는 유일해야 함
  UNIQUE(room_id, seat_number)
);

-- 2. 인덱스 생성
CREATE INDEX idx_seats_org_id ON seats(org_id);
CREATE INDEX idx_seats_room_id ON seats(room_id);
CREATE INDEX idx_seats_student_id ON seats(student_id);
CREATE INDEX idx_seats_seat_number ON seats(seat_number);
CREATE INDEX idx_seats_status ON seats(status);

-- 3. updated_at 자동 업데이트 트리거
CREATE TRIGGER update_seats_updated_at
BEFORE UPDATE ON seats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 - seats
CREATE POLICY "Users can view seats in own organization"
  ON seats FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create seats in own organization"
  ON seats FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update seats in own organization"
  ON seats FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Owners/Managers can delete seats"
  ON seats FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager')));
