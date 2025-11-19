const prisma = require('../config/prisma');

/**
 * Create an audit log entry
 * @param {Object} data - Audit log data
 * @param {String} data.tenantId - Tenant ID (optional)
 * @param {String} data.userId - User ID (optional)
 * @param {String} data.action - Action performed
 * @param {String} data.entityType - Entity type
 * @param {String} data.entityId - Entity ID
 * @param {Object} data.oldData - Old data (optional)
 * @param {Object} data.newData - New data (optional)
 * @returns {Promise<Object>} Created audit log
 */
const createAuditLog = async (data) => {
  try {
    return await prisma.auditLog.create({
      data: {
        tenantId: data.tenantId || null,
        userId: data.userId || null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldData: data.oldData || null,
        newData: data.newData || null,
      },
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error - audit logging should not break the main flow
    return null;
  }
};

module.exports = {
  createAuditLog,
};

