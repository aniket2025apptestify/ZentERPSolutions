require('dotenv').config();
const { Client } = require('pg');

async function fixQCRecordSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Fixing QCRecord schema...\n');

    // Check if deliveryNoteId exists
    const colCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'QCRecord' AND column_name = 'deliveryNoteId'
    `);

    if (colCheck.rows.length === 0) {
      console.log('Adding deliveryNoteId column...');
      await client.query(`
        ALTER TABLE "QCRecord" 
        ADD COLUMN "deliveryNoteId" TEXT
      `);
      console.log('✅ Added deliveryNoteId column');
    } else {
      console.log('✅ deliveryNoteId column already exists');
    }

    // Make productionJobId nullable
    console.log('Making productionJobId nullable...');
    await client.query(`
      ALTER TABLE "QCRecord" 
      ALTER COLUMN "productionJobId" DROP NOT NULL
    `);
    console.log('✅ Made productionJobId nullable');

    // Make stage nullable
    console.log('Making stage nullable...');
    await client.query(`
      ALTER TABLE "QCRecord" 
      ALTER COLUMN "stage" DROP NOT NULL
    `);
    console.log('✅ Made stage nullable');

    // Add foreign key for deliveryNoteId
    try {
      await client.query(`
        ALTER TABLE "QCRecord" 
        ADD CONSTRAINT "QCRecord_deliveryNoteId_fkey" 
        FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('✅ Added QCRecord.deliveryNoteId foreign key');
    } catch (e) {
      if (!e.message.includes('already exists')) console.log('⚠️  QCRecord.deliveryNoteId FK:', e.message);
    }

    console.log('\n✅ QCRecord schema fixed!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

fixQCRecordSchema();

