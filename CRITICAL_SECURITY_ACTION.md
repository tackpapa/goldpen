# 🚨 긴급 보안 조치 - 전체 키 회전 필요

**심각도**: CRITICAL
**발생일시**: 2025-11-20

## 노출된 키 목록

### 1. Supabase Keys (가장 중요)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - 공개 키 (재발급 필요)
- `Service Role Key` - 관리자 키 (재발급 필수)

### 2. OpenWeatherMap API Key
- `NEXT_PUBLIC_OPENWEATHER_API_KEY` (무료 플랜이면 영향 적음)

## 즉시 실행해야 할 작업 (순서대로)

### STEP 1: Supabase 프로젝트 재생성 (권장)

**가장 안전한 방법**:
1. 새 Supabase 프로젝트 생성
2. 기존 DB를 덤프하여 새 프로젝트로 이전
3. 모든 키가 완전히 새로운 값으로 변경됨

**또는 키만 재발급**:
1. Supabase Dashboard: https://supabase.com/dashboard/project/vdxxzygqjjjptzlvgrtw/settings/api
2. "Reset anon key" 클릭
3. "Reset service_role key" 클릭
4. 새 JWT Secret 생성 (Settings → API → JWT Secret → Regenerate)

### STEP 2: OpenWeatherMap API Key 재발급

1. https://home.openweathermap.org/api_keys
2. 기존 키 삭제
3. 새 키 생성

### STEP 3: Git 히스토리 완전 삭제 (BFG)

```bash
# 1. 백업 생성
cp -r .git .git.backup

# 2. BFG Repo-Cleaner 다운로드
# https://rtyley.github.io/bfg-repo-cleaner/

# 3. 민감 파일 완전 삭제
java -jar bfg.jar --delete-files "test-admin-login.mjs"
java -jar bfg.jar --delete-files "{test-edge-client.mjs,reset-admin-password.mjs,simple-migration.mjs,run-migration.mjs,check-admin-auth.mjs}"

# 4. Git 정리
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Force push (주의: 협업 중이면 팀원들에게 알릴 것)
git push origin main --force
```

### STEP 4: 환경 변수 업데이트

**로컬 개발**:
```bash
# .env.development.local 업데이트
NEXT_PUBLIC_SUPABASE_URL=<새 프로젝트 URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<새 anon key>
NEXT_PUBLIC_OPENWEATHER_API_KEY=<새 weather key>
```

**프로덕션 (Cloudflare Pages)**:
```bash
# Cloudflare Pages 환경 변수 업데이트
wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL
wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
wrangler pages secret put NEXT_PUBLIC_OPENWEATHER_API_KEY
```

### STEP 5: 보안 점검

**Supabase**:
- Dashboard → Logs → API Logs 확인
- 비정상적인 쿼리, 데이터 수정 확인
- 새로운 관리자 계정 생성 여부 확인

**GitHub**:
- Repository Insights → Traffic → Git clones 확인
- 의심스러운 클론 활동 확인

## 재발 방지책

### 1. Pre-commit Hook 설치

```bash
cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash

# .mjs 파일 차단
if git diff --cached --name-only | grep -E '\\.mjs$'; then
  echo "❌ ERROR: .mjs files cannot be committed"
  exit 1
fi

# API 키 패턴 검색
if git diff --cached | grep -iE 'api[_-]?key|secret|password|token' | grep -v 'PLACEHOLDER'; then
  echo "❌ ERROR: Potential API key detected"
  exit 1
fi

exit 0
HOOK

chmod +x .git/hooks/pre-commit
```

### 2. GitHub Secret Scanning 활성화

Settings → Security → Code security → Enable all features

### 3. .gitignore 검증

```bash
# 현재 .gitignore에 추가됨
*.env.local
*.env.*.local
test-*.mjs
reset-*.mjs
*-migration.mjs
```

## 체크리스트

- [ ] Supabase 키 재발급 또는 프로젝트 재생성
- [ ] OpenWeatherMap API 키 재발급
- [ ] Git 히스토리 정리 (BFG)
- [ ] Force push 실행
- [ ] 로컬 환경 변수 업데이트
- [ ] Cloudflare Pages 환경 변수 업데이트
- [ ] Supabase 접근 로그 검토
- [ ] GitHub 클론 로그 검토
- [ ] Pre-commit hook 설치
- [ ] GitHub Secret Scanning 활성화

## 타임라인

- **2025-11-20 19:30** - 보안 경고 수신
- **2025-11-20 19:35** - 민감 파일 삭제 완료
- **2025-11-20 19:40** - .gitignore 업데이트 완료
- **대기 중** - 사용자의 키 재발급 및 Git 히스토리 정리
