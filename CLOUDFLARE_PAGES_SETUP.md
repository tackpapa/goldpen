# Cloudflare Pages 배포 가이드 - GoldPen

## 📋 Cloudflare Pages 프로젝트 생성

### 1️⃣ Cloudflare Dashboard 접속

```
https://dash.cloudflare.com/
```

1. **Workers & Pages** 클릭
2. **Create application** 버튼 클릭
3. **Pages** 탭 선택
4. **Connect to Git** 클릭

---

### 2️⃣ GitHub 저장소 연결

1. **GitHub 계정 연결** (최초 1회)
2. **저장소 선택**: `tackpapa/goldpen`
3. **Begin setup** 클릭

---

### 3️⃣ 빌드 설정 (중요!)

**프로젝트 이름**:
```
goldpen
```

**Production 브랜치**:
```
main
```

**Build command**:
```bash
npm run pages:build
```

**Build output directory**:
```
out
```

**Root directory (optional)**:
```
(비워두기)
```

---

### 4️⃣ 환경 변수 설정 (필수!)

**Production 환경 변수**:

| 변수 이름 | 값 |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vdxxzygqjjjptzlvgrtw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeHh6eWdxampqcHR6bHZncnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODk2NjQsImV4cCI6MjA3OTE2NTY2NH0.kcGWLo6b8NwI5o2JtvGtk6khlDtSzBYSvvDoSfjux44` |
| `NEXT_PUBLIC_APP_URL` | `https://goldpen.pages.dev` (또는 커스텀 도메인) |
| `NEXT_PUBLIC_OPENWEATHER_API_KEY` | `8e299fcf763572d21d11610d42a1ff7e` |

**설정 방법**:
1. 프로젝트 생성 후 **Settings** → **Environment variables**
2. **Production** 탭에서 각 변수 추가
3. **Save** 클릭

---

### 5️⃣ 빌드 & 배포

1. **Save and Deploy** 클릭
2. 첫 배포 시작 (약 2-5분 소요)
3. 배포 완료 후 URL 확인:
   ```
   https://goldpen.pages.dev
   ```

---

## 🔄 이후 배포 방법

### 자동 배포 (GitHub Push)

```bash
git add .
git commit -m "feat: 새 기능 추가"
git push origin main
```

→ Cloudflare Pages가 자동으로 감지하고 배포 시작

### 수동 배포 (로컬에서)

```bash
# 빌드
pnpm run pages:build

# 배포
pnpm run deploy
```

---

## 🌐 커스텀 도메인 연결

### goldpen.kr 도메인 연결

1. **Cloudflare Pages** → **goldpen** → **Custom domains**
2. **Set up a custom domain** 클릭
3. 도메인 입력: `goldpen.kr`
4. **Activate domain** 클릭
5. DNS 레코드 자동 생성 (Cloudflare DNS 사용 시)

**DNS 설정** (Cloudflare DNS):
```
Type: CNAME
Name: goldpen.kr (또는 @)
Content: goldpen.pages.dev
Proxy: Enabled (주황색 구름)
```

---

## ✅ 배포 확인 체크리스트

배포 후 확인할 사항:

- [ ] 페이지가 정상적으로 로드되는가?
- [ ] 로그인이 작동하는가? (`admin@goldpen.kr` / `12345678`)
- [ ] 프로덕션 Supabase DB에 연결되었는가?
- [ ] 환경 변수가 올바르게 로드되었는가?
- [ ] 빌드 에러가 없는가?

---

## 🚨 문제 해결

### 빌드 실패 시

1. **Cloudflare Pages** → **goldpen** → **Deployments**
2. 실패한 배포 클릭
3. **Build log** 확인
4. 에러 메시지 확인 후 수정

### 환경 변수 문제

1. **Settings** → **Environment variables** 확인
2. 변수명 오타 확인
3. 값이 올바른지 확인
4. **Redeploy** 클릭

### 로그인 실패 시

1. 브라우저 개발자 도구 (F12) 열기
2. **Console** 탭에서 에러 확인
3. **Network** 탭에서 API 요청 확인
4. Supabase URL이 프로덕션인지 확인

---

## 📞 참고 링크

- **Cloudflare Pages 문서**: https://developers.cloudflare.com/pages/
- **Next.js on Pages**: https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/
- **GitHub 저장소**: https://github.com/tackpapa/goldpen

---

**작성일**: 2025-11-20
**프로젝트**: GoldPen
**배포 플랫폼**: Cloudflare Pages
