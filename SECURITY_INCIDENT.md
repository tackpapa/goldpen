# 🚨 보안 사고 보고서

**발생일시**: 2025-11-20
**심각도**: CRITICAL

## 사고 내역

GitHub repository에 Supabase service_role 키가 노출되었습니다.

**노출된 파일**:
- `test-edge-client.mjs` (삭제됨)
- `reset-admin-password.mjs` (삭제됨)
- `simple-migration.mjs` (삭제됨)
- `run-migration.mjs` (삭제됨)
- `check-admin-auth.mjs` (삭제됨)

## 즉시 조치사항

### 1. Supabase API 키 재발급 (필수)

**즉시 실행해야 할 작업**:

1. Supabase Dashboard 접속:
   https://supabase.com/dashboard/project/vdxxzygqjjjptzlvgrtw/settings/api

2. Service Role Key 재발급:
   - "Reset Service Role Key" 버튼 클릭
   - 새 키 복사 후 안전한 장소에 저장

3. 환경 변수 업데이트:
   - `.env.development.local` 업데이트 (로컬 개발)
   - Cloudflare Pages 환경 변수 업데이트 (프로덕션)

### 2. Git 히스토리 정리

```bash
# BFG Repo-Cleaner 사용 (권장)
# 1. Java 설치 확인
java -version

# 2. BFG 다운로드
# https://rtyley.github.io/bfg-repo-cleaner/

# 3. 민감 정보가 포함된 파일 삭제
java -jar bfg.jar --delete-files "{test-edge-client.mjs,reset-admin-password.mjs,simple-migration.mjs,run-migration.mjs,check-admin-auth.mjs}"

# 4. Git reflog 정리
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# 5. Force push
git push origin main --force
```

### 3. 접근 로그 확인

Supabase Dashboard에서 다음을 확인:
- 비정상적인 API 호출 로그
- 예상치 못한 데이터 변경사항
- 새로운 관리자 계정 생성 여부

## 재발 방지책

### 1. .gitignore 업데이트 완료 ✅

```gitignore
test-*.mjs
verify-*.mjs
*-migration.mjs
reset-*.mjs
```

### 2. Pre-commit Hook 설정 (권장)

```bash
# .git/hooks/pre-commit 생성
cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash
if git diff --cached --name-only | grep -E '\.mjs$'; then
  echo "❌ Blocking commit: .mjs files detected"
  echo "These files may contain secrets."
  exit 1
fi
HOOK

chmod +x .git/hooks/pre-commit
```

### 3. GitHub Secret Scanning 활성화

Repository Settings → Security → Enable secret scanning

## 체크리스트

- [x] 노출된 파일 삭제
- [x] .gitignore 업데이트
- [ ] Supabase service_role 키 재발급
- [ ] Git 히스토리 정리 (BFG)
- [ ] 접근 로그 검토
- [ ] Pre-commit hook 설정
- [ ] GitHub Secret Scanning 활성화

## 학습 사항

**절대 금지**:
- service_role 키를 코드에 하드코딩
- 테스트/마이그레이션 스크립트를 Git에 커밋
- 임시 파일을 .gitignore에 추가하지 않고 작업

**권장 사항**:
- 환경 변수만 사용 (.env 파일)
- Supabase CLI 사용 (로컬 마이그레이션)
- GitHub Actions Secrets 사용 (CI/CD)
