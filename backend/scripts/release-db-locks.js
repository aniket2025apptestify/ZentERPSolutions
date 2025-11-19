/**
 * Release Database Locks
 * Terminates connections that are locking the database
 * USE WITH CAUTION - This will disconnect active sessions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function releaseLocks() {
  try {
    console.log('🔓 Releasing database locks...\n');

    // Get all connections except this one
    const connections = await prisma.$queryRaw`
      SELECT pid, usename, application_name, state
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid != pg_backend_pid()
        AND state != 'idle';
    `;

    if (!connections || connections.length === 0) {
      console.log('✅ No active connections to terminate');
      return;
    }

    console.log(`Found ${connections.length} active connection(s) to terminate:\n`);

    for (const conn of connections) {
      console.log(`Terminating PID ${conn.pid} (${conn.application_name || 'unknown'})...`);
      
      try {
        await prisma.$executeRawUnsafe(
          `SELECT pg_terminate_backend(${conn.pid});`
        );
        console.log(`  ✅ Terminated`);
      } catch (error) {
        console.log(`  ⚠️  Could not terminate: ${error.message}`);
      }
    }

    console.log('\n✅ Lock release complete!');
    console.log('   You can now run migrations');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

releaseLocks();

