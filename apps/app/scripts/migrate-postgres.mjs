#!/usr/bin/env node

/**
 * PostgreSQL Migration Script
 * Executes SQLite migration files converted to PostgreSQL syntax
 */

import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import pg from 'pg';
import { convertSqliteToPostgres } from './convert-sqlite-to-postgres.mjs';

const { Client } = pg;

/**
 * Split SQL into executable statements.
 *
 * This migration runner originally used a naive `sql.split(';')`, which breaks
 * for PostgreSQL constructs that legitimately contain semicolons, e.g.
 * `CREATE FUNCTION ... $$ ... $$` and `DO $$ ... $$`.
 *
 * This splitter understands:
 * - single-quoted strings: '...'
 * - double-quoted identifiers: "..."
 * - line comments: -- ...
 * - block comments: /* ... *\/
 * - dollar-quoted strings: $tag$ ... $tag$
 */
function splitSqlStatements(sql) {
  const statements = [];
  let buf = '';

  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag = null; // e.g. $$ or $func$

  const isDollarTagChar = (ch) =>
    (ch >= 'a' && ch <= 'z') ||
    (ch >= 'A' && ch <= 'Z') ||
    (ch >= '0' && ch <= '9') ||
    ch === '_';

  const tryReadDollarTag = (s, startIdx) => {
    if (s[startIdx] !== '$') return null;
    let j = startIdx + 1;
    while (j < s.length && isDollarTagChar(s[j])) j++;
    if (j < s.length && s[j] === '$') {
      return s.slice(startIdx, j + 1); // includes both '$'
    }
    return null;
  };

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = i + 1 < sql.length ? sql[i + 1] : '';

    // Exit line comment
    if (inLineComment) {
      buf += ch;
      if (ch === '\n') {
        inLineComment = false;
      }
      continue;
    }

    // Exit block comment
    if (inBlockComment) {
      buf += ch;
      if (ch === '*' && next === '/') {
        buf += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }

    // Inside dollar-quoted string: only look for the closing tag
    if (dollarTag) {
      const maybeClose = tryReadDollarTag(sql, i);
      if (maybeClose && maybeClose === dollarTag) {
        buf += maybeClose;
        i += maybeClose.length - 1;
        dollarTag = null;
        continue;
      }
      buf += ch;
      continue;
    }

    // Inside single-quoted string
    if (inSingle) {
      buf += ch;
      if (ch === "'") {
        // Handle escaped quote by doubling: ''
        if (next === "'") {
          buf += next;
          i++;
        } else {
          inSingle = false;
        }
      }
      continue;
    }

    // Inside double-quoted identifier
    if (inDouble) {
      buf += ch;
      if (ch === '"') {
        // Escaped double quote in identifier: ""
        if (next === '"') {
          buf += next;
          i++;
        } else {
          inDouble = false;
        }
      }
      continue;
    }

    // Enter comments (only when not in quotes)
    if (ch === '-' && next === '-') {
      buf += ch + next;
      i++;
      inLineComment = true;
      continue;
    }
    if (ch === '/' && next === '*') {
      buf += ch + next;
      i++;
      inBlockComment = true;
      continue;
    }

    // Enter strings/identifiers
    if (ch === "'") {
      buf += ch;
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      buf += ch;
      inDouble = true;
      continue;
    }

    // Enter dollar-quoted string
    if (ch === '$') {
      const tag = tryReadDollarTag(sql, i);
      if (tag) {
        buf += tag;
        i += tag.length - 1;
        dollarTag = tag;
        continue;
      }
    }

    // Statement separator
    if (ch === ';') {
      const trimmed = buf.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      buf = '';
      continue;
    }

    buf += ch;
  }

  const tail = buf.trim();
  if (tail.length > 0) {
    statements.push(tail);
  }

  return statements;
}

// Determine migrations directory based on execution context
// In Docker: /app/migrations (from Dockerfile, copied from migrations/site)
// In development: ../../migrations/site (from project root)
const MIGRATIONS_DIR = join(process.cwd(), 'migrations/site-postgres');

console.log(`📁 Migrations directory: ${MIGRATIONS_DIR}`);

/**
 * Get DATABASE_URL from environment
 */
function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return url;
}

/**
 * Ensure migrations table exists
 */
async function ensureMigrationsTable(client) {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS _migrations (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `;

  await client.query(createTableSql);
  console.log('✓ Migrations table is ready');
}

/**
 * Check if migration has already been executed
 */
async function isMigrationExecuted(client, migrationName) {
  const result = await client.query(
    'SELECT name FROM _migrations WHERE name = $1',
    [migrationName]
  );
  return result.rows.length > 0;
}

/**
 * Record migration as executed
 */
async function recordMigration(client, migrationName) {
  await client.query(
    'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
    [migrationName]
  );
  console.log(`   ✓ Migration recorded in _migrations table`);
}

/**
 * Get all migration files sorted by name
 */
async function getMigrationFiles() {
  const files = await readdir(MIGRATIONS_DIR);
  return files
    .filter(file => file.endsWith('.sql') && file !== '_init_migrations_table.sql')
    .sort()
    .map(file => join(MIGRATIONS_DIR, file));
}

/**
 * Execute a single migration file
 */
async function executeMigration(client, sqlPath) {
  const fileName = basename(sqlPath);
  const migrationName = fileName.replace('.sql', '');

  // Check if already executed
  const alreadyExecuted = await isMigrationExecuted(client, migrationName);

  if (alreadyExecuted) {
    console.log(`\n⏭️  ${fileName} already executed, skipping...`);
    return true;
  }

  // Read and convert SQL file
  console.log(`\n📝 Executing ${fileName}...`);
  const sqliteSql = await readFile(sqlPath, 'utf8');
  const postgresSql = convertSqliteToPostgres(sqliteSql);

  // Split into statements while respecting $$ blocks, strings and comments
  const statements = splitSqlStatements(postgresSql);

  try {
    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
      }
    }

    // Record successful migration
    await recordMigration(client, migrationName);

    console.log(`✓ Successfully executed ${fileName}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to execute ${fileName}:`);
    console.error(`  Error: ${error.message}`);
    if (error.position) {
      console.error(`  Position: ${error.position}`);
    }
    return false;
  }
}

/**
 * Execute all migrations
 */
async function executeMigrations() {
  console.log('🔧 PostgreSQL Migration Script');
  console.log('='.repeat(60) + '\n');

  const databaseUrl = getDatabaseUrl();
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL database\n');

    // Ensure migrations table exists
    console.log('📋 Ensuring migrations table exists...');
    await ensureMigrationsTable(client);
    console.log('');

    // Get all migration files
    const migrationFiles = await getMigrationFiles();

    if (migrationFiles.length === 0) {
      console.log('⚠️  No migrations found to execute');
      return;
    }

    console.log(`Found ${migrationFiles.length} migration(s) to execute\n`);

    let successCount = 0;
    let failCount = 0;

    // Execute migrations in order
    for (const migrationFile of migrationFiles) {
      const success = await executeMigration(client, migrationFile);
      if (success) {
        successCount++;
      } else {
        failCount++;
        // Stop on first failure
        console.error('\n⚠️  Stopping migration due to error');
        break;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Completed: ${successCount} successful, ${failCount} failed`);
    console.log('='.repeat(60));

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migrations
executeMigrations();

