import { pgTable, text, serial, customType, integer, timestamp } from 'drizzle-orm/pg-core'

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

export const files = pgTable('files', {
  id: serial('id').primaryKey(),
  uuid: text('uuid').notNull(),
  mediaUuid: text('media_uuid').notNull(),
  deletedAt: timestamp('deleted_at'),
  data: bytea('data').notNull(),
})


