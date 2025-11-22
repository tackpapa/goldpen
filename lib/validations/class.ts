import { z } from 'zod'

/**
 * 반 생성 스키마 (API용)
 */
export const createClassSchema = z.object({
  name: z.string().min(1, '반 이름은 필수입니다').max(100, '반 이름은 100자 이하여야 합니다'),
  subject: z.string().optional(),
  teacher_id: z.string().uuid('유효한 교사 ID가 아닙니다').optional(),
  schedule: z
    .array(
      z.object({
        day: z.string(),
        start_time: z.string(),
        end_time: z.string(),
      })
    )
    .default([]), // JSONB 스케줄
  capacity: z.number().int().positive('정원은 1명 이상이어야 합니다').default(10),
  room: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
})

/**
 * 반 수정 스키마 (API용 - 모든 필드 선택적)
 */
export const updateClassSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subject: z.string().optional(),
  teacher_id: z.string().uuid().nullable().optional(),
  schedule: z
    .array(
      z.object({
        day: z.string(),
        start_time: z.string(),
        end_time: z.string(),
      })
    )
    .optional(),
  capacity: z.number().int().positive().optional(),
  room: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

/**
 * 반 타입 정의
 */
export type CreateClassInput = z.infer<typeof createClassSchema>
export type UpdateClassInput = z.infer<typeof updateClassSchema>

/**
 * 레거시 스키마 (기존 프론트엔드용 - 호환성 유지)
 */
export const ClassSchema = z.object({
  name: z.string().min(2, '반 이름은 최소 2자 이상이어야 합니다'),
  subject: z.string().min(1, '과목을 선택해주세요'),
  teacher_id: z.string().uuid('강사를 선택해주세요').optional(),
  capacity: z.number().min(1, '정원은 1명 이상이어야 합니다'),
  room: z.string().optional(),
  schedule: z
    .array(
      z.object({
        day: z.string(),
        start_time: z.string(),
        end_time: z.string(),
      })
    )
    .optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  notes: z.string().optional(),
})

export type ClassInput = z.infer<typeof ClassSchema>
