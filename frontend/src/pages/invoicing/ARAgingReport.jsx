import { useEffect, useState } from 'react';
import api from '../../services/api';

const ARAgingReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    clientId: '',
  });

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.clientId) params.append('clientId', filters.clientId);

      const response = await api.get(
        `/api/reports/ar-aging${params.toString() ? `?${params.toString()}` : ''}`
      );
      setReport(response.data);
    } catch (error) {
      console.error('Failed to fetch AR aging report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    fetchReport();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">AR Aging Report</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              name="from"
              value={filters.from}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              name="to"
              value={filters.to}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-8 text-gray-500">Loading report...</div>
      ) : report ? (
        <>
          {/* Summary Totals */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Summary</h2>
            <div className="grid grid-cols-6 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Outstanding</p>
                <p className="text-xl font-bold">{formatCurrency(report.totals.totalOutstanding)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current</p>
                <p className="text-lg font-medium">{formatCurrency(report.totals.aging.current)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">0-30 Days</p>
                <p className="text-lg font-medium">{formatCurrency(report.totals.aging['0-30'])}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">31-60 Days</p>
                <p className="text-lg font-medium">{formatCurrency(report.totals.aging['31-60'])}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">61-90 Days</p>
                <p className="text-lg font-medium">{formatCurrency(report.totals.aging['61-90'])}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">90+ Days</p>
                <p className="text-lg font-medium text-red-600">
                  {formatCurrency(report.totals.aging['90+'])}
                </p>
              </div>
            </div>
          </div>

          {/* Client Details */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Client
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total Outstanding
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Current
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    0-30
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    31-60
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    61-90
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    90+
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.report.map((item) => (
                  <tr key={item.client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.client.name || item.client.companyName}
                      </div>
                      {item.client.email && (
                        <div className="text-sm text-gray-500">{item.client.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {formatCurrency(item.totalOutstanding)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {formatCurrency(item.aging.current)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {formatCurrency(item.aging['0-30'])}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {formatCurrency(item.aging['31-60'])}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {formatCurrency(item.aging['61-90'])}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-red-600">
                      {formatCurrency(item.aging['90+'])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="text-center p-8 text-gray-500">No data available</div>
      )}
    </div>
  );
};

export default ARAgingReport;

