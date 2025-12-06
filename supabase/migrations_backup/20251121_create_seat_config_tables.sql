-- =====================================================
-- 좌석 설정 테이블 (seat_configs, seat_types)
-- 독서실 좌석 수 및 타입 구역 설정 저장
-- =====================================================

-- 1. seat_configs: 조직별 총 좌석 수 설정
CREATE TABLE IF NOT EXISTS seat_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  total_seats INTEGER NOT NULL DEFAULT 20 CHECK (total_seats >= 1 AND total_seats <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id)
);

-- 2. seat_types: 좌석 타입/구역 설정 (예: 1~10번 "A구역", 11~20번 "B구역")
CREATE TABLE IF NOT EXISTS seat_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  start_number INTEGER NOT NULL CHECK (start_number >= 1),
  end_number INTEGER NOT NULL CHECK (end_number >= 1),
  type_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT seat_types_range_check CHECK (start_number <= end_number)
);

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_seat_configs_org_id ON seat_configs(org_id);
CREATE INDEX IF NOT EXISTS idx_seat_types_org_id ON seat_types(org_id);

-- 4. RLS 활성화
ALTER TABLE seat_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_types ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책: seat_configs
CREATE POLICY "seat_configs_select_own_org" ON seat_configs
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "seat_configs_insert_own_org" ON seat_configs
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "seat_configs_update_own_org" ON seat_configs
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "seat_configs_delete_own_org" ON seat_configs
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- 6. RLS 정책: seat_types
CREATE POLICY "seat_types_select_own_org" ON seat_types
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "seat_types_insert_own_org" ON seat_types
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "seat_types_update_own_org" ON seat_types
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "seat_types_delete_own_org" ON seat_types
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- 7. updated_at 트리거 함수 (이미 존재할 수 있으므로 CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. updated_at 트리거
DROP TRIGGER IF EXISTS update_seat_configs_updated_at ON seat_configs;
CREATE TRIGGER update_seat_configs_updated_at
  BEFORE UPDATE ON seat_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_seat_types_updated_at ON seat_types;
CREATE TRIGGER update_seat_types_updated_at
  BEFORE UPDATE ON seat_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'seat_configs and seat_types tables created successfully';
END $$;
