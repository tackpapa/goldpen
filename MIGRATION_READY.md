# Migration 준비 완료

Supabase Dashboard에서 다음 SQL을 실행하세요:
https://supabase.com/dashboard/project/vdxxzygqjjjptzlvgrtw/sql/new

```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

UPDATE users
SET role = 'super_admin'
WHERE id = 'f605cd18-179b-4c54-bf66-0289d47d3fbf';

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise')),
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 50;
```

실행 후:
- 브라우저 캐시 클리어 (Cmd+Shift+R)
- http://localhost:8000/login 접속
- admin@goldpen.kr / 12345678 로그인
- /superadmin/dashboard로 리다이렉트 확인
