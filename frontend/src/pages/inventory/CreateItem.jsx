import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  createItem,
  selectInventoryStatus,
  selectInventoryError,
  clearError,
} from '../../store/slices/inventorySlice';

const CreateItem = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const status = useSelector(selectInventoryStatus);
  const error = useSelector(selectInventoryError);

  const [formData, setFormData] = useState({
    itemName: '',
    itemCode: '',
    category: '',
    unit: '',
    openingQty: 0,
    reorderLevel: '',
    systemItem: true,
    lastPurchaseRate: '',
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.itemName || !formData.unit) {
      alert('Item name and unit are required');
      return;
    }

    try {
      const payload = {
        ...formData,
        openingQty: parseFloat(formData.openingQty) || 0,
        reorderLevel:
          formData.reorderLevel !== ''
            ? parseFloat(formData.reorderLevel)
            : null,
        lastPurchaseRate:
          formData.lastPurchaseRate !== ''
            ? parseFloat(formData.lastPurchaseRate)
            : null,
      };

      await dispatch(createItem(payload)).unwrap();
      navigate('/inventory/stock');
    } catch (err) {
      console.error('Create failed:', err);
    }
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
        <h1 className="text-3xl font-bold">Create Inventory Item</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              name="itemName"
              value={formData.itemName}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Code
            </label>
            <input
              type="text"
              name="itemCode"
              value={formData.itemCode}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to auto-generate
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit *
            </label>
            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2"
              required
              placeholder="e.g., pcs, meter, kg, sqm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opening Quantity
            </label>
            <input
              type="number"
              step="0.01"
              name="openingQty"
              value={formData.openingQty}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reorder Level
            </label>
            <input
              type="number"
              step="0.01"
              name="reorderLevel"
              value={formData.reorderLevel}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Alert when stock falls below this level
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Purchase Rate
            </label>
            <input
              type="number"
              step="0.01"
              name="lastPurchaseRate"
              value={formData.lastPurchaseRate}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2"
              min="0"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="systemItem"
                checked={formData.systemItem}
                onChange={handleInputChange}
              />
              <span className="text-sm font-medium text-gray-700">
                System Item
              </span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/inventory/stock')}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {status === 'loading' ? 'Creating...' : 'Create Item'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateItem;

