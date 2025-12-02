# GoldPen E2E 테스트 가이드

Playwright를 사용한 GoldPen 프로젝트의 End-to-End 테스트 스크립트입니다.

## 테스트 대상

Seou(서우학원) 기관의 다음 페이지 및 기능을 테스트합니다:

1. **대시보드** (`/seou/overview`) - Read 전용
   - 페이지 렌더링 확인
   - 위젯 추가 기능

2. **학생 관리** (`/seou/students`) - CRUD
   - 학생 등록 (Create)
   - 학생 목록 조회 (Read)
   - 학생 정보 수정 (Update)
   - 학생 삭제 (Delete)

3. **반/수업 관리** (`/seou/classes`) - CRUD
   - 반 생성 (Create)
   - 반 목록 조회 (Read)
   - 반 정보 수정 (Update)
   - 반 삭제 (Delete)

4. **상담 관리** (`/seou/consultations`) - CRUD
   - 상담 생성 (Create)
   - 상담 목록 조회 (Read)
   - 상담 정보 수정 (Update)
   - 상담 삭제 (Delete)

5. **출결 관리** (`/seou/attendance`) - Read, Update
   - 출결 정보 조회 (Read)
   - 출결 상태 업데이트 (Update)

6. **시간표/스케줄** (`/seou/schedule`) - Read 전용
   - 시간표 조회 (Read)
   - 필터/검색 기능

7. **정산/비용** (`/seou/billing`) - Read 전용
   - 정산 정보 조회 (Read)
   - 기간별 필터링

8. **설정** (`/seou/settings`) - Read, Update
   - 설정 정보 조회 (Read)
   - 설정 정보 수정 (Update)

## 사전 준비

### 필수 조건

- Node.js 20.0.0 이상
- pnpm 9.0.0 이상
- Playwright가 설치되어 있음 (package.json에 포함)

### 테스트 계정 정보

- **이메일**: `owner@seou.kr`
- **비밀번호**: `12345678`

### 테스트 환경 설정

1. 개발 서버 실행 (포트 8000):
```bash
pnpm dev
```

테스트는 `playwright.config.ts`의 `webServer` 설정을 통해 자동으로 서버를 실행할 수 있습니다.

## 테스트 실행 방법

### 1. 전체 E2E 테스트 실행

```bash
pnpm e2e
```

기본적으로 모든 테스트를 실행하고 HTML 리포트를 생성합니다.

### 2. UI 모드로 테스트 실행 (권장)

```bash
pnpm e2e:ui
```

- 브라우저에서 실시간으로 테스트를 보며 실행할 수 있습니다
- 각 테스트 단계별로 일시정지할 수 있습니다
- 더블 클릭으로 특정 테스트만 실행 가능합니다

### 3. 디버그 모드로 테스트 실행

```bash
pnpm e2e:debug
```

- Playwright Inspector가 열려서 단계별 디버깅이 가능합니다
- 각 액션 전에 일시정지할 수 있습니다

### 4. 특정 테스트만 실행

```bash
# 학생 관리 테스트만 실행
pnpm e2e -- --grep "학생 관리"

# 대시보드 테스트만 실행
pnpm e2e -- --grep "대시보드"
```

### 5. 특정 파일만 실행

```bash
pnpm e2e tests/e2e/seou-crud.spec.ts
```

## 테스트 결과 확인

### HTML 리포트 보기

테스트 실행 후 HTML 리포트를 확인할 수 있습니다:

```bash
pnpm exec playwright show-report
```

또는 다음 디렉토리에서 직접 확인:
- `test-results/` - 테스트 결과
- `playwright-report/` - HTML 리포트

### 스크린샷 및 비디오

- 실패한 테스트에만 스크린샷과 비디오가 저장됩니다
- 위치: `test-results/` 디렉토리

## 테스트 구조

### seou-crud.spec.ts

테스트 파일은 다음과 같은 구조로 되어 있습니다:

```typescript
test.describe('기능 영역', () => {
  test('개별 테스트 케이스', async ({ page }) => {
    // 테스트 코드
  })
})
```

### 주요 헬퍼 함수

#### login(page)
Seou 계정으로 로그인하고 대시보드로 이동합니다.

```typescript
async function login(page: Page) {
  // owner@seou.kr로 로그인
  // 대시보드로 리다이렉트 대기
}
```

### 테스트 데이터

테스트용 더미 데이터는 파일 상단에 정의되어 있습니다:

- `TEST_ACCOUNT` - 로그인 계정
- `TEST_STUDENT` - 학생 등록용 데이터
- `TEST_CLASS` - 반 생성용 데이터
- `TEST_CONSULTATION` - 상담 생성용 데이터

## 주의사항

### 1. 페이지 선택자의 유연성

페이지 구조가 변할 수 있으므로, 많은 선택자가 `isVisible()` 체크를 포함합니다:

```typescript
const button = page.locator('button:has-text("삭제")')
if (await button.isVisible()) {
  await button.click()
}
```

### 2. 비동기 작업 대기

모든 네비게이션 후에는 `waitForLoadState()`를 사용합니다:

```typescript
await page.goto('/seou/students')
await page.waitForLoadState('networkidle')
```

### 3. 타이밍 이슈 처리

프론트엔드 로직의 타이밍을 위해 필요시 `waitForTimeout()`을 사용합니다:

```typescript
await page.waitForTimeout(300) // 애니메이션 대기
```

## CI/CD 통합

### GitHub Actions 예시

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm e2e

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 문제 해결

### 테스트가 실패하는 경우

1. **서버가 실행 중인지 확인**:
   ```bash
   pnpm dev
   ```

2. **환경 변수 확인**:
   - `.env.local` 파일이 있는지 확인
   - Supabase URL과 키가 올바른지 확인

3. **네트워크 연결 확인**:
   - localhost:8000이 접근 가능한지 확인
   - 방화벽 설정 확인

4. **디버그 모드로 실행**:
   ```bash
   pnpm e2e:debug
   ```

5. **로그 확인**:
   - 브라우저 콘솔 로그를 Playwright Inspector에서 확인
   - 서버의 에러 로그 확인

### "Page not found" 에러

`playwright.config.ts`의 `baseURL`이 `http://localhost:8000`으로 설정되어 있는지 확인하세요.

### "Element not found" 에러

선택자가 변경되었을 수 있습니다. 다음과 같이 확인하세요:

```bash
pnpm e2e:ui
```

UI 모드에서 실시간으로 요소를 검사하고 선택자를 업데이트할 수 있습니다.

## 테스트 유지보수

### 주기적인 업데이트

1. **페이지 구조 변경 시**:
   - 해당 페이지의 선택자 업데이트
   - 필요시 새로운 테스트 케이스 추가

2. **새로운 기능 추가 시**:
   - 기능에 대한 테스트 케이스 작성
   - 통합 테스트 섹션 업데이트

3. **버그 발견 시**:
   - 회귀 테스트로 버그를 재현하는 테스트 작성
   - 버그 수정 후 테스트 통과 확인

## 참고 자료

- [Playwright 공식 문서](https://playwright.dev)
- [Playwright API 레퍼런스](https://playwright.dev/docs/api/class-playwright)
- [테스트 모범 사례](https://playwright.dev/docs/best-practices)

## 라이선스

이 테스트 스크립트는 GoldPen 프로젝트의 일부입니다.
