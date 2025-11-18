import { pgTable, uuid, varchar, text, timestamp, integer, date, boolean, pgEnum } from 'drizzle-orm/pg-core'
import { organizations, branches } from './organizations'
import { users } from './users'

// Student Status Enum
export const studentStatusEnum = pgEnum('student_status', [
  'active',
  'inactive',
  'graduated',
  'withdrawn',
])

// Students Table
export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  studentNumber: varchar('student_number', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }),
  birthDate: date('birth_date'),
  grade: integer('grade'),
  school: varchar('school', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  status: studentStatusEnum('status').default('active').notNull(),
  enrollmentDate: date('enrollment_date').notNull(),
  notes: text('notes'),
  metadata: text('metadata'), // JSON string
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Parents/Guardians Table
export const guardians = pgTable('guardians', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull(),
  relationship: varchar('relationship', { length: 50 }).notNull(), // 아버지, 어머니, 조부모 등
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  isPrimary: boolean('is_primary').default(false).notNull(),
  receiveNotifications: boolean('receive_notifications').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
