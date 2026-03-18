import { pgTable, text, serial, numeric, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const humans = pgTable('humans', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull(),
  haid: text('haid').notNull(),
  fullName: text('full_name').notNull(),
  birthday: text('birthday'),
  email: text('email'),
  sex: text('sex'),
  statusName: text('status_name'),
  type: text('type'),
  cityName: text('city_name'),
  order: numeric('order').default('0'),
  xaid: text('xaid'),
  mediaId: text('media_id'),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  deletedAt: timestamp('deleted_at'),
  gin: jsonb('gin'),
  fts: jsonb('fts'),
  dataIn: jsonb('data_in'),
  dataOut: jsonb('data_out'),
})

