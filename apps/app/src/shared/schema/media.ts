import { pgTable, text, serial, numeric, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull(),
  maid: text('maid'),
  title: text('title'),
  altText: text('alt_text'),
  caption: text('caption'),
  fileName: text('file_name'),
  filePath: text('file_path'),
  mimeType: text('mime_type'),
  sizeBytes: numeric('size_bytes'),
  isPublic: boolean('is_public').default(true),
  type: text('type'),
  uploaderAid: text('uploader_aid'),
  order: numeric('order').default('0'),
  xaid: text('xaid'),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  deletedAt: timestamp('deleted_at'),
  dataIn: jsonb('data_in'),
  url: text('url'),
  thumbnailUrl: text('thumbnail_u_r_l'),
  filename: text('filename'),
  filesize: numeric('filesize'),
  width: numeric('width'),
  height: numeric('height'),
  focalX: numeric('focal_x'),
  focalY: numeric('focal_y'),
})


