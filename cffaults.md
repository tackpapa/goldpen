# GoldPen Cloudflare 배포 설정 검증 보고서

**작성일**: 2025-11-23
**분석 대상**: Next.js + Cloudflare Pages 통합 설정
**목적**: Cloudflare Pages 배포 시 발생하는 깜빡임 및 호환성 문제 분석

---

## 📋 Executive Summary

### 현재 상태

- **Frontend**: Next.js 14.2.33 (App Router) → Cloudflare Pages 배포
- **API**: Cloudflare Workers (Hono 프레임워크)
- **빌드 도구**: @cloudflare/next-on-pages v1.13.16
- **Edge Runtime**: 58/58 API Routes (100% ✅)
- **Image Optimization**: 비활성화 (unoptimized: true) ✅

### 주요 발견 사항

**✅ 올바르게 설정된 항목**:
- ✅ 모든 API 라우트가 Edge Runtime 사용 (`export const runtime = 'edge'`)
- ✅ Image Optimization 비활성화 (Cloudflare 호환)
- ✅ @cloudflare/next-on-pages 빌드 도구 설치
- ✅ wrangler 4.47.0 설치 및 배포 스크립트 구성

**⚠️ 잠재적 문제**:
- ⚠️ TypeScript 및 ESLint 빌드 에러 무시 설정 (임시 조치)
- ⚠️ Node.js 전용 API 사용 가능성 (fs, path, crypto 등)
- ⚠️ 환경 변수 누락 시 런타임 에러 가능

---

## 🔍 Cloudflare Pages 깜빡임 문제 분석

### 1. 깜빡임 문제의 주요 원인

#### 1.1 Image Optimization 미스매치 (해결 완료 ✅)

**문제**:
Next.js의 기본 Image Optimization은 Node.js 서버에서 실행됩니다. Cloudflare Pages는 정적 파일 호스팅이므로 이미지 최적화를 지원하지 않습니다.

**증상**:
```typescript
// ❌ Image Optimization 활성화 시 (잘못된 설정)
// next.config.js
images: {
  // Image Optimization 활성화 (기본값)
}

// 결과: 이미지 로딩 시 깜빡임, 404 에러, 무한 로딩
```

**현재 설정 (✅ 올바름)**:
```javascript
// next.config.js
images: {
  unoptimized: true, // ✅ Cloudflare Pages 호환
}
```

**해결 상태**: ✅ **해결 완료** - `unoptimized: true` 설정됨

---

#### 1.2 Edge Runtime 미설정 (해결 완료 ✅)

**문제**:
Cloudflare Pages에서 API 라우트는 Edge Runtime에서 실행되어야 합니다. Node.js Runtime을 사용하면 호환성 문제가 발생합니다.

**증상**:
```typescript
// ❌ Node.js Runtime 사용 시
// app/api/students/route.ts
// export const runtime = 'nodejs' (또는 명시 없음)

// 결과: API 요청 시 타임아웃, 무한 로딩, 깜빡임
```

**현재 설정 (✅ 올바름)**:
```typescript
// ✅ 모든 API 라우트에 Edge Runtime 명시
export const runtime = 'edge'

export async function GET(request: Request) {
  // Edge Runtime에서 실행
}
```

**검증 결과**: ✅ **58/58 API Routes 모두 Edge Runtime 사용**

---

#### 1.3 Node.js 전용 API 사용 (잠재적 위험 ⚠️)

**문제**:
Node.js 내장 모듈(fs, path, crypto 등)은 Cloudflare Workers에서 사용할 수 없습니다.

**증상**:
```typescript
// ❌ Node.js 전용 API 사용 (Cloudflare에서 에러)
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// 결과: 런타임 에러, 페이지 크래시, 무한 로딩
```

**Cloudflare 호환 대안**:
```typescript
// ✅ Web Crypto API 사용 (Edge Runtime 호환)
const hash = await crypto.subtle.digest('SHA-256', data)

// ✅ Cloudflare KV/R2 사용 (파일 시스템 대신)
const file = await env.MY_BUCKET.get('file.json')
```

**현재 상태**: ⚠️ **검증 필요**

**권장 조치**:
```bash
# Node.js 전용 API 사용 여부 검사
grep -r "import.*from 'fs'" app/ lib/
grep -r "import.*from 'path'" app/ lib/
grep -r "import.*from 'crypto'" app/ lib/
grep -r "require('fs')" app/ lib/
```

---

#### 1.4 환경 변수 누락 (잠재적 위험 ⚠️)

**문제**:
Cloudflare Pages 환경에서 환경 변수가 제대로 설정되지 않으면 API 요청 실패로 이어집니다.

**증상**:
```typescript
// ❌ 환경 변수 누락 시
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// supabaseUrl = undefined

// 결과: Supabase 클라이언트 생성 실패, API 에러, 깜빡임
```

**현재 설정 (✅ 올바름)**:
```javascript
// next.config.js
env: {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}
```

**권장 조치**:
```bash
# Cloudflare Pages 대시보드에서 환경 변수 설정
wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL
wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY

# 또는 wrangler.toml에 공개 변수만 설정
[vars]
NEXT_PUBLIC_SUPABASE_URL = "https://ipqhhqduppzvsqwwzjkp.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbG..."
```

---

### 2. SSR/SSG 렌더링 깜빡임

#### 2.1 Hydration Mismatch

**문제**:
서버 렌더링 HTML과 클라이언트 JavaScript가 일치하지 않으면 깜빡임이 발생합니다.

**증상**:
```typescript
// ❌ 서버/클라이언트 불일치
export default function Page() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 서버: mounted = false
  // 클라이언트: mounted = true
  // 결과: 깜빡임!

  return <div>{mounted ? 'Client' : 'Server'}</div>
}
```

**해결 방법**:
```typescript
// ✅ Suspense로 깜빡임 방지
import { Suspense } from 'react'

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ClientComponent />
    </Suspense>
  )
}
```

---

#### 2.2 데이터 Fetching 깜빡임

**문제**:
서버 컴포넌트에서 데이터를 가져오는 동안 로딩 상태가 보이지 않으면 깜빡임처럼 보입니다.

**증상**:
```typescript
// ❌ 로딩 상태 없음
export default async function Page() {
  const data = await fetch('/api/students') // 느린 API
  return <div>{data.students.map(...)}</div>
}

// 결과: 빈 화면 → 갑자기 데이터 표시 (깜빡임)
```

**해결 방법**:
```typescript
// ✅ Streaming SSR + Suspense
import { Suspense } from 'react'

export default function Page() {
  return (
    <Suspense fallback={<StudentsSkeleton />}>
      <Students />
    </Suspense>
  )
}

async function Students() {
  const data = await fetch('/api/students')
  return <div>{data.students.map(...)}</div>
}
```

---

### 3. Cloudflare Workers API 연결 문제

#### 3.1 CORS 설정 누락

**문제**:
Cloudflare Workers API에 CORS 헤더가 없으면 브라우저가 요청을 차단합니다.

**증상**:
```
Error: CORS policy blocked
결과: API 요청 실패, 무한 로딩, 깜빡임
```

**Workers API 현재 설정 (✅ 올바름)**:
```typescript
// workers/api/src/middleware/cors.ts
export const cors = () => {
  return async (c: Context, next: Next) => {
    await next()
    c.res.headers.set('Access-Control-Allow-Origin', '*')
    c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  }
}

// workers/api/src/index.ts
app.use('*', cors()) // ✅ 글로벌 CORS 적용
```

---

#### 3.2 API 타임아웃

**문제**:
Cloudflare Workers는 CPU 실행 시간이 제한됩니다 (무료: 10ms, 유료: 50ms).

**증상**:
```typescript
// ❌ 느린 쿼리
const students = await db.query(`
  SELECT * FROM students
  JOIN classes ON ...
  JOIN enrollments ON ...
  -- 복잡한 JOIN으로 10ms 초과
`)

// 결과: 타임아웃, 503 에러, 무한 로딩
```

**해결 방법**:
```typescript
// ✅ 인덱스 추가 + 쿼리 최적화
CREATE INDEX idx_students_org_id ON students(org_id);

// ✅ Hyperdrive 사용 (커넥션 풀링)
const db = env.HYPERDRIVE_DB.connectionString
```

**현재 설정 (✅ 올바름)**:
```toml
# workers/api/wrangler.toml
[[hyperdrive]]
binding = "HYPERDRIVE_DB"
id = "8c1cfe4c456d460da34153acc8e0eb2c" # ✅ Hyperdrive 사용
```

---

## 🛠️ 검증 및 디버깅 가이드

### 1. 빌드 검증

#### 1.1 Local 빌드 테스트
```bash
# Next.js 빌드 (에러 확인)
pnpm build

# Cloudflare Pages 빌드
pnpm pages:build

# 빌드 결과 확인
ls -la .vercel/output/static/
```

**예상 출력**:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (XX/XX)
✓ Finalizing page optimization

⚡️ Cloudflare Pages build complete
```

---

#### 1.2 빌드 에러 해결

**현재 설정 (임시 조치 ⚠️)**:
```javascript
// next.config.js
typescript: {
  ignoreBuildErrors: true, // ⚠️ 프레젠테이션용 임시 비활성화
},
eslint: {
  ignoreDuringBuilds: true, // ⚠️ 프레젠테이션용 임시 비활성화
}
```

**권장 조치**:
```bash
# TypeScript 에러 확인
pnpm tsc --noEmit

# ESLint 에러 확인
pnpm eslint . --ext .ts,.tsx

# 에러 수정 후 엄격 모드 활성화
# next.config.js에서 ignoreBuildErrors: false로 변경
```

---

### 2. 런타임 검증

#### 2.1 Edge Runtime 호환성 테스트
```bash
# Edge Runtime 사용 여부 확인
grep -r "export const runtime" app/api --include="*.ts" | wc -l
# 결과: 58 (모든 API 라우트)

# Node.js 전용 API 사용 여부 확인
grep -r "import.*from 'fs'" app/ lib/
grep -r "import.*from 'path'" app/ lib/
grep -r "require('fs')" app/ lib/
```

---

#### 2.2 환경 변수 검증
```typescript
// app/api/debug/env/route.ts
export const runtime = 'edge'

export async function GET() {
  return Response.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 설정됨' : '❌ 누락',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 설정됨' : '❌ 누락',
  })
}
```

**테스트**:
```bash
curl https://goldpen.kr/api/debug/env
# 예상: { "supabaseUrl": "✅ 설정됨", "supabaseKey": "✅ 설정됨" }
```

---

### 3. 배포 후 검증

#### 3.1 Cloudflare Pages 배포
```bash
# 프로덕션 배포
pnpm deploy

# 또는
wrangler pages deploy .vercel/output/static
```

#### 3.2 배포 상태 확인
```bash
# Cloudflare Pages 대시보드
# https://dash.cloudflare.com/

# 배포 로그 확인
wrangler pages deployment list --project-name=goldpen
```

#### 3.3 런타임 에러 모니터링
```bash
# Cloudflare Workers Logs
wrangler tail --project=goldpen-api

# 실시간 에러 확인
# https://dash.cloudflare.com/ → Workers → goldpen-api → Logs
```

---

## 📊 현재 설정 상태표

| 항목 | 설정 값 | 상태 | 비고 |
|------|---------|------|------|
| **Image Optimization** | `unoptimized: true` | ✅ 올바름 | Cloudflare 호환 |
| **Edge Runtime** | 58/58 (100%) | ✅ 올바름 | 모든 API 라우트 적용 |
| **@cloudflare/next-on-pages** | v1.13.16 | ✅ 설치됨 | 빌드 도구 |
| **wrangler** | v4.47.0 | ✅ 설치됨 | 배포 CLI |
| **Hyperdrive** | 설정됨 | ✅ 올바름 | DB 커넥션 풀링 |
| **CORS Middleware** | 글로벌 적용 | ✅ 올바름 | Workers API |
| **TypeScript 엄격 모드** | 비활성화 | ⚠️ 임시 조치 | 프로덕션에서 활성화 필요 |
| **ESLint 엄격 모드** | 비활성화 | ⚠️ 임시 조치 | 프로덕션에서 활성화 필요 |
| **환경 변수** | next.config.js 명시 | ✅ 올바름 | Pages에도 설정 필요 |
| **Node.js API 사용** | 미검증 | ⚠️ 검증 필요 | fs, path, crypto 확인 |

---

## 🚨 잠재적 깜빡임 시나리오 및 해결

### 시나리오 1: 페이지 로드 시 흰 화면 → 내용 표시

**원인**:
- Suspense 경계 누락
- 데이터 페칭 중 로딩 상태 없음

**해결**:
```typescript
// ✅ loading.tsx 추가
// app/[institutionname]/(dashboard)/students/loading.tsx
export default function Loading() {
  return <StudentsSkeleton />
}
```

---

### 시나리오 2: 이미지 깜빡임

**원인**:
- Image Optimization 활성화 (Cloudflare 미지원)

**해결**:
```javascript
// ✅ next.config.js
images: {
  unoptimized: true // 이미 설정됨
}
```

---

### 시나리오 3: API 요청 시 무한 로딩

**원인**:
- Edge Runtime 미설정
- CORS 에러
- 환경 변수 누락
- Hyperdrive 미연결

**해결**:
```typescript
// 1. Edge Runtime 확인
export const runtime = 'edge' // ✅

// 2. CORS 확인
app.use('*', cors()) // ✅ Workers API에 이미 적용

// 3. 환경 변수 확인
wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL

// 4. Hyperdrive 확인
# wrangler.toml에 이미 설정됨
```

---

### 시나리오 4: 서버/클라이언트 불일치 경고

**증상**:
```
Warning: Text content did not match. Server: "Loading..." Client: "123 students"
```

**원인**:
- Hydration Mismatch
- 클라이언트 전용 데이터 사용 (localStorage, Date.now() 등)

**해결**:
```typescript
// ✅ useEffect로 클라이언트 전용 로직 격리
'use client'

export function ClientOnly() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <Skeleton />

  return <RealContent />
}
```

---

## 🔧 권장 조치사항

### 우선순위 1: 즉시 조치

1. **Node.js API 사용 여부 검증**
   ```bash
   # fs, path, crypto 사용 여부 확인
   grep -r "import.*from 'fs'" app/ lib/
   grep -r "import.*from 'path'" app/ lib/
   grep -r "import.*from 'crypto'" app/ lib/
   ```

2. **Cloudflare Pages 환경 변수 설정**
   ```bash
   wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL
   wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

3. **빌드 에러 해결 (TypeScript + ESLint)**
   ```bash
   pnpm tsc --noEmit
   pnpm eslint . --ext .ts,.tsx
   # 에러 수정 후 next.config.js에서 ignore 옵션 제거
   ```

---

### 우선순위 2: 1주 내 조치

1. **Suspense 경계 추가**
   - 모든 데이터 페칭 컴포넌트에 Suspense 적용
   - loading.tsx 파일 추가

2. **에러 바운더리 추가**
   ```typescript
   // app/error.tsx
   'use client'

   export default function Error({ error, reset }: {
     error: Error & { digest?: string }
     reset: () => void
   }) {
     return (
       <div>
         <h2>문제가 발생했습니다</h2>
         <button onClick={reset}>다시 시도</button>
       </div>
     )
   }
   ```

3. **성능 모니터링 설정**
   - Cloudflare Analytics 활성화
   - Sentry 또는 LogRocket 통합

---

### 우선순위 3: 1개월 내 조치

1. **Cloudflare Images 통합** (선택 사항)
   ```typescript
   // Image Optimization이 필요하면 Cloudflare Images 사용
   <Image
     loader={cloudflareLoader}
     src="/images/logo.png"
     alt="Logo"
   />
   ```

2. **Cloudflare D1 마이그레이션** (선택 사항)
   - Supabase 대신 Cloudflare D1 SQLite 사용
   - Workers와의 지연 시간 최소화

3. **Edge Caching 최적화**
   ```typescript
   // app/api/students/route.ts
   export async function GET() {
     return Response.json(data, {
       headers: {
         'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
       }
     })
   }
   ```

---

## 📚 참고 자료

### 공식 문서
- [Next.js on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [@cloudflare/next-on-pages Documentation](https://github.com/cloudflare/next-on-pages)
- [Cloudflare Workers Runtime APIs](https://developers.cloudflare.com/workers/runtime-apis/)
- [Next.js Edge Runtime](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes)

### 문제 해결 가이드
- [Troubleshooting Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/troubleshooting/)
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)

---

## ✅ 체크리스트

### 빌드 전 확인
- [x] Image Optimization 비활성화 (`unoptimized: true`)
- [x] 모든 API 라우트에 `export const runtime = 'edge'`
- [ ] Node.js API 사용 여부 검증 (fs, path, crypto)
- [ ] TypeScript 에러 해결 (`pnpm tsc --noEmit`)
- [ ] ESLint 에러 해결 (`pnpm eslint .`)

### 배포 전 확인
- [ ] Cloudflare Pages 환경 변수 설정
- [x] wrangler.toml에 Hyperdrive 설정
- [x] CORS 미들웨어 적용 (Workers API)
- [ ] 빌드 성공 확인 (`pnpm pages:build`)
- [ ] 로컬 프리뷰 테스트 (`wrangler pages dev`)

### 배포 후 확인
- [ ] 프로덕션 URL 접속 테스트
- [ ] API 엔드포인트 동작 확인
- [ ] 이미지 로딩 확인 (깜빡임 없음)
- [ ] 브라우저 콘솔 에러 확인
- [ ] Cloudflare Workers 로그 확인 (`wrangler tail`)
- [ ] 성능 메트릭 확인 (Core Web Vitals)

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-11-23
**작성자**: Claude Code (Cloudflare 배포 분석 Agent)
