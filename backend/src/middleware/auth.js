const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');

/**
 * Authentication middleware
 * Verifies JWT token and sets req.user with userId, tenantId, and role
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = verifyToken(token);

    // Set user info in request object
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: error.message || 'Invalid or expired token' });
  }
};

/**
 * Optional authentication middleware
 * Sets req.user if token is present, but doesn't fail if missing
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        role: decoded.role,
        email: decoded.email,
      };
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  
  next();
};

/**
 * Role-based authorization middleware
 * @param {Array<String>} allowedRoles - Array of allowed roles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
};

