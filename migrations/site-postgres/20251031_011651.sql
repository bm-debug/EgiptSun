CREATE TABLE "employees" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"eaid" text NOT NULL,
  	"full_eaid" text,
  	"haid" text NOT NULL,
  	"email" text,
  	"status_name" text,
  	"is_public" BOOLEAN DEFAULT false,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  	"updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  	"deleted_at" TIMESTAMP,
  	"media_id" text,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "employees_updated_at_idx" ON "employees" ("updated_at");

CREATE INDEX "employees_created_at_idx" ON "employees" ("created_at");