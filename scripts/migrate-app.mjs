#!/usr/bin/env node

import { ensureSiteDatabaseUrl, resolveSiteMigrationsDir } from './utils/app-db-config.mjs';

function prepareEnvironment() {
  const migrationsDir = resolveSiteMigrationsDir();
  process.env.MIGRATIONS_DIR = migrationsDir;
  ensureSiteDatabaseUrl();
}

async function runMigrations() {
  prepareEnvironment();

  try {
    await import(new URL('../apps/app/scripts/migrate-postgres.mjs', import.meta.url));
  } catch (error) {
    console.error('\n❌ Failed to execute PostgreSQL migrations:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

runMigrations();
