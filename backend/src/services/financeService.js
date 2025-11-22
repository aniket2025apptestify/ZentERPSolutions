const prisma = require('../config/prisma');
const { createAuditLog } = require('./auditLogService');

/**
 * Post journal entries for invoice creation
 * Debit AR, Credit Revenue, Credit VAT Payable
 * @param {Object} invoice - Invoice object
 * @param {String} tenantId - Tenant ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Journal entries created
 */
const postInvoiceJournal = async (invoice, tenantId, userId) => {
  try {
    // Note: Full GL/JournalEntry implementation is in Phase 18
    // For now, we'll create audit logs and prepare for future GL integration
    // When GL module is implemented, uncomment and use actual JournalEntry model

    const journalData = {
      tenantId,
      referenceType: 'INVOICE',
      referenceId: invoice.id,
      entries: [
        {
          account: 'AR', // Accounts Receivable
          debit: invoice.total,
          credit: 0,
          description: `Invoice ${invoice.invoiceNumber}`,
        },
        {
          account: 'REVENUE', // Revenue
          debit: 0,
          credit: invoice.subtotal - (invoice.discount || 0),
          description: `Revenue from ${invoice.invoiceNumber}`,
        },
      ],
    };

    // Add VAT entry if applicable
    if (invoice.vatAmount && invoice.vatAmount > 0) {
      journalData.entries.push({
        account: 'VAT_PAYABLE', // VAT Payable
        debit: 0,
        credit: invoice.vatAmount,
        description: `VAT for ${invoice.invoiceNumber}`,
      });
    }

    // Create audit log for journal posting
    await createAuditLog({
      tenantId,
      userId,
      action: 'JOURNAL_POSTED',
      entityType: 'Invoice',
      entityId: invoice.id,
      newData: {
        invoiceNumber: invoice.invoiceNumber,
        journalEntries: journalData.entries,
        total: invoice.total,
      },
    });

    // TODO: When GL module is implemented, create actual JournalEntry records
    // await prisma.journalEntry.createMany({
    //   data: journalData.entries.map(entry => ({
    //     tenantId,
    //     referenceType: 'INVOICE',
    //     referenceId: invoice.id,
    //     accountCode: entry.account,
    //     debit: entry.debit,
    //     credit: entry.credit,
    //     description: entry.description,
    //     postedBy: userId,
    //     postedAt: new Date(),
    //   })),
    // });

    return journalData;
  } catch (error) {
    console.error('Error posting invoice journal:', error);
    // Don't throw - allow invoice creation to continue even if journal posting fails
    // This can be retried later
    return null;
  }
};

/**
 * Post journal entries for payment
 * Debit Bank/Cash, Credit AR
 * @param {Object} payment - Payment object
 * @param {Object} invoice - Invoice object
 * @param {String} tenantId - Tenant ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Journal entries created
 */
const postPaymentJournal = async (payment, invoice, tenantId, userId) => {
  try {
    // Determine account based on payment method
    let account = 'CASH';
    if (payment.method === 'BANK_TRANSFER') {
      account = 'BANK';
    } else if (payment.method === 'CHEQUE') {
      account = 'BANK'; // Cheques are bank accounts
    } else if (payment.method === 'CREDIT_CARD') {
      account = 'BANK';
    }

    const journalData = {
      tenantId,
      referenceType: 'PAYMENT',
      referenceId: payment.id,
      entries: [
        {
          account: account,
          debit: payment.amount,
          credit: 0,
          description: `Payment ${payment.reference || payment.id} for Invoice ${invoice.invoiceNumber}`,
        },
        {
          account: 'AR', // Accounts Receivable
          debit: 0,
          credit: payment.amount,
          description: `Payment received for ${invoice.invoiceNumber}`,
        },
      ],
    };

    // Create audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'JOURNAL_POSTED',
      entityType: 'Payment',
      entityId: payment.id,
      newData: {
        paymentId: payment.id,
        invoiceNumber: invoice.invoiceNumber,
        journalEntries: journalData.entries,
        amount: payment.amount,
      },
    });

    // TODO: When GL module is implemented, create actual JournalEntry records

    return journalData;
  } catch (error) {
    console.error('Error posting payment journal:', error);
    return null;
  }
};

/**
 * Post journal entries for credit note
 * Debit Sales Returns/Discount, Credit AR
 * @param {Object} creditNote - Credit Note object
 * @param {String} tenantId - Tenant ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Journal entries created
 */
const postCreditNoteJournal = async (creditNote, tenantId, userId) => {
  try {
    const journalData = {
      tenantId,
      referenceType: 'CREDIT_NOTE',
      referenceId: creditNote.id,
      entries: [
        {
          account: 'SALES_RETURNS', // Sales Returns / Discount
          debit: creditNote.amount,
          credit: 0,
          description: `Credit Note ${creditNote.creditNoteNumber}`,
        },
        {
          account: 'AR', // Accounts Receivable
          debit: 0,
          credit: creditNote.amount,
          description: `Credit Note ${creditNote.creditNoteNumber} applied`,
        },
      ],
    };

    // Create audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'JOURNAL_POSTED',
      entityType: 'CreditNote',
      entityId: creditNote.id,
      newData: {
        creditNoteNumber: creditNote.creditNoteNumber,
        journalEntries: journalData.entries,
        amount: creditNote.amount,
      },
    });

    // TODO: When GL module is implemented, create actual JournalEntry records

    return journalData;
  } catch (error) {
    console.error('Error posting credit note journal:', error);
    return null;
  }
};

/**
 * Reverse journal entries for invoice cancellation
 * @param {Object} invoice - Invoice object
 * @param {String} tenantId - Tenant ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Reversal journal entries
 */
const reverseInvoiceJournal = async (invoice, tenantId, userId) => {
  try {
    const journalData = {
      tenantId,
      referenceType: 'INVOICE_REVERSAL',
      referenceId: invoice.id,
      entries: [
        {
          account: 'AR',
          debit: 0,
          credit: invoice.total, // Reverse: Credit AR
          description: `Reversal for Invoice ${invoice.invoiceNumber}`,
        },
        {
          account: 'REVENUE',
          debit: invoice.subtotal - (invoice.discount || 0), // Reverse: Debit Revenue
          credit: 0,
          description: `Revenue reversal for ${invoice.invoiceNumber}`,
        },
      ],
    };

    if (invoice.vatAmount && invoice.vatAmount > 0) {
      journalData.entries.push({
        account: 'VAT_PAYABLE',
        debit: invoice.vatAmount, // Reverse: Debit VAT Payable
        credit: 0,
        description: `VAT reversal for ${invoice.invoiceNumber}`,
      });
    }

    // Create audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'JOURNAL_POSTED',
      entityType: 'Invoice',
      entityId: invoice.id,
      newData: {
        invoiceNumber: invoice.invoiceNumber,
        type: 'REVERSAL',
        journalEntries: journalData.entries,
      },
    });

    // TODO: When GL module is implemented, create actual reversal JournalEntry records

    return journalData;
  } catch (error) {
    console.error('Error reversing invoice journal:', error);
    return null;
  }
};

/**
 * Post journal entries for payroll generation
 * Debit Payroll Expense, Credit Payroll Payable
 * @param {Object} payrollRecord - PayrollRecord object
 * @param {String} tenantId - Tenant ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Journal entries created
 */
const postPayrollJournal = async (payrollRecord, tenantId, userId) => {
  try {
    const journalData = {
      tenantId,
      referenceType: 'PAYROLL',
      referenceId: payrollRecord.id,
      entries: [
        {
          account: 'PAYROLL_EXPENSE', // Payroll Expense
          debit: payrollRecord.grossPay,
          credit: 0,
          description: `Payroll for employee ${payrollRecord.employeeId} - ${payrollRecord.month}/${payrollRecord.year}`,
        },
        {
          account: 'PAYROLL_PAYABLE', // Payroll Payable
          debit: 0,
          credit: payrollRecord.netPay,
          description: `Payroll payable for ${payrollRecord.month}/${payrollRecord.year}`,
        },
      ],
    };

    // If there are deductions, add entry for deductions payable (e.g., tax, insurance)
    if (payrollRecord.deductions && payrollRecord.deductions > 0) {
      journalData.entries.push({
        account: 'DEDUCTIONS_PAYABLE', // Deductions Payable (tax, insurance, etc.)
        debit: 0,
        credit: payrollRecord.deductions,
        description: `Deductions for payroll ${payrollRecord.month}/${payrollRecord.year}`,
      });
    }

    // Create audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'JOURNAL_POSTED',
      entityType: 'PayrollRecord',
      entityId: payrollRecord.id,
      newData: {
        payrollId: payrollRecord.id,
        month: payrollRecord.month,
        year: payrollRecord.year,
        journalEntries: journalData.entries,
        grossPay: payrollRecord.grossPay,
        netPay: payrollRecord.netPay,
      },
    });

    // TODO: When GL module is implemented, create actual JournalEntry records

    return journalData;
  } catch (error) {
    console.error('Error posting payroll journal:', error);
    return null;
  }
};

/**
 * Post journal entries for payroll payment
 * Debit Payroll Payable, Credit Bank/Cash
 * @param {Object} payrollRecord - PayrollRecord object
 * @param {String} tenantId - Tenant ID
 * @param {String} userId - User ID
 * @param {String} paymentRef - Payment reference
 * @returns {Promise<Object>} Journal entries created
 */
const postPayrollPaymentJournal = async (payrollRecord, tenantId, userId, paymentRef) => {
  try {
    // Determine account based on payment method (default to BANK for transfers)
    const account = paymentRef ? 'BANK' : 'CASH';

    const journalData = {
      tenantId,
      referenceType: 'PAYROLL_PAYMENT',
      referenceId: payrollRecord.id,
      entries: [
        {
          account: 'PAYROLL_PAYABLE', // Payroll Payable
          debit: payrollRecord.netPay,
          credit: 0,
          description: `Payment for payroll ${payrollRecord.month}/${payrollRecord.year}`,
        },
        {
          account: account, // Bank or Cash
          debit: 0,
          credit: payrollRecord.netPay,
          description: `Payroll payment ${paymentRef || 'cash'} for ${payrollRecord.month}/${payrollRecord.year}`,
        },
      ],
    };

    // Create audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'JOURNAL_POSTED',
      entityType: 'PayrollRecord',
      entityId: payrollRecord.id,
      newData: {
        payrollId: payrollRecord.id,
        paymentRef,
        journalEntries: journalData.entries,
        amount: payrollRecord.netPay,
      },
    });

    // TODO: When GL module is implemented, create actual JournalEntry records

    return journalData;
  } catch (error) {
    console.error('Error posting payroll payment journal:', error);
    return null;
  }
};

module.exports = {
  postInvoiceJournal,
  postPaymentJournal,
  postCreditNoteJournal,
  reverseInvoiceJournal,
  postPayrollJournal,
  postPayrollPaymentJournal,
};

