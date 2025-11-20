import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchQCById,
  selectCurrentQC,
  selectQCStatus,
  selectQCError,
  clearError,
  clearCurrent,
} from '../../store/slices/qcSlice';

const QCDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const qcRecord = useSelector(selectCurrentQC);
  const status = useSelector(selectQCStatus);
  const error = useSelector(selectQCError);

  useEffect(() => {
    if (id) {
      dispatch(fetchQCById(id));
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
      PASS: 'bg-green-100 text-green-800',
      FAIL: 'bg-red-100 text-red-800',
      NA: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityBadgeColor = (severity) => {
    const colors = {
      LOW: 'bg-blue-100 text-blue-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-red-100 text-red-800',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!qcRecord) {
    return <div className="p-8 text-center">QC record not found</div>;
  }

  const defects = qcRecord.defects
    ? Array.isArray(qcRecord.defects)
      ? qcRecord.defects
      : JSON.parse(qcRecord.defects)
    : [];

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => navigate('/qc')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to QC Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">QC Record Details</h1>
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
              QC Status
            </label>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeColor(
                qcRecord.qcStatus
              )}`}
            >
              {qcRecord.qcStatus}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Type
            </label>
            <p className="text-sm text-gray-900">
              {qcRecord.productionJobId ? 'Production Job' : 'Delivery Note'}
            </p>
          </div>

          {qcRecord.productionJobId && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Production Job
              </label>
              <p className="text-sm text-gray-900">
                {qcRecord.productionJob?.jobCardNumber || 'N/A'}
              </p>
              <button
                onClick={() =>
                  navigate(`/production/jobs/${qcRecord.productionJobId}`)
                }
                className="text-sm text-blue-600 hover:text-blue-800 mt-1"
              >
                View Job →
              </button>
            </div>
          )}

          {qcRecord.deliveryNoteId && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Delivery Note
              </label>
              <p className="text-sm text-gray-900">
                {qcRecord.deliveryNote?.dnNumber || 'N/A'}
              </p>
            </div>
          )}

          {qcRecord.stage && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Stage
              </label>
              <p className="text-sm text-gray-900">{qcRecord.stage}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Inspector ID
            </label>
            <p className="text-sm text-gray-900">{qcRecord.inspectorId}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Inspected At
            </label>
            <p className="text-sm text-gray-900">
              {new Date(qcRecord.inspectedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {qcRecord.remarks && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Remarks
            </label>
            <p className="text-sm text-gray-900">{qcRecord.remarks}</p>
          </div>
        )}

        {defects.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Defects
            </label>
            <div className="space-y-2">
              {defects.map((defect, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-gray-900">{defect.desc}</p>
                    {defect.severity && (
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getSeverityBadgeColor(
                          defect.severity
                        )}`}
                      >
                        {defect.severity}
                      </span>
                    )}
                  </div>
                  {defect.photoDocId && (
                    <p className="text-xs text-gray-500">
                      Photo: {defect.photoDocId}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QCDetail;

