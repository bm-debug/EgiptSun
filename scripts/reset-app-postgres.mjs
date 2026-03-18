#!/usr/bin/env node

import pg from 'pg';
import { ensureSiteDatabaseUrl } from './utils/app-db-config.mjs';

const { Client } = pg;

async function resetPostgresSchema() {
  console.log('🗑️  Site PostgreSQL Reset Script');
  console.log('='.repeat(60) + '\n');

  const connectionString = ensureSiteDatabaseUrl();
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL\n');

    await client.query('BEGIN');
    console.log('Dropping schema "public"...');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO PUBLIC');

    await client.query('COMMIT');
    console.log('\n✅ Database schema reset successfully!\n');
    console.log('You can now run migrations to recreate the schema:');
    console.log('   npm run db:app:migrate:local\n');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Failed to reset database:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

resetPostgresSchema();


