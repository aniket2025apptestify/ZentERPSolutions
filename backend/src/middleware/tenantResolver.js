/**
 * Tenant resolver middleware
 * Sets req.tenantId from user's tenantId or x-tenant-id header
 * This MUST run AFTER authentication middleware so req.user is available
 */
const resolveTenant = (req, res, next) => {
  // Priority: user.tenantId > x-tenant-id header
  if (req.user && req.user.tenantId) {
    req.tenantId = req.user.tenantId;
  } else if (req.headers['x-tenant-id']) {
    req.tenantId = req.headers['x-tenant-id'];
  } else {
    // If no tenantId found and user exists, tenantId might be null (e.g., SuperAdmin)
    req.tenantId = req.user?.tenantId || null;
  }

  next();
};

module.exports = {
  resolveTenant,
};

