import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPayrollById,
  selectSelectedPayroll,
  selectPayrollStatus,
  selectPayrollError,
} from '../../store/slices/payrollSlice';

const PayslipViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const payroll = useSelector(selectSelectedPayroll);
  const status = useSelector(selectPayrollStatus);
  const error = useSelector(selectPayrollError);

  useEffect(() => {
    if (id) {
      dispatch(fetchPayrollById(id));
    }
  }, [id, dispatch]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // TODO: Implement PDF download
    alert('PDF download feature coming soon');
  };

  if (status === 'loading') {
    return (
      <div className="p-6">
        <div className="text-center">Loading payslip...</div>
      </div>
    );
  }

  if (error || !payroll) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || 'Payslip not found'}
        </div>
        <button
          onClick={() => navigate('/hr/payroll')}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Back to Payroll
        </button>
      </div>
    );
  }

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-center print:hidden">
        <button
          onClick={() => navigate('/hr/payroll')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Payroll
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Print
          </button>
        </div>
      </div>

      {/* Payslip */}
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl mx-auto print:shadow-none">
        {/* Header */}
        <div className="border-b-2 border-gray-300 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-center">PAYSLIP</h1>
          <p className="text-center text-gray-600 mt-2">
            {getMonthName(payroll.month)} {payroll.year}
          </p>
        </div>

        {/* Employee Info */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Employee Name</div>
              <div className="text-lg font-semibold">{payroll.employee?.name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Employee Code</div>
              <div className="text-lg font-semibold">{payroll.employee?.employeeCode || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Designation</div>
              <div className="text-lg">{payroll.employee?.designation || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Department</div>
              <div className="text-lg">{payroll.employee?.department || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Earnings & Deductions */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-semibold text-lg mb-3 border-b pb-2">Earnings</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Basic Salary</span>
                <span className="font-medium">₹{payroll.basicSalary.toLocaleString()}</span>
              </div>
              {payroll.overtimePay > 0 && (
                <div className="flex justify-between">
                  <span>Overtime Pay ({payroll.overtimeHours?.toFixed(2)} hrs)</span>
                  <span className="font-medium">₹{payroll.overtimePay.toLocaleString()}</span>
                </div>
              )}
              {payroll.allowances > 0 && (
                <div className="flex justify-between">
                  <span>Allowances</span>
                  <span className="font-medium">₹{payroll.allowances.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>Gross Pay</span>
                <span>₹{payroll.grossPay.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3 border-b pb-2">Deductions</h3>
            <div className="space-y-2">
              {payroll.deductions > 0 ? (
                <div className="flex justify-between">
                  <span>Deductions</span>
                  <span className="font-medium">₹{payroll.deductions.toLocaleString()}</span>
                </div>
              ) : (
                <div className="text-gray-400">No deductions</div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>Total Deductions</span>
                <span>₹{payroll.deductions.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Pay */}
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold">Net Pay</span>
            <span className="text-3xl font-bold text-green-600">
              ₹{payroll.netPay.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
          <div>
            <span className="font-medium">Days Present:</span> {payroll.daysPresent}
          </div>
          <div>
            <span className="font-medium">Generated At:</span>{' '}
            {new Date(payroll.generatedAt).toLocaleString()}
          </div>
          {payroll.paid && (
            <>
              <div>
                <span className="font-medium">Payment Status:</span>{' '}
                <span className="text-green-600 font-semibold">Paid</span>
              </div>
              {payroll.paidAt && (
                <div>
                  <span className="font-medium">Paid At:</span>{' '}
                  {new Date(payroll.paidAt).toLocaleString()}
                </div>
              )}
              {payroll.paymentRef && (
                <div className="col-span-2">
                  <span className="font-medium">Payment Reference:</span> {payroll.paymentRef}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 text-center text-sm text-gray-500">
          <p>This is a computer-generated payslip and does not require a signature.</p>
        </div>
      </div>
    </div>
  );
};

export default PayslipViewer;

