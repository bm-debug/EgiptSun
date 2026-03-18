import { pgTable, text, serial, numeric, jsonb, integer, timestamp  } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const goals = pgTable('goals', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull(),
  gaid: text('gaid').notNull(),
  fullGaid: text('full_gaid'),
  parentFullGaid: text('parent_full_gaid'),
  title: text('title'),
  cycle: text('cycle'),
  type: text('type'),
  statusName: text('status_name'),
  order: numeric('order').default('0'),
  isPublic: integer('is_public').default(1),
  xaid: text('xaid'),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  deletedAt: timestamp('deleted_at'),
  gin: jsonb('gin'),
  fts: jsonb('fts'),
  dataIn: jsonb('data_in'),
  dataOut: jsonb('data_out'),
})


