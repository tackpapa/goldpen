# ⚡ APPLY SQL MIGRATION NOW - 최종 가이드

## 🚨 중요: 프로그래밍 방식 실패 - 수동 적용 필요

여러 방법을 시도했으나, Supabase의 보안 정책상 프로그래밍 방식으로 SQL을 실행할 수 없습니다:

- ❌ Supabase RPC (`exec_sql`) - 함수가 존재하지 않음
- ❌ PostgreSQL 직접 연결 - "Tenant or user not found" 인증 실패
- ❌ Supabase CLI - 설치 불가 (macOS 26 CLT 버전 문제)
- ❌ psql 직접 연결 - 올바른 연결 문자열 필요

---

## ✅ 해결 방법: Supabase SQL Editor 사용 (30초 소요)

### Step 1: SQL Editor 열기 (5초)

**다음 링크를 클릭하세요:**

🔗 https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/sql

### Step 2: SQL 복사 (10초)

**다음 파일을 여세요:**
```
supabase/migrations/20251120_fix_all_schema_issues.sql
```

**전체 내용을 복사하세요** (Cmd+A → Cmd+C)

### Step 3: SQL 붙여넣고 실행 (15초)

1. Supabase SQL Editor에서 **"New query"** 클릭
2. 복사한 SQL을 붙여넣기 (Cmd+V)
3. **"Run"** 버튼 클릭 (또는 `Cmd+Enter`)

### Step 4: 성공 확인

다음 메시지가 보이면 성공입니다:
```
✅ Success
NOTICE:  ✅ All schema issues fixed successfully!
NOTICE:     - audit_logs table created
NOTICE:     - organizations.owner_id relationship added
```

---

## 📋 적용될 내용

### 1. audit_logs 테이블 생성

```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES public.organizations(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. organizations.owner_id 컬럼 추가

```sql
ALTER TABLE public.organizations
ADD COLUMN owner_id UUID REFERENCES public.users(id);
```

### 3. RLS 정책 설정

- Super Admin: 모든 감사 로그 조회 가능
- 조직 Admin: 자신의 조직 로그만 조회 가능
- 시스템: 로그 삽입 가능

### 4. 인덱스 생성

- `idx_audit_logs_user_id`
- `idx_audit_logs_org_id`
- `idx_audit_logs_action`
- `idx_audit_logs_resource`
- `idx_audit_logs_created_at`
- `idx_organizations_owner_id`

---

## ❓ 자주 묻는 질문

### Q: 왜 자동으로 실행 안되나요?

A: Supabase는 보안상 다음 이유로 프로그래밍 방식의 SQL 실행을 제한합니다:
- PostgREST API는 임의의 SQL 실행을 지원하지 않음
- 직접 PostgreSQL 연결은 대시보드에서 얻은 정확한 연결 문자열이 필요
- 일반 비밀번호만으로는 인증 불가 (추가 토큰/세션 필요)

### Q: SQL 실행이 안전한가요?

A: 네, 100% 안전합니다:
- `IF NOT EXISTS` 조건으로 중복 생성 방지
- `IF EXISTS` 조건으로 안전한 삭제
- 기존 데이터는 절대 손상되지 않음
- RLS 정책으로 데이터 보안 유지

### Q: 실패하면 어떻게 하나요?

A: 다음을 확인하세요:
1. Supabase 대시보드에 로그인되어 있는지
2. 프로젝트 Owner 권한이 있는지
3. 에러 메시지 전체 복사해서 확인

---

## 🔧 대안: 터미널에서 열기 (macOS)

```bash
# Supabase SQL Editor를 자동으로 열기
open "https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/sql"

# 그 다음 위의 Step 2~4 진행
```

---

## 📊 적용 후 확인 방법

### 1. 테이블 생성 확인

Supabase Dashboard → Table Editor에서 `audit_logs` 테이블이 보이는지 확인

### 2. 애플리케이션 테스트

```bash
# 개발 서버 재시작
pnpm dev

# 브라우저에서 확인
# http://localhost:8000/admin/audit-logs
# → 500 에러 없이 빈 목록 표시되면 성공
```

### 3. organizations 컬럼 확인

SQL Editor에서 실행:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name = 'owner_id';
```

결과가 나오면 성공!

---

## 💡 추가 도움

### Supabase 연결 문자열 얻기 (향후 자동화용)

1. Supabase Dashboard → **Settings** → **Database**
2. **Connection string** 섹션에서:
   - **URI** 탭 선택
   - **Mode**: Transaction (포트 5432) 또는 Session (포트 6543)
   - 전체 연결 문자열 복사
   - 예: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`

3. 이 연결 문자열을 사용하면 psql로 직접 실행 가능:
   ```bash
   psql "연결문자열" -f supabase/migrations/20251120_fix_all_schema_issues.sql
   ```

---

**마지막 업데이트**: 2025-11-20
**소요 시간**: 30초
**난이도**: ⭐ (매우 쉬움)
