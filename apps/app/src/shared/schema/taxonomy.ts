import { pgTable, text, serial, numeric, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const taxonomy = pgTable('taxonomy', {
  id: serial('id').primaryKey(),
  entity: text('entity').notNull(),
  name: text('name').notNull(),
  title: text('title'),
  sortOrder: numeric('sort_order').default('0'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
  deletedAt: timestamp('deleted_at'),
})


