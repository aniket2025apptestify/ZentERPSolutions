import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { updateJobStatus } from '../../store/slices/productionSlice';

const ProductionCard = ({ job, onJobClick }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

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

  const handleStart = async (e) => {
    e.stopPropagation();
    try {
      await dispatch(
        updateJobStatus({
          jobId: job.id,
          payload: {
            status: 'IN_PROGRESS',
            performedBy: job.assignedTo,
          },
        })
      ).unwrap();
    } catch (error) {
      console.error('Failed to start job:', error);
    }
  };

  const handleComplete = async (e) => {
    e.stopPropagation();
    try {
      await dispatch(
        updateJobStatus({
          jobId: job.id,
          payload: {
            status: 'COMPLETED',
            performedBy: job.assignedTo,
          },
        })
      ).unwrap();
    } catch (error) {
      console.error('Failed to complete job:', error);
    }
  };

  const progress = job.plannedQty
    ? ((job.actualQty || 0) / job.plannedQty) * 100
    : 0;

  return (
    <div
      className="bg-white rounded-lg shadow p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onJobClick(job.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-sm text-gray-900">
            {job.jobCardNumber}
          </h3>
          <p className="text-xs text-gray-600">
            {job.project?.projectCode || 'N/A'}
          </p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
            job.status
          )}`}
        >
          {job.status}
        </span>
      </div>

      <div className="mb-2">
        <p className="text-xs text-gray-600">
          {job.subGroup?.name || 'N/A'}
        </p>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-600 mb-2">
        <span>Qty: {job.actualQty || 0}/{job.plannedQty || 0}</span>
        <span>Hours: {job.actualHours || 0}/{job.plannedHours || 0}</span>
      </div>

      {job.assignedTo && (
        <div className="text-xs text-gray-500 mb-2">
          Assigned: {job.assignedTo}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        {job.status === 'NOT_STARTED' && (
          <button
            onClick={handleStart}
            className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          >
            Start
          </button>
        )}
        {job.status === 'IN_PROGRESS' && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/production/jobs/${job.id}?action=log`);
              }}
              className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Log Hours
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              Complete
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductionCard;

