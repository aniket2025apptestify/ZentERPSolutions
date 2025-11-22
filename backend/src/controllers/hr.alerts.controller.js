const { getExpiringDocuments } = require('../services/hr.alerts');

/**
 * Get expiring documents (visa/passport) alerts
 * GET /api/hr/alerts/expiring-docs?days=30
 */
const getExpiringDocs = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const days = parseInt(req.query.days) || 30;

    const expiringDocs = await getExpiringDocuments(tenantId, days);

    res.json(expiringDocs);
  } catch (error) {
    console.error('Get expiring docs error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  getExpiringDocs,
};

