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

/**
 * Generate next Material Request number for a tenant
 * Format: MR-{TENANT_CODE}-{YYYYMMDD}-{NNNN}
 * @param {String} tenantId - Tenant ID
 * @returns {Promise<String>} Generated MR number
 */
const generateMRNumber = async (tenantId) => {
  try {
    // Validate prisma client is available
    if (!prisma) {
      throw new Error('Prisma client is not initialized');
    }

    // Validate materialRequest model is available
    if (!prisma.materialRequest) {
      throw new Error('Prisma materialRequest model is not available. Please run: npx prisma generate');
    }

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
    const prefix = `MR-${tenantCode}-${dateStr}-`;

    const lastMR = await prisma.materialRequest.findFirst({
      where: {
        tenantId: tenantId,
        requestNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        requestNumber: 'desc',
      },
      select: {
        requestNumber: true,
      },
    });

    let counter = 1;
    if (lastMR) {
      const lastCounter = parseInt(
        lastMR.requestNumber.slice(prefix.length),
        10
      );
      if (!isNaN(lastCounter)) {
        counter = lastCounter + 1;
      }
    }

    const counterStr = counter.toString().padStart(4, '0');
    return `${prefix}${counterStr}`;
  } catch (error) {
    console.error('Error generating MR number:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      prismaAvailable: !!prisma,
      materialRequestAvailable: !!(prisma && prisma.materialRequest),
    });
    throw error;
  }
};

/**
 * Generate next Purchase Order number for a tenant
 * Format: PO-{TENANT_CODE}-{YYYYMMDD}-{NNNN}
 * @param {String} tenantId - Tenant ID
 * @returns {Promise<String>} Generated PO number
 */
const generatePONumber = async (tenantId) => {
  try {
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
    const prefix = `PO-${tenantCode}-${dateStr}-`;

    const lastPO = await prisma.purchaseOrder.findFirst({
      where: {
        tenantId: tenantId,
        poNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        poNumber: 'desc',
      },
      select: {
        poNumber: true,
      },
    });

    let counter = 1;
    if (lastPO) {
      const lastCounter = parseInt(
        lastPO.poNumber.slice(prefix.length),
        10
      );
      if (!isNaN(lastCounter)) {
        counter = lastCounter + 1;
      }
    }

    const counterStr = counter.toString().padStart(4, '0');
    return `${prefix}${counterStr}`;
  } catch (error) {
    console.error('Error generating PO number:', error);
    throw error;
  }
};

/**
 * Generate next GRN number for a tenant
 * Format: GRN-{TENANT_CODE}-{YYYYMMDD}-{NNNN}
 * @param {String} tenantId - Tenant ID
 * @returns {Promise<String>} Generated GRN number
 */
const generateGRNNumber = async (tenantId) => {
  try {
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
    const prefix = `GRN-${tenantCode}-${dateStr}-`;

    const lastGRN = await prisma.gRN.findFirst({
      where: {
        tenantId: tenantId,
        grnNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        grnNumber: 'desc',
      },
      select: {
        grnNumber: true,
      },
    });

    let counter = 1;
    if (lastGRN) {
      const lastCounter = parseInt(
        lastGRN.grnNumber.slice(prefix.length),
        10
      );
      if (!isNaN(lastCounter)) {
        counter = lastCounter + 1;
      }
    }

    const counterStr = counter.toString().padStart(4, '0');
    return `${prefix}${counterStr}`;
  } catch (error) {
    console.error('Error generating GRN number:', error);
    throw error;
  }
};

/**
 * Generate next Job Card number for a tenant
 * Format: {TENANT_CODE}-JC-{YYYYMMDD}-{NNNN}
 * @param {String} tenantId - Tenant ID
 * @returns {Promise<String>} Generated job card number
 */
const generateJobCardNumber = async (tenantId) => {
  try {
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
    const prefix = `${tenantCode}-JC-${dateStr}-`;

    const lastJob = await prisma.productionJob.findFirst({
      where: {
        tenantId: tenantId,
        jobCardNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        jobCardNumber: 'desc',
      },
      select: {
        jobCardNumber: true,
      },
    });

    let counter = 1;
    if (lastJob) {
      const lastCounter = parseInt(
        lastJob.jobCardNumber.slice(prefix.length),
        10
      );
      if (!isNaN(lastCounter)) {
        counter = lastCounter + 1;
      }
    }

    const counterStr = counter.toString().padStart(4, '0');
    return `${prefix}${counterStr}`;
  } catch (error) {
    console.error('Error generating job card number:', error);
    throw error;
  }
};

module.exports = {
  generateQuotationNumber,
  generateProjectCode,
  generateJobCardNumber,
  generateMRNumber,
  generatePONumber,
  generateGRNNumber,
};

