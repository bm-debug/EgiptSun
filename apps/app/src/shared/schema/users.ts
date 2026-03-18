import { pgTable, text, serial, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'


export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull(),
  humanAid: text('human_aid'),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  emailVerifiedAt: timestamp('email_verified_at'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
  deletedAt: timestamp('deleted_at'),
  dataIn: jsonb('data_in'),
})

