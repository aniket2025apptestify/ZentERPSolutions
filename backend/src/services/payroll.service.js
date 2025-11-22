const prisma = require('../config/prisma');

/**
 * Get working days in a month
 */
const getWorkingDaysInMonth = (year, month) => {
  const date = new Date(year, month - 1, 1);
  let workingDays = 0;
  const lastDay = new Date(year, month, 0).getDate();

  for (let day = 1; day <= lastDay; day++) {
    const currentDate = new Date(year, month - 1, day);
    const dayOfWeek = currentDate.getDay();
    // Count Monday to Friday (1-5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }
  }

  return workingDays;
};

/**
 * Calculate payroll for an employee
 * @param {Object} employee - Employee object
 * @param {Number} month - Month (1-12)
 * @param {Number} year - Year
 * @param {Object} tenantSettings - Tenant settings (overtimeMultiplier, workingDaysPerMonth)
 * @returns {Object} Payroll calculation result
 */
const calculatePayroll = async (employee, month, year, tenantSettings = {}) => {
  const overtimeMultiplier = tenantSettings.overtimeMultiplier || 1.5;
  const workingDaysPerMonth = tenantSettings.workingDaysPerMonth || getWorkingDaysInMonth(year, month);

  // Get attendances for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const attendances = await prisma.attendance.findMany({
    where: {
      tenantId: employee.tenantId,
      employeeId: employee.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Calculate days present and hours
  const daysPresent = attendances.filter((a) => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;
  const halfDays = attendances.filter((a) => a.status === 'HALF_DAY').length;
  const effectiveDaysPresent = daysPresent - halfDays * 0.5;

  // Calculate total hours
  const totalHours = attendances.reduce((sum, a) => sum + (a.hours || 0), 0);

  // Calculate overtime hours (assuming 8 hours per day is standard)
  const standardHoursPerDay = 8;
  const standardHours = effectiveDaysPresent * standardHoursPerDay;
  const overtimeHours = Math.max(0, totalHours - standardHours);

  let basicSalary = 0;
  let overtimePay = 0;
  let grossPay = 0;
  let netPay = 0;

  // Calculate based on salary type
  if (employee.salaryType === 'MONTHLY') {
    // Prorate basic salary by days present
    const monthlySalary = employee.salary || 0;
    basicSalary = (monthlySalary / workingDaysPerMonth) * effectiveDaysPresent;

    // Calculate overtime pay
    const hourlyRate = monthlySalary / (workingDaysPerMonth * standardHoursPerDay);
    overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
  } else if (employee.salaryType === 'HOURLY') {
    // For hourly employees, basic = hours worked * hourly rate
    const hourlyRate = employee.salary || 0;
    basicSalary = totalHours * hourlyRate;

    // Overtime is already included in totalHours, but we can apply multiplier
    const standardPay = standardHours * hourlyRate;
    const overtimePayAmount = overtimeHours * hourlyRate * overtimeMultiplier;
    basicSalary = standardPay;
    overtimePay = overtimePayAmount;
  } else if (employee.salaryType === 'DAILY') {
    // For daily employees
    const dailyRate = employee.salary || 0;
    basicSalary = effectiveDaysPresent * dailyRate;

    // Overtime calculation for daily workers
    const hourlyRate = dailyRate / standardHoursPerDay;
    overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
  }

  // Get allowances and deductions (can be from employee-specific settings or tenant defaults)
  const allowances = 0; // TODO: Get from employee settings or tenant defaults
  const deductions = 0; // TODO: Get from employee settings or tenant defaults

  grossPay = basicSalary + overtimePay + allowances;
  netPay = grossPay - deductions;

  return {
    basicSalary: Math.round(basicSalary * 100) / 100,
    daysPresent: Math.round(effectiveDaysPresent * 10) / 10,
    totalHours: Math.round(totalHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    allowances: Math.round(allowances * 100) / 100,
    deductions: Math.round(deductions * 100) / 100,
    grossPay: Math.round(grossPay * 100) / 100,
    netPay: Math.round(netPay * 100) / 100,
  };
};

/**
 * Allocate labour costs to projects based on attendance jobLink
 * @param {String} tenantId - Tenant ID
 * @param {Number} month - Month
 * @param {Number} year - Year
 */
const allocateLabourCostsToProjects = async (tenantId, month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get all attendances with jobLink for the month
  const attendances = await prisma.attendance.findMany({
    where: {
      tenantId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      jobLink: {
        not: null,
      },
    },
    include: {
      employee: true,
    },
  });

  // Group by project and job
  const projectCosts = {};

  for (const attendance of attendances) {
    if (!attendance.jobLink || !attendance.hours) continue;

    const { projectId, jobId } = attendance.jobLink;
    if (!projectId) continue;

    const employee = attendance.employee;
    if (!employee || !employee.salary) continue;

    // Calculate hourly rate based on salary type
    let hourlyRate = 0;
    if (employee.salaryType === 'MONTHLY') {
      const workingDaysPerMonth = 26; // Default
      hourlyRate = employee.salary / (workingDaysPerMonth * 8);
    } else if (employee.salaryType === 'HOURLY') {
      hourlyRate = employee.salary;
    } else if (employee.salaryType === 'DAILY') {
      hourlyRate = employee.salary / 8;
    }

    const labourCost = attendance.hours * hourlyRate;

    if (!projectCosts[projectId]) {
      projectCosts[projectId] = {
        projectId,
        totalCost: 0,
        jobs: {},
      };
    }

    projectCosts[projectId].totalCost += labourCost;

    if (jobId) {
      if (!projectCosts[projectId].jobs[jobId]) {
        projectCosts[projectId].jobs[jobId] = 0;
      }
      projectCosts[projectId].jobs[jobId] += labourCost;
    }
  }

  // Update project actualCost
  for (const [projectId, costData] of Object.entries(projectCosts)) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (project) {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          actualCost: (project.actualCost || 0) + costData.totalCost,
        },
      });
    }
  }

  return projectCosts;
};

module.exports = {
  calculatePayroll,
  allocateLabourCostsToProjects,
  getWorkingDaysInMonth,
};

