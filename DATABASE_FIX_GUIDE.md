# 데이터베이스 스키마 수정 가이드

## ✅ 해결할 문제들

1. **audit_logs 테이블 없음** → 감사 로그 페이지 500 에러
2. **organizations.owner_id 관계 없음** → 조직 소유자 정보 조회 실패

---

## 🚀 빠른 해결 방법

### 1. Supabase 대시보드 접속

다음 링크로 Supabase SQL Editor를 엽니다:

**🔗 [https://ipqhhqduppzvsqwwzjkp.supabase.co/project/_/sql](https://ipqhhqduppzvsqwwzjkp.supabase.co/project/_/sql)**

### 2. SQL 파일 실행

1. Supabase SQL Editor에서 **"New query"** 클릭
2. 다음 파일의 내용을 복사:
   ```
   supabase/migrations/20251120_fix_all_schema_issues.sql
   ```
3. SQL Editor에 붙여넣기
4. **"Run"** 버튼 클릭 (또는 `Cmd/Ctrl + Enter`)

### 3. 확인

성공 메시지가 표시되면 완료입니다:

```
✅ All schema issues fixed successfully!
   - audit_logs table created
   - organizations.owner_id relationship added
```

---

## 📋 생성되는 것들

### audit_logs 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 고유 ID |
| user_id | UUID | 작업한 사용자 |
| org_id | UUID | 조직 ID |
| action | TEXT | 작업 유형 (CREATE, UPDATE, DELETE 등) |
| resource_type | TEXT | 리소스 유형 (student, teacher 등) |
| resource_id | UUID | 리소스 ID |
| old_data | JSONB | 변경 전 데이터 |
| new_data | JSONB | 변경 후 데이터 |
| ip_address | INET | IP 주소 |
| user_agent | TEXT | User Agent |
| created_at | TIMESTAMPTZ | 생성 시각 |

### organizations.owner_id 컬럼

- 조직의 소유자(원장님)를 users 테이블과 연결
- Foreign Key: `users(id)`
- NULL 허용 (옵션)

### RLS (Row Level Security) 정책

- Super Admin: 모든 감사 로그 조회 가능
- 조직 Admin: 자신의 조직 로그만 조회 가능
- 시스템: 로그 삽입 가능 (service_role)

---

## 🔍 문제 해결

### SQL 실행 실패 시

1. **권한 오류**: Supabase 대시보드에 로그인되어 있는지 확인
2. **테이블 이미 존재**: 괜찮습니다. `IF NOT EXISTS` 조건으로 안전하게 처리됩니다
3. **다른 오류**: SQL 파일의 오류 메시지를 확인하고 해당 부분만 재실행

### 적용 확인 방법

#### 1. audit_logs 테이블 확인

Supabase Dashboard → Table Editor에서 `audit_logs` 테이블이 보이는지 확인

#### 2. 애플리케이션 테스트

- Admin Dashboard → Audit Logs 페이지 접속
- 500 에러 없이 빈 목록이 표시되면 성공

#### 3. organizations 테이블 확인

SQL Editor에서 실행:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name = 'owner_id';
```

결과가 나오면 성공!

---

## 💡 추가 정보

### 마이그레이션 파일 위치

```
supabase/
└── migrations/
    └── 20251120_fix_all_schema_issues.sql  ← 이 파일을 실행하세요
```

### 백업 권장

중요한 데이터가 있다면 실행 전 백업을 권장합니다:

```sql
-- organizations 테이블 백업
CREATE TABLE organizations_backup AS
SELECT * FROM organizations;

-- 백업 확인
SELECT COUNT(*) FROM organizations_backup;
```

---

## 📞 도움이 필요하신가요?

문제가 계속되면 다음을 확인해주세요:

1. Supabase 프로젝트가 활성 상태인가요?
2. SQL Editor에 접근 권한이 있나요?
3. 네트워크 연결이 정상인가요?

---

**마지막 업데이트**: 2025-11-20
**파일 버전**: 1.0
