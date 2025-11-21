# Supabase 사용 가이드

## 📌 목차

1. [대시보드 접속](#대시보드-접속)
2. [SQL 직접 실행하기](#sql-직접-실행하기)
3. [자주 사용하는 SQL 명령어](#자주-사용하는-sql-명령어)
4. [테이블 관리](#테이블-관리)
5. [문제 해결](#문제-해결)

---

## 🌐 대시보드 접속

### 프로젝트 정보

- **프로젝트 URL**: `https://ipqhhqduppzvsqwwzjkp.supabase.co`
- **프로젝트 ID**: `ipqhhqduppzvsqwwzjkp`
- **리전**: Asia Pacific (Northeast) - Seoul

### 주요 페이지 링크

| 페이지 | URL |
|--------|-----|
| **대시보드 홈** | https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp |
| **SQL Editor** | https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/sql |
| **Table Editor** | https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/editor |
| **Database** | https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/database/tables |
| **Authentication** | https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/auth/users |
| **Storage** | https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/storage/buckets |

---

## 💻 SQL 직접 실행하기

### 방법 1: 브라우저에서 직접 접속

1. **SQL Editor 열기**
   ```
   https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/sql
   ```

2. **New Query 버튼 클릭**
   - 왼쪽 사이드바에서 "New query" 클릭
   - 또는 `Cmd/Ctrl + K` → "New SQL query" 선택

3. **SQL 작성 또는 붙여넣기**
   - 에디터에 SQL 코드 작성
   - 여러 줄 가능 (세미콜론으로 구분)

4. **실행**
   - **Run** 버튼 클릭
   - 또는 단축키: `Cmd/Ctrl + Enter`

5. **결과 확인**
   - 하단에 실행 결과 표시
   - 성공: ✅ Success 메시지
   - 실패: ❌ 에러 메시지 및 라인 번호

### 방법 2: 터미널에서 링크 열기

```bash
# macOS
open "https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/sql"

# Linux
xdg-open "https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/sql"

# Windows (PowerShell)
Start-Process "https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/sql"
```

### 방법 3: 편리한 쉘 스크립트 사용 (가장 간단!) ⭐⭐⭐ 최고 권장

**이 방법이 가장 쉽고 안전합니다!**

```bash
# SQL 파일 실행 (자동으로 연결 정보 사용)
./scripts/run-supabase-sql.sh supabase/migrations/YOUR_MIGRATION_FILE.sql

# 또는 직접 SQL 실행
./scripts/run-supabase-sql.sh -c "SELECT * FROM users LIMIT 10;"
```

**예시: 실제 마이그레이션 실행**

```bash
# audit_logs 테이블 생성 및 RLS 설정
./scripts/run-supabase-sql.sh supabase/migrations/20251120_fix_all_schema_issues.sql

# 출력 예시:
# 🚀 Supabase SQL 실행 시작
#
# 📄 SQL 파일: supabase/migrations/20251120_fix_all_schema_issues.sql
# 🌐 데이터베이스: aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
#
# 🔄 실행 중...
#
# CREATE TABLE
# CREATE INDEX
# ALTER TABLE
# CREATE POLICY
# NOTICE: ✅ All schema issues fixed successfully!
#
# ✅ SQL 마이그레이션 성공!
```

**장점:**
- 연결 정보 자동 설정 (비밀번호 입력 불필요)
- 색상 출력으로 결과 쉽게 확인
- 파일 존재 여부 자동 확인
- 에러 시 친절한 가이드 제공

### 방법 4: psql로 직접 실행 (고급 사용자용)

```bash
# SQL 파일 실행
PGPASSWORD='rhfemvps123' psql \
  "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/YOUR_MIGRATION_FILE.sql

# 또는 직접 SQL 실행
PGPASSWORD='rhfemvps123' psql \
  "postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres" \
  -c "SELECT * FROM users LIMIT 10;"
```

### 방법 5: Supabase CLI 사용 (권장하지 않음)

```bash
# Supabase CLI 설치 (한 번만) - macOS 26에서 설치 불가 이슈 있음
npm install -g supabase

# 프로젝트 연결
supabase link --project-ref ipqhhqduppzvsqwwzjkp

# SQL 파일 실행
supabase db execute --file supabase/migrations/20251120_fix_all_schema_issues.sql

# 또는 직접 SQL 실행
supabase db execute "SELECT * FROM users LIMIT 10;"
```

---

## 🎯 현재 프로젝트 스키마 수정 실행하기

### Step-by-Step 가이드

#### 1. SQL Editor 접속

브라우저에서 다음 링크 열기:
```
https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/sql
```

#### 2. SQL 파일 내용 복사

프로젝트의 다음 파일을 엽니다:
```
supabase/migrations/20251120_fix_all_schema_issues.sql
```

**전체 내용을 복사** (Cmd/Ctrl + A → Cmd/Ctrl + C)

#### 3. SQL Editor에 붙여넣기

1. Supabase SQL Editor에서 "New query" 클릭
2. 복사한 SQL을 붙여넣기 (Cmd/Ctrl + V)
3. 왼쪽에 쿼리 이름 입력 (예: "Fix Schema Issues")

#### 4. 실행

- **Run** 버튼 클릭 (또는 `Cmd/Ctrl + Enter`)

#### 5. 성공 확인

다음 메시지가 보이면 성공:
```
✅ Success
Rows returned: 0
Execution time: 1.2s
```

---

## 📚 자주 사용하는 SQL 명령어

### 1. 테이블 목록 조회

```sql
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_catalog.pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 2. 테이블 구조 확인

```sql
-- 특정 테이블의 컬럼 정보
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'audit_logs'
ORDER BY ordinal_position;
```

### 3. 인덱스 확인

```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'audit_logs';
```

### 4. Foreign Key 확인

```sql
SELECT
  tc.table_schema,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

### 5. RLS 정책 확인

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 6. 데이터 샘플 조회

```sql
-- audit_logs 최근 10개
SELECT *
FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;

-- users 전체 카운트
SELECT
  role,
  COUNT(*) as count
FROM users
GROUP BY role;
```

### 7. 테이블 삭제 (주의!)

```sql
-- RLS 정책과 함께 삭제
DROP TABLE IF EXISTS audit_logs CASCADE;

-- 특정 컬럼만 삭제
ALTER TABLE organizations
DROP COLUMN IF EXISTS owner_id;
```

### 8. 백업 생성

```sql
-- 테이블 전체 백업
CREATE TABLE audit_logs_backup AS
SELECT * FROM audit_logs;

-- 특정 조건만 백업
CREATE TABLE users_backup_2025 AS
SELECT * FROM users
WHERE created_at >= '2025-01-01';
```

---

## 🗂️ 테이블 관리

### Table Editor 사용하기

#### 1. Table Editor 접속

```
https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/editor
```

#### 2. 테이블 생성 (GUI)

1. "New table" 버튼 클릭
2. 테이블 이름 입력
3. 컬럼 추가:
   - Name: 컬럼 이름
   - Type: 데이터 타입 선택
   - Default value: 기본값 (옵션)
   - Primary: 기본 키 여부
4. "Save" 클릭

#### 3. 데이터 직접 수정

1. Table Editor에서 테이블 선택
2. 행 클릭하여 수정
3. 자동 저장됨

#### 4. 데이터 추가

- "Insert row" 버튼 클릭
- 값 입력 후 "Save"

---

## 🔍 문제 해결

### 1. SQL 실행 실패

#### 권한 에러
```
ERROR: permission denied for table XXX
```

**해결**:
- Supabase 대시보드에 로그인되어 있는지 확인
- 프로젝트 Owner 권한이 있는지 확인

#### 문법 에러
```
ERROR: syntax error at or near "XXX"
```

**해결**:
- SQL 문법 확인 (세미콜론, 따옴표 등)
- 여러 statement를 실행하는 경우 각각 세미콜론으로 구분

#### 테이블 이미 존재
```
ERROR: relation "audit_logs" already exists
```

**해결**:
- 정상입니다! `IF NOT EXISTS` 사용 권장
- 또는 `DROP TABLE IF EXISTS` 먼저 실행

### 2. 연결 문제

#### 대시보드 접속 안됨

**해결**:
1. 인터넷 연결 확인
2. Supabase 서비스 상태 확인: https://status.supabase.com
3. 브라우저 캐시 삭제
4. 시크릿/프라이빗 모드로 접속 시도

### 3. 마이그레이션 실패

#### 중간에 에러 발생

**해결**:
1. 에러 메시지 확인
2. 해당 부분만 주석 처리 (`--`)
3. 나머지 먼저 실행
4. 실패한 부분만 수정 후 재실행

#### 롤백 필요

```sql
-- 트랜잭션 사용 (권장)
BEGIN;
  -- 여기에 SQL 작성
  -- 문제 있으면 ROLLBACK
ROLLBACK;

-- 문제 없으면
BEGIN;
  -- SQL 작성
COMMIT;
```

---

## 🛠️ 고급 팁

### 1. 쿼리 저장 및 재사용

1. SQL Editor에서 쿼리 작성
2. 왼쪽 사이드바에 쿼리 이름 지정
3. 자동 저장됨
4. 나중에 사이드바에서 다시 불러오기

### 2. 쿼리 결과 다운로드

1. SQL 실행 후 결과 확인
2. "Download CSV" 버튼 클릭
3. Excel에서 열기

### 3. 변수 사용

```sql
-- psql 스타일 변수 (Supabase에서는 제한적)
\set project_id 'ipqhhqduppzvsqwwzjkp'

-- WITH 절 사용 (권장)
WITH constants AS (
  SELECT 'superadmin' AS admin_role
)
SELECT * FROM users, constants
WHERE users.role = constants.admin_role;
```

### 4. 성능 모니터링

```sql
-- 느린 쿼리 확인
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- 실행 계획 확인
EXPLAIN ANALYZE
SELECT * FROM audit_logs
WHERE user_id = 'some-uuid';
```

---

## 📞 지원

### Supabase 문서

- **공식 문서**: https://supabase.com/docs
- **SQL 가이드**: https://supabase.com/docs/guides/database
- **PostgreSQL 문서**: https://www.postgresql.org/docs/

### 커뮤니티

- **Discord**: https://discord.supabase.com
- **GitHub**: https://github.com/supabase/supabase
- **Twitter**: @supabase

---

## 🔐 보안 주의사항

1. **절대 공유하지 말 것**:
   - Service Role Key
   - Database Password
   - API Keys

2. **RLS 항상 활성화**:
   ```sql
   ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
   ```

3. **정책 테스트**:
   - 각 역할(role)로 로그인해서 테스트
   - 의도하지 않은 데이터 접근 차단 확인

---

## 📋 체크리스트

### SQL 실행 전

- [ ] 백업 생성됨
- [ ] SQL 문법 검증됨
- [ ] 영향받는 테이블 확인됨
- [ ] RLS 정책 고려됨
- [ ] 테스트 환경에서 먼저 실행됨

### SQL 실행 후

- [ ] 성공 메시지 확인됨
- [ ] 테이블 구조 확인됨
- [ ] 데이터 정합성 확인됨
- [ ] 애플리케이션 테스트 완료됨
- [ ] 에러 로그 확인됨

---

## 🔌 데이터베이스 연결 정보

### PostgreSQL 직접 연결 (프로그래밍 자동화용)

#### Shared Connection Pooler (권장)

```bash
# Connection String (Port 5432 - Direct Connection)
postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres

# Connection String (Port 6543 - Session Pooler with pgbouncer)
postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# 환경 변수 설정
export PGPASSWORD='rhfemvps123'
export DATABASE_URL="postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

#### Dedicated Pooler (IPv6/IPv4 addon 필요)

```bash
# IPv6 또는 IPv4 addon을 구매한 경우 사용 가능
# Direct Connection (Port 5432)
postgresql://postgres:[PASSWORD]@db.ipqhhqduppzvsqwwzjkp.supabase.co:5432/postgres

# Session Pooler (Port 6543)
postgresql://postgres:[PASSWORD]@db.ipqhhqduppzvsqwwzjkp.supabase.co:6543/postgres?pgbouncer=true
```

### 연결 정보 상세

| 항목 | 값 |
|------|-----|
| **Host (Shared Pooler)** | `aws-1-ap-northeast-1.pooler.supabase.com` |
| **Port (Direct)** | `5432` |
| **Port (Pooler)** | `6543` |
| **Database** | `postgres` |
| **Username** | `postgres.ipqhhqduppzvsqwwzjkp` |
| **Password** | `rhfemvps123` |
| **SSL Mode** | `require` |
| **Region** | `ap-northeast-1` (Tokyo) |

### 프로젝트 환경 변수 (.env.local)

```env
# Database Connection (for migrations)
DIRECT_URL="postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

# Database Connection (for production with pooling)
DATABASE_URL="postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Database Password (for backup/restore)
DB_PASSWORD="rhfemvps123"
```

### Node.js에서 사용하기

```javascript
import { Client } from 'pg'

const client = new Client({
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.ipqhhqduppzvsqwwzjkp',
  password: 'rhfemvps123',
  ssl: { rejectUnauthorized: false }
})

await client.connect()
const result = await client.query('SELECT * FROM users LIMIT 10')
await client.end()
```

### Prisma에서 사용하기

```prisma
// schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

```env
# .env
DATABASE_URL="postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

### 주의사항

1. **절대로 공유하지 마세요**:
   - 비밀번호: `rhfemvps123`
   - 연결 문자열 전체
   - Git에 커밋하지 마세요 (`.env*` 파일은 `.gitignore`에 포함)

2. **포트 선택 가이드**:
   - **5432 (Direct)**: 마이그레이션, 스키마 변경, 트랜잭션 필요 작업
   - **6543 (Pooler)**: 프로덕션 애플리케이션, 고성능 읽기/쓰기

3. **연결 제한**:
   - Shared Pooler: 동시 연결 제한 있음
   - Direct Connection: 안정적이지만 연결 수 제한

4. **리전 확인**:
   - 현재 리전: `ap-northeast-1` (Tokyo)
   - 이전에 `ap-northeast-2` (Seoul)로 시도했으나 실패
   - 반드시 올바른 리전 사용

---

## 📦 데이터베이스 스키마 정보

### 실제 user_role enum 값

```sql
-- 올바른 enum 값
'owner'        -- 조직 소유자 (원장님)
'manager'      -- 매니저
'teacher'      -- 강사
'staff'        -- 직원
'student'      -- 학생
'parent'       -- 학부모
'super_admin'  -- 슈퍼 관리자 (언더스코어 주의!)
```

### audit_logs 테이블 컬럼명

```sql
-- 실제 컬럼명 (주의: old_data가 아님!)
old_values JSONB  -- 변경 전 데이터
new_values JSONB  -- 변경 후 데이터
```

### 확인 쿼리

```sql
-- user_role enum 값 확인
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumsortorder;

-- audit_logs 테이블 구조 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'audit_logs'
ORDER BY ordinal_position;
```

---

**마지막 업데이트**: 2025-11-20
**프로젝트**: GoldPen
**Supabase 프로젝트 ID**: ipqhhqduppzvsqwwzjkp
**Database Region**: ap-northeast-1 (Tokyo)
