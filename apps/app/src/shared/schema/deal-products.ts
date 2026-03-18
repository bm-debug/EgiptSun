import { pgTable, text, serial, numeric, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const dealProducts = pgTable('deal_products', {
	id: serial('id').primaryKey(),
	uuid: text('uuid'),
	fullDaid: text('full_daid').notNull(),
	fullPaid: text('full_paid').notNull(),
	quantity: numeric('quantity').notNull().default('1'),
	statusName: text('status_name'),
	order: numeric('order').default('0'),
	updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	dataIn: jsonb('data_in'),
});

