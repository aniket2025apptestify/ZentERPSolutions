const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');

// Status transition validation
const ALLOWED_STATUS_TRANSITIONS = {
  NEW: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['VISITED', 'CLOSED'],
  VISITED: ['QUOTED', 'CLOSED'],
  QUOTED: ['CLOSED'],
  CLOSED: [], // Cannot transition from CLOSED
};

// Roles that can bypass status transition validation
const BYPASS_ROLES = ['DIRECTOR', 'PROJECT_MANAGER'];

/**
 * Validate status transition
 */
const validateStatusTransition = (currentStatus, newStatus, userRole) => {
  // Allow bypass for certain roles
  if (BYPASS_ROLES.includes(userRole)) {
    return true;
  }

  // Allow transition to CLOSED from any status
  if (newStatus === 'CLOSED') {
    return true;
  }

  // Check if transition is allowed
  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};

/**
 * Get all inquiries with filters
 * GET /api/inquiries?status=&clientId=&assignedTo=&from=&to=&search=
 */
const getInquiries = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status, clientId, assignedTo, from, to, search } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Build where clause
    const where = {
      tenantId: tenantId,
      isActive: true, // Only return active inquiries
    };

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
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

    // Search filter - searches in source, projectType, location, notes, and client name
    if (search) {
      where.OR = [
        { source: { contains: search, mode: 'insensitive' } },
        { projectType: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        {
          client: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { companyName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
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

    // Format attachments from documents
    const attachments = documents.map((doc) => ({
      docId: doc.id,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
    }));

    // Format follow-ups
    const followUps = (inquiry.followUps || []).map((fu) => ({
      id: fu.id,
      type: fu.type,
      notes: fu.notes,
      date: fu.followUpDate || fu.date || fu.createdAt,
    }));

    res.json({
      ...inquiry,
      followUps: followUps,
      attachments: attachments,
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

    // Validate visit date (should be future or today)
    if (visitDate) {
      const visitDateObj = new Date(visitDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      visitDateObj.setHours(0, 0, 0, 0);
      if (visitDateObj < today) {
        return res.status(400).json({
          message: 'Visit date cannot be in the past',
        });
      }
    }

    // Verify client exists and belongs to tenant
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId: tenantId,
        isActive: true,
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
      action: 'INQUIRY_CREATE',
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
    const userRole = req.user.role;

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

    // Validate status transition if status is being changed
    if (status && status !== existingInquiry.status) {
      if (!validateStatusTransition(existingInquiry.status, status, userRole)) {
        return res.status(400).json({
          message: `Invalid status transition from ${existingInquiry.status} to ${status}`,
        });
      }
    }

    // Validate visit date (should be future or today)
    if (visitDate !== undefined && visitDate !== null) {
      const visitDateObj = new Date(visitDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      visitDateObj.setHours(0, 0, 0, 0);
      if (visitDateObj < today) {
        return res.status(400).json({
          message: 'Visit date cannot be in the past',
        });
      }
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
      action: 'INQUIRY_UPDATE',
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
 * Delete inquiry (soft delete)
 * DELETE /api/inquiries/:id
 */
const deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;
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

    // Soft delete - set isActive to false
    await prisma.inquiry.update({
      where: { id },
      data: { isActive: false },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'INQUIRY_DELETE',
      entityType: 'Inquiry',
      entityId: id,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete inquiry error:', error);
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
    const { type, notes, date } = req.body;
    const tenantId = req.tenantId;

    if (!type || !notes) {
      return res.status(400).json({
        message: 'Type and notes are required',
      });
    }

    // Validate follow-up date (optional business rule - should not be in past)
    if (date) {
      const followUpDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      followUpDate.setHours(0, 0, 0, 0);
      if (followUpDate < today) {
        // Warning but not blocking - optional business rule
        console.warn('Follow-up date is in the past');
      }
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
      date: date || new Date().toISOString(),
      followUpDate: date || new Date().toISOString(), // Keep both for backward compatibility
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
      action: 'INQUIRY_FOLLOWUP',
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
  deleteInquiry,
  addFollowUp,
};
