CREATE TABLE "settings" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"attribute" text NOT NULL,
  	"value" text,
  	"type" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"data_in" text
  );

CREATE INDEX "settings_updated_at_idx" ON "settings" ("updated_at");

CREATE INDEX "settings_created_at_idx" ON "settings" ("created_at");

CREATE TABLE "taxonomy" (
  	"id" BIGSERIAL PRIMARY KEY,
	"uuid" text,
  	"entity" text NOT NULL,
  	"name" text NOT NULL,
  	"title" text,
  	"sort_order" numeric DEFAULT 0,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"data_in" text
  );

CREATE INDEX "taxonomy_updated_at_idx" ON "taxonomy" ("updated_at");

CREATE INDEX "taxonomy_created_at_idx" ON "taxonomy" ("created_at");

CREATE TABLE "media" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"maid" text,
  	"title" text,
  	"alt_text" text,
  	"caption" text,
  	"file_name" text,
  	"file_path" text,
  	"mime_type" text,
  	"size_bytes" numeric,
  	"is_public" BOOLEAN DEFAULT true,
  	"type" text,
  	"uploader_aid" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"data_in" text,
  	"url" text,
  	"thumbnail_u_r_l" text,
  	"filename" text,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );

CREATE INDEX "media_updated_at_idx" ON "media" ("updated_at");

CREATE INDEX "media_created_at_idx" ON "media" ("created_at");

CREATE UNIQUE INDEX "media_filename_idx" ON "media" ("filename");

CREATE TABLE "users" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"human_aid" text,
  	"role_uuid" text,
  	"password_hash" text,
  	"is_active" BOOLEAN DEFAULT true,
  	"last_login_at" TIMESTAMP,
  	"email_verified_at" TIMESTAMP,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"data_in" text,
  	"email" text NOT NULL,
  	"reset_password_token" text,
  	"reset_password_expiration" text,
  	"salt" text,
  	"hash" text,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" text
  );

CREATE INDEX "users_updated_at_idx" ON "users" ("updated_at");

CREATE INDEX "users_created_at_idx" ON "users" ("created_at");

CREATE UNIQUE INDEX "users_email_idx" ON "users" ("email");

CREATE TABLE "journals" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"user_id" numeric,
  	"action" text,
  	"details" text,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
  );

CREATE INDEX "journals_updated_at_idx" ON "journals" ("updated_at");

CREATE INDEX "journals_created_at_idx" ON "journals" ("created_at");

CREATE TABLE "assets" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"aaid" text NOT NULL,
  	"owner_aid" text,
  	"number" text,
  	"title" text,
  	"url" text,
  	"type_name" text,
  	"status_name" text,
  	"version" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "assets_updated_at_idx" ON "assets" ("updated_at");

CREATE INDEX "assets_created_at_idx" ON "assets" ("created_at");

CREATE TABLE "asset_variants" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"full_aaid" text NOT NULL,
  	"number" text,
  	"title" text,
  	"media_id" text,
  	"version" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "asset_variants_updated_at_idx" ON "asset_variants" ("updated_at");

CREATE INDEX "asset_variants_created_at_idx" ON "asset_variants" ("created_at");

CREATE TABLE "bases" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"baid" text NOT NULL,
  	"full_baid" text,
  	"number" text,
  	"title" text,
  	"laid_from" text,
  	"laid_to" text,
  	"cycle" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "bases_updated_at_idx" ON "bases" ("updated_at");

CREATE INDEX "bases_created_at_idx" ON "bases" ("created_at");

CREATE TABLE "base_moves" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"baid" text,
  	"full_baid" text,
  	"full_daid" text,
  	"number" text,
  	"title" text,
  	"laid_from" text,
  	"laid_to" text,
  	"cycle" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "base_moves_updated_at_idx" ON "base_moves" ("updated_at");

CREATE INDEX "base_moves_created_at_idx" ON "base_moves" ("created_at");

CREATE TABLE "base_move_routes" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"full_baid" text NOT NULL,
  	"index" text,
  	"city" text,
  	"laid_id" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"data_in" text
  );

CREATE INDEX "base_move_routes_updated_at_idx" ON "base_move_routes" ("updated_at");

CREATE INDEX "base_move_routes_created_at_idx" ON "base_move_routes" ("created_at");

CREATE TABLE "contractors" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"caid" text NOT NULL,
  	"title" text NOT NULL,
  	"reg" text,
  	"tin" text,
  	"status_name" text,
  	"type" text,
  	"city_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"media_id" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "contractors_updated_at_idx" ON "contractors" ("updated_at");

CREATE INDEX "contractors_created_at_idx" ON "contractors" ("created_at");

CREATE TABLE "deals" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"daid" text NOT NULL,
  	"full_daid" text,
  	"client_aid" text,
  	"title" text,
  	"cycle" text,
  	"status_name" text,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "deals_updated_at_idx" ON "deals" ("updated_at");

CREATE INDEX "deals_created_at_idx" ON "deals" ("created_at");

CREATE TABLE "deal_products" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"full_daid" text NOT NULL,
  	"full_paid" text NOT NULL,
  	"quantity" numeric DEFAULT 1 NOT NULL,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"data_in" text
  );

CREATE INDEX "deal_products_updated_at_idx" ON "deal_products" ("updated_at");

CREATE INDEX "deal_products_created_at_idx" ON "deal_products" ("created_at");

CREATE TABLE "echelons" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"eaid" text NOT NULL,
  	"parent_eaid" text,
  	"department_id" text,
  	"position" text,
  	"city_name" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"data_in" text
  );

CREATE INDEX "echelons_updated_at_idx" ON "echelons" ("updated_at");

CREATE INDEX "echelons_created_at_idx" ON "echelons" ("created_at");

CREATE TABLE "echelon_employees" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"eaid" text NOT NULL,
  	"full_eaid" text,
  	"haid" text NOT NULL,
  	"email" text,
  	"status_name" text,
  	"is_public" BOOLEAN DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"media_id" text,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "echelon_employees_updated_at_idx" ON "echelon_employees" ("updated_at");

CREATE INDEX "echelon_employees_created_at_idx" ON "echelon_employees" ("created_at");

CREATE TABLE "employee_leaves" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"elaid" text,
  	"full_eaid" text,
  	"type" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"started_at" TIMESTAMP,
  	"ended_at" TIMESTAMP,
  	"duration" numeric,
  	"data_in" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW()
  );

CREATE INDEX "employee_leaves_updated_at_idx" ON "employee_leaves" ("updated_at");

CREATE INDEX "employee_leaves_created_at_idx" ON "employee_leaves" ("created_at");

CREATE TABLE "employee_timesheets" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"etaid" text,
  	"full_eaid" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"started_at" TIMESTAMP,
  	"ended_at" TIMESTAMP,
  	"duration" numeric,
  	"data_in" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW()
  );

CREATE INDEX "employee_timesheets_updated_at_idx" ON "employee_timesheets" ("updated_at");

CREATE INDEX "employee_timesheets_created_at_idx" ON "employee_timesheets" ("created_at");

CREATE TABLE "expanses" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"xaid" text,
  	"title" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"data_in" text
  );

CREATE INDEX "expanses_updated_at_idx" ON "expanses" ("updated_at");

CREATE INDEX "expanses_created_at_idx" ON "expanses" ("created_at");

CREATE TABLE "finances" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"faid" text NOT NULL,
  	"full_daid" text,
  	"title" text,
  	"sum" numeric,
  	"currency_id" text,
  	"cycle" text,
  	"type" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "finances_updated_at_idx" ON "finances" ("updated_at");

CREATE INDEX "finances_created_at_idx" ON "finances" ("created_at");

CREATE TABLE "goals" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"gaid" text NOT NULL,
  	"full_gaid" text,
  	"parent_full_gaid" text,
  	"title" text,
  	"cycle" text,
  	"type" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"is_public" BOOLEAN DEFAULT true,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "goals_updated_at_idx" ON "goals" ("updated_at");

CREATE INDEX "goals_created_at_idx" ON "goals" ("created_at");

CREATE TABLE "humans" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"haid" text NOT NULL,
  	"full_name" text NOT NULL,
  	"birthday" text,
  	"email" text,
  	"sex" text,
  	"status_name" text,
  	"type" text,
  	"city_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"media_id" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "humans_updated_at_idx" ON "humans" ("updated_at");

CREATE INDEX "humans_created_at_idx" ON "humans" ("created_at");

CREATE TABLE "identities" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"iaid" text NOT NULL,
  	"entity_aid" text NOT NULL,
  	"identity_aid" text NOT NULL,
  	"permission" text,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"data_in" text
  );

CREATE INDEX "identities_updated_at_idx" ON "identities" ("updated_at");

CREATE INDEX "identities_created_at_idx" ON "identities" ("created_at");

CREATE TABLE "journal_connections" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"source_user_id" numeric,
  	"target_user_id" numeric,
  	"relationship_name" text,
  	"status" text,
  	"details" text,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW()
  );

CREATE INDEX "journal_connections_updated_at_idx" ON "journal_connections" ("updated_at");

CREATE INDEX "journal_connections_created_at_idx" ON "journal_connections" ("created_at");

CREATE TABLE "journal_generations" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"full_maid" text,
  	"user_id" numeric,
  	"model_name" text,
  	"status" text,
  	"token_in" numeric,
  	"token_out" numeric,
  	"total_token" numeric,
  	"details" text,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
  );

CREATE INDEX "journal_generations_updated_at_idx" ON "journal_generations" ("updated_at");

CREATE INDEX "journal_generations_created_at_idx" ON "journal_generations" ("created_at");

CREATE TABLE "journal_system" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"entity_aid" text,
  	"user_id" numeric,
  	"details" text,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
  );

CREATE INDEX "journal_system_updated_at_idx" ON "journal_system" ("updated_at");

CREATE INDEX "journal_system_created_at_idx" ON "journal_system" ("created_at");

CREATE TABLE "keys" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"kaid" text NOT NULL,
  	"key_prefix" text,
  	"key_hash" text NOT NULL,
  	"title" text,
  	"is_active" BOOLEAN DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"permission_id" numeric,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"data_in" text
  );

CREATE INDEX "keys_updated_at_idx" ON "keys" ("updated_at");

CREATE INDEX "keys_created_at_idx" ON "keys" ("created_at");

CREATE TABLE "locations" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"laid" text NOT NULL,
  	"full_laid" text,
  	"title" text,
  	"city" text,
  	"type" text,
  	"status_name" text,
  	"is_public" BOOLEAN DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "locations_updated_at_idx" ON "locations" ("updated_at");

CREATE INDEX "locations_created_at_idx" ON "locations" ("created_at");

CREATE TABLE "messages" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"maid" text NOT NULL,
  	"full_maid" text,
  	"title" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text
  );

CREATE INDEX "messages_updated_at_idx" ON "messages" ("updated_at");

CREATE INDEX "messages_created_at_idx" ON "messages" ("created_at");

CREATE TABLE "message_threads" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"maid" text NOT NULL,
  	"parent_maid" text,
  	"title" text,
  	"status_name" text,
  	"type" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"data_in" text
  );

CREATE INDEX "message_threads_updated_at_idx" ON "message_threads" ("updated_at");

CREATE INDEX "message_threads_created_at_idx" ON "message_threads" ("created_at");

CREATE TABLE "notices" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"naid" text,
  	"target_aid" text,
  	"title" text,
  	"is_read" BOOLEAN DEFAULT false,
  	"type_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"data_in" text
  );

CREATE INDEX "notices_updated_at_idx" ON "notices" ("updated_at");

CREATE INDEX "notices_created_at_idx" ON "notices" ("created_at");

CREATE TABLE "outreaches" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"oaid" text NOT NULL,
  	"said" text,
  	"title" text,
  	"strategy_type" text,
  	"mechanic_type" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "outreaches_updated_at_idx" ON "outreaches" ("updated_at");

CREATE INDEX "outreaches_created_at_idx" ON "outreaches" ("created_at");

CREATE TABLE "outreach_referrals" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"oaid" text NOT NULL,
  	"title" text,
  	"depth" numeric DEFAULT 0,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text
  );

CREATE INDEX "outreach_referrals_updated_at_idx" ON "outreach_referrals" ("updated_at");

CREATE INDEX "outreach_referrals_created_at_idx" ON "outreach_referrals" ("created_at");

CREATE TABLE "permissions" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"prm_aid" text,
  	"action_key" text NOT NULL,
  	"title" text,
  	"group_name" text,
  	"description" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"data_in" text
  );

CREATE INDEX "permissions_updated_at_idx" ON "permissions" ("updated_at");

CREATE INDEX "permissions_created_at_idx" ON "permissions" ("created_at");

CREATE TABLE "products" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"paid" text NOT NULL,
  	"title" text,
  	"category" text,
  	"type" text,
  	"status_name" text,
  	"is_public" BOOLEAN DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "products_updated_at_idx" ON "products" ("updated_at");

CREATE INDEX "products_created_at_idx" ON "products" ("created_at");

CREATE TABLE "product_variants" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text NOT NULL,
  	"pvaid" text NOT NULL,
  	"full_paid" text NOT NULL,
  	"vendor_aid" text,
  	"sku" text,
  	"title" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "product_variants_updated_at_idx" ON "product_variants" ("updated_at");

CREATE INDEX "product_variants_created_at_idx" ON "product_variants" ("created_at");

CREATE TABLE "qualifications" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"qaid" text,
  	"haid" text,
  	"title" text,
  	"category" text,
  	"type" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "qualifications_updated_at_idx" ON "qualifications" ("updated_at");

CREATE INDEX "qualifications_created_at_idx" ON "qualifications" ("created_at");

CREATE TABLE "relations" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"source_entity" text NOT NULL,
  	"target_entity" text NOT NULL,
  	"type" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "relations_updated_at_idx" ON "relations" ("updated_at");

CREATE INDEX "relations_created_at_idx" ON "relations" ("created_at");

CREATE TABLE "roles" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"raid" text,
  	"title" text,
  	"name" text,
  	"description" text,
  	"is_system" BOOLEAN DEFAULT false,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"data_in" text
  );

CREATE INDEX "roles_updated_at_idx" ON "roles" ("updated_at");

CREATE INDEX "roles_created_at_idx" ON "roles" ("created_at");

CREATE TABLE "role_permissions" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"role_uuid" text NOT NULL,
  	"permission_uuid" text NOT NULL,
  	"uuid" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
  );

CREATE INDEX "role_permissions_updated_at_idx" ON "role_permissions" ("updated_at");

CREATE INDEX "role_permissions_created_at_idx" ON "role_permissions" ("created_at");

CREATE TABLE "user_roles" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"user_uuid" text NOT NULL,
  	"role_uuid" text NOT NULL,
  	"order" numeric DEFAULT 0,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
  );

CREATE INDEX "user_roles_updated_at_idx" ON "user_roles" ("updated_at");

CREATE INDEX "user_roles_created_at_idx" ON "user_roles" ("created_at");

CREATE TABLE "segments" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"said" text,
  	"title" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text
  );

CREATE INDEX "segments_updated_at_idx" ON "segments" ("updated_at");

CREATE INDEX "segments_created_at_idx" ON "segments" ("created_at");

CREATE TABLE "texts" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"taid" text,
  	"title" text,
  	"type" text,
  	"status_name" text,
  	"is_public" BOOLEAN DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "texts_updated_at_idx" ON "texts" ("updated_at");

CREATE INDEX "texts_created_at_idx" ON "texts" ("created_at");

CREATE TABLE "text_variants" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"taid" text,
  	"full_taid" text,
  	"title" text,
  	"type" text,
  	"status_name" text,
  	"version" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "text_variants_updated_at_idx" ON "text_variants" ("updated_at");

CREATE INDEX "text_variants_created_at_idx" ON "text_variants" ("created_at");

CREATE TABLE "universities" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"uaid" text,
  	"parent_uaid" text,
  	"full_uaid" text,
  	"title" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "universities_updated_at_idx" ON "universities" ("updated_at");

CREATE INDEX "universities_created_at_idx" ON "universities" ("created_at");

CREATE TABLE "user_bans" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"user_uuid" text NOT NULL,
  	"banned_by_aid" text,
  	"reason" text,
  	"type" text,
  	"expires_at" TIMESTAMP,
  	"revoked_at" TIMESTAMP,
  	"revoked_by_aid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"data_in" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
  );

CREATE INDEX "user_bans_updated_at_idx" ON "user_bans" ("updated_at");

CREATE INDEX "user_bans_created_at_idx" ON "user_bans" ("created_at");

CREATE TABLE "user_sessions" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"user_uuid" text NOT NULL,
  	"token_hash" text NOT NULL,
  	"ip_address" text,
  	"user_agent" text,
  	"last_active_at" TIMESTAMP,
  	"expires_at" TIMESTAMP,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"data_in" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
  );

CREATE INDEX "user_sessions_updated_at_idx" ON "user_sessions" ("updated_at");

CREATE INDEX "user_sessions_created_at_idx" ON "user_sessions" ("created_at");

CREATE TABLE "user_verifications" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"user_uuid" text NOT NULL,
  	"type" text,
  	"token_hash" text NOT NULL,
  	"expires_at" TIMESTAMP,
  	"verified_at" TIMESTAMP,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"data_in" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
  );

CREATE INDEX "user_verifications_updated_at_idx" ON "user_verifications" ("updated_at");

CREATE INDEX "user_verifications_created_at_idx" ON "user_verifications" ("created_at");

CREATE TABLE "votes" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"vaid" text,
  	"full_vaid" text,
  	"haid" text,
  	"title" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "votes_updated_at_idx" ON "votes" ("updated_at");

CREATE INDEX "votes_created_at_idx" ON "votes" ("created_at");

CREATE TABLE "wallets" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"waid" text,
  	"full_waid" text,
  	"target_aid" text,
  	"title" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "wallets_updated_at_idx" ON "wallets" ("updated_at");

CREATE INDEX "wallets_created_at_idx" ON "wallets" ("created_at");

CREATE TABLE "wallet_transactions" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"wcaid" text NOT NULL,
  	"full_waid" text,
  	"target_aid" text,
  	"amount" numeric NOT NULL,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"data_in" text
  );

CREATE INDEX "wallet_transactions_updated_at_idx" ON "wallet_transactions" ("updated_at");

CREATE INDEX "wallet_transactions_created_at_idx" ON "wallet_transactions" ("created_at");

CREATE TABLE "yields" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"yaid" text,
  	"parent_yaid" text,
  	"full_yaid" text,
  	"haid" text,
  	"title" text,
  	"status_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"gin" text,
  	"fts" text,
  	"data_in" text
  );

CREATE INDEX "yields_updated_at_idx" ON "yields" ("updated_at");

CREATE INDEX "yields_created_at_idx" ON "yields" ("created_at");

CREATE TABLE "zoos" (
  	"id" BIGSERIAL PRIMARY KEY,
  	"uuid" text,
  	"zaid" text,
  	"parent_zaid" text,
  	"name" text,
  	"birthday" text,
  	"sex" text,
  	"status_name" text,
  	"city_name" text,
  	"order" numeric DEFAULT 0,
  	"xaid" text,
  	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  	"deleted_at" TIMESTAMP,
  	"media_id" text,
  	"gin" text,
  	"fts" text,
  	"data_in" text,
  	"data_out" text
  );

CREATE INDEX "zoos_updated_at_idx" ON "zoos" ("updated_at");

CREATE INDEX "zoos_created_at_idx" ON "zoos" ("created_at");
