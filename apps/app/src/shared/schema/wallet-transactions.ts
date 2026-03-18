import { pgTable, text, serial, numeric, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const walletTransactions = pgTable('wallet_transactions', {
	id: serial('id').primaryKey(),
	uuid: text('uuid'),
	wcaid: text('wcaid').notNull(),
	fullWaid: text('full_waid'),
	targetAid: text('target_aid'),
	amount: numeric('amount').notNull(),
	statusName: text('status_name'),
	order: numeric('order').default('0'),
	xaid: text('xaid'),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
	deletedAt: timestamp('deleted_at'),
	dataIn: jsonb('data_in'),
});

