const prisma = require('../config/prisma');

/**
 * Get AR Aging Report
 * GET /api/reports/ar-aging
 */
const getArAging = async (req, res) => {
  try {
    const { from, to, clientId } = req.query;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Build where clause
    const where = {
      tenantId,
      status: {
        not: 'CANCELLED',
      },
    };

    if (clientId) {
      where.clientId = clientId;
    }

    if (from || to) {
      where.issuedDate = {};
      if (from) {
        where.issuedDate.gte = new Date(from);
      }
      if (to) {
        where.issuedDate.lte = new Date(to);
      }
    }

    // Get all invoices
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
          },
        },
        payments: true,
      },
    });

    // Calculate aging buckets
    const clientAging = {};
    const today = new Date();

    invoices.forEach((invoice) => {
      const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = invoice.total - paidAmount;

      if (outstanding <= 0) {
        return; // Skip fully paid invoices
      }

      const clientId = invoice.clientId;
      if (!clientAging[clientId]) {
        clientAging[clientId] = {
          client: invoice.client,
          totalOutstanding: 0,
          aging: {
            current: 0,
            '0-30': 0,
            '31-60': 0,
            '61-90': 0,
            '90+': 0,
          },
          invoices: [],
        };
      }

      // Calculate days past due
      const referenceDate = invoice.dueDate || invoice.issuedDate;
      const daysPastDue = Math.floor(
        (today - new Date(referenceDate)) / (1000 * 60 * 60 * 24)
      );

      let agingBucket = 'current';
      if (daysPastDue > 90) {
        agingBucket = '90+';
      } else if (daysPastDue > 60) {
        agingBucket = '61-90';
      } else if (daysPastDue > 30) {
        agingBucket = '31-60';
      } else if (daysPastDue > 0) {
        agingBucket = '0-30';
      }

      clientAging[clientId].totalOutstanding += outstanding;
      clientAging[clientId].aging[agingBucket] += outstanding;
      clientAging[clientId].invoices.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        paidAmount,
        outstanding,
        daysPastDue,
        agingBucket,
        dueDate: invoice.dueDate,
        issuedDate: invoice.issuedDate,
      });
    });

    // Convert to array
    const agingReport = Object.values(clientAging).map((item) => ({
      ...item,
      invoices: item.invoices.sort((a, b) => b.daysPastDue - a.daysPastDue),
    }));

    // Sort by total outstanding (descending)
    agingReport.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    // Calculate totals
    const totals = {
      totalOutstanding: agingReport.reduce((sum, item) => sum + item.totalOutstanding, 0),
      aging: {
        current: agingReport.reduce((sum, item) => sum + item.aging.current, 0),
        '0-30': agingReport.reduce((sum, item) => sum + item.aging['0-30'], 0),
        '31-60': agingReport.reduce((sum, item) => sum + item.aging['31-60'], 0),
        '61-90': agingReport.reduce((sum, item) => sum + item.aging['61-90'], 0),
        '90+': agingReport.reduce((sum, item) => sum + item.aging['90+'], 0),
      },
    };

    res.json({
      report: agingReport,
      totals,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('Get AR aging error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getArAging,
};

