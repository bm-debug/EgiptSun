import { pgTable, serial, varchar, boolean, numeric as pgNumeric, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';



const createNoticesPostgres = () => pgTable('notices', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid'),
  naid: varchar('naid'),
  targetAid: varchar('target_aid'),
  title: varchar('title'),
  isRead: boolean('is_read').default(false),
  typeName: varchar('type_name'),
  order: pgNumeric('order').default('0'),
  xaid: varchar('xaid'),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
  deletedAt: timestamp('deleted_at'),
  dataIn: jsonb('data_in'),
});

export const notices =  createNoticesPostgres();

