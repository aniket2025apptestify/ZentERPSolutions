const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const {
  notifyQCFail,
  notifyReturnCreated,
} = require('../services/notificationService');
const { Role } = require('@prisma/client');

/**
 * Create QC record for production job
 * POST /api/qc/production/:productionJobId
 */
const createProductionQC = async (req, res) => {
  try {
    const { productionJobId } = req.params;
    const {
      inspectorId,
      stage,
      qcStatus,
      defects,
      remarks,
      createRework,
      reworkExpectedHours,
      reworkAssignedTo,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!inspectorId || !qcStatus) {
      return res.status(400).json({
        message: 'inspectorId and qcStatus are required',
      });
    }

    if (!['PASS', 'FAIL', 'NA'].includes(qcStatus)) {
      return res.status(400).json({
        message: 'qcStatus must be PASS, FAIL, or NA',
      });
    }

    // Validate production job exists and belongs to tenant
    const job = await prisma.productionJob.findFirst({
      where: {
        id: productionJobId,
        tenantId,
      },
    });

    if (!job) {
      return res.status(404).json({ message: 'Production job not found' });
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create QC record
      const qcRecord = await tx.qCRecord.create({
        data: {
          tenantId,
          productionJobId,
          inspectorId,
          stage: stage || job.stage,
          qcStatus,
          defects: defects || null,
          remarks: remarks || null,
          inspectedAt: new Date(),
        },
      });

      // Update production stage log QC status
      if (stage || job.stage) {
        const currentStage = stage || job.stage;
        const stageLog = await tx.productionStageLog.findFirst({
          where: {
            productionJobId,
            stage: currentStage,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (stageLog) {
          await tx.productionStageLog.update({
            where: { id: stageLog.id },
            data: { qcStatus },
          });
        }
      }

      let reworkJobId = null;

      // If QC fails and createRework is true, create rework job
      if (qcStatus === 'FAIL' && createRework) {
        const reworkJob = await tx.reworkJob.create({
          data: {
            tenantId,
            sourceProductionJobId: productionJobId,
            assignedTo: reworkAssignedTo || null,
            createdBy: inspectorId,
            status: 'OPEN',
            expectedHours: reworkExpectedHours || null,
            notes: remarks || null,
            materialNeeded: null, // Can be updated later
          },
        });

        reworkJobId = reworkJob.id;

        // Update production job status to REWORK
        await tx.productionJob.update({
          where: { id: productionJobId },
          data: { status: 'REWORK' },
        });

        // Create audit log for rework
        await createAuditLog({
          tenantId,
          userId: inspectorId,
          action: 'REWORK_CREATE',
          entityType: 'ReworkJob',
          entityId: reworkJob.id,
          newData: {
            sourceProductionJobId: productionJobId,
            reason: 'QC_FAIL',
            stage: stage || job.stage,
          },
        });
      } else if (qcStatus === 'FAIL') {
        // Even if not creating rework, update job status
        await tx.productionJob.update({
          where: { id: productionJobId },
          data: { status: 'REWORK' },
        });
      }

      // Create audit log for QC
      await createAuditLog({
        tenantId,
        userId: inspectorId,
        action: 'QC_CREATE',
        entityType: 'QCRecord',
        entityId: qcRecord.id,
        newData: {
          productionJobId,
          stage: stage || job.stage,
          qcStatus,
          defects,
        },
      });

      // Notify on QC fail
      if (qcStatus === 'FAIL') {
        notifyQCFail(tenantId, productionJobId, stage || job.stage, qcRecord).catch(
          (err) => console.error('Notification error:', err)
        );
      }

      return { qcRecord, reworkJobId };
    });

    res.json({
      qcId: result.qcRecord.id,
      reworkJobId: result.reworkJobId || null,
    });
  } catch (error) {
    console.error('Create production QC error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create QC record for delivery note
 * POST /api/qc/delivery-note/:dnId
 */
const createDNQC = async (req, res) => {
  try {
    const { dnId } = req.params;
    const { inspectorId, qcStatus, remarks, defects } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!inspectorId || !qcStatus) {
      return res.status(400).json({
        message: 'inspectorId and qcStatus are required',
      });
    }

    if (!['PASS', 'FAIL', 'NA'].includes(qcStatus)) {
      return res.status(400).json({
        message: 'qcStatus must be PASS, FAIL, or NA',
      });
    }

    // Validate delivery note exists
    const dn = await prisma.deliveryNote.findFirst({
      where: {
        id: dnId,
        project: {
          tenantId,
        },
      },
      include: {
        project: true,
      },
    });

    if (!dn) {
      return res.status(404).json({ message: 'Delivery note not found' });
    }

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create QC record
      const qcRecord = await tx.qCRecord.create({
        data: {
          tenantId,
          deliveryNoteId: dnId,
          inspectorId,
          qcStatus,
          defects: defects || null,
          remarks: remarks || null,
          inspectedAt: new Date(),
        },
      });

      // Create audit log
      await createAuditLog({
        tenantId,
        userId: inspectorId,
        action: 'QC_CREATE_DN',
        entityType: 'QCRecord',
        entityId: qcRecord.id,
        newData: {
          deliveryNoteId: dnId,
          qcStatus,
        },
      });

      return { qcRecord, action: qcStatus === 'PASS' ? 'DN_PASSED' : 'DN_FAILED' };
    });

    res.json({
      qcId: result.qcRecord.id,
      action: result.action,
    });
  } catch (error) {
    console.error('Create DN QC error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get QC record by ID
 * GET /api/qc/:id
 */
const getQCById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const qcRecord = await prisma.qCRecord.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        productionJob: {
          select: {
            id: true,
            jobCardNumber: true,
            project: {
              select: {
                id: true,
                projectCode: true,
                name: true,
              },
            },
          },
        },
        deliveryNote: {
          select: {
            id: true,
            dnNumber: true,
            project: {
              select: {
                id: true,
                projectCode: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!qcRecord) {
      return res.status(404).json({ message: 'QC record not found' });
    }

    res.json(qcRecord);
  } catch (error) {
    console.error('Get QC by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get QC records with filters
 * GET /api/qc
 */
const getQCList = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { productionJobId, dnId, from, to, status } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
    };

    if (productionJobId) {
      where.productionJobId = productionJobId;
    }

    if (dnId) {
      where.deliveryNoteId = dnId;
    }

    if (status) {
      where.qcStatus = status;
    }

    if (from || to) {
      where.inspectedAt = {};
      if (from) {
        where.inspectedAt.gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.inspectedAt.lte = toDate;
      }
    }

    const qcRecords = await prisma.qCRecord.findMany({
      where,
      include: {
        productionJob: {
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
        deliveryNote: {
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
        inspectedAt: 'desc',
      },
    });

    res.json(qcRecords);
  } catch (error) {
    console.error('Get QC list error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createProductionQC,
  createDNQC,
  getQCById,
  getQCList,
};

