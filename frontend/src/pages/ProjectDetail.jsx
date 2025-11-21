import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchProjectById,
  updateProject,
  addSubGroup,
  fetchProjectProgress,
  completeProject,
  selectCurrentProject,
  selectProjectsStatus,
  selectProjectsError,
  clearError,
  clearCurrentProject,
} from '../store/slices/projectsSlice';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const project = useSelector(selectCurrentProject);
  const status = useSelector(selectProjectsStatus);
  const error = useSelector(selectProjectsError);

  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showAddSubGroup, setShowAddSubGroup] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    status: '',
    notes: '',
    endDate: '',
    plannedCost: '',
  });
  const [subGroupData, setSubGroupData] = useState({
    name: '',
    plannedQty: '',
    plannedArea: '',
  });
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (id) {
      dispatch(fetchProjectById(id));
      dispatch(fetchProjectProgress(id));
    }

    return () => {
      dispatch(clearCurrentProject());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        status: project.status || '',
        notes: project.notes || '',
        endDate: project.endDate
          ? new Date(project.endDate).toISOString().split('T')[0]
          : '',
        plannedCost: project.plannedCost || '',
      });
    }
  }, [project]);

  useEffect(() => {
    if (id) {
      dispatch(fetchProjectProgress(id)).then((result) => {
        if (result.payload) {
          setProgress(result.payload.progress);
        }
      });
    }
  }, [id, dispatch, project?.subGroups]);

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
      [name]:
        name === 'plannedCost'
          ? value === '' ? '' : parseFloat(value)
          : value,
    }));
  };

  const handleSave = async () => {
    try {
      await dispatch(
        updateProject({
          id: project.id,
          payload: {
            ...formData,
            plannedCost: formData.plannedCost ? parseFloat(formData.plannedCost) : null,
            endDate: formData.endDate || null,
          },
        })
      ).unwrap();
      setIsEditing(false);
      dispatch(fetchProjectById(id));
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  };

  const handleAddSubGroup = async (e) => {
    e.preventDefault();
    try {
      await dispatch(
        addSubGroup({
          projectId: project.id,
          payload: {
            name: subGroupData.name,
            plannedQty: subGroupData.plannedQty ? parseFloat(subGroupData.plannedQty) : null,
            plannedArea: subGroupData.plannedArea ? parseFloat(subGroupData.plannedArea) : null,
          },
        })
      ).unwrap();
      setShowAddSubGroup(false);
      setSubGroupData({ name: '', plannedQty: '', plannedArea: '' });
      dispatch(fetchProjectById(id));
      dispatch(fetchProjectProgress(id));
    } catch (err) {
      console.error('Failed to add sub-group:', err);
    }
  };

  const handleComplete = async () => {
    if (
      !window.confirm(
        'Are you sure you want to mark this project as completed?'
      )
    ) {
      return;
    }

    try {
      await dispatch(completeProject(project.id)).unwrap();
      dispatch(fetchProjectById(id));
    } catch (err) {
      console.error('Failed to complete project:', err);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      PLANNED: 'bg-blue-100 text-blue-800',
      RUNNING: 'bg-green-100 text-green-800',
      HOLD: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!project) {
    return <div className="p-8 text-center">Project not found</div>;
  }

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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {project.projectCode}
            </h1>
            <p className="mt-2 text-sm text-gray-600">{project.name}</p>
          </div>
          <div className="flex gap-2">
            <span
              className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                project.status
              )}`}
            >
              {project.status}
            </span>
            {project.status !== 'COMPLETED' && (
              <>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
                {project.status === 'RUNNING' && (
                  <button
                    onClick={handleComplete}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Complete
                  </button>
                )}
              </>
            )}
          </div>
        </div>
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

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'subgroups', 'progress', 'materials', 'costing'].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
              >
                {tab}
              </button>
            )
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <div className="text-gray-900">
                  {project.client?.name}
                  {project.client?.companyName && (
                    <div className="text-sm text-gray-500">
                      {project.client.companyName}
                    </div>
                  )}
                </div>
              </div>

              {isEditing ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="PLANNED">Planned</option>
                      <option value="RUNNING">Running</option>
                      <option value="HOLD">Hold</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Planned Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="plannedCost"
                      value={formData.plannedCost}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <div className="text-gray-900">{project.type}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <div className="text-gray-900">
                      {project.startDate
                        ? new Date(project.startDate).toLocaleDateString()
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Planned Cost
                    </label>
                    <div className="text-gray-900">
                      {formatCurrency(project.plannedCost)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Actual Cost
                    </label>
                    <div className="text-gray-900">
                      {formatCurrency(project.actualCost)}
                    </div>
                  </div>
                </>
              )}

              {project.quotation && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quotation
                  </label>
                  <div className="text-gray-900">
                    {project.quotation.quotationNumber}
                  </div>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            )}

            {project.notes && !isEditing && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <div className="text-gray-900 whitespace-pre-wrap">
                  {project.notes}
                </div>
              </div>
            )}

            {isEditing && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'subgroups' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Sub-Groups</h2>
              {project.status !== 'COMPLETED' && (
                <button
                  onClick={() => setShowAddSubGroup(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  + Add Sub-Group
                </button>
              )}
            </div>

            {project.subGroups && project.subGroups.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Planned Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actual Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Dispatched Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {project.subGroups.map((sg) => (
                      <tr key={sg.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {sg.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {sg.plannedQty || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {sg.actualQty || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {sg.dispatchedQty || 0}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {sg.completed ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Completed
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              In Progress
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No sub-groups found
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Project Progress</h2>
            {progress ? (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Overall Progress
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {progress.overall.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full"
                      style={{ width: `${progress.overall}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-semibold mb-3">Sub-Group Progress</h3>
                  <div className="space-y-4">
                    {progress.subGroups.map((sg) => (
                      <div key={sg.id}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-700">{sg.name}</span>
                          <span className="text-sm text-gray-900">
                            {sg.percentComplete.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              sg.completed ? 'bg-green-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${sg.percentComplete}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-semibold mb-3">Production Status</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded">
                      <div className="text-2xl font-bold text-blue-600">
                        {progress.production.running}
                      </div>
                      <div className="text-sm text-gray-600">Running</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {progress.production.completed}
                      </div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded">
                      <div className="text-2xl font-bold text-yellow-600">
                        {progress.production.pending}
                      </div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">Loading progress...</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Materials</h2>
          {progress ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">
                    {progress.materials.planned}
                  </div>
                  <div className="text-sm text-gray-600">Planned</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">
                    {progress.materials.consumed}
                  </div>
                  <div className="text-sm text-gray-600">Consumed</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded">
                  <div className="text-2xl font-bold text-yellow-600">
                    {progress.materials.remaining}
                  </div>
                  <div className="text-sm text-gray-600">Remaining</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Material tracking will be available in Phase 9
            </div>
          )}
        </div>
      )}

      {activeTab === 'costing' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Costing</h2>
          {progress ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <div className="text-sm text-gray-600 mb-1">Planned Cost</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(progress.cost.plannedCost)}
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <div className="text-sm text-gray-600 mb-1">Actual Cost</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(progress.cost.actualCost)}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-600 mb-1">Variance</div>
                <div
                  className={`text-xl font-bold ${
                    progress.cost.actualCost > progress.cost.plannedCost
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {formatCurrency(
                    progress.cost.actualCost - progress.cost.plannedCost
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">Loading costing data...</div>
          )}
        </div>
      )}

      {/* Add Sub-Group Modal */}
      {showAddSubGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add Sub-Group</h2>
            <form onSubmit={handleAddSubGroup}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subGroupData.name}
                    onChange={(e) =>
                      setSubGroupData({ ...subGroupData, name: e.target.value })
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
                    value={subGroupData.plannedQty}
                    onChange={(e) =>
                      setSubGroupData({
                        ...subGroupData,
                        plannedQty: e.target.value,
                      })
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
                    value={subGroupData.plannedArea}
                    onChange={(e) =>
                      setSubGroupData({
                        ...subGroupData,
                        plannedArea: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSubGroup(false);
                    setSubGroupData({ name: '', plannedQty: '', plannedArea: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;

