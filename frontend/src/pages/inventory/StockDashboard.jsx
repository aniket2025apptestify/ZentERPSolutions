import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  fetchItems,
  selectItems,
  selectInventoryStatus,
  selectInventoryError,
  clearError,
} from '../../store/slices/inventorySlice';

const StockDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const items = useSelector(selectItems);
  const status = useSelector(selectInventoryStatus);
  const error = useSelector(selectInventoryError);

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    lowStock: false,
    systemItem: 'true', // Default: show only active items (systemItem = true)
  });

  // Refresh items when component mounts or when navigating back to this page
  useEffect(() => {
    dispatch(fetchItems(filters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, location.pathname]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleApplyFilters = () => {
    dispatch(fetchItems(filters));
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      category: '',
      lowStock: false,
      systemItem: 'true', // Keep showing only active items by default
    };
    setFilters(clearedFilters);
    dispatch(fetchItems(clearedFilters));
  };

  // Refresh button handler
  const handleRefresh = () => {
    dispatch(fetchItems(filters));
  };

  const lowStockCount = items.filter(
    (item) =>
      item.reorderLevel !== null && item.availableQty <= item.reorderLevel
  ).length;

  const totalSKUs = items.length;

  const getStockStatus = (item) => {
    if (item.reorderLevel === null) return 'normal';
    if (item.availableQty <= item.reorderLevel) return 'low';
    if (item.availableQty <= item.reorderLevel * 1.5) return 'warning';
    return 'normal';
  };

  const getStockBadgeClass = (status) => {
    switch (status) {
      case 'low':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Stock Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            title="Refresh list"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => navigate('/inventory/items/create')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + New Item
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Total SKUs</h3>
          <p className="text-3xl font-bold mt-2">{totalSKUs}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Low Stock Items</h3>
          <p className="text-3xl font-bold mt-2 text-red-600">{lowStockCount}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Quick Actions</h3>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => navigate('/inventory/issue')}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              Issue Material
            </button>
            <button
              onClick={() => navigate('/inventory/ledger')}
              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
            >
              View Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            name="search"
            placeholder="Search items..."
            value={filters.search}
            onChange={handleFilterChange}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            name="category"
            placeholder="Category"
            value={filters.category}
            onChange={handleFilterChange}
            className="border rounded px-3 py-2"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="lowStock"
              checked={filters.lowStock}
              onChange={handleFilterChange}
            />
            <span>Low Stock Only</span>
          </label>
          <select
            name="systemItem"
            value={filters.systemItem}
            onChange={handleFilterChange}
            className="border rounded px-3 py-2"
          >
            <option value="true">Active Items Only</option>
            <option value="false">Inactive Items Only</option>
            <option value="">All Items</option>
          </select>
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

      {/* Items Table */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {status === 'loading' ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reserved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reorder Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No items found
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const stockStatus = getStockStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.itemName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.itemCode || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.category || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.availableQty} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.reservedQty || 0} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.reorderLevel !== null
                          ? `${item.reorderLevel} ${item.unit}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStockBadgeClass(
                            stockStatus
                          )}`}
                        >
                          {stockStatus === 'low'
                            ? 'Low Stock'
                            : stockStatus === 'warning'
                            ? 'Warning'
                            : 'Normal'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => navigate(`/inventory/items/${item.id}`)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/inventory/items/${item.id}/adjust`)
                          }
                          className="text-green-600 hover:text-green-900"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockDashboard;

