import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAttendance,
  createAttendance,
  bulkUploadAttendance,
  selectAttendance,
  selectAttendanceTotals,
  selectAttendanceStatus,
  selectAttendanceError,
  selectBulkUploadResult,
  clearError,
  clearBulkUploadResult,
} from '../../store/slices/attendanceSlice';
import { fetchEmployees, selectEmployees } from '../../store/slices/employeesSlice';
import { fetchProjects, selectProjects } from '../../store/slices/projectsSlice';

const AttendanceDashboard = () => {
  const dispatch = useDispatch();
  const attendance = useSelector(selectAttendance);
  const totals = useSelector(selectAttendanceTotals);
  const status = useSelector(selectAttendanceStatus);
  const error = useSelector(selectAttendanceError);
  const bulkResult = useSelector(selectBulkUploadResult);
  const employees = useSelector(selectEmployees);
  const projects = useSelector(selectProjects);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: selectedDate,
    status: 'PRESENT',
    checkIn: '',
    checkOut: '',
    jobLink: { projectId: '', jobId: '' },
    remarks: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    dispatch(fetchEmployees({ isActive: true }));
    dispatch(fetchProjects({}));
    loadAttendance();
  }, [dispatch]);

  useEffect(() => {
    loadAttendance();
  }, [selectedDate]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const loadAttendance = () => {
    const today = new Date(selectedDate);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    dispatch(fetchAttendance({
      from: today.toISOString().split('T')[0],
      to: tomorrow.toISOString().split('T')[0],
    }));
  };

  const handleAddAttendance = async (e) => {
    e.preventDefault();
    try {
      await dispatch(createAttendance(formData)).unwrap();
      setShowAddModal(false);
      setFormData({
        employeeId: '',
        date: selectedDate,
        status: 'PRESENT',
        checkIn: '',
        checkOut: '',
        jobLink: { projectId: '', jobId: '' },
        remarks: '',
      });
      loadAttendance();
    } catch (err) {
      console.error('Error creating attendance:', err);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a CSV file');
      return;
    }

    try {
      await dispatch(bulkUploadAttendance({ file: selectedFile })).unwrap();
      setShowBulkModal(false);
      setSelectedFile(null);
      loadAttendance();
    } catch (err) {
      console.error('Error uploading attendance:', err);
    }
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp ? emp.name : 'Unknown';
  };

  const getProjectName = (projectId) => {
    const proj = projects.find((p) => p.id === projectId);
    return proj ? proj.name : 'N/A';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Attendance Dashboard</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Bulk Upload
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Attendance
          </button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Summary Cards */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Days</div>
            <div className="text-2xl font-bold">{totals.totalDays}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Hours</div>
            <div className="text-2xl font-bold">{totals.totalHours?.toFixed(2) || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Present</div>
            <div className="text-2xl font-bold text-green-600">{totals.presentDays}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Absent</div>
            <div className="text-2xl font-bold text-red-600">{totals.absentDays}</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Bulk Upload Result */}
      {bulkResult && (
        <div className={`mb-4 p-4 rounded ${
          bulkResult.errors?.length > 0
            ? 'bg-yellow-100 border border-yellow-400 text-yellow-700'
            : 'bg-green-100 border border-green-400 text-green-700'
        }`}>
          <div className="font-semibold">
            Uploaded: {bulkResult.uploadedCount} / {bulkResult.totalRecords}
          </div>
          {bulkResult.errors?.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold">Errors:</div>
              <ul className="list-disc list-inside">
                {bulkResult.errors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>Row {err.row}: {err.error}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => dispatch(clearBulkUploadResult())}
            className="mt-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {status === 'loading' ? (
          <div className="p-8 text-center">Loading attendance...</div>
        ) : attendance.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No attendance records for this date</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendance.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getEmployeeName(record.employeeId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      record.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                      record.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                      record.status === 'LEAVE' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {record.hours ? `${record.hours.toFixed(2)}h` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.jobLink?.projectId ? getProjectName(record.jobLink.projectId) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {record.remarks || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Attendance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Add Attendance</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddAttendance} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LEAVE">Leave</option>
                    <option value="HALF_DAY">Half Day</option>
                  </select>
                </div>

                {formData.status === 'PRESENT' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Check In
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.checkIn}
                          onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Check Out
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.checkOut}
                          onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project (Optional)
                      </label>
                      <select
                        value={formData.jobLink.projectId}
                        onChange={(e) => setFormData({
                          ...formData,
                          jobLink: { ...formData.jobLink, projectId: e.target.value }
                        })}
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Project</option>
                        {projects.map((proj) => (
                          <option key={proj.id} value={proj.id}>
                            {proj.name} ({proj.projectCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows="3"
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Bulk Upload Attendance</h2>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setSelectedFile(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleBulkUpload} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  CSV format: employeeCode, date, status, checkIn, checkOut, remarks
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false);
                    setSelectedFile(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;

