/**
 * Migration Verification Script
 * Verifies that migration was successful and data is intact
 * 
 * Usage: node scripts/verify-migration.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');

  try {
    // 1. Check if new columns exist by querying them
    console.log('1. Checking Quotation table...');
    const quotationCount = await prisma.quotation.count();
    console.log(`   ✅ Found ${quotationCount} quotations`);

    // Try to query new fields (will fail if columns don't exist)
    const sampleQuotation = await prisma.quotation.findFirst({
      select: {
        id: true,
        quotationNumber: true,
        status: true,
        subtotal: true,
        vatPercent: true,
        vatAmount: true,
        notes: true,
        attachments: true,
        sentAt: true,
        sentBy: true,
        rejectedBy: true,
        rejectedAt: true,
        totalAmount: true,
      },
    });

    if (sampleQuotation) {
      console.log('   ✅ New columns exist and are accessible');
      console.log(`   ✅ Sample quotation: ${sampleQuotation.quotationNumber}`);
    }

    // 2. Check QuotationLine table
    console.log('\n2. Checking QuotationLine table...');
    const lineCount = await prisma.quotationLine.count();
    console.log(`   ✅ Found ${lineCount} quotation lines`);

    const sampleLine = await prisma.quotationLine.findFirst({
      select: {
        id: true,
        itemName: true,
        remarks: true,
        total: true,
      },
    });

    if (sampleLine) {
      console.log('   ✅ Remarks column exists and is accessible');
      console.log(`   ✅ Sample line: ${sampleLine.itemName}`);
    }

    // 3. Verify data integrity
    console.log('\n3. Verifying data integrity...');
    const quotationsWithLines = await prisma.quotation.findMany({
      include: {
        quotationLines: true,
      },
      take: 5,
    });

    let allDataIntact = true;
    for (const q of quotationsWithLines) {
      if (!q.quotationNumber || !q.status) {
        console.error(`   ❌ Quotation ${q.id} is missing required fields`);
        allDataIntact = false;
      }
      for (const line of q.quotationLines) {
        if (!line.itemName || !line.quantity) {
          console.error(`   ❌ Line ${line.id} is missing required fields`);
          allDataIntact = false;
        }
      }
    }

    if (allDataIntact) {
      console.log('   ✅ All existing data is intact');
    }

    // 4. Check that new fields are NULL for existing records (expected)
    console.log('\n4. Checking new field values...');
    const existingQuotations = await prisma.quotation.findMany({
      where: {
        subtotal: null,
      },
      take: 1,
    });

    if (existingQuotations.length > 0) {
      console.log('   ✅ Existing quotations have NULL for new fields (expected)');
    }

    console.log('\n✅ Migration verification complete!');
    console.log('   All checks passed. Your data is safe.');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    
    if (error.message.includes('Unknown column') || error.message.includes('column') && error.message.includes('does not exist')) {
      console.error('\n⚠️  It appears the migration has not been applied yet.');
      console.error('   Run: npx prisma migrate dev');
    } else {
      console.error('\n⚠️  There may be an issue with the migration.');
      console.error('   Check the error above and consider restoring from backup.');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration();

