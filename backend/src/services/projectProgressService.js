const prisma = require('../config/prisma');

/**
 * Calculate project progress
 * @param {String} projectId - Project ID
 * @returns {Promise<Object>} Progress summary
 */
const calculateProjectProgress = async (projectId) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        subGroups: true,
        productionJobs: {
          include: {
            productionStageLogs: true,
          },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Calculate sub-group progress
    const subGroupsProgress = (project.subGroups || []).map((sg) => {
      let percentComplete = 0;

      if (sg.plannedQty && sg.plannedQty > 0) {
        // Use actualQty or dispatchedQty, whichever is higher
        const completedQty = Math.max(
          sg.actualQty || 0,
          sg.dispatchedQty || 0
        );
        percentComplete = Math.min((completedQty / sg.plannedQty) * 100, 100);
      } else if (sg.plannedArea && sg.plannedArea > 0) {
        const completedArea = sg.actualArea || 0;
        percentComplete = Math.min((completedArea / sg.plannedArea) * 100, 100);
      }

      // Mark as completed if actualQty >= plannedQty or dispatchedQty >= plannedQty
      const isCompleted =
        sg.completed === true ||
        (sg.plannedQty &&
          sg.plannedQty > 0 &&
          ((sg.actualQty !== null && sg.actualQty !== undefined && sg.actualQty >= sg.plannedQty) ||
            (sg.dispatchedQty !== null && sg.dispatchedQty !== undefined && sg.dispatchedQty >= sg.plannedQty))) ||
        (sg.plannedArea &&
          sg.plannedArea > 0 &&
          sg.actualArea !== null &&
          sg.actualArea !== undefined &&
          sg.actualArea >= sg.plannedArea);

      return {
        id: sg.id,
        name: sg.name || '',
        plannedQty: sg.plannedQty || null,
        actualQty: sg.actualQty || null,
        dispatchedQty: sg.dispatchedQty || 0,
        plannedArea: sg.plannedArea || null,
        actualArea: sg.actualArea || null,
        percentComplete: parseFloat(percentComplete.toFixed(2)),
        completed: isCompleted || false,
      };
    });

    // Calculate overall progress (average of all sub-groups)
    const overallProgress =
      subGroupsProgress.length > 0
        ? subGroupsProgress.reduce((sum, sg) => sum + sg.percentComplete, 0) /
          subGroupsProgress.length
        : 0;

    // Calculate production job statistics
    const productionJobs = project.productionJobs || [];
    const productionStats = {
      running: productionJobs.filter((job) => job.status === 'IN_PROGRESS').length,
      completed: productionJobs.filter((job) => job.status === 'COMPLETED').length,
      pending: productionJobs.filter((job) => job.status === 'NOT_STARTED').length,
    };

    // Calculate material statistics
    // This will be enhanced when material tracking is implemented
    const materialStats = {
      planned: 0, // Sum of plannedMaterial quantities
      consumed: 0, // From material issues
      remaining: 0,
    };

    // Calculate planned materials from sub-groups
    (project.subGroups || []).forEach((sg) => {
      if (sg.plannedMaterial && Array.isArray(sg.plannedMaterial)) {
        sg.plannedMaterial.forEach((material) => {
          if (material && material.qty) {
            materialStats.planned += parseFloat(material.qty) || 0;
          }
        });
      }
    });

    materialStats.remaining = materialStats.planned - materialStats.consumed;

    // Cost statistics
    const costStats = {
      plannedCost: project.plannedCost || 0,
      actualCost: project.actualCost || 0,
    };

    return {
      projectId: project.id,
      progress: {
        overall: parseFloat(overallProgress.toFixed(2)),
        subGroups: subGroupsProgress,
        production: productionStats,
        materials: materialStats,
        cost: costStats,
      },
    };
  } catch (error) {
    console.error('Error calculating project progress:', error);
    throw error;
  }
};

/**
 * Recalculate and update project actual cost
 * @param {String} projectId - Project ID
 * @returns {Promise<Number>} Updated actual cost
 */
const recalculateProjectActualCost = async (projectId) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        purchaseOrders: true,
        subcontractWorkOrders: true,
        // Production jobs with labour costs (Phase 10)
        // Material issues (Phase 9)
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    let totalCost = 0;

    // Add purchase order costs
    project.purchaseOrders.forEach((po) => {
      if (po.totalAmount) {
        totalCost += po.totalAmount;
      }
    });

    // Add subcontractor costs
    project.subcontractWorkOrders.forEach((swo) => {
      if (swo.totalAmount) {
        totalCost += swo.totalAmount;
      }
    });

    // TODO: Add material issue costs (Phase 9)
    // TODO: Add labour costs from production (Phase 10)
    // TODO: Add overheads from finance (Future)

    // Update project actual cost
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        actualCost: parseFloat(totalCost.toFixed(2)),
      },
    });

    return updatedProject.actualCost;
  } catch (error) {
    console.error('Error recalculating project actual cost:', error);
    throw error;
  }
};

/**
 * Check if project can be marked as completed
 * @param {String} projectId - Project ID
 * @returns {Promise<Boolean>} True if project can be completed
 */
const canCompleteProject = async (projectId) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        subGroups: true,
        productionJobs: true,
      },
    });

    if (!project) {
      return false;
    }

    // Check if all sub-groups are completed
    // If no sub-groups exist, project cannot be completed
    if (!project.subGroups || project.subGroups.length === 0) {
      return false;
    }

    const allSubGroupsCompleted = project.subGroups.every((sg) => {
      if (sg.completed === true) {
        return true;
      }

      if (sg.plannedQty && sg.plannedQty > 0) {
        const actualQty = sg.actualQty || 0;
        const dispatchedQty = sg.dispatchedQty || 0;
        return actualQty >= sg.plannedQty || dispatchedQty >= sg.plannedQty;
      }

      if (sg.plannedArea && sg.plannedArea > 0) {
        const actualArea = sg.actualArea || 0;
        return actualArea >= sg.plannedArea;
      }

      return false;
    });

    if (!allSubGroupsCompleted) {
      return false;
    }

    // Check if all production jobs are completed
    // If no production jobs exist, consider them as completed
    const productionJobs = project.productionJobs || [];
    const allJobsCompleted =
      productionJobs.length === 0 ||
      productionJobs.every((job) => job.status === 'COMPLETED');

    // TODO: Check dispatch completion (Phase 8)
    // TODO: Check labour logs closed (Phase 10)

    return allJobsCompleted;
  } catch (error) {
    console.error('Error checking project completion:', error);
    return false;
  }
};

module.exports = {
  calculateProjectProgress,
  recalculateProjectActualCost,
  canCompleteProject,
};

