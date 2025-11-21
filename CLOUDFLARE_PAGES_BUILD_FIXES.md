# Cloudflare Pages 빌드 오류 원인 & 수정 체크리스트

## TL;DR (즉시 조치)
- 빌드 명령을 `next build && next-on-pages`로 수정하고 Cloudflare Pages에도 동일하게 입력한다. (`package.json:pages:build`)
- Pages 빌드 런타임을 Node 20으로 고정한다. (`Settings > Build > Environment variables > NODE_VERSION=20`)
- Pages 환경 변수에 `SUPABASE_SERVICE_ROLE_KEY`를 포함한 필수 키 6개를 모두 등록한다. (아래 표 참고)
- `app/api/test-env/route.ts`에 `runtime = 'edge'`, `dynamic = 'force-dynamic'`를 선언해 빌드 타임 인라인/캐싱을 막는다.

---

## 1) 빌드 파이프라인 수정
- 현재 `package.json`의 `pages:build`가 `pnpm exec next-on-pages`만 실행하여 `.next` 산출물이 없는 상태로 어댑터를 돌립니다 → Cloudflare 빌드 로그: “Could not find .next” 류 오류 확정  
  **해결:** `package.json`을 다음과 같이 바꾼 뒤 Cloudflare Pages의 Build command도 동일하게 설정  
  ```json
  // package.json
  {
    "scripts": {
      "build": "next build",
      "pages:build": "pnpm run build && pnpm exec next-on-pages"
    }
  }
  ```
  - Pages 대시보드: Build command = `pnpm run pages:build`, Output directory = `.vercel/output/static`
- 로컬 재현 시 Node 16 → pnpm 9 오류가 발생합니다. 빌드/테스트용 Node 20을 기본값으로 맞추세요.  
  - Cloudflare: `NODE_VERSION=20` 설정 (필수)  
  - 로컬: `volta install node@20` 또는 `.nvmrc`에 `20` 추가 후 `nvm use`
- `wrangler.toml`의 `compatibility_date`는 `2024-11-19`로 고정돼 있어 최신 Workers 기능이 빠집니다. Pages만 쓴다면 `2025-11-21`로 업데이트 권장. (`wrangler.toml`)

---

## 2) 환경 변수 누락 정리 (Pages > Settings > Environment variables)
| 용도 | 키 | 비고 |
|------|----|------|
| Supabase 클라이언트 | `NEXT_PUBLIC_SUPABASE_URL` | 필수 |
| Supabase 클라이언트 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 필수 |
| Supabase 서버 작업 | `SUPABASE_SERVICE_ROLE_KEY` | **seat-assignments, students modal 등에서 사용** |
| 앱 베이스 URL | `NEXT_PUBLIC_APP_URL` | 예: `https://goldpen.pages.dev` |
| BFF 호출(사용 시) | `NEXT_PUBLIC_API_URL` | Workers API 도메인 |
| 날씨 위젯 | `NEXT_PUBLIC_OPENWEATHER_API_KEY` | 없으면 런타임 401 |

> 서비스 키가 없으면 `/api/seat-assignments`, `/api/students/[id]/modal` 등에서 500이 납니다. Pages에서도 **프로덕션 섹션**에 꼭 넣어주세요.

---

## 3) Edge 런타임/캐시 설정 보완
- `app/api/test-env/route.ts`는 `runtime`/`dynamic` 선언이 없어 빌드 타임에 환경 변수가 인라인되고 정적 캐시가 생성됩니다.  
  **해결:** 파일 상단에 아래 두 줄 추가  
  ```ts
  export const runtime = 'edge'
  export const dynamic = 'force-dynamic'
  ```
- 나머지 API는 이미 `runtime='edge'`와 `revalidate=0`이 선언되어 있어 Pages 변환 시 캐시 우회가 적용됩니다.

---

## 4) Supabase 키 폴백값 제거 권장 (보안/오동작 예방)
- `lib/supabase/client.ts`, `lib/supabase/server.ts`에 실제 프로젝트의 anon 키/로컬 키가 하드코딩된 폴백으로 남아 있습니다. 빌드 환경 변수가 비어 있으면 이 값이 **클라이언트 번들**에 실립니다.  
  **조치:** 폴백을 제거하고, 값이 없으면 빌드 실패시키거나 명시적 에러를 던지도록 변경.

---

## 5) 로컬에서 Pages 빌드 검증 절차 (Node 20 기준)
```bash
corepack enable                     # pnpm 활성화
pnpm install --frozen-lockfile
pnpm run pages:build                # (= next build && next-on-pages)
ls .vercel/output/static/_worker.js # 산출물 확인
```
- 실패 시 `npm_config_yes=true pnpm env use --global 20`로 노드 버전 맞춘 뒤 다시 시도.

---

## 6) 예상 빌드 오류와 원인 매핑
- `pnpm --version ... requires Node.js v18.12` → CI/로컬 노드 버전 16: Node 20으로 통일
- `Could not find .next` / `Next build output folder missing` → `pages:build`에 `next build` 누락
- `SUPABASE_SERVICE_ROLE_KEY is not defined` (런타임) → Pages 환경 변수 미설정
- `OpenWeather 401` → `NEXT_PUBLIC_OPENWEATHER_API_KEY` 미설정 또는 오타

---

## 7) 완료 후 체크리스트
- [ ] Cloudflare Pages: Build command, Output dir, NODE_VERSION 수정
- [ ] Pages 환경 변수 6종 모두 등록 후 재배포
- [ ] `app/api/test-env/route.ts`에 edge/dynamic 선언 추가
- [ ] Supabase 폴백 키 제거 패치 반영
- [ ] 로컬에서 `pnpm run pages:build` 성공 확인

문서 기준일: 2025-11-21
