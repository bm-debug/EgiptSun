import { pgTable, text, serial, numeric, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const finances = pgTable('finances', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull(),
  faid: text('faid').notNull(),
  fullDaid: text('full_daid'),
  title: text('title'),
  sum: numeric('sum'),
  currencyId: text('currency_id'),
  cycle: text('cycle'),
  type: text('type'),
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
  fts: jsonb('fts'),
  dataIn: jsonb('data_in'),
  dataOut: jsonb('data_out'),
})


