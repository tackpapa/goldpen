# GOLDPEN_SYS_MAP v2.1
# Token-optimized system reference (machine-readable)
# Updated: 2025-11-22 (selective update)

## ⚠️ RULES (CRITICAL)
rule1:EDGE_RUNTIME_MANDATORY - export const runtime='edge' 필수
rule2:SUPABASE_RLS - 모든 쿼리에 org_id 필수 (멀티테넌트)
rule3:TYPE_SAFETY - Zod 검증 + TypeScript strict
rule4:NO_HARDCODE - 환경변수 하드코딩 절대 금지
rule5:NO_PUSH - 자동 푸시 금지, 명시적 요청만
rule6:BUILD_BEFORE_COMMIT - 커밋 전 pnpm build 성공 확인
rule7:CLOUDFLARE_ONLY - Vercel 빌드 금지, Cloudflare Pages 전용

## ARCH
framework:next15+react18+ts5.6
runtime:edge (cloudflare-workers)
deploy:cloudflare-pages (@cloudflare/next-on-pages)
db:supabase (postgresql+auth+storage+realtime)
cache:hyperdrive (cloudflare-hyperdrive-db)
node:>=20
pkg:pnpm

## TECH_STACK
ui:tailwind4+shadcn/ui+radix-ui
state:zustand4.5+tanstack-query5.56
forms:react-hook-form7+zod3.25
tables:tanstack-table8.21
dnd:dnd-kit6.3
dates:date-fns4.1
icons:lucide-react
bff:hono4.6 (workers/api)

## APPS
app:goldpen
├ tech:next15+react18+edge-runtime
├ port:8000
├ path:/
├ entry:app/layout.tsx
└ func:multi-tenant-saas (academy+study-room+study-center)

## ROUTES_DASHBOARD
base:/[institutionname]/(dashboard)
├ /overview - 대시보드 홈
├ /students - 학생 관리 (CRUD+modal+files)
├ /classes - 반 관리
├ /teachers - 강사 관리 (급여+스케줄+학생 배정)
├ /consultations - 상담 관리
├ /attendance - 출결 관리
├ /homework - 숙제 관리
├ /exams - 시험/성적
├ /lessons - 수업 기록
├ /rooms - 강의실 관리
├ /seats - 좌석 관리 (실시간)
├ /schedule - 시간표
├ /expenses - 비용 관리
├ /billing - 정산/매출
└ /settings - 기관 설정 (11개 탭)

## ROUTES_ADMIN
base:/admin/(protected)
├ /dashboard - Admin 대시보드
├ /organizations - 기관 관리 (CRUD)
├ /users - 사용자 관리
├ /audit-logs - 감사 로그
└ /settings - 시스템 설정 (4개 카테고리)

## ROUTES_LIVESCREEN
base:/[institutionname]/livescreen
├ /[seatNumber] - 학생 라이브 스크린
│ ├ timer:subject-timer (과목별 학습 타이머)
│ ├ planner:daily-planner (일일 학습 계획)
│ └ stats:study-statistics (학습 통계)
└ /liveattendance - 실시간 출결 현황

## API_ROUTES (BFF Pattern)
pattern:page→api-route→supabase (edge-runtime)

core:
├ /api/students - CRUD+files+modal
├ /api/teachers - CRUD+assign-students+modal+overview
├ /api/classes - CRUD
├ /api/consultations - CRUD
├ /api/attendance - CRUD
├ /api/homework - CRUD
├ /api/exams - CRUD
├ /api/lessons - CRUD
├ /api/rooms - CRUD
├ /api/schedules - CRUD
├ /api/expenses - CRUD
├ /api/billing - CRUD
├ /api/overview - 대시보드 통계
└ /api/settings - 설정 CRUD

admin:
├ /api/admin/organizations - 기관 CRUD
├ /api/admin/users - 사용자 관리
├ /api/admin/audit-logs - 감사 로그
└ /api/admin/stats/overview - Admin 통계

livescreen:
├ /api/study-sessions - 학습 세션 CRUD
├ /api/study-time-rankings - 학습 시간 순위
├ /api/seat-assignments - 좌석 배정 (realtime)
├ /api/seat-config - 좌석 설정
├ /api/daily-planners - 일일 계획
├ /api/daily-study-stats - 일일 통계
└ /api/subjects - 과목 관리

auth:
└ /api/auth/login - 로그인 (supabase-auth)

## DB_CORE (Supabase PostgreSQL)
schema:supabase/migrations/*.sql (58 migrations)

core_tables:
├ organizations (멀티테넌트 루트, slug+logo+status)
├ users (role:super_admin|admin|teacher|student|parent)
├ students (attendance_code+grade+school+teacher_id+files[])
├ teachers (salary+schedule+assigned_students)
├ classes (teacher_id+subject+level)
├ enrollments (student↔class, many-to-many)
├ attendance (daily records)
├ lessons (수업 기록, teacher+class)
├ homework (assignments)
├ homework_submissions (student submissions)
├ exams (시험)
├ exam_scores (시험 점수, student↔exam)
├ consultations (상담 기록)
├ rooms (강의실)
├ schedules (시간표)
├ expenses (비용)
└ billing (정산)

student_modal_tables:
├ service_enrollments (academy|study_room|study_center)
├ attendance_schedules (요일별 출결 스케줄)
├ class_credits (수업 크레딧, hours)
├ credit_transactions (크레딧 충전/사용 내역)
├ payments (결제 내역)
└ attendance_records (세부 출결 기록)

livescreen_tables:
├ study_sessions (학습 세션, student+subject+duration)
├ daily_planners (일일 계획, goals+tasks[])
├ daily_study_stats (일일 통계, total_time+subject_breakdown)
├ seat_config (좌석 설정, layout+capacity)
└ seat_assignments (좌석 배정, realtime)

admin_tables:
├ audit_logs (action+user+before/after)
├ system_settings (org_id|null, key+value(jsonb)+category)
├ menu_settings (menu활성화 설정)
├ kakaotalk_usage (카톡 발송 내역+비용)
└ service_usage (서비스 사용 비용)

indexes:
├ idx_students_org_id
├ idx_teachers_org_id
├ idx_attendance_student_date
├ idx_seat_assignments_student_date
└ ... (성능 최적화용)

rls:ALL_TABLES_ENABLED
├ policy:org_isolation (org_id 기반)
├ policy:role_based (user.role 기반)
└ policy:row_owner (user_id 기반)

## DATA_TYPES
Student:
├ id:uuid
├ org_id:uuid
├ name:text
├ attendance_code:text (4자리, unique)
├ grade:text (중1~고3|재수)
├ school:text
├ teacher_id:uuid|null
├ subjects:text[]
├ status:active|inactive|graduated
├ files:jsonb (StudentFile[])
└ ...

Teacher:
├ id:uuid
├ org_id:uuid
├ name:text
├ subjects:text[]
├ hourly_rate:numeric
├ total_salary:numeric
├ schedule:jsonb
├ assigned_students:jsonb (student_ids[])
└ ...

SystemSettings:
├ id:uuid
├ org_id:uuid|null (null=global)
├ key:text
├ value:jsonb
├ category:general|email|security|features
└ ...

## STATE
mgr:zustand+tanstack-query
stores:
├ auth-context:contexts/auth-context.tsx
│ └ {user,org,session,loading}
└ (페이지별 local state, no global store)

hooks:
├ use-student-modal-data:학생 모달 데이터 (7 tabs)
├ use-teacher-modal-data:강사 모달 데이터 (4 tabs)
├ use-seat-assignments-realtime:좌석 실시간 (realtime sync)
├ use-all-seats-realtime:전체 좌석 실시간
├ use-livescreen-state:라이브 스크린 상태
├ use-seat-realtime-status:좌석 상태 실시간
├ use-page-access:페이지 접근 권한
└ use-toast:토스트 알림 (shadcn/ui)

## REALTIME (Supabase Realtime)
enabled:seat_assignments,sleep_records
pattern:
1. useEffect → supabase.channel()
2. postgres_changes listener
3. auto-refresh on INSERT/UPDATE/DELETE

example:use-seat-assignments-realtime.ts
├ channel:seat-assignments-{org_id}-{date}
├ event:postgres_changes (table:seat_assignments)
└ sync:local-state with db changes

## COMPONENTS
ui:components/ui/* (shadcn/ui)
├ button,card,dialog,table,tabs,select,...
└ pattern:radix-ui+tailwind+cva

dashboard:components/dashboard/*
admin:components/admin/*
├ AdminHeader,AdminSidebar
└ ...

students:components/students/*
├ StudentDetailModal (7 tabs)
│ ├ BasicInfoTab
│ ├ StudyRoomTab
│ ├ AttendanceScheduleTab
│ ├ ClassCreditsTab
│ ├ PaymentTab
│ ├ PaymentHistoryTab
│ └ AttendanceHistoryTab
└ StudentFilesTab

teachers:components/teachers/*
├ TeacherDetailModal (4 tabs)
│ ├ BasicInfoTab
│ ├ SalaryTab
│ ├ ScheduleTab
│ └ AssignedStudentsTab
└ ...

livescreen:components/livescreen/*
├ SubjectTimer (과목별 타이머)
├ DailyPlannerPage (일일 계획)
└ StudyStatistics (학습 통계)

shared:components/shared/*
├ Header (기관별 네비게이션)
└ Sidebar (메뉴)

## FLOW
1.login_flow
├ /login → api/auth/login
├ supabase.auth.signInWithPassword()
├ redirect → /[org-slug]/overview
└ RLS activated (org_id from user.org_id)

2.student_crud_flow
├ /students → GET /api/students
├ modal-open → GET /api/students/[id]/modal (7 tabs)
├ edit → PUT /api/students/[id]
└ refresh → tanstack-query invalidate

3.realtime_seat_flow
├ /liveattendance → GET /api/seat-assignments
├ supabase.channel().on('postgres_changes')
├ INSERT/UPDATE/DELETE → auto-refresh UI
└ no polling, event-driven

4.teacher_salary_flow
├ /teachers → GET /api/teachers
├ modal → GET /api/teachers/[id]/modal
├ edit-salary → PUT /api/teachers/[id]
└ auto-calc:total_salary from hourly_rate+hours

5.admin_audit_flow
├ /admin/audit-logs → GET /api/admin/audit-logs
├ filter:user,action,table,date
└ pagination (100 per page)

## BUILD
dev:pnpm dev (port:8000)
build:pnpm build (next build)
pages-build:pnpm pages:build
├ tool:@cloudflare/next-on-pages
├ auto-run:next build (internally)
├ output:.vercel/output/static
└ skip-vercel-build:true

deploy:wrangler pages deploy
├ platform:cloudflare-pages
├ project:goldpen
├ runtime:edge-only (nodejs_compat disabled)
└ env:NEXT_PUBLIC_*+secrets (Cloudflare Dashboard)

test:
├ unit:vitest
├ e2e:removed (playwright deleted, no tests/)
└ coverage:vitest --coverage

## DEPLOY
cloudflare-pages:
├ build:@cloudflare/next-on-pages
├ runtime:edge-only (nodejs_compat)
├ hyperdrive:HYPERDRIVE_DB (8c1cfe4c456d460da34153acc8e0eb2c)
└ domain:goldpen.kr

cloudflare-workers:
├ api:workers/api (hono)
├ port:8787
└ route:api.goldpen.kr/*

supabase:
├ project:ipqhhqduppzvsqwwzjkp
├ region:ap-northeast-2 (seoul)
├ url:https://ipqhhqduppzvsqwwzjkp.supabase.co
└ pooler:aws-1-ap-northeast-1:6543 (hyperdrive)

## FILES
critical:
├ lib/supabase/client.ts (browser)
├ lib/supabase/server.ts (server-components)
├ lib/supabase/client-edge.ts (edge-runtime)
├ lib/types/database.ts (typescript-types)
├ contexts/auth-context.tsx (auth-provider)
├ wrangler.toml (cloudflare-config)
└ next.config.js (cloudflare-compat)

config:
├ .env.local (local-dev, NOT committed)
├ .env.migration (migration-scripts)
├ supabase/config.toml (supabase-cli)
├ package.json (dependencies)
├ tsconfig.json (typescript)
└ tailwind.config.ts (styling)

## KEYS (env-vars, NO values)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY (secret, server-only)
DATABASE_URL (direct-url, migration-only)
OPENAI_API_KEY (future, ai-reports)
HYPERDRIVE_DB (cloudflare-binding)

## LIMITS
max_upload:10MB (settings)
session_timeout:60min (settings)
password_min:8 (settings)
realtime_channels:limited by supabase plan
rls_performance:indexed by org_id

## SECURITY
rls:ENABLED on ALL tables
auth:supabase-auth (jwt-based)
cors:api routes check origin
xss:zod-validation on all inputs
sql-injection:parameterized-queries only
secrets:env-vars only, NO hardcoding
file-upload:supabase-storage with RLS

## VERSION
next:14.2.33
react:18.3.1
typescript:5.6.3
supabase-js:2.45.0
supabase-ssr:0.5.0
zod:3.25.76
tanstack-query:5.56.0
hono:4.6.0
tailwind:3.4.0
radix-ui:latest
lucide-react:0.445.0
cloudflare-next-on-pages:1.13.16
date-fns:4.1.0
recharts:2.12.0

## MCP
none (no mcp servers installed)

## DOCS
core:
├ PROJECT.md (13KB) - 이 파일 (시스템 맵)
│ └ 보기:세션 시작 시 자동 학습
├ CLAUDE.md (25KB) - 프로젝트 개발 규칙
│ └ 보기:코드 작성 전 필수
├ README.md (5KB) - 프로젝트 개요
│ └ 보기:프로젝트 소개 시
└ TASKS.md (8KB) - 작업 로그
  └ 보기:세션 시작/종료 시

migration:
├ MIGRATION_FINAL_GUIDE.md (45KB) - 최종 마이그레이션 가이드
├ SETTINGS_MIGRATION_COMPLETE.md (38KB) - 설정 마이그레이션
├ COMPLETE_MOCK_DATA_ANALYSIS.md (120KB) - Mock 데이터 분석
└ COMPREHENSIVE_SEED_DATA_GUIDE.md (32KB) - Seed 데이터 가이드

deployment:
├ CLOUDFLARE_HYPERDRIVE_SETUP.md (8KB) - Hyperdrive 설정
├ CLOUDFLARE_PAGES_BUILD_FIXES.md (12KB) - 빌드 이슈 해결
├ DEPLOYMENT.md (15KB) - 배포 가이드
└ DEPLOYMENT_OPTION2.md (22KB) - Workers 배포

architecture:
├ ARCHITECTURE.md (18KB) - 시스템 아키텍처
├ BACKEND.md (12KB) - 백엔드 구조
└ SUPABASE.md (85KB) - Supabase 상세 문서

issues:
├ KNOWN_ISSUES.md (10KB) - 알려진 이슈
├ CRITICAL_SECURITY_ACTION.md (15KB) - 보안 조치
└ SECURITY_INCIDENT.md (12KB) - 보안 인시던트

other:
├ agents.md (3KB) - Agent 목록
├ KNOWHOW.md (8KB) - 개발 노하우
└ PRD.md (존재 여부 미확인)

usage_pattern:
├ 세션시작:[TASKS.md → CLAUDE.md → PROJECT.md]
├ 기능개발:[CLAUDE.md → ARCHITECTURE.md → code]
├ 배포준비:[DEPLOYMENT.md → CLOUDFLARE_*.md]
├ DB마이그레이션:[MIGRATION_*.md → supabase/migrations/*.sql]
└ 이슈해결:[KNOWN_ISSUES.md → 해당 기술 문서]

## MIGRATION_STATUS (2025-11-22)
total:58_migrations (cleaned: deleted 7 duplicate seed files)
active:
├ 20251122_create_system_settings.sql ✅
├ 20251122_create_teachers_table.sql ✅
├ 20251122_classes_capacity_room.sql ✅
├ 20251122_aggregate_teachers_overview.sql ✅
├ 20251122_exams_homework.sql ✅
├ 20251122_finance_and_seats.sql ✅
├ 20251122_perf_indexes.sql ✅
├ 20251122_create_lessons_table.sql ✅
├ 20251122_students_add_class_id.sql ✅
├ 20251122_students_add_school.sql ✅
├ 20251122_seats_meta.sql ✅
└ 20251122_teachers_add_token.sql ✅

completed_features:
- ✅ 14 dashboard pages (mock → supabase)
- ✅ Admin pages (organizations, users, audit-logs, settings)
- ✅ Teacher management (salary, schedule, assignments)
- ✅ Livescreen (seat-assignments, study-sessions, planners)
- ✅ Student modal (7 tabs, Supabase Storage files upload)
- ✅ Settings (system_settings table, 4 categories, 11 org tabs)
- ✅ Hyperdrive setup (low-latency db connection)
- ✅ Cloudflare Pages build (edge-runtime enforced)
- ✅ File upload (Supabase Storage + RLS)

pending:
- [ ] all-schedules (legacy, 별도 페이지 3개 버전 - deprecated)
- [ ] AI reports (GPT integration)
- [ ] Kakao/SMS notifications
- [ ] Calendar sync (Google Calendar)

## DEPLOY_PATHS
local:
├ dev:pnpm dev → http://localhost:8000
├ db:supabase studio → https://supabase.com/dashboard
└ logs:console.log (browser devtools)

production:
├ app:https://goldpen.kr
├ api:https://api.goldpen.kr (workers)
├ db:https://ipqhhqduppzvsqwwzjkp.supabase.co
├ deploy:wrangler pages deploy
└ logs:wrangler tail (cloudflare logs)

migration:
├ local:psql $DATABASE_URL -f migration.sql
├ remote:supabase sql editor (dashboard)
└ script:node scripts/*.mjs

## PERFORMANCE
realtime:supabase-realtime (websocket)
cache:hyperdrive (connection-pooling)
cdn:cloudflare-pages (global-edge)
db-pool:pgbouncer (port:6543)
indexes:org_id,student_id,date (critical-paths)

## FEATURES_ROADMAP
v1.0:
- ✅ Multi-tenant SaaS
- ✅ Student/Teacher/Class management
- ✅ Attendance/Homework/Exams
- ✅ Realtime seat assignments
- ✅ Admin dashboard
- ✅ Audit logs

v1.1 (planned):
- [ ] AI-powered study reports (GPT-4)
- [ ] Kakao/SMS notifications
- [ ] Google Calendar sync
- [ ] Mobile app (React Native)
- [ ] Parent portal
- [ ] Payment gateway integration

---
# END OF GOLDPEN_SYS_MAP v2.1
# Auto-loaded on Claude Code session start
# Last updated: 2025-11-22 (selective update)
# Changes this update:
#   - Added 2 new hooks (use-teacher-modal-data, use-seat-realtime-status)
#   - Updated build config (removed playwright, clarified next-on-pages)
#   - Updated version numbers (Next 14.2.33, date-fns 4.1.0, recharts)
#   - Updated migration status (12 new migrations, file upload feature)
#   - Cleaned up pending tasks (deprecated all-schedules)
# Next update: selective (git diff based)
