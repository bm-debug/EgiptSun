import { pgTable, serial, integer, text, jsonb, timestamp, } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm';

export const journals = pgTable('journals', {
    id: serial('id').primaryKey(),
    user_id: integer('user_id'),
    uuid: text('uuid').notNull(),
    details: jsonb('details').notNull(),
    action: text('action').notNull(),
    xaid: text('xaid'),
    createdAt: timestamp('created_at').notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
})

