/**
 * Permission middleware factory
 * Creates middleware that checks if user has one of the allowed roles
 * @param {...String} allowedRoles - Roles that are allowed to access the route
 */
const permit = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions. Required roles: ' + allowedRoles.join(', ') 
      });
    }

    next();
  };
};

module.exports = {
  permit,
};

