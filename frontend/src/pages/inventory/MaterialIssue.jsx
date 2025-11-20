import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  issueMaterial,
  fetchItems,
  selectItems,
  selectInventoryStatus,
  selectInventoryError,
  clearError,
} from '../../store/slices/inventorySlice';
import { fetchProjects, selectProjects } from '../../store/slices/projectsSlice';

const MaterialIssue = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector(selectItems);
  const projects = useSelector(selectProjects);
  const status = useSelector(selectInventoryStatus);
  const error = useSelector(selectInventoryError);

  const [formData, setFormData] = useState({
    jobId: '',
    projectId: '',
    subGroupId: '',
    issuedBy: '',
    issuedAt: new Date().toISOString().slice(0, 16),
  });

  const [issueItems, setIssueItems] = useState([
    { itemId: '', qty: '', uom: '', wastage: '', remarks: '' },
  ]);

  useEffect(() => {
    dispatch(fetchItems({ limit: 1000 }));
    dispatch(fetchProjects());
  }, [dispatch]);

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

  const handleItemChange = (index, field, value) => {
    const updated = [...issueItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-fill UOM from selected item
    if (field === 'itemId') {
      const selectedItem = items.find((item) => item.id === value);
      if (selectedItem) {
        updated[index].uom = selectedItem.unit;
      }
    }

    setIssueItems(updated);
  };

  const addItem = () => {
    setIssueItems([
      ...issueItems,
      { itemId: '', qty: '', uom: '', wastage: '', remarks: '' },
    ]);
  };

  const removeItem = (index) => {
    setIssueItems(issueItems.filter((_, i) => i !== index));
  };

  const getAvailableQty = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return 0;
    return item.availableQty - (item.reservedQty || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.jobId || !formData.issuedBy) {
      alert('Please fill in job ID and issued by');
      return;
    }

    const processedItems = issueItems
      .filter((item) => item.itemId && item.qty)
      .map((item) => ({
        itemId: item.itemId,
        qty: parseFloat(item.qty),
        uom: item.uom || 'pcs',
        wastage: parseFloat(item.wastage || 0),
        remarks: item.remarks || '',
      }));

    if (processedItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    try {
      await dispatch(
        issueMaterial({
          ...formData,
          items: processedItems,
        })
      ).unwrap();

      alert('Material issued successfully!');
      navigate('/inventory/stock');
    } catch (err) {
      console.error('Issue failed:', err);
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
        <h1 className="text-3xl font-bold">Issue Material to Production</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Production Job ID *
            </label>
            <input
              type="text"
              name="jobId"
              value={formData.jobId}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2"
              required
              placeholder="Enter job card number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project ID
            </label>
            <select
              name="projectId"
              value={formData.projectId}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectCode} - {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issued By *
            </label>
            <input
              type="text"
              name="issuedBy"
              value={formData.issuedBy}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issue Date & Time
            </label>
            <input
              type="datetime-local"
              name="issuedAt"
              value={formData.issuedAt}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">Items to Issue</h2>
            <button
              type="button"
              onClick={addItem}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-4">
            {issueItems.map((item, index) => (
              <div
                key={index}
                className="border rounded p-4 grid grid-cols-1 md:grid-cols-6 gap-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item *
                  </label>
                  <select
                    value={item.itemId}
                    onChange={(e) =>
                      handleItemChange(index, 'itemId', e.target.value)
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">Select Item</option>
                    {items.map((invItem) => (
                      <option key={invItem.id} value={invItem.id}>
                        {invItem.itemName} ({invItem.itemCode || 'N/A'})
                      </option>
                    ))}
                  </select>
                  {item.itemId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Available: {getAvailableQty(item.itemId)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.qty}
                    onChange={(e) =>
                      handleItemChange(index, 'qty', e.target.value)
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UOM
                  </label>
                  <input
                    type="text"
                    value={item.uom}
                    onChange={(e) =>
                      handleItemChange(index, 'uom', e.target.value)
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wastage
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.wastage}
                    onChange={(e) =>
                      handleItemChange(index, 'wastage', e.target.value)
                    }
                    className="w-full border rounded px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <input
                    type="text"
                    value={item.remarks}
                    onChange={(e) =>
                      handleItemChange(index, 'remarks', e.target.value)
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
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
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {status === 'loading' ? 'Issuing...' : 'Issue Material'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MaterialIssue;

