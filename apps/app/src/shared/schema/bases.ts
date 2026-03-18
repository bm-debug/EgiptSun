import { pgTable, text, serial, numeric, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const bases = pgTable('bases', {
	id: serial('id').primaryKey(),
	uuid: text('uuid').notNull(),
	baid: text('baid').notNull(),
	fullBaid: text('full_baid'),
	number: text('number'),
	title: text('title'),
	laidFrom: text('laid_from'),
	laidTo: text('laid_to'),
	cycle: text('cycle'),
	statusName: text('status_name'),
	order: numeric('order').default('0'),
	xaid: text('xaid'),
	updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	deletedAt: timestamp('deleted_at'),
	gin: jsonb('gin'),
	fts: jsonb('fts'),
	dataIn: jsonb('data_in'),
	dataOut: jsonb('data_out'),
});

