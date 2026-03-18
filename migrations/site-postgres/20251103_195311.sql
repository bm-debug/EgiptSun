ALTER TABLE "media"
  ADD CONSTRAINT "media_uuid_unique" UNIQUE ("uuid");

CREATE TABLE IF NOT EXISTS "files" (
  "id"           BIGSERIAL PRIMARY KEY,
  "uuid"        text NOT NULL,
  "media_uuid"   text NOT NULL,
  "deleted_at"   TIMESTAMP,
  "data"         bytea NOT NULL
);

ALTER TABLE "files"
  ADD CONSTRAINT "files_media_uuid_fk"
  FOREIGN KEY ("media_uuid")
  REFERENCES "media" ("uuid")
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "files_media_uuid_idx" ON "files" ("media_uuid");

