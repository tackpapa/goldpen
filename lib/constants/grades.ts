/**
 * 학년 옵션 공통 상수
 * 모든 학년 선택 드롭다운에서 이 상수를 사용합니다.
 */

export const GRADE_VALUES = [
  '초1', '초2', '초3', '초4', '초5', '초6',
  '중1', '중2', '중3',
  '고1', '고2', '고3',
  '재수'
] as const

export type GradeValue = typeof GRADE_VALUES[number]

export const GRADE_OPTIONS = GRADE_VALUES.map(value => ({
  value,
  label: value
}))

// Zod enum에서 사용할 수 있도록 튜플 형태로 export
export const GRADE_ENUM_VALUES = GRADE_VALUES as unknown as [string, ...string[]]
