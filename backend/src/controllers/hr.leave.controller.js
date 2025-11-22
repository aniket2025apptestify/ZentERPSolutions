const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');

/**
 * Create leave request
 * POST /api/hr/leave
 */
const applyLeave = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const {
      employeeId,
      fromDate,
      toDate,
      leaveType,
      reason,
    } = req.body;

    // Validate required fields
    if (!employeeId || !fromDate || !toDate || !leaveType) {
      return res.status(400).json({
        message: 'Employee ID, from date, to date, and leave type are required',
      });
    }

    // Validate employee exists
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId,
      },
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Validate dates
    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (to < from) {
      return res.status(400).json({
        message: 'To date must be after from date',
      });
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId,
        fromDate: from,
        toDate: to,
        leaveType,
        status: 'PENDING',
        reason: reason || null,
        appliedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'LEAVE_APPLY',
      entityType: 'LeaveRequest',
      entityId: leaveRequest.id,
      newData: {
        employeeId: leaveRequest.employeeId,
        fromDate: leaveRequest.fromDate,
        toDate: leaveRequest.toDate,
        leaveType: leaveRequest.leaveType,
        status: leaveRequest.status,
      },
    });

    res.status(201).json(leaveRequest);
  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get leave requests
 * GET /api/hr/leave
 */
const getLeaves = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const { employeeId, status, leaveType, from, to } = req.query;

    const where = {
      tenantId,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    if (leaveType) {
      where.leaveType = leaveType;
    }

    if (from || to) {
      where.fromDate = {};
      if (from) {
        where.fromDate.gte = new Date(from);
      }
      if (to) {
        where.fromDate.lte = new Date(to);
      }
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            designation: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    res.json(leaves);
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get leave request by ID
 * GET /api/hr/leave/:id
 */
const getLeaveById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const leaveRequest = await prisma.leaveRequest.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        employee: true,
      },
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    res.json(leaveRequest);
  } catch (error) {
    console.error('Get leave by ID error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Approve or reject leave request
 * PUT /api/hr/leave/:id/approve or PUT /api/hr/leave/:id/reject
 */
const decideLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        message: 'Action must be "approve" or "reject"',
      });
    }

    const leaveRequest = await prisma.leaveRequest.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'PENDING') {
      return res.status(400).json({
        message: 'Leave request has already been decided',
      });
    }

    const oldData = { ...leaveRequest };

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        decidedBy: userId,
        decidedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
      },
    });

    // If approved, update attendance records for the leave period
    if (action === 'approve') {
      const startDate = new Date(leaveRequest.fromDate);
      const endDate = new Date(leaveRequest.toDate);
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        // Check if attendance exists
        const existing = await prisma.attendance.findFirst({
          where: {
            tenantId,
            employeeId: leaveRequest.employeeId,
            date: new Date(currentDate),
          },
        });

        if (!existing) {
          // Create attendance record with LEAVE status
          await prisma.attendance.create({
            data: {
              tenantId,
              employeeId: leaveRequest.employeeId,
              date: new Date(currentDate),
              status: 'LEAVE',
              hours: 0,
            },
          });
        } else if (existing.status !== 'LEAVE') {
          // Update existing attendance to LEAVE
          await prisma.attendance.update({
            where: { id: existing.id },
            data: {
              status: 'LEAVE',
              hours: 0,
            },
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Create audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'LEAVE_DECIDE',
      entityType: 'LeaveRequest',
      entityId: updated.id,
      oldData,
      newData: updated,
    });

    res.json(updated);
  } catch (error) {
    console.error('Decide leave error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  applyLeave,
  getLeaves,
  getLeaveById,
  decideLeave,
};

