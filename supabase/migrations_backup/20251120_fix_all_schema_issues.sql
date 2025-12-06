-- =====================================================
-- Fix All Schema Issues
-- Created: 2025-11-20
-- Purpose:
--   1. Create audit_logs table
--   2. Fix organizations-users relationship
-- =====================================================

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 감사 대상
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- 감사 내용
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', etc.
  resource_type TEXT NOT NULL, -- 'student', 'teacher', 'class', 'payment', etc.
  resource_id UUID,

  -- 변경 데이터
  old_data JSONB,
  new_data JSONB,

  -- 메타데이터
  ip_address INET,
  user_agent TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON public.audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- RLS 활성화
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS 정책: Super Admin은 모든 로그 조회 가능
CREATE POLICY "Super admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'superadmin'
    )
  );

-- RLS 정책: 조직 Admin은 자신의 조직 로그만 조회 가능
CREATE POLICY "Org admins can view their org audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'staff')
    )
  );

-- RLS 정책: 시스템이 로그 삽입 가능 (service_role)
CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- 2. Fix organizations table - Add owner relationship if not exists
DO $$
BEGIN
  -- organizations 테이블에 owner_id 컬럼 추가 (이미 있으면 무시)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

    CREATE INDEX idx_organizations_owner_id ON public.organizations(owner_id);
  END IF;
END $$;

-- 3. Comment 추가
COMMENT ON TABLE public.audit_logs IS '시스템 감사 로그 - 모든 중요한 작업을 기록';
COMMENT ON COLUMN public.audit_logs.action IS '작업 유형 (CREATE, UPDATE, DELETE, LOGIN 등)';
COMMENT ON COLUMN public.audit_logs.resource_type IS '리소스 유형 (student, teacher, class 등)';
COMMENT ON COLUMN public.audit_logs.old_data IS '변경 전 데이터 (UPDATE, DELETE 시)';
COMMENT ON COLUMN public.audit_logs.new_data IS '변경 후 데이터 (CREATE, UPDATE 시)';

COMMENT ON COLUMN public.organizations.owner_id IS '조직 소유자 (원장님)';

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ All schema issues fixed successfully!';
  RAISE NOTICE '   - audit_logs table created';
  RAISE NOTICE '   - organizations.owner_id relationship added';
END $$;
