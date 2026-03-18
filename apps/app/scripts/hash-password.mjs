#!/usr/bin/env node

/**
 * Script to hash a password using SHA-256
 * Usage: node scripts/hash-password.mjs <password>
 */

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/hash-password.mjs <password>');
  process.exit(1);
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', passwordData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

hashPassword(password)
  .then(hash => {
    console.log('Password hash (SHA-256):');
    console.log(hash);
  })
  .catch(error => {
    console.error('Error hashing password:', error);
    process.exit(1);
  });

