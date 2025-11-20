const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const { generateJobCardNumber } = require('../services/sequenceService');
const {
  validateStageTransition,
  validateStatusTransition,
  getNextStage,
  getFirstStage,
} = require('../services/productionService');
const { Role } = require('@prisma/client');

/**
 * Create a new production job card
 * POST /api/production/jobs
 */
const createJob = async (req, res) => {
  try {
    const {
      projectId,
      subGroupId,
      plannedQty,
      plannedHours,
      assignedTo,
      plannedMaterial,
      createdBy,
      stage,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate required fields
    if (!projectId || !subGroupId || !plannedQty || !createdBy) {
      return res.status(400).json({
        message: 'projectId, subGroupId, plannedQty, and createdBy are required',
      });
    }

    if (plannedQty <= 0) {
      return res.status(400).json({ message: 'plannedQty must be > 0' });
    }

    // Verify project and subgroup exist and belong to tenant
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId: tenantId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const subGroup = await prisma.subGroup.findFirst({
      where: {
        id: subGroupId,
        projectId: projectId,
      },
    });

    if (!subGroup) {
      return res.status(404).json({ message: 'SubGroup not found' });
    }

    // Get initial stage
    let initialStage = stage;
    if (!initialStage) {
      initialStage = await getFirstStage(tenantId);
      if (!initialStage) {
        return res.status(400).json({
          message: 'Production stages not configured for tenant',
        });
      }
    }

    // Get stage index
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { productionStages: true },
    });

    let stageIndex = null;
    if (tenant && tenant.productionStages) {
      const stages = Array.isArray(tenant.productionStages)
        ? tenant.productionStages
        : JSON.parse(tenant.productionStages);
      stageIndex = stages.indexOf(initialStage);
    }

    // Generate job card number
    const jobCardNumber = await generateJobCardNumber(tenantId);

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create production job
      const job = await tx.productionJob.create({
        data: {
          tenantId,
          projectId,
          subGroupId,
          jobCardNumber,
          stage: initialStage,
          stageIndex,
          status: 'NOT_STARTED',
          plannedQty,
          plannedHours: plannedHours || null,
          actualQty: 0,
          actualHours: 0,
          assignedTo: assignedTo || null,
          createdBy,
          materialConsumption: null,
        },
      });

      // Create initial production stage log
      await tx.productionStageLog.create({
        data: {
          productionJobId: job.id,
          tenantId,
          stage: initialStage,
          startedAt: null,
          completedAt: null,
        },
      });

      // Create audit log
      await createAuditLog({
        tenantId,
        userId: createdBy,
        action: 'PRODUCTION_JOB_CREATE',
        entityType: 'ProductionJob',
        entityId: job.id,
        newData: {
          jobCardNumber: job.jobCardNumber,
          projectId,
          subGroupId,
          stage: initialStage,
          plannedQty,
        },
      });

      return job;
    });

    res.status(201).json({
      id: result.id,
      jobCardNumber: result.jobCardNumber,
      stage: result.stage,
      status: result.status,
      plannedQty: result.plannedQty,
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get production jobs with filters
 * GET /api/production/jobs
 */
const getJobs = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const {
      status,
      stage,
      projectId,
      subGroupId,
      assignedTo,
      date,
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (stage) {
      where.stage = stage;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (subGroupId) {
      where.subGroupId = subGroupId;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (date) {
      const dateObj = new Date(date);
      const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
      const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));
      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const jobs = await prisma.productionJob.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true,
          },
        },
        subGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(jobs);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get production job by ID with details
 * GET /api/production/jobs/:id
 */
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const job = await prisma.productionJob.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        subGroup: {
          select: {
            id: true,
            name: true,
          },
        },
        productionStageLogs: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        materialIssues: {
          orderBy: {
            issuedAt: 'desc',
          },
        },
        qcRecords: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        labourLogs: {
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ message: 'Production job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Get job by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update job status and/or stage
 * PUT /api/production/jobs/:id/status
 */
const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, stage, performedBy, timestamp, outputQty, allowOverride } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!status && !stage) {
      return res.status(400).json({ message: 'status or stage is required' });
    }

    // Get current job
    const job = await prisma.productionJob.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        productionStageLogs: {
          where: {
            stage: stage || undefined,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!job) {
      return res.status(404).json({ message: 'Production job not found' });
    }

    // Validate status transition
    if (status && status !== job.status) {
      const isValidTransition = validateStatusTransition(job.status, status);
      if (!isValidTransition) {
        return res.status(400).json({
          message: `Invalid status transition from ${job.status} to ${status}`,
        });
      }
    }

    // Validate stage transition
    if (stage && stage !== job.stage) {
      const user = req.user;
      const hasOverridePermission =
        allowOverride &&
        (user?.role === Role.DIRECTOR || user?.role === Role.PROJECT_MANAGER);

      const stageValidation = await validateStageTransition(
        tenantId,
        job.stage,
        stage,
        hasOverridePermission
      );

      if (!stageValidation.valid) {
        return res.status(400).json({
          message: stageValidation.message || 'Invalid stage transition',
        });
      }
    }

    const updateTime = timestamp ? new Date(timestamp) : new Date();

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      const updateData = {};

      // Update status
      if (status) {
        updateData.status = status;
      }

      // Update stage
      if (stage) {
        updateData.stage = stage;
        // Get stage index
        const tenant = await tx.tenant.findUnique({
          where: { id: tenantId },
          select: { productionStages: true },
        });
        if (tenant && tenant.productionStages) {
          const stages = Array.isArray(tenant.productionStages)
            ? tenant.productionStages
            : JSON.parse(tenant.productionStages);
          updateData.stageIndex = stages.indexOf(stage);
        }
      }

      // Handle status changes
      if (status === 'IN_PROGRESS') {
        // Find or create stage log for current stage
        const currentStage = stage || job.stage;
        let stageLog = await tx.productionStageLog.findFirst({
          where: {
            productionJobId: id,
            stage: currentStage,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (!stageLog) {
          stageLog = await tx.productionStageLog.create({
            data: {
              productionJobId: id,
              tenantId,
              stage: currentStage,
            },
          });
        }

        // Set startedAt if not already set
        if (!stageLog.startedAt) {
          await tx.productionStageLog.update({
            where: { id: stageLog.id },
            data: { startedAt: updateTime, performedBy: performedBy || null },
          });
        }
      }

      if (status === 'COMPLETED') {
        // Find current stage log
        const currentStage = stage || job.stage;
        let stageLog = await tx.productionStageLog.findFirst({
          where: {
            productionJobId: id,
            stage: currentStage,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (!stageLog) {
          stageLog = await tx.productionStageLog.create({
            data: {
              productionJobId: id,
              tenantId,
              stage: currentStage,
              startedAt: updateTime,
            },
          });
        }

        // Set completedAt and outputQty
        await tx.productionStageLog.update({
          where: { id: stageLog.id },
          data: {
            completedAt: updateTime,
            performedBy: performedBy || null,
            outputQty: outputQty || stageLog.outputQty || null,
          },
        });

        // Check if there's a next stage
        const nextStage = await getNextStage(tenantId, currentStage);
        if (nextStage) {
          // Create next stage log and set status to NOT_STARTED
          await tx.productionStageLog.create({
            data: {
              productionJobId: id,
              tenantId,
              stage: nextStage,
            },
          });
          updateData.stage = nextStage;
          updateData.status = 'NOT_STARTED';
          // Get next stage index
          const tenant = await tx.tenant.findUnique({
            where: { id: tenantId },
            select: { productionStages: true },
          });
          if (tenant && tenant.productionStages) {
            const stages = Array.isArray(tenant.productionStages)
              ? tenant.productionStages
              : JSON.parse(tenant.productionStages);
            updateData.stageIndex = stages.indexOf(nextStage);
          }
        }
      }

      // Update job
      const updatedJob = await tx.productionJob.update({
        where: { id },
        data: updateData,
      });

      // Create audit log
      await createAuditLog({
        tenantId,
        userId: performedBy || req.user?.userId || null,
        action: 'PRODUCTION_STATUS_CHANGE',
        entityType: 'ProductionJob',
        entityId: id,
        oldData: {
          status: job.status,
          stage: job.stage,
        },
        newData: {
          status: updatedJob.status,
          stage: updatedJob.stage,
        },
      });

      return updatedJob;
    });

    res.json(result);
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Log hours and output for a job
 * POST /api/production/jobs/:id/log
 */
const logJobHours = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, hours, outputQty, notes, photos, stage, date } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!hours || hours <= 0) {
      return res.status(400).json({ message: 'hours must be > 0' });
    }

    if (outputQty !== undefined && outputQty < 0) {
      return res.status(400).json({ message: 'outputQty must be >= 0' });
    }

    // Get job
    const job = await prisma.productionJob.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!job) {
      return res.status(404).json({ message: 'Production job not found' });
    }

    const logDate = date ? new Date(date) : new Date();
    const currentStage = stage || job.stage;

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Find or create stage log
      let stageLog = await tx.productionStageLog.findFirst({
        where: {
          productionJobId: id,
          stage: currentStage,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!stageLog) {
        stageLog = await tx.productionStageLog.create({
          data: {
            productionJobId: id,
            tenantId,
            stage: currentStage,
            startedAt: logDate,
          },
        });
      }

      // Update stage log with hours and output
      const existingPhotos = stageLog.photos ? (Array.isArray(stageLog.photos) ? stageLog.photos : JSON.parse(stageLog.photos)) : [];
      const newPhotos = photos ? (Array.isArray(photos) ? photos : [photos]) : [];
      const allPhotos = [...existingPhotos, ...newPhotos];

      await tx.productionStageLog.update({
        where: { id: stageLog.id },
        data: {
          hoursLogged: (stageLog.hoursLogged || 0) + hours,
          outputQty: outputQty !== undefined ? (stageLog.outputQty || 0) + outputQty : stageLog.outputQty,
          notes: notes ? (stageLog.notes ? `${stageLog.notes}\n${notes}` : notes) : stageLog.notes,
          photos: allPhotos.length > 0 ? allPhotos : null,
          performedBy: userId || stageLog.performedBy || null,
        },
      });

      // Update job actual hours and quantity
      await tx.productionJob.update({
        where: { id },
        data: {
          actualHours: (job.actualHours || 0) + hours,
          actualQty: outputQty !== undefined ? (job.actualQty || 0) + outputQty : job.actualQty,
        },
      });

      // Create audit log
      await createAuditLog({
        tenantId,
        userId: userId || req.user?.userId || null,
        action: 'PRODUCTION_LOG_CREATE',
        entityType: 'ProductionJob',
        entityId: id,
        newData: {
          hours,
          outputQty,
          stage: currentStage,
        },
      });

      // Get updated job
      return await tx.productionJob.findUnique({
        where: { id },
      });
    });

    res.json({
      success: true,
      productionJobId: id,
      updatedActualHours: result.actualHours,
      updatedActualQty: result.actualQty,
    });
  } catch (error) {
    console.error('Log job hours error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create QC record for a job
 * POST /api/production/jobs/:id/qc
 */
const createQCRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { inspectorId, stage, qcStatus, defects, remarks } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!inspectorId || !stage || !qcStatus) {
      return res.status(400).json({
        message: 'inspectorId, stage, and qcStatus are required',
      });
    }

    if (!['PASS', 'FAIL'].includes(qcStatus)) {
      return res.status(400).json({ message: 'qcStatus must be PASS or FAIL' });
    }

    // Get job
    const job = await prisma.productionJob.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!job) {
      return res.status(404).json({ message: 'Production job not found' });
    }

    // Use transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Create QC record
      // Note: Prisma generates QCRecord model as qCRecord in the client
      await tx.qCRecord.create({
        data: {
          productionJobId: id,
          inspectorId,
          tenantId,
          stage,
          qcStatus,
          defects: defects || null,
          remarks: remarks || null,
        },
      });

      // Update stage log QC status
      const stageLog = await tx.productionStageLog.findFirst({
        where: {
          productionJobId: id,
          stage: stage,
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

      // If QC fails, set job status to REWORK
      if (qcStatus === 'FAIL') {
        await tx.productionJob.update({
          where: { id },
          data: { status: 'REWORK' },
        });

        // Create audit log for rework
        await createAuditLog({
          tenantId,
          userId: inspectorId,
          action: 'REWORK_JOB_CREATE',
          entityType: 'ProductionJob',
          entityId: id,
          newData: {
            reason: 'QC_FAIL',
            stage,
            remarks,
          },
        });
      }

      // Create audit log for QC record
      await createAuditLog({
        tenantId,
        userId: inspectorId,
        action: 'QC_RECORD_CREATE',
        entityType: 'ProductionJob',
        entityId: id,
        newData: {
          stage,
          qcStatus,
          defects,
        },
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Create QC record error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Assign job to user/team
 * POST /api/production/jobs/:id/assign
 */
const assignJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, assignedBy } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!assignedTo) {
      return res.status(400).json({ message: 'assignedTo is required' });
    }

    // Verify user exists and belongs to tenant
    const user = await prisma.user.findFirst({
      where: {
        id: assignedTo,
        tenantId: tenantId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found or not in tenant' });
    }

    // Check if user has PRODUCTION role or allowed roles
    const allowedRoles = [Role.PRODUCTION, Role.PROJECT_MANAGER, Role.DIRECTOR];
    if (!allowedRoles.includes(user.role)) {
      return res.status(400).json({
        message: 'User must have PRODUCTION, PROJECT_MANAGER, or DIRECTOR role',
      });
    }

    // Get job
    const job = await prisma.productionJob.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!job) {
      return res.status(404).json({ message: 'Production job not found' });
    }

    const oldAssignedTo = job.assignedTo;

    // Update job
    const updatedJob = await prisma.productionJob.update({
      where: { id },
      data: { assignedTo },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: assignedBy || req.user?.userId || null,
      action: 'PRODUCTION_JOB_ASSIGN',
      entityType: 'ProductionJob',
      entityId: id,
      oldData: { assignedTo: oldAssignedTo },
      newData: { assignedTo },
    });

    res.json(updatedJob);
  } catch (error) {
    console.error('Assign job error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Attach photos to job/stage
 * POST /api/production/jobs/:id/attach-photos
 */
const attachPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const { docIds, stage, type } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!docIds || !Array.isArray(docIds) || docIds.length === 0) {
      return res.status(400).json({ message: 'docIds array is required' });
    }

    // Get job
    const job = await prisma.productionJob.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!job) {
      return res.status(404).json({ message: 'Production job not found' });
    }

    const currentStage = stage || job.stage;

    // Find or create stage log
    let stageLog = await prisma.productionStageLog.findFirst({
      where: {
        productionJobId: id,
        stage: currentStage,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!stageLog) {
      stageLog = await prisma.productionStageLog.create({
        data: {
          productionJobId: id,
          tenantId,
          stage: currentStage,
        },
      });
    }

    // Update photos
    const existingPhotos = stageLog.photos
      ? Array.isArray(stageLog.photos)
        ? stageLog.photos
        : JSON.parse(stageLog.photos)
      : [];
    const allPhotos = [...existingPhotos, ...docIds];

    await prisma.productionStageLog.update({
      where: { id: stageLog.id },
      data: { photos: allPhotos },
    });

    res.json({ success: true, stageLogId: stageLog.id });
  } catch (error) {
    console.error('Attach photos error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJobStatus,
  logJobHours,
  createQCRecord,
  assignJob,
  attachPhotos,
};

