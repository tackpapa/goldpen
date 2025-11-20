# Supabase Production 마이그레이션 가이드

## 📋 개요

`backups/supabase_ready.sql` 파일을 Supabase Production 환경에 마이그레이션하는 방법입니다.

---

## 방법 1: Supabase 대시보드 SQL Editor (권장) ⭐

### 단계:

1. **Supabase 대시보드 접속**
   ```
   https://supabase.com/dashboard/project/vdxxzygqjjjptzlvgrtw
   ```

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 **SQL Editor** 클릭

3. **New Query 생성**
   - "New Query" 버튼 클릭

4. **SQL 파일 내용 붙여넣기**
   - `backups/supabase_ready.sql` 파일 열기
   - 전체 내용 복사 (Cmd+A, Cmd+C)
   - SQL Editor에 붙여넣기 (Cmd+V)

5. **실행**
   - **Run** 버튼 클릭 (또는 Cmd+Enter)

6. **결과 확인**
   - 하단에 "Success" 메시지 확인
   - 에러가 있다면 로그 확인

---

## 방법 2: psql CLI (고급)

### 사전 요구사항:
- PostgreSQL 클라이언트 (`psql`) 설치
- Supabase Database Password

### 연결 정보:
```
Host: db.vdxxzygqjjjptzlvgrtw.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [Supabase 대시보드에서 확인]
```

### 실행:
```bash
# Docker psql 사용 (psql 미설치 시)
docker run -it --rm -v $(pwd):/workspace postgres:15 psql \
  -h db.vdxxzygqjjjptzlvgrtw.supabase.co \
  -U postgres \
  -d postgres \
  -f /workspace/backups/supabase_ready.sql
```

비밀번호 입력 프롬프트가 나타나면 Database Password를 입력합니다.

---

## 방법 3: Supabase CLI (고급)

### 사전 요구사항:
- Supabase CLI 설치 완료 ✅
- Supabase Personal Access Token

### 단계:

1. **Supabase 로그인**
   ```bash
   ~/bin/supabase login
   ```
   - 브라우저에서 인증 완료

2. **프로젝트 연결**
   ```bash
   ~/bin/supabase link --project-ref vdxxzygqjjjptzlvgrtw
   ```

3. **마이그레이션 실행**
   ```bash
   ~/bin/supabase db push
   ```

---

## 🎯 권장 방법

**초보자/빠른 실행**: 방법 1 (대시보드 SQL Editor) ⭐
**자동화/CI/CD**: 방법 2 또는 3

---

## 📝 주의사항

1. **Production 환경입니다!**
   - 실행 전 SQL 파일 내용을 반드시 검토하세요
   - 백업이 있는지 확인하세요

2. **Idempotent SQL**
   - `supabase_ready.sql`은 `CREATE OR REPLACE`, `IF NOT EXISTS` 등을 사용하여 멱등성을 보장합니다
   - 여러 번 실행해도 안전합니다

3. **RLS (Row Level Security)**
   - 모든 테이블에 RLS가 활성화되어 있습니다
   - 정책이 올바르게 설정되었는지 확인하세요

---

## 🔍 마이그레이션 후 확인

### 1. 테이블 생성 확인
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 2. RLS 활성화 확인
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### 3. 정책 확인
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 📞 도움말

문제가 발생하면:
1. SQL Editor의 에러 로그 확인
2. Supabase Dashboard → Database → Logs 확인
3. GitHub Issues 보고

**프로젝트 정보:**
- Project Ref: `vdxxzygqjjjptzlvgrtw`
- URL: `https://vdxxzygqjjjptzlvgrtw.supabase.co`
