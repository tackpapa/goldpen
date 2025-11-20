import { test, expect } from '@playwright/test'

// 테스트용 신규 유저 정보
const testUser = {
  email: `test.user.${Date.now()}@goldpen.com`,
  password: 'TestPassword123!',
  name: 'E2E 테스트 사용자',
  organizationName: 'E2E 테스트 학원'
}

test.describe('신규 유저 회원가입 및 전체 플로우 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 프로덕션 URL로 이동
    await page.goto('https://goldpen.kr')
  })

  test('회원가입 -> 로그인 -> 전체 페이지 네비게이션', async ({ page }) => {
    console.log('=== 1. 회원가입 시작 ===')

    // 회원가입 페이지로 이동
    await page.goto('https://goldpen.kr/signup')
    await page.waitForLoadState('networkidle')

    // 회원가입 폼 작성
    await page.fill('input[name="email"]', testUser.email)
    await page.fill('input[name="password"]', testUser.password)
    await page.fill('input[name="name"]', testUser.name)
    await page.fill('input[name="organizationName"]', testUser.organizationName)

    // 회원가입 버튼 클릭
    await page.click('button[type="submit"]')

    // 회원가입 완료 대기 (URL 변경 또는 성공 메시지)
    await page.waitForTimeout(2000)

    console.log('=== 2. 로그인 시작 ===')

    // 로그인 페이지로 이동
    await page.goto('https://goldpen.kr/login')
    await page.waitForLoadState('networkidle')

    // 로그인 폼 작성
    await page.fill('input[name="email"]', testUser.email)
    await page.fill('input[name="password"]', testUser.password)

    // 로그인 버튼 클릭
    await page.click('button[type="submit"]')

    // 로그인 완료 대기
    await page.waitForTimeout(3000)

    console.log('=== 3. 대시보드 페이지 확인 ===')

    // 대시보드 URL 패턴 확인 (organization name이 URL에 포함될 수 있음)
    const currentUrl = page.url()
    console.log('Current URL:', currentUrl)

    // 스크린샷 저장
    await page.screenshot({ path: 'tests/screenshots/01-after-login.png', fullPage: true })

    console.log('=== 4. 주요 페이지 네비게이션 테스트 ===')

    // 테스트할 페이지 목록 (빈 페이지 상태 확인)
    const pagesToTest = [
      { name: 'Overview', path: 'overview', selector: 'h1, h2, [data-testid="page-title"]' },
      { name: 'Students', path: 'students', selector: 'h1, h2, [data-testid="students-page"]' },
      { name: 'Classes', path: 'classes', selector: 'h1, h2, [data-testid="classes-page"]' },
      { name: 'Teachers', path: 'teachers', selector: 'h1, h2, [data-testid="teachers-page"]' },
      { name: 'Attendance', path: 'attendance', selector: 'h1, h2, [data-testid="attendance-page"]' },
      { name: 'Consultations', path: 'consultations', selector: 'h1, h2, [data-testid="consultations-page"]' },
      { name: 'Lessons', path: 'lessons', selector: 'h1, h2, [data-testid="lessons-page"]' },
      { name: 'Homework', path: 'homework', selector: 'h1, h2, [data-testid="homework-page"]' },
      { name: 'Exams', path: 'exams', selector: 'h1, h2, [data-testid="exams-page"]' },
      { name: 'Billing', path: 'billing', selector: 'h1, h2, [data-testid="billing-page"]' },
      { name: 'Expenses', path: 'expenses', selector: 'h1, h2, [data-testid="expenses-page"]' },
      { name: 'Rooms', path: 'rooms', selector: 'h1, h2, [data-testid="rooms-page"]' },
      { name: 'Seats', path: 'seats', selector: 'h1, h2, [data-testid="seats-page"]' },
      { name: 'Settings', path: 'settings', selector: 'h1, h2, [data-testid="settings-page"]' },
    ]

    const pageResults: any[] = []

    for (const pageInfo of pagesToTest) {
      console.log(`\n--- Testing ${pageInfo.name} page ---`)

      try {
        // 페이지로 이동 (organization name이 URL에 포함되어야 할 수 있음)
        // 현재 URL에서 organization part 추출
        const orgMatch = currentUrl.match(/\/([^\/]+)\/(overview|students|dashboard)/)
        const orgPart = orgMatch ? orgMatch[1] : 'goldpen'

        const pageUrl = `https://goldpen.kr/${orgPart}/${pageInfo.path}`
        await page.goto(pageUrl)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000)

        // 페이지 타이틀 확인
        const pageTitle = await page.locator(pageInfo.selector).first().textContent()
        console.log(`  ✓ Page title: ${pageTitle}`)

        // 에러 메시지 확인
        const errorElement = await page.locator('text=/error|에러|오류/i').first()
        const hasError = await errorElement.isVisible().catch(() => false)

        // 빈 상태 메시지 확인
        const emptyStateElement = await page.locator('text=/no data|empty|비어있습니다|데이터가 없습니다/i').first()
        const hasEmptyState = await emptyStateElement.isVisible().catch(() => false)

        // 테이블 또는 리스트 확인
        const tableElement = await page.locator('table, [role="table"], ul[role="list"]').first()
        const hasTable = await tableElement.isVisible().catch(() => false)

        pageResults.push({
          page: pageInfo.name,
          url: pageUrl,
          title: pageTitle,
          hasError,
          hasEmptyState,
          hasTable,
          status: hasError ? '❌ ERROR' : hasEmptyState ? '✅ EMPTY' : hasTable ? '✅ HAS_DATA' : '⚠️ UNKNOWN'
        })

        // 스크린샷 저장
        await page.screenshot({
          path: `tests/screenshots/${pageInfo.path}.png`,
          fullPage: true
        })

        console.log(`  Status: ${pageResults[pageResults.length - 1].status}`)

      } catch (error: any) {
        console.error(`  ✗ Error loading ${pageInfo.name}:`, error.message)
        pageResults.push({
          page: pageInfo.name,
          url: `https://goldpen.kr/${pageInfo.path}`,
          error: error.message,
          status: '❌ ERROR'
        })
      }
    }

    console.log('\n=== 5. 테스트 결과 요약 ===')
    console.table(pageResults)

    // 결과 JSON 파일로 저장
    const fs = require('fs')
    const resultPath = 'tests/screenshots/test-results.json'
    fs.writeFileSync(resultPath, JSON.stringify({
      testUser: {
        email: testUser.email,
        name: testUser.name,
        organizationName: testUser.organizationName
      },
      timestamp: new Date().toISOString(),
      pageResults
    }, null, 2))

    console.log(`\n결과 파일 저장: ${resultPath}`)

    // 모든 페이지가 에러 없이 로드되었는지 확인
    const errorPages = pageResults.filter(r => r.status.includes('ERROR'))
    expect(errorPages.length).toBe(0)
  })
})
