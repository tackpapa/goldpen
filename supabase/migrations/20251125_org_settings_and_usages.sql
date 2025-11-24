-- org_settings table: one row per organization
CREATE TABLE IF NOT EXISTS org_settings (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  name text,
  owner_name text,
  address text,
  phone text,
  email text,
  logo_url text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION set_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_org_settings ON org_settings;
CREATE TRIGGER set_timestamp_on_org_settings
  BEFORE UPDATE ON org_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_timestamp();

-- helper: ensure org_settings row exists
CREATE OR REPLACE FUNCTION ensure_org_settings(org uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO org_settings (org_id) VALUES (org)
  ON CONFLICT (org_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- KakaoTalk usage logs
CREATE TABLE IF NOT EXISTS kakao_talk_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  student_name text,
  type text,
  message text,
  cost numeric DEFAULT 0,
  status text DEFAULT 'success',
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kakao_usages_org_sent_at ON kakao_talk_usages(org_id, sent_at DESC);

-- 서비스 사용 내역
CREATE TABLE IF NOT EXISTS service_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text,
  description text,
  cost numeric DEFAULT 0,
  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_usages_org_occurred_at ON service_usages(org_id, occurred_at DESC);

-- 페이지 권한 설정 (옵션: UI 권한 토글용)
CREATE TABLE IF NOT EXISTS org_page_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  staff boolean DEFAULT true,
  teacher boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_page_permissions_unique ON org_page_permissions(org_id, page_id);
DROP TRIGGER IF EXISTS set_timestamp_on_org_page_permissions ON org_page_permissions;
CREATE TRIGGER set_timestamp_on_org_page_permissions
  BEFORE UPDATE ON org_page_permissions
  FOR EACH ROW
  EXECUTE FUNCTION set_timestamp();

-- 교실 비고 필드 추가 (settings/rooms 연동)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS notes text;
