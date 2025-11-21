import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchTransactions,
  fetchItems,
  selectTransactions,
  selectItems,
  selectInventoryStatus,
  selectInventoryError,
  clearError,
} from '../../store/slices/inventorySlice';

const StockLedger = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const transactions = useSelector(selectTransactions);
  const items = useSelector(selectItems);
  const status = useSelector(selectInventoryStatus);
  const error = useSelector(selectInventoryError);

  const [filters, setFilters] = useState({
    itemId: '',
    from: '',
    to: '',
    type: '',
    page: 1,
    limit: 50,
  });

  useEffect(() => {
    dispatch(fetchItems({ limit: 1000 }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchTransactions(filters));
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
      page: 1, // Reset to first page on filter change
    }));
  };

  const handleApplyFilters = () => {
    dispatch(fetchTransactions(filters));
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      itemId: '',
      from: '',
      to: '',
      type: '',
      page: 1,
      limit: 50,
    };
    setFilters(clearedFilters);
    dispatch(fetchTransactions(clearedFilters));
  };

  const getItemName = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    return item ? item.itemName : itemId;
  };

  const getItemUnit = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    return item ? item.unit : '';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/inventory/stock')}
          className="text-blue-600 hover:text-blue-800 mb-2"
        >
          ← Back to Stock Dashboard
        </button>
        <h1 className="text-3xl font-bold">Stock Ledger</h1>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select
            name="itemId"
            value={filters.itemId}
            onChange={handleFilterChange}
            className="border rounded px-3 py-2"
          >
            <option value="">All Items</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.itemName} ({item.itemCode || 'N/A'})
              </option>
            ))}
          </select>
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
          <select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            className="border rounded px-3 py-2"
          >
            <option value="">All Types</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
            <option value="TRANSFER">TRANSFER</option>
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

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {status === 'loading' ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Balance After
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getItemName(tx.itemId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          tx.type === 'IN'
                            ? 'bg-green-100 text-green-800'
                            : tx.type === 'OUT'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tx.referenceType}
                      {tx.referenceId && ` #${tx.referenceId.slice(-6)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tx.qty > 0 ? '+' : ''}
                      {tx.qty} {getItemUnit(tx.itemId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tx.rate ? `$${tx.rate.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tx.balanceAfter} {getItemUnit(tx.itemId)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tx.remarks || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockLedger;

