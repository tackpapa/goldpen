# CLAUDE.md - GoldPen 프로젝트 규칙

> **학원/러닝센터/스터디카페 통합 운영 시스템**
> Next.js 15 + Cloudflare Workers + Supabase

---

## 🔄 세션 시작 시 필수 작업

**CRITICAL**: 세션 시작 또는 Auto Compact 후 반드시 실행!

```bash
# 1. 작업 컨텍스트 복원
Read: TASKS.md (최근 200줄)

# 2. 프로젝트 규칙 확인
Read: CLAUDE.md
```

## 🈺 언어 규칙 (프로젝트)
- 이 프로젝트와 관련된 모든 응답, 설명, 내부 생각(thinking)도 **항상 한국어**로 작성한다. 필요 시 영문 기술 용어는 괄호로 보충만 한다.

---

## 📌 프로젝트 개요

**프로젝트명**: GoldPen
**목적**: 사교육 기관의 상담-등록-수업-출결-성적-정산 전체 워크플로우 자동화
**타겟**: 학원, 러닝센터, 스터디카페, 공부방

**핵심 가치**:
- 📋 반복 업무 자동화 (상담 알림, 출결 체크, 리포트 생성)
- 📊 데이터 기반 운영 (출결/성적/매출 통합 대시보드)
- 🤖 AI 기반 피드백 (GPT 자동 리포트 생성)

---

## 🔐 보안 규칙 (최우선 - 절대 위반 금지!)

**🚨 CRITICAL: Supabase 키, DB 비밀번호, API 토큰을 절대 파일에 하드코딩하지 마세요!**

### ❌ 절대 금지 - 스크립트 파일에 키 하드코딩

```javascript
// ❌ 절대 금지! - scripts/ 폴더에 이런 파일 생성 금지
// scripts/run-migration.mjs
const supabaseUrl = 'https://ipqhhqduppzvsqwwzjkp.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // ❌
const dbPassword = 'rhfemvps123'  // ❌

// 이 파일이 Git에 커밋되면 GitHub에 영구 노출!
```

**실제 발생한 사고**:
- `scripts/check-enrollments.mjs`와 `scripts/run-migration.mjs`에 키 하드코딩
- GitHub에 푸시되어 키 노출
- 즉시 파일 삭제했지만 Git history에 남음

### ✅ 올바른 방법 - GoldPen 프로젝트

#### 1. Supabase 클라이언트 사용 (환경 변수)

```typescript
// ✅ 올바름 - 환경 변수 사용
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // .env.local에서 읽기
)
```

#### 2. Prisma를 사용한 직접 SQL 실행 (권장)

```bash
# ✅ 올바름 - Prisma ORM을 통한 직접 실행 (파일 생성 없음)
node --eval "
import('@prisma/client').then(({ PrismaClient }) => {
  const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
  });

  // SELECT 쿼리
  prisma.\$queryRaw\`SELECT * FROM students LIMIT 5\`.then(result => {
    console.log(JSON.stringify(result, null, 2));
    prisma.\$disconnect();
  });
});
"
```

**연결 문자열 구조**:
```
postgresql://     [프로토콜]
postgres.ipqhhqduppzvsqwwzjkp  [사용자명]
:rhfemvps123      [비밀번호]
@aws-1-ap-northeast-1.pooler.supabase.com  [호스트]
:6543             [포트 - Pooler]
/postgres         [데이터베이스명]
?pgbouncer=true   [옵션 - Connection Pooling]
```

**장점**:
- 파일이 생성되지 않음 → Git 커밋 불가
- 일회성 실행 후 사라짐
- 터미널 히스토리에만 남음 (GitHub 노출 안 됨)
- Type-safe (TypeScript 타입 안전)
- SQL Injection 방지

#### 3. 테이블 생성/마이그레이션 실행

```bash
# ✅ 올바름 - Prisma $executeRaw로 DDL 실행
node --eval "
import('@prisma/client').then(({ PrismaClient }) => {
  const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
  });

  // 테이블 생성
  prisma.\$executeRaw\`
    CREATE TABLE IF NOT EXISTS example (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  \`.then(() => {
    console.log('✅ 테이블 생성 완료');
    prisma.\$disconnect();
  }).catch(err => {
    console.error('Error:', err.message);
    prisma.\$disconnect();
  });
});
"
```

**중요**: SQL 파일 자체에는 키 없음, 연결 문자열만 --eval로 전달

### 🔍 사전 체크리스트 (GoldPen 전용)

**스크립트 작성 전 반드시 확인**:
```
[ ] scripts/ 폴더에 .mjs/.js 파일 생성하는가?
    → YES: 키 절대 하드코딩 금지! (환경 변수 또는 --eval 사용)
    → NO: 진행

[ ] Supabase Service Role Key 또는 DB 비밀번호가 필요한가?
    → YES: node --eval로 직접 실행 (파일 생성 금지)
    → NO: 파일 생성 허용

[ ] 이 파일이 .gitignore에 포함되어 있는가?
    → NO: 절대 키 넣지 말 것!
    → YES: 그래도 키 넣지 말 것! (실수로 커밋 가능)
```

### 📝 .env.local 관리

**안전한 키 (.env.local에 저장 가능)**:
```bash
# ✅ 공개 가능 (RLS로 보호됨)
NEXT_PUBLIC_SUPABASE_URL=https://ipqhhqduppzvsqwwzjkp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Anon Key는 안전

# ⚠️ 민감 정보 (.env.local만 저장, Git 커밋 금지)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Service Role은 절대 노출 금지!
DATABASE_URL=postgresql://...  # 비밀번호 포함되어 있음
```

**중요**: `.env.local`은 `.gitignore`에 포함되어 있지만, **절대 Git에 커밋하지 마세요!**

### ⚠️ 이미 키가 노출된 경우 (긴급 조치)

**즉시 실행**:
```bash
# 1. 노출된 파일 삭제
rm scripts/check-enrollments.mjs scripts/run-migration.mjs

# 2. Git history에서 완전 제거 (BFG 사용)
brew install bfg
bfg --delete-files 'check-enrollments.mjs' --delete-files 'run-migration.mjs'
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 3. Force push (위험하지만 필수)
git push origin main --force
```

**Supabase 대시보드 조치**:
1. https://supabase.com/dashboard/project/ipqhhqduppzvsqwwzjkp/settings/api
2. "Reset service_role secret" 클릭
3. 새 키를 `.env.local`에 업데이트

### 🎯 실전 예시 (이 프로젝트에서 사용)

**✅ 성공 사례 - 테이블 생성 및 데이터 삽입**:
```bash
# message_pricing 테이블 생성 예시
node --eval "
import('@prisma/client').then(({ PrismaClient }) => {
  const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
  });

  // 테이블 생성
  prisma.\$executeRaw\`
    CREATE TABLE IF NOT EXISTS message_pricing (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_type VARCHAR(50) NOT NULL UNIQUE,
      price INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  \`.then(() => {
    console.log('✅ 테이블 생성 완료');

    // 데이터 삽입
    return prisma.\$executeRaw\`
      INSERT INTO message_pricing (message_type, price, description) VALUES
        ('sms', 20, 'SMS 단문 문자'),
        ('kakao_alimtalk', 9, '카카오 알림톡')
      ON CONFLICT (message_type) DO NOTHING
    \`;
  }).then(() => {
    console.log('✅ 데이터 삽입 완료');
    prisma.\$disconnect();
  });
});
"
```

**파일 생성 없음** → Git 커밋 불가 → 안전!

---

## 🚨 필수 준수 사항: Cloudflare 스택 사용

### ⚡ Edge Runtime 필수 사용 규칙

**🔴 절대 원칙**: 모든 API 라우트와 서버 로직은 **Edge Runtime**을 사용해야 합니다.

```typescript
// ✅ 올바른 예시 - 모든 API 라우트에 필수
export const runtime = 'edge'

export async function GET(request: Request) {
  // Edge Runtime에서 실행
}
```

```typescript
// ❌ 잘못된 예시 - Node.js Runtime 사용 금지
// export const runtime = 'nodejs'  // 절대 사용 금지!
```

### 🎯 Cloudflare 스택 전용 개발 지침

1. **모든 API는 Cloudflare Workers로 배포**
   - Next.js API Routes 대신 **Hono + Workers** 사용
   - `workers/api/` 디렉토리에 API 구현
   - Edge Runtime 필수 (`export const runtime = 'edge'`)

2. **Cloudflare Pages로 프론트엔드 배포**
   - `@cloudflare/next-on-pages` 빌드 도구 사용
   - `npm run pages:build` → `wrangler pages deploy`
   - Image Optimization 비활성화 유지 (`unoptimized: true`)

3. **Node.js 전용 API 사용 금지**
   - `fs`, `path`, `crypto` (Node.js 내장 모듈) → Cloudflare 호환 대안 사용
   - 예: `crypto` → Web Crypto API 사용

4. **환경 변수는 Cloudflare Pages/Workers 설정 사용**
   ```bash
   # Cloudflare Pages 환경 변수 설정
   wrangler pages secret put SECRET_NAME

   # wrangler.toml에 공개 변수만
   [vars]
   NEXT_PUBLIC_APP_URL = "https://goldpen.kr"
   ```

5. **데이터베이스 연결**
   - Supabase (Edge 호환) ✅
   - Cloudflare D1 (Workers 전용) ✅
   - Cloudflare KV (키-값 저장소) ✅
   - PostgreSQL 직접 연결 (Node.js 필요) ❌

---

## 🏗️ 기술 스택

### Frontend
```yaml
Framework: Next.js 14.2 (App Router)
Language: TypeScript 5.x
Styling: Tailwind CSS 4.x
UI Components: shadcn/ui
State Management: React Context + Zustand (필요시)
Forms: React Hook Form + Zod
Deployment: Cloudflare Pages (필수)
Build Tool: @cloudflare/next-on-pages (필수)
```

### Backend/API
```yaml
Platform: Cloudflare Workers (필수)
Framework: Hono (경량 웹 프레임워크)
Runtime: Edge Runtime (필수)
API Style: REST + tRPC (타입 안전성)
Cron Jobs: Cloudflare Scheduled Workers
Queue: Cloudflare Queues (비동기 작업)
KV Store: Cloudflare KV (세션/캐시)
Database: Cloudflare D1 or Supabase (Edge 호환)
```

### Database & Auth
```yaml
Database: Supabase PostgreSQL
Auth: Supabase Auth (이메일/소셜 로그인 + RBAC)
Storage: Supabase Storage (파일 업로드)
Realtime: Supabase Realtime (대시보드 실시간 업데이트)
```

### External APIs
```yaml
AI: OpenAI API (GPT-4o)
Calendar: Google Calendar API
Messaging:
  - KakaoTalk Biz API (알림톡)
  - SMS Gateway
  - SendGrid (Email)
```

---

## 📁 프로젝트 구조

```
goldpen/
├── app/                      # Next.js App Router
│   ├── (auth)/              # 인증 관련 라우트 그룹
│   ├── (dashboard)/         # 대시보드 (운영자/강사)
│   ├── (portal)/            # 포털 (학생/학부모)
│   ├── api/                 # API 라우트 (BFF)
│   └── layout.tsx
├── components/              # React 컴포넌트
│   ├── ui/                 # shadcn/ui 컴포넌트
│   ├── forms/              # 폼 컴포넌트
│   ├── dashboard/          # 대시보드 위젯
│   └── shared/             # 공통 컴포넌트
├── lib/                     # 유틸리티 & 핵심 로직
│   ├── supabase/           # Supabase 클라이언트 & 헬퍼
│   ├── api/                # API 클라이언트
│   ├── hooks/              # Custom React Hooks
│   ├── utils/              # 유틸리티 함수
│   └── validations/        # Zod 스키마
├── workers/                 # Cloudflare Workers
│   ├── api/                # API Workers
│   ├── cron/               # Scheduled Workers
│   └── queue/              # Queue Workers
├── supabase/               # Supabase 설정
│   ├── migrations/         # DB 마이그레이션
│   ├── functions/          # Edge Functions
│   └── seed.sql            # 초기 데이터
├── docs/                    # 프로젝트 문서
│   ├── pdca/               # PDCA 사이클 문서
│   ├── patterns/           # 성공 패턴
│   ├── mistakes/           # 실패 기록
│   └── api/                # API 문서
├── .claude/                # Claude 설정
│   ├── mcp.json           # MCP 서버 설정
│   └── agents/            # Custom Agents
├── PRD.md                  # Product Requirements Document
├── ARCHITECTURE.md         # 시스템 아키텍처
├── CLAUDE.md              # 이 파일
└── TASKS.md               # 작업 로그
```

---

## 🎯 개발 원칙

### 1. 타입 안전성 우선
```typescript
// ✅ 모든 데이터는 Zod로 검증
import { z } from 'zod'

const StudentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  grade: z.number().int().min(1).max(12)
})

type Student = z.infer<typeof StudentSchema>
```

### 2. 멀티테넌트 아키텍처
```typescript
// ✅ 모든 쿼리에 org_id 포함 (RLS로 강제)
const students = await supabase
  .from('students')
  .select('*')
  .eq('org_id', orgId) // 필수!
```

### 3. 에러 처리 표준화
```typescript
// ✅ Result 타입 패턴 사용
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

async function getStudent(id: string): Promise<Result<Student>> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return { success: false, error }
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}
```

### 4. 환경 변수 검증
```typescript
// ✅ 서버 시작 시 환경 변수 검증
import { z } from 'zod'

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  // ... 모든 필수 환경 변수
})

// 앱 시작 시 검증
EnvSchema.parse(process.env)
```

---

## 🔐 보안 규칙

### Supabase RLS (Row Level Security)
```sql
-- ✅ 모든 테이블에 RLS 활성화
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- ✅ 정책 예시: 학생은 자신의 데이터만 조회
CREATE POLICY "Students can view own data"
  ON students FOR SELECT
  USING (auth.uid() = user_id);

-- ✅ 정책 예시: 강사는 담당 반 학생만 조회
CREATE POLICY "Teachers can view assigned students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN classes c ON e.class_id = c.id
      WHERE e.student_id = students.id
        AND c.teacher_id = auth.uid()
    )
  );
```

### API 인증
```typescript
// ✅ 모든 API는 인증 필수
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ... 로직
}
```

---

## 📝 코딩 컨벤션

### 파일 명명 규칙
```
컴포넌트: PascalCase (StudentCard.tsx)
유틸: camelCase (formatDate.ts)
타입: PascalCase (types/Student.ts)
API 라우트: kebab-case (api/students/route.ts)
```

### Import 순서
```typescript
// 1. React & Next.js
import { useState } from 'react'
import Link from 'next/link'

// 2. 외부 라이브러리
import { z } from 'zod'
import { format } from 'date-fns'

// 3. 내부 절대 경로 (aliases)
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

// 4. 상대 경로
import { StudentCard } from './StudentCard'
import type { Student } from '../types'
```

### 컴포넌트 구조
```typescript
// ✅ 표준 구조
'use client' // (필요시)

// 1. Imports
import { ... }

// 2. Types
interface StudentCardProps {
  student: Student
  onEdit?: (id: string) => void
}

// 3. Component
export function StudentCard({ student, onEdit }: StudentCardProps) {
  // 3-1. Hooks
  const [isEditing, setIsEditing] = useState(false)

  // 3-2. Handlers
  const handleEdit = () => {
    onEdit?.(student.id)
  }

  // 3-3. Render
  return (
    <div>...</div>
  )
}
```

---

## 🧪 테스트 전략

### 단위 테스트
```typescript
// ✅ 유틸 함수는 반드시 테스트
// lib/utils/formatDate.test.ts
import { formatDate } from './formatDate'

describe('formatDate', () => {
  it('should format date correctly', () => {
    expect(formatDate('2024-01-15')).toBe('2024년 1월 15일')
  })
})
```

### E2E 테스트 (Playwright)
```typescript
// ✅ 주요 플로우는 E2E 테스트
// tests/e2e/consultation-flow.spec.ts
test('상담 신청부터 등록까지 플로우', async ({ page }) => {
  // 1. 상담 신청 폼 작성
  await page.goto('/consultation/new')
  await page.fill('[name="student_name"]', '김철수')
  await page.click('button[type="submit"]')

  // 2. 접수 확인
  await expect(page.locator('text=접수되었습니다')).toBeVisible()
})
```

---

## 🚀 배포 & 인프라 가이드

### 🚨 배포 시 반드시 확인 (프론트엔드 + 백엔드 모두 배포!)

**⚠️ 중요**: 이 프로젝트는 **프론트엔드와 백엔드 2개 모두** 배포해야 합니다!

```bash
# 🔴 전체 배포 명령어 (반드시 둘 다 실행!)

# 1. 프론트엔드 (Cloudflare Pages) 배포
pnpm pages:build && wrangler pages deploy .vercel/output/static --project-name=goldpen

# 2. 백엔드 API (Cloudflare Workers) 배포
cd workers/api && wrangler deploy
```

| 구분 | 배포 명령어 | URL |
|------|------------|-----|
| **프론트엔드** | `pnpm pages:build && wrangler pages deploy ...` | https://goldpen.pages.dev |
| **백엔드 API** | `cd workers/api && wrangler deploy` | https://goldpen-api.hello-51f.workers.dev |

**빌드 전 체크리스트**:
- [ ] TypeScript 에러 없음 확인 (`pnpm tsc --noEmit`)
- [ ] 모든 페이지에 `export const runtime = 'edge'` 있는지 확인
- [ ] `app/` 폴더에 icon.png 등 정적 파일 없는지 확인 (public/으로 이동)

---

### 아키텍처 구성
```
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Pages (Frontend)                            │
│  - Next.js App (SSR/SSG)                               │
│  - @cloudflare/next-on-pages 빌드                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Workers (BFF/API)                          │
│  - Hono 프레임워크                                      │
│  - Edge Runtime                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase (Database + Auth)                            │
│  - PostgreSQL                                           │
│  - Row Level Security                                   │
└─────────────────────────────────────────────────────────┘
```

### 환경 구분
```yaml
Development: localhost:3000
Staging: staging.goldpen.kr (Cloudflare Pages)
Production: goldpen.kr (Cloudflare Pages)
```

### Cloudflare Pages 배포

```bash
# 1. 빌드 (next-on-pages 사용)
pnpm pages:build

# 2. 배포
wrangler pages deploy .vercel/output/static --project-name=goldpen

# 3. 환경 변수 설정 (Cloudflare Dashboard 또는 CLI)
wrangler pages secret put SUPABASE_URL
wrangler pages secret put SUPABASE_ANON_KEY
wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY
```

### Cloudflare Workers 배포 (BFF)

```bash
# workers/ 디렉토리에서
cd workers/api
wrangler deploy
```

### Git 워크플로우

```bash
# 커밋 전 필수 확인
pnpm build  # 빌드 성공 확인
pnpm lint   # 린트 통과 확인

# 커밋 메시지 규칙
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 리팩토링
chore: 기타 작업
```

### CI/CD 파이프라인
```yaml
# GitHub Actions
on: push to main
steps:
  1. Lint & Type Check (eslint, tsc)
  2. Unit Tests (vitest)
  3. E2E Tests (playwright)
  4. Build (next build)
  5. Deploy to Cloudflare Pages
  6. Run DB Migrations (Supabase)
```

---

## 🗄️ Supabase SQL 마이그레이션 가이드

### 🔑 연결 문자열 (Connection String)

```
# Shared Connection Pooler (권장 - pgbouncer 사용)
DATABASE_URL="postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct Connection (마이그레이션용 - Pooler 없음)
DIRECT_URL="postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

### 🛠️ Prisma를 사용한 SQL 실행 (권장)

**방법 1: SELECT 쿼리 실행**
```bash
node --eval "
import('@prisma/client').then(({ PrismaClient }) => {
  const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
  });

  prisma.\$queryRaw\`SELECT * FROM organizations LIMIT 5\`.then(result => {
    console.log(JSON.stringify(result, null, 2));
    prisma.\$disconnect();
  });
});
"
```

**방법 2: 테이블 생성/변경 (DDL)**
```bash
node --eval "
import('@prisma/client').then(({ PrismaClient }) => {
  const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
  });

  prisma.\$executeRaw\`
    CREATE TABLE IF NOT EXISTS new_table (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL
    )
  \`.then(() => {
    console.log('✅ 완료');
    prisma.\$disconnect();
  });
});
"
```

**방법 3: 복잡한 마이그레이션 (여러 쿼리)**
```bash
node --eval "
import('@prisma/client').then(({ PrismaClient }) => {
  const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres.ipqhhqduppzvsqwwzjkp:rhfemvps123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
  });

  // 테이블 생성
  prisma.\$executeRaw\`CREATE TABLE IF NOT EXISTS ...\`.then(() => {
    console.log('Table created!');

    // 데이터 삽입
    return prisma.\$executeRaw\`INSERT INTO ... VALUES ...\`;
  }).then(() => {
    console.log('Data inserted!');

    // 검증
    return prisma.\$queryRaw\`SELECT * FROM ... LIMIT 5\`;
  }).then(result => {
    console.log('Result:', JSON.stringify(result, null, 2));
    prisma.\$disconnect();
  }).catch(err => {
    console.error('Error:', err.message);
    prisma.\$disconnect();
  });
});
"
```

### 마이그레이션 파일 위치
```
supabase/migrations/
├── 20251120_create_audit_logs.sql
├── 20251121_add_classes_columns.sql
├── 20251202_add_message_pricing.sql
└── ...
```

### Supabase 연결 정보
```
Project Ref: ipqhhqduppzvsqwwzjkp
Region: ap-northeast-1 (Tokyo)
API URL: https://ipqhhqduppzvsqwwzjkp.supabase.co
DB Password: rhfemvps123
Pooler Port: 6543 (pgbouncer)
Direct Port: 5432
```

### 주의사항
- ⚠️ Service Role Key는 절대 클라이언트에 노출 금지
- ⚠️ 연결 문자열은 --eval로만 사용 (파일에 저장 금지!)
- ✅ RLS 정책 반드시 설정 후 테이블 생성
- ✅ 쿼리 결과에 COUNT(*)가 있으면 ::int로 캐스팅 필요

---

## 📊 모니터링 & 로깅

### 프론트엔드
```typescript
// ✅ Sentry로 에러 추적
import * as Sentry from '@sentry/nextjs'

Sentry.captureException(error, {
  tags: { feature: 'consultation' },
  extra: { userId, orgId }
})
```

### 백엔드 (Cloudflare Workers)
```typescript
// ✅ Cloudflare Analytics + Custom Logs
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const start = Date.now()

    try {
      const response = await handleRequest(request, env)

      // 성공 로그
      console.log({
        method: request.method,
        url: request.url,
        status: response.status,
        duration: Date.now() - start
      })

      return response
    } catch (error) {
      // 에러 로그
      console.error({
        method: request.method,
        url: request.url,
        error: error.message,
        stack: error.stack,
        duration: Date.now() - start
      })

      throw error
    }
  }
}
```

---

## 📚 참고 문서

- [PRD.md](./PRD.md) - 제품 요구사항 정의서
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 시스템 아키텍처
- [TASKS.md](./TASKS.md) - 작업 로그
- [docs/api/](./docs/api/) - API 문서
- [docs/patterns/](./docs/patterns/) - 성공 패턴 라이브러리

---

## ⚠️ 금지 사항

### 절대 하지 말 것
1. ❌ RLS 없이 테이블 생성
2. ❌ 환경 변수 하드코딩
3. ❌ org_id 없이 멀티테넌트 쿼리
4. ❌ 타입 검증 없이 외부 입력 처리
5. ❌ 에러 처리 없이 API 호출
6. ❌ 테스트 없이 중요 기능 배포

### 필수 체크리스트
```
새 기능 개발 시:
  ✅ TypeScript 타입 정의
  ✅ Zod 스키마 검증
  ✅ 에러 핸들링
  ✅ 단위 테스트 작성
  ✅ E2E 테스트 (주요 플로우)
  ✅ RLS 정책 설정 (DB)
  ✅ API 문서 업데이트
  ✅ TASKS.md 기록
```

---

**마지막 업데이트**: 2025-12-02
**버전**: 0.3.0 (Supabase 연결 방식 Prisma로 통일)
