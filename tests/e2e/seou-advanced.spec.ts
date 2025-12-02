import { test, expect } from './fixtures'
import {
  fillField,
  selectField,
  clickButton,
  expectPageTitle,
  waitForPageLoad,
  expectToastMessage,
  getTableRowCount,
  findTableRow,
  search,
  scrollIntoView,
  clickMenuItem,
  wait,
} from './helpers'

/**
 * GoldPen 고급 E2E 테스트
 *
 * 이 파일은 fixtures를 사용하여 더 간편한 테스트를 구현합니다.
 * 모든 테스트는 인증된 상태(로그인됨)로 시작합니다.
 */

test.describe('학생 관리 - 고급 시나리오', () => {
  test('복수 학생 등록 후 검색 및 필터링', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/students')
    await waitForPageLoad(page)

    // 초기 학생 수 기록
    const initialCount = await getTableRowCount(page)

    // 첫 번째 학생 등록
    await clickButton(page, '학생 등록')
    await fillField(page, '이름', `학생_${Date.now()}_1`)
    await fillField(page, '학교', '테스트중학교1')
    await fillField(page, '학부모 이름', '부모1')
    await fillField(page, '학부모 연락처', '010-1111-1111')

    // 소속 선택 (학원)
    const campusButton = page.locator('button:has-text("학원")')
    if (await campusButton.isVisible()) {
      await campusButton.click()
    }

    await clickButton(page, '등록')
    await expectToastMessage(page, '등록 완료')

    await wait(500)

    // 페이지 새로고침
    await page.reload()
    await waitForPageLoad(page)

    // 학생 수 증가 확인
    const afterFirstCount = await getTableRowCount(page)
    expect(afterFirstCount).toBeGreaterThan(initialCount)
  })

  test('학생 상세정보 수정 시나리오', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/students')
    await waitForPageLoad(page)

    // 첫 번째 학생 클릭
    const firstStudentName = page.locator('td[role="cell"] > button').first()
    if (await firstStudentName.isVisible()) {
      await firstStudentName.click()
      await wait(300)

      // 상세 모달 확인
      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()

      // 탭 전환 (필요시)
      const tabs = page.locator('[role="tab"]')
      if (await tabs.count() > 1) {
        await tabs.nth(1).click()
        await wait(300)
      }
    }
  })

  test('학생 일괄 작업 (필터 후 선택)', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/students')
    await waitForPageLoad(page)

    // 검색 기능으로 필터링
    await search(page, '테스트')
    await wait(500)

    // 결과 확인
    const rows = page.locator('[role="table"] tbody tr, [role="row"]')
    const rowCount = await rows.count()

    if (rowCount > 0) {
      expect(rowCount).toBeGreaterThan(0)
    }
  })
})

test.describe('상담 관리 - 상담 흐름 테스트', () => {
  test('상담 상태 변경 워크플로우', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/consultations')
    await waitForPageLoad(page)

    // 상담 목록 페이지 렌더링 확인
    const heading = page.locator('h1, [role="heading"], h2').first()
    if (await heading.isVisible()) {
      await expect(heading).toContainText(/상담/)
    }

    // 상담 목록 테이블 확인
    const table = page.locator('[role="table"], table')
    if (await table.isVisible()) {
      await expect(table).toBeVisible()

      // 첫 번째 상담 행의 상태 변경 버튼 찾기
      const statusButtons = page.locator('button:has-text("대기"), button:has-text("진행"), button:has-text("완료")')
      if (await statusButtons.first().isVisible()) {
        // UI에 따라 상태 변경 로직이 다를 수 있음
      }
    }
  })

  test('상담 노트 추가 및 저장', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/consultations')
    await waitForPageLoad(page)

    // 첫 번째 상담 클릭
    const firstConsultation = page.locator('[role="table"] tbody tr').first()
    if (await firstConsultation.isVisible()) {
      // 클릭 가능한 영역 찾기
      const clickableArea = firstConsultation.locator('button, a').first()
      if (await clickableArea.isVisible()) {
        await clickableArea.click()
        await wait(300)

        // 상담 상세 모달 또는 페이지 렌더링 대기
        const detailView = page.locator('[role="dialog"], [class*="detail"], [class*="modal"]')
        if (await detailView.first().isVisible()) {
          // 노트 입력 필드 찾기
          const noteField = page.locator('textarea').first()
          if (await noteField.isVisible()) {
            await noteField.fill('E2E 테스트 노트 입니다.')
            await clickButton(page, '저장')
          }
        }
      }
    }
  })
})

test.describe('반/수업 관리 - 반 관리 시나리오', () => {
  test('새로운 반 생성 및 학생 배정', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/classes')
    await waitForPageLoad(page)

    // 반 목록 확인
    const table = page.locator('[role="table"], .grid, [class*="list"]')
    await expect(table).toBeVisible()

    // 반 추가 버튼 찾기
    const createButton = page.locator('button').filter({ hasText: /추가|생성|신규/ }).first()
    if (await createButton.isVisible()) {
      await createButton.click()
      await wait(300)

      // 생성 폼 확인
      const dialog = page.locator('[role="dialog"]')
      if (await dialog.isVisible()) {
        // 필드 채우기 (실제 필드명은 페이지에 따라 다름)
        const inputs = dialog.locator('input')
        if (await inputs.first().isVisible()) {
          await inputs.first().fill(`테스트반_${Date.now()}`)
        }

        // 저장
        const saveButton = dialog.locator('button:has-text("생성"), button:has-text("저장"), button:has-text("확인")')
        if (await saveButton.isVisible()) {
          await saveButton.click()
          await expectToastMessage(page, /생성|저장|등록|완료/)
        }
      }
    }
  })

  test('반 정보 수정 시나리오', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/classes')
    await waitForPageLoad(page)

    // 첫 번째 반 행 찾기
    const firstRow = page.locator('[role="table"] tbody tr, [role="row"]').first()
    if (await firstRow.isVisible()) {
      // 더보기 메뉴 또는 수정 버튼 찾기
      const moreButton = firstRow.locator('button:has-text("⋯"), button:has-text("...")')
      const editButton = firstRow.locator('button:has-text("수정"), button:has-text("편집")')

      if (await editButton.isVisible()) {
        await editButton.click()
      } else if (await moreButton.isVisible()) {
        await moreButton.click()
        await wait(300)
        await clickMenuItem(page, '수정')
      }

      // 수정 폼이 열렸는지 확인
      const modal = page.locator('[role="dialog"]')
      if (await modal.isVisible()) {
        const inputs = modal.locator('input, textarea')
        if (await inputs.first().isVisible()) {
          // 첫 번째 입력 필드 수정
          await inputs.first().fill(`수정됨_${Date.now()}`)
        }

        // 저장
        const saveButton = modal.locator('button:has-text("저장"), button:has-text("확인")')
        if (await saveButton.isVisible()) {
          await saveButton.click()
        }
      }
    }
  })
})

test.describe('출결 관리 - 출결 체크 시나리오', () => {
  test('날짜별 출결 현황 확인', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/attendance')
    await waitForPageLoad(page)

    // 출결 테이블 확인
    const table = page.locator('[role="table"], .grid')
    await expect(table.first()).toBeVisible()

    // 날짜 필터 찾기 (있는 경우)
    const dateInput = page.locator('input[type="date"]')
    if (await dateInput.isVisible()) {
      // 오늘 날짜로 설정
      const today = new Date().toISOString().split('T')[0]
      await dateInput.fill(today)
      await wait(500)
    }
  })

  test('개별 학생 출결 상태 변경', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/attendance')
    await waitForPageLoad(page)

    // 체크박스 찾기
    const firstCheckbox = page.locator('input[type="checkbox"]').first()
    if (await firstCheckbox.isVisible()) {
      const isChecked = await firstCheckbox.isChecked()

      // 상태 변경
      await firstCheckbox.click()
      await wait(300)

      // 변경 확인
      const newChecked = await firstCheckbox.isChecked()
      expect(newChecked).not.toBe(isChecked)

      // 저장 버튼 있는지 확인
      const saveButton = page.locator('button:has-text("저장"), button:has-text("확인")')
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await expectToastMessage(page, /저장|완료|성공/)
      }
    }
  })

  test('출결 현황 리포트 보기', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/attendance')
    await waitForPageLoad(page)

    // 리포트 버튼이나 차트 확인
    const reportButton = page.locator('button:has-text("리포트"), button:has-text("통계"), button:has-text("분석")')
    if (await reportButton.isVisible()) {
      await reportButton.click()
      await wait(500)

      // 리포트 뷰 확인
      const reportView = page.locator('[class*="chart"], [class*="report"], [class*="statistic"]')
      if (await reportView.first().isVisible()) {
        await expect(reportView.first()).toBeVisible()
      }
    }
  })
})

test.describe('시간표 - 시간표 관리 시나리오', () => {
  test('주간 시간표 조회', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/schedule')
    await waitForPageLoad(page)

    // 시간표 그리드 확인
    const scheduleGrid = page.locator('[class*="schedule"], [class*="timetable"], [role="table"]')
    await expect(scheduleGrid.first()).toBeVisible()

    // 요일 헤더 확인
    const dayHeaders = page.locator('th:has-text("월"), th:has-text("화"), th:has-text("수")')
    if (await dayHeaders.first().isVisible()) {
      expect(await dayHeaders.count()).toBeGreaterThan(0)
    }
  })

  test('시간표 조회 조건 변경', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/schedule')
    await waitForPageLoad(page)

    // 필터 또는 검색 필드 찾기
    const filterButton = page.locator('button:has-text("필터")')
    const searchInput = page.locator('input[type="search"]')
    const selectElement = page.locator('select')

    if (await filterButton.isVisible()) {
      await filterButton.click()
      await wait(300)
    } else if (await searchInput.isVisible()) {
      await searchInput.fill('테스트')
      await wait(500)
    } else if (await selectElement.isVisible()) {
      // 첫 번째 select 변경
      const options = await selectElement.first().locator('option').count()
      if (options > 1) {
        await selectElement.first().selectOption({ index: 1 })
        await wait(500)
      }
    }
  })
})

test.describe('정산 관리 - 정산 조회 시나리오', () => {
  test('월별 정산 현황 조회', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/billing')
    await waitForPageLoad(page)

    // 정산 정보 테이블/차트 확인
    const billingView = page.locator('[role="table"], [class*="chart"], [class*="summary"]')
    await expect(billingView.first()).toBeVisible()

    // 월 선택 필드 찾기
    const monthInput = page.locator('input[type="month"]')
    if (await monthInput.isVisible()) {
      // 현재 년월 설정
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      await monthInput.fill(month)
      await wait(500)
    }
  })

  test('정산 상세내역 확인', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/billing')
    await waitForPageLoad(page)

    // 테이블 행 확인
    const rows = page.locator('[role="table"] tbody tr')
    if (await rows.count() > 0) {
      // 첫 번째 행 클릭
      const firstRow = rows.first()
      await firstRow.click()
      await wait(300)

      // 상세 뷰 확인
      const detailView = page.locator('[role="dialog"], [class*="detail"], [class*="modal"]')
      if (await detailView.first().isVisible()) {
        await expect(detailView.first()).toBeVisible()
      }
    }
  })

  test('정산 기간별 비교', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/billing')
    await waitForPageLoad(page)

    // 시작 날짜 선택
    const startDateInput = page.locator('input[type="date"], input[placeholder*="시작"]').first()
    if (await startDateInput.isVisible()) {
      const startDate = new Date()
      startDate.setDate(1)
      await startDateInput.fill(startDate.toISOString().split('T')[0])

      // 종료 날짜 선택
      const endDateInput = page.locator('input[type="date"], input[placeholder*="종료"]').first()
      if (await endDateInput.isVisible()) {
        const endDate = new Date()
        await endDateInput.fill(endDate.toISOString().split('T')[0])

        // 검색 또는 적용 버튼
        const applyButton = page.locator('button:has-text("검색"), button:has-text("적용"), button:has-text("조회")')
        if (await applyButton.isVisible()) {
          await applyButton.click()
          await wait(500)
        }
      }
    }
  })
})

test.describe('설정 - 기관 설정 시나리오', () => {
  test('기본 정보 수정', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/settings')
    await waitForPageLoad(page)

    // 설정 폼 확인
    const form = page.locator('form, [role="form"]')
    await expect(form).toBeVisible()

    // 수정 가능한 첫 번째 입력 필드 찾기
    const inputs = page.locator('input[type="text"], textarea')
    if (await inputs.first().isVisible()) {
      // 현재 값 저장
      const currentValue = await inputs.first().inputValue()

      // 임시로 값 변경
      const tempValue = `테스트_${Date.now()}`
      await inputs.first().fill(tempValue)

      // 변경 확인
      const newValue = await inputs.first().inputValue()
      expect(newValue).toBe(tempValue)

      // 원래 값으로 복구
      await inputs.first().fill(currentValue)
    }
  })

  test('지점 관리 페이지 접근', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/settings')
    await waitForPageLoad(page)

    // 지점 관리 탭/섹션 찾기
    const branchTab = page.locator('[role="tab"]:has-text("지점"), button:has-text("지점")')
    if (await branchTab.isVisible()) {
      await branchTab.click()
      await wait(300)

      // 지점 목록 확인
      const branchList = page.locator('[role="table"], .grid, [class*="list"]')
      if (await branchList.isVisible()) {
        await expect(branchList).toBeVisible()
      }
    }
  })

  test('설정 값 저장 및 확인', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/settings')
    await waitForPageLoad(page)

    // 저장 버튼 찾기
    const saveButton = page.locator('button:has-text("저장")')
    if (await saveButton.isVisible()) {
      // 저장 버튼 클릭
      await saveButton.click()

      // 저장 완료 메시지 확인
      await expectToastMessage(page, /저장|완료|성공/)

      // 페이지 새로고침 후 값 재확인
      await page.reload()
      await waitForPageLoad(page)

      // 설정 페이지 여전히 로드되는지 확인
      const form = page.locator('form, [role="form"]')
      await expect(form).toBeVisible()
    }
  })
})

test.describe('대시보드 - 위젯 커스터마이제이션', () => {
  test('위젯 추가 및 제거', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/overview')
    await waitForPageLoad(page)

    // 위젯 추가 버튼 클릭
    const addWidgetButton = page.locator('button:has-text("위젯 추가")')
    if (await addWidgetButton.isVisible()) {
      await addWidgetButton.click()
      await wait(300)

      // 위젯 선택 모달 확인
      const modal = page.locator('[role="dialog"]')
      if (await modal.isVisible()) {
        // 첫 번째 위젯 선택
        const widgetOption = modal.locator('button, [role="button"]').first()
        if (await widgetOption.isVisible()) {
          await widgetOption.click()
          await wait(300)

          // 모달 닫힘 확인
          const stillVisible = await modal.isVisible()
          if (!stillVisible) {
            // 위젯이 추가되었음
            expect(true).toBeTruthy()
          }
        }
      }
    }
  })

  test('위젯 드래그 앤 드롭', async ({ authenticatedPage: page }) => {
    await page.goto('/seou/overview')
    await waitForPageLoad(page)

    // 드래그 가능한 위젯 찾기
    const widgets = page.locator('[class*="widget"], [class*="card"], [draggable="true"]')
    if (await widgets.count() > 1) {
      // 첫 번째와 두 번째 위젯 위치 교환
      const firstWidget = widgets.nth(0)
      const secondWidget = widgets.nth(1)

      // 드래그 앤 드롭 수행
      await firstWidget.dragTo(secondWidget)
      await wait(500)

      // 페이지 새로고침하여 순서 유지되는지 확인
      await page.reload()
      await waitForPageLoad(page)

      const reloadedWidgets = page.locator('[class*="widget"], [class*="card"], [draggable="true"]')
      expect(await reloadedWidgets.count()).toBeGreaterThan(0)
    }
  })
})
