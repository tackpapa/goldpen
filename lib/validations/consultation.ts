import { z } from 'zod'

// Consultation status enum
const consultationStatusEnum = z.enum(['new', 'scheduled', 'enrolled', 'rejected', 'on_hold', 'waitlist'])

// Grade options (학생 등록 모달과 동일)
const gradeOptions = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3', '재수', '삼수', '사수', 'N수'] as const

// Create consultation schema - matches DB schema in 20251121_create_consultations_tables.sql
export const createConsultationSchema = z.object({
  // Student Information
  student_name: z.string().min(1, '학생 이름은 필수입니다'),
  student_grade: z.string().optional(),

  // Parent Information
  parent_name: z.string().min(1, '학부모 이름은 필수입니다'),
  parent_phone: z.string().min(1, '연락처는 필수입니다'),
  parent_email: z.string().email().optional().nullable(),

  // Consultation Details
  goals: z.string().optional().nullable(),
  preferred_times: z.string().optional().nullable(),
  scheduled_date: z.string().datetime().optional().nullable(),

  // Status
  status: consultationStatusEnum.default('new'),

  // Notes and Results
  notes: z.string().optional().nullable(),
  result: z.string().optional().nullable(),

  // Attachments
  images: z.array(z.string()).optional().default([]),
})

// Update consultation schema
export const updateConsultationSchema = z.object({
  // Student Information
  student_name: z.string().min(1).optional(),
  student_grade: z.string().optional().nullable(),

  // Parent Information
  parent_name: z.string().min(1).optional(),
  parent_phone: z.string().min(1).optional(),
  parent_email: z.string().email().optional().nullable(),

  // Consultation Details
  goals: z.string().optional().nullable(),
  preferred_times: z.string().optional().nullable(),
  scheduled_date: z.string().datetime().optional().nullable(),

  // Status
  status: consultationStatusEnum.optional(),

  // Notes and Results
  notes: z.string().optional().nullable(),
  result: z.string().optional().nullable(),

  // Enrollment Tracking
  enrolled_date: z.string().datetime().optional().nullable(),

  // Attachments
  images: z.array(z.string()).optional(),
})

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>
export type ConsultationStatus = z.infer<typeof consultationStatusEnum>
