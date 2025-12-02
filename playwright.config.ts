import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 테스트 설정
 * 주의: Edge Runtime의 기능을 테스트하기 때문에 로컬 개발 서버가 실행 중이어야 함
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['html', { outputFolder: './test-results' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 테스트 전 개발 서버 자동 실행 (선택사항)
  // 참고: 수동으로 `pnpm dev`를 실행하고 테스트를 실행하세요
  // webServer: {
  //   command: 'pnpm dev',
  //   url: 'http://localhost:8000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
})
