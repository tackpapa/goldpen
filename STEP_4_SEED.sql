-- STEP 4: 초기 데이터 (관리자 계정)
-- STEP 3 완료 후 실행
-- 주의: 실행 전에 Supabase Auth에서 admin@goldpen.kr / 12345678 유저를 먼저 생성하세요!

-- 1. Super Admin Organization 생성
INSERT INTO organizations (id, name, type, owner_id, status, subscription_plan, max_users, max_students)
VALUES (
  'a0000000-0000-0000-0000-000000000000',
  'GoldPen Admin',
  'academy',
  NULL, -- owner_id는 나중에 업데이트
  'active',
  'enterprise',
  999,
  9999
);

-- 2. Admin User 프로필 생성
-- 주의: <YOUR_AUTH_USER_ID>를 Supabase Auth에서 생성된 실제 UUID로 교체하세요!
INSERT INTO users (id, org_id, role, name, email, phone)
VALUES (
  '<YOUR_AUTH_USER_ID>', -- Supabase Auth에서 복사한 UUID 입력
  'a0000000-0000-0000-0000-000000000000',
  'super_admin',
  'Admin',
  'admin@goldpen.kr',
  '010-0000-0000'
);

-- 3. Organization의 owner_id 업데이트
UPDATE organizations
SET owner_id = '<YOUR_AUTH_USER_ID>' -- 위와 동일한 UUID 입력
WHERE id = 'a0000000-0000-0000-0000-000000000000';

-- 완료!
-- 이제 admin@goldpen.kr / 12345678 로 로그인 가능합니다.
