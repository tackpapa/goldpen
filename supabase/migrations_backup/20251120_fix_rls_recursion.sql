-- ============================================
-- RLS 정책 무한 재귀 문제 해결
-- SECURITY DEFINER 함수를 사용하여 순환 참조 방지
-- ============================================

-- 1. 기존 순환 참조 정책 삭제
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Users can view users in own organization" ON users;
DROP POLICY IF EXISTS "Owners/Managers can manage users" ON users;

-- 2. SECURITY DEFINER 함수 생성
-- auth.uid()의 org_id를 반환 (RLS 우회)
CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- auth.uid()의 role을 반환 (RLS 우회)
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. 재귀 없는 RLS 정책 재생성
-- organizations 테이블
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (
    id = public.user_org_id()
    OR owner_id = auth.uid()
  );

-- users 테이블 (SELECT)
CREATE POLICY "Users can view users in own organization"
  ON users FOR SELECT
  USING (
    id = auth.uid()  -- 자기 자신은 항상 조회 가능
    OR org_id = public.user_org_id()  -- 또는 같은 조직
  );

-- users 테이블 (ALL for owners/managers)
CREATE POLICY "Owners/Managers can manage users"
  ON users FOR ALL
  USING (
    org_id = public.user_org_id()
    AND public.user_role() IN ('owner', 'manager')
  );

-- 4. 함수에 권한 부여
GRANT EXECUTE ON FUNCTION public.user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_org_id() TO anon;
GRANT EXECUTE ON FUNCTION public.user_role() TO anon;

-- 5. 주석
COMMENT ON FUNCTION public.user_org_id() IS '현재 인증된 사용자의 조직 ID 반환 (SECURITY DEFINER로 RLS 우회)';
COMMENT ON FUNCTION public.user_role() IS '현재 인증된 사용자의 역할 반환 (SECURITY DEFINER로 RLS 우회)';
