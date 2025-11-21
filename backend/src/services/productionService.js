const prisma = require('../config/prisma');

/**
 * Validate stage transition according to tenant production stages order
 * @param {String} tenantId - Tenant ID
 * @param {String} currentStage - Current stage name
 * @param {String} newStage - New stage name
 * @param {Boolean} allowOverride - Whether override is allowed (for managers)
 * @returns {Promise<{valid: Boolean, message?: String}>}
 */
const validateStageTransition = async (tenantId, currentStage, newStage, allowOverride = false) => {
  try {
    // If override is allowed, skip validation
    if (allowOverride) {
      return { valid: true };
    }

    // Get tenant production stages
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { productionStages: true },
    });

    if (!tenant || !tenant.productionStages) {
      return { valid: false, message: 'Production stages not configured for tenant' };
    }

    const stages = Array.isArray(tenant.productionStages) 
      ? tenant.productionStages 
      : JSON.parse(tenant.productionStages);

    if (!Array.isArray(stages) || stages.length === 0) {
      return { valid: false, message: 'Production stages not configured' };
    }

    const currentIndex = stages.indexOf(currentStage);
    const newIndex = stages.indexOf(newStage);

    // If stages not found in list, allow (might be custom stages)
    if (currentIndex === -1 || newIndex === -1) {
      return { valid: true };
    }

    // Allow moving to next stage or staying in same stage
    if (newIndex >= currentIndex) {
      return { valid: true };
    }

    // Moving backwards requires override
    return { valid: false, message: 'Cannot move to previous stage without override' };
  } catch (error) {
    console.error('Error validating stage transition:', error);
    return { valid: false, message: 'Error validating stage transition' };
  }
};

/**
 * Validate status transition
 * @param {String} currentStatus - Current status
 * @param {String} newStatus - New status
 * @returns {Boolean}
 */
const validateStatusTransition = (currentStatus, newStatus) => {
  const allowedTransitions = {
    NOT_STARTED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'REWORK', 'CANCELLED'],
    COMPLETED: ['IN_PROGRESS'], // Re-opening
    REWORK: ['IN_PROGRESS', 'CANCELLED'],
    CANCELLED: [], // Cannot transition from CANCELLED
  };

  const allowed = allowedTransitions[currentStatus] || [];
  return allowed.includes(newStatus);
};

/**
 * Get next stage from tenant production stages
 * @param {String} tenantId - Tenant ID
 * @param {String} currentStage - Current stage name
 * @returns {Promise<String|null>}
 */
const getNextStage = async (tenantId, currentStage) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { productionStages: true },
    });

    if (!tenant || !tenant.productionStages) {
      return null;
    }

    const stages = Array.isArray(tenant.productionStages) 
      ? tenant.productionStages 
      : JSON.parse(tenant.productionStages);

    if (!Array.isArray(stages) || stages.length === 0) {
      return null;
    }

    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex === stages.length - 1) {
      return null;
    }

    return stages[currentIndex + 1];
  } catch (error) {
    console.error('Error getting next stage:', error);
    return null;
  }
};

/**
 * Get first stage from tenant production stages
 * @param {String} tenantId - Tenant ID
 * @returns {Promise<String|null>}
 */
const getFirstStage = async (tenantId) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { productionStages: true },
    });

    if (!tenant || !tenant.productionStages) {
      return null;
    }

    const stages = Array.isArray(tenant.productionStages) 
      ? tenant.productionStages 
      : JSON.parse(tenant.productionStages);

    if (!Array.isArray(stages) || stages.length === 0) {
      return null;
    }

    return stages[0];
  } catch (error) {
    console.error('Error getting first stage:', error);
    return null;
  }
};

module.exports = {
  validateStageTransition,
  validateStatusTransition,
  getNextStage,
  getFirstStage,
};

