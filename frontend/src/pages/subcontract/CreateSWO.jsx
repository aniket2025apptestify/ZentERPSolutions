import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  createSWO,
  selectSWOsError,
  clearError,
} from '../../store/slices/swoSlice';
import { fetchVendors, selectVendors } from '../../store/slices/vendorsSlice';
import { fetchProjects, selectProjects } from '../../store/slices/projectsSlice';
import { selectUser } from '../../store/slices/authSlice';
import { fetchItems, selectItems } from '../../store/slices/inventorySlice';

const CreateSWO = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const vendors = useSelector(selectVendors);
  const projects = useSelector(selectProjects);
  const inventoryItems = useSelector(selectItems);
  const error = useSelector(selectSWOsError);
  const currentUser = useSelector(selectUser);

  const [formData, setFormData] = useState({
    vendorId: '',
    projectId: '',
    subGroupId: '',
    description: '',
    expectedStart: '',
    expectedEnd: '',
    totalAmount: '',
    currency: 'AED',
    createdBy: currentUser?.id || '',
  });

  const [materialIssued, setMaterialIssued] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    dispatch(fetchVendors());
    dispatch(fetchProjects());
    dispatch(fetchItems());
  }, [dispatch]);

  useEffect(() => {
    if (currentUser?.id) {
      setFormData((prev) => ({ ...prev, createdBy: currentUser.id }));
    }
  }, [currentUser]);

  useEffect(() => {
    if (formData.projectId) {
      const project = projects.find((p) => p.id === formData.projectId);
      setSelectedProject(project);
    } else {
      setSelectedProject(null);
    }
  }, [formData.projectId, projects]);

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

  const handleAddMaterial = () => {
    setMaterialIssued([
      ...materialIssued,
      {
        itemId: '',
        qty: 1,
        uom: 'pcs',
        batchNo: '',
      },
    ]);
  };

  const handleMaterialChange = (index, field, value) => {
    const updated = [...materialIssued];
    updated[index][field] = field === 'qty' ? parseFloat(value) || 0 : value;
    
    // Auto-fill UOM from inventory item
    if (field === 'itemId' && value) {
      const item = inventoryItems.find((i) => i.id === value);
      if (item) {
        updated[index].uom = item.unit || item.uom || 'pcs';
      }
    }
    
    setMaterialIssued(updated);
  };

  const handleRemoveMaterial = (index) => {
    setMaterialIssued(materialIssued.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        materialIssued: materialIssued.length > 0 ? materialIssued : undefined,
        totalAmount: formData.totalAmount ? parseFloat(formData.totalAmount) : undefined,
        expectedStart: formData.expectedStart || undefined,
        expectedEnd: formData.expectedEnd || undefined,
      };

      const result = await dispatch(createSWO(payload)).unwrap();
      navigate(`/subcontract/swo/${result.swoId}`);
    } catch (err) {
      console.error('Failed to create SWO:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const subGroups = selectedProject?.subGroups || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create Subcontract Work Order</h1>
        <p className="mt-2 text-sm text-gray-600">Create a new subcontract work order</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor <span className="text-red-500">*</span>
              </label>
              <select
                name="vendorId"
                value={formData.vendorId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
              <select
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectCode} - {project.name}
                  </option>
                ))}
              </select>
            </div>

            {formData.projectId && subGroups.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sub Group</label>
                <select
                  name="subGroupId"
                  value={formData.subGroupId}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No Sub Group</option>
                  {subGroups.map((sg) => (
                    <option key={sg.id} value={sg.id}>
                      {sg.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expected Start</label>
              <input
                type="date"
                name="expectedStart"
                value={formData.expectedStart}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expected End</label>
              <input
                type="date"
                name="expectedEnd"
                value={formData.expectedEnd}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the subcontract work..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount</label>
              <input
                type="number"
                name="totalAmount"
                value={formData.totalAmount}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Material to Issue */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Material to Issue (Optional)</h2>
            <button
              type="button"
              onClick={handleAddMaterial}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              + Add Material
            </button>
          </div>

          {materialIssued.length > 0 && (
            <div className="space-y-3">
              {materialIssued.map((material, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                    <select
                      value={material.itemId}
                      onChange={(e) => handleMaterialChange(index, 'itemId', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Item</option>
                      {inventoryItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.itemName} ({item.availableQty} available)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
                    <input
                      type="number"
                      value={material.qty}
                      onChange={(e) => handleMaterialChange(index, 'qty', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">UOM</label>
                    <input
                      type="text"
                      value={material.uom}
                      onChange={(e) => handleMaterialChange(index, 'uom', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Batch No</label>
                    <input
                      type="text"
                      value={material.batchNo}
                      onChange={(e) => handleMaterialChange(index, 'batchNo', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(index)}
                      className="w-full px-3 py-2 text-sm text-red-600 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/subcontract/swo')}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create SWO'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSWO;
