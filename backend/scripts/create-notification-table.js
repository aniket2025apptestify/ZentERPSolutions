require('dotenv').config();
const { Client } = require('pg');

async function createNotificationTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Creating Notification table...\n');

    // Check if Notification exists
    const check = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'Notification'
    `);

    if (check.rows.length === 0) {
      await client.query(`
        CREATE TABLE "Notification" (
          "id" TEXT NOT NULL,
          "tenantId" TEXT,
          "userId" TEXT,
          "type" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "read" BOOLEAN NOT NULL DEFAULT false,
          "link" TEXT,
          "metadata" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
        )
      `);
      console.log('✅ Created Notification table');

      // Add foreign keys
      try {
        await client.query(`
          ALTER TABLE "Notification" 
          ADD CONSTRAINT "Notification_tenantId_fkey" 
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        console.log('✅ Added Notification.tenantId foreign key');
      } catch (e) {
        if (!e.message.includes('already exists')) console.log('⚠️  Notification.tenantId FK:', e.message);
      }
    } else {
      console.log('✅ Notification table already exists');
    }

    console.log('\n✅ Notification table ready!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

createNotificationTable();

