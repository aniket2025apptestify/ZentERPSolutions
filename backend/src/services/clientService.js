const prisma = require('../config/prisma');

/**
 * Validate email format
 */
const validateEmail = (email) => {
  if (!email) return true; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone format (mobile format)
 */
const validatePhone = (phone) => {
  if (!phone) return true; // Optional field
  // Basic mobile format validation - accepts international format
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate client data
 */
const validateClientData = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate && !data.name) {
    errors.push('Name is required');
  }

  if (data.name && data.name.trim().length === 0) {
    errors.push('Name cannot be empty');
  }

  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Invalid phone format');
  }

  return errors;
};

/**
 * Get all clients with optional filters
 */
const getClients = async (tenantId, filters = {}) => {
  const { search, company, email, phone } = filters;

  const where = {
    tenantId: tenantId,
    isActive: true, // Only return active clients
  };

  // Search filter - searches in name, companyName, email, phone
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { companyName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Company filter
  if (company) {
    where.companyName = { contains: company, mode: 'insensitive' };
  }

  // Email filter
  if (email) {
    where.email = { contains: email, mode: 'insensitive' };
  }

  // Phone filter
  if (phone) {
    where.phone = { contains: phone, mode: 'insensitive' };
  }

  return await prisma.client.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
  });
};

/**
 * Get client by ID with stats
 */
const getClientById = async (tenantId, clientId) => {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      tenantId: tenantId,
    },
  });

  if (!client) {
    return null;
  }

  // Get stats from related entities
  const [inquiriesCount, quotationsCount, projectsCount, invoicesCount] = await Promise.all([
    prisma.inquiry.count({
      where: {
        clientId: clientId,
        tenantId: tenantId,
      },
    }),
    prisma.quotation.count({
      where: {
        clientId: clientId,
        tenantId: tenantId,
      },
    }),
    prisma.project.count({
      where: {
        clientId: clientId,
        tenantId: tenantId,
      },
    }),
    prisma.invoice.count({
      where: {
        clientId: clientId,
        tenantId: tenantId,
      },
    }),
  ]);

  return {
    ...client,
    stats: {
      inquiries: inquiriesCount,
      quotations: quotationsCount,
      projects: projectsCount,
      invoices: invoicesCount,
    },
  };
};

/**
 * Create a new client
 */
const createClient = async (tenantId, data) => {
  const validationErrors = validateClientData(data);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(', '));
  }

  return await prisma.client.create({
    data: {
      tenantId: tenantId,
      name: data.name.trim(),
      companyName: data.companyName?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      phone2: data.phone2?.trim() || null,
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      country: data.country?.trim() || null,
      zipCode: data.zipCode?.trim() || null,
      vatNumber: data.vatNumber?.trim() || null,
      gstin: data.gstin?.trim() || null,
      panNumber: data.panNumber?.trim() || null,
      taxId: data.taxId?.trim() || null,
      website: data.website?.trim() || null,
      registrationNumber: data.registrationNumber?.trim() || null,
      paymentTerms: data.paymentTerms?.trim() || null,
      creditLimit: data.creditLimit ? parseFloat(data.creditLimit) : null,
      notes: data.notes?.trim() || null,
      // isActive has a default value of true in the schema, so we don't need to set it explicitly
    },
  });
};

/**
 * Update client
 */
const updateClient = async (tenantId, clientId, data) => {
  // Check if client exists and belongs to tenant
  const existingClient = await prisma.client.findFirst({
    where: {
      id: clientId,
      tenantId: tenantId,
    },
  });

  if (!existingClient) {
    throw new Error('Client not found');
  }

  const validationErrors = validateClientData(data, true);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(', '));
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.companyName !== undefined) updateData.companyName = data.companyName?.trim() || null;
  if (data.email !== undefined) updateData.email = data.email?.trim() || null;
  if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
  if (data.phone2 !== undefined) updateData.phone2 = data.phone2?.trim() || null;
  if (data.address !== undefined) updateData.address = data.address?.trim() || null;
  if (data.city !== undefined) updateData.city = data.city?.trim() || null;
  if (data.state !== undefined) updateData.state = data.state?.trim() || null;
  if (data.country !== undefined) updateData.country = data.country?.trim() || null;
  if (data.zipCode !== undefined) updateData.zipCode = data.zipCode?.trim() || null;
  if (data.vatNumber !== undefined) updateData.vatNumber = data.vatNumber?.trim() || null;
  if (data.gstin !== undefined) updateData.gstin = data.gstin?.trim() || null;
  if (data.panNumber !== undefined) updateData.panNumber = data.panNumber?.trim() || null;
  if (data.taxId !== undefined) updateData.taxId = data.taxId?.trim() || null;
  if (data.website !== undefined) updateData.website = data.website?.trim() || null;
  if (data.registrationNumber !== undefined) updateData.registrationNumber = data.registrationNumber?.trim() || null;
  if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms?.trim() || null;
  if (data.creditLimit !== undefined) updateData.creditLimit = data.creditLimit ? parseFloat(data.creditLimit) : null;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return await prisma.client.update({
    where: { id: clientId },
    data: updateData,
  });
};

/**
 * Soft delete client (set isActive = false)
 */
const deleteClient = async (tenantId, clientId) => {
  // Check if client exists and belongs to tenant
  const existingClient = await prisma.client.findFirst({
    where: {
      id: clientId,
      tenantId: tenantId,
    },
  });

  if (!existingClient) {
    throw new Error('Client not found');
  }

  // Soft delete - set isActive to false
  return await prisma.client.update({
    where: { id: clientId },
    data: { isActive: false },
  });
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  validateClientData,
};

