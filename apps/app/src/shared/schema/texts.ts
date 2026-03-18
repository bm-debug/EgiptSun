import { pgTable, text, serial, numeric, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const texts = pgTable('texts', {
  id: serial('id').primaryKey(),
  uuid: text('uuid'),
  taid: text('taid'),
  title: text('title'),
  type: text('type'), // e.g. BLOG, LEGAL_PAGE, NOTIFICATION_TPL, FAQ, PAGE
  statusName: text('status_name'), // DRAFT | ON_APPROVAL | PUBLISHED
  category: text('category'),
  isPublic: boolean('is_public').default(true),
  order: numeric('order').default('0'),
  xaid: text('xaid'),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`),
  deletedAt: timestamp('deleted_at'),
  gin: jsonb('gin'),
  fts: jsonb('fts'),
  dataIn: jsonb('data_in'),
  dataOut: jsonb('data_out'),
  content: text('content'),
})


