require('dotenv').config();
const { Client } = require('pg');

async function addUpdatedAtColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if column exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'QCRecord' AND column_name = 'updatedAt'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ updatedAt column already exists');
      return;
    }

    // Add column with default
    await client.query(`
      ALTER TABLE "QCRecord" 
      ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Added updatedAt column');

    // Update existing rows
    await client.query(`
      UPDATE "QCRecord" 
      SET "updatedAt" = "createdAt"
    `);
    console.log('✅ Updated existing rows');

    // Make it NOT NULL
    await client.query(`
      ALTER TABLE "QCRecord" 
      ALTER COLUMN "updatedAt" SET NOT NULL
    `);
    console.log('✅ Made updatedAt NOT NULL');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

addUpdatedAtColumn();

