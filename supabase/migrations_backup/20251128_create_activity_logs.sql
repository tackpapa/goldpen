-- Activity Logs 테이블 생성
-- 모든 주요 활동을 기록하며 "누가" 했는지 사용자 이름까지 저장

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 누가 했는지 (사용자 정보)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,  -- 사용자 이름 (탈퇴해도 기록 유지)
  user_role TEXT,           -- 역할 (admin, teacher, staff 등)

  -- 무슨 활동인지
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'login', 'logout', 'view', 'export')),

  -- 어떤 엔티티에 대한 활동인지
  entity_type TEXT NOT NULL,  -- student, consultation, class, exam, attendance 등
  entity_id UUID,             -- 해당 엔티티의 ID (선택적)
  entity_name TEXT,           -- 엔티티 이름 (예: 학생 이름, 반 이름)

  -- 상세 설명
  description TEXT NOT NULL,  -- 예: "학생 '김철수'를 등록했습니다"

  -- 추가 메타데이터 (변경 전/후 값 등)
  metadata JSONB DEFAULT '{}',

  -- IP/User Agent (보안 감사용, 선택적)
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_activity_logs_org_id ON activity_logs(org_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_org_created ON activity_logs(org_id, created_at DESC);

-- RLS 활성화
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 같은 기관의 관리자/스태프만 조회 가능
CREATE POLICY "activity_logs_select_org" ON activity_logs
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS 정책: 인증된 사용자만 로그 생성 가능
CREATE POLICY "activity_logs_insert_authenticated" ON activity_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- 코멘트 추가
COMMENT ON TABLE activity_logs IS '사용자 활동 로그 - 누가 무엇을 언제 했는지 기록';
COMMENT ON COLUMN activity_logs.user_name IS '활동을 수행한 사용자의 이름 (탈퇴해도 기록 유지)';
COMMENT ON COLUMN activity_logs.action_type IS 'create, update, delete, login, logout, view, export';
COMMENT ON COLUMN activity_logs.entity_type IS 'student, consultation, class, exam, attendance, billing 등';
