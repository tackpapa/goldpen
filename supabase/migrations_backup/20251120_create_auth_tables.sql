-- ============================================
-- GoldPen Authentication Tables
-- 기관(organizations), 사용자(users) 테이블 생성
-- ============================================

-- 1. organizations 테이블 (기관)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'academy' CHECK (type IN ('academy', 'learning_center', 'study_cafe', 'tutoring')),
  owner_id UUID, -- auth.users(id) 참조 (나중에 FK 추가)
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. users 테이블 (사용자 프로필)
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'teacher', 'staff', 'student', 'parent');

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY, -- auth.users(id)와 동일한 ID 사용
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'student',
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(email)
);

-- 3. 인덱스 생성
CREATE INDEX idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- 4. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS (Row Level Security) 활성화
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 6. RLS 정책 - organizations
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
    OR owner_id = auth.uid()
  );

CREATE POLICY "Owners can update own organization"
  ON organizations FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Anyone can create organization" -- 회원가입 시 필요
  ON organizations FOR INSERT
  WITH CHECK (true);

-- 7. RLS 정책 - users
CREATE POLICY "Users can view users in own organization"
  ON users FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Anyone can create user profile" -- 회원가입 시 필요
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners/Managers can manage users"
  ON users FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

-- 8. 초기 데이터 (테스트용 - 선택사항)
-- COMMENT: 실제 운영에서는 회원가입 API를 통해 생성됨
