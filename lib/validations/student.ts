import { z } from 'zod'

/**
 * 학생 생성 스키마 (API용)
 */
export const createStudentSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다').max(100, '이름은 100자 이하여야 합니다'),
  grade: z.string().optional(),
  phone: z.string().optional(),
  parent_phone: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'graduated']).default('active'),
})

/**
 * 학생 수정 스키마 (API용 - 모든 필드 선택적)
 */
export const updateStudentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  grade: z.string().optional(),
  phone: z.string().optional(),
  parent_phone: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'graduated']).optional(),
})

/**
 * 학생 타입 정의
 */
export type CreateStudentInput = z.infer<typeof createStudentSchema>
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>

/**
 * 레거시 스키마 (기존 프론트엔드용 - 호환성 유지)
 */
export const StudentSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  attendance_code: z.string().regex(/^\d{4}$/, '출결코드는 4자리 숫자여야 합니다').optional().or(z.literal('')),
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
  phone: z.string().optional(),
  school: z.string().min(1, '학교를 입력해주세요'),
  grade: z.enum(['초1','초2','초3','초4','초5','초6','중1', '중2', '중3', '고1', '고2', '고3', '재수'], {
    errorMap: () => ({ message: '학년을 선택해주세요' })
  }),
  parent_name: z.string().min(1, '학부모 이름을 입력해주세요'),
  parent_phone: z.string().min(1, '학부모 전화번호를 입력해주세요'),
  parent_email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
  address: z.string().optional(),
  subjects: z.array(z.string()).default([]),
  status: z.enum(['active', 'inactive', 'graduated']).default('active'),
  goals: z.string().optional(),
  notes: z.string().optional(),
  branch_name: z.string().optional(),
  campuses: z.array(z.string()).optional(),
})

export type StudentInput = z.infer<typeof StudentSchema>

/**
 * 상담 신청 스키마
 */
export const ConsultationSchema = z.object({
  student_name: z.string().min(1, '학생 이름을 입력해주세요'),
  student_grade: z.number().int().min(1).max(12).optional(),
  parent_name: z.string().min(1, '학부모 이름을 입력해주세요'),
  parent_phone: z.string().min(1, '전화번호를 입력해주세요'),
  parent_email: z.string().email('올바른 이메일 형식이 아닙니다').optional(),
  interests: z.array(z.string()).optional(),
  goals: z.string().optional(),
  preferred_times: z.string().optional(),
})

export type ConsultationInput = z.infer<typeof ConsultationSchema>
