import { pgTable, uuid, varchar, text, timestamp, date, integer, boolean } from 'drizzle-orm/pg-core'
import { organizations, branches } from './organizations'
import { users } from './users'

// Teachers Table
export const teachers = pgTable('teachers', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  employeeNumber: varchar('employee_number', { length: 50 }),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  subjects: text('subjects'), // JSON array string
  hireDate: date('hire_date'),
  salary: integer('salary'),
  isActive: boolean('is_active').default(true).notNull(),
  notes: text('notes'),
  metadata: text('metadata'), // JSON string
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
