# GOLDPEN_SYS_MAP v3.7
# Token-optimized system reference (machine-readable)
# Generated: 2025-11-29 | Updated: 2025-12-06 (full sync v4)

## ⚠️ RULES (CRITICAL)
rule1:EDGE_RUNTIME - export const runtime='edge' 필수
rule2:RLS_MANDATORY - 모든 쿼리에 org_id 필수 (멀티테넌트)
rule3:TYPE_SAFETY - Zod 검증 + TypeScript strict
rule4:NO_HARDCODE - 환경변수/키 하드코딩 절대 금지
rule5:NO_AUTO_PUSH - 자동 푸시 금지, 명시적 요청만
rule6:BUILD_CHECK - 커밋 전 pnpm build 성공 확인
rule7:CLOUDFLARE_ONLY - Vercel 금지, Cloudflare Pages/Workers 전용
rule8:DEPLOY_BOTH - 프론트(Pages)+백엔드(Workers) 둘 다 배포

## ARCH
framework:next14.2+react18.3+ts5.6
runtime:edge (cloudflare)
deploy:cloudflare-pages (@cloudflare/next-on-pages)
db:supabase (postgresql+auth+storage+realtime)
cache:hyperdrive (8c1cfe4c456d460da34153acc8e0eb2c)
node:>=20
pkg:pnpm@9.12

## TECH_STACK
ui:tailwind3.4+shadcn/ui+radix-ui
state:zustand4.5+tanstack-query5.56+swr2.3
forms:react-hook-form7.66+zod3.25
tables:tanstack-table8.21
dnd:dnd-kit6.3+sortable10
charts:recharts2.12
dates:date-fns4.1+react-day-picker9.11
icons:lucide-react0.445
cmd:cmdk1.1
bff:hono4.6 (workers/api)
cron:cloudflare-scheduled (workers/cron)

## PROJECT_STRUCTURE
goldpen/
├ app/                      # Next.js App Router (40 pages)
│ ├ (auth)/                # 인증 (login, signup)
│ ├ (portal)/my/           # 포털 (dashboard)
│ ├ admin/(protected)/     # Admin (9 pages)
│ ├ [institutionname]/     # 기관별 (20 pages)
│ ├ api/                   # API Routes (96 routes)
│ ├ consultation/          # 상담 신청
│ ├ demo/                  # 데모 페이지 (NEW)
│ ├ invite/[token]/        # 초대 수락
│ └ lesson-note/           # 수업노트 공유
├ components/              # React (76 files)
│ ├ ui/                   # shadcn/ui (30 files)
│ ├ students/             # 학생 모달/탭 (11 files)
│ ├ teachers/             # 강사 모달/탭 (6 files)
│ ├ managers/             # 매니저 모달/탭 (4 files)
│ ├ livescreen/           # 라이브스크린 (9 files)
│ ├ dashboard/            # 대시보드 위젯 (4 files)
│ ├ admin/                # Admin (2 files)
│ ├ seats/                # 좌석 (1 file)
│ ├ charts/               # 차트 (2 files) NEW
│ ├ landing/              # 랜딩 (1 file)
│ └ shared/               # 공통 (4 files)
├ lib/                     # 유틸/설정 (34 files)
│ ├ supabase/             # DB 클라이언트 (4 files)
│ ├ types/                # 타입 정의 (4 files)
│ ├ validations/          # Zod 스키마 (5 files)
│ ├ utils/                # 유틸 (3 files)
│ ├ config/               # 설정 (2 files)
│ ├ constants/            # 상수 (2 files)
│ ├ hooks/                # 설정 hooks (6 files)
│ ├ swr/                  # SWR hooks (3 files)
│ ├ messaging/            # 카카오 알림톡 (1 file)
│ ├ email/                # 이메일 발송 (1 file)
│ └ data/                 # Mock 데이터 (1 file)
├ hooks/                   # Custom Hooks (9 files)
├ contexts/                # React Context (1 file)
├ workers/                 # Cloudflare Workers (55 files)
│ ├ api/                  # Hono API (51 files)
│ ├ cron/                 # 스케줄 알림 (1 file)
│ ├ queue/                # 큐 워커 (활성)
│ ├ shared/               # 공유 (비활성)
│ └ tail-logger/          # 로그 (비활성)
├ supabase/                # DB
│ └ migrations/           # SQL (89 files)
└ docs/                    # 문서
  └ kakao.md              # 카카오 가이드

## PAGES (40)
root:
├ / - 홈 (리다이렉트)
├ /login - 로그인
├ /signup - 회원가입
├ /consultation/new - 상담 신청 폼
├ /demo - 데모 페이지 (NEW)
├ /invite/[token] - 초대 수락
└ /lesson-note/[token] - 수업노트 공유

portal:
└ /my/dashboard - 포털 대시보드

admin:
├ /admin - Admin 홈
├ /admin/dashboard - Admin 대시보드
├ /admin/organizations - 기관 관리
├ /admin/organizations/[id] - 기관 상세
├ /admin/users - 사용자 관리
├ /admin/audit-logs - 감사 로그
├ /admin/kakao - 카카오 관리
├ /admin/plans - 요금제 관리
├ /admin/infrastructure - 인프라 현황 (NEW)
└ /admin/payments - 결제 관리 (NEW)

dashboard:
├ /[org] - 대시보드 (기본 리다이렉트) NEW
├ /[org]/overview - 대시보드 홈
├ /[org]/students - 학생 관리
├ /[org]/teachers - 강사 관리
├ /[org]/managers - 매니저 관리
├ /[org]/classes - 반 관리
├ /[org]/consultations - 상담 관리
├ /[org]/attendance - 출결 관리
├ /[org]/homework - 숙제 관리
├ /[org]/exams - 시험/성적
├ /[org]/lessons - 수업 기록
├ /[org]/rooms - 강의실 관리
├ /[org]/seats - 좌석 관리
├ /[org]/seatsattendance - 좌석 출결
├ /[org]/schedule - 시간표
├ /[org]/all-schedules - 전체 일정 (deprecated)
├ /[org]/expenses - 비용 관리
├ /[org]/billing - 정산/매출
├ /[org]/activity-logs - 활동 로그
└ /[org]/settings - 기관 설정 (11탭)

livescreen:
├ /[org]/livescreen/[seatNumber] - 학생 스크린
└ /[org]/liveattendance - 실시간 출결

## API_ROUTES (96)
auth:
├ /api/auth/login - POST 로그인
├ /api/auth/logout - POST 로그아웃
├ /api/auth/register - POST 회원가입
├ /api/auth/demo - POST 데모 로그인
└ /api/auth/me - GET 현재 사용자

students:
├ /api/students - GET/POST 목록/생성
├ /api/students/[id] - GET/PUT/DELETE 상세/수정/삭제
├ /api/students/[id]/modal - GET 모달 데이터 (7탭)
├ /api/students/[id]/files - GET/POST/DELETE 파일
└ /api/students/[id]/commute-schedules - GET/POST/PUT 통학일정

teachers:
├ /api/teachers - GET/POST 목록/생성
├ /api/teachers/[id] - GET/PUT/DELETE 상세
├ /api/teachers/[id]/modal - GET 모달 데이터 (4탭)
├ /api/teachers/[id]/salary - GET/PUT 급여
├ /api/teachers/[id]/lessons - GET 수업 목록
├ /api/teachers/[id]/assign-students - POST 학생 배정
└ /api/teachers/overview - GET 전체 개요

classes:
├ /api/classes - GET/POST 목록/생성
├ /api/classes/[id] - GET/PUT/DELETE 상세
└ /api/classes/[id]/assign-students - POST 학생 배정

consultations:
├ /api/consultations - GET/POST 목록/생성
└ /api/consultations/[id] - GET/PUT/DELETE 상세

waitlists:
├ /api/waitlists - GET/POST 대기자 목록
├ /api/waitlists/[id] - GET/PUT/DELETE 상세
└ /api/waitlists/[id]/consultations - POST 상담 전환

attendance:
├ /api/attendance - GET/POST 출결
├ /api/attendance/[id] - PUT/DELETE 수정
├ /api/attendance/logs - GET 출결 로그 (통학/수업 필터)
└ /api/attendance/reconcile - POST 정산

homework:
├ /api/homework - GET/POST 숙제
├ /api/homework/[id] - GET/PUT/DELETE 상세
└ /api/homework/submissions - GET/POST 제출

exams:
├ /api/exams - GET/POST 시험
├ /api/exams/[id] - GET/PUT/DELETE 상세
└ /api/exams/[id]/scores - GET/POST/PUT 점수

lessons:
├ /api/lessons - GET/POST 수업
└ /api/lessons/[id] - GET/PUT/DELETE 상세

rooms:
├ /api/rooms - GET/POST 강의실
└ /api/rooms/[id] - GET/PUT/DELETE 상세

schedules:
├ /api/schedules - GET/POST 시간표
└ /api/schedules/[id] - PUT/DELETE 수정

seats:
├ /api/seat-config - GET/PUT 좌석 설정
└ /api/seat-assignments - GET/POST/PUT 좌석 배정

livescreen:
├ /api/study-sessions - GET/POST 학습 세션
├ /api/study-time-rankings - GET 순위
├ /api/daily-planners - GET/POST 일일 계획
├ /api/daily-study-stats - GET 통계
├ /api/planner-feedback - GET/POST AI 피드백
├ /api/subjects - GET/POST/PUT 과목
├ /api/call-records - GET/POST 호출 기록 (NEW)
├ /api/manager-calls - GET/POST 매니저 호출 (NEW)
└ /api/sleep-records - GET/POST 수면 기록 (NEW)

billing:
├ /api/billing - GET/POST 정산
├ /api/billing/[id] - PUT/DELETE 수정
├ /api/expenses - GET/POST 지출
├ /api/expenses/[id] - PUT/DELETE 수정
├ /api/payments - GET/POST 결제
└ /api/payments/[id] - PUT/DELETE 수정

settings:
├ /api/settings - GET/PUT 설정
├ /api/settings/logo - POST 로고 업로드
├ /api/settings/invitations - GET/POST/DELETE 초대
├ /api/settings/invitations/accept - POST 초대 수락
├ /api/settings/invitations/resend - POST 초대 재전송
├ /api/settings/menu-settings - GET/PUT 메뉴 설정
├ /api/settings/page-permissions - GET/PUT 페이지 권한
├ /api/settings/user-accounts - GET/POST/PUT 사용자 계정
├ /api/settings/widget-settings - GET/PUT 위젯 설정
├ /api/settings/expense-categories - GET/POST/PUT/DELETE 지출 카테고리
├ /api/settings/revenue-categories - GET/POST/PUT/DELETE 수입 카테고리
├ /api/settings/billing-summary - GET 정산 요약 (NEW)
└ /api/class-enrollments - GET/POST 수강 등록

managers:
├ /api/managers - GET/POST 매니저 목록/생성
└ /api/managers/[id] - GET/PUT/DELETE 매니저 상세

storage:
└ /api/storage/upload - POST 파일 업로드 (NEW)

misc:
├ /api/overview - GET 대시보드 통계
├ /api/widgets - GET 위젯 데이터
├ /api/activity-logs - GET 활동 로그
├ /api/organizations/[slug] - GET 기관 정보
├ /api/me - GET 현재 사용자 정보 (NEW)
├ /api/test-env - GET 환경 테스트
└ /api/debug/env - GET 환경 디버그

admin:
├ /api/admin/organizations - GET/POST 기관
├ /api/admin/organizations/[id] - GET/PUT/DELETE 상세
├ /api/admin/organizations/[id]/credit - GET/PUT 크레딧 (NEW)
├ /api/admin/users - GET/POST 사용자
├ /api/admin/audit-logs - GET 감사 로그
├ /api/admin/kakao - GET/POST 카카오
├ /api/admin/plans - GET/POST 요금제
├ /api/admin/plans/[id] - PUT/DELETE 수정
├ /api/admin/infrastructure - GET 인프라 현황 (NEW)
├ /api/admin/message-pricing - GET/POST 메시지 요금 (NEW)
├ /api/admin/payments - GET 결제 내역 (NEW)
├ /api/admin/stats/overview - GET Admin 통계
├ /api/admin/stats/credits - GET 크레딧 통계 (NEW)
└ /api/admin/stats/messages - GET 메시지 통계 (NEW)

## DB_SCHEMA (89 migrations)
core:
├ organizations - 기관 (slug, logo, settings, credit_balance)
├ users - 사용자 (role: super_admin|admin|teacher|student|parent)
├ students - 학생 (attendance_code, grade, school, files[], credit)
├ teachers - 강사 (salary, schedule, assigned_students, payment_day, lesson_note_token)
├ classes - 반 (teacher_id, subject, capacity)
├ enrollments - 수강 (student↔class)
├ attendance - 출결 (date, status, unique constraint)
├ lessons - 수업 기록 (content, comprehension_level)
├ homework - 숙제 (due_date, status)
├ homework_submissions - 숙제 제출
├ exams - 시험 (exam_date, total_score, exam_time)
├ exam_scores - 시험 점수
├ consultations - 상담 (status, channel, waitlist_id)
├ waitlists - 대기자
├ rooms - 강의실
├ schedules - 시간표
├ expenses - 지출
├ billing - 정산
└ plans - 요금제

student_related:
├ service_enrollments - 서비스 소속 (academy|study_room|study_center)
├ attendance_schedules - 출결 스케줄
├ commute_schedules - 통학 일정
├ class_credits - 수업 크레딧
├ credit_transactions - 크레딧 내역
├ payments - 결제 내역
└ attendance_records - 상세 출결

livescreen:
├ study_sessions - 학습 세션
├ subjects - 과목
├ daily_planners - 일일 계획
├ daily_study_stats - 일일 통계
├ seat_config - 좌석 설정
├ seat_assignments - 좌석 배정
├ outing_records - 외출 기록
├ sleep_records - 수면 기록
├ call_records - 호출 기록
├ manager_calls - 매니저 호출
└ planner_feedback - AI 피드백

admin:
├ audit_logs - 감사 로그
├ system_settings - 시스템 설정 (org_id|null)
├ menu_settings - 메뉴 설정
├ kakaotalk_usage - 카카오 사용량
├ service_usage - 서비스 사용량
├ activity_logs - 활동 로그
├ notification_logs - 알림 로그
├ message_pricing - 메시지 요금 (NEW)
├ message_logs - 메시지 로그 (NEW)
├ invitations - 초대 (NEW)
└ performance_indexes - 성능 인덱스 (NEW)

rls:ALL_TABLES_ENABLED
├ policy:org_isolation (org_id 기반)
├ policy:role_based (user.role 기반)
└ policy:row_owner (user_id 기반)

## COMPONENTS (76)
ui/ (30 files, shadcn/ui):
├ button, input, card, table, badge, avatar
├ tabs, dropdown-menu, label, textarea
├ checkbox, radio-group, switch, alert
├ separator, scroll-area, form, popover
├ calendar, command, progress, sheet
├ dialog, select, toast, toaster
├ skeleton, alert-dialog, data-table
└ ...

students/ (11 files):
├ StudentDetailModal - 7탭 모달
│ ├ BasicInfoTab - 기본정보
│ ├ StudyRoomTab - 독서실
│ ├ AttendanceScheduleTab - 출결 스케줄
│ ├ ClassCreditsTab - 수업 크레딧
│ ├ PaymentTab - 결제
│ ├ PaymentHistoryTab - 결제 내역
│ ├ AttendanceHistoryTab - 출결 내역
│ └ HistoryTab - 히스토리
├ StudentFilesTab - 파일
└ PaymentModal - 결제 모달

teachers/ (6 files):
├ TeacherDetailModal - 4탭 모달
│ ├ BasicInfoTab - 기본정보
│ ├ SalaryTab - 급여
│ ├ ScheduleTab - 스케줄
│ └ AssignedStudentsTab - 배정 학생
└ ClassHistoryTab - 수업 이력

managers/ (4 files):
├ ManagerDetailModal - 매니저 상세 모달
│ ├ BasicInfoTab - 기본정보
│ ├ SalaryTab - 급여
│ └ ActivityTab - 활동

livescreen/ (9 files):
├ SubjectTimer - 과목별 타이머
├ StudyTimer - 학습 타이머
├ DailyPlannerPage - 일일 계획
├ DailyPlannerModal - 계획 모달
├ StudyStatistics - 학습 통계
├ StudyTimeRanking - 순위
├ OutingModal - 외출 모달
├ OutingScreen - 외출 화면
└ SleepTimer - 수면 타이머

dashboard/ (4 files):
├ WidgetRenderer - 위젯 렌더링
├ DraggableWidget - 드래그
├ WidgetWrapper - 래퍼
└ WidgetManager - 관리

shared/ (4 files):
├ Header - 헤더
├ Sidebar - 사이드바
├ MobileSidebar - 모바일 사이드바
└ Breadcrumb - 브레드크럼

seats/ (1 file):
└ StudentPlannerModal - 학생 계획 모달

charts/ (2 files) NEW:
├ ExamsCharts - 시험 차트
└ LessonsCharts - 수업 차트

landing/ (1 file):
└ FeatureShowcase - 랜딩 기능 전시

other:
├ page-permissions.tsx - 페이지 권한
└ GoogleAnalytics.tsx - GA 추적 (NEW)

## HOOKS (9)
├ use-toast - 토스트 알림
├ use-theme - 테마
├ use-page-access - 페이지 접근 권한
├ use-student-modal-data - 학생 모달 데이터
├ use-teacher-modal-data - 강사 모달 데이터
├ use-seat-assignments-realtime - 좌석 실시간
├ use-all-seats-realtime - 전체 좌석
├ use-seat-realtime-status - 좌석 상태
└ use-livescreen-state - 라이브스크린 상태

## LIB (34)
supabase/:
├ client.ts - 브라우저 클라이언트
├ server.ts - 서버 클라이언트
├ client-edge.ts - Edge Runtime 클라이언트
└ debug-env.ts - 환경 디버그

types/:
├ database.ts - DB 타입 (798줄, 50+ 인터페이스)
├ widget.ts - 위젯 타입
├ widget-data.ts - 위젯 데이터 타입
└ permissions.ts - 권한 타입

validations/:
├ auth.ts - 인증 스키마
├ attendance.ts - 출결 스키마
├ class.ts - 반 스키마
├ consultation.ts - 상담 스키마
└ student.ts - 학생 스키마

utils/:
├ utils.ts - 공통 유틸 (cn)
├ activity-logger.ts - 활동 로그
└ generate-attendance-code.ts - 출결 코드

config/:
├ widgets.ts - 위젯 설정
└ navigation.ts - 네비게이션 설정

constants/:
├ branding.ts - 브랜딩 상수
└ grades.ts - 학년 상수

hooks/:
├ useExpenseCategories.ts - 지출 카테고리
├ useRevenueCategories.ts - 수입 카테고리
├ useMenuSettings.ts - 메뉴 설정
├ usePagePermissions.ts - 페이지 권한
├ useUserAccounts.ts - 사용자 계정
└ useWidgetSettings.ts - 위젯 설정

swr/:
├ fetcher.ts - SWR fetcher
├ hooks.ts - SWR hooks
└ index.ts - export

messaging/:
└ kakao-alimtalk.ts - 카카오 알림톡 연동

email/:
└ send-invitation.ts - 초대 이메일 발송

## WORKERS (57 files)
api/ (workers/api):
├ src/index.ts - Hono 메인 (라우터 등록)
├ src/env.ts - 환경변수 타입
├ src/lib/
│ ├ db.ts - Hyperdrive DB 연결
│ ├ supabase.ts - Supabase 클라이언트
│ └ notifications.ts - 알림 발송
├ src/middleware/
│ ├ auth.ts - 인증
│ ├ cors.ts - CORS
│ └ logger.ts - 로깅
├ src/routes/ (45 files)
│ ├ auth.*.ts - 인증 라우트
│ ├ students.*.ts - 학생 라우트
│ ├ teachers.*.ts - 강사 라우트
│ ├ classes.*.ts - 반 라우트
│ ├ attendance*.ts - 출결 라우트
│ ├ exams*.ts - 시험 라우트
│ ├ ai.generate.ts - AI 생성
│ └ ...
└ wrangler.toml
  ├ hyperdrive:HYPERDRIVE_DB
  ├ ai:AI (Qwen3 30B)
  ├ port:8787
  └ route:api.goldpen.kr/*

cron/ (workers/cron):
├ src/index.ts - 스케줄 알림 (매 1분, 329줄)
│ ├ 자동 출결 처리 (class/commute 스케줄)
│ ├ 지각/결석 알림 (5분 유예)
│ ├ 학습 리포트 (21:00)
│ └ 과제 알림 (09:00)
└ wrangler.toml
  ├ cron:* * * * * (매 1분)
  └ hyperdrive:HYPERDRIVE_DB

queue/ (workers/queue):
├ src/index.ts - 큐 처리 워커 (974줄)
│ ├ 출결 알림 큐 처리
│ ├ 카카오 알림톡 발송
│ ├ 이메일 발송
│ └ 비동기 작업 처리
├ package.json
└ wrangler.toml
  ├ queue:goldpen-notification-queue
  └ hyperdrive:HYPERDRIVE_DB

## STATE_MANAGEMENT
global:
├ contexts/auth-context.tsx
│ ├ {user, org, session, loading, signOut}
│ ├ clearExpiredSession() - 만료 세션 사전 정리
│ └ refreshSession() - 세션 갱신 (improved)
└ zustand (필요시)

server:
├ tanstack-query (캐싱)
└ swr (데이터 페칭)

realtime:
└ supabase.channel().on('postgres_changes')

## REALTIME
enabled:seat_assignments, sleep_records, call_records
pattern:
1. useEffect → supabase.channel()
2. postgres_changes listener
3. auto-refresh on INSERT/UPDATE/DELETE

example:
├ channel:seat-assignments-{org_id}-{date}
├ event:INSERT|UPDATE|DELETE
└ sync:local-state

## BUILD_COMMANDS
dev:pnpm dev --turbo -p 8000
build:pnpm build
pages-build:pnpm pages:build
├ tool:@cloudflare/next-on-pages
├ output:.vercel/output/static
└ skip-vercel:true

deploy:pnpm deploy
├ run:pages:build + wrangler pages deploy
└ project:goldpen

api-dev:pnpm api:dev (port:8787)
api-deploy:pnpm api:deploy
deploy-all:pnpm deploy:all
└ run:api:deploy + deploy

test:pnpm test (vitest)
e2e:pnpm playwright test
├ tests/e2e/seou-advanced.spec.ts - 고급 기능 테스트
├ tests/e2e/seou-crud.spec.ts - CRUD 테스트
├ tests/e2e/seou-extra-pages.spec.ts - 추가 페이지 테스트
└ helpers.ts - 테스트 헬퍼 함수
type-check:pnpm type-check (tsc --noEmit)
lint:pnpm lint (next lint)

## DEPLOY
frontend (Cloudflare Pages):
├ build:@cloudflare/next-on-pages
├ output:.vercel/output/static
├ project:goldpen
├ domain:goldpen.kr
└ cmd:wrangler pages deploy .vercel/output/static --project-name=goldpen

api (Cloudflare Workers):
├ worker:goldpen-api
├ framework:hono
├ port:8787
├ domain:api.goldpen.kr
└ cmd:cd workers/api && wrangler deploy

cron (Cloudflare Workers):
├ worker:goldpen-attendance-cron
├ trigger:cron (* * * * *)
└ cmd:cd workers/cron && wrangler deploy

supabase:
├ project:vdxxzygqjjjptzlvgrtw
├ url:https://vdxxzygqjjjptzlvgrtw.supabase.co
├ region:ap-northeast-1
└ pooler:port 6543

hyperdrive:
├ id:8c1cfe4c456d460da34153acc8e0eb2c
└ binding:HYPERDRIVE_DB

## ENV_VARS
public (안전):
├ NEXT_PUBLIC_SUPABASE_URL
├ NEXT_PUBLIC_SUPABASE_ANON_KEY
└ NEXT_PUBLIC_APP_URL

secrets (민감):
├ SUPABASE_SERVICE_ROLE_KEY
├ DATABASE_URL
├ OPENAI_API_KEY
├ KAKAO_ALIMTALK_API_KEY
├ KAKAO_ALIMTALK_SECRET_KEY
└ KAKAO_ALIMTALK_SENDER_KEY

bindings:
├ HYPERDRIVE_DB
└ AI (Workers AI)

## CRITICAL_FILES
├ lib/supabase/client.ts - 브라우저 DB
├ lib/supabase/server.ts - 서버 DB
├ lib/supabase/client-edge.ts - Edge DB
├ lib/types/database.ts - 타입 정의 (핵심)
├ contexts/auth-context.tsx - 인증 컨텍스트
├ middleware.ts - 라우트 보호
├ wrangler.toml - Pages 설정
├ workers/api/wrangler.toml - API 설정
├ workers/cron/wrangler.toml - Cron 설정
└ next.config.js - Next.js 설정

## SECURITY
├ rls:ENABLED (all tables)
├ auth:supabase-auth (jwt)
├ cors:workers check origin
├ xss:zod-validation
├ sql:parameterized queries
├ secrets:env only
├ file:supabase-storage+rls
└ org:org_id isolation

## FLOW
1.auth:
├ /login → api/auth/login
├ supabase.auth.signInWithPassword
├ set session cookie
├ redirect → /[org]/overview
└ RLS activated

2.student_modal:
├ click student row
├ GET /api/students/[id]/modal
├ load 7 tabs data
├ edit → PUT /api/students/[id]
└ invalidate cache

3.realtime_seats:
├ /liveattendance page
├ GET /api/seat-assignments
├ supabase.channel subscribe
├ postgres_changes listener
└ auto-refresh UI

4.cron_notification:
├ workers/cron trigger (매 1분)
├ check attendance_schedules
├ compare current_time
├ send kakao notification
└ log to notification_logs

## DOCS
core:
├ PROJECT.md - 이 파일 (시스템 맵)
├ CLAUDE.md (23KB) - 개발 규칙
├ README.md (3KB) - 프로젝트 개요
├ TASKS.md (8KB) - 작업 로그
├ cffaults.md (16KB) - CF 오류 해결
├ datafaults.md (17KB) - 데이터 오류
├ KNOWHOW.md (49KB) - 개발 노하우
└ TODO_ORG_GUARD.md (6KB) - org_id 보호

docs/:
└ kakao.md - 카카오 알림톡 가이드

usage:
├ 세션시작:[TASKS.md→CLAUDE.md→PROJECT.md]
├ 기능개발:[CLAUDE.md→PROJECT.md→code]
├ 배포:[PROJECT.md→deploy commands]
├ DB작업:[lib/types/database.ts→migrations]
└ 이슈:[cffaults.md→datafaults.md→KNOWHOW.md]

## VERSION
next:14.2.0
react:18.3.0
typescript:5.6.0
supabase-js:2.45.0
supabase-ssr:0.5.0
zod:3.25.76
tanstack-query:5.56.0
tanstack-table:8.21.3
hono:4.6.0
tailwind:3.4.0
radix-ui:latest
lucide-react:0.445.0
next-on-pages:1.13.16
date-fns:4.1.0
react-day-picker:9.11.1
recharts:2.12.0
swr:2.3.6
cmdk:1.1.1
dnd-kit/core:6.3.1
dnd-kit/sortable:10.0.0
zustand:4.5.0
wrangler:4.47.0
vitest:2.1.0

## STATISTICS
pages:40
api_routes:96
components:76
lib_files:34
hooks:9
workers_files:55
migrations:89
total_ts_files:~343

## ROADMAP
v1.0 (current):
├ ✅ Multi-tenant SaaS
├ ✅ Student/Teacher/Class CRUD
├ ✅ Attendance/Homework/Exams
├ ✅ Realtime seats
├ ✅ Admin dashboard
├ ✅ Audit logs
├ ✅ Activity logs
├ ✅ Cron notifications
├ ✅ Credit system
└ ✅ Message pricing

v1.1 (planned):
├ [ ] AI reports (GPT-4)
├ [ ] Kakao 알림톡 실제 발송
├ [ ] Google Calendar sync
├ [ ] Mobile app
├ [ ] Parent portal
└ [ ] Payment gateway

---
# END OF GOLDPEN_SYS_MAP v3.7
# Generated: 2025-11-29 | Updated: 2025-12-06 (full sync v4)
#
# Changes (2025-12-06 v4):
#   - Workers: 57 → 55 (-2)
#     - 실제 파일 수 재검증 (src/ 디렉토리만 카운트)
#   - Middleware 수정:
#     - 로그인된 사용자가 /login, /demo 접근 시 대시보드로 리다이렉트
#   - Attendance sync 수정:
#     - "이미 등원/하원 상태" 응답에서도 seat_assignments 동기화 추가
#
# Changes (2025-12-06 v3):
#   - API Routes: 97 → 96 (-1)
#     - /api/seats, /api/seats/[id] 라우트 실제로 존재하지 않음 (문서 오류 수정)
#   - Components: 75 → 76 (+1)
#     - GoogleAnalytics.tsx 추가 (NEW)
#   - Workers: 59 → 57 (-2)
#     - 실제 파일 수 반영 (카운트 오류 수정)
#
# Changes (2025-12-05 v2):
#   - Pages: 39 → 40 (+1)
#     - /[org] 대시보드 기본 리다이렉트 페이지 누락 발견 및 추가
#   - Components: 74 → 75 (+1)
#     - charts/ 폴더 추가 (ExamsCharts, LessonsCharts)
#     - ui: 32 → 30 (실제 카운트 수정)
#     - seats: 2 → 1 (SeatAssignment 없음)
#   - Migrations: 88 → 89 (+1)
#     - 20251205_performance_indexes.sql 추가
#
# Changes (2025-12-05 v1):
#   - API: 85 → 97 (+12 routes)
#     - /api/admin/infrastructure, message-pricing, payments
#     - /api/admin/organizations/[id]/credit
#     - /api/admin/stats/credits, messages
#     - /api/call-records, manager-calls, sleep-records
#     - /api/me, /api/storage/upload
#     - /api/settings/billing-summary
#   - Pages: 37 → 39 (+2)
#     - /demo, /admin/infrastructure, /admin/payments
#   - Components: 72 → 74 (+2)
#   - Workers: 53 → 59 (+6)
#   - Migrations: 82 → 88 (+6)
#
# Changes (2025-12-03):
#   - Workers: queue worker 추가 (974줄, 비동기 알림 처리)
#   - Auth: clearExpiredSession() 함수 추가
#   - Tests: E2E 테스트 3개 추가 (Playwright)
#   - Cron: 리팩토링 완료 (1211줄 → 329줄)
#
# Analysis method: Full codebase comparison (find/ls)
# Next update: /gen-context command
