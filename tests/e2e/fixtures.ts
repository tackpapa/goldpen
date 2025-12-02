import { test as base, Page } from '@playwright/test'
import { loginAsSeouOwner } from './helpers'

/**
 * 인증된 페이지 fixture
 * 모든 테스트에서 이미 로그인된 상태로 시작
 */
type AuthenticatedPage = {
  authenticatedPage: Page
}

export const test = base.extend<AuthenticatedPage>({
  /**
   * 인증된 페이지 fixture
   * - 자동으로 Seou 계정으로 로그인
   * - 대시보드로 이동
   * - 모든 테스트에서 사용 가능
   */
  authenticatedPage: async ({ page }, use) => {
    // 설정
    await loginAsSeouOwner(page)

    // 테스트 사용
    await use(page)

    // 정리
    // 필요시 로그아웃 또는 데이터 정리
  },
})

export { expect } from '@playwright/test'
