# PROJECT.md - GoldPen 시스템 맵

> 학원/러닝센터/스터디카페 통합 운영 시스템
> 최종 업데이트: 2025-11-21

---

## 기술 스택

```
Frontend: Next.js 14.2 + React 18 + TypeScript 5.6
Styling: Tailwind CSS 3.4 + shadcn/ui (Radix UI)
State: Zustand 4.5 + TanStack Query 5.56
Forms: React Hook Form 7 + Zod 3.25
DB: Supabase (PostgreSQL + Auth + Storage + Realtime)
Deploy: Cloudflare Pages (@cloudflare/next-on-pages)
Testing: Vitest + Playwright
```

---

## 프로젝트 구조

```
goldpen/
├── app/
│   ├── (auth)/                     # 인증 라우트
│   │   ├── login/                  # 로그인
│   │   └── register/               # 회원가입
│   ├── [institutionname]/          # 동적 기관 라우트
│   │   └── (dashboard)/            # 대시보드 그룹
│   │       ├── students/           # 학생 관리
│   │       ├── classes/            # 반 관리
│   │       ├── teachers/           # 강사 관리
│   │       ├── consultations/      # 상담 관리
│   │       ├── attendance/         # 출결 관리
│   │       ├── homework/           # 숙제 관리
│   │       ├── exams/              # 시험/성적
│   │       ├── lessons/            # 수업 기록
│   │       ├── rooms/              # 강의실 관리
│   │       ├── seats/              # 좌석 관리
│   │       ├── schedule/           # 시간표
│   │       ├── expenses/           # 비용 관리
│   │       ├── billing/            # 정산/매출
│   │       ├── settings/           # 설정
│   │       └── overview/           # 대시보드 홈
│   ├── admin/                      # 기관 관리자
│   ├── superadmin/                 # 슈퍼 관리자
│   └── api/                        # API Routes (BFF)
│       ├── students/               # 학생 CRUD
│       ├── classes/                # 반 CRUD
│       ├── teachers/               # 강사 CRUD
│       ├── consultations/          # 상담 CRUD
│       ├── attendance/             # 출결 CRUD
│       ├── homework/               # 숙제 CRUD
│       ├── exams/                  # 시험 CRUD
│       ├── lessons/                # 수업 CRUD
│       ├── rooms/                  # 강의실 CRUD
│       ├── seats/                  # 좌석 CRUD
│       ├── schedules/              # 시간표 CRUD
│       ├── expenses/               # 비용 CRUD
│       ├── billing/                # 정산 CRUD
│       ├── settings/               # 설정 CRUD
│       ├── overview/               # 대시보드 통계
│       └── auth/                   # 인증 API
├── components/
│   ├── ui/                         # shadcn/ui 컴포넌트
│   ├── dashboard/                  # 대시보드 위젯
│   ├── forms/                      # 폼 컴포넌트
│   ├── admin/                      # 관리자 컴포넌트
│   └── superadmin/                 # 슈퍼관리자 컴포넌트
├── lib/
│   ├── supabase/                   # Supabase 클라이언트
│   │   ├── client.ts               # 브라우저 클라이언트
│   │   ├── server.ts               # 서버 클라이언트
│   │   └── client-edge.ts          # Edge 클라이언트
│   ├── api/                        # API 유틸
│   ├── hooks/                      # Custom Hooks
│   ├── utils/                      # 유틸리티
│   └── validations/                # Zod 스키마
├── contexts/                       # React Context
│   └── auth-context.tsx            # 인증 컨텍스트
├── supabase/
│   └── migrations/                 # DB 마이그레이션
└── types/                          # TypeScript 타입
```

---

## 핵심 API 패턴 (BFF)

```
Page → API Route → Supabase
     (BFF)        (DB+RLS)
```

### API 라우트 패턴
```typescript
// app/api/[resource]/route.ts
export const runtime = 'edge'  // 필수

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('table').select('*')
  return NextResponse.json({ data })
}
```

---

## 주요 테이블

| 테이블 | 설명 |
|--------|------|
| organizations | 기관 (멀티테넌트) |
| users | 사용자 (role: super_admin, admin, teacher, student, parent) |
| students | 학생 |
| teachers | 강사 |
| classes | 반 |
| enrollments | 수강 등록 |
| attendance | 출결 |
| lessons | 수업 기록 |
| homework | 숙제 |
| exams | 시험 |
| exam_scores | 시험 점수 |
| rooms | 강의실 |
| seats | 좌석 |
| schedules | 시간표 |
| consultations | 상담 |
| expenses | 비용 |
| billing | 정산 |
| audit_logs | 감사 로그 |

---

## 인증/권한

```
super_admin → 전체 시스템 관리
admin → 기관 관리
teacher → 담당 반/학생 관리
student → 본인 데이터 조회
parent → 자녀 데이터 조회
```

### RLS 정책
- 모든 테이블에 `org_id` 필수
- Row Level Security로 멀티테넌트 격리

---

## 개발 명령어

```bash
pnpm dev              # 개발 서버 (포트 8000)
pnpm build            # Next.js 빌드
pnpm pages:build      # Cloudflare Pages 빌드
pnpm deploy           # Cloudflare 배포
pnpm test             # Vitest 테스트
pnpm test:e2e         # Playwright E2E
pnpm type-check       # TypeScript 검사
```

---

## 마이그레이션 상태 (2025-11-21)

### 완료된 마이그레이션
- [x] 14개 대시보드 페이지 Mock → Supabase
  - students, classes, teachers, consultations
  - homework, attendance, exams, lessons
  - rooms, expenses, seats, schedule
  - overview, settings, billing

### 잔여 Mock 데이터
- [ ] all-schedules (v1/v2/v3) - 별도 페이지

---

## 주요 문서

- `PRD.md` - 제품 요구사항
- `ARCHITECTURE.md` - 시스템 아키텍처
- `CLAUDE.md` - 개발 규칙
- `TASKS.md` - 작업 로그
