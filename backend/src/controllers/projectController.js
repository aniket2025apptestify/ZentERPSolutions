const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const { generateProjectCode } = require('../services/sequenceService');
const {
  calculateProjectProgress,
  recalculateProjectActualCost,
  canCompleteProject,
} = require('../services/projectProgressService');

// Status transition validation
const ALLOWED_STATUS_TRANSITIONS = {
  PLANNED: ['RUNNING'],
  RUNNING: ['HOLD', 'COMPLETED'],
  HOLD: ['RUNNING'],
  COMPLETED: [], // Cannot transition from COMPLETED
};

/**
 * Validate status transition
 */
const validateStatusTransition = (currentStatus, newStatus) => {
  // Allow transition to COMPLETED from RUNNING (checked separately)
  if (newStatus === 'COMPLETED' && currentStatus === 'RUNNING') {
    return true;
  }

  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};

/**
 * Create a new project
 * POST /api/projects
 */
const createProject = async (req, res) => {
  try {
    const {
      name,
      clientId,
      type,
      startDate,
      plannedCost,
      notes,
      subGroups = [],
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate required fields
    if (!name || !clientId || !type) {
      return res
        .status(400)
        .json({ message: 'Name, clientId, and type are required' });
    }

    // Validate type
    if (type !== 'INTERNAL' && type !== 'EXTERNAL') {
      return res.status(400).json({ message: 'Type must be INTERNAL or EXTERNAL' });
    }

    // Validate plannedCost
    if (plannedCost !== undefined && plannedCost < 0) {
      return res.status(400).json({ message: 'Planned cost must be >= 0' });
    }

    // Validate subGroups
    if (!subGroups || subGroups.length === 0) {
      return res.status(400).json({ message: 'At least one sub-group is required' });
    }

    for (const sg of subGroups) {
      if (!sg.name) {
        return res.status(400).json({ message: 'Sub-group name is required' });
      }
      if (!sg.plannedQty && !sg.plannedArea) {
        return res
          .status(400)
          .json({ message: 'Sub-group must have plannedQty or plannedArea' });
      }
      if (sg.plannedQty && sg.plannedQty <= 0) {
        return res.status(400).json({ message: 'Planned quantity must be > 0' });
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

    // Generate project code
    const projectCode = await generateProjectCode(tenantId);

    // Create project with sub-groups
    const project = await prisma.project.create({
      data: {
        tenantId: tenantId,
        projectCode: projectCode,
        name: name,
        clientId: clientId,
        type: type,
        startDate: startDate ? new Date(startDate) : null,
        status: 'PLANNED',
        plannedCost: plannedCost || null,
        notes: notes || null,
        subGroups: {
          create: subGroups.map((sg) => ({
            name: sg.name,
            plannedQty: sg.plannedQty || null,
            plannedArea: sg.plannedArea || null,
            plannedMaterial: sg.plannedMaterial || null,
            plannedLabour: sg.plannedLabour || null,
          })),
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        subGroups: true,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'PROJECT_CREATE',
      entityType: 'Project',
      entityId: project.id,
      newData: {
        projectCode: project.projectCode,
        name: project.name,
        clientId: project.clientId,
        type: project.type,
        status: project.status,
      },
    });

    res.status(201).json({
      project: {
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        status: project.status,
        client: project.client,
      },
      subGroups: project.subGroups.map((sg) => ({
        id: sg.id,
        name: sg.name,
      })),
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all projects with filters
 * GET /api/projects
 */
const getProjects = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status, clientId, from, to, search } = req.query;

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
        { projectCode: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
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

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        subGroups: {
          select: {
            id: true,
            plannedQty: true,
            actualQty: true,
            dispatchedQty: true,
            completed: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate progress for each project
    const projectsWithProgress = await Promise.all(
      projects.map(async (project) => {
        const progress = await calculateProjectProgress(project.id);
        return {
          id: project.id,
          projectCode: project.projectCode,
          name: project.name,
          clientName: project.client.name || project.client.companyName,
          status: project.status,
          plannedCost: project.plannedCost,
          actualCost: project.actualCost,
          startDate: project.startDate,
          progress: progress.progress.overall,
        };
      })
    );

    res.json(projectsWithProgress);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get single project by ID
 * GET /api/projects/:id
 */
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const project = await prisma.project.findFirst({
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
          },
        },
        quotation: {
          select: {
            id: true,
            quotationNumber: true,
            totalAmount: true,
          },
        },
        subGroups: true,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update project
 * PUT /api/projects/:id
 */
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status, notes, endDate, plannedCost } = req.body;
    const tenantId = req.tenantId;

    // Check if project exists
    const existingProject = await prisma.project.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
    });

    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Validate status transition if status is being changed
    if (status && status !== existingProject.status) {
      if (status === 'COMPLETED') {
        // Check if project can be completed
        const canComplete = await canCompleteProject(id);
        if (!canComplete) {
          return res.status(400).json({
            message:
              'Project cannot be completed. All sub-groups and production jobs must be completed.',
          });
        }
      } else if (!validateStatusTransition(existingProject.status, status)) {
        return res.status(400).json({
          message: `Invalid status transition from ${existingProject.status} to ${status}`,
        });
      }
    }

    // Store old data for audit
    const oldData = {
      name: existingProject.name,
      status: existingProject.status,
      notes: existingProject.notes,
      endDate: existingProject.endDate,
      plannedCost: existingProject.plannedCost,
    };

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null;
    }
    if (plannedCost !== undefined) {
      if (plannedCost < 0) {
        return res.status(400).json({ message: 'Planned cost must be >= 0' });
      }
      updateData.plannedCost = plannedCost;
    }

    // If status is COMPLETED, set endDate if not provided
    if (status === 'COMPLETED' && !endDate) {
      updateData.endDate = new Date();
    }

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        subGroups: true,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'PROJECT_UPDATE',
      entityType: 'Project',
      entityId: id,
      oldData: oldData,
      newData: updateData,
    });

    res.json(updatedProject);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete project (soft delete - set status to deleted or remove)
 * DELETE /api/projects/:id
 */
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // Check if project exists
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if project can be deleted (not COMPLETED or has active jobs)
    if (project.status === 'COMPLETED') {
      return res.status(400).json({
        message: 'Cannot delete completed project',
      });
    }

    // Hard delete (cascade will handle sub-groups)
    await prisma.project.delete({
      where: { id },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'PROJECT_DELETE',
      entityType: 'Project',
      entityId: id,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Add sub-group to project
 * POST /api/projects/:id/subgroups
 */
const addSubGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, plannedQty, plannedArea, plannedMaterial, plannedLabour } = req.body;
    const tenantId = req.tenantId;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Sub-group name is required' });
    }

    if (!plannedQty && !plannedArea) {
      return res
        .status(400)
        .json({ message: 'Sub-group must have plannedQty or plannedArea' });
    }

    if (plannedQty && plannedQty <= 0) {
      return res.status(400).json({ message: 'Planned quantity must be > 0' });
    }

    // Check if project exists
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Create sub-group
    const subGroup = await prisma.subGroup.create({
      data: {
        projectId: id,
        name: name,
        plannedQty: plannedQty || null,
        plannedArea: plannedArea || null,
        plannedMaterial: plannedMaterial || null,
        plannedLabour: plannedLabour || null,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'SUBGROUP_CREATE',
      entityType: 'SubGroup',
      entityId: subGroup.id,
      newData: {
        projectId: id,
        name: subGroup.name,
      },
    });

    res.status(201).json({
      id: subGroup.id,
      name: subGroup.name,
    });
  } catch (error) {
    console.error('Add sub-group error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get project progress
 * GET /api/projects/:id/progress
 */
const getProjectProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // Check if project exists
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Calculate progress
    const progress = await calculateProjectProgress(id);

    res.json(progress);
  } catch (error) {
    console.error('Get project progress error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Mark project as completed
 * POST /api/projects/:id/complete
 */
const completeProject = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // Check if project exists
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if project can be completed
    const canComplete = await canCompleteProject(id);
    if (!canComplete) {
      return res.status(400).json({
        message:
          'Project cannot be completed. All sub-groups and production jobs must be completed.',
      });
    }

    // Update project status
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endDate: new Date(),
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'PROJECT_COMPLETE',
      entityType: 'Project',
      entityId: id,
      newData: {
        status: 'COMPLETED',
        endDate: updatedProject.endDate,
      },
    });

    res.json({ success: true, project: updatedProject });
  } catch (error) {
    console.error('Complete project error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addSubGroup,
  getProjectProgress,
  completeProject,
};

