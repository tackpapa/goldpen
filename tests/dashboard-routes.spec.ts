import { test, expect } from '@playwright/test'

// 테스트할 모든 대시보드 라우트
const dashboardRoutes = [
  { path: '/goldpen/overview', name: '대시보드 개요' },
  { path: '/goldpen/schedule', name: '스케줄' },
  { path: '/goldpen/all-schedules', name: '전체 스케줄' },
  { path: '/goldpen/rooms', name: '교실 관리' },
  { path: '/goldpen/seats', name: '좌석 관리' },
  { path: '/goldpen/students', name: '학생 관리' },
  { path: '/goldpen/teachers', name: '강사 관리' },
  { path: '/goldpen/classes', name: '수업 관리' },
  { path: '/goldpen/attendance', name: '출결 관리' },
  { path: '/goldpen/lessons', name: '수업일지' },
  { path: '/goldpen/homework', name: '숙제 관리' },
  { path: '/goldpen/exams', name: '시험 관리' },
  { path: '/goldpen/consultations', name: '상담 관리' },
  { path: '/goldpen/billing', name: '정산 관리' },
  { path: '/goldpen/expenses', name: '지출 관리' },
  { path: '/goldpen/settings', name: '설정' },
]

test.describe('Dashboard Routes - Console Errors Test', () => {
  let consoleErrors: Array<{ route: string; errors: string[] }> = []

  test.beforeEach(async ({ page }) => {
    // 콘솔 에러 수집
    const routeErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        const text = msg.text()
        // Recharts defaultProps 경고는 제외
        if (!text.includes('Support for defaultProps will be removed')) {
          routeErrors.push(`[${msg.type().toUpperCase()}] ${text}`)
        }
      }
    })

    page.on('pageerror', (error) => {
      routeErrors.push(`[PAGE ERROR] ${error.message}`)
    })

    // Store errors for the current test
    consoleErrors.push({ route: '', errors: routeErrors })
  })

  for (const route of dashboardRoutes) {
    test(`${route.name} (${route.path}) - 콘솔 에러 확인`, async ({ page }) => {
      console.log(`\n\n${'='.repeat(60)}`)
      console.log(`테스트 시작: ${route.name}`)
      console.log(`URL: http://localhost:8000${route.path}`)
      console.log('='.repeat(60))

      // 페이지 방문
      const response = await page.goto(`http://localhost:8000${route.path}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      })

      // HTTP 상태 확인
      const status = response?.status() || 0
      console.log(`\n📡 HTTP Status: ${status}`)

      if (status >= 400) {
        console.log(`❌ 페이지 로드 실패: ${status}`)
      } else {
        console.log(`✅ 페이지 로드 성공`)
      }

      // 페이지가 로드될 때까지 잠시 대기
      await page.waitForTimeout(2000)

      // 페이지 제목 확인
      const title = await page.title()
      console.log(`\n📄 Page Title: ${title}`)

      // 현재 수집된 에러 가져오기
      const currentErrors = consoleErrors[consoleErrors.length - 1].errors
      consoleErrors[consoleErrors.length - 1].route = route.path

      // 에러 리포트
      if (currentErrors.length > 0) {
        console.log(`\n❌ 발견된 에러/경고 (${currentErrors.length}개):`)
        currentErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`)
        })
      } else {
        console.log(`\n✅ 에러/경고 없음`)
      }

      // 스크린샷 저장 (에러가 있을 경우)
      if (currentErrors.length > 0 || status >= 400) {
        const screenshotPath = `screenshots/${route.name.replace(/[\/\s]/g, '-')}.png`
        await page.screenshot({ path: screenshotPath, fullPage: true })
        console.log(`\n📸 스크린샷 저장: ${screenshotPath}`)
      }

      console.log('='.repeat(60))
    })
  }

  test.afterAll(() => {
    console.log('\n\n')
    console.log('╔' + '═'.repeat(78) + '╗')
    console.log('║' + ' '.repeat(25) + '최종 리포트' + ' '.repeat(42) + '║')
    console.log('╠' + '═'.repeat(78) + '╣')

    const errorSummary = consoleErrors.map(({ route, errors }) => ({
      route,
      count: errors.length,
      hasErrors: errors.length > 0,
    }))

    errorSummary.forEach(({ route, count, hasErrors }) => {
      if (route) {
        const status = hasErrors ? '❌' : '✅'
        const padding = ' '.repeat(Math.max(0, 50 - route.length))
        console.log(`║ ${status} ${route}${padding}(${count}개 에러) ║`)
      }
    })

    console.log('╚' + '═'.repeat(78) + '╝')

    const totalErrors = errorSummary.reduce((sum, { count }) => sum + count, 0)
    console.log(`\n📊 총 에러 수: ${totalErrors}`)

    if (totalErrors === 0) {
      console.log('\n🎉 모든 페이지가 에러 없이 로드되었습니다!')
    } else {
      console.log(`\n⚠️  ${totalErrors}개의 에러/경고가 발견되었습니다.`)
      console.log('\n상세 에러 목록:')
      consoleErrors.forEach(({ route, errors }) => {
        if (errors.length > 0) {
          console.log(`\n📍 ${route}:`)
          errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`)
          })
        }
      })
    }

    console.log('\n')
  })
})
