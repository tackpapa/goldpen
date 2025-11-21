# GoldPen 더미데이터 마이그레이션 가이드

## 📋 개요
로컬 Docker DB의 더미데이터를 프로덕션 Supabase로 마이그레이션합니다.

**변경사항**:
- 사용자 이메일: `test@goldpen.com` → `demo@goldpen.kr`

## 📊 마이그레이션할 데이터

| 테이블 | 레코드 수 | 설명 |
|--------|----------|------|
| `organizations` | 1 | 골드펜 테스트 학원 |
| `users` | 1 | demo@goldpen.kr (owner) |
| `call_records` | 4 | 학생 호출 기록 |
| `manager_calls` | 5 | 관리자 호출 기록 |
| `outing_records` | 10 | 외출 기록 |
| `sleep_records` | 32 | 수면 기록 |
| `livescreen_state` | 1 | 라이브스크린 상태 |
| **합계** | **53** | |

## 🚀 실행 방법

### 1. Supabase Dashboard 접속
```
https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/sql/new
```

### 2. SQL 파일 복사 & 실행
아래 파일의 내용을 복사하여 SQL Editor에 붙여넣고 실행:

```bash
supabase/migrations/20251120_seed_data.sql
```

**중요사항**:
- `SET row_security = off;` 구문 때문에 Dashboard에서 실행해야 합니다
- Service Role 권한으로 실행됩니다

### 3. 실행 결과 확인
```sql
-- 데이터 확인 쿼리
SELECT
  'organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'call_records', COUNT(*) FROM call_records
UNION ALL
SELECT 'manager_calls', COUNT(*) FROM manager_calls
UNION ALL
SELECT 'outing_records', COUNT(*) FROM outing_records
UNION ALL
SELECT 'sleep_records', COUNT(*) FROM sleep_records
UNION ALL
SELECT 'livescreen_state', COUNT(*) FROM livescreen_state
ORDER BY table_name;
```

예상 결과:
```
call_records    | 4
livescreen_state| 1
manager_calls   | 5
organizations   | 1
outing_records  | 10
sleep_records   | 32
users           | 1
```

### 4. 사용자 계정 확인
```sql
SELECT id, email, role, name FROM users;
```

예상 결과:
```
email: demo@goldpen.kr
role: owner
name: 테스트 사용자
```

## ⚠️ 주의사항

1. **기존 데이터 백업**
   - 프로덕션에 기존 데이터가 있다면 먼저 백업하세요

2. **UUID 충돌**
   - 동일한 UUID가 있으면 INSERT 실패합니다
   - 필요시 기존 데이터 삭제 후 실행:
   ```sql
   DELETE FROM call_records;
   DELETE FROM manager_calls;
   DELETE FROM outing_records;
   DELETE FROM sleep_records;
   DELETE FROM livescreen_state;
   DELETE FROM users;
   DELETE FROM organizations;
   ```

3. **Supabase Auth**
   - `users` 테이블만 생성되고 Supabase Auth는 별도 설정 필요
   - 로그인하려면 `demo@goldpen.kr` 계정을 Supabase Auth에도 등록해야 합니다

## 🎯 다음 단계

1. **Supabase Auth 사용자 생성**
   ```
   Dashboard > Authentication > Users > Invite user
   Email: demo@goldpen.kr
   Password: (설정)
   ```

2. **Auth UID와 users 테이블 연결**
   - Auth에서 생성된 user의 UUID를 확인
   - `users` 테이블의 `id`를 Auth UUID로 업데이트

3. **로그인 테스트**
   - https://goldpen.kr 접속
   - demo@goldpen.kr로 로그인

---

**생성일**: 2025-11-20
**마이그레이션 파일**: `supabase/migrations/20251120_seed_data.sql`
