/**
 * Database Backup Script
 * Creates a backup of the database before migration
 * 
 * Usage: node scripts/backup-database.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

// Parse DATABASE_URL
// Format: postgresql://user:password@host:port/database
const urlMatch = DATABASE_URL.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

if (!urlMatch) {
  console.error('❌ Invalid DATABASE_URL format');
  process.exit(1);
}

const [, user, password, host, port, database] = urlMatch;

// Create backup directory if it doesn't exist
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Generate backup filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                  new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
const backupFile = path.join(backupDir, `backup_${database}_${timestamp}.sql`);

console.log('🔄 Creating database backup...');
console.log(`   Database: ${database}`);
console.log(`   Host: ${host}:${port}`);
console.log(`   Backup file: ${backupFile}`);

// Set PGPASSWORD environment variable for pg_dump
process.env.PGPASSWORD = password;

// Run pg_dump
const dumpCommand = `pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F c -f "${backupFile}"`;

exec(dumpCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Backup failed:', error.message);
    console.error('   Make sure pg_dump is installed and accessible');
    console.error('   You can install it from: https://www.postgresql.org/download/');
    process.exit(1);
  }

  if (stderr && !stderr.includes('WARNING')) {
    console.error('⚠️  Warnings:', stderr);
  }

  // Check if file was created
  if (fs.existsSync(backupFile)) {
    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log('✅ Backup created successfully!');
    console.log(`   File: ${backupFile}`);
    console.log(`   Size: ${fileSizeMB} MB`);
    console.log('');
    console.log('💡 To restore this backup:');
    console.log(`   pg_restore -h ${host} -p ${port} -U ${user} -d ${database} "${backupFile}"`);
  } else {
    console.error('❌ Backup file was not created');
    process.exit(1);
  }
});

