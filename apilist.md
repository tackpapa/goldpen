# GoldPen API 전수검사 (2025-12-01)

## 요약
- 전체 API: 88개
- getSupabaseWithOrg 사용: 20개 (22.7%)
- 미사용 (수정 필요): 68개 (77.3%)

---

## ✅ getSupabaseWithOrg 사용 (정상)

| API 경로 | HTTP 메소드 |
|----------|------------|
| /api/attendance/[id] | GET, PATCH, DELETE |
| /api/billing/[id] | PUT, DELETE |
| /api/billing | GET, POST |
| /api/classes/[id]/assign-students | GET, POST |
| /api/consultations/[id] | GET, PATCH, DELETE |
| /api/consultations | GET, POST |
| /api/exams/[id]/scores | GET, POST |
| /api/exams | GET, POST |
| /api/expenses/[id] | PUT, DELETE |
| /api/expenses | GET, POST |
| /api/lessons/[id] | PUT, DELETE |
| /api/rooms/[id] | PUT, DELETE |
| /api/rooms | GET, POST, PATCH, DELETE |
| /api/schedules/[id] | PUT, DELETE |
| /api/seats/[id] | PUT, DELETE |
| /api/seats | GET, POST |
| /api/settings/logo | POST |
| /api/waitlists/[id]/consultations | POST, DELETE |
| /api/waitlists/[id] | GET, PATCH, DELETE |
| /api/waitlists | GET, POST |

---

## ❌ getSupabaseWithOrg 미사용 (수정 필요)

### 🔐 Admin APIs (super_admin 전용 - org 불필요)

| API 경로 | HTTP 메소드 | 현재 방식 |
|----------|------------|----------|
| /api/admin/audit-logs | GET | createClient + super_admin 체크 |
| /api/admin/kakao | GET | createClient + super_admin 체크 |
| /api/admin/organizations/[id] | GET, PUT, DELETE | createClient + super_admin 체크 |
| /api/admin/organizations | GET, POST | createClient + super_admin 체크 |
| /api/admin/plans/[id] | GET, PUT, DELETE | createClient + super_admin 체크 |
| /api/admin/plans | GET, POST | createClient + super_admin 체크 |
| /api/admin/stats/overview | GET | createClient + super_admin 체크 |
| /api/admin/users | GET | createClient + super_admin 체크 |

> **참고**: Admin API는 super_admin이 모든 org를 관리하므로 getSupabaseWithOrg 필요 없음 (현재 방식 유지)

---

### 🔑 Auth APIs (인증 관련 - org 필요 없음)

| API 경로 | HTTP 메소드 | 현재 방식 |
|----------|------------|----------|
| /api/auth/demo | GET | createClient 직접 사용 |
| /api/auth/login | POST | createClient (client-edge) |
| /api/auth/logout | POST | createAuthenticatedClient |
| /api/auth/me | GET | createAuthenticatedClient |
| /api/auth/register | POST | createSupabaseClient 직접 생성 |

> **참고**: Auth API는 인증/회원가입 처리라 org 컨텍스트 불필요 (현재 방식 유지)

---

### 🚨 수정 필요 (일반 API - org 필터 누락)

| API 경로 | HTTP 메소드 | 현재 방식 |
|----------|------------|----------|
| /api/activity-logs | GET, POST | createAuthenticatedClient + 수동 org 추출 |
| /api/attendance/logs | (파일 없음) | - |
| /api/attendance/reconcile | POST | createAuthenticatedClient + 수동 org 추출 |
| /api/attendance | GET, POST | createAuthenticatedClient + 수동 org 추출 |
| /api/class-enrollments | GET | createAuthenticatedClient + 수동 org 추출 |
| /api/classes/[id] | GET, PATCH, DELETE | createAuthenticatedClient + 수동 org 추출 |
| /api/classes | GET, POST | createAuthenticatedClient + service fallback |
| /api/daily-planners | GET, POST, PATCH | createAuthenticatedClient + 수동 org 추출 |
| /api/daily-study-stats | GET, POST | createAuthenticatedClient + 수동 org 추출 |
| /api/debug/env | GET | 환경변수 확인용 (org 불필요) |
| /api/homework/[id] | PUT, DELETE | createAuthenticatedClient + 수동 org 추출 |
| /api/homework/submissions | GET, POST | createAuthenticatedClient + 수동 org 추출 |
| /api/homework | GET, POST | createAuthenticatedClient + service fallback |
| /api/lessons | GET, POST | createAuthenticatedClient + 수동 org 추출 |
| /api/managers/[id] | GET, PUT, DELETE | createAuthenticatedClient + 수동 org 추출 |
| /api/managers | GET, POST | createAuthenticatedClient + 수동 org 추출 |
| /api/organizations/[slug] | GET | createClient + slug 기반 조회 |
| /api/overview | GET | createAuthenticatedClient + 수동 org 추출 |
| /api/payments/[id] | PATCH | createAuthenticatedClient + 수동 org 추출 |
| /api/payments | POST | createAuthenticatedClient + 수동 org 추출 |
| /api/planner-feedback | GET, POST, DELETE | createAuthenticatedClient + 수동 org 추출 |
| /api/schedules | GET, POST, PATCH, DELETE | createAuthenticatedClient + 수동 org 추출 |
| /api/seat-assignments | GET, POST, PUT, DELETE | createAuthenticatedClient + 수동 org 추출 |
| /api/seat-config | GET, PUT | createAuthenticatedClient + 수동 org 추출 |
| /api/settings/expense-categories | GET, POST, PUT, PATCH, DELETE | createAuthenticatedClient + 수동 org 추출 |
| /api/settings/invitations/accept | GET, POST | createClient + 토큰 검증 |
| /api/settings/invitations/resend | POST | createAuthenticatedClient + 수동 org 추출 |
| /api/settings/invitations | GET, POST, DELETE | createAuthenticatedClient + 수동 org 추출 |
| /api/settings/menu-settings | GET, PUT | createAuthenticatedClient + 수동 org 추출 |
| /api/settings/page-permissions | GET, PUT | createAuthenticatedClient + 수동 org 추출 |
| /api/settings/revenue-categories | GET, POST, PUT, DELETE | createAuthenticatedClient + 수동 org 추출 |
| /api/settings/user-accounts | GET, PUT, DELETE | createAuthenticatedClient + 수동 org 추출 |
| /api/settings/widget-settings | GET, PUT | createAuthenticatedClient + 수동 org 추출 |
| /api/settings | GET, PUT | createAuthenticatedClient + 수동 org 추출 |
| /api/students/[id]/commute-schedules | GET, PATCH, DELETE | createAuthenticatedClient + 수동 org 추출 |
| /api/students/[id]/files | GET, POST, DELETE | createAuthenticatedClient + 수동 org 추출 |
| /api/students/[id]/modal | GET | createAuthenticatedClient + 수동 org 추출 |
| /api/students/[id] | PUT, DELETE | createAuthenticatedClient + service fallback |
| /api/students | GET, POST | createAuthenticatedClient + service fallback |
| /api/study-sessions | GET, POST | createAuthenticatedClient + 수동 org 추출 |
| /api/study-time-rankings | GET | createAuthenticatedClient + 수동 org 추출 |
| /api/subjects | GET, POST, DELETE | createAuthenticatedClient + 수동 org 추출 |
| /api/teachers/[id]/assign-students | POST | createAuthenticatedClient + 수동 org 추출 |
| /api/teachers/[id]/lessons | GET | createAuthenticatedClient + 수동 org 추출 |
| /api/teachers/[id]/modal | GET | createAuthenticatedClient + 수동 org 추출 |
| /api/teachers/[id]/salary | GET | createAuthenticatedClient + 수동 org 추출 |
| /api/teachers/[id] | PUT, DELETE | createAuthenticatedClient + 수동 org 추출 |
| /api/teachers/overview | GET | createAuthenticatedClient + 수동 org 추출 |
| /api/teachers | GET, POST | createAuthenticatedClient + service fallback |
| /api/test-env | GET | 환경변수 확인용 (org 불필요) |
| /api/widgets | GET | createAuthenticatedClient + 수동 org 추출 |

---

## 📊 카테고리별 통계

### Admin APIs (8개)
- ✅ 현재 방식 유지 (super_admin 전용, org 불필요)

### Auth APIs (5개)
- ✅ 현재 방식 유지 (인증 처리, org 불필요)

### 일반 APIs (75개)
- ✅ getSupabaseWithOrg 사용: 20개 (26.7%)
- ❌ 수정 필요: 55개 (73.3%)

---

## 🔍 수정 필요 API 상세 분석

### 패턴 1: `createAuthenticatedClient + 수동 org 추출` (대부분)

**현재 방식**:
```typescript
const supabase = await createAuthenticatedClient(request)
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('users')
  .select('org_id')
  .eq('id', user.id)
  .single()
const orgId = profile?.org_id
```

**개선 방식**:
```typescript
const { db, orgId } = await getSupabaseWithOrg(request)
```

---

### 패턴 2: `service fallback` (E2E/데모용)

**현재 방식**:
```typescript
const supabase = await createAuthenticatedClient(request)
const service = getServiceClient()
const demoOrg = process.env.DEMO_ORG_ID

if (authError || user.id === 'service-role') {
  orgId = demoOrg
  db = service
} else {
  // 수동 org 추출...
}
```

**개선 방식**:
```typescript
const { db, orgId } = await getSupabaseWithOrg(request)
// getSupabaseWithOrg 내부에서 service fallback 처리
```

---

### 패턴 3: `slug 기반 조회`

**현재 방식**:
```typescript
// /api/organizations/[slug]
const { slug } = await params
const { data: org } = await supabase
  .from('organizations')
  .select('*')
  .eq('slug', slug)
  .single()
```

**개선 방식**:
- `getOrgIdFromHeader(request)` 또는 slug → org_id 변환 유틸 추가

---

## 🚀 개선 우선순위

### 우선순위 1 (High) - 핵심 기능 (20개)
- [ ] /api/students (GET, POST, PUT, DELETE)
- [ ] /api/teachers (GET, POST, PUT, DELETE)
- [ ] /api/classes (GET, POST, PATCH, DELETE)
- [ ] /api/lessons (GET, POST, PUT, DELETE)
- [ ] /api/homework (GET, POST, PUT, DELETE)
- [ ] /api/attendance (GET, POST)

### 우선순위 2 (Medium) - 관리 기능 (15개)
- [ ] /api/managers (GET, POST, PUT, DELETE)
- [ ] /api/payments (POST, PATCH)
- [ ] /api/settings/* (전체)
- [ ] /api/schedules (GET, POST, PATCH, DELETE)

### 우선순위 3 (Low) - 부가 기능 (20개)
- [ ] /api/widgets
- [ ] /api/subjects
- [ ] /api/study-sessions
- [ ] /api/planner-feedback
- [ ] /api/daily-study-stats

---

## 📝 수정 가이드

### 1단계: `getSupabaseWithOrg` import 추가

```typescript
import { getSupabaseWithOrg } from '@/app/api/_utils/org'
```

### 2단계: 기존 코드 제거

```typescript
// ❌ 제거
const supabase = await createAuthenticatedClient(request)
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('users')
  .select('org_id')
  .eq('id', user.id)
  .single()
```

### 3단계: `getSupabaseWithOrg` 사용

```typescript
// ✅ 추가
const { db, orgId, user, role } = await getSupabaseWithOrg(request)

// 쿼리에 org_id 필터 적용
const { data, error } = await db
  .from('students')
  .select('*')
  .eq('org_id', orgId) // 자동 RLS
  .order('created_at', { ascending: false })
```

### 4단계: 에러 핸들링

```typescript
try {
  const { db, orgId } = await getSupabaseWithOrg(request)
  // ...
} catch (error: any) {
  if (error?.message === 'AUTH_REQUIRED') {
    return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
  }
  if (error?.message === 'PROFILE_NOT_FOUND') {
    return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
  }
  // ...
}
```

---

## ⚠️ 주의사항

1. **Admin API는 수정하지 마세요**
   - `/api/admin/*`는 super_admin이 모든 org를 관리하므로 현재 방식 유지

2. **Auth API는 수정하지 마세요**
   - `/api/auth/*`는 인증 처리이므로 org 컨텍스트 불필요

3. **테스트 필수**
   - 수정 후 E2E 테스트 실행
   - 프로덕션 livescreen/liveattendance 동작 확인

4. **Fallback 동작 확인**
   - `getSupabaseWithOrg`가 service role fallback을 처리하는지 확인
   - E2E 테스트에서 `x-e2e-no-auth` 헤더 처리 확인

---

## 📅 작업 계획

### Week 1: 핵심 API 수정 (20개)
- students, teachers, classes, lessons, homework, attendance

### Week 2: 관리 API 수정 (15개)
- managers, payments, settings, schedules

### Week 3: 부가 API 수정 + 테스트 (20개)
- widgets, subjects, study-sessions, planner-feedback 등
- 전체 E2E 테스트

---

**생성일**: 2025-12-01
**검사 기준**: `getSupabaseWithOrg` 또는 `getOrgIdFromHeader` 사용 여부
**전체 API**: 88개 (admin: 8, auth: 5, 일반: 75)
