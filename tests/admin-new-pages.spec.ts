import { test, expect } from '@playwright/test'

test.describe('Admin New Pages - Audit Logs & Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login as super admin
    await page.goto('http://localhost:8000/admin')
    await page.locator('input[type="email"]').fill('admin@goldpen.kr')
    await page.locator('input[type="password"]').fill('12345678')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/dashboard', { timeout: 10000 })
  })

  test('Audit Logs 페이지 테스트', async ({ page }) => {
    console.log('📍 Navigating to audit logs page...')

    // Navigate to audit logs
    await page.goto('http://localhost:8000/admin/audit-logs')
    await page.waitForLoadState('networkidle')

    console.log('✅ Audit logs page loaded')
    await page.screenshot({ path: 'test-results/audit-logs-main.png', fullPage: true })

    // Check page title (use .last() to get the page content h1, not header h1)
    await expect(page.locator('h1').last()).toContainText('감사 로그')

    // Check if table is rendered
    const table = page.locator('table')
    await expect(table).toBeVisible()

    // Check table headers
    await expect(page.locator('th').filter({ hasText: '시간' })).toBeVisible()
    await expect(page.locator('th').filter({ hasText: '사용자' })).toBeVisible()
    await expect(page.locator('th').filter({ hasText: '조직' })).toBeVisible()
    await expect(page.locator('th').filter({ hasText: '액션' })).toBeVisible()
    await expect(page.locator('th').filter({ hasText: '리소스 타입' })).toBeVisible()
    await expect(page.locator('th').filter({ hasText: 'IP 주소' })).toBeVisible()

    console.log('✅ Table headers verified')

    // Check filters exist
    const actionFilter = page.locator('button:has-text("액션 필터")')
    await expect(actionFilter).toBeVisible()

    const resourceTypeFilter = page.locator('button:has-text("리소스 타입")')
    await expect(resourceTypeFilter).toBeVisible()

    const searchInput = page.locator('input[placeholder*="리소스 ID"]')
    await expect(searchInput).toBeVisible()

    console.log('✅ Filters verified')

    // Test action filter (check dropdown items within the select menu)
    await actionFilter.click()
    await page.screenshot({ path: 'test-results/audit-logs-action-filter.png', fullPage: true })
    // Use role=option to target select menu items specifically
    await expect(page.locator('[role="option"]:has-text("전체")')).toBeVisible()
    await expect(page.locator('[role="option"]:has-text("생성")')).toBeVisible()
    await expect(page.locator('[role="option"]:has-text("수정")')).toBeVisible()
    await expect(page.locator('[role="option"]:has-text("삭제")')).toBeVisible()
    await expect(page.locator('[role="option"]:has-text("로그인")')).toBeVisible()
    await expect(page.locator('[role="option"]:has-text("로그아웃")')).toBeVisible()
    await page.keyboard.press('Escape')

    console.log('✅ Action filter options verified')

    // Test resource type filter (check dropdown items within the select menu)
    await resourceTypeFilter.click()
    await page.screenshot({ path: 'test-results/audit-logs-resource-filter.png', fullPage: true })
    // Use role=option to target select menu items specifically
    await expect(page.locator('[role="option"]:has-text("사용자")')).toBeVisible()
    await expect(page.locator('[role="option"]:has-text("조직")')).toBeVisible()
    await expect(page.locator('[role="option"]:has-text("설정")')).toBeVisible()
    await page.keyboard.press('Escape')

    console.log('✅ Resource type filter options verified')

    // Check pagination buttons
    const prevButton = page.locator('button:has-text("이전")')
    const nextButton = page.locator('button:has-text("다음")')
    await expect(prevButton).toBeVisible()
    await expect(nextButton).toBeVisible()

    console.log('✅ Pagination buttons verified')
    console.log('🎉 Audit Logs page test passed!')
  })

  test('Settings 페이지 테스트', async ({ page }) => {
    console.log('📍 Navigating to settings page...')

    // Navigate to settings
    await page.goto('http://localhost:8000/admin/settings')
    await page.waitForLoadState('networkidle')

    console.log('✅ Settings page loaded')
    await page.screenshot({ path: 'test-results/settings-main.png', fullPage: true })

    // Check page title (use .last() to get the page content h1, not header h1)
    await expect(page.locator('h1').last()).toContainText('시스템 설정')

    // Check tabs exist
    const generalTab = page.locator('button[role="tab"]:has-text("일반")')
    const emailTab = page.locator('button[role="tab"]:has-text("이메일")')
    const securityTab = page.locator('button[role="tab"]:has-text("보안")')
    const featuresTab = page.locator('button[role="tab"]:has-text("기능")')

    await expect(generalTab).toBeVisible()
    await expect(emailTab).toBeVisible()
    await expect(securityTab).toBeVisible()
    await expect(featuresTab).toBeVisible()

    console.log('✅ All tabs verified')

    // Test General tab (default) - check table content
    await expect(page.getByText('일반 설정')).toBeVisible()
    await expect(page.locator('text=site_name')).toBeVisible()
    // Check for GoldPen value in table (use exact match within table cell)
    await expect(page.locator('table').locator('text=GoldPen').first()).toBeVisible()
    await expect(page.locator('text=support_email')).toBeVisible()

    console.log('✅ General tab content verified')
    await page.screenshot({ path: 'test-results/settings-general.png', fullPage: true })

    // Test Email tab
    await emailTab.click()
    await page.waitForTimeout(500)
    await expect(page.getByText('이메일 설정')).toBeVisible()
    await expect(page.locator('text=smtp_host')).toBeVisible()
    await expect(page.locator('text=smtp.sendgrid.net')).toBeVisible()
    await expect(page.locator('text=smtp_port')).toBeVisible()

    console.log('✅ Email tab content verified')
    await page.screenshot({ path: 'test-results/settings-email.png', fullPage: true })

    // Test Security tab
    await securityTab.click()
    await page.waitForTimeout(500)
    await expect(page.getByText('보안 설정')).toBeVisible()
    await expect(page.locator('text=session_timeout_minutes')).toBeVisible()
    await expect(page.locator('text=password_min_length')).toBeVisible()
    await expect(page.locator('text=require_2fa')).toBeVisible()

    // Check boolean badge rendering
    const disabledBadge = page.locator('text=비활성화').first()
    await expect(disabledBadge).toBeVisible()

    console.log('✅ Security tab content verified')
    await page.screenshot({ path: 'test-results/settings-security.png', fullPage: true })

    // Test Features tab
    await featuresTab.click()
    await page.waitForTimeout(500)
    await expect(page.getByText('기능 설정')).toBeVisible()
    await expect(page.locator('text=enable_ai_reports')).toBeVisible()
    await expect(page.locator('text=enable_kakao_notifications')).toBeVisible()
    await expect(page.locator('text=enable_calendar_sync')).toBeVisible()

    // Check boolean badge rendering for enabled features
    const enabledBadges = page.locator('text=활성화')
    await expect(enabledBadges.first()).toBeVisible()

    console.log('✅ Features tab content verified')
    await page.screenshot({ path: 'test-results/settings-features.png', fullPage: true })

    // Check read-only alert
    await expect(page.locator('text=현재 읽기 전용 모드입니다')).toBeVisible()

    console.log('✅ Read-only alert verified')
    console.log('🎉 Settings page test passed!')
  })

  test('Sidebar navigation 테스트', async ({ page }) => {
    console.log('📍 Testing sidebar navigation...')

    // Check sidebar links exist (using .last() to get sidebar links, not header links)
    await expect(page.locator('a[href="/admin/dashboard"]').last()).toBeVisible()
    await expect(page.locator('a[href="/admin/organizations"]').last()).toBeVisible()
    await expect(page.locator('a[href="/admin/users"]').last()).toBeVisible()
    await expect(page.locator('a[href="/admin/audit-logs"]').last()).toBeVisible()
    await expect(page.locator('a[href="/admin/settings"]').last()).toBeVisible()

    console.log('✅ All sidebar links verified')

    // Click audit-logs in sidebar
    await page.locator('a[href="/admin/audit-logs"]').last().click()
    await page.waitForURL('**/audit-logs')
    await expect(page.locator('h1').last()).toContainText('감사 로그')

    console.log('✅ Audit logs navigation works')

    // Click settings in sidebar
    await page.locator('a[href="/admin/settings"]').last().click()
    await page.waitForURL('**/settings')
    await expect(page.locator('h1').last()).toContainText('시스템 설정')

    console.log('✅ Settings navigation works')
    console.log('🎉 Sidebar navigation test passed!')
  })
})
