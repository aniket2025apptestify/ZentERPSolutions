const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');

/**
 * Get all inquiries with filters
 * GET /api/inquiries?status=&assignedTo=&from=&to=
 */
const getInquiries = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status, assignedTo, from, to } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Build where clause
    const where = {
      tenantId: tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        where.createdAt.lte = new Date(to);
      }
    }

    const inquiries = await prisma.inquiry.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(inquiries);
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get single inquiry by ID
 * GET /api/inquiries/:id
 */
const getInquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const inquiry = await prisma.inquiry.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
            address: true,
            vatNumber: true,
          },
        },
      },
    });

    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    // Fetch related documents
    const documents = await prisma.document.findMany({
      where: {
        tenantId: tenantId,
        entityType: 'INQUIRY',
        entityId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      ...inquiry,
      documents: documents,
    });
  } catch (error) {
    console.error('Get inquiry by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create a new inquiry
 * POST /api/inquiries
 */
const createInquiry = async (req, res) => {
  try {
    const {
      clientId,
      source,
      projectType,
      location,
      assignedTo,
      notes,
      visitDate,
      attachments,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate required fields
    if (!clientId || !source || !projectType) {
      return res.status(400).json({
        message: 'Client ID, source, and project type are required',
      });
    }

    // Verify client exists and belongs to tenant
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId: tenantId,
      },
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Create inquiry
    const newInquiry = await prisma.inquiry.create({
      data: {
        tenantId: tenantId,
        clientId: clientId,
        source: source,
        projectType: projectType,
        location: location || null,
        status: 'NEW',
        assignedTo: assignedTo || null,
        notes: notes || null,
        visitDate: visitDate ? new Date(visitDate) : null,
        followUps: [],
        attachments: attachments || [],
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'CREATE',
      entityType: 'Inquiry',
      entityId: newInquiry.id,
      newData: {
        clientId: newInquiry.clientId,
        source: newInquiry.source,
        projectType: newInquiry.projectType,
        status: newInquiry.status,
      },
    });

    res.status(201).json(newInquiry);
  } catch (error) {
    console.error('Create inquiry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update inquiry
 * PUT /api/inquiries/:id
 */
const updateInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, assignedTo, visitDate } = req.body;
    const tenantId = req.tenantId;

    // Check if inquiry exists and belongs to the tenant
    const existingInquiry = await prisma.inquiry.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
    });

    if (!existingInquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    // Prepare update data
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (visitDate !== undefined) {
      updateData.visitDate = visitDate ? new Date(visitDate) : null;
    }

    // Update inquiry
    const updatedInquiry = await prisma.inquiry.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'UPDATE',
      entityType: 'Inquiry',
      entityId: id,
      oldData: {
        status: existingInquiry.status,
        notes: existingInquiry.notes,
        assignedTo: existingInquiry.assignedTo,
        visitDate: existingInquiry.visitDate,
      },
      newData: updateData,
    });

    res.json(updatedInquiry);
  } catch (error) {
    console.error('Update inquiry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Add follow-up to inquiry
 * POST /api/inquiries/:id/followups
 */
const addFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, notes, followUpDate } = req.body;
    const tenantId = req.tenantId;

    if (!type || !notes) {
      return res.status(400).json({
        message: 'Type and notes are required',
      });
    }

    // Check if inquiry exists and belongs to the tenant
    const existingInquiry = await prisma.inquiry.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
    });

    if (!existingInquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    // Get existing follow-ups or initialize empty array
    const followUps = existingInquiry.followUps || [];

    // Create new follow-up entry
    const newFollowUp = {
      id: `fu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type,
      notes: notes,
      followUpDate: followUpDate || null,
      createdAt: new Date().toISOString(),
      createdBy: req.user.userId,
    };

    // Append to follow-ups array
    followUps.push(newFollowUp);

    // Update inquiry with new follow-up
    const updatedInquiry = await prisma.inquiry.update({
      where: { id },
      data: {
        followUps: followUps,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'ADD_FOLLOWUP',
      entityType: 'Inquiry',
      entityId: id,
      newData: {
        followUp: newFollowUp,
      },
    });

    res.json(updatedInquiry);
  } catch (error) {
    console.error('Add follow-up error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getInquiries,
  getInquiryById,
  createInquiry,
  updateInquiry,
  addFollowUp,
};

