/**
 * Tenant resolver middleware
 * Sets req.tenantId from user's tenantId or x-tenant-id header
 */
const resolveTenant = (req, res, next) => {
  // Priority: user.tenantId > x-tenant-id header
  if (req.user && req.user.tenantId) {
    req.tenantId = req.user.tenantId;
  } else if (req.headers['x-tenant-id']) {
    req.tenantId = req.headers['x-tenant-id'];
  } else {
    req.tenantId = null;
  }

  next();
};

module.exports = {
  resolveTenant,
};

