const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixQCRecord() {
  try {
    // Check if updatedAt column exists
    const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'QCRecord' AND column_name = 'updatedAt'
    `;

    if (columns.length === 0) {
      console.log('Adding updatedAt column to QCRecord...');
      
      // Add column with default
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "QCRecord" 
        ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      `);
      
      // Update existing rows
      await prisma.$executeRawUnsafe(`
        UPDATE "QCRecord" 
        SET "updatedAt" = "createdAt"
      `);
      
      // Make it NOT NULL
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "QCRecord" 
        ALTER COLUMN "updatedAt" SET NOT NULL
      `);
      
      console.log('✅ Successfully added updatedAt column to QCRecord');
    } else {
      console.log('✅ updatedAt column already exists');
    }
  } catch (error) {
    console.error('Error fixing QCRecord:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixQCRecord();
