import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createMaterialRequest,
  selectMaterialRequestsError,
  clearError,
} from '../../store/slices/materialRequestsSlice';
import { 
  fetchProjects, 
  selectProjects,
  fetchProjectById,
  selectCurrentProject,
  clearCurrentProject,
} from '../../store/slices/projectsSlice';
import { selectUser } from '../../store/slices/authSlice';

const CreateMaterialRequest = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projects = useSelector(selectProjects);
  const currentProject = useSelector(selectCurrentProject);
  const error = useSelector(selectMaterialRequestsError);
  const currentUser = useSelector(selectUser);

  const projectId = searchParams.get('projectId');
  const subGroupId = searchParams.get('subGroupId');

  const [formData, setFormData] = useState({
    projectId: projectId || '',
    subGroupId: subGroupId || '',
    requestedBy: currentUser?.id || '',
    notes: '',
  });

  const [items, setItems] = useState([
    {
      itemName: '',
      itemId: null,
      qty: 1,
      unit: 'pcs',
      systemItem: false,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchProjects());
    if (projectId) {
      dispatch(fetchProjectById(projectId));
    }
  }, [dispatch, projectId]);

  // Fetch project details when projectId changes in formData
  useEffect(() => {
    if (formData.projectId) {
      dispatch(fetchProjectById(formData.projectId));
    } else {
      // Clear current project when no project is selected
      dispatch(clearCurrentProject());
    }
  }, [formData.projectId, dispatch]);

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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Clear subGroupId when project changes
      ...(name === 'projectId' && { subGroupId: '' }),
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] =
      field === 'qty' ? parseFloat(value) || 0 : field === 'systemItem' ? value === 'true' : value;
    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        itemName: '',
        itemId: null,
        qty: 1,
        unit: 'pcs',
        systemItem: false,
      },
    ]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate items
      const validItems = items.filter((item) => item.itemName.trim() !== '');
      if (validItems.length === 0) {
        alert('Please add at least one item');
        setIsSubmitting(false);
        return;
      }

      // Validate requestedBy
      if (!formData.requestedBy || formData.requestedBy.trim() === '') {
        alert('Requested By is required');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        projectId: formData.projectId || null,
        subGroupId: formData.subGroupId || null,
        requestedBy: formData.requestedBy,
        notes: formData.notes || null,
        items: validItems.map((item) => ({
          itemName: item.itemName,
          itemId: item.itemId || null,
          qty: parseFloat(item.qty) || 0,
          unit: item.unit || 'pcs',
          systemItem: item.systemItem || false,
        })),
      };

      const result = await dispatch(createMaterialRequest(payload)).unwrap();
      // Navigate to the detail page using the returned id
      if (result && result.id) {
        navigate(`/procurement/material-requests/${result.id}`);
      } else {
        // Fallback: navigate to list
        navigate('/procurement/material-requests');
      }
    } catch (err) {
      console.error('Failed to create material request:', err);
      // Error will be displayed via the error state from Redux
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get the selected project - prefer currentProject (which has subGroups) over projects list
  const selectedProject = formData.projectId 
    ? (currentProject?.id === formData.projectId ? currentProject : projects.find((p) => p.id === formData.projectId))
    : null;
  const subGroups = selectedProject?.subGroups || [];

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => navigate('/procurement/material-requests')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          ← Back to Material Requests
        </button>
        <h1 className="text-3xl font-bold text-gray-900">New Material Request</h1>
        <p className="mt-2 text-sm text-gray-600">Create a new material request</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
              Requested By
            </label>
            <input
              type="text"
              name="requestedBy"
              value={formData.requestedBy}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={item.itemName}
                      onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                      min="0.01"
                      step="0.01"
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="pcs">Pcs</option>
                      <option value="sqm">Sqm</option>
                      <option value="kg">Kg</option>
                      <option value="m">M</option>
                      <option value="ltr">Ltr</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/procurement/material-requests')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Material Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateMaterialRequest;

