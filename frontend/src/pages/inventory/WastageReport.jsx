import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchWastageReport,
  selectWastageReport,
  selectInventoryStatus,
  selectInventoryError,
  clearError,
} from '../../store/slices/inventorySlice';

const WastageReport = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const wastageData = useSelector(selectWastageReport);
  const status = useSelector(selectInventoryStatus);
  const error = useSelector(selectInventoryError);

  const [filters, setFilters] = useState({
    from: '',
    to: '',
    itemId: '',
    jobId: '',
  });

  useEffect(() => {
    dispatch(fetchWastageReport(filters));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleApplyFilters = () => {
    dispatch(fetchWastageReport(filters));
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      from: '',
      to: '',
      itemId: '',
      jobId: '',
    };
    setFilters(clearedFilters);
    dispatch(fetchWastageReport(clearedFilters));
  };

  const records = wastageData?.records || [];
  const aggregated = wastageData?.aggregatedByItem || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/inventory/stock')}
          className="text-blue-600 hover:text-blue-800 mb-2"
        >
          ← Back to Stock Dashboard
        </button>
        <h1 className="text-3xl font-bold">Wastage Report</h1>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="date"
            name="from"
            placeholder="From Date"
            value={filters.from}
            onChange={handleFilterChange}
            className="border rounded px-3 py-2"
          />
          <input
            type="date"
            name="to"
            placeholder="To Date"
            value={filters.to}
            onChange={handleFilterChange}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            name="itemId"
            placeholder="Item ID"
            value={filters.itemId}
            onChange={handleFilterChange}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            name="jobId"
            placeholder="Job ID"
            value={filters.jobId}
            onChange={handleFilterChange}
            className="border rounded px-3 py-2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleApplyFilters}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Apply
            </button>
            <button
              onClick={handleClearFilters}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {status === 'loading' ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          {/* Aggregated by Item */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Wastage Summary by Item</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Wastage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {aggregated.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                        No wastage records found
                      </td>
                    </tr>
                  ) : (
                    aggregated.map((agg) => (
                      <tr key={agg.itemId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {agg.itemName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {agg.itemCode || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agg.totalQty.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {agg.unit}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Records */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Detailed Wastage Records</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Job ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Recorded By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        No wastage records found
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(record.recordedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.item?.itemName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.jobId || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.qty} {record.item?.unit || ''}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {record.reason || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.recordedBy}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WastageReport;

