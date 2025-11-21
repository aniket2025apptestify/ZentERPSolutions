import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchReworks,
  updateRework,
  selectReworkList,
  selectReworkStatus,
  selectReworkError,
  clearError,
} from '../../store/slices/reworkSlice';

const ReworkBoard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const reworks = useSelector(selectReworkList);
  const status = useSelector(selectReworkStatus);
  const error = useSelector(selectReworkError);

  const [filters, setFilters] = useState({
    status: '',
  });

  useEffect(() => {
    dispatch(fetchReworks(filters));
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

  const handleStatusChange = async (reworkId, newStatus) => {
    try {
      await dispatch(
        updateRework({
          id: reworkId,
          payload: { status: newStatus },
        })
      ).unwrap();
      dispatch(fetchReworks(filters));
    } catch (error) {
      console.error('Failed to update rework status:', error);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      OPEN: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredReworks = filters.status
    ? reworks.filter((r) => r.status === filters.status)
    : reworks;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Rework Board</h1>
        <p className="mt-2 text-sm text-gray-600">Manage rework jobs</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rework Jobs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {status === 'loading' ? (
          <div className="col-span-full p-8 text-center">Loading...</div>
        ) : filteredReworks.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500">
            No rework jobs found
          </div>
        ) : (
          filteredReworks.map((rework) => (
            <div
              key={rework.id}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Rework #{rework.id.slice(0, 8)}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {rework.sourceProductionJob?.jobCardNumber ||
                      rework.sourceDN?.dnNumber ||
                      'N/A'}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                    rework.status
                  )}`}
                >
                  {rework.status}
                </span>
              </div>

              {rework.notes && (
                <p className="text-sm text-gray-600 mb-2">{rework.notes}</p>
              )}

              <div className="text-xs text-gray-500 mb-2">
                <div>Expected: {rework.expectedHours || 0} hrs</div>
                <div>Actual: {rework.actualHours || 0} hrs</div>
              </div>

              <div className="flex gap-2 mt-3">
                {rework.status === 'OPEN' && (
                  <button
                    onClick={() => handleStatusChange(rework.id, 'IN_PROGRESS')}
                    className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Start
                  </button>
                )}
                {rework.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => handleStatusChange(rework.id, 'COMPLETED')}
                    className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Complete
                  </button>
                )}
                <button
                  onClick={() => navigate(`/rework/${rework.id}`)}
                  className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  View
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReworkBoard;

