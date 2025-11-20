import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createPurchaseOrder,
  selectPurchaseOrdersError,
  clearError,
} from '../../store/slices/purchaseOrdersSlice';
import { fetchVendors } from '../../store/slices/vendorsSlice';
import { selectVendors } from '../../store/slices/vendorsSlice';
import { fetchProjects } from '../../store/slices/projectsSlice';
import { selectProjects } from '../../store/slices/projectsSlice';
import { fetchMaterialRequestById } from '../../store/slices/materialRequestsSlice';
import { selectCurrentMaterialRequest } from '../../store/slices/materialRequestsSlice';
import { selectUser } from '../../store/slices/authSlice';

const CreatePurchaseOrder = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vendors = useSelector(selectVendors);
  const projects = useSelector(selectProjects);
  const materialRequest = useSelector(selectCurrentMaterialRequest);
  const error = useSelector(selectPurchaseOrdersError);
  const currentUser = useSelector(selectUser);

  const mrId = searchParams.get('mrId');
  const vendorQuoteId = searchParams.get('vendorQuoteId');

  const [formData, setFormData] = useState({
    vendorId: '',
    materialRequestId: mrId || '',
    projectId: '',
    subGroupId: '',
    createdBy: currentUser?.userId || '',
    deliveryDate: '',
  });

  const [lines, setLines] = useState([
    {
      itemId: null,
      description: '',
      qty: 1,
      unit: 'pcs',
      unitRate: 0,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchVendors());
    dispatch(fetchProjects());
    if (mrId) {
      dispatch(fetchMaterialRequestById(mrId));
    }
  }, [dispatch, mrId]);

  useEffect(() => {
    if (materialRequest) {
      setFormData((prev) => ({
        ...prev,
        projectId: materialRequest.projectId || '',
        subGroupId: materialRequest.subGroupId || '',
      }));
      if (materialRequest.items && Array.isArray(materialRequest.items)) {
        setLines(
          materialRequest.items.map((item) => ({
            itemId: item.itemId || null,
            description: item.itemName,
            qty: item.qty,
            unit: item.unit || 'pcs',
            unitRate: 0,
          }))
        );
      }
    }
  }, [materialRequest]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...lines];
    updated[index][field] =
      field === 'qty' || field === 'unitRate'
        ? parseFloat(value) || 0
        : value;
    setLines(updated);
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        itemId: null,
        description: '',
        qty: 1,
        unit: 'pcs',
        unitRate: 0,
      },
    ]);
  };

  const removeLine = (index) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    return lines.reduce((sum, line) => sum + line.qty * line.unitRate, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        projectId: formData.projectId || null,
        subGroupId: formData.subGroupId || null,
        deliveryDate: formData.deliveryDate || null,
        lines: lines.filter((line) => line.description.trim() !== ''),
      };

      const result = await dispatch(createPurchaseOrder(payload)).unwrap();
      navigate(`/procurement/purchase-orders/${result.id}`);
    } catch (err) {
      console.error('Failed to create purchase order:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === formData.projectId);
  const subGroups = selectedProject?.subGroups || [];

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => navigate('/procurement/purchase-orders')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          ← Back to Purchase Orders
        </button>
        <h1 className="text-3xl font-bold text-gray-900">New Purchase Order</h1>
        <p className="mt-2 text-sm text-gray-600">Create a new purchase order</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">{error}</h3>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor *
            </label>
            <select
              name="vendorId"
              value={formData.vendorId}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project (Optional)
            </label>
            <select
              name="projectId"
              value={formData.projectId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectCode} - {project.name}
                </option>
              ))}
            </select>
          </div>

          {formData.projectId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub Group (Optional)
              </label>
              <select
                name="subGroupId"
                value={formData.subGroupId}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select Sub Group</option>
                {subGroups.map((sg) => (
                  <option key={sg.id} value={sg.id}>
                    {sg.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Date
            </label>
            <input
              type="date"
              name="deliveryDate"
              value={formData.deliveryDate}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">PO Lines</h2>
            <button
              type="button"
              onClick={addLine}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
            >
              + Add Line
            </button>
          </div>

          <div className="space-y-4">
            {lines.map((line, index) => (
              <div key={index} className="border border-gray-200 rounded-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Qty *
                    </label>
                    <input
                      type="number"
                      value={line.qty}
                      onChange={(e) => handleLineChange(index, 'qty', e.target.value)}
                      min="0.01"
                      step="0.01"
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Rate *
                    </label>
                    <input
                      type="number"
                      value={line.unitRate}
                      onChange={(e) => handleLineChange(index, 'unitRate', e.target.value)}
                      min="0"
                      step="0.01"
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div className="flex items-end">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Amount: ${(line.qty * line.unitRate).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-right">
            <p className="text-lg font-semibold">
              Total Amount: ${calculateTotal().toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/procurement/purchase-orders')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Purchase Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePurchaseOrder;

