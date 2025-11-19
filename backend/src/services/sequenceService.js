const prisma = require('../config/prisma');

/**
 * Generate next quotation number for a tenant
 * Format: Q-{TENANT_CODE}-{YYYYMMDD}-{NNNN}
 * @param {String} tenantId - Tenant ID
 * @returns {Promise<String>} Generated quotation number
 */
const generateQuotationNumber = async (tenantId) => {
  try {
    // Get tenant to access code
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { code: true },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const tenantCode = tenant.code.toUpperCase();
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const prefix = `Q-${tenantCode}-${dateStr}-`;

    // Find the last quotation number for this tenant with today's date
    const lastQuotation = await prisma.quotation.findFirst({
      where: {
        tenantId: tenantId,
        quotationNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        quotationNumber: 'desc',
      },
      select: {
        quotationNumber: true,
      },
    });

    let counter = 1;

    if (lastQuotation) {
      // Extract counter from last number (e.g., Q-SKYTECK-20251120-0001 -> 1)
      const lastCounter = parseInt(
        lastQuotation.quotationNumber.slice(prefix.length),
        10
      );
      if (!isNaN(lastCounter)) {
        counter = lastCounter + 1;
      }
    }

    // Format counter as 4-digit number (0001, 0002, etc.)
    const counterStr = counter.toString().padStart(4, '0');
    const quotationNumber = `${prefix}${counterStr}`;

    return quotationNumber;
  } catch (error) {
    console.error('Error generating quotation number:', error);
    throw error;
  }
};

/**
 * Generate next project code for a tenant
 * Format: {TENANT_CODE}-PRJ-{YYMMDD}-{NNNN}
 * @param {String} tenantId - Tenant ID
 * @returns {Promise<String>} Generated project code
 */
const generateProjectCode = async (tenantId) => {
  try {
    // Get tenant to access code
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { code: true },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const tenantCode = tenant.code.toUpperCase();
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2); // YY
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`; // YYMMDD
    const prefix = `${tenantCode}-PRJ-${dateStr}-`;

    // Find the last project code for this tenant with today's date
    const lastProject = await prisma.project.findFirst({
      where: {
        tenantId: tenantId,
        projectCode: {
          startsWith: prefix,
        },
      },
      orderBy: {
        projectCode: 'desc',
      },
      select: {
        projectCode: true,
      },
    });

    let counter = 1;

    if (lastProject) {
      // Extract counter from last code
      const lastCounter = parseInt(
        lastProject.projectCode.slice(prefix.length),
        10
      );
      if (!isNaN(lastCounter)) {
        counter = lastCounter + 1;
      }
    }

    // Format counter as 4-digit number
    const counterStr = counter.toString().padStart(4, '0');
    const projectCode = `${prefix}${counterStr}`;

    return projectCode;
  } catch (error) {
    console.error('Error generating project code:', error);
    throw error;
  }
};

module.exports = {
  generateQuotationNumber,
  generateProjectCode,
};

