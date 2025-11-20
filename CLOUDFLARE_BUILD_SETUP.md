# Cloudflare Pages 빌드 설정 가이드

> **GoldPen 프로젝트 - Next.js 14 + Cloudflare Pages**

---

## 📋 목차
1. [빌드 설정 요약](#빌드-설정-요약)
2. [Cloudflare Pages Dashboard 설정](#cloudflare-pages-dashboard-설정)
3. [환경 변수 설정](#환경-변수-설정)
4. [빌드 프로세스 이해](#빌드-프로세스-이해)
5. [트러블슈팅](#트러블슈팅)

---

## 🎯 빌드 설정 요약

### Cloudflare Pages Dashboard 설정

| 설정 항목 | 값 |
|----------|-----|
| **프레임워크 프리셋** | `Next.js` |
| **빌드 명령어** | `npm run pages:build` |
| **빌드 출력 디렉토리** | `.vercel/output/static` |
| **루트 디렉토리** | (비워두기) |
| **Node.js 버전** | `20.x` (자동 감지) |

---

## ⚙️ Cloudflare Pages Dashboard 설정

### 1. 프로젝트 생성

1. Cloudflare Dashboard → **Workers & Pages**
2. **Create application** → **Pages** 탭
3. **Connect to Git** → GitHub 연결
4. 저장소 선택: `tackpapa/goldpen`

### 2. 빌드 설정 입력

**프레임워크 프리셋**:
```
Next.js
```

**빌드 명령어**:
```bash
npm run pages:build
```

**빌드 출력 디렉토리**:
```
.vercel/output/static
```

**프로덕션 브랜치**:
```
main
```

### 3. 환경 변수 설정

**Settings** → **Environment variables** → **Production** 탭에서 추가:

| 변수명 | 값 | 설명 |
|-------|-----|------|
| `NEXT_PUBLIC_APP_URL` | `https://goldpen.kr` | 프론트엔드 URL |
| `NEXT_PUBLIC_API_URL` | `https://api.goldpen.kr` | BFF Workers API URL |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vdxxzygqjjjptzlvgrtw.supabase.co` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase Anon Key |
| `NEXT_PUBLIC_OPENWEATHER_API_KEY` | `8e299fcf763572d21d11610d42a1ff7e` | 날씨 API 키 |

---

## 🔧 빌드 프로세스 이해

### 로컬 빌드 명령어 (package.json)

```json
{
  "scripts": {
    "pages:build": "next build && npx @cloudflare/next-on-pages"
  }
}
```

### 빌드 단계별 설명

#### 1단계: Next.js 빌드
```bash
next build
```
- Next.js 프로젝트를 프로덕션 모드로 빌드
- `.next` 디렉토리에 빌드 결과 생성
- Client Components (`'use client'`)는 클라이언트 번들로 컴파일
- API Routes는 Edge Runtime으로 컴파일 (명시된 경우)

#### 2단계: Cloudflare Pages 변환
```bash
npx @cloudflare/next-on-pages
```
- `.next` 빌드 결과를 Cloudflare Pages 포맷으로 변환
- `.vercel/output/static` 디렉토리에 최종 결과 생성
- Next.js 기능을 Cloudflare Workers/Pages API로 매핑

### 빌드 결과물 구조

```
.vercel/output/static/
├── _worker.js         # Cloudflare Workers 엔트리포인트
├── _routes.json       # 라우팅 설정
├── index.html         # 정적 페이지들
├── _next/             # Next.js 번들
│   ├── static/        # 정적 assets
│   └── ...
└── ...
```

---

## 📝 프로젝트 파일 설정

### 1. next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // TypeScript 빌드 에러 무시 (프레젠테이션용)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint 빌드 경고 무시
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Cloudflare Pages 최적화
  images: {
    unoptimized: true, // Image Optimization 비활성화
  },

  // 환경 변수 폴백
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vdxxzygqjjjptzlvgrtw.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGci...',
  },
}

module.exports = nextConfig
```

**주요 설정 설명**:
- `images.unoptimized: true`: Cloudflare는 Next.js Image Optimization을 지원하지 않음
- `typescript.ignoreBuildErrors`: 타입 에러가 있어도 빌드 진행 (임시)
- `env`: 환경 변수 폴백값 제공

### 2. wrangler.toml

```toml
#:schema node_modules/wrangler/config-schema.json
name = "goldpen"
compatibility_date = "2024-11-19"
pages_build_output_dir = ".vercel/output/static"

# Cloudflare Pages configuration for Next.js
# See: https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/

[env.production]
# Production environment variables
# Set these in Cloudflare Pages dashboard: Settings > Environment Variables
```

**주요 설정**:
- `pages_build_output_dir`: Cloudflare Pages가 배포할 디렉토리
- `compatibility_date`: Workers 런타임 호환성 날짜

---

## 🚀 배포 플로우

### 자동 배포 (GitHub Push)

```bash
# 1. 변경사항 커밋
git add .
git commit -m "feat: 새 기능 추가"

# 2. GitHub에 푸시
git push origin main

# 3. Cloudflare Pages 자동 빌드 시작
# - GitHub webhook 트리거
# - 빌드 명령어 실행: npm run pages:build
# - 빌드 성공 시 자동 배포
```

### 수동 배포 (로컬)

```bash
# 1. 로컬 빌드 테스트
pnpm run pages:build

# 2. Wrangler로 배포
pnpm run deploy

# 또는 직접
npx wrangler pages deploy .vercel/output/static
```

---

## 🔍 트러블슈팅

### 빌드 실패: "routes were not configured to run with the Edge Runtime"

**원인**: Client Components (`'use client'`)와 `export const runtime = 'edge'`는 함께 사용할 수 없음

**해결책**: 페이지 파일에서 `export const runtime = 'edge'` 제거
- Client Components는 자동으로 Edge-compatible하게 변환됨
- API Routes만 명시적으로 Edge Runtime 선언

### 빌드 실패: "Page is missing generateStaticParams()"

**원인**: `output: 'export'` 설정 사용 시 동적 라우트에 `generateStaticParams()` 필요

**해결책**: `next.config.js`에서 `output: 'export'` 제거
- 현재 설정: SSR/ISR 사용 (Cloudflare Workers에서 실행)
- Static export는 사용하지 않음

### 환경 변수가 로드되지 않음

**체크리스트**:
1. Cloudflare Pages Dashboard → Settings → Environment variables 확인
2. 변수명이 `NEXT_PUBLIC_` 접두사로 시작하는지 확인 (클라이언트 사이드 접근 시)
3. 배포 후 **Redeploy** 클릭 (환경 변수 변경 후)

### 이미지 최적화 에러

**원인**: Cloudflare Pages는 Next.js Image Optimization을 지원하지 않음

**해결책**: `next.config.js`에 다음 설정 추가
```javascript
images: {
  unoptimized: true
}
```

또는 `next/image` 사용 시:
```tsx
<Image
  src="/image.png"
  unoptimized
  width={500}
  height={300}
/>
```

---

## 📊 배포 검증

배포 후 다음 항목을 확인:

### 1. 빌드 성공 확인
```
Cloudflare Dashboard → Workers & Pages → goldpen → Deployments
```
- ✅ 최신 커밋이 "Success" 상태인지 확인
- 📝 빌드 로그에 에러가 없는지 확인

### 2. 환경 변수 확인
브라우저 개발자 도구 (F12) → Console에서:
```javascript
// 환경 변수가 올바르게 로드되었는지 확인
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
// → "https://vdxxzygqjjjptzlvgrtw.supabase.co"
```

### 3. 기능 테스트
- [ ] 로그인 성공 (`admin@goldpen.kr` / `12345678`)
- [ ] 대시보드 접속 (예: `/goldpen/overview`)
- [ ] API 호출 정상 작동
- [ ] Realtime 기능 작동 (라이브스크린 등)

---

## 📚 참고 문서

- **Cloudflare Pages**: https://developers.cloudflare.com/pages/
- **Next.js on Cloudflare**: https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/
- **@cloudflare/next-on-pages**: https://github.com/cloudflare/next-on-pages
- **Supabase**: https://supabase.com/docs

---

## 🔗 관련 파일

- `package.json` - 빌드 스크립트
- `next.config.js` - Next.js 설정
- `wrangler.toml` - Cloudflare Workers 설정
- `.env.production` - 프로덕션 환경 변수 (참고용)

---

**마지막 업데이트**: 2025-11-20
**버전**: 1.0.0
**프로젝트**: GoldPen
