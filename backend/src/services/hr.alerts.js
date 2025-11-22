const prisma = require('../config/prisma');

/**
 * Get employees with expiring documents (visa/passport)
 * @param {String} tenantId - Tenant ID
 * @param {Number} days - Number of days to check ahead (default 30)
 * @returns {Promise<Array>} List of employees with expiring documents
 */
const getExpiringDocuments = async (tenantId, days = 30) => {
  try {
    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(today.getDate() + days);

    const employees = await prisma.employee.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          {
            visaExpiry: {
              gte: today,
              lte: expiryDate,
            },
          },
          {
            passportExpiry: {
              gte: today,
              lte: expiryDate,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        email: true,
        phone: true,
        designation: true,
        visaExpiry: true,
        passportExpiry: true,
      },
    });

    // Enrich with expiry information
    const enriched = employees.map((employee) => {
      const alerts = [];
      const now = new Date();

      if (employee.visaExpiry) {
        const daysUntilExpiry = Math.ceil(
          (new Date(employee.visaExpiry) - now) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry >= 0 && daysUntilExpiry <= days) {
          alerts.push({
            type: 'VISA',
            expiryDate: employee.visaExpiry,
            daysUntilExpiry,
            isExpired: daysUntilExpiry < 0,
          });
        }
      }

      if (employee.passportExpiry) {
        const daysUntilExpiry = Math.ceil(
          (new Date(employee.passportExpiry) - now) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry >= 0 && daysUntilExpiry <= days) {
          alerts.push({
            type: 'PASSPORT',
            expiryDate: employee.passportExpiry,
            daysUntilExpiry,
            isExpired: daysUntilExpiry < 0,
          });
        }
      }

      return {
        ...employee,
        alerts,
      };
    });

    // Filter to only those with alerts
    return enriched.filter((emp) => emp.alerts.length > 0);
  } catch (error) {
    console.error('Error getting expiring documents:', error);
    throw error;
  }
};

/**
 * Send expiry notifications (placeholder for email/notification service)
 * @param {String} tenantId - Tenant ID
 * @param {Number} days - Number of days to check ahead
 */
const sendExpiryNotifications = async (tenantId, days = 30) => {
  try {
    const expiringDocs = await getExpiringDocuments(tenantId, days);

    // TODO: Integrate with notification/email service
    // For now, just log
    console.log(`Found ${expiringDocs.length} employees with expiring documents`);

    // Create notifications in the database
    for (const employee of expiringDocs) {
      for (const alert of employee.alerts) {
        await prisma.notification.create({
          data: {
            tenantId,
            userId: null, // System notification
            type: 'DOCUMENT_EXPIRY',
            title: `${alert.type} Expiring`,
            message: `${employee.name}'s ${alert.type} expires in ${alert.daysUntilExpiry} days`,
            read: false,
            link: `/hr/employees/${employee.id}`,
            metadata: {
              employeeId: employee.id,
              documentType: alert.type,
              expiryDate: alert.expiryDate,
              daysUntilExpiry: alert.daysUntilExpiry,
            },
          },
        });
      }
    }

    return expiringDocs;
  } catch (error) {
    console.error('Error sending expiry notifications:', error);
    throw error;
  }
};

module.exports = {
  getExpiringDocuments,
  sendExpiryNotifications,
};

