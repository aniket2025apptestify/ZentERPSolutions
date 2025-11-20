import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchProductionBoard,
  setBoardStages,
  selectProductionList,
  selectProductionStatus,
  selectProductionError,
  selectBoardStages,
  clearError,
} from '../../store/slices/productionSlice';
import { selectUser } from '../../store/slices/authSlice';
import ProductionCard from '../../components/production/ProductionCard';
import StageColumn from '../../components/production/StageColumn';

const ProductionBoard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const jobs = useSelector(selectProductionList);
  const status = useSelector(selectProductionStatus);
  const error = useSelector(selectProductionError);
  const boardStages = useSelector(selectBoardStages);
  const user = useSelector(selectUser);

  const [filters, setFilters] = useState({
    status: '',
    projectId: '',
    assignedTo: '',
  });
  const [pollingInterval, setPollingInterval] = useState(null);

  // Fetch tenant production stages on mount
  useEffect(() => {
    // Get production stages from user's tenant (would need to fetch tenant settings)
    // For now, use default stages or fetch from API
    const defaultStages = ['CUTTING', 'FABRICATION', 'ASSEMBLY', 'FINISHING', 'QC', 'DISPATCH'];
    dispatch(setBoardStages(defaultStages));
  }, [dispatch]);

  // Fetch jobs and set up polling
  useEffect(() => {
    dispatch(fetchProductionBoard(filters));

    // Set up polling every 10 seconds
    const interval = setInterval(() => {
      dispatch(fetchProductionBoard(filters));
    }, 10000);

    setPollingInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dispatch, filters]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Group jobs by stage
  const jobsByStage = boardStages.reduce((acc, stage) => {
    acc[stage] = jobs.filter((job) => job.stage === stage);
    return acc;
  }, {});

  const getStatusBadgeColor = (status) => {
    const colors = {
      NOT_STARTED: 'bg-gray-100 text-gray-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      REWORK: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Production Board</h1>
          <p className="mt-2 text-sm text-gray-600">
            Shop-floor production management
          </p>
        </div>
        <button
          onClick={() => navigate('/production/jobs/create')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + New Job Card
        </button>
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

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="REWORK">Rework</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned To
            </label>
            <input
              type="text"
              name="assignedTo"
              value={filters.assignedTo}
              onChange={handleFilterChange}
              placeholder="User ID"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => dispatch(fetchProductionBoard(filters))}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {status === 'loading' ? (
        <div className="p-8 text-center">Loading...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {boardStages.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              jobs={jobsByStage[stage] || []}
              onJobClick={(jobId) => navigate(`/production/jobs/${jobId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductionBoard;

