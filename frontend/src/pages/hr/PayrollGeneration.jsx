import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchPayroll,
  generatePayroll,
  payPayroll,
  selectPayroll,
  selectPayrollStatus,
  selectPayrollError,
  selectGenerateResult,
  clearError,
  clearGenerateResult,
} from '../../store/slices/payrollSlice';
import { fetchEmployees, selectEmployees } from '../../store/slices/employeesSlice';

const PayrollGeneration = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const payroll = useSelector(selectPayroll);
  const status = useSelector(selectPayrollStatus);
  const error = useSelector(selectPayrollError);
  const generateResult = useSelector(selectGenerateResult);
  const employees = useSelector(selectEmployees);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [generateData, setGenerateData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    employeeIds: [],
  });
  const [payData, setPayData] = useState({
    paidAt: new Date().toISOString().split('T')[0],
    paymentRef: '',
  });
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    paid: '',
  });

  useEffect(() => {
    dispatch(fetchEmployees({ isActive: true }));
    loadPayroll();
  }, [dispatch]);

  useEffect(() => {
    loadPayroll();
  }, [filters]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const loadPayroll = () => {
    dispatch(fetchPayroll(filters));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      await dispatch(generatePayroll(generateData)).unwrap();
      setShowGenerateModal(false);
      loadPayroll();
    } catch (err) {
      console.error('Error generating payroll:', err);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selectedPayroll) return;

    try {
      await dispatch(payPayroll({
        id: selectedPayroll.id,
        ...payData,
      })).unwrap();
      setShowPayModal(false);
      setSelectedPayroll(null);
      loadPayroll();
    } catch (err) {
      console.error('Error paying payroll:', err);
    }
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp ? emp.name : 'Unknown';
  };

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payroll Management</h1>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Generate Payroll
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <input
              type="number"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="2020"
              max="2100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              value={filters.paid}
              onChange={(e) => setFilters({ ...filters, paid: e.target.value })}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="true">Paid</option>
              <option value="false">Unpaid</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadPayroll}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Generate Result */}
      {generateResult && (
        <div className={`mb-4 p-4 rounded ${
          generateResult.errors?.length > 0
            ? 'bg-yellow-100 border border-yellow-400 text-yellow-700'
            : 'bg-green-100 border border-green-400 text-green-700'
        }`}>
          <div className="font-semibold">
            Generated: {generateResult.generated} payroll record(s)
          </div>
          {generateResult.errors?.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold">Errors:</div>
              <ul className="list-disc list-inside">
                {generateResult.errors.map((err, idx) => (
                  <li key={idx}>{err.employeeName}: {err.error}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => dispatch(clearGenerateResult())}
            className="mt-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Payroll Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {status === 'loading' ? (
          <div className="p-8 text-center">Loading payroll...</div>
        ) : payroll.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payroll records found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month/Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Present</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overtime</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross Pay</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payroll.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {getEmployeeName(record.employeeId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getMonthName(record.month)} {record.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.daysPresent}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.basicSalary.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.overtimePay ? record.overtimePay.toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {record.grossPay.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {record.netPay.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      record.paid
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {record.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => navigate(`/hr/payslip/${record.id}`)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View Payslip
                    </button>
                    {!record.paid && (
                      <button
                        onClick={() => {
                          setSelectedPayroll(record);
                          setShowPayModal(true);
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Generate Payroll</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleGenerate} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Month <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={generateData.month}
                      onChange={(e) => setGenerateData({ ...generateData, month: parseInt(e.target.value) })}
                      className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                        <option key={m} value={m}>
                          {getMonthName(m)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={generateData.year}
                      onChange={(e) => setGenerateData({ ...generateData, year: parseInt(e.target.value) })}
                      className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="2020"
                      max="2100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employees (Leave empty for all active employees)
                  </label>
                  <select
                    multiple
                    value={generateData.employeeIds}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setGenerateData({ ...generateData, employeeIds: selected });
                    }}
                    className="w-full border rounded px-3 py-2 h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Hold Ctrl/Cmd to select multiple employees
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Generate Payroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Payroll Modal */}
      {showPayModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Mark Payroll as Paid</h2>
              <button
                onClick={() => {
                  setShowPayModal(false);
                  setSelectedPayroll(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePay} className="p-6">
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">
                  Employee: <span className="font-medium">{getEmployeeName(selectedPayroll.employeeId)}</span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Amount: <span className="font-medium text-green-600">₹{selectedPayroll.netPay.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={payData.paidAt}
                    onChange={(e) => setPayData({ ...payData, paidAt: e.target.value })}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Reference
                  </label>
                  <input
                    type="text"
                    value={payData.paymentRef}
                    onChange={(e) => setPayData({ ...payData, paymentRef: e.target.value })}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Bank transaction ID, cheque number, etc."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPayModal(false);
                    setSelectedPayroll(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Mark as Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollGeneration;

