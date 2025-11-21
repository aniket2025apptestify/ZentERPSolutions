const prisma = require('../config/prisma');
const { hashPassword, comparePassword } = require('../utils/password');
const { createAuditLog } = require('../services/auditLogService');
const { Role } = require('@prisma/client');

/**
 * Get all users for the tenant
 * GET /api/users
 */
const getUsers = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const users = await prisma.user.findMany({
      where: {
        tenantId: tenantId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get single user by ID
 * GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const user = await prisma.user.findFirst({
      where: {
        id: id,
        tenantId: tenantId, // Ensure user belongs to the same tenant
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create a new user
 * POST /api/users
 */
const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: 'Name, email, password, and role are required',
      });
    }

    // Validate role
    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
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
        tenantId: tenantId,
        name,
        email,
        password: hashedPassword,
        role,
        isActive: true,
      },
      select: {
        id: true,
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
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'CREATE',
      entityType: 'User',
      entityId: newUser.id,
      newData: { email: newUser.email, role: newUser.role },
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    
    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update user
 * PUT /api/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;
    const tenantId = req.tenantId;

    // Check if user exists and belongs to the tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate role if provided
    if (role && !Object.values(Role).includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
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
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      oldData: {
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        isActive: existingUser.isActive,
      },
      newData: updateData,
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete user
 * DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // Check if user exists and belongs to the tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting yourself
    if (id === req.user.userId) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'DELETE',
      entityType: 'User',
      entityId: id,
      oldData: {
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
      },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Reset user password
 * POST /api/users/:id/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const tenantId = req.tenantId;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user exists and belongs to the tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'RESET_PASSWORD',
      entityType: 'User',
      entityId: id,
      newData: { email: existingUser.email },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
};

