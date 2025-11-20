const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteQCRecord() {
  try {
    // Delete existing QCRecord rows using Prisma client
    const result = await prisma.qCRecord.deleteMany({});
    console.log(`✅ Deleted ${result.count} QCRecord row(s)`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteQCRecord();
