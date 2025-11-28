import { Widget } from '@/lib/types/widget'

// 사용 가능한 모든 위젯 정의
export const availableWidgets: Widget[] = [
  // 실시간 현황
  {
    id: 'realtime-status',
    type: 'realtime-status',
    title: '실시간 현황',
    description: '독서실, 수업 출결, 진행 중인 수업',
    category: '실시간',
    size: 'full',
    enabled: true,
    order: 0,
  },

  // 학생 관리
  {
    id: 'students-total',
    type: 'students-total',
    title: '전체 학생',
    description: '재학생/휴학생 통계',
    category: '학생관리',
    size: 'small',
    enabled: true,
    order: 1,
  },
  {
    id: 'students-grade-distribution',
    type: 'students-grade-distribution',
    title: '학년별 분포',
    description: '학년별 학생 수 차트',
    category: '학생관리',
    size: 'medium',
    enabled: true,
    order: 8,
  },

  // 상담 관리
  {
    id: 'consultations-summary',
    type: 'consultations-summary',
    title: '상담 현황',
    description: '신규/예정/입교 상담 통계',
    category: '상담관리',
    size: 'small',
    enabled: true,
    order: 2,
  },
  {
    id: 'consultations-conversion',
    type: 'consultations-conversion',
    title: '입교 전환율',
    description: '상담→입교 전환율 차트',
    category: '상담관리',
    size: 'medium',
    enabled: true,
    order: 10,
  },

  // 수업 관리
  {
    id: 'classes-summary',
    type: 'classes-summary',
    title: '반 운영 현황',
    description: '총 반/평균 충원율',
    category: '수업관리',
    size: 'small',
    enabled: true,
    order: 11,
  },
  {
    id: 'classes-capacity',
    type: 'classes-capacity',
    title: '반별 충원율',
    description: '반별 충원율 차트',
    category: '수업관리',
    size: 'medium',
    enabled: true,
    order: 12,
  },

  // 시험 관리
  {
    id: 'exams-summary',
    type: 'exams-summary',
    title: '시험 현황',
    description: '채점 완료/대기 통계',
    category: '수업관리',
    size: 'small',
    enabled: true,
    order: 13,
  },
  {
    id: 'exams-recent',
    type: 'exams-recent',
    title: '최근 시험 결과',
    description: '평균 성적 및 추이',
    category: '수업관리',
    size: 'medium',
    enabled: true,
    order: 14,
  },

  // 과제 관리
  {
    id: 'homework-summary',
    type: 'homework-summary',
    title: '과제 현황',
    description: '진행 중/완료 과제',
    category: '수업관리',
    size: 'small',
    enabled: true,
    order: 15,
  },
  {
    id: 'homework-submission',
    type: 'homework-submission',
    title: '과제 제출률',
    description: '학생별 제출률 차트',
    category: '수업관리',
    size: 'medium',
    enabled: true,
    order: 16,
  },

  // 재무 관리
  {
    id: 'billing-summary',
    type: 'billing-summary',
    title: '재무 현황',
    description: '수익/지출/순이익',
    category: '재무관리',
    size: 'small',
    enabled: true,
    order: 3,
  },
  {
    id: 'billing-revenue-trend',
    type: 'billing-revenue-trend',
    title: '월별 매출',
    description: '최근 6개월 매출 추이',
    category: '재무관리',
    size: 'medium',
    enabled: true,
    order: 4,
  },
  {
    id: 'billing-expense-category',
    type: 'billing-expense-category',
    title: '지출 카테고리',
    description: '카테고리별 지출 분포',
    category: '재무관리',
    size: 'medium',
    enabled: true,
    order: 17,
  },

  // 출결 관리
  {
    id: 'attendance-today',
    type: 'attendance-today',
    title: '강의 오늘 출결',
    description: '출석/지각/결석',
    category: '출결관리',
    size: 'small',
    enabled: true,
    order: 18,
  },
  {
    id: 'attendance-weekly',
    type: 'attendance-weekly',
    title: '강의 주간 출결률',
    description: '요일별 출결 추이',
    category: '출결관리',
    size: 'medium',
    enabled: true,
    order: 5,
  },
  {
    id: 'attendance-alerts',
    type: 'attendance-alerts',
    title: '출결 경고',
    description: '연속 결석/출결률 낮은 학생',
    category: '출결관리',
    size: 'medium',
    enabled: true,
    order: 19,
  },

  // 수업일지
  {
    id: 'lessons-summary',
    type: 'lessons-summary',
    title: '수업일지 현황',
    description: '이번 달 수업 통계',
    category: '수업관리',
    size: 'small',
    enabled: true,
    order: 20,
  },
  {
    id: 'lessons-recent',
    type: 'lessons-recent',
    title: '최근 수업일지',
    description: '최근 작성된 수업일지',
    category: '수업관리',
    size: 'medium',
    enabled: true,
    order: 21,
  },

  // 강사 관리
  {
    id: 'teachers-summary',
    type: 'teachers-summary',
    title: '강사 현황',
    description: '재직 강사/담당 학생',
    category: '수업관리',
    size: 'small',
    enabled: true,
    order: 22,
  },

  // 스케줄
  {
    id: 'schedule-today',
    type: 'schedule-today',
    title: '오늘 수업 일정',
    description: '오늘 예정된 수업',
    category: '수업관리',
    size: 'medium',
    enabled: true,
    order: 23,
  },

  // 시설 관리
  {
    id: 'rooms-usage',
    type: 'rooms-usage',
    title: '강의실 사용률',
    description: '강의실별 사용 현황',
    category: '시설관리',
    size: 'medium',
    enabled: true,
    order: 24,
  },
  {
    id: 'seats-realtime',
    type: 'seats-realtime',
    title: '독서실 좌석',
    description: '실시간 좌석 현황',
    category: '시설관리',
    size: 'small',
    enabled: true,
    order: 25,
  },

  // 지출 관리
  {
    id: 'expenses-summary',
    type: 'expenses-summary',
    title: '지출 현황',
    description: '이번 달 총 지출',
    category: '재무관리',
    size: 'small',
    enabled: true,
    order: 26,
  },
  {
    id: 'expenses-trend',
    type: 'expenses-trend',
    title: '지출 추이',
    description: '월별 지출 변화',
    category: '재무관리',
    size: 'medium',
    enabled: true,
    order: 27,
  },

  // 기타
  {
    id: 'recent-activities',
    type: 'recent-activities',
    title: '최근 활동',
    description: '최근 7일간의 주요 활동',
    category: '기타',
    size: 'medium',
    enabled: true,
    order: 6,
  },
  {
    id: 'announcements',
    type: 'announcements',
    title: '공지사항',
    description: '중요한 공지사항 (기능 개발 예정)',
    category: '기타',
    size: 'medium',
    enabled: false,  // 실제 데이터 테이블이 없으므로 비활성화
    order: 7,
  },
]

// 기본 활성화 위젯 ID
export const defaultEnabledWidgetIds = availableWidgets
  .filter((w) => w.enabled)
  .map((w) => w.id)

// LocalStorage 키 (v6로 변경하여 캐시 초기화 - announcements 비활성화)
export const WIDGETS_STORAGE_KEY = 'dashboard-widgets-config-v6'

// 위젯 설정 가져오기 (Smart Config Merging)
export function getWidgetsConfig(): Widget[] {
  if (typeof window === 'undefined') return availableWidgets

  try {
    const stored = localStorage.getItem(WIDGETS_STORAGE_KEY)
    if (!stored) return availableWidgets

    const savedConfig = JSON.parse(stored) as Widget[]

    // ✅ availableWidgets를 source of truth로 사용
    // LocalStorage의 enabled/order만 적용 (size, type 등은 코드에서 가져옴)
    return availableWidgets.map((widget) => {
      const saved = savedConfig.find((w) => w.id === widget.id)
      if (saved) {
        return {
          ...widget,  // availableWidgets의 최신 정보 사용
          enabled: saved.enabled,  // 사용자 설정만 유지
          order: saved.order,
        }
      }
      return widget
    }).sort((a, b) => a.order - b.order)
  } catch (error) {
    console.error('Failed to load widgets config:', error)
    return availableWidgets
  }
}

// 위젯 설정 저장
export function saveWidgetsConfig(widgets: Widget[]) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(widgets))
  } catch (error) {
    console.error('Failed to save widgets config:', error)
  }
}

// 활성화된 위젯만 가져오기
export function getEnabledWidgets(): Widget[] {
  return getWidgetsConfig()
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order)
}
