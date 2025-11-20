# 배포 현황 - GoldPen Production

**배포일**: 2025-11-20
**마지막 업데이트**: 2025-11-20

---

## ✅ 완료된 배포

### 1. BFF Workers API - `api.goldpen.kr`

**상태**: ✅ 배포 완료
**배포 ID**: `52ccbb34-8cd1-42fa-b5b0-166f64ef848a`
**Worker Name**: `goldpen-api-production`
**URL**: https://api.goldpen.kr
**환경**: Production

**배포된 환경 변수**:
- `NEXT_PUBLIC_APP_URL`: https://goldpen.kr
- `NEXT_PUBLIC_SUPABASE_URL`: https://vdxxzygqjjjptzlvgrtw.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: [설정됨]

**커스텀 도메인 라우팅**:
```
api.goldpen.kr/* → goldpen-api-production (zone: goldpen.kr)
```

**배포 명령어**:
```bash
cd workers/api
npx wrangler deploy --env production
```

---

### 2. Frontend - Cloudflare Pages

**상태**: ⏳ 빌드 대기 중
**프로젝트명**: goldpen
**GitHub 저장소**: https://github.com/tackpapa/goldpen
**마지막 커밋**: `8940d0d` - "feat: configure production environment and fix Edge Runtime compatibility"

**빌드 설정**:
- **Build command**: `npm run pages:build`
- **Build output**: `.vercel/output/static`
- **Production branch**: `main`

**설정된 환경 변수** (Cloudflare Pages Dashboard):
- `NEXT_PUBLIC_APP_URL`: https://goldpen.kr
- `NEXT_PUBLIC_SUPABASE_URL`: https://vdxxzygqjjjptzlvgrtw.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: [설정됨]
- `NEXT_PUBLIC_OPENWEATHER_API_KEY`: [설정됨]

---

## 📋 다음 단계 (수동 작업 필요)

### 1. Cloudflare Pages 환경 변수 확인

Cloudflare Pages Dashboard에서 다음 환경 변수가 설정되어 있는지 확인:

```bash
# Production 환경
NEXT_PUBLIC_APP_URL=https://goldpen.kr
NEXT_PUBLIC_API_URL=https://api.goldpen.kr
NEXT_PUBLIC_SUPABASE_URL=https://vdxxzygqjjjptzlvgrtw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeHh6eWdxampqcHR6bHZncnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODk2NjQsImV4cCI6MjA3OTE2NTY2NH0.kcGWLo6b8NwI5o2JtvGtk6khlDtSzBYSvvDoSfjux44
NEXT_PUBLIC_OPENWEATHER_API_KEY=8e299fcf763572d21d11610d42a1ff7e
```

**설정 방법**:
1. Cloudflare Dashboard → Workers & Pages → goldpen
2. Settings → Environment variables
3. Production 탭에서 각 변수 추가/확인
4. Save 후 Redeploy

---

### 2. DNS 설정 확인

**필요한 DNS 레코드**:

```
# Frontend
Type: CNAME
Name: goldpen.kr (또는 @)
Content: goldpen.pages.dev
Proxy: Enabled (주황색 구름)

# BFF API (이미 자동 설정됨)
Type: CNAME
Name: api
Content: (Cloudflare Workers 자동 설정)
Proxy: Enabled
```

**확인 방법**:
```bash
# Frontend DNS 확인
nslookup goldpen.kr

# BFF API DNS 확인
nslookup api.goldpen.kr
```

---

### 3. Cloudflare Pages 빌드 상태 확인

**확인 위치**: https://dash.cloudflare.com → Workers & Pages → goldpen → Deployments

**체크 사항**:
- [ ] 최신 커밋 (`8940d0d`)이 빌드 중/성공했는가?
- [ ] 빌드 로그에 에러가 없는가?
- [ ] `Module not found: Can't resolve 'fs'` 에러 해결되었는가?

**빌드 성공 시 URL**: https://goldpen.pages.dev

---

### 4. 프로덕션 배포 테스트

배포가 완료되면 다음을 테스트:

```bash
# 1. Frontend 접속
curl -I https://goldpen.kr
# 또는 브라우저에서 https://goldpen.kr 열기

# 2. BFF API 헬스체크
curl https://api.goldpen.kr/health

# 3. 로그인 테스트
# 브라우저에서 https://goldpen.kr/login 접속
# Email: admin@goldpen.kr
# Password: 12345678
```

---

## 🔧 문제 해결

### 빌드 실패 시

1. **Cloudflare Pages** → **goldpen** → **Deployments**
2. 실패한 배포 클릭
3. **Build log** 확인
4. 에러 수정 후 다시 push

### 환경 변수 문제

1. **Settings** → **Environment variables** 확인
2. 변수명 오타 확인 (특히 `NEXT_PUBLIC_` 접두사)
3. 값이 올바른지 확인
4. **Redeploy** 클릭

### 로그인 실패 시

1. 브라우저 개발자 도구 (F12) 열기
2. **Console** 탭에서 에러 확인
3. **Network** 탭에서 API 요청 확인:
   - `/api/auth/login` 요청이 `api.goldpen.kr`로 가는가?
   - Response 확인
4. Supabase Dashboard에서 Users 테이블 확인:
   - `admin@goldpen.kr` 유저 존재 확인

---

## 📊 배포 아키텍처

```
                           Internet
                              |
                    ┌─────────┴─────────┐
                    |                   |
            goldpen.kr         api.goldpen.kr
                    |                   |
         ┌──────────▼─────────┐  ┌─────▼──────┐
         | Cloudflare Pages   |  | Workers    |
         | (Next.js Frontend) |  | (Hono API) |
         └──────────┬─────────┘  └─────┬──────┘
                    |                   |
                    └─────────┬─────────┘
                              |
                    ┌─────────▼─────────┐
                    | Supabase          |
                    | (PostgreSQL Auth) |
                    └───────────────────┘
      https://vdxxzygqjjjptzlvgrtw.supabase.co
```

---

## 🔐 중요 정보

**Admin 계정**:
- Email: `admin@goldpen.kr`
- Password: `12345678`
- User ID: `e9f6b5e9-da82-4409-8e07-1fd194273a33`
- Organization ID: `3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3`

**Production Database**:
- URL: https://vdxxzygqjjjptzlvgrtw.supabase.co
- Project Name: GoldPen Production

---

## 📝 배포 히스토리

| 날짜 | 컴포넌트 | 커밋 | 상태 |
|------|---------|------|------|
| 2025-11-20 | BFF Workers | `8940d0d` | ✅ 배포 완료 |
| 2025-11-20 | Frontend Pages | `8940d0d` | ⏳ 빌드 중 |

---

**다음 확인 사항**: Cloudflare Pages 빌드 완료 여부
