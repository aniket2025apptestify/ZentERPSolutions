import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchReworkById,
  selectCurrentRework,
  selectReworkStatus,
  selectReworkError,
  clearError,
  clearCurrent,
} from '../../store/slices/reworkSlice';

const ReworkDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const rework = useSelector(selectCurrentRework);
  const status = useSelector(selectReworkStatus);
  const error = useSelector(selectReworkError);

  useEffect(() => {
    if (id) {
      dispatch(fetchReworkById(id));
    }

    return () => {
      dispatch(clearCurrent());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const getStatusBadgeColor = (status) => {
    const colors = {
      OPEN: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!rework) {
    return <div className="p-8 text-center">Rework job not found</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => navigate('/rework')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Rework Board
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Rework #{rework.id.slice(0, 8)}
            </h1>
            <p className="mt-2 text-sm text-gray-600">Rework Job Details</p>
          </div>
          <span
            className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusBadgeColor(
              rework.status
            )}`}
          >
            {rework.status}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Status
            </label>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeColor(
                rework.status
              )}`}
            >
              {rework.status}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Source Type
            </label>
            <p className="text-sm text-gray-900">
              {rework.sourceProductionJobId ? 'Production Job' : rework.sourceDNId ? 'Delivery Note' : 'N/A'}
            </p>
          </div>

          {rework.sourceProductionJob && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Source Production Job
              </label>
              <p className="text-sm text-gray-900">
                {rework.sourceProductionJob.jobCardNumber || 'N/A'}
              </p>
              {rework.sourceProductionJob.project && (
                <p className="text-xs text-gray-500 mt-1">
                  {rework.sourceProductionJob.project.projectCode} - {rework.sourceProductionJob.project.name}
                </p>
              )}
              <button
                onClick={() =>
                  navigate(`/production/jobs/${rework.sourceProductionJobId}`)
                }
                className="text-sm text-blue-600 hover:text-blue-800 mt-1"
              >
                View Job →
              </button>
            </div>
          )}

          {rework.sourceDN && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Source Delivery Note
              </label>
              <p className="text-sm text-gray-900">
                {rework.sourceDN.dnNumber || 'N/A'}
              </p>
              {rework.sourceDN.project && (
                <p className="text-xs text-gray-500 mt-1">
                  {rework.sourceDN.project.projectCode} - {rework.sourceDN.project.name}
                </p>
              )}
            </div>
          )}

          {rework.assignedTo && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Assigned To
              </label>
              <p className="text-sm text-gray-900">{rework.assignedTo}</p>
            </div>
          )}

          {rework.createdBy && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Created By
              </label>
              <p className="text-sm text-gray-900">{rework.createdBy}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Expected Hours
            </label>
            <p className="text-sm text-gray-900">
              {rework.expectedHours ? `${rework.expectedHours} hrs` : 'N/A'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Actual Hours
            </label>
            <p className="text-sm text-gray-900">
              {rework.actualHours ? `${rework.actualHours} hrs` : '0 hrs'}
            </p>
          </div>

          {rework.createdAt && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Created At
              </label>
              <p className="text-sm text-gray-900">
                {new Date(rework.createdAt).toLocaleString()}
              </p>
            </div>
          )}

          {rework.updatedAt && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Last Updated
              </label>
              <p className="text-sm text-gray-900">
                {new Date(rework.updatedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {rework.notes && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Notes
            </label>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{rework.notes}</p>
          </div>
        )}

        {rework.materialNeeded && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Material Needed
            </label>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{rework.materialNeeded}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReworkDetail;

