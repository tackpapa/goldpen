import { Page, expect } from '@playwright/test'

/**
 * E2E 테스트 헬퍼 함수 모음
 */

/**
 * 테스트 계정 정보
 */
export const TEST_CREDENTIALS = {
  email: 'cance0311@gmail.com',
  password: '12345678',
}

/**
 * Seou 기관으로 로그인
 * @param page - Playwright page 객체
 */
export async function loginAsSeouOwner(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', TEST_CREDENTIALS.email)
  await page.fill('input[type="password"]', TEST_CREDENTIALS.password)
  await page.click('button[type="submit"]')

  // 로그인 완료 대기
  await page.waitForURL(/\/seou\/overview|\/seou/, { timeout: 30000 })
  await page.waitForLoadState('networkidle')
}

/**
 * 로그아웃
 * @param page - Playwright page 객체
 */
export async function logout(page: Page) {
  // 프로필 메뉴 열기
  const profileButton = page.locator('button:has-text("프로필"), button:has-text("계정"), [role="button"]:has-text("로그아웃")')
  if (await profileButton.isVisible()) {
    await profileButton.click()
  }

  // 로그아웃 버튼 클릭
  const logoutButton = page.locator('button:has-text("로그아웃")')
  if (await logoutButton.isVisible()) {
    await logoutButton.click()
    await page.waitForURL(/\/login/)
  }
}

/**
 * 다이얼로그가 열렸는지 확인
 * @param page - Playwright page 객체
 * @returns 다이얼로그 visible 여부
 */
export async function isDialogOpen(page: Page): Promise<boolean> {
  const dialog = page.locator('[role="dialog"]')
  return dialog.isVisible()
}

/**
 * 다이얼로그 닫기
 * @param page - Playwright page 객체
 */
export async function closeDialog(page: Page) {
  const closeButton = page.locator('button[aria-label="Close"], [role="button"]:has-text("×")')
  if (await closeButton.isVisible()) {
    await closeButton.click()
  }

  // 또는 Escape 키 누르기
  await page.press('Escape')
  await page.waitForTimeout(300)
}

/**
 * 입력 필드 채우기
 * @param page - Playwright page 객체
 * @param label - 필드 라벨 텍스트
 * @param value - 입력값
 */
export async function fillField(page: Page, label: string, value: string) {
  const input = page.locator(`input[placeholder*="${label}"], input[id*="${label}"]`).first()
  if (await input.isVisible()) {
    await input.fill(value)
  } else {
    // 라벨 기반으로 찾기
    const labelElement = page.locator(`label:has-text("${label}")`)
    if (await labelElement.isVisible()) {
      const inputAfterLabel = labelElement.locator('~ input').first()
      if (await inputAfterLabel.isVisible()) {
        await inputAfterLabel.fill(value)
      }
    }
  }
}

/**
 * Select 필드 값 선택
 * @param page - Playwright page 객체
 * @param label - Select 라벨 텍스트
 * @param value - 선택값
 */
export async function selectField(page: Page, label: string, value: string) {
  // 라디오 버튼 검색
  const radioButton = page.locator(`input[type="radio"][value="${value}"]`)
  if (await radioButton.isVisible()) {
    await radioButton.click()
    return
  }

  // Select 엘리먼트 검색
  const selectElement = page.locator('select').first()
  if (await selectElement.isVisible()) {
    await selectElement.selectOption(value)
    return
  }

  // 커스텀 Select (Radix UI 등) 검색
  const selectButton = page.locator('[role="combobox"], [role="button"]').filter({ hasText: /선택|선택하세요/ }).first()
  if (await selectButton.isVisible()) {
    await selectButton.click()
    await page.waitForTimeout(300)

    const option = page.locator(`[role="option"]:has-text("${value}")`)
    if (await option.isVisible()) {
      await option.click()
    }
  }
}

/**
 * 토스트 메시지 확인
 * @param page - Playwright page 객체
 * @param expectedText - 예상 텍스트
 */
export async function expectToastMessage(page: Page, expectedText: string) {
  const toast = page.locator('[role="status"], [role="alert"]').first()
  await expect(toast).toContainText(expectedText)
}

/**
 * 테이블 행 수 확인
 * @param page - Playwright page 객체
 * @returns 테이블 행 수
 */
export async function getTableRowCount(page: Page): Promise<number> {
  const rows = page.locator('tbody > tr, [role="row"]')
  return rows.count()
}

/**
 * 테이블에서 텍스트로 행 찾기
 * @param page - Playwright page 객체
 * @param searchText - 검색 텍스트
 * @returns 찾은 행 엘리먼트
 */
export async function findTableRow(page: Page, searchText: string) {
  return page.locator(`tbody > tr:has-text("${searchText}"), [role="row"]:has-text("${searchText}")`)
}

/**
 * 데이터 테이블에서 특정 셀 값 가져오기
 * @param page - Playwright page 객체
 * @param rowText - 행 식별 텍스트
 * @param columnIndex - 열 인덱스
 * @returns 셀 값
 */
export async function getTableCellValue(
  page: Page,
  rowText: string,
  columnIndex: number
): Promise<string> {
  const row = await findTableRow(page, rowText)
  const cells = row.locator('td, [role="cell"]')
  const cell = cells.nth(columnIndex)
  return cell.textContent() || ''
}

/**
 * 버튼 클릭 (텍스트 기반)
 * @param page - Playwright page 객체
 * @param buttonText - 버튼 텍스트
 */
export async function clickButton(page: Page, buttonText: string) {
  const button = page.locator(`button:has-text("${buttonText}")`)
  if (await button.isVisible()) {
    await button.click()
    await page.waitForTimeout(300)
  } else {
    throw new Error(`Button with text "${buttonText}" not found`)
  }
}

/**
 * 메뉴 항목 클릭
 * @param page - Playwright page 객테
 * @param menuText - 메뉴 항목 텍스트
 */
export async function clickMenuItem(page: Page, menuText: string) {
  const menuItem = page.locator(`[role="menuitem"]:has-text("${menuText}")`)
  if (await menuItem.isVisible()) {
    await menuItem.click()
    await page.waitForTimeout(300)
  } else {
    throw new Error(`Menu item with text "${menuText}" not found`)
  }
}

/**
 * 페이지 제목 확인
 * @param page - Playwright page 객체
 * @param expectedTitle - 예상 제목
 */
export async function expectPageTitle(page: Page, expectedTitle: string) {
  const title = page.locator('h1, h2, [role="heading"]').first()
  await expect(title).toContainText(expectedTitle)
}

/**
 * 페이지 로딩 완료 대기
 * @param page - Playwright page 객체
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
}

/**
 * 검색 필드에서 검색
 * @param page - Playwright page 객체
 * @param searchText - 검색어
 */
export async function search(page: Page, searchText: string) {
  const searchInput = page.locator('input[type="search"], input[placeholder*="검색"]').first()
  if (await searchInput.isVisible()) {
    await searchInput.fill(searchText)
    await page.waitForTimeout(500)
  }
}

/**
 * 페이지 새로고침
 * @param page - Playwright page 객체
 */
export async function refreshPage(page: Page) {
  await page.reload()
  await waitForPageLoad(page)
}

/**
 * 확인 다이얼로그 처리
 * @param page - Playwright page 객체
 * @param accept - true면 확인, false면 취소
 */
export async function handleConfirmDialog(page: Page, accept: boolean = true) {
  page.once('dialog', async (dialog) => {
    if (accept) {
      await dialog.accept()
    } else {
      await dialog.dismiss()
    }
  })
}

/**
 * 현재 URL에서 마지막 세그먼트 가져오기
 * @param page - Playwright page 객체
 * @returns URL 마지막 세그먼트
 */
export function getLastUrlSegment(page: Page): string {
  const url = page.url()
  return url.split('/').filter(Boolean).pop() || ''
}

/**
 * 특정 텍스트가 페이지에 있는지 확인
 * @param page - Playwright page 객체
 * @param text - 검색 텍스트
 * @returns 텍스트 존재 여부
 */
export async function hasText(page: Page, text: string): Promise<boolean> {
  const element = page.locator(`text="${text}"`)
  return element.isVisible()
}

/**
 * 특정 텍스트가 페이지에 있을 때까지 대기
 * @param page - Playwright page 객체
 * @param text - 검색 텍스트
 * @param timeout - 대기 시간 (ms)
 */
export async function waitForText(page: Page, text: string, timeout: number = 5000) {
  const element = page.locator(`text="${text}"`)
  await element.waitFor({ state: 'visible', timeout })
}

/**
 * 특정 필드의 값 가져오기
 * @param page - Playwright page 객체
 * @param fieldId - 필드 ID 또는 placeholder
 * @returns 필드 값
 */
export async function getFieldValue(page: Page, fieldId: string): Promise<string> {
  const input = page.locator(`input[id="${fieldId}"], input[placeholder="${fieldId}"]`).first()
  return input.inputValue()
}

/**
 * 스크린샷 저장
 * @param page - Playwright page 객체
 * @param name - 스크린샷 이름
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `./test-results/${name}.png` })
}

/**
 * 프로덕션 URL에서 테스트 URL로 변환
 * @param url - 변환할 URL
 * @returns 변환된 localhost URL
 */
export function toTestUrl(url: string): string {
  return url.replace('goldpen.kr', 'localhost:8000')
}

/**
 * 타임아웃 대기
 * @param ms - 밀리초
 */
export async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 요소 스크롤로 보이게 하기
 * @param page - Playwright page 객체
 * @param selector - CSS 선택자
 */
export async function scrollIntoView(page: Page, selector: string) {
  const element = page.locator(selector).first()
  if (await element.isVisible()) {
    await element.scrollIntoViewIfNeeded()
  }
}

/**
 * 요소가 활성화될 때까지 대기
 * @param page - Playwright page 객체
 * @param selector - CSS 선택자
 * @param timeout - 대기 시간 (ms)
 */
export async function waitForElement(page: Page, selector: string, timeout: number = 5000) {
  const element = page.locator(selector).first()
  await element.waitFor({ state: 'visible', timeout })
}
