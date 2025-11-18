import { pgTable, uuid, timestamp, date, time, text, pgEnum } from 'drizzle-orm/pg-core'
import { students } from './students'
import { classes } from './classes'
import { users } from './users'

// Attendance Status Enum
export const attendanceStatusEnum = pgEnum('attendance_status', [
  'present',
  'absent',
  'late',
  'excused',
])

// Attendance Table
export const attendance = pgTable('attendance', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'set null' }),
  date: date('date').notNull(),
  checkInTime: time('check_in_time'),
  checkOutTime: time('check_out_time'),
  status: attendanceStatusEnum('status').notNull(),
  notes: text('notes'),
  recordedBy: uuid('recorded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
