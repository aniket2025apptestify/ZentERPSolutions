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
    const subGroupsProgress = project.subGroups.map((sg) => {
      let percentComplete = 0;

      if (sg.plannedQty && sg.plannedQty > 0) {
        // Use actualQty or dispatchedQty, whichever is higher
        const completedQty = Math.max(sg.actualQty || 0, sg.dispatchedQty || 0);
        percentComplete = (completedQty / sg.plannedQty) * 100;
      } else if (sg.plannedArea && sg.plannedArea > 0) {
        const completedArea = sg.actualArea || 0;
        percentComplete = (completedArea / sg.plannedArea) * 100;
      }

      // Mark as completed if actualQty >= plannedQty or dispatchedQty >= plannedQty
      const isCompleted =
        (sg.plannedQty && (sg.actualQty >= sg.plannedQty || sg.dispatchedQty >= sg.plannedQty)) ||
        (sg.plannedArea && sg.actualArea >= sg.plannedArea) ||
        sg.completed;

      return {
        id: sg.id,
        name: sg.name,
        plannedQty: sg.plannedQty,
        actualQty: sg.actualQty,
        dispatchedQty: sg.dispatchedQty,
        plannedArea: sg.plannedArea,
        actualArea: sg.actualArea,
        percentComplete: parseFloat(percentComplete.toFixed(2)),
        completed: isCompleted,
      };
    });

    // Calculate overall progress (average of all sub-groups)
    const overallProgress =
      subGroupsProgress.length > 0
        ? subGroupsProgress.reduce((sum, sg) => sum + sg.percentComplete, 0) /
          subGroupsProgress.length
        : 0;

    // Calculate production job statistics
    const productionStats = {
      running: project.productionJobs.filter((job) => job.status === 'IN_PROGRESS').length,
      completed: project.productionJobs.filter((job) => job.status === 'COMPLETED').length,
      pending: project.productionJobs.filter((job) => job.status === 'NOT_STARTED').length,
    };

    // Calculate material statistics
    // This will be enhanced when material tracking is implemented
    const materialStats = {
      planned: 0, // Sum of plannedMaterial quantities
      consumed: 0, // From material issues
      remaining: 0,
    };

    // Calculate planned materials from sub-groups
    project.subGroups.forEach((sg) => {
      if (sg.plannedMaterial && Array.isArray(sg.plannedMaterial)) {
        sg.plannedMaterial.forEach((material) => {
          if (material.qty) {
            materialStats.planned += material.qty;
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
    const allSubGroupsCompleted = project.subGroups.every((sg) => {
      return (
        sg.completed ||
        (sg.plannedQty && (sg.actualQty >= sg.plannedQty || sg.dispatchedQty >= sg.plannedQty)) ||
        (sg.plannedArea && sg.actualArea >= sg.plannedArea)
      );
    });

    if (!allSubGroupsCompleted) {
      return false;
    }

    // Check if all production jobs are completed
    const allJobsCompleted = project.productionJobs.every(
      (job) => job.status === 'COMPLETED'
    );

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

