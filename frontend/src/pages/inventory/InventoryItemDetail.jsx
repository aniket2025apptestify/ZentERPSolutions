import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchItemById,
  updateItem,
  createStockTransaction,
  fetchTransactions,
  selectSelectedItem,
  selectTransactions,
  selectInventoryStatus,
  selectInventoryError,
  clearError,
  clearSelectedItem,
} from '../../store/slices/inventorySlice';

const InventoryItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const item = useSelector(selectSelectedItem);
  const transactions = useSelector(selectTransactions);
  const status = useSelector(selectInventoryStatus);
  const error = useSelector(selectInventoryError);

  const [isEditing, setIsEditing] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [formData, setFormData] = useState({
    itemName: '',
    itemCode: '',
    category: '',
    unit: '',
    reorderLevel: '',
    lastPurchaseRate: '',
  });
  const [adjustData, setAdjustData] = useState({
    qty: '',
    type: 'ADJUSTMENT',
    remarks: '',
  });

  useEffect(() => {
    if (id) {
      dispatch(fetchItemById(id));
      dispatch(fetchTransactions({ itemId: id, limit: 20 }));
    }

    return () => {
      dispatch(clearSelectedItem());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (item) {
      setFormData({
        itemName: item.itemName || '',
        itemCode: item.itemCode || '',
        category: item.category || '',
        unit: item.unit || '',
        reorderLevel: item.reorderLevel || '',
        lastPurchaseRate: item.lastPurchaseRate || '',
      });
    }
  }, [item]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAdjustChange = (e) => {
    const { name, value } = e.target;
    setAdjustData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      await dispatch(updateItem({ id, data: formData })).unwrap();
      setIsEditing(false);
      dispatch(fetchItemById(id));
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const handleAdjust = async () => {
    try {
      const qty = parseFloat(adjustData.qty);
      if (isNaN(qty) || qty === 0) {
        alert('Please enter a valid quantity');
        return;
      }

      await dispatch(
        createStockTransaction({
          itemId: id,
          type: adjustData.type,
          referenceType: 'ADJ',
          qty: qty,
          remarks: adjustData.remarks,
        })
      ).unwrap();

      setShowAdjust(false);
      setAdjustData({ qty: '', type: 'ADJUSTMENT', remarks: '' });
      dispatch(fetchItemById(id));
      dispatch(fetchTransactions({ itemId: id, limit: 20 }));
    } catch (err) {
      console.error('Adjust failed:', err);
    }
  };

  if (status === 'loading' && !item) {
    return <div className="p-6">Loading...</div>;
  }

  if (!item) {
    return <div className="p-6">Item not found</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <button
            onClick={() => navigate('/inventory/stock')}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Back to Stock Dashboard
          </button>
          <h1 className="text-3xl font-bold">{item.itemName}</h1>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => setShowAdjust(true)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Adjust Stock
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  if (item) {
                    setFormData({
                      itemName: item.itemName || '',
                      itemCode: item.itemCode || '',
                      category: item.category || '',
                      unit: item.unit || '',
                      reorderLevel: item.reorderLevel || '',
                      lastPurchaseRate: item.lastPurchaseRate || '',
                    });
                  }
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Item Details */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Item Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name
            </label>
            {isEditing ? (
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
              />
            ) : (
              <p className="text-gray-900">{item.itemName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Code
            </label>
            {isEditing ? (
              <input
                type="text"
                name="itemCode"
                value={formData.itemCode}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
              />
            ) : (
              <p className="text-gray-900">{item.itemCode || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            {isEditing ? (
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
              />
            ) : (
              <p className="text-gray-900">{item.category || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            {isEditing ? (
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
              />
            ) : (
              <p className="text-gray-900">{item.unit}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Available Quantity
            </label>
            <p className="text-gray-900 font-semibold">
              {item.availableQty} {item.unit}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reserved Quantity
            </label>
            <p className="text-gray-900">{item.reservedQty || 0} {item.unit}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reorder Level
            </label>
            {isEditing ? (
              <input
                type="number"
                name="reorderLevel"
                value={formData.reorderLevel}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
              />
            ) : (
              <p className="text-gray-900">
                {item.reorderLevel !== null
                  ? `${item.reorderLevel} ${item.unit}`
                  : '-'}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Purchase Rate
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                name="lastPurchaseRate"
                value={formData.lastPurchaseRate}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
              />
            ) : (
              <p className="text-gray-900">
                {item.lastPurchaseRate
                  ? `$${item.lastPurchaseRate.toFixed(2)}`
                  : '-'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stock Transactions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
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
                  Balance After
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {item.recentTransactions && item.recentTransactions.length > 0 ? (
                item.recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          tx.type === 'IN'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tx.referenceType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tx.qty > 0 ? '+' : ''}
                      {tx.qty} {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tx.balanceAfter} {item.unit}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tx.remarks || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {showAdjust && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Adjust Stock</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adjustment Type
                </label>
                <select
                  name="type"
                  value={adjustData.type}
                  onChange={handleAdjustChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="ADJUSTMENT">Adjustment</option>
                  <option value="IN">Stock In</option>
                  <option value="OUT">Stock Out</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="qty"
                  value={adjustData.qty}
                  onChange={handleAdjustChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter quantity"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use negative for decrease, positive for increase
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={adjustData.remarks}
                  onChange={handleAdjustChange}
                  className="w-full border rounded px-3 py-2"
                  rows="3"
                  placeholder="Reason for adjustment"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAdjust(false);
                  setAdjustData({ qty: '', type: 'ADJUSTMENT', remarks: '' });
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Adjust
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryItemDetail;

