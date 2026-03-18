#!/usr/bin/env node

import { Client } from 'pg';
import { ensureSiteDatabaseUrl } from './utils/app-db-config.mjs';

async function checkAndRemoveRaid() {
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

    // Check if column exists
    const checkResult = await client.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'roles' AND column_name = 'raid'`
    );

    if (checkResult.rows.length === 0) {
      console.log('✓ Column "raid" does not exist in "roles" table');
    } else {
      console.log('⚠️  Column "raid" still exists in "roles" table');
      console.log('📝 Removing column "raid"...');
      
      await client.query('ALTER TABLE "roles" DROP COLUMN IF EXISTS "raid"');
      
      // Verify removal
      const verifyResult = await client.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'roles' AND column_name = 'raid'`
      );
      
      if (verifyResult.rows.length === 0) {
        console.log('✅ Column "raid" successfully removed from "roles" table');
      } else {
        console.error('❌ Failed to remove column "raid"');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkAndRemoveRaid();





