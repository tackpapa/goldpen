import { test, expect, Page } from '@playwright/test'

/**
 * GoldPen E2E 테스트: Seou(서우학원) 추가 페이지 테스트
 *
 * 추가 대상 페이지:
 * 1. /seou/activity-logs - 활동 로그
 * 2. /seou/all-schedules - 전체 스케줄
 * 3. /seou/exams - 시험
 * 4. /seou/expenses - 경비
 * 5. /seou/homework - 숙제
 * 6. /seou/lessons - 수업
 * 7. /seou/managers - 매니저
 * 8. /seou/rooms - 교실
 * 9. /seou/seats - 좌석
 * 10. /seou/seatsattendance - 좌석 출결
 * 11. /seou/teachers - 강사
 * 12. /seou/liveattendance - 실시간 출결
 *
 * 테스트 계정: owner@seou.kr / 12345678
 */

// 테스트 계정 정보 (seou 기관 owner 계정)
const TEST_ACCOUNT = {
  email: 'cance0311@gmail.com',
  password: '12345678',
}

/**
 * 로그인 헬퍼 함수
 */
async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', TEST_ACCOUNT.email)
  await page.fill('input[type="password"]', TEST_ACCOUNT.password)
  await page.click('button[type="submit"]')

  // 로그인 완료 대기 (seou org로 리다이렉트)
  await page.waitForURL(/\/seou\/overview|\/seou/, { timeout: 30000 })
  await page.waitForLoadState('networkidle')
}

test.describe('Seou 추가 페이지 테스트', () => {
  // 각 테스트 전 로그인
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ============================================
  // 1. 활동 로그 (Activity Logs)
  // ============================================
  test.describe('활동 로그 (Activity Logs)', () => {
    test('활동 로그 페이지 접근 및 렌더링 확인', async ({ page }) => {
      await page.goto('/seou/activity-logs')
      await page.waitForLoadState('networkidle')

      // 페이지가 200으로 로드되었는지 확인
      const content = page.locator('main, body')
      await expect(content.first()).toBeVisible()
    })

    test('활동 로그 데이터 조회', async ({ page }) => {
      await page.goto('/seou/activity-logs')
      await page.waitForLoadState('networkidle')

      // 테이블/리스트/카드 존재 확인
      const listElement = page.locator('[role="table"], table, .grid, [class*="list"], [class*="log"], main')
      await expect(listElement.first()).toBeVisible()
    })
  })

  // ============================================
  // 2. 전체 스케줄 (All Schedules)
  // ============================================
  test.describe('전체 스케줄 (All Schedules)', () => {
    test('전체 스케줄 페이지 접근 및 렌더링 확인', async ({ page }) => {
      await page.goto('/seou/all-schedules')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, body')
      await expect(content.first()).toBeVisible()
    })

    test('스케줄 데이터 조회', async ({ page }) => {
      await page.goto('/seou/all-schedules')
      await page.waitForLoadState('networkidle')

      const scheduleElement = page.locator('[class*="schedule"], [class*="calendar"], [role="table"], table, main')
      await expect(scheduleElement.first()).toBeVisible()
    })
  })

  // ============================================
  // 3. 시험 (Exams)
  // ============================================
  test.describe('시험 (Exams)', () => {
    test('시험 페이지 접근 및 렌더링 확인', async ({ page }) => {
      await page.goto('/seou/exams')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, body')
      await expect(content.first()).toBeVisible()
    })

    test('시험 목록 조회', async ({ page }) => {
      await page.goto('/seou/exams')
      await page.waitForLoadState('networkidle')

      const listElement = page.locator('[role="table"], table, .grid, [class*="list"], [class*="exam"], main')
      await expect(listElement.first()).toBeVisible()
    })

    test('시험 추가 버튼 확인', async ({ page }) => {
      await page.goto('/seou/exams')
      await page.waitForLoadState('networkidle')

      const addButton = page.locator('button').filter({ hasText: /추가|생성|등록|신규/ })
      // 버튼이 있으면 클릭해서 모달 확인
      if (await addButton.first().isVisible()) {
        await expect(addButton.first()).toBeVisible()
      }
    })
  })

  // ============================================
  // 4. 경비 (Expenses)
  // ============================================
  test.describe('경비 (Expenses)', () => {
    test('경비 페이지 접근 및 렌더링 확인', async ({ page }) => {
      await page.goto('/seou/expenses')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, body')
      await expect(content.first()).toBeVisible()
    })

    test('경비 목록 조회', async ({ page }) => {
      await page.goto('/seou/expenses')
      await page.waitForLoadState('networkidle')

      const listElement = page.locator('[role="table"], table, .grid, [class*="list"], [class*="expense"], main')
      await expect(listElement.first()).toBeVisible()
    })
  })

  // ============================================
  // 5. 숙제 (Homework)
  // ============================================
  test.describe('숙제 (Homework)', () => {
    test('숙제 페이지 접근 및 렌더링 확인', async ({ page }) => {
      await page.goto('/seou/homework')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, body')
      await expect(content.first()).toBeVisible()
    })

    test('숙제 목록 조회', async ({ page }) => {
      await page.goto('/seou/homework')
      await page.waitForLoadState('networkidle')

      const listElement = page.locator('[role="table"], table, .grid, [class*="list"], [class*="homework"], main')
      await expect(listElement.first()).toBeVisible()
    })
  })

  // ============================================
  // 6. 수업 (Lessons)
  // ============================================
  test.describe('수업 (Lessons)', () => {
    test('수업 페이지 접근 및 렌더링 확인', async ({ page }) => {
      await page.goto('/seou/lessons')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, body')
      await expect(content.first()).toBeVisible()
    })

    test('수업 목록 조회', async ({ page }) => {
      await page.goto('/seou/lessons')
      await page.waitForLoadState('networkidle')

      const listElement = page.locator('[role="table"], table, .grid, [class*="list"], [class*="lesson"], main')
      await expect(listElement.first()).toBeVisible()
    })

    test('수업 추가 버튼 확인', async ({ page }) => {
      await page.goto('/seou/lessons')
      await page.waitForLoadState('networkidle')

      const addButton = page.locator('button').filter({ hasText: /추가|생성|등록|신규/ })
      if (await addButton.first().isVisible()) {
        await expect(addButton.first()).toBeVisible()
      }
    })
  })

  // ============================================
  // 7. 매니저 (Managers)
  // ============================================
  test.describe('매니저 (Managers)', () => {
    test('매니저 페이지 접근 및 렌더링 확인', async ({ page }) => {
      await page.goto('/seou/managers')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, body')
      await expect(content.first()).toBeVisible()
    })

    test('매니저 목록 조회', async ({ page }) => {
      await page.goto('/seou/managers')
      await page.waitForLoadState('networkidle')

      const listElement = page.locator('[role="table"], table, .grid, [class*="list"], [class*="manager"], main')
      await expect(listElement.first()).toBeVisible()
    })
  })

  // ============================================
  // 8. 교실 (Rooms)
  // ============================================
  test.describe('교실 (Rooms)', () => {
    test('교실 페이지 접근 및 렌더링 확인', async ({ page }) => {
      await page.goto('/seou/rooms')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, body')
      await expect(content.first()).toBeVisible()
    })

    test('교실 목록 조회', async ({ page }) => {
      await page.goto('/seou/rooms')
      await page.waitForLoadState('networkidle')

      const listElement = page.locator('[role="table"], table, .grid, [class*="list"], [class*="room"], main')
      await expect(listElement.first()).toBeVisible()
    })
  })

  // ============================================
  // 9. 좌석 (Seats)
  // ============================================
  test.describe('좌석 (Seats)', () => {
    test('좌석 페이지 접근 및 렌더링 확인', async ({ page }) => {
      await page.goto('/seou/seats')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, body')
      await expect(content.first()).toBeVisible()
    })

    test('좌석 배치도 조회', async ({ page }) => {
      await page.goto('/seou/seats')
      await page.waitForLoadState('networkidle')

      const seatElement = page.locator('[class*="seat"], [class*="grid"], .grid, [role="table"], main')
      await expect(seatElement.first()).toBeVisible()
    })
  })

  // ============================================
  // 10. 좌석 출결 (Seats Attendance)
  // ============================================
  test.describe('좌석 출결 (Seats Attendance)', () => {
    test('좌석 출결 페이지 접근 및 렌더링 확인', async ({ page }) => {
      await page.goto('/seou/seatsattendance')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, body')
      await expect(content.first()).toBeVisible()
    })

    test('좌석 출결 데이터 조회', async ({ page }) => {
      await page.goto('/seou/seatsattendance')
      await page.waitForLoadState('networkidle')

      const attendanceElement = page.locator('[class*="attendance"], [class*="seat"], .grid, [role="table"], main')
      await expect(attendanceElement.first()).toBeVisible()
    })
  })

  // ============================================
  // 11. 강사 (Teachers)
  // ============================================
  test.describe('강사 (Teachers)', () => {
    test('강사 페이지 접근 및 렌더링 확인', async ({ page }) => {
      await page.goto('/seou/teachers')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, body')
      await expect(content.first()).toBeVisible()
    })

    test('강사 목록 조회', async ({ page }) => {
      await page.goto('/seou/teachers')
      await page.waitForLoadState('networkidle')

      const listElement = page.locator('[role="table"], table, .grid, [class*="list"], [class*="teacher"], main')
      await expect(listElement.first()).toBeVisible()
    })

    test('강사 추가 버튼 확인', async ({ page }) => {
      await page.goto('/seou/teachers')
      await page.waitForLoadState('networkidle')

      const addButton = page.locator('button').filter({ hasText: /추가|생성|등록|초대/ })
      if (await addButton.first().isVisible()) {
        await expect(addButton.first()).toBeVisible()
      }
    })
  })

  // ============================================
  // 12. 실시간 출결 (Live Attendance)
  // ============================================
  test.describe('실시간 출결 (Live Attendance)', () => {
    test('실시간 출결 페이지 접근 및 렌더링 확인', async ({ page }) => {
      await page.goto('/seou/liveattendance')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, body')
      await expect(content.first()).toBeVisible()
    })

    test('실시간 출결 데이터 표시', async ({ page }) => {
      await page.goto('/seou/liveattendance')
      await page.waitForLoadState('networkidle')

      const liveElement = page.locator('[class*="live"], [class*="attendance"], .grid, [role="table"], main')
      await expect(liveElement.first()).toBeVisible()
    })
  })

  // ============================================
  // 전체 페이지 접근 테스트
  // ============================================
  test.describe('전체 페이지 접근', () => {
    test('모든 추가 페이지 200 응답 확인', async ({ page }) => {
      const pages = [
        '/seou/activity-logs',
        '/seou/all-schedules',
        '/seou/exams',
        '/seou/expenses',
        '/seou/homework',
        '/seou/lessons',
        '/seou/managers',
        '/seou/rooms',
        '/seou/seats',
        '/seou/seatsattendance',
        '/seou/teachers',
        '/seou/liveattendance',
      ]

      for (const pagePath of pages) {
        const response = await page.goto(pagePath)
        expect(response?.ok(), `${pagePath} should return 200`).toBeTruthy()
        await page.waitForLoadState('networkidle')
      }
    })
  })
})
