import { pgTable, text, serial, numeric, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  uuid: text('uuid'),
  attribute: text('attribute').notNull(),
  value: text('value'),
  type: text('type'),
  order: numeric('order').default('0'),
  xaid: text('xaid'),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`),
  dataIn: jsonb('data_in'),
})


