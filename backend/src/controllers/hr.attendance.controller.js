const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * Calculate hours from checkIn and checkOut
 */
const calculateHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.max(0, diff / (1000 * 60 * 60)); // Convert to hours
};

/**
 * Create single attendance entry
 * POST /api/hr/attendance
 */
const createAttendance = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const {
      employeeId,
      date,
      status,
      checkIn,
      checkOut,
      jobLink,
      remarks,
    } = req.body;

    // Validate required fields
    if (!employeeId || !date || !status) {
      return res.status(400).json({
        message: 'Employee ID, date, and status are required',
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

    // Validate checkOut > checkIn
    if (checkIn && checkOut) {
      if (new Date(checkOut) <= new Date(checkIn)) {
        return res.status(400).json({
          message: 'Check-out time must be after check-in time',
        });
      }
    }

    // Calculate hours
    const hours = calculateHours(checkIn, checkOut);

    // Check for duplicate attendance on same date
    const existing = await prisma.attendance.findFirst({
      where: {
        tenantId,
        employeeId,
        date: new Date(date),
      },
    });

    if (existing) {
      return res.status(400).json({
        message: 'Attendance already exists for this date',
      });
    }

    const attendance = await prisma.attendance.create({
      data: {
        tenantId,
        employeeId,
        date: new Date(date),
        status,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        hours,
        jobLink: jobLink || null,
        remarks: remarks || null,
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
      action: 'ATTENDANCE_CREATE',
      entityType: 'Attendance',
      entityId: attendance.id,
      newData: {
        employeeId: attendance.employeeId,
        date: attendance.date,
        status: attendance.status,
        hours: attendance.hours,
      },
    });

    res.status(201).json(attendance);
  } catch (error) {
    console.error('Create attendance error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Bulk upload attendance (CSV/JSON)
 * POST /api/hr/attendance/bulk
 */
const bulkUploadAttendance = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    let records = [];
    const errors = [];

    // Handle JSON upload
    if (req.body && Array.isArray(req.body)) {
      records = req.body;
    }
    // Handle CSV file upload
    else if (req.file) {
      const csvData = [];
      const stream = Readable.from(req.file.buffer.toString());
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (row) => {
            csvData.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });

      records = csvData.map((row) => ({
        employeeCode: row.employeeCode || row['Employee Code'],
        email: row.email || row['Email'],
        date: row.date || row['Date'],
        status: row.status || row['Status'],
        checkIn: row.checkIn || row['Check In'] || row['Check-In'],
        checkOut: row.checkOut || row['Check Out'] || row['Check-Out'],
        jobLink: row.jobLink ? JSON.parse(row.jobLink) : null,
        remarks: row.remarks || row['Remarks'],
      }));
    } else {
      return res.status(400).json({ message: 'No data provided' });
    }

    const results = [];
    let uploadedCount = 0;

    // Process records
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        // Find employee by code or email
        let employee = null;
        if (record.employeeCode) {
          employee = await prisma.employee.findFirst({
            where: {
              tenantId,
              employeeCode: record.employeeCode,
            },
          });
        }
        if (!employee && record.email) {
          employee = await prisma.employee.findFirst({
            where: {
              tenantId,
              email: record.email,
            },
          });
        }

        if (!employee) {
          errors.push({
            row: i + 1,
            error: `Employee not found: ${record.employeeCode || record.email}`,
          });
          continue;
        }

        // Validate date
        if (!record.date) {
          errors.push({
            row: i + 1,
            error: 'Date is required',
          });
          continue;
        }

        // Check for duplicate
        const existing = await prisma.attendance.findFirst({
          where: {
            tenantId,
            employeeId: employee.id,
            date: new Date(record.date),
          },
        });

        if (existing) {
          errors.push({
            row: i + 1,
            error: `Attendance already exists for ${record.date}`,
          });
          continue;
        }

        // Calculate hours
        const hours = calculateHours(record.checkIn, record.checkOut);

        // Validate checkOut > checkIn
        if (record.checkIn && record.checkOut) {
          if (new Date(record.checkOut) <= new Date(record.checkIn)) {
            errors.push({
              row: i + 1,
              error: 'Check-out must be after check-in',
            });
            continue;
          }
        }

        const attendance = await prisma.attendance.create({
          data: {
            tenantId,
            employeeId: employee.id,
            date: new Date(record.date),
            status: record.status || 'PRESENT',
            checkIn: record.checkIn ? new Date(record.checkIn) : null,
            checkOut: record.checkOut ? new Date(record.checkOut) : null,
            hours,
            jobLink: record.jobLink || null,
            remarks: record.remarks || null,
          },
        });

        results.push(attendance);
        uploadedCount++;

        // Create audit log for bulk upload
        await createAuditLog({
          tenantId,
          userId,
          action: 'ATTENDANCE_BULK_UPLOAD',
          entityType: 'Attendance',
          entityId: attendance.id,
          newData: {
            employeeId: attendance.employeeId,
            date: attendance.date,
            status: attendance.status,
          },
        });
      } catch (error) {
        errors.push({
          row: i + 1,
          error: error.message || 'Unknown error',
        });
      }
    }

    res.json({
      uploadedCount,
      totalRecords: records.length,
      errors: errors.length > 0 ? errors : undefined,
      results: results.slice(0, 10), // Return first 10 for preview
    });
  } catch (error) {
    console.error('Bulk upload attendance error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get attendance report
 * GET /api/hr/attendance?employeeId=&from=&to=&projectId=&jobId=
 */
const getAttendance = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const { employeeId, from, to, projectId, jobId } = req.query;

    const where = {
      tenantId,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from);
      }
      if (to) {
        where.date.lte = new Date(to);
      }
    }

    // Filter by jobLink
    if (projectId || jobId) {
      where.jobLink = {};
      if (projectId) {
        where.jobLink = {
          path: ['projectId'],
          equals: projectId,
        };
      }
      if (jobId) {
        where.jobLink = {
          path: ['jobId'],
          equals: jobId,
        };
      }
    }

    const attendances = await prisma.attendance.findMany({
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
      orderBy: { date: 'desc' },
    });

    // Calculate totals
    const totals = {
      totalDays: attendances.length,
      totalHours: attendances.reduce((sum, a) => sum + (a.hours || 0), 0),
      presentDays: attendances.filter((a) => a.status === 'PRESENT').length,
      absentDays: attendances.filter((a) => a.status === 'ABSENT').length,
      leaveDays: attendances.filter((a) => a.status === 'LEAVE').length,
      halfDays: attendances.filter((a) => a.status === 'HALF_DAY').length,
    };

    res.json({
      attendances,
      totals,
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  createAttendance,
  bulkUploadAttendance,
  getAttendance,
};

