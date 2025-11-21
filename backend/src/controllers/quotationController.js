const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const {
  generateQuotationNumber,
  generateProjectCode,
} = require('../services/sequenceService');
const { sendQuotationEmail } = require('../services/emailService');
const { generateQuotationPDF } = require('../services/pdfService');
const { Role } = require('@prisma/client');

/**
 * Calculate line total based on area/running meter, unit rate, labour, and overheads
 */
const calculateLineTotal = (line) => {
  let lineTotalBase = 0;

  // Calculate base from area or running meter
  if (line.width && line.height) {
    // Calculate area
    const areaSqm = line.width * line.height * line.quantity;
    lineTotalBase = areaSqm * (line.unitRate || 0);
  } else if (line.runningMeter) {
    lineTotalBase = line.runningMeter * (line.unitRate || 0);
  } else if (line.areaSqm) {
    lineTotalBase = line.areaSqm * (line.unitRate || 0);
  } else {
    // Fallback: quantity * unitRate
    lineTotalBase = line.quantity * (line.unitRate || 0);
  }

  // Add labour and overheads
  const labourCost = line.labourCost || 0;
  const overheads = line.overheads || 0;
  const total = lineTotalBase + labourCost + overheads;

  return {
    areaSqm: line.width && line.height ? line.width * line.height * line.quantity : line.areaSqm || null,
    runningMeter: line.runningMeter || null,
    total: parseFloat(total.toFixed(2)),
  };
};

/**
 * Calculate quotation totals (subtotal, VAT, total)
 */
const calculateQuotationTotals = (lines, discount = 0, vatPercent = 0) => {
  const subtotal = lines.reduce((sum, line) => sum + (line.total || 0), 0);
  const subtotalAfterDiscount = Math.max(0, subtotal - (discount || 0));
  const vatAmount = parseFloat(
    ((subtotalAfterDiscount * (vatPercent || 0)) / 100).toFixed(2)
  );
  const totalAmount = parseFloat(
    (subtotalAfterDiscount + vatAmount).toFixed(2)
  );

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    vatAmount: parseFloat(vatAmount.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
};

/**
 * Create a new quotation
 * POST /api/quotations
 */
const createQuotation = async (req, res) => {
  try {
    const {
      inquiryId,
      clientId,
      preparedBy,
      validityDays = 30,
      discount = 0,
      vatPercent,
      notes,
      attachments = [],
      lines = [],
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate required fields
    if (!clientId || !preparedBy) {
      return res
        .status(400)
        .json({ message: 'Client ID and preparedBy are required' });
    }

    // Validate lines
    if (!lines || lines.length === 0) {
      return res.status(400).json({ message: 'At least one line item is required' });
    }

    for (const line of lines) {
      if (!line.itemName) {
        return res.status(400).json({ message: 'Item name is required for all lines' });
      }
      if (!line.quantity || line.quantity < 1) {
        return res.status(400).json({ message: 'Quantity must be at least 1' });
      }
      if (line.unitRate === undefined || line.unitRate < 0) {
        return res.status(400).json({ message: 'Unit rate must be >= 0' });
      }
      // Validate that at least one of width/height, areaSqm, or runningMeter is provided
      if (
        (!line.width || !line.height) &&
        !line.areaSqm &&
        !line.runningMeter
      ) {
        return res
          .status(400)
          .json({
            message: 'Either width/height, areaSqm, or runningMeter must be provided',
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

    // Verify inquiry if provided
    if (inquiryId) {
      const inquiry = await prisma.inquiry.findFirst({
        where: {
          id: inquiryId,
          tenantId: tenantId,
        },
      });

      if (!inquiry) {
        return res.status(404).json({ message: 'Inquiry not found' });
      }
    }

    // Get tenant settings for default VAT if not provided
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const defaultVatPercent =
      vatPercent !== undefined
        ? vatPercent
        : tenant?.settings?.vatPercent || 0;

    // Calculate line totals
    const calculatedLines = lines.map((line) => {
      const calculated = calculateLineTotal(line);
      return {
        ...line,
        areaSqm: calculated.areaSqm,
        runningMeter: calculated.runningMeter,
        total: calculated.total,
      };
    });

    // Calculate quotation totals
    const totals = calculateQuotationTotals(
      calculatedLines,
      discount,
      defaultVatPercent
    );

    // Generate quotation number
    const quotationNumber = await generateQuotationNumber(tenantId);

    // Create quotation with lines
    const quotation = await prisma.quotation.create({
      data: {
        tenantId: tenantId,
        inquiryId: inquiryId || null,
        clientId: clientId,
        quotationNumber: quotationNumber,
        status: 'DRAFT',
        validityDays: validityDays,
        preparedBy: preparedBy,
        discount: discount || 0,
        subtotal: totals.subtotal,
        vatPercent: defaultVatPercent,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        notes: notes || null,
        attachments: attachments.length > 0 ? attachments : null,
        quotationLines: {
          create: calculatedLines.map((line) => ({
            itemName: line.itemName,
            width: line.width || null,
            height: line.height || null,
            quantity: line.quantity,
            areaSqm: line.areaSqm,
            runningMeter: line.runningMeter || null,
            unitRate: line.unitRate,
            total: line.total,
            systemType: line.systemType || 'NON_SYSTEM',
            materialList: line.materialList || null,
            labourCost: line.labourCost || null,
            overheads: line.overheads || null,
            remarks: line.remarks || null,
          })),
        },
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
        inquiry: {
          select: {
            id: true,
            source: true,
            projectType: true,
            location: true,
            notes: true,
          },
        },
        quotationLines: true,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'QUOTATION_CREATE',
      entityType: 'Quotation',
      entityId: quotation.id,
      newData: {
        quotationNumber: quotation.quotationNumber,
        clientId: quotation.clientId,
        status: quotation.status,
        totalAmount: quotation.totalAmount,
      },
    });

    res.status(201).json(quotation);
  } catch (error) {
    console.error('Create quotation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all quotations with filters
 * GET /api/quotations
 */
const getQuotations = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status, clientId, preparedBy, from, to, search } = req.query;

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

    if (clientId) {
      where.clientId = clientId;
    }

    if (preparedBy) {
      where.preparedBy = preparedBy;
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

    // Search filter
    if (search) {
      where.OR = [
        { quotationNumber: { contains: search, mode: 'insensitive' } },
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

    const quotations = await prisma.quotation.findMany({
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

    // Return summary format
    const summaries = quotations.map((q) => ({
      id: q.id,
      quotationNumber: q.quotationNumber,
      clientId: q.clientId,
      client: q.client,
      status: q.status,
      totalAmount: q.totalAmount,
      createdAt: q.createdAt,
      preparedBy: q.preparedBy,
    }));

    res.json(summaries);
  } catch (error) {
    console.error('Get quotations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get single quotation by ID
 * GET /api/quotations/:id
 */
const getQuotationById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const quotation = await prisma.quotation.findFirst({
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
        inquiry: {
          select: {
            id: true,
            source: true,
            projectType: true,
            location: true,
            notes: true,
            status: true,
          },
        },
        quotationLines: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Fetch related documents
    const documentIds = quotation.attachments || [];
    let documents = [];

    if (documentIds.length > 0) {
      documents = await prisma.document.findMany({
        where: {
          id: { in: documentIds },
          tenantId: tenantId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    res.json({
      ...quotation,
      attachments: documents,
    });
  } catch (error) {
    console.error('Get quotation by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update quotation
 * PUT /api/quotations/:id
 */
const updateQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      validityDays,
      discount,
      vatPercent,
      notes,
      lines,
      attachments,
    } = req.body;
    const tenantId = req.tenantId;

    // Check if quotation exists and belongs to tenant
    const existingQuotation = await prisma.quotation.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
      include: {
        quotationLines: true,
      },
    });

    if (!existingQuotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Only allow updates if status is DRAFT or SENT
    if (
      existingQuotation.status !== 'DRAFT' &&
      existingQuotation.status !== 'SENT'
    ) {
      return res.status(400).json({
        message: `Cannot update quotation with status ${existingQuotation.status}`,
      });
    }

    // Store old data for audit
    const oldData = {
      validityDays: existingQuotation.validityDays,
      discount: existingQuotation.discount,
      vatPercent: existingQuotation.vatPercent,
      notes: existingQuotation.notes,
      subtotal: existingQuotation.subtotal,
      vatAmount: existingQuotation.vatAmount,
      totalAmount: existingQuotation.totalAmount,
      lines: existingQuotation.quotationLines,
    };

    // Prepare update data
    const updateData = {};
    if (validityDays !== undefined) updateData.validityDays = validityDays;
    if (discount !== undefined) updateData.discount = discount;
    if (vatPercent !== undefined) updateData.vatPercent = vatPercent;
    if (notes !== undefined) updateData.notes = notes;
    if (attachments !== undefined) {
      updateData.attachments = attachments.length > 0 ? attachments : null;
    }

    // If lines are provided, recalculate everything
    let calculatedLines = existingQuotation.quotationLines;
    if (lines && lines.length > 0) {
      // Validate lines
      for (const line of lines) {
        if (!line.itemName) {
          return res
            .status(400)
            .json({ message: 'Item name is required for all lines' });
        }
        if (!line.quantity || line.quantity < 1) {
          return res
            .status(400)
            .json({ message: 'Quantity must be at least 1' });
        }
        if (line.unitRate === undefined || line.unitRate < 0) {
          return res.status(400).json({ message: 'Unit rate must be >= 0' });
        }
      }

      calculatedLines = lines.map((line) => {
        const calculated = calculateLineTotal(line);
        return {
          ...line,
          areaSqm: calculated.areaSqm,
          runningMeter: calculated.runningMeter,
          total: calculated.total,
        };
      });

      // Delete existing lines and create new ones
      await prisma.quotationLine.deleteMany({
        where: { quotationId: id },
      });
    }

    // Recalculate totals
    const finalDiscount = updateData.discount !== undefined ? updateData.discount : existingQuotation.discount || 0;
    const finalVatPercent = updateData.vatPercent !== undefined ? updateData.vatPercent : existingQuotation.vatPercent || 0;
    const totals = calculateQuotationTotals(
      calculatedLines,
      finalDiscount,
      finalVatPercent
    );

    updateData.subtotal = totals.subtotal;
    updateData.vatAmount = totals.vatAmount;
    updateData.totalAmount = totals.totalAmount;

    // Update quotation
    const updatedQuotation = await prisma.quotation.update({
      where: { id },
      data: {
        ...updateData,
        ...(lines && lines.length > 0
          ? {
              quotationLines: {
                create: calculatedLines.map((line) => ({
                  itemName: line.itemName,
                  width: line.width || null,
                  height: line.height || null,
                  quantity: line.quantity,
                  areaSqm: line.areaSqm,
                  runningMeter: line.runningMeter || null,
                  unitRate: line.unitRate,
                  total: line.total,
                  systemType: line.systemType || 'NON_SYSTEM',
                  materialList: line.materialList || null,
                  labourCost: line.labourCost || null,
                  overheads: line.overheads || null,
                  remarks: line.remarks || null,
                })),
              },
            }
          : {}),
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
        inquiry: {
          select: {
            id: true,
            source: true,
            projectType: true,
            location: true,
            notes: true,
          },
        },
        quotationLines: true,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'QUOTATION_UPDATE',
      entityType: 'Quotation',
      entityId: id,
      oldData: oldData,
      newData: {
        validityDays: updatedQuotation.validityDays,
        discount: updatedQuotation.discount,
        vatPercent: updatedQuotation.vatPercent,
        notes: updatedQuotation.notes,
        subtotal: updatedQuotation.subtotal,
        vatAmount: updatedQuotation.vatAmount,
        totalAmount: updatedQuotation.totalAmount,
      },
    });

    res.json(updatedQuotation);
  } catch (error) {
    console.error('Update quotation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Send quotation
 * POST /api/quotations/:id/send
 */
const sendQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { sentBy, emailMessage, sendEmail } = req.body;
    const tenantId = req.tenantId;

    // Check if quotation exists
    const quotation = await prisma.quotation.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
      include: {
        client: true,
        quotationLines: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Update status
    const updatedQuotation = await prisma.quotation.update({
      where: { id },
      data: {
        status: 'SENT',
        sentBy: sentBy || req.user.userId,
        sentAt: new Date(),
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'QUOTATION_SENT',
      entityType: 'Quotation',
      entityId: id,
      newData: {
        status: 'SENT',
        sentBy: updatedQuotation.sentBy,
        sentAt: updatedQuotation.sentAt,
      },
    });

    // Send email if requested
    let emailResult = null;
    if (sendEmail && quotation.client.email) {
      try {
        emailResult = await sendQuotationEmail({
          quotation: {
            ...quotation,
            quotationLines: quotation.quotationLines,
          },
          message: emailMessage || 'Please find attached our quotation for your consideration.',
          pdfUrl: null, // TODO: Generate PDF and attach
          tenantId: req.tenantId,
        });
      } catch (error) {
        console.error('Failed to send email:', error);
        // Don't fail the request if email fails
        emailResult = { success: false, error: error.message };
      }
    }

    res.json({
      success: true,
      sentAt: updatedQuotation.sentAt,
      quotation: updatedQuotation,
      emailSent: emailResult?.success || false,
      emailError: emailResult?.error || null,
    });
  } catch (error) {
    console.error('Send quotation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Approve quotation
 * POST /api/quotations/:id/approve
 */
const approveQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    const tenantId = req.tenantId;
    const userRole = req.user.role;

    // Check if user has permission (DIRECTOR or PROJECT_MANAGER)
    if (
      userRole !== Role.DIRECTOR &&
      userRole !== Role.PROJECT_MANAGER
    ) {
      return res.status(403).json({
        message: 'Only Directors and Project Managers can approve quotations',
      });
    }

    // Check if quotation exists
    const quotation = await prisma.quotation.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Update status
    const updatedQuotation = await prisma.quotation.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: approvedBy || req.user.userId,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'QUOTATION_APPROVED',
      entityType: 'Quotation',
      entityId: id,
      newData: {
        status: 'APPROVED',
        approvedBy: updatedQuotation.approvedBy,
      },
    });

    res.json({
      success: true,
      quotationId: id,
      quotation: updatedQuotation,
    });
  } catch (error) {
    console.error('Approve quotation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Reject quotation
 * POST /api/quotations/:id/reject
 */
const rejectQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectedBy, reason } = req.body;
    const tenantId = req.tenantId;

    // Check if quotation exists
    const quotation = await prisma.quotation.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Update status
    const updatedQuotation = await prisma.quotation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: rejectedBy || req.user.userId,
        rejectedAt: new Date(),
        notes: reason
          ? `${quotation.notes || ''}\n\nRejection reason: ${reason}`.trim()
          : quotation.notes,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'QUOTATION_REJECTED',
      entityType: 'Quotation',
      entityId: id,
      newData: {
        status: 'REJECTED',
        rejectedBy: updatedQuotation.rejectedBy,
        rejectedAt: updatedQuotation.rejectedAt,
        reason: reason,
      },
    });

    res.json({
      success: true,
      quotation: updatedQuotation,
    });
  } catch (error) {
    console.error('Reject quotation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Convert quotation to project
 * POST /api/quotations/:id/convert
 */
const convertQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { projectName, type, startDate, subGroups, createdBy } = req.body;
    const tenantId = req.tenantId;

    // Check if quotation exists
    const quotation = await prisma.quotation.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
      include: {
        quotationLines: true,
        client: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Verify quotation is APPROVED (or SENT if tenant setting allows)
    if (quotation.status !== 'APPROVED') {
      // Check tenant settings for allowing conversion from SENT
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });

      const allowConvertFromSent =
        tenant?.settings?.allowConvertQuotationFromSent || false;

      if (quotation.status !== 'SENT' || !allowConvertFromSent) {
        return res.status(400).json({
          message: `Cannot convert quotation with status ${quotation.status}. Quotation must be APPROVED.`,
        });
      }
    }

    // Validate required fields
    if (!projectName || !type || !createdBy) {
      return res
        .status(400)
        .json({ message: 'Project name, type, and createdBy are required' });
    }

    // Generate project code
    const projectCode = await generateProjectCode(tenantId);

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create project
      const project = await tx.project.create({
        data: {
          tenantId: tenantId,
          projectCode: projectCode,
          name: projectName,
          clientId: quotation.clientId,
          quotationId: id,
          type: type,
          startDate: startDate ? new Date(startDate) : null,
          status: 'PLANNED',
          plannedCost: quotation.totalAmount,
        },
      });

      // Create sub-groups
      const createdSubGroups = [];
      if (subGroups && subGroups.length > 0) {
        for (const subGroup of subGroups) {
          // Get material list from referenced lines
          let plannedMaterial = null;
          if (subGroup.lines && subGroup.lines.length > 0) {
            const referencedLines = quotation.quotationLines.filter((line) =>
              subGroup.lines.includes(line.id)
            );
            plannedMaterial = {
              lines: referencedLines.map((line) => ({
                lineId: line.id,
                itemName: line.itemName,
                materialList: line.materialList,
                quantity: line.quantity,
              })),
            };
          }

          const createdSubGroup = await tx.subGroup.create({
            data: {
              projectId: project.id,
              name: subGroup.name,
              plannedQty: subGroup.plannedQty || null,
              plannedMaterial: plannedMaterial,
            },
          });

          createdSubGroups.push(createdSubGroup);
        }
      }

      // Update quotation status to CONVERTED
      await tx.quotation.update({
        where: { id },
        data: {
          status: 'CONVERTED',
        },
      });

      return { project, subGroups: createdSubGroups };
    });

    // Create audit logs
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'PROJECT_CREATED_FROM_QUOTATION',
      entityType: 'Project',
      entityId: result.project.id,
      newData: {
        projectCode: result.project.projectCode,
        name: result.project.name,
        quotationId: id,
      },
    });

    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'QUOTATION_CONVERTED',
      entityType: 'Quotation',
      entityId: id,
      newData: {
        status: 'CONVERTED',
        projectId: result.project.id,
      },
    });

    res.json({
      project: {
        id: result.project.id,
        projectCode: result.project.projectCode,
        name: result.project.name,
        type: result.project.type,
        status: result.project.status,
      },
      subGroups: result.subGroups.map((sg) => ({
        id: sg.id,
        name: sg.name,
        plannedQty: sg.plannedQty,
      })),
    });
  } catch (error) {
    console.error('Convert quotation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Generate Quotation PDF
 * GET /api/quotations/:id/pdf
 */
const generateQuotationPDFEndpoint = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const quotation = await prisma.quotation.findFirst({
      where: {
        id,
        tenantId,
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
        quotationLines: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        address: true,
        logoUrl: true,
        vatNumber: true,
        settings: true,
      },
    });

    const pdfBuffer = await generateQuotationPDF(quotation, tenant || {});

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Quotation-${quotation.quotationNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate Quotation PDF error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  sendQuotation,
  approveQuotation,
  rejectQuotation,
  convertQuotation,
  generateQuotationPDFEndpoint,
};

