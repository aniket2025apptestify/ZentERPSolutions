const prisma = require('../config/prisma');

/**
 * Create a notification
 * @param {Object} data - Notification data
 * @param {String} data.tenantId - Tenant ID
 * @param {String} data.userId - User ID (optional, for user-specific notifications)
 * @param {String} data.type - Notification type (QC_FAIL, RETURN_CREATED, etc.)
 * @param {String} data.title - Notification title
 * @param {String} data.message - Notification message
 * @param {String} data.link - Link to related entity (optional)
 * @param {Object} data.metadata - Additional metadata (optional)
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async (data) => {
  try {
    return await prisma.notification.create({
      data: {
        tenantId: data.tenantId || null,
        userId: data.userId || null,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
        metadata: data.metadata || null,
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Create notifications for multiple users
 * @param {Array<String>} userIds - Array of user IDs
 * @param {Object} notificationData - Notification data (without userId)
 * @returns {Promise<Array>} Created notifications
 */
const createNotificationsForUsers = async (userIds, notificationData) => {
  try {
    const notifications = userIds.map((userId) => ({
      tenantId: notificationData.tenantId || null,
      userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      link: notificationData.link || null,
      metadata: notificationData.metadata || null,
    }));

    return await prisma.notification.createMany({
      data: notifications,
    });
  } catch (error) {
    console.error('Error creating notifications for users:', error);
    return null;
  }
};

/**
 * Get users by role for notifications
 * @param {String} tenantId - Tenant ID
 * @param {Array<String>} roles - Array of roles
 * @returns {Promise<Array>} Array of user IDs
 */
const getUsersByRoles = async (tenantId, roles) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        tenantId,
        role: {
          in: roles,
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    return users.map((u) => u.id);
  } catch (error) {
    console.error('Error getting users by roles:', error);
    return [];
  }
};

/**
 * Notify on QC FAIL
 * @param {String} tenantId - Tenant ID
 * @param {String} productionJobId - Production job ID
 * @param {String} stage - Stage name
 * @param {Object} qcRecord - QC record data
 */
const notifyQCFail = async (tenantId, productionJobId, stage, qcRecord) => {
  try {
    // Get users to notify: Production Supervisor, Project Manager, QC Manager
    const roles = ['PRODUCTION', 'PROJECT_MANAGER', 'QC', 'DIRECTOR'];
    const userIds = await getUsersByRoles(tenantId, roles);

    if (userIds.length > 0) {
      await createNotificationsForUsers(userIds, {
        tenantId,
        type: 'QC_FAIL',
        title: 'QC Inspection Failed',
        message: `QC inspection failed for production job at stage: ${stage}`,
        link: `/production/jobs/${productionJobId}`,
        metadata: {
          productionJobId,
          stage,
          qcRecordId: qcRecord.id,
        },
      });
    }
  } catch (error) {
    console.error('Error notifying QC fail:', error);
  }
};

/**
 * Notify on Return created
 * @param {String} tenantId - Tenant ID
 * @param {String} returnRecordId - Return record ID
 * @param {String} dnId - Delivery note ID
 */
const notifyReturnCreated = async (tenantId, returnRecordId, dnId) => {
  try {
    const roles = ['DISPATCH', 'FINANCE', 'PROJECT_MANAGER', 'DIRECTOR'];
    const userIds = await getUsersByRoles(tenantId, roles);

    if (userIds.length > 0) {
      await createNotificationsForUsers(userIds, {
        tenantId,
        type: 'RETURN_CREATED',
        title: 'New Return Record Created',
        message: `A return record has been created for delivery note`,
        link: `/returns/${returnRecordId}`,
        metadata: {
          returnRecordId,
          dnId,
        },
      });
    }
  } catch (error) {
    console.error('Error notifying return created:', error);
  }
};

/**
 * Notify on Rework created
 * @param {String} tenantId - Tenant ID
 * @param {String} reworkJobId - Rework job ID
 * @param {String} assignedTo - Assigned user ID (optional)
 */
const notifyReworkCreated = async (tenantId, reworkJobId, assignedTo) => {
  try {
    const userIds = [];

    // Notify assigned user if provided
    if (assignedTo) {
      userIds.push(assignedTo);
    }

    // Also notify production supervisors
    const roles = ['PRODUCTION', 'PROJECT_MANAGER'];
    const roleUserIds = await getUsersByRoles(tenantId, roles);
    userIds.push(...roleUserIds);

    // Remove duplicates
    const uniqueUserIds = [...new Set(userIds)];

    if (uniqueUserIds.length > 0) {
      await createNotificationsForUsers(uniqueUserIds, {
        tenantId,
        type: 'REWORK_CREATED',
        title: 'New Rework Job Created',
        message: `A new rework job has been created and assigned`,
        link: `/rework/${reworkJobId}`,
        metadata: {
          reworkJobId,
          assignedTo,
        },
      });
    }
  } catch (error) {
    console.error('Error notifying rework created:', error);
  }
};

module.exports = {
  createNotification,
  createNotificationsForUsers,
  getUsersByRoles,
  notifyQCFail,
  notifyReturnCreated,
  notifyReworkCreated,
};

