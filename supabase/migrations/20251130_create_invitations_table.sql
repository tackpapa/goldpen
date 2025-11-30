-- 초대 테이블 생성 (이메일 초대 시스템)
-- 2025-11-30

-- 초대 테이블 생성
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'teacher')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ
);

-- 같은 기관에 같은 이메일로 pending 상태인 초대는 하나만 존재 (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitation
  ON invitations(org_id, email)
  WHERE status = 'pending';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);

-- RLS 활성화
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 같은 기관의 owner/super_admin만 초대 조회 가능
CREATE POLICY "Users can view invitations in their org"
  ON invitations FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role::text IN ('owner', 'super_admin')
    )
  );

-- RLS 정책: 같은 기관의 owner/super_admin만 초대 생성 가능
CREATE POLICY "Admins can create invitations in their org"
  ON invitations FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role::text IN ('owner', 'super_admin')
    )
  );

-- RLS 정책: 같은 기관의 owner/super_admin만 초대 수정 가능
CREATE POLICY "Admins can update invitations in their org"
  ON invitations FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role::text IN ('owner', 'super_admin')
    )
  );

-- RLS 정책: 같은 기관의 owner/super_admin만 초대 삭제 가능
CREATE POLICY "Admins can delete invitations in their org"
  ON invitations FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role::text IN ('owner', 'super_admin')
    )
  );

-- RLS 정책: 토큰으로 초대 조회 가능 (초대 수락 시)
CREATE POLICY "Anyone can view invitation by token"
  ON invitations FOR SELECT
  USING (true);

-- 만료된 초대 자동 상태 변경 함수
CREATE OR REPLACE FUNCTION update_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 코멘트 추가
COMMENT ON TABLE invitations IS '이메일 초대 테이블';
COMMENT ON COLUMN invitations.id IS '초대 고유 ID';
COMMENT ON COLUMN invitations.org_id IS '기관 ID';
COMMENT ON COLUMN invitations.email IS '초대받는 이메일 주소';
COMMENT ON COLUMN invitations.role IS '초대받는 역할 (owner, manager, teacher)';
COMMENT ON COLUMN invitations.token IS '초대 토큰 (URL에 사용)';
COMMENT ON COLUMN invitations.status IS '초대 상태 (pending, accepted, expired, cancelled)';
COMMENT ON COLUMN invitations.invited_by IS '초대한 사용자 ID';
COMMENT ON COLUMN invitations.accepted_by IS '초대를 수락한 사용자 ID';
COMMENT ON COLUMN invitations.created_at IS '초대 생성 시간';
COMMENT ON COLUMN invitations.expires_at IS '초대 만료 시간';
COMMENT ON COLUMN invitations.accepted_at IS '초대 수락 시간';
