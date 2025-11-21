# 🚀 전체 Mock 데이터 프로덕션 마이그레이션 최종 가이드

## 📋 개요

`lib/data/mockData.ts`의 모든 하드코딩 데이터를 프로덕션 Supabase DB로 마이그레이션합니다.

**3가지 방법 제공**:
1. ⚡ **Postgres 직접 연결** (추천) - `pg` 라이브러리 사용
2. 🔧 **Supabase CLI** - `supabase db query`
3. 🖥️ **Dashboard SQL Editor** - 수동 복사&붙여넣기

---

## 📦 포함 데이터

### 기본 데이터
- 👨‍🏫 **Teachers**: 5명 (김선생, 박선생, 이선생, 최선생, 정선생)
- 🏫 **Rooms**: 7개 (A301, A201, A302, B201, B202, C101, C202)
- 👨‍🎓 **Students**: 124명 (초등 18, 중1 22, 중2 25, 중3 20, 고1 15, 고2 12, 고3 12)
- 📚 **Classes**: 16개 (고3 수학 모의고사반 ~ 재수생 특강반)

### 소유자
- **Organization**: 골드펜 테스트 학원 (ID: `3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3`)
- **Owner**: demo@goldpen.kr

---

## 방법 1: ⚡ Postgres 직접 연결 (추천)

### Step 1: DB Connection String 확인

1. Supabase Dashboard 접속:
   ```
   https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/settings/database
   ```

2. **Connection string** 섹션에서 **Session Pooler** URI 복사:
   ```
   postgresql://postgres.ipqhhqduppzvsqwwzjkp:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
   ```

3. `[YOUR-PASSWORD]` 부분은 프로젝트 비밀번호로 변경

### Step 2: 스크립트 실행

```bash
# 환경 변수로 DB URL 전달
SUPABASE_DB_URL="postgresql://postgres.ipqhhqduppzvsqwwzjkp:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres" \
pnpm tsx scripts/seed-production.ts
```

### Step 3: 결과 확인

성공 시 출력:
```
🚀 프로덕션 Supabase DB 마이그레이션 시작...
📡 Postgres 연결 중...
✅ Postgres 연결 성공!

📄 SQL 파일 읽는 중...
✅ SQL 파일 로드 완료 (XX.XKB)

⚡ SQL 실행 중...
✅ SQL 실행 완료 (XXXms)

📊 데이터 검증 중...

┌──────────────────┬───────┐
│   Table Name     │ Count │
├──────────────────┼───────┤
│ classes          │    16 │
│ rooms            │     7 │
│ students         │   124 │
│ users (teachers) │     5 │
└──────────────────┴───────┘

📊 학년별 학생 분포:

  고1: 15명
  고2: 12명
  고3: 12명
  중1: 22명
  중2: 25명
  중3: 20명
  초등: 18명

✨ 마이그레이션 완료!

🔌 Postgres 연결 종료
```

---

## 방법 2: 🔧 Supabase CLI

### Step 1: Supabase CLI 설치 (없으면)

```bash
npm install -g supabase
```

### Step 2: 프로젝트 연결

```bash
# 프로젝트 루트에서
supabase link --project-ref ipqhhqduppzvsqwwzjkp
```

비밀번호 입력 요청 시 프로젝트 DB 비밀번호 입력

### Step 3: SQL 파일 실행

```bash
cat supabase/migrations/20251121_comprehensive_seed_data.sql | supabase db query
```

또는:

```bash
supabase db query < supabase/migrations/20251121_comprehensive_seed_data.sql
```

### Step 4: 검증

```bash
supabase db query "SELECT 'users' as table, COUNT(*) FROM users WHERE role='teacher' UNION ALL SELECT 'rooms', COUNT(*) FROM rooms UNION ALL SELECT 'students', COUNT(*) FROM students UNION ALL SELECT 'classes', COUNT(*) FROM classes"
```

---

## 방법 3: 🖥️ Dashboard SQL Editor (수동)

### Step 1: SQL Editor 열기

```
https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/sql/new
```

### Step 2: SQL 복사

```bash
cat supabase/migrations/20251121_comprehensive_seed_data.sql
```

전체 내용을 복사

### Step 3: SQL Editor에 붙여넣고 Run

1. SQL Editor에 붙여넣기
2. **Run** 버튼 클릭
3. 결과 확인

---

## ⚠️ 주의사항

### 1. 데이터 충돌

만약 이미 데이터가 존재하면 UUID 충돌로 실패할 수 있습니다.

**해결 방법**: 기존 데이터 삭제 후 재실행

```sql
-- 주의: 기존 데이터 완전 삭제!
DELETE FROM classes;
DELETE FROM students;
DELETE FROM rooms;
DELETE FROM users WHERE role = 'teacher';
```

### 2. RLS 임시 비활성화

SQL 파일에 다음 코드 포함:
```sql
SET session_replication_role = replica;  -- RLS 임시 비활성화
... INSERT 문들 ...
SET session_replication_role = DEFAULT;  -- RLS 재활성화
```

이 때문에 **Service Role 권한**으로 실행됩니다.

### 3. 포트 주의

- **Session Pooler** (포트 6543): Transaction Mode, 일반 쿼리용 ✅
- **Connection Pooler** (포트 5432): Session Mode, 긴 연결용

Migration 스크립트는 **6543 포트** 사용 권장

---

## 🧪 검증 쿼리

### 전체 테이블 카운트

```sql
SELECT
  'users (teachers)' as table_name, COUNT(*) as count
FROM users WHERE role = 'teacher'
UNION ALL
SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'classes', COUNT(*) FROM classes
ORDER BY table_name;
```

예상 결과:
```
classes          | 16
rooms            | 7
students         | 124
users (teachers) | 5
```

### 학년별 학생 분포

```sql
SELECT
  CASE
    WHEN grade LIKE '초등%' THEN '초등'
    ELSE grade
  END as grade_group,
  COUNT(*) as count
FROM students
GROUP BY grade_group
ORDER BY grade_group;
```

예상 결과:
```
고1 | 15
고2 | 12
고3 | 12
중1 | 22
중2 | 25
중3 | 20
초등 | 18
```

### Teachers와 Classes 관계

```sql
SELECT
  c.name as class_name,
  u.name as teacher_name,
  c.subject,
  c.schedule->>'time' as time
FROM classes c
JOIN users u ON c.teacher_id = u.id
ORDER BY c.created_at;
```

---

## 🎯 다음 단계

### 1. Supabase Auth 사용자 생성

```
Dashboard > Authentication > Users > Invite user
Email: demo@goldpen.kr
Password: (설정)
```

### 2. Auth UID와 users 테이블 연결

```sql
-- Auth에서 생성된 UUID 확인
SELECT id, email FROM auth.users WHERE email = 'demo@goldpen.kr';

-- users 테이블 업데이트 (필요시)
UPDATE users
SET id = '[AUTH-UUID-FROM-ABOVE]'
WHERE email = 'demo@goldpen.kr';
```

### 3. 추가 데이터 마이그레이션 (선택)

현재는 기본 데이터만 포함. 추가로 필요한 경우:
- Enrollments (학생-반 연결)
- Consultations (상담 기록)
- Attendance (출결)
- Exams (시험)
- Homework (과제)
- Lessons (수업일지)
- Billing/Expenses (매출/지출)

---

## 🔧 트러블슈팅

### 문제 1: "connection refused"

**원인**: DB URL이 잘못되었거나 네트워크 문제

**해결**:
1. DB URL 다시 확인 (Dashboard > Settings > Database)
2. SSL 사용 확인 (`?sslmode=require`)
3. 방화벽 확인

### 문제 2: "permission denied"

**원인**: RLS 정책으로 인한 권한 부족

**해결**:
- SQL 파일에 `SET session_replication_role = replica;` 포함 확인
- Service Role 키로 실행 확인

### 문제 3: "duplicate key value violates unique constraint"

**원인**: UUID 충돌 (이미 데이터 존재)

**해결**:
```sql
-- 충돌하는 테이블의 기존 데이터 삭제
DELETE FROM classes WHERE org_id = '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3';
DELETE FROM students WHERE org_id = '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3';
-- ...
```

---

## 📚 참고 자료

- [supabase/migrations/20251121_comprehensive_seed_data.sql](supabase/migrations/20251121_comprehensive_seed_data.sql) - SQL 파일
- [scripts/seed-production.ts](scripts/seed-production.ts) - Postgres 직접 연결 스크립트
- [COMPREHENSIVE_SEED_DATA_GUIDE.md](COMPREHENSIVE_SEED_DATA_GUIDE.md) - 상세 데이터 명세

---

**생성일**: 2025-11-21
**버전**: 1.0.0
**타겟**: Production Supabase (ipqhhqduppzvsqwwzjkp)
