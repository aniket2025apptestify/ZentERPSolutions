import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  createJob,
  selectProductionError,
  clearError,
} from '../../store/slices/productionSlice';
import {
  fetchProjects,
  selectProjects,
  fetchProjectById,
  selectCurrentProject,
  clearCurrentProject,
} from '../../store/slices/projectsSlice';
import { selectUser } from '../../store/slices/authSlice';

const CreateJob = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const projects = useSelector(selectProjects);
  const currentProject = useSelector(selectCurrentProject);
  const error = useSelector(selectProductionError);
  const currentUser = useSelector(selectUser);

  const [formData, setFormData] = useState({
    projectId: '',
    subGroupId: '',
    plannedQty: '',
    plannedHours: '',
    assignedTo: '',
    stage: '',
  });

  const [plannedMaterial, setPlannedMaterial] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  // Fetch project details when projectId changes
  useEffect(() => {
    if (formData.projectId) {
      dispatch(fetchProjectById(formData.projectId));
    } else {
      dispatch(clearCurrentProject());
      setFormData((prev) => ({ ...prev, subGroupId: '' }));
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
      [name]:
        name === 'plannedQty' || name === 'plannedHours'
          ? value === '' ? '' : parseFloat(value)
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validation
    if (!formData.projectId || !formData.subGroupId || !formData.plannedQty) {
      alert('Please fill in all required fields: Project, Sub Group, and Planned Quantity');
      setIsSubmitting(false);
      return;
    }

    if (formData.plannedQty <= 0) {
      alert('Planned quantity must be greater than 0');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        projectId: formData.projectId,
        subGroupId: formData.subGroupId,
        plannedQty: parseFloat(formData.plannedQty),
        plannedHours: formData.plannedHours ? parseFloat(formData.plannedHours) : null,
        assignedTo: formData.assignedTo || null,
        stage: formData.stage || null,
        createdBy: currentUser?.id || currentUser?.userId,
        plannedMaterial: plannedMaterial.length > 0 ? plannedMaterial : null,
      };

      const result = await dispatch(createJob(payload)).unwrap();
      navigate(`/production/jobs/${result.id}`);
    } catch (err) {
      console.error('Failed to create job:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const subGroups = currentProject?.subGroups || [];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/production/board')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          ← Back to Production Board
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create Job Card</h1>
        <p className="mt-2 text-sm text-gray-600">Create a new production job card</p>
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

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project <span className="text-red-500">*</span>
            </label>
            <select
              name="projectId"
              value={formData.projectId}
              onChange={handleChange}
              required
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
                Sub Group <span className="text-red-500">*</span>
              </label>
              <select
                name="subGroupId"
                value={formData.subGroupId}
                onChange={handleChange}
                required
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
              Planned Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="plannedQty"
              value={formData.plannedQty}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter planned quantity"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Planned Hours
            </label>
            <input
              type="number"
              name="plannedHours"
              value={formData.plannedHours}
              onChange={handleChange}
              step="0.5"
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter planned hours"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned To (User ID)
            </label>
            <input
              type="text"
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter user ID (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Stage
            </label>
            <input
              type="text"
              name="stage"
              value={formData.stage}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Leave empty to use first stage"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty to use the first stage from tenant settings
            </p>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Job Card'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/production/board')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateJob;

