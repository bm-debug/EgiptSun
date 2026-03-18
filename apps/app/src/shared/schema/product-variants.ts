import { pgTable, text, serial, numeric, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const productVariants = pgTable('product_variants', {
	id: serial('id').primaryKey(),
	uuid: text('uuid').notNull(),
	pvaid: text('pvaid').notNull(),
	fullPaid: text('full_paid').notNull(),
	vendorAid: text('vendor_aid'),
	sku: text('sku'),
	title: text('title'),
	statusName: text('status_name'),
	order: numeric('order').default('0'),
	xaid: text('xaid'),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
	deletedAt: timestamp('deleted_at'),
	gin: jsonb('gin'),
	fts: jsonb('fts'),
	dataIn: jsonb('data_in'),
	dataOut: jsonb('data_out'),
});

