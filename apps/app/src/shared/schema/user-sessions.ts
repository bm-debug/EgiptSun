import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core'

export const userSessions = pgTable('user_sessions', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull(), // session UUID
  userId: integer('user_id').notNull(),
  userAgent: text('user_agent'),
  ip: text('ip'),
  lastSeenAt: timestamp('last_seen_at'),
  expiresAt: timestamp('expires_at'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
})


