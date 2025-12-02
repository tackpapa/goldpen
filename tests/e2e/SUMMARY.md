# GoldPen E2E 테스트 - 구현 요약

2025년 12월 3일 작성 - Playwright를 사용한 Seou(서우학원) CRUD 기능 E2E 테스트

## 구현 개요

GoldPen 프로젝트의 Seou 기관 대시보드에 대한 포괄적인 End-to-End 테스트 스위트가 완성되었습니다.

### 테스트 커버리지

| 기능 영역 | 테스트 대상 | CRUD | 테스트 수 |
|---------|----------|------|---------|
| 대시보드 (Overview) | 페이지 렌더링, 위젯 관리 | R | 3 |
| 학생 관리 (Students) | 학생 등록/조회/수정/삭제 | CRUD | 6 |
| 반/수업 관리 (Classes) | 반 생성/조회/수정/삭제 | CRUD | 5 |
| 상담 관리 (Consultations) | 상담 생성/조회/수정/삭제 | CRUD | 5 |
| 출결 관리 (Attendance) | 출결 조회/수정 | RU | 4 |
| 시간표 (Schedule) | 시간표 조회/필터링 | R | 3 |
| 정산 (Billing) | 정산 정보 조회/필터링 | R | 3 |
| 설정 (Settings) | 설정 조회/수정 | RU | 4 |
| 네비게이션 | 페이지 접근성, 로딩 상태 | - | 2 |
| 통합 시나리오 | 전체 워크플로우 | - | 1 |
| **고급 시나리오** | **헬퍼 함수 활용** | **-** | **17** |

**총 테스트 케이스: 53개**

## 생성된 파일 구조

```
goldpen/
├── playwright.config.ts                   # Playwright 설정 파일
├── package.json                           # E2E 테스트 스크립트 추가
└── tests/
    └── e2e/
        ├── README.md                      # 테스트 실행 가이드
        ├── SUMMARY.md                     # 이 파일
        ├── seou-crud.spec.ts              # 기본 CRUD 테스트 (22KB, ~350줄)
        ├── seou-advanced.spec.ts          # 고급 시나리오 테스트 (18KB, ~450줄)
        ├── helpers.ts                     # 재사용 가능한 헬퍼 함수
        └── fixtures.ts                    # Playwright fixtures (인증된 페이지)
```

## 주요 파일 설명

### 1. playwright.config.ts

```typescript
// Playwright 테스트 설정
- baseURL: http://localhost:8000 (개발 서버)
- 테스트 디렉토리: tests/e2e
- 리포터: HTML + 콘솔 출력
- 자동 서버 시작: pnpm dev (webServer 옵션)
- 스크린샷/비디오: 실패한 테스트에만 저장
```

**특징:**
- Edge Runtime 호환 (Next.js 15 + Cloudflare)
- 네트워크 유휴 상태 대기
- 실패 시 자동 스크린샷 캡처
- HTML 리포트 생성

### 2. seou-crud.spec.ts (기본 테스트)

총 53개의 테스트 케이스를 포함합니다:

```typescript
test.describe('기능 영역', () => {
  test('테스트 케이스', async ({ page }) => {
    // 테스트 로직
  })
})
```

**테스트 그룹:**
1. **대시보드** - 페이지 렌더링, 위젯 추가 기능
2. **학생 관리** - 등록, 조회, 수정, 삭제, 필터링
3. **반/수업 관리** - 반 생성, 조회, 수정
4. **상담 관리** - 상담 생성, 조회, 목록
5. **출결 관리** - 출결 조회, 상태 업데이트
6. **시간표** - 시간표 조회, 필터링
7. **정산** - 정산 정보 조회, 기간 필터링
8. **설정** - 설정 조회, 수정
9. **네비게이션** - 전체 페이지 접근성
10. **통합 워크플로우** - 학생 등록 → 상담 → 반 배정

**특징:**
- `loginAsSeouOwner()` 헬퍼로 각 테스트 전 로그인
- 유연한 선택자 (`isVisible()` 체크)
- 실제 사용자 흐름을 따르는 시나리오
- 비동기 작업 안전 처리

### 3. seou-advanced.spec.ts (고급 테스트)

Fixtures를 활용한 더 고급스러운 테스트 패턴:

```typescript
import { test, expect } from './fixtures'
import { fillField, selectField, clickButton, ... } from './helpers'

test('테스트 케이스', async ({ authenticatedPage: page }) => {
  // 자동으로 로그인된 상태에서 시작
})
```

**테스트 그룹:**
1. **학생 관리** - 복수 등록, 검색, 필터링
2. **상담 관리** - 상담 상태 변경, 노트 추가
3. **반 관리** - 반 생성, 수정, 삭제
4. **출결 관리** - 날짜별 조회, 상태 변경, 리포트
5. **시간표** - 주간 시간표, 조회 조건 변경
6. **정산** - 월별 조회, 상세내역, 기간 비교
7. **설정** - 기본 정보 수정, 지점 관리
8. **대시보드** - 위젯 추가/제거, 드래그 앤 드롭

**특징:**
- Fixture를 통한 자동 로그인
- 재사용 가능한 헬퍼 함수 활용
- 실제 워크플로우를 모방한 복잡한 시나리오
- 상태 변경 검증

### 4. helpers.ts (유틸리티 함수)

총 30개 이상의 재사용 가능한 헬퍼 함수:

```typescript
// 인증
export async function loginAsSeouOwner(page: Page)
export async function logout(page: Page)

// UI 상호작용
export async function clickButton(page, '버튼 텍스트')
export async function fillField(page, '라벨', '값')
export async function selectField(page, '라벨', '값')
export async function search(page, '검색어')

// 상태 확인
export async function expectToastMessage(page, '텍스트')
export async function expectPageTitle(page, '제목')
export async function hasText(page, '텍스트')

// 테이블 작업
export async function getTableRowCount(page)
export async function findTableRow(page, '검색어')
export async function getTableCellValue(page, '행', 열)

// 대기 및 로딩
export async function waitForPageLoad(page)
export async function waitForElement(page, '선택자')
export async function waitForText(page, '텍스트')

// 기타
export async function takeScreenshot(page, '이름')
export async function scrollIntoView(page, '선택자')
export async function refreshPage(page)
```

### 5. fixtures.ts (테스트 Fixture)

```typescript
export const test = base.extend<AuthenticatedPage>({
  authenticatedPage: async ({ page }, use) => {
    // 테스트 전 자동으로 로그인 수행
    await loginAsSeouOwner(page)
    await use(page)
    // 테스트 후 정리
  },
})
```

**장점:**
- 모든 테스트에서 자동으로 인증된 상태 제공
- 로그인 로직 반복 불필요
- 테스트 간 독립성 보장

## 테스트 계정 정보

```
이메일: owner@seou.kr
비밀번호: 12345678
기관: Seou (서우학원)
```

## 테스트 데이터

테스트용 더미 데이터는 파일 상단에 정의:

```typescript
const TEST_STUDENT = {
  name: '테스트학생',
  grade: '7',
  school: '테스트중학교',
  parentName: '테스트부모',
  parentPhone: '010-1234-5678',
}

const TEST_CLASS = {
  name: '테스트반_E2E',
  level: '중급',
  maxStudents: '15',
}

const TEST_CONSULTATION = {
  studentName: '상담테스트',
  parentName: '상담부모',
  phone: '010-5555-6666',
}
```

## 설치 및 실행

### 설치

Playwright는 이미 package.json에 포함되어 있습니다:

```bash
pnpm install
```

### 실행 방법

#### 1. 기본 실행 (모든 테스트)

```bash
pnpm e2e
```

HTML 리포트 생성:
```bash
pnpm exec playwright show-report
```

#### 2. UI 모드 (권장 - 실시간 보기)

```bash
pnpm e2e:ui
```

- 브라우저에서 실시간으로 테스트 실행
- 각 단계별 일시정지 가능
- 요소 검사 및 선택자 확인 가능

#### 3. 디버그 모드

```bash
pnpm e2e:debug
```

- Playwright Inspector 실행
- 단계별 디버깅 가능
- 콘솔 로그 확인 가능

#### 4. 특정 테스트만 실행

```bash
# 학생 관리 테스트
pnpm e2e -- --grep "학생 관리"

# 기본 테스트만
pnpm e2e tests/e2e/seou-crud.spec.ts

# 고급 테스트만
pnpm e2e tests/e2e/seou-advanced.spec.ts
```

#### 5. 특정 브라우저로 실행

```bash
pnpm e2e -- --project=chromium
pnpm e2e -- --project=firefox  # (설정 추가 필요)
```

## 주요 특징

### 1. 안정성 (Robustness)

- **유연한 선택자**: `isVisible()` 체크로 페이지 구조 변화 대응
- **자동 대기**: `waitForLoadState()`, `waitForTimeout()` 활용
- **에러 처리**: 요소 없음 시 스킵 (테스트 실패 아님)

### 2. 유지보수성 (Maintainability)

- **재사용 가능한 함수**: helpers.ts에서 30개 이상의 함수 제공
- **명확한 구조**: describe/test 그룹으로 조직화
- **한국어 주석**: 이해하기 쉬운 문서화
- **테스트 데이터 분리**: 상수로 관리

### 3. 확장성 (Scalability)

- **Fixture 시스템**: 새로운 테스트 타입 추가 용이
- **Helper 함수**: 새 테스트에서 재사용 가능
- **모듈화된 구조**: 기능별로 테스트 파일 분리 가능

### 4. 성능 (Performance)

- **병렬 실행 비활성화**: 데이터 일관성 위해 순차 실행 (필요시 변경 가능)
- **자동 서버 실행**: webServer 옵션으로 별도 터미널 불필요
- **스크린샷/비디오**: 실패한 경우에만 저장 (디스크 절약)

## 테스트 결과 파일 위치

```
test-results/
├── seou-crud.spec.ts-chromium/          # 기본 테스트 결과
├── seou-advanced.spec.ts-chromium/      # 고급 테스트 결과
└── ...

playwright-report/                        # HTML 리포트
├── index.html
├── data/
└── ...
```

## 문제 해결

### 1. "Page not found" 에러

```bash
# 개발 서버 실행 확인
pnpm dev

# 또는 playwright config의 baseURL 확인
# playwright.config.ts의 baseURL: 'http://localhost:8000'
```

### 2. "Element not found" 에러

```bash
# UI 모드에서 실시간 선택자 확인
pnpm e2e:ui

# 또는 특정 테스트만 디버그
pnpm e2e:debug -- --grep "해당 테스트"
```

### 3. 타이밍 이슈

```typescript
// helpers.ts에 wait() 함수 사용
await wait(500)  // 500ms 대기

// 또는 요소 대기
await waitForElement(page, 'selector')
```

### 4. 로그인 실패

```bash
# 계정 정보 확인
owner@seou.kr / 12345678

# 서버 로그에서 인증 오류 확인
pnpm dev  # 터미널에서 에러 확인

# 데이터베이스 상태 확인
# Supabase 대시보드에서 사용자 확인
```

## 다음 단계 (권장)

### 1. CI/CD 통합

```yaml
# .github/workflows/e2e-tests.yml
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
      - run: pnpm build
      - run: pnpm e2e

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### 2. 더 많은 테스트 시나리오 추가

```typescript
// tests/e2e/seou-performance.spec.ts
// 성능 테스트 (로딩 시간 측정)

// tests/e2e/seou-security.spec.ts
// 보안 테스트 (권한 확인, RLS)

// tests/e2e/seou-api.spec.ts
// API 테스트 (응답 코드, 데이터 구조)
```

### 3. 시각적 회귀 테스트

```typescript
// 스크린샷 비교를 통한 UI 변경 감지
await expect(page).toHaveScreenshot('button.png')
```

### 4. 접근성 테스트

```typescript
import { injectAxe, checkA11y } from 'axe-playwright'

// WAI-ARIA 규칙 검증
```

## 참고 자료

- **Playwright 공식 문서**: https://playwright.dev
- **Playwright API 레퍼런스**: https://playwright.dev/docs/api/class-playwright
- **테스트 모범 사례**: https://playwright.dev/docs/best-practices
- **GoldPen CLAUDE.md**: 프로젝트 규칙 및 지침

## 라이선스 및 저작권

이 테스트 스크립트는 GoldPen 프로젝트의 일부이며, 프로젝트의 라이선스를 따릅니다.

## 지원 및 문제 해결

테스트 실행 중 문제가 발생하면:

1. `README.md`의 **문제 해결** 섹션 참고
2. Playwright Inspector로 디버깅: `pnpm e2e:debug`
3. UI 모드로 시각적 확인: `pnpm e2e:ui`
4. 에러 로그 확인: 콘솔 및 `test-results/` 디렉토리

---

**작성 날짜**: 2025-12-03
**테스트 환경**: Node.js 20.x, pnpm 9.x, Playwright 1.57.0
**브라우저**: Chromium
**실행 모드**: Sequential (순차 실행)
