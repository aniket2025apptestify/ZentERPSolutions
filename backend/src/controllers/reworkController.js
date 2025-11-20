const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const { notifyReworkCreated } = require('../services/notificationService');

/**
 * Create rework job
 * POST /api/rework
 */
const createRework = async (req, res) => {
  try {
    const {
      sourceProductionJobId,
      sourceDNId,
      assignedTo,
      createdBy,
      expectedHours,
      notes,
      materialNeeded,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!createdBy) {
      return res.status(400).json({ message: 'createdBy is required' });
    }

    if (!sourceProductionJobId && !sourceDNId) {
      return res.status(400).json({
        message: 'Either sourceProductionJobId or sourceDNId is required',
      });
    }

    // Validate source production job if provided
    if (sourceProductionJobId) {
      const job = await prisma.productionJob.findFirst({
        where: {
          id: sourceProductionJobId,
          tenantId,
        },
      });

      if (!job) {
        return res.status(404).json({ message: 'Source production job not found' });
      }
    }

    // Validate source DN if provided
    if (sourceDNId) {
      const dn = await prisma.deliveryNote.findFirst({
        where: {
          id: sourceDNId,
          project: {
            tenantId,
          },
        },
        include: {
          project: true,
        },
      });

      if (!dn) {
        return res.status(404).json({ message: 'Source delivery note not found' });
      }
    }

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create rework job
      const reworkJob = await tx.reworkJob.create({
        data: {
          tenantId,
          sourceProductionJobId: sourceProductionJobId || null,
          sourceDNId: sourceDNId || null,
          assignedTo: assignedTo || null,
          createdBy,
          status: 'OPEN',
          expectedHours: expectedHours || null,
          notes: notes || null,
          materialNeeded: materialNeeded || null,
        },
      });

      // Update source production job status if provided
      if (sourceProductionJobId) {
        await tx.productionJob.update({
          where: { id: sourceProductionJobId },
          data: { status: 'REWORK' },
        });
      }

      // Create audit log
      await createAuditLog({
        tenantId,
        userId: createdBy,
        action: 'REWORK_CREATE',
        entityType: 'ReworkJob',
        entityId: reworkJob.id,
        newData: {
          sourceProductionJobId,
          sourceDNId,
          assignedTo,
          status: 'OPEN',
        },
      });

      // Notify assigned user and supervisors
      notifyReworkCreated(tenantId, reworkJob.id, assignedTo).catch((err) =>
        console.error('Notification error:', err)
      );

      return reworkJob;
    });

    res.json({
      reworkJobId: result.id,
      status: result.status,
    });
  } catch (error) {
    console.error('Create rework error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update rework job
 * PUT /api/rework/:id
 */
const updateRework = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, actualHours, notes } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Get current rework job
    const reworkJob = await prisma.reworkJob.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!reworkJob) {
      return res.status(404).json({ message: 'Rework job not found' });
    }

    // Validate status
    if (status && !['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const oldData = {
      status: reworkJob.status,
      assignedTo: reworkJob.assignedTo,
      actualHours: reworkJob.actualHours,
    };

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      const updateData = {};

      if (status) updateData.status = status;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
      if (actualHours !== undefined) updateData.actualHours = actualHours;
      if (notes !== undefined) updateData.notes = notes;

      // Update rework job
      const updatedRework = await tx.reworkJob.update({
        where: { id },
        data: updateData,
      });

      // If status is COMPLETED, update source production job
      if (status === 'COMPLETED' && reworkJob.sourceProductionJobId) {
        // Optionally update source job status back to IN_PROGRESS or COMPLETED
        // This can be configured based on business rules
        await tx.productionJob.update({
          where: { id: reworkJob.sourceProductionJobId },
          data: { status: 'IN_PROGRESS' },
        });
      }

      // Create audit log
      await createAuditLog({
        tenantId,
        userId: req.user?.userId || req.user?.id || null,
        action: 'REWORK_UPDATE',
        entityType: 'ReworkJob',
        entityId: id,
        oldData,
        newData: updateData,
      });

      return updatedRework;
    });

    res.json(result);
  } catch (error) {
    console.error('Update rework error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get rework job by ID
 * GET /api/rework/:id
 */
const getReworkById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const reworkJob = await prisma.reworkJob.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        sourceProductionJob: {
          select: {
            id: true,
            jobCardNumber: true,
            project: {
              select: {
                projectCode: true,
                name: true,
              },
            },
          },
        },
        sourceDN: {
          select: {
            id: true,
            dnNumber: true,
            project: {
              select: {
                projectCode: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!reworkJob) {
      return res.status(404).json({ message: 'Rework job not found' });
    }

    res.json(reworkJob);
  } catch (error) {
    console.error('Get rework by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get rework jobs with filters
 * GET /api/rework
 */
const getReworkList = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status, assignedTo, sourceProductionJobId, sourceDNId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (sourceProductionJobId) {
      where.sourceProductionJobId = sourceProductionJobId;
    }

    if (sourceDNId) {
      where.sourceDNId = sourceDNId;
    }

    const reworkJobs = await prisma.reworkJob.findMany({
      where,
      include: {
        sourceProductionJob: {
          select: {
            id: true,
            jobCardNumber: true,
            project: {
              select: {
                projectCode: true,
                name: true,
              },
            },
          },
        },
        sourceDN: {
          select: {
            id: true,
            dnNumber: true,
            project: {
              select: {
                projectCode: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(reworkJobs);
  } catch (error) {
    console.error('Get rework list error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createRework,
  updateRework,
  getReworkById,
  getReworkList,
};

