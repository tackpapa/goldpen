import { z } from 'zod'
import { GRADE_VALUES } from '@/lib/constants/grades'

// Consultation status enum
const consultationStatusEnum = z.enum(['new', 'scheduled', 'enrolled', 'rejected', 'on_hold', 'waitlist'])

// Grade options (공통 상수 사용)
const gradeOptions = GRADE_VALUES

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
