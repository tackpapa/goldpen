# GoldPen 데이터베이스 멀티테넌트 구조 검증 보고서

**작성일**: 2025-11-23
**분석 대상**: Supabase PostgreSQL 전체 테이블 (56개)
**목적**: 멀티테넌트 아키텍처의 조직(org) 간 데이터 격리 검증

---

## 📋 Executive Summary

### 분석 결과 요약

- **총 테이블 수**: 56개
- **✅ 안전한 테이블**: 42개 (75%)
  - 직접 org_id 보유: 37개
  - 간접 FK 연결: 5개
- **❌ 보안 취약 테이블**: 7개 (12.5%)
  - 높은 위험도: 5개 (call_records, livescreen_state, manager_calls, outing_records, sleep_records)
  - 중간 위험도: 2개 (class_enrollments, waitlist_consultations)
- **🔒 인증 테이블**: 2개 (users, user_accounts)
- **🌐 글로벌 테이블**: 5개 (organizations, system_settings, page_permissions, menu_settings, branches)

### 주요 발견 사항

**🚨 Critical**: 5개 테이블에서 심각한 보안 취약점 발견
- student_id가 TEXT 타입 (UUID FK 아님)
- org_id 컬럼 없음
- Row Level Security (RLS) 정책 적용 불가
- 조직 간 데이터 접근 통제 불가능

---

## 🔍 분석 방법론

### 데이터 수집
```bash
# 모든 마이그레이션 파일에서 테이블 정의 추출
supabase/migrations/*.sql (56개 파일)
```

### 분석 기준

#### 1. 직접 org_id 보유
```sql
CREATE TABLE example (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),  -- ✅ 직접 보유
  ...
)
```

#### 2. 간접 FK 연결
```sql
CREATE TABLE example (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES parent_table(id),  -- parent_table에 org_id 존재
  ...
)
```

#### 3. 취약점 판단 기준
- org_id 없음
- FK 연결 없음 또는 TEXT 타입 참조
- RLS 정책 적용 불가

---

## 📊 테이블별 상세 분석

### ✅ 1. 직접 org_id 보유 테이블 (37개)

**학생 관리**
- `students` - 학생 기본 정보
- `enrollments` - 수강 신청
- `class_enrollments` - 반 배정 (⚠️ 주의: student_id FK 없음)
- `waitlists` - 대기자 명단
- `student_services` - 학생 서비스
- `student_subscriptions` - 학생 구독

**출결 관리**
- `attendance` - 출결 기록
- `attendance_records` - 상세 출결 기록

**수업 관리**
- `classes` - 반 정보
- `lessons` - 수업 기록
- `schedules` - 수업 일정
- `subjects` - 과목 정보
- `room_schedules` - 강의실 스케줄
- `rooms` - 강의실 정보

**숙제 관리**
- `homework` - 숙제
- `homework_assignments` - 숙제 배정
- `homework_submissions` - 숙제 제출

**시험 관리**
- `exams` - 시험
- `exam_scores` - 시험 성적

**상담 관리**
- `consultations` - 상담 기록

**재무 관리**
- `billing` - 청구서
- `billing_transactions` - 거래 내역
- `expenses` - 지출
- `expense_categories` - 지출 카테고리
- `revenue_categories` - 수입 카테고리
- `teacher_salaries` - 강사 급여

**독서실/좌석 관리**
- `seats` - 좌석
- `seat_assignments` - 좌석 배정
- `seat_configs` - 좌석 설정
- `seat_types` - 좌석 유형
- `study_sessions` - 학습 세션
- `study_time_records` - 학습 시간 기록
- `daily_study_stats` - 일일 학습 통계
- `daily_planners` - 일일 플래너

**기타**
- `teachers` - 강사 정보
- `audit_logs` - 감사 로그
- `kakao_talk_usages` - 카카오톡 사용 내역
- `service_usages` - 서비스 사용 내역

---

### ✅ 2. 간접 FK 연결 테이블 (5개)

#### 2.1 `consultation_images`
```sql
consultation_id UUID REFERENCES consultations(id)
-- consultations.org_id → 간접 연결
```
**안전성**: ✅ consultations를 통한 org 격리

#### 2.2 `seat_call_records`
```sql
seat_id UUID REFERENCES seats(id)
student_id UUID REFERENCES students(id)
-- seats.org_id, students.org_id → 이중 연결
```
**안전성**: ✅ seats와 students 모두 org_id 보유

#### 2.3 `seat_outing_records`
```sql
seat_id UUID REFERENCES seats(id)
student_id UUID REFERENCES students(id)
```
**안전성**: ✅ seats와 students 모두 org_id 보유

#### 2.4 `seat_sleep_records`
```sql
seat_id UUID REFERENCES seats(id)
student_id UUID REFERENCES students(id)
```
**안전성**: ✅ seats와 students 모두 org_id 보유

#### 2.5 `waitlist_entries`
```sql
waitlist_id UUID REFERENCES waitlists(id)
consultation_id UUID REFERENCES consultations(id)
-- waitlists.org_id, consultations.org_id → 이중 연결
```
**안전성**: ✅ waitlists와 consultations 모두 org_id 보유

---

### ❌ 3. 보안 취약 테이블 (7개)

#### 🚨 높은 위험도 (5개)

##### 3.1 `call_records`
**파일**: `supabase/migrations/20251121_complete_schema_migration.sql`

```sql
CREATE TABLE public.call_records (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id text NOT NULL,  -- ❌ TEXT 타입 (UUID FK 아님)
  seat_number integer NOT NULL,
  call_time timestamp with time zone DEFAULT now(),
  call_type text,
  resolved_at timestamp with time zone,
  resolved_by uuid
)
```

**취약점**:
- ❌ `org_id` 컬럼 없음
- ❌ `student_id`가 TEXT 타입 → FK constraint 없음
- ❌ 다른 조직의 학생 ID 입력 시 데이터베이스 수준에서 차단 불가
- ❌ RLS 정책으로 org 격리 불가능

**사용 위치**: `/[institutionname]/livescreen` 페이지

**보안 의존**: URL 파라미터 `{institutionname}` (애플리케이션 레벨 - 우회 가능)

---

##### 3.2 `livescreen_state`
```sql
CREATE TABLE public.livescreen_state (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id text NOT NULL,  -- ❌ TEXT 타입
  student_name text NOT NULL,
  seat_number integer NOT NULL,
  status text NOT NULL,
  current_subject text,
  start_time timestamp with time zone,
  break_count integer DEFAULT 0 NOT NULL,
  sleep_count integer DEFAULT 0 NOT NULL,
  out_count integer DEFAULT 0 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
)
```

**취약점**: call_records와 동일

**사용 위치**: `/[institutionname]/livescreen` 페이지 (실시간 좌석 상태)

---

##### 3.3 `manager_calls`
```sql
CREATE TABLE public.manager_calls (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id text NOT NULL,  -- ❌ TEXT 타입
  seat_number integer NOT NULL,
  call_time timestamp with time zone DEFAULT now(),
  call_type text,
  resolved_at timestamp with time zone,
  resolved_by uuid
)
```

**취약점**: call_records와 동일

**사용 위치**: 관리자 호출 시스템

---

##### 3.4 `outing_records`
```sql
CREATE TABLE public.outing_records (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id text NOT NULL,  -- ❌ TEXT 타입
  seat_number integer NOT NULL,
  out_time timestamp with time zone DEFAULT now(),
  return_time timestamp with time zone
)
```

**취약점**: call_records와 동일

**사용 위치**: 학생 외출 관리

---

##### 3.5 `sleep_records`
```sql
CREATE TABLE public.sleep_records (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id text NOT NULL,  -- ❌ TEXT 타입
  seat_number integer NOT NULL,
  sleep_time timestamp with time zone DEFAULT now(),
  wake_time timestamp with time zone
)
```

**취약점**: call_records와 동일

**사용 위치**: 학생 수면 관리

---

#### ⚠️ 중간 위험도 (2개)

##### 3.6 `class_enrollments`
**파일**: `supabase/migrations/20251121_create_classes_tables.sql`

```sql
CREATE TABLE IF NOT EXISTS class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,  -- ✅ FK 존재
  student_id UUID,  -- ⚠️ FK constraint 없음 (주석: "No FK constraint")
  student_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_id, student_id)
)
```

**취약점**:
- ❌ `org_id` 컬럼 없음
- ⚠️ `student_id`에 FK constraint 없음 (다른 org 학생 배정 가능)
- 🔶 `class_id`만 FK로 연결 (부분적 보안)

**부분 안전성**:
- ✅ classes 테이블에 org_id 존재
- ⚠️ 하지만 student_id FK 없어서 교차 org 배정 가능

**사용 위치**:
- `/classes` 페이지 (반 학생 배정)
- 출결 관리
- 수업 관리
- 좌석 배정

**보안 질문 답변**:
> Q: "그 반의 객체와 학생의 객체가 모두 org id라서 상관없지 않아?"
>
> A: **아니요, 충분하지 않습니다.**
> - student_id에 FK constraint가 없어서 다른 org의 학생을 배정해도 DB가 막지 못함
> - classes만 org_id로 격리되고 students는 격리 안 됨

---

##### 3.7 `waitlist_consultations`
```sql
CREATE TABLE waitlist_consultations (
  -- 불완전한 테이블 정의
)
```

**취약점**: 테이블 정의 불완전, org 연결 확인 불가

---

### 🔒 4. 인증 테이블 (2개)

#### 4.1 `users`
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  ...
)
```

**특성**: Supabase Auth 통합, 전역 사용자 관리

#### 4.2 `user_accounts`
```sql
CREATE TABLE user_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  org_id UUID REFERENCES organizations(id),  -- ✅ org 연결
  ...
)
```

**특성**: 사용자-조직 매핑 (멀티테넌트 권한 관리)

---

### 🌐 5. 글로벌 테이블 (5개)

#### 5.1 `organizations`
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT UNIQUE,  -- goldpen.kr/{domain}
  ...
)
```

**특성**: 모든 조직의 루트 테이블

#### 5.2 `system_settings`
```sql
CREATE TABLE system_settings (
  id UUID PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  ...
)
```

**특성**: 전역 시스템 설정

#### 5.3 `page_permissions`
```sql
CREATE TABLE page_permissions (
  id UUID PRIMARY KEY,
  page_path TEXT NOT NULL,
  required_role TEXT NOT NULL,
  ...
)
```

**특성**: 페이지 접근 권한 정의

#### 5.4 `menu_settings`
```sql
CREATE TABLE menu_settings (
  id UUID PRIMARY KEY,
  menu_name TEXT NOT NULL,
  menu_order INTEGER,
  ...
)
```

**특성**: UI 메뉴 구성

#### 5.5 `branches`
```sql
CREATE TABLE branches (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  ...
)
```

**특성**: 지점 관리 (추후 멀티 지점 지원용)

---

## 🔐 보안 분석

### URL 파라미터 보안의 한계

**현재 구조**:
```
baseurl/{institutionname}/livescreen
예: https://goldpen.kr/goldpen/livescreen
```

**취약점 시나리오**:
```typescript
// ❌ 클라이언트가 URL을 조작 가능
// https://goldpen.kr/goldpen/livescreen → https://goldpen.kr/other-org/livescreen

// ❌ 데이터베이스 쿼리 (org_id 필터 없음)
const { data } = await supabase
  .from('call_records')
  .select('*')
  .eq('student_id', studentId)  // ← org_id 검증 없음!

// 결과: 다른 조직의 데이터도 조회 가능
```

**보안 레이어 비교**:

| 보안 레이어 | URL 파라미터 | org_id + RLS |
|------------|-------------|--------------|
| **레벨** | 애플리케이션 | 데이터베이스 |
| **우회 가능성** | ✅ 높음 | ❌ 불가능 |
| **브라우저 조작** | ✅ 가능 | ❌ 불가능 |
| **API 직접 호출** | ✅ 우회 가능 | ❌ RLS가 차단 |
| **서버 버그 시** | ✅ 전체 노출 | 🔶 RLS가 최후 방어 |

**결론**: URL 파라미터만으로는 **충분하지 않습니다**.

---

### Row Level Security (RLS) 필요성

#### RLS가 있을 때 (안전)
```sql
-- students 테이블 (org_id 있음)
CREATE POLICY "Users can only view own org students"
  ON students FOR SELECT
  USING (org_id = current_org_id());

-- 쿼리
SELECT * FROM students WHERE id = 'any-student-id';
-- RLS가 자동으로 org_id 체크 → 다른 org 학생은 조회 불가
```

#### RLS가 없을 때 (위험)
```sql
-- call_records 테이블 (org_id 없음)
-- RLS 정책 적용 불가능

-- 쿼리
SELECT * FROM call_records WHERE student_id = 'any-student-id';
-- ❌ org_id 체크 없음 → 모든 조직 데이터 조회 가능
```

---

## 🛠️ 권장 조치사항

### 🚨 우선순위 1: 높은 위험도 테이블 수정 (5개)

#### 1.1 `call_records` 마이그레이션
```sql
-- 1) org_id 컬럼 추가
ALTER TABLE public.call_records
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 2) student_id를 TEXT → UUID로 변경
ALTER TABLE public.call_records
  ALTER COLUMN student_id TYPE UUID USING student_id::UUID;

-- 3) FK constraint 추가
ALTER TABLE public.call_records
  ADD CONSTRAINT fk_student
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- 4) RLS 활성화
ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;

-- 5) RLS 정책 생성
CREATE POLICY "call_records_org_isolation"
  ON public.call_records FOR ALL
  USING (org_id = current_org_id());
```

#### 1.2 동일 패턴 적용
- `livescreen_state`
- `manager_calls`
- `outing_records`
- `sleep_records`

**참고**: `current_org_id()` 함수는 Supabase Auth의 JWT 토큰에서 org_id를 추출하는 커스텀 함수

---

### ⚠️ 우선순위 2: 중간 위험도 테이블 수정 (2개)

#### 2.1 `class_enrollments` FK 추가
```sql
-- student_id에 FK constraint 추가
ALTER TABLE class_enrollments
  ADD CONSTRAINT fk_student
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- RLS 활성화 (class_id를 통한 간접 org 격리)
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_enrollments_org_isolation"
  ON class_enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
        AND classes.org_id = current_org_id()
    )
  );
```

#### 2.2 `waitlist_consultations` 정의 완성
- 테이블 구조 확인 후 org 연결 추가

---

### 📋 우선순위 3: 기존 데이터 백필

```sql
-- 예: call_records의 org_id 채우기
UPDATE public.call_records cr
SET org_id = s.org_id
FROM students s
WHERE cr.student_id::UUID = s.id;

-- NULL인 경우 삭제 (orphan 데이터)
DELETE FROM public.call_records WHERE org_id IS NULL;

-- NOT NULL constraint 추가
ALTER TABLE public.call_records
  ALTER COLUMN org_id SET NOT NULL;
```

---

### 🧪 우선순위 4: 테스트

#### 4.1 크로스 org 접근 차단 테스트
```typescript
// 테스트: 다른 org의 학생 데이터 조회 시도
const { data, error } = await supabase
  .from('call_records')
  .select('*')
  .eq('student_id', otherOrgStudentId)  // 다른 조직 학생

// 기대 결과: data = [] (RLS가 차단)
expect(data).toEqual([])
```

#### 4.2 URL 조작 방어 테스트
```typescript
// 테스트: URL 파라미터를 다른 조직으로 변경
// GET /other-org/livescreen

// 기대 결과: 다른 조직 데이터 조회 불가
expect(response.data.length).toBe(0)
```

---

## 📈 마이그레이션 실행 계획

### Phase 1: 테스트 환경 (Staging)
1. 마이그레이션 SQL 작성
2. Staging DB에 적용
3. RLS 정책 테스트
4. 애플리케이션 동작 확인

### Phase 2: 데이터 백필
1. 기존 데이터 org_id 채우기
2. Orphan 데이터 정리
3. NOT NULL constraint 적용

### Phase 3: 프로덕션 배포
1. 다운타임 최소화 전략
   - ALTER TABLE은 빠르게 실행 (메타데이터 변경)
   - UPDATE는 BATCH 단위로 실행
2. 롤백 플랜 준비
3. 모니터링 강화

### Phase 4: 검증
1. 프로덕션 데이터 무결성 확인
2. 성능 모니터링
3. 사용자 피드백 수집

---

## 🔍 부록: 분석 스크립트

### Python 스크립트 (테이블 org_id 검증)
```python
import re
import glob

def extract_tables_with_org_id(sql_content):
    """SQL 파일에서 org_id를 포함한 테이블 추출"""
    table_pattern = r'CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)\s*\((.*?)\);'
    tables = re.findall(table_pattern, sql_content, re.DOTALL | re.IGNORECASE)

    org_tables = []
    for table_name, columns in tables:
        if 'org_id' in columns.lower():
            org_tables.append(table_name)

    return org_tables

# 실행
migration_files = glob.glob('supabase/migrations/*.sql')
for file_path in migration_files:
    with open(file_path, 'r') as f:
        content = f.read()
        tables = extract_tables_with_org_id(content)
        if tables:
            print(f"{file_path}: {tables}")
```

---

## 📚 참고 자료

- [Supabase Row Level Security 문서](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [Multi-tenant Architecture Best Practices](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

## ✅ 체크리스트

### 즉시 조치 필요
- [ ] Supabase Service Role Key 교체 (GitGuardian 경고)
- [ ] 5개 높은 위험도 테이블 마이그레이션 작성
- [ ] class_enrollments FK constraint 추가
- [ ] 테스트 환경에서 마이그레이션 검증

### 1주 내 조치
- [ ] 프로덕션 배포 계획 수립
- [ ] 데이터 백필 스크립트 작성
- [ ] RLS 정책 테스트 케이스 작성
- [ ] 롤백 플랜 문서화

### 1개월 내 조치
- [ ] waitlist_consultations 테이블 정의 완성
- [ ] 전체 테이블 RLS 정책 감사
- [ ] 성능 모니터링 대시보드 구축
- [ ] 보안 테스트 자동화

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-11-23
**작성자**: Claude Code (데이터베이스 분석 Agent)
