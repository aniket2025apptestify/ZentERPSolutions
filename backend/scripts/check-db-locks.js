/**
 * Check Database Locks
 * Identifies what's locking the database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLocks() {
  try {
    console.log('🔍 Checking database locks...\n');

    // Check for active connections
    const connections = await prisma.$queryRaw`
      SELECT 
        pid,
        usename,
        application_name,
        client_addr,
        state,
        query_start,
        state_change,
        wait_event_type,
        wait_event,
        query
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid != pg_backend_pid()
      ORDER BY query_start;
    `;

    if (connections && connections.length > 0) {
      console.log(`⚠️  Found ${connections.length} active connection(s):\n`);
      connections.forEach((conn, index) => {
        console.log(`Connection ${index + 1}:`);
        console.log(`  PID: ${conn.pid}`);
        console.log(`  User: ${conn.usename}`);
        console.log(`  Application: ${conn.application_name || 'N/A'}`);
        console.log(`  State: ${conn.state}`);
        console.log(`  Query: ${(conn.query || '').substring(0, 100)}...`);
        console.log('');
      });

      console.log('💡 To release locks, you can:');
      console.log('   1. Stop your backend server (Ctrl+C)');
      console.log('   2. Or kill the connection: SELECT pg_terminate_backend(PID);');
    } else {
      console.log('✅ No active connections found (except this one)');
    }

    // Check for advisory locks
    const advisoryLocks = await prisma.$queryRaw`
      SELECT 
        locktype,
        objid,
        pid,
        mode,
        granted
      FROM pg_locks
      WHERE locktype = 'advisory'
        AND pid != pg_backend_pid();
    `;

    if (advisoryLocks && advisoryLocks.length > 0) {
      console.log(`\n⚠️  Found ${advisoryLocks.length} advisory lock(s):\n`);
      advisoryLocks.forEach((lock, index) => {
        console.log(`Lock ${index + 1}:`);
        console.log(`  PID: ${lock.pid}`);
        console.log(`  Mode: ${lock.mode}`);
        console.log(`  Granted: ${lock.granted}`);
        console.log('');
      });
    } else {
      console.log('\n✅ No advisory locks found');
    }

  } catch (error) {
    if (error.code === 'P1001') {
      console.error('❌ Cannot connect to database');
      console.error('   Make sure your database server is running');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkLocks();

