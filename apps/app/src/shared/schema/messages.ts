import { pgTable, text, serial, numeric, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull(),
  maid: text('maid').notNull(),
  fullMaid: text('full_maid'),
  title: text('title'),
  statusName: text('status_name'),
  order: numeric('order').default('0'),
  xaid: text('xaid'),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  deletedAt: timestamp('deleted_at'),
  gin: jsonb('gin'),
  fts: text('fts'),
  dataIn: jsonb('data_in'),
})

