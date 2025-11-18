# ClassFlow OS 백엔드 구축 계획서

**작성일**: 2025-11-18
**목표**: 학원 관리 시스템의 백엔드 API 및 비즈니스 로직 구현
**예상 기간**: 3주 (83시간)
**현재 진행률**: 12% (데이터베이스 레이어 완료)

---

## 📊 진행 현황

| Phase | 작업 | 진행률 | 예상 시간 | 상태 |
|-------|------|--------|-----------|------|
| 0️⃣ | 데이터베이스 설계 | 100% | ✅ 완료 | ✅ |
| 1️⃣ | 인증 & 인가 시스템 | 0% | 14h | 🔜 |
| 2️⃣ | 핵심 CRUD API | 0% | 29h | ⏳ |
| 3️⃣ | 자동화 엔진 기본 | 0% | 7h | ⏳ |
| 4️⃣ | 보안 & 에러 처리 | 0% | 7h | ⏳ |
| 5️⃣ | 테스트 | 0% | 16h | ⏳ |
| 6️⃣ | 문서화 & 배포 | 0% | 10h | ⏳ |

### ✅ 완료된 작업
- 데이터베이스 설계 (10개 테이블 스키마 정의)
- Docker PostgreSQL 로컬 개발 환경 구축
- Drizzle ORM 마이그레이션 시스템 구축
- 프론트엔드 (23개 페이지 스켈레톤, 27개 UI 컴포넌트)

### ❌ 미구현 영역
- 인증/인가 시스템 (0%)
- API 라우트 (0%)
- 비즈니스 로직 (0%)
- 자동화 엔진 (0%)
- 외부 API 연동 (0%)
- 테스트 (0%)

---

## 🎯 목표 및 가설

### 핵심 가설
**"Next.js API Routes + Drizzle ORM + JWT 인증 조합으로, 3주 내에 MVP 백엔드를 구축할 수 있다"**

### 검증 가능한 성공 지표

| 영역 | 현재 | 목표 | 측정 방법 |
|------|------|------|-----------|
| 인증 시스템 | 0% | 100% | 로그인/회원가입 E2E 테스트 통과 |
| API Coverage | 0% | 80% | 핵심 CRUD 19개 엔드포인트 구현 |
| 테스트 커버리지 | 0% | 70% | Vitest 코드 커버리지 |
| 응답 속도 | N/A | <200ms | API 평균 응답 시간 |
| 보안 | 0% | 100% | OWASP Top 10 검증 통과 |

---

## 🏗️ 아키텍처

### 시스템 구조

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                │
│  (23 Pages + 27 UI Components - Already Built)     │
└────────────────┬────────────────────────────────────┘
                 │ HTTP/JSON
                 ▼
┌─────────────────────────────────────────────────────┐
│              API Layer (Next.js API Routes)         │
│  ┌──────────────────────────────────────────────┐   │
│  │  Middleware: JWT, RBAC, Rate Limit, Errors   │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  API Routes: auth, students, classes...      │   │
│  └──────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│    Business Logic Layer (Services)                  │
│    student, class, attendance, email services...    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│    Data Access Layer (Drizzle ORM)                  │
│    lib/db/schema/*.ts (10 tables)                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│    PostgreSQL 16 (Docker → Neon)                    │
└─────────────────────────────────────────────────────┘
```

### 기술 스택 선정 근거

**Backend Framework: Next.js API Routes**
- ✅ 프론트엔드와 동일 코드베이스 (모노레포)
- ✅ TypeScript 풀 스택 타입 안전성
- ✅ Edge Runtime 지원 (Cloudflare 배포)
- ✅ 서버 컴포넌트 + Server Actions 활용 가능
- ❌ 대안: Hono (초기 MVP에 과도), Express.js (중복)

**ORM: Drizzle ORM**
- ✅ TypeScript Native, 타입 안전성 최고 수준
- ✅ Zero-overhead (Prisma 대비 50% 빠름)
- ✅ SQL-like 쿼리 (학습 곡선 낮음)
- ✅ PostgreSQL 완벽 지원

**인증: JWT + bcrypt**
- ✅ Stateless 인증 (확장성)
- ✅ Cloudflare Workers 호환
- ✅ 구현 단순, 유연성 높음
- ❌ 대안: Supabase Auth (lock-in), NextAuth.js (과도한 추상화)

---

## 🎯 3주 마일스톤

### Week 1: 인증 & 핵심 CRUD (Foundation)
**목표**: 로그인하여 학생/반/출결 데이터를 조회/수정할 수 있다

**주요 산출물** (19 endpoints):
- ✅ 회원가입/로그인 API (3개)
- ✅ JWT 인증 미들웨어
- ✅ RBAC 권한 시스템
- ✅ 학생 CRUD API (5개)
- ✅ 반 CRUD API (5개)
- ✅ 출결 기록 API (3개)
- ✅ 상담 신청 API (3개)

**검증 방법**:
```bash
# 회원가입 → 로그인 → 학생 조회/등록
curl -X POST http://localhost:8000/api/auth/register
curl -X POST http://localhost:8000/api/auth/login
curl -H "Authorization: Bearer TOKEN" http://localhost:8000/api/students
```

---

### Week 2: 자동화 & 보안 (Enhancement)
**목표**: 상담 신청 시 이메일 자동 발송 + API 보안 강화

**주요 산출물**:
- ✅ 이메일 알림 시스템
- ✅ 출결 자동 체크
- ✅ 입력 검증 강화 (Zod)
- ✅ Rate Limiting (로그인 5회 실패 → 15분 잠금)
- ✅ 에러 처리 표준화
- ✅ API 통합 테스트 (70% coverage)

**검증 방법**:
- 상담 신청 → 이메일 수신 확인
- 잘못된 입력 → 400 에러 + 명확한 메시지
- `npm test` → 모든 테스트 통과

---

### Week 3: 품질 & 배포 (Production Ready)
**목표**: 프로덕션 배포 가능한 품질 확보

**주요 산출물**:
- ✅ API 문서 자동 생성 (Swagger)
- ✅ E2E 테스트 (주요 플로우)
- ✅ Cloudflare Pages 배포 설정
- ✅ CI/CD 파이프라인
- 📋 시험/과제 API (선택)

**검증 방법**:
- `/api/docs` → Swagger UI 정상 표시
- E2E 테스트 통과
- 프로덕션 배포 성공
- OWASP Top 10 체크리스트 검증

---

## 📋 Phase별 상세 구현 계획

### Phase 1: 인증 & 인가 시스템 (Week 1, Days 1-3, 14시간)

#### 1.1 사용자 등록 & 로그인 (8시간)
```yaml
API Routes:
  POST /api/auth/register:
    Input: { email, password, name, role }
    Validation: Zod schema
    Logic: bcrypt hash → DB insert → JWT 생성
    Output: { user, token }

  POST /api/auth/login:
    Input: { email, password }
    Validation: 이메일 형식, 비밀번호 최소 8자
    Logic: DB 조회 → bcrypt 비교 → JWT 생성
    Output: { user, token }

  GET /api/auth/me:
    Authorization: Bearer token
    Logic: JWT 검증 → 사용자 정보 반환

Utilities:
  lib/auth/jwt.ts:
    - signToken(payload): string
    - verifyToken(token): payload | null

  lib/auth/password.ts:
    - hashPassword(password): Promise<string>
    - comparePassword(password, hash): Promise<boolean>

Environment:
  JWT_SECRET: 32-byte random (openssl rand -base64 32)
  JWT_EXPIRES_IN: 7d
```

**리스크**: JWT Secret 노출 → `.env` 보안 강화, .gitignore 확인

#### 1.2 역할 기반 접근 제어 (6시간)
```yaml
Role Definitions:
  owner: 모든 권한
  manager: 지점 내 모든 권한
  teacher: 담당 반 학생 읽기/쓰기
  staff: 제한된 읽기/쓰기
  student: 본인 데이터 읽기
  parent: 자녀 데이터 읽기

Middleware (lib/auth/rbac.ts):
  requireRole(...roles): Middleware
  checkPermission(user, resource, action): boolean

Example:
  GET /api/students → requireRole('owner', 'manager', 'teacher')
  PUT /api/students/:id → requireRole('owner', 'manager')
```

**리스크**: 권한 체크 누락 → 테스트 케이스로 검증

---

### Phase 2: 핵심 CRUD API (Week 1, Days 4-7, 29시간)

#### 2.1 학생 관리 API (10시간)
```yaml
API Routes:
  GET /api/students:
    Query: page, limit, search, status, branchId
    Response: { students: [], total, page, limit }
    Filter: organizationId 자동 적용

  GET /api/students/:id:
    Include: guardians (학부모 정보)
    Response: { student, guardians: [] }

  POST /api/students:
    Input: StudentSchema (Zod)
    Logic: 학생번호 자동생성 (YYYY-NNNN) + Transaction
    Response: { student }

  PUT /api/students/:id:
    Input: Partial<StudentSchema>
    Response: { student }

  DELETE /api/students/:id:
    Logic: Soft delete (status = 'withdrawn')

Business Logic (lib/services/student.service.ts):
  createStudent(data): Promise<Student>
  updateStudent(id, data): Promise<Student>
  deleteStudent(id): Promise<void>
  generateStudentNumber(branchId): Promise<string>
```

**리스크**: Transaction 실패 → Rollback 로직 구현

#### 2.2 반 관리 API (8시간)
```yaml
API Routes:
  GET /api/classes: 반 목록
  POST /api/classes: 반 생성 (code 중복 체크)
  POST /api/classes/:id/enroll: 수강 등록 (정원 체크 + Transaction)
  DELETE /api/classes/:id/enroll/:enrollmentId: 수강 취소

Business Logic (lib/services/class.service.ts):
  enrollStudent(classId, studentId): Promise<Enrollment>
  withdrawStudent(enrollmentId): Promise<void>
  checkCapacity(classId): Promise<boolean>
```

#### 2.3 출결 관리 API (6시간)
```yaml
API Routes:
  POST /api/attendance: 출결 기록 (Upsert 패턴)
  GET /api/attendance: 출결 조회
  GET /api/attendance/stats: 통계 (출석률)

Business Logic:
  recordAttendance(data): Promise<Attendance>
  getAttendanceStats(query): Promise<Stats>
```

#### 2.4 상담 관리 API (5시간)
```yaml
API Routes:
  POST /api/consultations (Public, No Auth): 상담 신청
  GET /api/consultations: 상담 목록 (Auth Required)
  PUT /api/consultations/:id: 상태 변경 (pending → scheduled → completed)
```

---

### Phase 3: 자동화 엔진 기본 (Week 2, Days 1-3, 7시간)

#### 3.1 알림 시스템 (4시간)
```yaml
Email Service (lib/services/email.service.ts):
  sendEmail(to, subject, html): Promise<void>
  sendConsultationConfirmation(consultation): Promise<void>

Integration: SendGrid API
Trigger: 상담 신청 시 자동 발송

Environment:
  SENDGRID_API_KEY
  SENDGRID_FROM_EMAIL
```

**리스크**: SendGrid 계정 필요 → 개발 시 Console.log로 대체

#### 3.2 출결 자동 체크 (3시간)
```yaml
API Routes:
  POST /api/attendance/check-in:
    Input: { studentId, qrCode? }
    Logic: 현재 시간으로 출석 기록 + 지각 판정
    Response: { attendance, message: "출석 완료" }
```

---

### Phase 4: 보안 & 에러 처리 (Week 2, Days 4-5, 7시간)

#### 4.1 입력 검증 강화 (4시간)
```yaml
Validation:
  - 모든 API에 Zod schema 적용
  - SQL Injection 방지 (Drizzle ORM)
  - XSS 방지 (입력 sanitize)

Rate Limiting (lib/middleware/rate-limit.ts):
  - IP 기반 요청 제한 (100req/min)
  - 로그인 실패 5회 → 15분 잠금

CORS (next.config.js):
  - 허용 도메인 설정 (프로덕션)
```

#### 4.2 에러 처리 표준화 (3시간)
```yaml
Error Classes (lib/errors/index.ts):
  ApiError, ValidationError (400), UnauthorizedError (401),
  ForbiddenError (403), NotFoundError (404), ConflictError (409)

Error Handler (lib/middleware/error-handler.ts):
  - Global error handler
  - 프로덕션: 상세 에러 숨김
  - 개발: 스택 트레이스 노출

Logging (lib/utils/logger.ts):
  - Structured logging
  - 에러 로그 파일 저장
```

---

### Phase 5: 테스트 (Week 2, Days 6-7, 16시간)

#### 5.1 API 통합 테스트 (10시간)
```yaml
Framework: Vitest + Supertest

Test Coverage:
  tests/api/auth.test.ts: 회원가입/로그인/JWT 검증
  tests/api/students.test.ts: CRUD + 권한 + 페이지네이션

Target: 70% code coverage
```

#### 5.2 E2E 테스트 (6시간, 선택)
```yaml
Playwright Tests:
  tests/e2e/consultation-flow.spec.ts: 상담 신청 → 이메일 발송
  tests/e2e/student-management.spec.ts: 학생 등록 → 반 배정 → 출결 체크
```

---

### Phase 6: 문서화 & 배포 준비 (Week 3, 10시간)

#### 6.1 API 문서 자동 생성 (4시간)
```yaml
OpenAPI/Swagger:
  - next-swagger-doc 통합
  - /api/docs 엔드포인트
  - Zod → OpenAPI 자동 변환
```

#### 6.2 Cloudflare Pages 배포 (6시간)
```yaml
Production Config:
  - 환경 변수 설정
  - 데이터베이스 연결 (Neon/Supabase)
  - Edge Runtime 최적화

CI/CD (GitHub Actions):
  - 자동 빌드 & 배포
  - 테스트 통과 시 배포
```

---

## 📋 우선순위별 API 목록

### P0 - Must Have (Week 1) - 19 endpoints

**인증 (3)**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

**학생 관리 (5)**
- `GET /api/students`
- `GET /api/students/:id`
- `POST /api/students`
- `PUT /api/students/:id`
- `DELETE /api/students/:id`

**반 관리 (5)**
- `GET /api/classes`
- `POST /api/classes`
- `POST /api/classes/:id/enroll`
- `DELETE /api/classes/:id/enroll/:enrollmentId`
- `GET /api/classes/:id/students`

**출결 관리 (3)**
- `POST /api/attendance`
- `GET /api/attendance`
- `GET /api/attendance/stats`

**상담 관리 (3)**
- `POST /api/consultations`
- `GET /api/consultations`
- `PUT /api/consultations/:id`

---

### P1 - Should Have (Week 2) - 6 endpoints

**강사 관리 (4)**
- `GET /api/teachers`
- `POST /api/teachers`
- `PUT /api/teachers/:id`
- `DELETE /api/teachers/:id`

**자동화 (2)**
- `POST /api/notifications/email`
- `POST /api/attendance/check-in`

---

### P2 - Nice to Have (Week 3) - 8 endpoints

**시험 관리 (4)**
- `GET /api/exams`
- `POST /api/exams`
- `POST /api/exams/:id/results`
- `GET /api/exams/:id/results`

**과제 관리 (4)**
- `GET /api/homework`
- `POST /api/homework`
- `POST /api/homework/:id/submit`
- `GET /api/homework/:id/submissions`

---

**총 API 개수**: 33 endpoints (P0: 19, P1: 6, P2: 8)

---

## ⚠️ 리스크 & 대응 방안

### 기술 리스크

| 리스크 | 확률 | 영향 | 대응 방안 |
|--------|------|------|-----------|
| JWT Secret 노출 | 중 | 치명적 | 환경 변수 검증, .gitignore |
| DB 연결 실패 | 중 | 높음 | Connection pool, 재시도 |
| Transaction 실패 | 높음 | 중간 | Rollback 로직, 에러 로깅 |
| API 응답 저하 | 중 | 중간 | 인덱스 최적화, 캐싱 |
| 권한 체크 누락 | 높음 | 높음 | 테스트 케이스, 코드 리뷰 |

### 일정 리스크

| 리스크 | 대응 방안 |
|--------|-----------|
| 예상보다 시간 소요 | Nice to Have 항목 연기 |
| 외부 API 연동 지연 | Mock 데이터로 먼저 구현 |
| 테스트 시간 부족 | 핵심 API만 우선 테스트 |

---

## 📏 품질 기준 (Quality Gates)

**Phase 1 완료 조건**:
- [ ] 회원가입/로그인 E2E 테스트 통과
- [ ] JWT 검증 로직 단위 테스트 100%
- [ ] RBAC 미들웨어 테스트 통과
- [ ] API 사용 예시 문서화

**Phase 2 완료 조건**:
- [ ] CRUD API 통합 테스트 70% 이상
- [ ] Zod 검증 모든 엔드포인트 적용
- [ ] 페이지네이션 동작 확인
- [ ] 에러 처리 표준화 적용

**Phase 3-6 완료 조건**:
- [ ] 이메일 발송 성공 (개발 환경)
- [ ] OWASP Top 10 검증
- [ ] 테스트 커버리지 70% 이상
- [ ] Swagger 문서 정상 표시
- [ ] 프로덕션 배포 성공

---

## 🗓️ 상세 일정

```
Week 1: 인증 & 핵심 CRUD (43시간)
├─ Day 1-2: 인증 시스템 (회원가입, 로그인, JWT)
├─ Day 3: RBAC 구현
├─ Day 4-5: 학생 API
├─ Day 6: 반 API
└─ Day 7: 출결/상담 API

Week 2: 자동화 & 보안 (30시간)
├─ Day 1-2: 이메일 알림
├─ Day 3: 출결 자동화
├─ Day 4-5: 보안 강화 & 에러 처리
└─ Day 6-7: 통합 테스트

Week 3: 품질 & 배포 (10시간)
├─ Day 1-2: 추가 API (시험, 과제) - 선택
├─ Day 3-4: 문서화 (Swagger)
└─ Day 5-7: 배포 준비 & QA
```

---

## ⚡ 빠른 시작

### 1. 환경 설정
```bash
# Docker PostgreSQL 시작
npm run docker:up

# 마이그레이션 실행
npm run db:push

# JWT_SECRET 생성
openssl rand -base64 32
# → .env.local에 추가
```

### 2. 개발 서버 실행
```bash
npm run dev
# → http://localhost:8000
```

### 3. API 테스트
```bash
# 회원가입
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"12345678","name":"테스트","role":"owner"}'

# 로그인
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"12345678"}'
```

---

## 📚 디렉토리 구조

```
classflow-os/
├── app/
│   └── api/                    # API Routes
│       ├── auth/
│       │   ├── register/route.ts
│       │   ├── login/route.ts
│       │   └── me/route.ts
│       ├── students/
│       │   ├── route.ts       # GET, POST
│       │   └── [id]/route.ts  # GET, PUT, DELETE
│       ├── classes/
│       ├── attendance/
│       └── consultations/
├── lib/
│   ├── auth/                   # JWT, password, RBAC
│   ├── services/               # Business logic
│   ├── validations/            # Zod schemas
│   ├── errors/                 # Error classes
│   └── middleware/             # Rate limit, error handler
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 🔄 PDCA 체크포인트

### Do (실행 중)
- **매일 진행 기록**: `docs/pdca/backend-implementation/do.md`
- **에러 및 해결 로그**: 타임스탬프, 원인, 해결책
- **학습 내용 메모**: 새로운 패턴, 주의사항

### Check (평가)
- **매 Phase 종료 시**: 목표 달성 여부 평가
- **주간 회고**: 계획 대비 실제 진행률
- **품질 지표 측정**: 테스트 커버리지, API 응답 속도

### Act (개선)
- **성공 패턴**: `docs/patterns/` 문서화
- **실패 분석**: `docs/mistakes/` 기록 + 방지책
- **CLAUDE.md 업데이트**: 글로벌 베스트 프랙티스 반영

---

## 📚 참고 자료

- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [API Security Checklist](https://github.com/shieldfy/API-Security-Checklist)

### 프로젝트 내부 문서
- [ARCHITECTURE.md](../ARCHITECTURE.md) - 시스템 아키텍처
- [PRD.md](../PRD.md) - 제품 요구사항
- [CLAUDE.md](../CLAUDE.md) - 개발 가이드라인
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - DB 설정 가이드

---

## ✅ 시작 전 체크리스트

### 환경 확인
- [ ] Docker PostgreSQL 실행 중
- [ ] `.env.local` 환경 변수 설정
- [ ] 마이그레이션 실행 완료
- [ ] Git 브랜치 생성 (`feature/backend-api`)

### Phase 1 준비
- [ ] JWT_SECRET 생성 (32-byte random)
- [ ] bcrypt 패키지 설치
- [ ] Zod 스키마 준비

### Phase 2 준비
- [ ] API 라우트 디렉토리 구조 설계
- [ ] 서비스 레이어 패턴 정의
- [ ] 에러 클래스 준비

---

**다음 문서**: `docs/pdca/backend-implementation/do.md` (실행 로그)
**작성자**: PM Agent
**버전**: 1.0.0

---

**승인 필요**: 사용자 검토 후 구현 시작
