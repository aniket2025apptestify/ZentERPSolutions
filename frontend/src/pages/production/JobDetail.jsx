import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  fetchJobDetails,
  updateJobStatus,
  logJobHours,
  createQCRecord,
  assignJob,
  selectCurrentJob,
  selectProductionStatus,
  selectProductionError,
  clearError,
  clearCurrentJob,
} from '../../store/slices/productionSlice';
import LogHoursForm from '../../components/production/LogHoursForm';
import QCForm from '../../components/production/QCForm';

const JobDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const job = useSelector(selectCurrentJob);
  const status = useSelector(selectProductionStatus);
  const error = useSelector(selectProductionError);

  const [activeTab, setActiveTab] = useState('overview');
  const [showLogHours, setShowLogHours] = useState(false);
  const [showQCForm, setShowQCForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTo, setAssignTo] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchJobDetails(id));
    }

    // Check if action parameter is set
    const action = searchParams.get('action');
    if (action === 'log') {
      setShowLogHours(true);
    } else if (action === 'qc') {
      setShowQCForm(true);
    }

    return () => {
      dispatch(clearCurrentJob());
    };
  }, [id, dispatch, searchParams]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleStartStage = async () => {
    try {
      await dispatch(
        updateJobStatus({
          jobId: id,
          payload: {
            status: 'IN_PROGRESS',
            performedBy: job?.assignedTo,
          },
        })
      ).unwrap();
      dispatch(fetchJobDetails(id));
    } catch (error) {
      console.error('Failed to start stage:', error);
    }
  };

  const handleCompleteStage = async () => {
    try {
      await dispatch(
        updateJobStatus({
          jobId: id,
          payload: {
            status: 'COMPLETED',
            performedBy: job?.assignedTo,
          },
        })
      ).unwrap();
      dispatch(fetchJobDetails(id));
    } catch (error) {
      console.error('Failed to complete stage:', error);
    }
  };

  const handleAssign = async () => {
    try {
      await dispatch(
        assignJob({
          jobId: id,
          payload: {
            assignedTo: assignTo,
          },
        })
      ).unwrap();
      dispatch(fetchJobDetails(id));
      setShowAssignModal(false);
      setAssignTo('');
    } catch (error) {
      console.error('Failed to assign job:', error);
    }
  };

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

  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!job) {
    return <div className="p-8 text-center">Job not found</div>;
  }

  const progress = job.plannedQty
    ? ((job.actualQty || 0) / job.plannedQty) * 100
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/production/board')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Board
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {job.jobCardNumber}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {job.project?.name} - {job.subGroup?.name}
            </p>
          </div>
          <div className="flex gap-2">
            {job.status === 'NOT_STARTED' && (
              <button
                onClick={handleStartStage}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Start Stage
              </button>
            )}
            {job.status === 'IN_PROGRESS' && (
              <>
                <button
                  onClick={() => setShowLogHours(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Log Hours
                </button>
                <button
                  onClick={handleCompleteStage}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Complete Stage
                </button>
              </>
            )}
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Assign
            </button>
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

      {/* Job Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Status</div>
          <div className="mt-1">
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                job.status
              )}`}
            >
              {job.status}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Current Stage</div>
          <div className="mt-1 text-lg font-semibold">{job.stage}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Progress</div>
          <div className="mt-1 text-lg font-semibold">{progress.toFixed(0)}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Quantity</div>
          <div className="mt-1 text-lg font-semibold">
            {job.actualQty || 0} / {job.plannedQty || 0}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['overview', 'logs', 'materials', 'qc'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Job Information</h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-600">Job Card Number</dt>
                    <dd className="mt-1 text-sm font-medium">{job.jobCardNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Project</dt>
                    <dd className="mt-1 text-sm font-medium">
                      {job.project?.projectCode} - {job.project?.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Sub Group</dt>
                    <dd className="mt-1 text-sm font-medium">{job.subGroup?.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Assigned To</dt>
                    <dd className="mt-1 text-sm font-medium">
                      {job.assignedTo || 'Unassigned'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Planned Hours</dt>
                    <dd className="mt-1 text-sm font-medium">
                      {job.plannedHours || 0} hrs
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Actual Hours</dt>
                    <dd className="mt-1 text-sm font-medium">
                      {job.actualHours || 0} hrs
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Production Logs</h3>
                <button
                  onClick={() => setShowLogHours(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  + Log Hours
                </button>
              </div>
              <div className="space-y-4">
                {job.productionStageLogs?.length === 0 ? (
                  <p className="text-gray-500">No logs yet</p>
                ) : (
                  job.productionStageLogs?.map((log) => (
                    <div
                      key={log.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{log.stage}</h4>
                          <p className="text-sm text-gray-600">
                            {log.startedAt
                              ? new Date(log.startedAt).toLocaleString()
                              : 'Not started'}
                            {log.completedAt &&
                              ` - ${new Date(log.completedAt).toLocaleString()}`}
                          </p>
                        </div>
                        {log.qcStatus && (
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              log.qcStatus === 'PASS'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            QC: {log.qcStatus}
                          </span>
                        )}
                      </div>
                      {log.hoursLogged && (
                        <p className="text-sm text-gray-600">
                          Hours: {log.hoursLogged}
                        </p>
                      )}
                      {log.outputQty && (
                        <p className="text-sm text-gray-600">
                          Output: {log.outputQty}
                        </p>
                      )}
                      {log.notes && (
                        <p className="text-sm text-gray-600 mt-2">{log.notes}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Materials Tab */}
          {activeTab === 'materials' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Material Consumption</h3>
              {job.materialIssues?.length === 0 ? (
                <p className="text-gray-500">No material issues yet</p>
              ) : (
                <div className="space-y-4">
                  {job.materialIssues?.map((issue) => (
                    <div
                      key={issue.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">
                            Issue #{issue.id.slice(0, 8)}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {new Date(issue.issuedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        {Array.isArray(issue.items) &&
                          issue.items.map((item, idx) => (
                            <div key={idx} className="text-sm text-gray-600">
                              {item.itemName || item.itemId}: {item.qty} {item.uom || ''}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* QC Tab */}
          {activeTab === 'qc' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">QC Records</h3>
                <button
                  onClick={() => setShowQCForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  + Add QC Record
                </button>
              </div>
              <div className="space-y-4">
                {job.qcRecords?.length === 0 ? (
                  <p className="text-gray-500">No QC records yet</p>
                ) : (
                  job.qcRecords?.map((qc) => (
                    <div
                      key={qc.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">Stage: {qc.stage}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(qc.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            qc.qcStatus === 'PASS'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {qc.qcStatus}
                        </span>
                      </div>
                      {qc.remarks && (
                        <p className="text-sm text-gray-600 mt-2">{qc.remarks}</p>
                      )}
                      {qc.defects && Array.isArray(qc.defects) && qc.defects.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-semibold">Defects:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600">
                            {qc.defects.map((defect, idx) => (
                              <li key={idx}>{defect.desc}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showLogHours && (
        <LogHoursForm
          jobId={id}
          stage={job.stage}
          onClose={() => setShowLogHours(false)}
          onSuccess={() => {
            setShowLogHours(false);
            dispatch(fetchJobDetails(id));
          }}
        />
      )}

      {showQCForm && (
        <QCForm
          jobId={id}
          stage={job.stage}
          onClose={() => setShowQCForm(false)}
          onSuccess={() => {
            setShowQCForm(false);
            dispatch(fetchJobDetails(id));
          }}
        />
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Assign Job</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <input
                type="text"
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter user ID"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAssign}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Assign
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignTo('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetail;

