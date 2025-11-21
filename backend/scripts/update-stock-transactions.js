const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateStockTransactions() {
  try {
    console.log('Updating existing StockTransaction records...');

    // Get all stock transactions that need updating
    const transactions = await prisma.$queryRaw`
      SELECT st.*, ii."tenantId" as item_tenant_id
      FROM "StockTransaction" st
      JOIN "InventoryItem" ii ON st."itemId" = ii.id
      WHERE st."tenantId" IS NULL OR st."qty" IS NULL
    `;

    console.log(`Found ${transactions.length} transactions to update`);

    for (const tx of transactions) {
      // Get tenantId from the related InventoryItem
      const item = await prisma.inventoryItem.findUnique({
        where: { id: tx.itemId },
        select: { tenantId: true },
      });

      if (!item) {
        console.warn(`Item ${tx.itemId} not found for transaction ${tx.id}`);
        continue;
      }

      // Update the transaction
      await prisma.$executeRaw`
        UPDATE "StockTransaction"
        SET 
          "tenantId" = ${item.tenantId},
          "qty" = COALESCE("qty", ${tx.balanceAfter}::float, 0)
        WHERE id = ${tx.id}
      `;

      console.log(`Updated transaction ${tx.id}`);
    }

    // Drop the old quantity column if it exists
    try {
      await prisma.$executeRaw`ALTER TABLE "StockTransaction" DROP COLUMN IF EXISTS "quantity"`;
      console.log('Dropped old quantity column');
    } catch (error) {
      console.log('Old quantity column already removed or does not exist');
    }

    console.log('✅ All stock transactions updated successfully!');
  } catch (error) {
    console.error('Error updating stock transactions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateStockTransactions();

