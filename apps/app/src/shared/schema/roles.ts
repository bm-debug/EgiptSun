import { pgTable, text, serial, numeric, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull(),
  title: jsonb('title'),
  name: text('name'),
  description: text('description'),
  isSystem: boolean('is_system').default(false),
  order: numeric('order').default('0'),
  xaid: text('xaid'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
  deletedAt: timestamp('deleted_at'),
  dataIn: jsonb('data_in'),
})

