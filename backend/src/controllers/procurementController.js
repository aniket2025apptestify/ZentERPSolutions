const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const {
  generateMRNumber,
  generatePONumber,
  generateGRNNumber,
} = require('../services/sequenceService');
const { sendMaterialRequestToVendor } = require('../services/emailService');
const { Role } = require('@prisma/client');

// ==================== MATERIAL REQUEST ====================

/**
 * Create Material Request
 * POST /api/procurement/material-requests
 */
const createMaterialRequest = async (req, res) => {
  try {
    const { projectId, subGroupId, requestedBy, notes, items } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // Validation
    if (!requestedBy) {
      return res.status(400).json({ message: 'requestedBy is required' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    for (const item of items) {
      if (!item.itemName || !item.qty || item.qty <= 0) {
        return res.status(400).json({
          message: 'Each item must have itemName and qty > 0',
        });
      }
    }

    // Validate project/subGroup if provided
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, tenantId },
      });
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
    }

    if (subGroupId) {
      const whereClause = { id: subGroupId };
      if (projectId) {
        whereClause.projectId = projectId;
      }
      const subGroup = await prisma.subGroup.findFirst({
        where: whereClause,
      });
      if (!subGroup) {
        return res.status(404).json({ message: 'SubGroup not found' });
      }
    }

    // Generate request number
    const requestNumber = await generateMRNumber(tenantId);

    // Create MR
    const materialRequest = await prisma.materialRequest.create({
      data: {
        tenantId,
        requestNumber,
        projectId: projectId || null,
        subGroupId: subGroupId || null,
        requestedBy,
        requestedDate: new Date(),
        status: 'REQUESTED',
        notes: notes || null,
        items: items,
      },
      include: {
        project: {
          select: { id: true, name: true, projectCode: true },
        },
        subGroup: {
          select: { id: true, name: true },
        },
      },
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user.userId,
      action: 'MATERIAL_REQUEST_CREATE',
      entityType: 'MaterialRequest',
      entityId: materialRequest.id,
      newData: {
        requestNumber: materialRequest.requestNumber,
        status: materialRequest.status,
        projectId: materialRequest.projectId,
        subGroupId: materialRequest.subGroupId,
      },
    });

    res.status(201).json({
      id: materialRequest.id,
      requestNumber: materialRequest.requestNumber,
      status: materialRequest.status,
    });
  } catch (error) {
    console.error('Create material request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Material Requests
 * GET /api/procurement/material-requests?status=&projectId=&from=&to=&search=
 */
const getMaterialRequests = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status, projectId, subGroupId, from, to, search } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (subGroupId) {
      where.subGroupId = subGroupId;
    }

    if (from || to) {
      where.requestedDate = {};
      if (from) {
        where.requestedDate.gte = new Date(from);
      }
      if (to) {
        where.requestedDate.lte = new Date(to);
      }
    }

    if (search) {
      where.OR = [
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const materialRequests = await prisma.materialRequest.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, projectCode: true },
        },
        subGroup: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(materialRequests);
  } catch (error) {
    console.error('Get material requests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Material Request by ID
 * GET /api/procurement/material-requests/:id
 */
const getMaterialRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const materialRequest = await prisma.materialRequest.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        project: {
          select: { id: true, name: true, projectCode: true },
        },
        subGroup: {
          select: { id: true, name: true },
        },
        vendorQuotes: {
          include: {
            vendor: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!materialRequest) {
      return res.status(404).json({ message: 'Material request not found' });
    }

    res.json(materialRequest);
  } catch (error) {
    console.error('Get material request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Send Material Request to Vendor via Email
 * POST /api/procurement/material-requests/:mrId/send-to-vendor
 */
const sendMRToVendor = async (req, res) => {
  try {
    const { mrId } = req.params;
    const { vendorId } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    if (!vendorId) {
      return res.status(400).json({ message: 'Vendor ID is required' });
    }

    // Get Material Request
    const materialRequest = await prisma.materialRequest.findFirst({
      where: {
        id: mrId,
        tenantId,
      },
      include: {
        project: {
          select: { id: true, name: true, projectCode: true },
        },
      },
    });

    if (!materialRequest) {
      return res.status(404).json({ message: 'Material request not found' });
    }

    // Get Vendor
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        tenantId,
      },
    });

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    if (!vendor.email) {
      return res.status(400).json({ message: 'Vendor email not found' });
    }

    // Generate vendor portal link (if vendor portal is enabled)
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const quoteLink = `${baseUrl}/vendor/quote/${mrId}?vendorId=${vendorId}`;

    // Send email
    try {
      const emailResult = await sendMaterialRequestToVendor({
        materialRequest,
        vendor,
        quoteLink,
      });

      // Audit log
      await createAuditLog({
        tenantId,
        userId: req.user.userId,
        action: 'MR_SENT_TO_VENDOR',
        entityType: 'MaterialRequest',
        entityId: mrId,
        newData: {
          vendorId,
          vendorEmail: vendor.email,
          emailMessageId: emailResult.messageId,
        },
      });

      res.json({
        success: true,
        message: 'Material request sent to vendor successfully',
        emailResult,
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      res.status(500).json({
        message: 'Failed to send email',
        error: emailError.message,
      });
    }
  } catch (error) {
    console.error('Send MR to vendor error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==================== VENDOR ====================

/**
 * Create Vendor
 * POST /api/procurement/vendors
 */
const createVendor = async (req, res) => {
  try {
    const { name, contactPerson, email, phone, address, bankDetails } =
      req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Vendor name is required' });
    }

    const vendor = await prisma.vendor.create({
      data: {
        tenantId,
        name,
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        bankDetails: bankDetails || null,
      },
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user.userId,
      action: 'VENDOR_CREATE',
      entityType: 'Vendor',
      entityId: vendor.id,
      newData: {
        name: vendor.name,
        email: vendor.email,
      },
    });

    res.status(201).json(vendor);
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Vendors
 * GET /api/procurement/vendors?search=
 */
const getVendors = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { search } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    });

    res.json(vendors);
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Vendor by ID
 * GET /api/procurement/vendors/:id
 */
const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const vendor = await prisma.vendor.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==================== VENDOR QUOTE ====================

/**
 * Create Vendor Quote
 * POST /api/procurement/vendor-quotes
 */
const createVendorQuote = async (req, res) => {
  try {
    const {
      materialRequestId,
      vendorId,
      quoteNumber,
      quotedBy,
      lines,
      totalAmount,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // Validation
    if (!materialRequestId || !vendorId || !quoteNumber) {
      return res.status(400).json({
        message: 'materialRequestId, vendorId, and quoteNumber are required',
      });
    }

    if (!lines || lines.length === 0) {
      return res.status(400).json({ message: 'At least one line is required' });
    }

    // Validate MR belongs to tenant
    const materialRequest = await prisma.materialRequest.findFirst({
      where: {
        id: materialRequestId,
        tenantId,
      },
    });

    if (!materialRequest) {
      return res.status(404).json({ message: 'Material request not found' });
    }

    // Validate vendor belongs to tenant
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        tenantId,
      },
    });

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Create vendor quote
    const vendorQuote = await prisma.vendorQuote.create({
      data: {
        tenantId,
        materialRequestId,
        vendorId,
        quoteNumber,
        quotedBy: quotedBy || null,
        lines: lines,
        totalAmount: totalAmount || 0,
        status: 'SUBMITTED',
      },
      include: {
        vendor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Update MR status to QUOTED if it's still REQUESTED
    if (materialRequest.status === 'REQUESTED') {
      await prisma.materialRequest.update({
        where: { id: materialRequestId },
        data: { status: 'QUOTED' },
      });
    }

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user.userId,
      action: 'VENDOR_QUOTE_SUBMITTED',
      entityType: 'VendorQuote',
      entityId: vendorQuote.id,
      newData: {
        materialRequestId,
        vendorId,
        quoteNumber,
        totalAmount: vendorQuote.totalAmount,
      },
    });

    res.status(201).json({
      id: vendorQuote.id,
      status: vendorQuote.status,
    });
  } catch (error) {
    console.error('Create vendor quote error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Vendor Quotes for Material Request
 * GET /api/procurement/material-requests/:mrId/vendor-quotes
 */
const getVendorQuotesForMR = async (req, res) => {
  try {
    const { mrId } = req.params;
    const tenantId = req.tenantId;

    // Validate MR belongs to tenant
    const materialRequest = await prisma.materialRequest.findFirst({
      where: {
        id: mrId,
        tenantId,
      },
    });

    if (!materialRequest) {
      return res.status(404).json({ message: 'Material request not found' });
    }

    const vendorQuotes = await prisma.vendorQuote.findMany({
      where: {
        materialRequestId: mrId,
        tenantId,
      },
      include: {
        vendor: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(vendorQuotes);
  } catch (error) {
    console.error('Get vendor quotes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==================== PURCHASE ORDER ====================

/**
 * Create Purchase Order
 * POST /api/procurement/purchase-orders
 */
const createPurchaseOrder = async (req, res) => {
  try {
    const {
      vendorId,
      materialRequestId,
      projectId,
      subGroupId,
      createdBy,
      deliveryDate,
      lines,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // Use req.user.userId as fallback for createdBy if not provided
    const finalCreatedBy = createdBy || req.user.userId;

    // Validation
    if (!vendorId || !finalCreatedBy) {
      return res.status(400).json({
        message: 'vendorId and createdBy are required',
      });
    }

    if (!lines || lines.length === 0) {
      return res.status(400).json({ message: 'At least one line is required' });
    }

    for (const line of lines) {
      if (!line.description || !line.qty || line.qty <= 0 || !line.unitRate) {
        return res.status(400).json({
          message:
            'Each line must have description, qty > 0, and unitRate',
        });
      }
    }

    // Validate vendor
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        tenantId,
      },
    });

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Validate MR if provided
    if (materialRequestId) {
      const materialRequest = await prisma.materialRequest.findFirst({
        where: {
          id: materialRequestId,
          tenantId,
        },
      });

      if (!materialRequest) {
        return res.status(404).json({ message: 'Material request not found' });
      }
    }

    // Validate project/subGroup if provided
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, tenantId },
      });
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
    }

    if (subGroupId) {
      const whereClause = { id: subGroupId };
      if (projectId) {
        whereClause.projectId = projectId;
      }
      const subGroup = await prisma.subGroup.findFirst({
        where: whereClause,
      });
      if (!subGroup) {
        return res.status(404).json({ message: 'SubGroup not found' });
      }
    }

    // Generate PO number
    const poNumber = await generatePONumber(tenantId);

    // Calculate total amount
    const totalAmount = lines.reduce(
      (sum, line) => sum + line.qty * line.unitRate,
      0
    );

    // Create PO with lines
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        poNumber,
        vendorId,
        materialRequestId: materialRequestId || null,
        projectId: projectId || null,
        subGroupId: subGroupId || null,
        createdBy: finalCreatedBy,
        status: 'DRAFT',
        totalAmount,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        poLines: {
          create: lines.map((line) => ({
            itemId: line.itemId || null,
            description: line.description,
            qty: line.qty,
            unit: line.unit || 'pcs',
            unitRate: line.unitRate,
            amount: line.qty * line.unitRate,
          })),
        },
      },
      include: {
        vendor: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true, projectCode: true },
        },
        subGroup: {
          select: { id: true, name: true },
        },
        poLines: true,
      },
    });

    // Update MR status to PO_CREATED if linked
    if (materialRequestId) {
      await prisma.materialRequest.update({
        where: { id: materialRequestId },
        data: { status: 'PO_CREATED' },
      });
    }

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user.userId,
      action: 'PO_CREATE',
      entityType: 'PurchaseOrder',
      entityId: purchaseOrder.id,
      newData: {
        poNumber: purchaseOrder.poNumber,
        vendorId,
        status: purchaseOrder.status,
        totalAmount: purchaseOrder.totalAmount,
      },
    });

    res.status(201).json({
      id: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      status: purchaseOrder.status,
      totalAmount: purchaseOrder.totalAmount,
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Purchase Orders
 * GET /api/procurement/purchase-orders?status=&vendorId=&projectId=
 */
const getPurchaseOrders = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status, vendorId, projectId, subGroupId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (subGroupId) {
      where.subGroupId = subGroupId;
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true, projectCode: true },
        },
        subGroup: {
          select: { id: true, name: true },
        },
        poLines: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(purchaseOrders);
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Purchase Order by ID
 * GET /api/procurement/purchase-orders/:id
 */
const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        vendor: true,
        project: {
          select: { id: true, name: true, projectCode: true },
        },
        subGroup: {
          select: { id: true, name: true },
        },
        poLines: {
          include: {
            item: {
              select: {
                id: true,
                itemName: true,
                itemCode: true,
                availableQty: true,
              },
            },
          },
        },
        grns: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        materialRequest: {
          select: { id: true, requestNumber: true },
        },
      },
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    res.json(purchaseOrder);
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Approve Purchase Order
 * PUT /api/procurement/purchase-orders/:id/approve
 */
const approvePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, notes } = req.body;
    const tenantId = req.tenantId;

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const userRole = req.user.role;

    // Check authorization - only PROCUREMENT, DIRECTOR, or PROJECT_MANAGER can approve
    const allowedRoles = [
      Role.PROCUREMENT,
      Role.DIRECTOR,
      Role.PROJECT_MANAGER,
    ];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: 'You do not have permission to approve purchase orders',
      });
    }

    // Get PO
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    // Validate status
    if (purchaseOrder.status !== 'DRAFT' && purchaseOrder.status !== 'SENT') {
      return res.status(400).json({
        message: `Cannot approve PO with status: ${purchaseOrder.status}`,
      });
    }

    const oldData = {
      status: purchaseOrder.status,
      approvedBy: purchaseOrder.approvedBy,
      approvedAt: purchaseOrder.approvedAt,
    };

    // Update PO
    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: approvedBy || req.user.userId,
        approvedAt: new Date(),
      },
      include: {
        vendor: true,
        poLines: true,
      },
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user.userId,
      action: 'PO_APPROVE',
      entityType: 'PurchaseOrder',
      entityId: id,
      oldData,
      newData: {
        status: updatedPO.status,
        approvedBy: updatedPO.approvedBy,
        approvedAt: updatedPO.approvedAt,
      },
    });

    res.json({
      success: true,
      poId: id,
      status: updatedPO.status,
    });
  } catch (error) {
    console.error('Approve purchase order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Send Purchase Order to Vendor
 * POST /api/procurement/purchase-orders/:id/send
 */
const sendPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { sentBy, sendEmail, emailMessage } = req.body;
    const tenantId = req.tenantId;

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // Get PO
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        vendor: true,
        poLines: true,
      },
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    const oldData = {
      status: purchaseOrder.status,
      sentBy: purchaseOrder.sentBy,
      sentAt: purchaseOrder.sentAt,
    };

    // Update status
    const newStatus =
      purchaseOrder.status === 'DRAFT' ? 'SENT' : purchaseOrder.status;

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: newStatus,
        sentBy: sentBy || req.user.userId,
        sentAt: new Date(),
      },
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user.userId,
      action: 'PO_SEND',
      entityType: 'PurchaseOrder',
      entityId: id,
      oldData,
      newData: {
        status: updatedPO.status,
        sentBy: updatedPO.sentBy,
        sentAt: updatedPO.sentAt,
      },
    });

    // TODO: Send email if sendEmail is true and vendor has email
    // This would require implementing sendPOEmail similar to sendQuotationEmail

    res.json({
      success: true,
      poId: id,
      status: updatedPO.status,
      emailSent: false, // TODO: Update when email is implemented
    });
  } catch (error) {
    console.error('Send purchase order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==================== GRN ====================

/**
 * Create GRN (Goods Receipt Note)
 * POST /api/procurement/grn
 */
const createGRN = async (req, res) => {
  try {
    const {
      purchaseOrderId,
      grnNumber,
      receivedBy,
      receivedDate,
      items,
      documents,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!req.user || !req.user?.userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // Validation
    if (!purchaseOrderId || !receivedBy) {
      return res.status(400).json({
        message: 'purchaseOrderId and receivedBy are required',
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    // Validate PO belongs to tenant
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: purchaseOrderId,
        tenantId,
      },
      include: {
        poLines: true,
        grns: true,
      },
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    // Generate GRN number if not provided
    let finalGRNNumber = grnNumber;
    if (!finalGRNNumber) {
      finalGRNNumber = await generateGRNNumber(tenantId);
    }

    // Process items - validate and prepare
    const processedItems = [];
    const itemUpdates = []; // Store item updates to do after GRN creation

    for (const grnItem of items) {
      const { itemId, description, qty, batchNo, remarks } = grnItem;

      if (!description || !qty || qty <= 0) {
        return res.status(400).json({
          message: 'Each item must have description and qty > 0',
        });
      }

      processedItems.push({
        itemId: itemId || null,
        description,
        qty,
        batchNo: batchNo || null,
        remarks: remarks || null,
      });

      // Find or create inventory item
      let inventoryItem = null;

      if (itemId) {
        // Use existing item
        inventoryItem = await prisma.inventoryItem.findFirst({
          where: {
            id: itemId,
            tenantId,
          },
        });

        if (!inventoryItem) {
          return res.status(404).json({
            message: `Inventory item ${itemId} not found`,
          });
        }
      } else {
        // Try to find by description, or create new ad-hoc item
        inventoryItem = await prisma.inventoryItem.findFirst({
          where: {
            itemName: { equals: description, mode: 'insensitive' },
            tenantId,
          },
        });

        if (!inventoryItem) {
          // Create new ad-hoc inventory item
          const itemCode = `ADHOC-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 11)}`;
          inventoryItem = await prisma.inventoryItem.create({
            data: {
              tenantId,
              itemName: description,
              itemCode,
              unit: 'pcs',
              systemItem: false,
              openingQty: 0,
              availableQty: 0,
            },
          });
        }
      }

      // Store item update info
      itemUpdates.push({
        itemId: inventoryItem.id,
        qty,
        currentQty: inventoryItem.availableQty,
      });
    }

    // Create GRN first
    const grn = await prisma.gRN.create({
      data: {
        tenantId,
        purchaseOrderId,
        grnNumber: finalGRNNumber,
        receivedBy,
        receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
        items: processedItems,
        documents: documents || null,
      },
    });

    // Now update inventory and create stock transactions
    for (let i = 0; i < itemUpdates.length; i++) {
      const { itemId, qty, currentQty } = itemUpdates[i];
      const newAvailableQty = currentQty + qty;
      const grnItem = processedItems[i];

      // Get the inventory item to get rate and update
      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { id: itemId },
      });

      // Get unit rate from PO line if available
      let unitRate = null;
      if (grnItem.itemId) {
        const poLine = purchaseOrder.poLines.find(
          (line) => line.itemId === grnItem.itemId
        );
        if (poLine) {
          unitRate = poLine.unitRate;
        }
      }

      // Update inventory quantity and lastPurchaseRate
      await prisma.inventoryItem.update({
        where: { id: itemId },
        data: {
          availableQty: newAvailableQty,
          ...(unitRate && { lastPurchaseRate: unitRate }),
        },
      });

      // Create stock transaction
      await prisma.stockTransaction.create({
        data: {
          tenantId,
          itemId: itemId,
          type: 'IN',
          referenceType: 'GRN',
          referenceId: grn.id,
          qty: qty,
          rate: unitRate || inventoryItem?.lastPurchaseRate || null,
          balanceAfter: newAvailableQty,
          batchNo: grnItem?.batchNo || null,
          remarks: grnItem?.remarks || null,
          createdBy: receivedBy,
        },
      });

      // Note: Low stock alerts are checked via /api/inventory/check-low-stock endpoint
      // or can be scheduled as a background job
    }

    // Calculate total ordered qty from PO lines
    const totalOrderedQty = purchaseOrder.poLines.reduce(
      (sum, line) => sum + line.qty,
      0
    );

    // Calculate total received qty from all GRNs
    const allGRNs = await prisma.gRN.findMany({
      where: { purchaseOrderId },
    });

    let totalReceivedFromAllGRNs = 0;
    for (const existingGRN of allGRNs) {
      const existingItems = Array.isArray(existingGRN.items)
        ? existingGRN.items
        : [];
      totalReceivedFromAllGRNs += existingItems.reduce(
        (sum, item) => sum + (item.qty || 0),
        0
      );
    }

    // Update PO status based on received quantity
    let newPOStatus = purchaseOrder.status;
    if (totalReceivedFromAllGRNs >= totalOrderedQty) {
      newPOStatus = 'RECEIVED';
    } else if (totalReceivedFromAllGRNs > 0) {
      newPOStatus = 'RECEIVED_PARTIAL';
    }

    if (newPOStatus !== purchaseOrder.status) {
      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: newPOStatus },
      });
    }

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId,
      action: 'GRN_CREATED',
      entityType: 'GRN',
      entityId: grn.id,
      newData: {
        grnNumber: grn.grnNumber,
        purchaseOrderId,
        itemsCount: processedItems.length,
      },
    });

    res.status(201).json({
      id: grn.id,
      grnNumber: grn.grnNumber,
      status: newPOStatus,
    });
  } catch (error) {
    console.error('Create GRN error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get GRN by ID
 * GET /api/procurement/grn/:id
 */
const getGRNById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const grn = await prisma.gRN.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        purchaseOrder: {
          include: {
            vendor: {
              select: { id: true, name: true },
            },
            poLines: true,
          },
        },
      },
    });

    if (!grn) {
      return res.status(404).json({ message: 'GRN not found' });
    }

    res.json(grn);
  } catch (error) {
    console.error('Get GRN error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get GRNs
 * GET /api/procurement/grn?purchaseOrderId=
 */
const getGRNs = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { purchaseOrderId } = req.query;

    const where = {
      tenantId,
    };

    if (purchaseOrderId) {
      where.purchaseOrderId = purchaseOrderId;
    }

    const grns = await prisma.gRN.findMany({
      where,
      include: {
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            status: true,
            totalAmount: true,
            vendor: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(grns);
  } catch (error) {
    console.error('Get GRNs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  // Material Request
  createMaterialRequest,
  getMaterialRequests,
  getMaterialRequestById,
  sendMRToVendor,

  // Vendor
  createVendor,
  getVendors,
  getVendorById,

  // Vendor Quote
  createVendorQuote,
  getVendorQuotesForMR,

  // Purchase Order
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  approvePurchaseOrder,
  sendPurchaseOrder,

  // GRN
  createGRN,
  getGRNById,
  getGRNs,
};

