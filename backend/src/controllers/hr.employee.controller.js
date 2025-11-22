const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');

/**
 * Create a new employee
 * POST /api/hr/employees
 */
const createEmployee = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const {
      employeeCode,
      name,
      email,
      phone,
      designation,
      department,
      dateOfJoining,
      salary,
      salaryType,
      bankDetails,
      visaExpiry,
      passportExpiry,
      address,
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Employee name is required' });
    }

    // Check if employeeCode is unique within tenant
    if (employeeCode) {
      const existing = await prisma.employee.findFirst({
        where: {
          tenantId,
          employeeCode,
        },
      });
      if (existing) {
        return res.status(400).json({ message: 'Employee code already exists' });
      }
    }

    const employee = await prisma.employee.create({
      data: {
        tenantId,
        employeeCode: employeeCode || null,
        name,
        email: email || null,
        phone: phone || null,
        designation: designation || null,
        department: department || null,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
        salary: salary || null,
        salaryType: salaryType || null,
        bankDetails: bankDetails || null,
        visaExpiry: visaExpiry ? new Date(visaExpiry) : null,
        passportExpiry: passportExpiry ? new Date(passportExpiry) : null,
        address: address || null,
        isActive: true,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'EMPLOYEE_CREATE',
      entityType: 'Employee',
      entityId: employee.id,
      newData: {
        employeeCode: employee.employeeCode,
        name: employee.name,
        designation: employee.designation,
        department: employee.department,
      },
    });

    res.status(201).json(employee);
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all employees for the tenant
 * GET /api/hr/employees
 */
const getEmployees = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const { search, department, isActive, designation } = req.query;

    const where = {
      tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) {
      where.department = department;
    }

    if (designation) {
      where.designation = designation;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get employee by ID
 * GET /api/hr/employees/:id
 */
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        attendances: {
          take: 10,
          orderBy: { date: 'desc' },
        },
        payrollRecords: {
          take: 5,
          orderBy: { generatedAt: 'desc' },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Get employee by ID error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Update employee
 * PUT /api/hr/employees/:id
 */
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Get existing employee
    const existing = await prisma.employee.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const {
      employeeCode,
      name,
      email,
      phone,
      designation,
      department,
      dateOfJoining,
      salary,
      salaryType,
      bankDetails,
      visaExpiry,
      passportExpiry,
      address,
      isActive,
    } = req.body;

    // Check if employeeCode is unique (if changed)
    if (employeeCode && employeeCode !== existing.employeeCode) {
      const duplicate = await prisma.employee.findFirst({
        where: {
          tenantId,
          employeeCode,
          id: { not: id },
        },
      });
      if (duplicate) {
        return res.status(400).json({ message: 'Employee code already exists' });
      }
    }

    const oldData = { ...existing };

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        employeeCode: employeeCode !== undefined ? employeeCode : existing.employeeCode,
        name: name !== undefined ? name : existing.name,
        email: email !== undefined ? email : existing.email,
        phone: phone !== undefined ? phone : existing.phone,
        designation: designation !== undefined ? designation : existing.designation,
        department: department !== undefined ? department : existing.department,
        dateOfJoining: dateOfJoining !== undefined ? (dateOfJoining ? new Date(dateOfJoining) : null) : existing.dateOfJoining,
        salary: salary !== undefined ? salary : existing.salary,
        salaryType: salaryType !== undefined ? salaryType : existing.salaryType,
        bankDetails: bankDetails !== undefined ? bankDetails : existing.bankDetails,
        visaExpiry: visaExpiry !== undefined ? (visaExpiry ? new Date(visaExpiry) : null) : existing.visaExpiry,
        passportExpiry: passportExpiry !== undefined ? (passportExpiry ? new Date(passportExpiry) : null) : existing.passportExpiry,
        address: address !== undefined ? address : existing.address,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId,
      action: 'EMPLOYEE_UPDATE',
      entityType: 'Employee',
      entityId: employee.id,
      oldData,
      newData: employee,
    });

    res.json(employee);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
};

