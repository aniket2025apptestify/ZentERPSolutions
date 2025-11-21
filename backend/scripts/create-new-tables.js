require('dotenv').config();
const { Client } = require('pg');

async function createNewTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if ReworkJob exists
    const reworkCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'ReworkJob'
    `);

    if (reworkCheck.rows.length === 0) {
      console.log('Creating ReworkJob table...');
      await client.query(`
        CREATE TABLE "ReworkJob" (
          "id" TEXT NOT NULL,
          "tenantId" TEXT NOT NULL,
          "sourceProductionJobId" TEXT,
          "sourceDNId" TEXT,
          "assignedTo" TEXT,
          "createdBy" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          "expectedHours" DOUBLE PRECISION,
          "actualHours" DOUBLE PRECISION,
          "notes" TEXT,
          "materialNeeded" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "ReworkJob_pkey" PRIMARY KEY ("id")
        )
      `);
      console.log('✅ Created ReworkJob table');
    } else {
      console.log('✅ ReworkJob table already exists');
    }

    // Check if ReturnRecord exists
    const returnCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'ReturnRecord'
    `);

    if (returnCheck.rows.length === 0) {
      console.log('Creating ReturnRecord table...');
      await client.query(`
        CREATE TABLE "ReturnRecord" (
          "id" TEXT NOT NULL,
          "tenantId" TEXT NOT NULL,
          "dnId" TEXT NOT NULL,
          "clientId" TEXT NOT NULL,
          "reason" TEXT NOT NULL,
          "items" JSONB NOT NULL,
          "status" TEXT NOT NULL,
          "inspectedBy" TEXT,
          "inspectedAt" TIMESTAMP(3),
          "outcome" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "ReturnRecord_pkey" PRIMARY KEY ("id")
        )
      `);
      console.log('✅ Created ReturnRecord table');
    } else {
      console.log('✅ ReturnRecord table already exists');
    }

    // Add foreign keys
    console.log('Adding foreign keys...');
    
    // ReworkJob foreign keys
    try {
      await client.query(`
        ALTER TABLE "ReworkJob" 
        ADD CONSTRAINT "ReworkJob_tenantId_fkey" 
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      `);
      console.log('✅ Added ReworkJob.tenantId foreign key');
    } catch (e) {
      if (!e.message.includes('already exists')) console.log('⚠️  ReworkJob.tenantId FK:', e.message);
    }

    try {
      await client.query(`
        ALTER TABLE "ReworkJob" 
        ADD CONSTRAINT "ReworkJob_sourceProductionJobId_fkey" 
        FOREIGN KEY ("sourceProductionJobId") REFERENCES "ProductionJob"("id") ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log('✅ Added ReworkJob.sourceProductionJobId foreign key');
    } catch (e) {
      if (!e.message.includes('already exists')) console.log('⚠️  ReworkJob.sourceProductionJobId FK:', e.message);
    }

    try {
      await client.query(`
        ALTER TABLE "ReworkJob" 
        ADD CONSTRAINT "ReworkJob_sourceDNId_fkey" 
        FOREIGN KEY ("sourceDNId") REFERENCES "DeliveryNote"("id") ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log('✅ Added ReworkJob.sourceDNId foreign key');
    } catch (e) {
      if (!e.message.includes('already exists')) console.log('⚠️  ReworkJob.sourceDNId FK:', e.message);
    }

    // ReturnRecord foreign keys
    try {
      await client.query(`
        ALTER TABLE "ReturnRecord" 
        ADD CONSTRAINT "ReturnRecord_tenantId_fkey" 
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      `);
      console.log('✅ Added ReturnRecord.tenantId foreign key');
    } catch (e) {
      if (!e.message.includes('already exists')) console.log('⚠️  ReturnRecord.tenantId FK:', e.message);
    }

    try {
      await client.query(`
        ALTER TABLE "ReturnRecord" 
        ADD CONSTRAINT "ReturnRecord_dnId_fkey" 
        FOREIGN KEY ("dnId") REFERENCES "DeliveryNote"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('✅ Added ReturnRecord.dnId foreign key');
    } catch (e) {
      if (!e.message.includes('already exists')) console.log('⚠️  ReturnRecord.dnId FK:', e.message);
    }

    try {
      await client.query(`
        ALTER TABLE "ReturnRecord" 
        ADD CONSTRAINT "ReturnRecord_clientId_fkey" 
        FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('✅ Added ReturnRecord.clientId foreign key');
    } catch (e) {
      if (!e.message.includes('already exists')) console.log('⚠️  ReturnRecord.clientId FK:', e.message);
    }

    // Update QCRecord foreign keys if needed
    try {
      await client.query(`
        ALTER TABLE "QCRecord" 
        ADD CONSTRAINT "QCRecord_tenantId_fkey" 
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      `);
      console.log('✅ Added QCRecord.tenantId foreign key');
    } catch (e) {
      if (!e.message.includes('already exists')) console.log('⚠️  QCRecord.tenantId FK:', e.message);
    }

    console.log('✅ All tables and foreign keys created/verified');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

createNewTables();

