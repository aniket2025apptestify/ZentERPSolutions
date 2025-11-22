const prisma = require('../config/prisma');
const { createAuditLog } = require('./auditLogService');
const { postCreditNoteJournal } = require('./financeService');
const { generateCreditNoteNumber } = require('./sequenceService');

/**
 * Process ACCEPT_RETURN outcome
 * - Restock items to inventory
 * - Create credit note if invoice exists
 * @param {Object} returnRecord - Return record
 * @param {String} tenantId - Tenant ID
 * @param {String} inspectedBy - User ID who inspected
 * @param {String} remarks - Inspection remarks
 * @param {Object} tx - Prisma transaction client
 * @returns {Promise<Object>} Result with creditNoteId if created
 */
const processAcceptReturn = async (returnRecord, tenantId, inspectedBy, remarks, tx) => {
  const returnItems = Array.isArray(returnRecord.items)
    ? returnRecord.items
    : typeof returnRecord.items === 'string'
    ? JSON.parse(returnRecord.items)
    : [];

  const creditNoteId = null;
  let totalCreditAmount = 0;

  // Process each item
  for (const item of returnItems) {
    if (item.itemId) {
      // Find inventory item
      const inventoryItem = await tx.inventoryItem.findFirst({
        where: {
          id: item.itemId,
          tenantId,
        },
      });

      if (inventoryItem) {
        // Create stock transaction IN
        const balanceAfter = inventoryItem.availableQty + item.qty;
        await tx.stockTransaction.create({
          data: {
            tenantId,
            itemId: item.itemId,
            type: 'IN',
            referenceType: 'RETURN',
            referenceId: returnRecord.id,
            qty: item.qty,
            rate: inventoryItem.lastPurchaseRate || null,
            balanceAfter,
            remarks: `Return accepted: ${remarks || 'N/A'}`,
            createdBy: inspectedBy,
          },
        });

        // Update inventory item
        await tx.inventoryItem.update({
          where: { id: item.itemId },
          data: {
            availableQty: balanceAfter,
          },
        });

        // Calculate credit amount (if invoice exists, use invoice line rate)
        if (returnRecord.invoiceId && inventoryItem.lastPurchaseRate) {
          totalCreditAmount += item.qty * (inventoryItem.lastPurchaseRate || 0);
        }
      }
    } else {
      // Item without itemId - create ad-hoc finished-good or handle per tenant policy
      // For now, we'll just log it
      console.log(`Return item without itemId: ${item.description || 'Unknown'}`);
    }
  }

  // Create credit note if invoice exists
  if (returnRecord.invoiceId && totalCreditAmount > 0) {
    const creditNoteNumber = await generateCreditNoteNumber(tenantId);
    const creditNote = await tx.creditNote.create({
      data: {
        tenantId,
        creditNoteNumber,
        returnRecordId: returnRecord.id,
        invoiceId: returnRecord.invoiceId,
        clientId: returnRecord.clientId,
        amount: totalCreditAmount,
        reason: `Return - ${remarks || 'Items accepted back'}`,
        createdBy: inspectedBy,
        status: 'DRAFT',
        applied: false,
      },
    });

    // Post journal entries
    await postCreditNoteJournal(creditNote, tenantId, inspectedBy);

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: inspectedBy,
      action: 'CREDIT_NOTE_CREATE',
      entityType: 'CreditNote',
      entityId: creditNote.id,
      newData: {
        creditNoteNumber: creditNote.creditNoteNumber,
        returnRecordId: returnRecord.id,
        amount: totalCreditAmount,
      },
    });

    return { creditNoteId: creditNote.id, creditNote };
  }

  return { creditNoteId: null };
};

/**
 * Process REWORK outcome
 * - Create ReworkJob linked to ReturnRecord
 * @param {Object} returnRecord - Return record
 * @param {String} tenantId - Tenant ID
 * @param {String} inspectedBy - User ID who inspected
 * @param {String} remarks - Inspection remarks
 * @param {String} reworkAssignedTo - User ID to assign rework to
 * @param {Object} tx - Prisma transaction client
 * @returns {Promise<Object>} Created rework job
 */
const processReworkReturn = async (returnRecord, tenantId, inspectedBy, remarks, reworkAssignedTo, tx) => {
  // Get production job from DN if available
  const dn = await tx.deliveryNote.findUnique({
    where: { id: returnRecord.dnId },
    include: {
      items: {
        where: {
          productionJobId: { not: null },
        },
        take: 1,
      },
    },
  });

  const sourceProductionJobId = dn?.items?.[0]?.productionJobId || null;

  // Create rework job
  const reworkJob = await tx.reworkJob.create({
    data: {
      tenantId,
      sourceProductionJobId,
      sourceDNId: returnRecord.dnId,
      assignedTo: reworkAssignedTo || null,
      createdBy: inspectedBy,
      status: 'OPEN',
      notes: `Return rework: ${remarks || 'N/A'}`,
      materialNeeded: returnRecord.items, // Pass return items as material needed
    },
  });

  // Create audit log
  await createAuditLog({
    tenantId,
    userId: inspectedBy,
    action: 'REWORK_CREATE',
    entityType: 'ReworkJob',
    entityId: reworkJob.id,
    newData: {
      sourceDNId: returnRecord.dnId,
      returnRecordId: returnRecord.id,
      reason: 'RETURN_INSPECTION',
    },
  });

  return reworkJob;
};

/**
 * Process SCRAP outcome
 * - Create WastageRecord for each item
 * - Create StockTransaction OUT if item was in inventory
 * - Create credit note if invoice exists
 * @param {Object} returnRecord - Return record
 * @param {String} tenantId - Tenant ID
 * @param {String} inspectedBy - User ID who inspected
 * @param {String} remarks - Inspection remarks
 * @param {Object} tx - Prisma transaction client
 * @returns {Promise<Object>} Result with creditNoteId if created
 */
const processScrapReturn = async (returnRecord, tenantId, inspectedBy, remarks, tx) => {
  const returnItems = Array.isArray(returnRecord.items)
    ? returnRecord.items
    : typeof returnRecord.items === 'string'
    ? JSON.parse(returnRecord.items)
    : [];

  let totalCreditAmount = 0;

  // Process each item
  for (const item of returnItems) {
    if (item.itemId) {
      // Find inventory item
      const inventoryItem = await tx.inventoryItem.findFirst({
        where: {
          id: item.itemId,
          tenantId,
        },
      });

      if (inventoryItem) {
        // Create wastage record
        await tx.wastageRecord.create({
          data: {
            tenantId,
            itemId: item.itemId,
            qty: item.qty,
            reason: `Return scrap: ${remarks || 'N/A'}`,
            recordedBy: inspectedBy,
            recordedAt: new Date(),
          },
        });

        // Create stock transaction OUT (if item was previously in inventory)
        if (inventoryItem.availableQty > 0) {
          const balanceAfter = Math.max(0, inventoryItem.availableQty - item.qty);
          await tx.stockTransaction.create({
            data: {
              tenantId,
              itemId: item.itemId,
              type: 'OUT',
              referenceType: 'RETURN',
              referenceId: returnRecord.id,
              qty: item.qty,
              rate: inventoryItem.lastPurchaseRate || null,
              balanceAfter,
              remarks: `Scrap from return ${returnRecord.returnNumber}`,
              createdBy: inspectedBy,
            },
          });

          // Update inventory item
          await tx.inventoryItem.update({
            where: { id: item.itemId },
            data: {
              availableQty: balanceAfter,
            },
          });
        }

        // Calculate credit amount
        if (returnRecord.invoiceId && inventoryItem.lastPurchaseRate) {
          totalCreditAmount += item.qty * (inventoryItem.lastPurchaseRate || 0);
        }
      }
    }
  }

  // Create credit note if invoice exists
  if (returnRecord.invoiceId && totalCreditAmount > 0) {
    const creditNoteNumber = await generateCreditNoteNumber(tenantId);
    const creditNote = await tx.creditNote.create({
      data: {
        tenantId,
        creditNoteNumber,
        returnRecordId: returnRecord.id,
        invoiceId: returnRecord.invoiceId,
        clientId: returnRecord.clientId,
        amount: totalCreditAmount,
        reason: `Return scrap - ${remarks || 'Items scrapped'}`,
        createdBy: inspectedBy,
        status: 'DRAFT',
        applied: false,
      },
    });

    // Post journal entries
    await postCreditNoteJournal(creditNote, tenantId, inspectedBy);

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: inspectedBy,
      action: 'CREDIT_NOTE_CREATE',
      entityType: 'CreditNote',
      entityId: creditNote.id,
      newData: {
        creditNoteNumber: creditNote.creditNoteNumber,
        returnRecordId: returnRecord.id,
        amount: totalCreditAmount,
      },
    });

    return { creditNoteId: creditNote.id, creditNote };
  }

  return { creditNoteId: null };
};

/**
 * Create replacement Delivery Note
 * @param {Object} returnRecord - Original return record
 * @param {String} tenantId - Tenant ID
 * @param {String} createdBy - User ID creating replacement
 * @param {String} vehicle - Vehicle ID
 * @param {Array} items - Replacement items
 * @param {String} remarks - Remarks
 * @param {Object} tx - Prisma transaction client
 * @returns {Promise<Object>} Created delivery note
 */
const createReplacementDN = async (returnRecord, tenantId, createdBy, vehicle, items, remarks, tx) => {
  const { generateDNNumber } = require('./sequenceService');

  // Get original DN details
  const originalDN = await tx.deliveryNote.findUnique({
    where: { id: returnRecord.dnId },
    include: {
      project: true,
      client: true,
      subGroup: true,
    },
  });

  if (!originalDN) {
    throw new Error('Original delivery note not found');
  }

  // Generate DN number
  const dnNumber = await generateDNNumber(tenantId);

  // Create replacement DN
  const replacementDN = await tx.deliveryNote.create({
    data: {
      tenantId,
      dnNumber,
      projectId: originalDN.projectId,
      subGroupId: originalDN.subGroupId,
      clientId: originalDN.clientId,
      address: originalDN.address,
      status: 'DRAFT',
      vehicleId: vehicle || null,
      remarks: `Replacement for return ${returnRecord.returnNumber}. ${remarks || ''}`,
      createdBy,
      items: {
        create: items.map((item) => ({
          tenantId,
          productionJobId: item.productionJobId || null,
          itemId: item.itemId || null,
          description: item.description || 'Replacement item',
          qty: item.qty,
          uom: item.uom || null,
          remarks: item.remarks || null,
        })),
      },
    },
  });

  // Create audit log
  await createAuditLog({
    tenantId,
    userId: createdBy,
    action: 'RETURN_REPLACEMENT_CREATED',
    entityType: 'DeliveryNote',
    entityId: replacementDN.id,
    newData: {
      dnNumber: replacementDN.dnNumber,
      returnRecordId: returnRecord.id,
      originalDNId: returnRecord.dnId,
    },
  });

  return replacementDN;
};

module.exports = {
  processAcceptReturn,
  processReworkReturn,
  processScrapReturn,
  createReplacementDN,
};

