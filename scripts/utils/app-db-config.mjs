import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

let envLoaded = false;

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line || line.trim().length === 0) {
      continue;
    }

    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key) {
      continue;
    }

    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export function loadSiteEnv() {
  if (envLoaded) {
    return;
  }

  const envFiles = [
    process.env.APP_ENV_FILE,
    resolve('apps/app/.env'),
    resolve('apps/app/.dev.vars'),
    resolve('apps/app/example.env'),
  ].filter(Boolean);

  envFiles.forEach(loadEnvFile);
  envLoaded = true;
}

export function ensureSiteDatabaseUrl() {
  loadSiteEnv();

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not defined. Set it in apps/app/.env, use APP_ENV_FILE=/path/to/.env, or export DATABASE_URL before running this script.',
    );
  }

  return url;
}

export function resolveSiteMigrationsDir() {
  if (process.env.MIGRATIONS_DIR) {
    return process.env.MIGRATIONS_DIR;
  }

  return resolve('migrations/app');
}

