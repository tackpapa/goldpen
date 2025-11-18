import { pgTable, uuid, varchar, text, timestamp, date, time, boolean, pgEnum } from 'drizzle-orm/pg-core'
import { organizations, branches } from './organizations'
import { students } from './students'
import { users } from './users'

// Consultation Status Enum
export const consultationStatusEnum = pgEnum('consultation_status', [
  'pending',
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
])

// Consultations Table
export const consultations = pgTable('consultations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'set null' }),
  consultantId: uuid('consultant_id').references(() => users.id, { onDelete: 'set null' }),

  // 상담 신청자 정보 (학생이 아직 등록되지 않은 경우)
  applicantName: varchar('applicant_name', { length: 100 }),
  applicantPhone: varchar('applicant_phone', { length: 20 }),
  applicantEmail: varchar('applicant_email', { length: 255 }),

  // 학생 정보
  studentName: varchar('student_name', { length: 100 }),
  studentGrade: varchar('student_grade', { length: 20 }),
  studentSchool: varchar('student_school', { length: 255 }),

  // 상담 정보
  scheduledDate: date('scheduled_date'),
  scheduledTime: time('scheduled_time'),
  status: consultationStatusEnum('status').default('pending').notNull(),
  subject: varchar('subject', { length: 255 }),
  type: varchar('type', { length: 50 }), // initial, follow_up, parent_meeting
  notes: text('notes'),
  summary: text('summary'),

  // 후속 조치
  followUpRequired: boolean('follow_up_required').default(false),
  followUpDate: date('follow_up_date'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
