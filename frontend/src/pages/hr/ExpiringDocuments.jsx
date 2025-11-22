import { useEffect, useState } from 'react';
import api from '../../services/api';

const ExpiringDocuments = () => {
  const [expiringDocs, setExpiringDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadExpiringDocs();
  }, [days]);

  const loadExpiringDocs = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/hr/alerts/expiring-docs?days=${days}`);
      setExpiringDocs(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load expiring documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (employee) => {
    // TODO: Implement email notification
    alert(`Email notification feature coming soon for ${employee.name}`);
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Expiring Documents</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">
            Alert Days:
          </label>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">7 days</option>
            <option value="15">15 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-lg font-semibold text-blue-800">
            {expiringDocs.length} employee(s) with documents expiring within {days} days
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Expiring Documents Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading expiring documents...</div>
        ) : expiringDocs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No documents expiring within {days} days
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Until Expiry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expiringDocs.flatMap((employee) =>
                employee.alerts.map((alert, idx) => (
                  <tr key={`${employee.id}-${alert.type}-${idx}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {employee.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.employeeCode || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {alert.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(alert.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {alert.daysUntilExpiry >= 0 ? (
                        <span className={`font-medium ${
                          alert.daysUntilExpiry <= 7 ? 'text-red-600' :
                          alert.daysUntilExpiry <= 15 ? 'text-orange-600' :
                          'text-yellow-600'
                        }`}>
                          {alert.daysUntilExpiry} days
                        </span>
                      ) : (
                        <span className="font-medium text-red-600">
                          Expired {Math.abs(alert.daysUntilExpiry)} days ago
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        alert.isExpired
                          ? 'bg-red-100 text-red-800'
                          : alert.daysUntilExpiry <= 7
                          ? 'bg-red-100 text-red-800'
                          : alert.daysUntilExpiry <= 15
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {alert.isExpired ? 'Expired' : 'Expiring Soon'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleSendEmail(employee)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Send Email
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ExpiringDocuments;

