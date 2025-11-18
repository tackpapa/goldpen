import { pgTable, uuid, varchar, text, timestamp, integer, time, boolean, pgEnum } from 'drizzle-orm/pg-core'
import { organizations, branches } from './organizations'
import { teachers } from './teachers'
import { students } from './students'

// Class Status Enum
export const classStatusEnum = pgEnum('class_status', [
  'active',
  'inactive',
  'completed',
])

// Classes Table
export const classes = pgTable('classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').references(() => teachers.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  subject: varchar('subject', { length: 100 }),
  room: varchar('room', { length: 50 }),
  capacity: integer('capacity'),
  currentStudents: integer('current_students').default(0).notNull(),
  startTime: time('start_time'),
  endTime: time('end_time'),
  daysOfWeek: text('days_of_week'), // JSON array: ["mon", "wed", "fri"]
  status: classStatusEnum('status').default('active').notNull(),
  description: text('description'),
  metadata: text('metadata'), // JSON string
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Enrollments Table
export const enrollments = pgTable('enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  classId: uuid('class_id')
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, completed, dropped
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
