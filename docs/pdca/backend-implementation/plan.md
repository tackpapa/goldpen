# Plan: ClassFlow OS 백엔드 구축

**작성일**: 2025-11-18
**목표**: 학원 관리 시스템의 백엔드 API 및 비즈니스 로직 구현
**현재 진행률**: 데이터베이스 레이어 완료 (30%)

---

## 📊 현재 상태 (Baseline)

### ✅ 완료된 작업
- **데이터베이스 설계**: 10개 테이블 스키마 정의
- **Docker PostgreSQL**: 로컬 개발 환경 구축
- **Drizzle ORM**: 마이그레이션 시스템 구축
- **프론트엔드**: 23개 페이지 스켈레톤, 27개 UI 컴포넌트

### ❌ 미구현 영역
- 인증/인가 시스템 (0%)
- API 라우트 (0%)
- 비즈니스 로직 (0%)
- 자동화 엔진 (0%)
- 외부 API 연동 (0%)
- 테스트 (0%)

---

## 🎯 목표 및 가설 (Hypothesis)

### 핵심 가설
**"Next.js API Routes + Drizzle ORM + JWT 인증 조합으로, 3주 내에 MVP 백엔드를 구축할 수 있다"**

### 검증 가능한 성공 지표 (Measurable Goals)

| 영역 | 현재 | 목표 | 측정 방법 |
|------|------|------|-----------|
| 인증 시스템 | 0% | 100% | 로그인/회원가입 E2E 테스트 통과 |
| API Coverage | 0% | 80% | 핵심 CRUD 18개 엔드포인트 구현 |
| 테스트 커버리지 | 0% | 70% | Jest + Vitest 코드 커버리지 |
| 응답 속도 | N/A | <200ms | API 평균 응답 시간 |
| 보안 | 0% | 100% | OWASP Top 10 검증 통과 |

### 예상 결과 (Expected Outcomes)
- **Week 1**: 인증 시스템 + 학생 CRUD API 완료
- **Week 2**: 출결/수업/상담 API + 자동화 기본 구현
- **Week 3**: 통합 테스트 + 보안 강화 + 문서화

---

## 🏗️ 아키텍처 설계

### 기술 스택 선정 근거

#### Backend Framework: **Next.js API Routes**
- ✅ 프론트엔드와 동일 코드베이스 (모노레포)
- ✅ TypeScript 풀 스택 타입 안전성
- ✅ Edge Runtime 지원 (Cloudflare 배포)
- ✅ 서버 컴포넌트 + Server Actions 활용 가능

**대안 검토**:
- ~~Hono (Cloudflare Workers)~~: 초기 MVP에는 과도한 복잡도
- ~~Express.js~~: Next.js와 중복, 배포 복잡도 증가

#### ORM: **Drizzle ORM**
- ✅ TypeScript Native, 타입 안전성 최고 수준
- ✅ Zero-overhead (Prisma 대비 50% 빠름)
- ✅ SQL-like 쿼리 (학습 곡선 낮음)
- ✅ PostgreSQL 완벽 지원

#### 인증: **JWT + bcrypt**
- ✅ Stateless 인증 (확장성)
- ✅ Cloudflare Workers 호환
- ✅ 구현 단순, 유연성 높음

**대안 검토**:
- ~~Supabase Auth~~: 외부 의존성, lock-in 위험
- ~~NextAuth.js~~: 과도한 추상화, 커스터마이징 제한

---

## 📋 구현 계획 (Phase-by-Phase)

### Phase 1: 인증 & 인가 시스템 (Week 1, Days 1-3)

#### 1.1 사용자 등록 & 로그인
**목표**: 이메일/비밀번호 기반 인증 구현

**작업 항목**:
```yaml
API Routes:
  POST /api/auth/register:
    - Input: email, password, name, role
    - Validation: Zod schema
    - Logic: bcrypt hash, DB insert, JWT 생성
    - Output: { user, token }

  POST /api/auth/login:
    - Input: email, password
    - Validation: 이메일 형식, 비밀번호 최소 8자
    - Logic: DB 조회, bcrypt 비교, JWT 생성
    - Output: { user, token }

  GET /api/auth/me:
    - Authorization: Bearer token
    - Logic: JWT 검증, 사용자 정보 반환
    - Output: { user }

  POST /api/auth/logout:
    - Logic: 클라이언트 토큰 삭제 (stateless)

Middleware:
  lib/auth/middleware.ts:
    - JWT 검증 함수
    - Role-based access control (RBAC)
    - 에러 처리 (401, 403)

Utilities:
  lib/auth/jwt.ts:
    - signToken(payload): string
    - verifyToken(token): payload | null
    - refreshToken(): string

  lib/auth/password.ts:
    - hashPassword(password): Promise<string>
    - comparePassword(password, hash): Promise<boolean>

Environment:
  JWT_SECRET: 32-byte random string
  JWT_EXPIRES_IN: 7d
```

**예상 시간**: 8시간
**리스크**: JWT Secret 노출 → `.env` 보안 강화, .gitignore 확인

#### 1.2 역할 기반 접근 제어 (RBAC)
**목표**: 사용자 역할에 따른 API 권한 관리

**작업 항목**:
```yaml
Role Definitions:
  owner: 모든 권한
  manager: 지점 내 모든 권한
  teacher: 담당 반 학생 읽기/쓰기
  staff: 제한된 읽기/쓰기
  student: 본인 데이터 읽기
  parent: 자녀 데이터 읽기

Middleware:
  lib/auth/rbac.ts:
    - requireRole(...roles): Middleware
    - checkPermission(user, resource, action): boolean

  Example:
    GET /api/students → requireRole('owner', 'manager', 'teacher')
    PUT /api/students/:id → requireRole('owner', 'manager')

Database Policies (Future):
  - Drizzle에는 RLS 없음, 애플리케이션 레벨에서 구현
  - 모든 쿼리에 organizationId 필터 강제
```

**예상 시간**: 6시간
**리스크**: 권한 체크 누락 → 테스트 케이스로 검증

---

### Phase 2: 핵심 CRUD API (Week 1, Days 4-7)

#### 2.1 학생 관리 API
**목표**: 학생 CRUD + 관계 데이터 (학부모)

**작업 항목**:
```yaml
API Routes:
  GET /api/students:
    - Query: page, limit, search, status, branchId
    - Response: { students: [], total, page, limit }
    - Filter: organizationId 자동 적용

  GET /api/students/:id:
    - Include: guardians (학부모 정보)
    - Response: { student, guardians: [] }

  POST /api/students:
    - Input: StudentSchema (Zod validation)
    - Logic:
      - 학생 번호 자동 생성 (YYYY-NNNN)
      - Transaction: student + guardian insert
    - Response: { student }

  PUT /api/students/:id:
    - Input: Partial<StudentSchema>
    - Logic: 수정 권한 체크
    - Response: { student }

  DELETE /api/students/:id:
    - Logic: Soft delete (status = 'withdrawn')
    - Cascade: enrollments 자동 종료

Business Logic:
  lib/services/student.service.ts:
    - createStudent(data): Promise<Student>
    - updateStudent(id, data): Promise<Student>
    - deleteStudent(id): Promise<void>
    - getStudentsByBranch(branchId): Promise<Student[]>
    - generateStudentNumber(branchId): Promise<string>

Validation:
  lib/validations/student.ts:
    - StudentCreateSchema (필수 필드)
    - StudentUpdateSchema (선택 필드)
    - GuardianSchema
```

**예상 시간**: 10시간
**리스크**: Transaction 실패 처리 → Rollback 로직 구현

#### 2.2 반 관리 API
**목표**: 반 CRUD + 수강 등록

**작업 항목**:
```yaml
API Routes:
  GET /api/classes:
    - Query: teacherId, status, branchId
    - Response: { classes: [], total }

  POST /api/classes:
    - Input: ClassSchema
    - Logic:
      - code 중복 체크
      - capacity 검증
    - Response: { class }

  POST /api/classes/:id/enroll:
    - Input: { studentId }
    - Logic:
      - 정원 체크 (currentStudents < capacity)
      - 중복 수강 체크
      - Transaction: enrollment insert + currentStudents++
    - Response: { enrollment }

  DELETE /api/classes/:id/enroll/:enrollmentId:
    - Logic: Transaction (enrollment delete + currentStudents--)

Business Logic:
  lib/services/class.service.ts:
    - enrollStudent(classId, studentId): Promise<Enrollment>
    - withdrawStudent(enrollmentId): Promise<void>
    - checkCapacity(classId): Promise<boolean>
```

**예상 시간**: 8시간

#### 2.3 출결 관리 API
**목표**: 실시간 출결 체크 및 통계

**작업 항목**:
```yaml
API Routes:
  POST /api/attendance:
    - Input: { studentId, classId?, date, status, checkInTime }
    - Logic:
      - 중복 체크 (같은 날 이미 기록 있으면 update)
      - Upsert 패턴
    - Response: { attendance }

  GET /api/attendance:
    - Query: date, studentId, classId, status
    - Response: { attendances: [], stats }

  GET /api/attendance/stats:
    - Query: startDate, endDate, branchId
    - Response: {
        total, present, absent, late, excused,
        rate: present/total
      }

Business Logic:
  lib/services/attendance.service.ts:
    - recordAttendance(data): Promise<Attendance>
    - getAttendanceStats(query): Promise<Stats>
    - bulkRecordAttendance(students, data): Promise<Attendance[]>
```

**예상 시간**: 6시간

#### 2.4 상담 관리 API
**목표**: 상담 신청 처리 + 상태 관리

**작업 항목**:
```yaml
API Routes:
  POST /api/consultations (Public):
    - Input: ConsultationSchema (공개 폼)
    - Logic: status = 'pending'
    - Response: { consultation }
    - No Auth: 공개 접수

  GET /api/consultations:
    - Auth Required
    - Query: status, date, consultantId
    - Response: { consultations: [] }

  PUT /api/consultations/:id:
    - Input: { status, scheduledDate, notes }
    - Logic: 상태 변경 (pending → scheduled → completed)
    - Response: { consultation }

Business Logic:
  lib/services/consultation.service.ts:
    - createConsultation(data): Promise<Consultation>
    - updateStatus(id, status): Promise<Consultation>
    - scheduleConsultation(id, date, time): Promise<Consultation>
```

**예상 시간**: 5시간

---

### Phase 3: 자동화 엔진 기본 (Week 2, Days 1-3)

#### 3.1 알림 시스템 (Email)
**목표**: 상담 신청 시 이메일 자동 발송

**작업 항목**:
```yaml
Email Service:
  lib/services/email.service.ts:
    - sendEmail(to, subject, html): Promise<void>
    - sendConsultationConfirmation(consultation): Promise<void>
    - sendClassReminder(student, class): Promise<void>

Integration:
  - SendGrid API 연동
  - 이메일 템플릿 (Handlebars)

Trigger:
  - 상담 신청 시: POST /api/consultations → sendEmail()
  - 수업 24시간 전: Cron job (나중에 구현)

Environment:
  SENDGRID_API_KEY
  SENDGRID_FROM_EMAIL
```

**예상 시간**: 4시간
**리스크**: SendGrid 계정 필요 → 개발 시 Console.log로 대체

#### 3.2 출결 자동 체크 (독서실)
**목표**: QR 코드 또는 수동 체크인

**작업 항목**:
```yaml
API Routes:
  POST /api/attendance/check-in:
    - Input: { studentId, qrCode? }
    - Logic:
      - QR 검증 (나중에)
      - 현재 시간으로 출석 기록
      - 지각 판정 (startTime 기준)
    - Response: { attendance, message: "출석 완료" }

Business Logic:
  lib/services/attendance.service.ts:
    - checkIn(studentId, time): Promise<Attendance>
    - determineStatus(time, classStartTime): 'present' | 'late'
```

**예상 시간**: 3시간

---

### Phase 4: 보안 & 에러 처리 (Week 2, Days 4-5)

#### 4.1 입력 검증 강화
**작업 항목**:
```yaml
Validation:
  - 모든 API에 Zod schema 적용
  - SQL Injection 방지 (Drizzle ORM 사용)
  - XSS 방지 (입력 sanitize)

Rate Limiting:
  lib/middleware/rate-limit.ts:
    - IP 기반 요청 제한 (100req/min)
    - 로그인 실패 5회 → 15분 잠금

CORS:
  next.config.js:
    - 허용 도메인 설정 (프로덕션)
```

**예상 시간**: 4시간

#### 4.2 에러 처리 표준화
**작업 항목**:
```yaml
Error Classes:
  lib/errors/index.ts:
    - ApiError (base class)
    - ValidationError (400)
    - UnauthorizedError (401)
    - ForbiddenError (403)
    - NotFoundError (404)
    - ConflictError (409)

Error Handler:
  lib/middleware/error-handler.ts:
    - Global error handler
    - 프로덕션: 상세 에러 숨김
    - 개발: 스택 트레이스 노출

Logging:
  lib/utils/logger.ts:
    - console.log → structured logging
    - 에러 로그 파일 저장
```

**예상 시간**: 3시간

---

### Phase 5: 테스트 (Week 2, Days 6-7)

#### 5.1 API 통합 테스트
**작업 항목**:
```yaml
Test Framework:
  - Vitest (unit tests)
  - Supertest (API integration tests)

Test Coverage:
  tests/api/auth.test.ts:
    - 회원가입 성공/실패
    - 로그인 성공/실패
    - JWT 검증

  tests/api/students.test.ts:
    - CRUD 테스트
    - 권한 검증
    - 페이지네이션

Target: 70% code coverage
```

**예상 시간**: 10시간

#### 5.2 E2E 테스트 (선택)
**작업 항목**:
```yaml
Playwright Tests:
  tests/e2e/consultation-flow.spec.ts:
    - 상담 신청 → 접수 확인 → 이메일 발송

  tests/e2e/student-management.spec.ts:
    - 학생 등록 → 반 배정 → 출결 체크
```

**예상 시간**: 6시간 (선택)

---

### Phase 6: 문서화 & 배포 준비 (Week 3)

#### 6.1 API 문서 자동 생성
**작업 항목**:
```yaml
OpenAPI/Swagger:
  - next-swagger-doc 통합
  - /api/docs 엔드포인트
  - 자동 스키마 생성 (Zod → OpenAPI)

README Update:
  - API 사용 예시
  - 환경 변수 설명
  - 배포 가이드
```

**예상 시간**: 4시간

#### 6.2 Cloudflare Pages 배포
**작업 항목**:
```yaml
Production Config:
  - 환경 변수 설정 (Cloudflare)
  - 데이터베이스 연결 (Neon/Supabase)
  - Edge Runtime 최적화

CI/CD:
  - GitHub Actions workflow
  - 자동 빌드 & 배포
  - 테스트 통과 시 배포
```

**예상 시간**: 6시간

---

## 🗓️ 상세 일정 (Gantt Chart)

```
Week 1: 인증 & 핵심 CRUD
├─ Day 1-2: 인증 시스템 (회원가입, 로그인, JWT)
├─ Day 3: RBAC 구현
├─ Day 4-5: 학생 API
├─ Day 6: 반 API
└─ Day 7: 출결/상담 API

Week 2: 자동화 & 보안
├─ Day 1-2: 이메일 알림
├─ Day 3: 출결 자동화
├─ Day 4-5: 보안 강화 & 에러 처리
└─ Day 6-7: 통합 테스트

Week 3: 품질 & 배포
├─ Day 1-2: 추가 API (시험, 과제)
├─ Day 3-4: 문서화
└─ Day 5-7: 배포 준비 & QA
```

---

## 🎯 우선순위 정의

### Must Have (P0 - Week 1)
- ✅ 인증 시스템 (로그인, 회원가입)
- ✅ 학생 CRUD API
- ✅ 반 CRUD API
- ✅ 출결 기록 API

### Should Have (P1 - Week 2)
- ⭐ 상담 관리 API
- ⭐ 이메일 알림
- ⭐ 보안 강화
- ⭐ 기본 테스트

### Nice to Have (P2 - Week 3)
- 📋 시험 관리 API
- 📋 과제 관리 API
- 📋 E2E 테스트
- 📋 API 문서 자동화

### Future (V2)
- GPT 통합 (학습 리포트)
- 결제/정산 시스템
- KakaoTalk 알림
- 실시간 대시보드 (Supabase Realtime)

---

## ⚠️ 리스크 & 대응 방안

### 기술 리스크

| 리스크 | 발생 확률 | 영향도 | 대응 방안 |
|--------|----------|--------|-----------|
| JWT Secret 노출 | 중 | 치명적 | 환경 변수 검증, .gitignore 확인 |
| 데이터베이스 연결 실패 | 중 | 높음 | Connection pool 설정, 재시도 로직 |
| Transaction 실패 | 높음 | 중간 | Rollback 로직, 에러 로깅 |
| API 응답 속도 저하 | 중 | 중간 | 인덱스 최적화, 캐싱 전략 |
| 권한 체크 누락 | 높음 | 높음 | 테스트 케이스, 코드 리뷰 |

### 일정 리스크

| 리스크 | 대응 방안 |
|--------|-----------|
| 예상보다 시간 소요 | Nice to Have 항목 연기 |
| 외부 API 연동 지연 | Mock 데이터로 먼저 구현 |
| 테스트 시간 부족 | 핵심 API만 우선 테스트 |

---

## 📏 품질 기준 (Quality Gates)

### Phase 완료 조건

**Phase 1 완료 기준**:
- [ ] 회원가입/로그인 E2E 테스트 통과
- [ ] JWT 검증 로직 단위 테스트 100%
- [ ] RBAC 미들웨어 테스트 통과
- [ ] 문서화: API 사용 예시 작성

**Phase 2 완료 기준**:
- [ ] CRUD API 통합 테스트 70% 이상
- [ ] Zod 검증 모든 엔드포인트 적용
- [ ] 페이지네이션 동작 확인
- [ ] 에러 처리 표준화 적용

**Phase 3 완료 기준**:
- [ ] 이메일 발송 성공 (개발 환경)
- [ ] 출결 자동 체크 동작 확인
- [ ] 트리거 로직 테스트 통과

**Phase 4 완료 기준**:
- [ ] OWASP Top 10 체크리스트 검증
- [ ] Rate limiting 동작 확인
- [ ] 에러 로깅 구조화 완료

**Phase 5 완료 기준**:
- [ ] 테스트 커버리지 70% 이상
- [ ] 주요 플로우 E2E 테스트 통과
- [ ] CI/CD 자동 테스트 실행

---

## 🔄 PDCA 체크포인트

### Do Phase (실행 중)
- **매일 진행 상황 기록**: `docs/pdca/backend-implementation/do.md`
- **에러 및 해결 방법 로그**: 타임스탬프, 원인, 해결책
- **학습 내용 메모**: 새로운 패턴, 주의사항

### Check Phase (평가)
- **매 Phase 종료 시**: 목표 달성 여부 평가
- **주간 회고**: 계획 대비 실제 진행률
- **품질 지표 측정**: 테스트 커버리지, API 응답 속도

### Act Phase (개선)
- **성공 패턴**: `docs/patterns/` 에 문서화
- **실패 분석**: `docs/mistakes/` 에 기록 + 방지책
- **CLAUDE.md 업데이트**: 글로벌 베스트 프랙티스 반영

---

## 📚 참고 자료

### 공식 문서
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

### 보안 가이드
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [API Security Checklist](https://github.com/shieldfy/API-Security-Checklist)

### 프로젝트 내부 문서
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - 시스템 아키텍처
- [PRD.md](../../PRD.md) - 제품 요구사항
- [CLAUDE.md](../../CLAUDE.md) - 개발 가이드라인

---

## ✅ 체크리스트

### 시작 전 확인사항
- [ ] Docker PostgreSQL 실행 중
- [ ] `.env.local` 환경 변수 설정
- [ ] 마이그레이션 실행 완료
- [ ] Git 브랜치 생성 (`feature/backend-api`)

### Phase 1 시작 전
- [ ] JWT_SECRET 생성 (32-byte random)
- [ ] bcrypt 패키지 설치
- [ ] Zod 스키마 준비

### Phase 2 시작 전
- [ ] API 라우트 디렉토리 구조 설계
- [ ] 서비스 레이어 패턴 정의
- [ ] 에러 클래스 준비

---

**다음 문서**: `docs/pdca/backend-implementation/do.md` (실행 로그)
**관련 이슈**: GitHub Issue #1 "백엔드 API 구축"
**담당**: PM Agent + Backend Architect

---

**승인 필요**: 사용자 검토 후 구현 시작
