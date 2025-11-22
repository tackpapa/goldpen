# GoldPen

> 학원/러닝센터/스터디카페 통합 운영 시스템

상담부터 정산까지, 교육 기관 운영을 자동화하는 올인원 SaaS 플랫폼

---

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 20 이상
- pnpm 9 이상
- Supabase 계정 (https://supabase.com)
- (Cloudflare Pages) 빌드 환경 변수 `NODE_VERSION=20.19.5` 설정 권장
- (CI 사용 시) `actions/setup-node` 등에서 `node-version: 20` 명시

### 설치

```bash
# Dependencies 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 열어서 Supabase 키 등 설정

# 개발 서버 실행
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

---

## 📁 프로젝트 구조

```
goldpen/
├── app/              # Next.js App Router
├── components/       # React 컴포넌트
├── lib/              # 유틸리티 & 핵심 로직
├── workers/          # Cloudflare Workers
├── supabase/         # Supabase 마이그레이션 & Functions
├── docs/             # 프로젝트 문서
└── .claude/          # Claude 설정 & Agents
```

자세한 구조는 [CLAUDE.md](./CLAUDE.md) 참조

---

## 📚 문서

- [PRD.md](./PRD.md) - 제품 요구사항 정의서
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 시스템 아키텍처
- [CLAUDE.md](./CLAUDE.md) - 프로젝트 규칙 및 가이드라인
- [TASKS.md](./TASKS.md) - 작업 로그

---

## 🛠️ 기술 스택

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**

### Backend
- **Cloudflare Workers**
- **Hono** (경량 웹 프레임워크)

### Database & Auth
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)

### External APIs
- **OpenAI** (GPT-4o)
- **Google Calendar API**
- **KakaoTalk Biz API**
- **SendGrid** (Email)

---

## 📜 주요 스크립트

```bash
# 개발 서버
pnpm dev

# 타입 체크
pnpm type-check

# 린트
pnpm lint

# 빌드
pnpm build

# 프로덕션 서버
pnpm start

# 테스트
pnpm test

# E2E 테스트
pnpm test:e2e

# DB 마이그레이션
pnpm db:migrate

# DB 리셋
pnpm db:reset
```

---

## 🔐 환경 변수

`.env.example` 파일을 참조하여 `.env.local` 파일 생성

필수 환경 변수:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 🤝 기여

이 프로젝트는 현재 비공개 개발 중입니다.

---

## 📄 라이선스

Proprietary - All rights reserved

---

**Made with ❤️ by GoldPen Team**
