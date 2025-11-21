/**
 * Initialize Migration State
 * This script properly sets up the migration state for an existing database
 * Run this when your database already exists but migrations haven't been tracked
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function initMigrations() {
  try {
    console.log('🔄 Initializing migration state...\n');

    // Get all migration directories
    const migrationsDir = path.join(__dirname, '../prisma/migrations');
    const migrationDirs = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .sort();

    if (migrationDirs.length === 0) {
      console.log('❌ No migrations found. Please create a baseline migration first.');
      process.exit(1);
    }

    const baselineMigration = migrationDirs[0];
    console.log(`📋 Found baseline migration: ${baselineMigration}`);

    // Check if migration is already applied
    const existingMigration = await prisma.$queryRaw`
      SELECT migration_name 
      FROM _prisma_migrations 
      WHERE migration_name = ${baselineMigration}
    `;

    if (existingMigration && existingMigration.length > 0) {
      console.log('✅ Migration already marked as applied.');
      return;
    }

    // Read migration SQL
    const migrationPath = path.join(
      migrationsDir,
      baselineMigration,
      'migration.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Mark migration as applied
    await prisma.$executeRaw`
      INSERT INTO _prisma_migrations (
        migration_name,
        applied_steps_count,
        started_at,
        finished_at
      ) VALUES (
        ${baselineMigration},
        1,
        NOW(),
        NOW()
      )
    `;

    console.log('✅ Migration state initialized successfully!');
    console.log(`   Baseline migration: ${baselineMigration}`);
    console.log('\n💡 You can now run: npx prisma migrate status');
  } catch (error) {
    if (error.code === 'P2025' || error.message.includes('does not exist')) {
      console.log('⚠️  Migration table does not exist. Creating it...');
      // The migration table will be created on first migrate command
      console.log('   Run: npx prisma migrate deploy');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

initMigrations();

