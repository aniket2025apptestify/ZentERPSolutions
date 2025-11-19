import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createProject,
  selectProjectsError,
  clearError,
} from '../store/slices/projectsSlice';
import { fetchClients } from '../store/slices/clientsSlice';
import { selectClients } from '../store/slices/clientsSlice';

const NewProject = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clients = useSelector(selectClients);
  const error = useSelector(selectProjectsError);

  const quotationId = searchParams.get('quotationId');

  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    type: 'EXTERNAL',
    startDate: '',
    plannedCost: '',
    notes: '',
  });

  const [subGroups, setSubGroups] = useState([
    {
      name: '',
      plannedQty: '',
      plannedArea: '',
      plannedMaterial: [],
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

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
      [name]: name === 'plannedCost' ? (value === '' ? '' : parseFloat(value)) : value,
    }));
  };

  const handleSubGroupChange = (index, field, value) => {
    const updated = [...subGroups];
    updated[index][field] =
      field === 'plannedQty' || field === 'plannedArea'
        ? value === '' ? '' : parseFloat(value) || ''
        : value;
    setSubGroups(updated);
  };

  const addSubGroup = () => {
    setSubGroups([
      ...subGroups,
      {
        name: '',
        plannedQty: '',
        plannedArea: '',
        plannedMaterial: [],
      },
    ]);
  };

  const removeSubGroup = (index) => {
    if (subGroups.length > 1) {
      setSubGroups(subGroups.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        quotationId: quotationId || null,
        plannedCost: formData.plannedCost ? parseFloat(formData.plannedCost) : null,
        startDate: formData.startDate || null,
        subGroups: subGroups
          .filter((sg) => sg.name.trim() !== '')
          .map((sg) => ({
            name: sg.name,
            plannedQty: sg.plannedQty ? parseFloat(sg.plannedQty) : null,
            plannedArea: sg.plannedArea ? parseFloat(sg.plannedArea) : null,
            plannedMaterial: sg.plannedMaterial || null,
          })),
      };

      const result = await dispatch(createProject(payload)).unwrap();
      navigate(`/projects/${result.project.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/projects')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          ← Back to Projects
        </button>
        <h1 className="text-3xl font-bold text-gray-900">New Project</h1>
        <p className="mt-2 text-sm text-gray-600">Create a new project</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select Client</option>
                {clients
                  .filter((c) => c.isActive)
                  .map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.companyName ? `- ${client.companyName}` : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="EXTERNAL">External</option>
                <option value="INTERNAL">Internal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planned Cost
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="plannedCost"
                value={formData.plannedCost}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        {/* Sub-Groups */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Sub-Groups</h2>
            <button
              type="button"
              onClick={addSubGroup}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + Add Sub-Group
            </button>
          </div>

          <div className="space-y-4">
            {subGroups.map((sg, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Sub-Group {index + 1}</h3>
                  {subGroups.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubGroup(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sg.name}
                      onChange={(e) =>
                        handleSubGroupChange(index, 'name', e.target.value)
                      }
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Planned Quantity
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={sg.plannedQty}
                      onChange={(e) =>
                        handleSubGroupChange(index, 'plannedQty', e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Planned Area (sqm)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={sg.plannedArea}
                      onChange={(e) =>
                        handleSubGroupChange(index, 'plannedArea', e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewProject;

