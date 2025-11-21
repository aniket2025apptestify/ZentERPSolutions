const prisma = require('../config/prisma');
const { generateToken } = require('../utils/jwt');
const { comparePassword, hashPassword } = require('../utils/password');
const { createAuditLog } = require('../services/auditLogService');

/**
 * Login controller
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };
    const token = generateToken(tokenPayload);

    // Create audit log entry
    await createAuditLog({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      newData: { email: user.email, role: user.role },
    });

    // Return token and user info (without password)
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Logout controller
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // In a production system with refresh tokens, you would blacklist the token here
    // For now, we just return success - client should remove token from storage
    
    // Optionally create audit log
    if (req.user) {
      await createAuditLog({
        tenantId: req.user.tenantId,
        userId: req.user.userId,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: req.user.userId,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Register new user (SuperAdmin only)
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { tenantId, name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }

    // Check if tenant exists (if tenantId provided)
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
    }

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        tenantId: tenantId || null,
        name,
        email,
        password: hashedPassword,
        role,
        isActive: true,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId || null,
      userId: req.user?.userId || null,
      action: 'CREATE',
      entityType: 'User',
      entityId: newUser.id,
      newData: { email: newUser.email, role: newUser.role },
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Register error:', error);
    
    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  login,
  getMe,
  logout,
  register,
};

