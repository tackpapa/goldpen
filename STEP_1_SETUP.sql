-- STEP 1: 기본 설정 (ENUM, 함수)
-- 새 Supabase 프로젝트 SQL Editor에서 실행

-- 1. user_role enum 생성
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'teacher', 'staff', 'student', 'parent', 'super_admin');

-- 2. 헬퍼 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION user_org_id()
RETURNS uuid AS $$
  SELECT org_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;
