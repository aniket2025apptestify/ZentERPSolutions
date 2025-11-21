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
import { fetchClients } from '../../store/slices/clientsSlice';
import { selectClients } from '../../store/slices/clientsSlice';
import { fetchMaterialRequestById } from '../../store/slices/materialRequestsSlice';
import { selectCurrentMaterialRequest } from '../../store/slices/materialRequestsSlice';
import { selectUser } from '../../store/slices/authSlice';

const CreatePurchaseOrder = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vendors = useSelector(selectVendors);
  const projects = useSelector(selectProjects);
  const clients = useSelector(selectClients);
  const materialRequest = useSelector(selectCurrentMaterialRequest);
  const error = useSelector(selectPurchaseOrdersError);
  const currentUser = useSelector(selectUser);

  const mrId = searchParams.get('mrId');
  const vendorQuoteId = searchParams.get('vendorQuoteId');
  const vendorIdFromUrl = searchParams.get('vendorId');

  const [formData, setFormData] = useState({
    vendorId: vendorIdFromUrl || '',
    clientId: '',
    materialRequestId: mrId || '',
    projectId: '',
    subGroupId: '',
    createdBy: currentUser?.id || '',
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
    dispatch(fetchClients());
    if (mrId) {
      dispatch(fetchMaterialRequestById(mrId));
    }
  }, [dispatch, mrId]);

  // Set vendorId from URL params if available
  useEffect(() => {
    if (vendorIdFromUrl) {
      setFormData((prev) => ({
        ...prev,
        vendorId: vendorIdFromUrl,
      }));
    }
  }, [vendorIdFromUrl]);

  // Update createdBy when user is loaded
  useEffect(() => {
    if (currentUser?.id) {
      setFormData((prev) => ({
        ...prev,
        createdBy: currentUser.id,
      }));
    }
  }, [currentUser]);

  useEffect(() => {
    if (materialRequest) {
      setFormData((prev) => ({
        ...prev,
        projectId: materialRequest.projectId || '',
        subGroupId: materialRequest.subGroupId || '',
      }));
      // Auto-populate client from project if project is linked
      if (materialRequest.projectId) {
        const project = projects.find((p) => p.id === materialRequest.projectId);
        if (project?.clientId) {
          setFormData((prev) => ({
            ...prev,
            clientId: project.clientId,
          }));
        }
      }
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
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-populate client from project when project is selected
      if (name === 'projectId' && value) {
        const project = projects.find((p) => p.id === value);
        if (project?.clientId) {
          updated.clientId = project.clientId;
        }
      }
      return updated;
    });
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
    
    // Validation
    if (!formData.vendorId) {
      alert('Please select a supplier');
      return;
    }
    
    // Use currentUser.id if createdBy is not set
    const finalCreatedBy = formData.createdBy || currentUser?.id;
    if (!finalCreatedBy) {
      alert('User information is missing. Please refresh the page.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        createdBy: finalCreatedBy,
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
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <button
          onClick={() => navigate('/procurement/purchase-orders')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Purchase Orders
        </button>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">New Purchase Order</h1>
        <p className="mt-2 text-sm text-gray-600">Create a new purchase order for your supplier</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start">
          <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Supplier <span className="text-red-500">*</span>
              </label>
              <select
                name="vendorId"
                value={formData.vendorId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
              >
                <option value="">Select Supplier</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Client <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <select
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName || client.name}
                  </option>
                ))}
              </select>
              {formData.projectId && (
                <p className="mt-2 text-xs text-blue-600 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Client will be auto-filled from selected project
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Project <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <select
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sub Group <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <select
                  name="subGroupId"
                  value={formData.subGroupId}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Delivery Date
              </label>
              <input
                type="date"
                name="deliveryDate"
                value={formData.deliveryDate}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
              />
            </div>
          </div>
        </div>

        {/* PO Lines Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">PO Lines</h2>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Line
            </button>
          </div>

          <div className="space-y-4">
            {lines.map((line, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-5 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                      placeholder="Enter item description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={line.qty}
                      onChange={(e) => handleLineChange(index, 'qty', e.target.value)}
                      min="0.01"
                      step="0.01"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Unit Rate <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={line.unitRate}
                      onChange={(e) => handleLineChange(index, 'unitRate', e.target.value)}
                      min="0"
                      step="0.01"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>

                  <div className="flex items-end">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="w-full px-4 py-2.5 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 font-medium transition-colors text-sm border border-red-200"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Line Total:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      ${(line.qty * line.unitRate).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total Amount:</span>
              <span className="text-2xl font-bold text-gray-900">
                ${calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/procurement/purchase-orders')}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : (
              'Create Purchase Order'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePurchaseOrder;

