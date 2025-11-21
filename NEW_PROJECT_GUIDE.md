# 새 Supabase 프로젝트 셋업 가이드

## 1. 새 Supabase 프로젝트 생성

1. https://supabase.com/dashboard 접속
2. "New Project" 클릭
3. 프로젝트명: `goldpen` (또는 원하는 이름)
4. 리전: `Northeast Asia (Seoul)` 선택
5. 생성 완료 대기 (약 2분)

## 2. SQL 실행 (순서대로!)

Supabase Dashboard → SQL Editor → New Query

### STEP 1: 기본 설정
```
STEP_1_SETUP.sql 복사 → 붙여넣기 → Run
```

### STEP 2: 테이블 생성
```
STEP_2_SCHEMA.sql 복사 → 붙여넣기 → Run
```

### STEP 3: RLS 정책
```
STEP_3_RLS.sql 복사 → 붙여넣기 → Run
```

### STEP 4: 관리자 계정 생성

**먼저 Supabase Auth에서 유저 생성:**
1. Dashboard → Authentication → Users → "Add user" (Email 버튼 클릭)
2. Email: `admin@goldpen.kr`
3. Password: `12345678`
4. "Create new user" 클릭
5. **생성된 유저의 UUID 복사** (예: `f605cd18-179b-4c54-bf66-0289d47d3fbf`)

**그 다음 SQL 실행:**
1. `STEP_4_SEED.sql` 파일 열기
2. `<YOUR_AUTH_USER_ID>` 2개를 위에서 복사한 UUID로 교체
3. SQL Editor에 붙여넣기 → Run

## 3. 환경 변수 업데이트

### 새 프로젝트 정보 확인
Dashboard → Settings → API

```
Project URL: https://xxxxxxx.supabase.co
anon public: eyJhbGc...
service_role: eyJhbGc... (Reveal 클릭)
```

### 로컬 환경 변수 업데이트

`.env.development.local` 파일 수정:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_OPENWEATHER_API_KEY=8e299fcf763572d21d11610d42a1ff7e
```

`.env.local` 파일도 동일하게 수정

## 4. Dev 서버 재시작

```bash
rm -rf .next
pnpm dev
```

## 5. 로그인 테스트

1. http://localhost:3000 접속
2. Email: `admin@goldpen.kr`
3. Password: `12345678`
4. 로그인 → `/superadmin/dashboard`로 리다이렉트 확인

---

## 완료!

새 Supabase 프로젝트가 준비되었습니다. 이전 프로젝트는 삭제하지 말고 보관하세요.
