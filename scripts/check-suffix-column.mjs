#!/usr/bin/env node

import { Client } from 'pg';
import { ensureSiteDatabaseUrl } from './utils/app-db-config.mjs';

async function checkSuffixColumn() {
  ensureSiteDatabaseUrl();
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL database\n');

    // Check all columns in roles table
    const result = await client.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'roles' 
       ORDER BY ordinal_position`
    );

    console.log('Columns in roles table:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    const hasSuffix = result.rows.some(r => r.column_name === 'suffix');
    console.log(`\nHas suffix column: ${hasSuffix}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkSuffixColumn();





