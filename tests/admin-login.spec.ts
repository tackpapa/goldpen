import { test, expect } from '@playwright/test'

test('Super Admin 로그인 테스트', async ({ page }) => {
  console.log('📍 Navigating to admin login page...')

  // 관리자 로그인 페이지 접속
  await page.goto('http://localhost:8000/admin')

  console.log('✅ Admin login page loaded')
  console.log('📄 Page title:', await page.title())
  
  // 스크린샷 저장
  await page.screenshot({ path: 'test-results/01-login-page.png', fullPage: true })
  
  // 이메일 입력
  console.log('📝 Filling email...')
  const emailInput = page.locator('input[type="email"], input[name="email"]')
  await emailInput.fill('admin@goldpen.kr')
  
  // 비밀번호 입력
  console.log('🔑 Filling password...')
  const passwordInput = page.locator('input[type="password"], input[name="password"]')
  await passwordInput.fill('12345678')
  
  await page.screenshot({ path: 'test-results/02-before-submit.png', fullPage: true })
  
  // 로그인 버튼 클릭
  console.log('🖱️ Clicking submit button...')
  const submitButton = page.locator('button[type="submit"]')
  await submitButton.click()
  
  // 리다이렉트 대기
  console.log('⏳ Waiting for navigation...')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  
  const currentUrl = page.url()
  console.log('🌐 Current URL:', currentUrl)
  
  await page.screenshot({ path: 'test-results/03-after-login.png', fullPage: true })
  
  // Super Admin 대시보드로 리다이렉트되었는지 확인
  expect(currentUrl).toContain('/admin/dashboard')
  
  console.log('🎉 Login test passed!')
})
