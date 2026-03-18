import { pgTable, text, serial, integer, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userUuid: text('user_uuid').notNull(),
  roleUuid: text('role_uuid').notNull(),
  order: integer('order').default(0),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
})

