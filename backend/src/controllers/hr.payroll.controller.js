const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const { calculatePayroll, allocateLabourCostsToProjects } = require('../services/payroll.service');
const { postPayrollJournal, postPayrollPaymentJournal } = require('../services/financeService');

/**
 * Generate payroll for a month
 * POST /api/hr/payroll/generate
 */
const generatePayroll = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const { month, year, employeeIds } = req.body;

    // Validate month and year
    if (!month || !year) {
      return res.status(400).json({
        message: 'Month and year are required',
      });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({
        message: 'Month must be between 1 and 12',
      });
    }

    // Get tenant settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const tenantSettings = tenant?.settings || {};

    // Get employees (all active or specific ones)
    const where = {
      tenantId,
      isActive: true,
    };

    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      where.id = { in: employeeIds };
    }

    const employees = await prisma.employee.findMany({
      where,
    });

    if (employees.length === 0) {
      return res.status(400).json({
        message: 'No employees found',
      });
    }

    // Check if payroll already generated for this month
    const existingPayrolls = await prisma.payrollRecord.findMany({
      where: {
        tenantId,
        month,
        year,
        employeeId: { in: employees.map((e) => e.id) },
      },
    });

    if (existingPayrolls.length > 0) {
      return res.status(400).json({
        message: `Payroll already generated for ${month}/${year} for ${existingPayrolls.length} employee(s)`,
        existingPayrolls: existingPayrolls.map((p) => ({
          id: p.id,
          employeeId: p.employeeId,
        })),
      });
    }

    const results = [];
    const errors = [];

    // Use transaction for atomicity
    await prisma.$transaction(async (tx) => {
      for (const employee of employees) {
        try {
          // Calculate payroll
          const calculation = await calculatePayroll(
            employee,
            month,
            year,
            tenantSettings
          );

          // Create payroll record
          const payrollRecord = await tx.payrollRecord.create({
            data: {
              tenantId,
              employeeId: employee.id,
              month,
              year,
              basicSalary: calculation.basicSalary,
              daysPresent: Math.round(calculation.daysPresent),
              overtimeHours: calculation.overtimeHours,
              overtimePay: calculation.overtimePay,
              allowances: calculation.allowances,
              deductions: calculation.deductions,
              grossPay: calculation.grossPay,
              netPay: calculation.netPay,
              paid: false,
            },
          });

          // Post journal entry (debit payroll expense, credit payable)
          await postPayrollJournal(payrollRecord, tenantId, userId);

          results.push({
            employeeId: employee.id,
            employeeName: employee.name,
            payrollId: payrollRecord.id,
            netPay: payrollRecord.netPay,
          });
        } catch (error) {
          console.error(`Error generating payroll for employee ${employee.id}:`, error);
          errors.push({
            employeeId: employee.id,
            employeeName: employee.name,
            error: error.message,
          });
        }
      }
    });

    // Allocate labour costs to projects
    try {
      await allocateLabourCostsToProjects(tenantId, month, year);
    } catch (error) {
      console.error('Error allocating labour costs:', error);
      // Don't fail the entire operation if allocation fails
    }

    // Create audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'PAYROLL_GENERATE',
      entityType: 'PayrollRecord',
      entityId: results[0]?.payrollId || 'batch',
      newData: {
        month,
        year,
        generatedCount: results.length,
        totalNetPay: results.reduce((sum, r) => sum + r.netPay, 0),
      },
    });

    res.json({
      generated: results.length,
      errors: errors.length > 0 ? errors : undefined,
      details: results,
    });
  } catch (error) {
    console.error('Generate payroll error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get payroll records
 * GET /api/hr/payroll?employeeId=&month=&year=
 */
const getPayroll = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const { employeeId, month, year, paid } = req.query;

    const where = {
      tenantId,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (month) {
      where.month = parseInt(month);
    }

    if (year) {
      where.year = parseInt(year);
    }

    if (paid !== undefined) {
      where.paid = paid === 'true';
    }

    const payrollRecords = await prisma.payrollRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            designation: true,
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(payrollRecords);
  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get payroll record by ID (payslip)
 * GET /api/hr/payroll/:id
 */
const getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const payrollRecord = await prisma.payrollRecord.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        employee: true,
      },
    });

    if (!payrollRecord) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    res.json(payrollRecord);
  } catch (error) {
    console.error('Get payroll by ID error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Mark payroll as paid
 * POST /api/hr/payroll/:id/pay
 */
const payPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { paidAt, paymentRef, paidBy } = req.body;
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const payrollRecord = await prisma.payrollRecord.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        employee: true,
      },
    });

    if (!payrollRecord) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    if (payrollRecord.paid) {
      return res.status(400).json({
        message: 'Payroll has already been paid',
      });
    }

    const oldData = { ...payrollRecord };

    // Update payroll record
    const updated = await prisma.payrollRecord.update({
      where: { id },
      data: {
        paid: true,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        paymentRef: paymentRef || null,
      },
    });

    // Post journal entry (debit payable, credit bank/cash)
    await postPayrollPaymentJournal(
      updated,
      tenantId,
      userId,
      paymentRef
    );

    // Create audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'PAYROLL_PAY',
      entityType: 'PayrollRecord',
      entityId: updated.id,
      oldData,
      newData: updated,
    });

    res.json({
      success: true,
      payrollRecord: updated,
    });
  } catch (error) {
    console.error('Pay payroll error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Generate payslip PDF
 * GET /api/hr/payroll/:id/payslip
 */
const getPayslipPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const payrollRecord = await prisma.payrollRecord.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        employee: true,
      },
    });

    if (!payrollRecord) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    // TODO: Generate PDF using a library like pdfkit or puppeteer
    // For now, return JSON data that frontend can use to generate PDF
    res.json({
      payslip: payrollRecord,
      // Frontend will generate PDF from this data
    });
  } catch (error) {
    console.error('Get payslip PDF error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  generatePayroll,
  getPayroll,
  getPayrollById,
  payPayroll,
  getPayslipPdf,
};

