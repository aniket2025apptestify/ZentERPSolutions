import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchReturns,
  inspectReturn,
  selectReturnsList,
  selectReturnsStatus,
  selectReturnsError,
  clearError,
} from '../../store/slices/returnsSlice';
import ReturnInspectModal from '../../components/returns/ReturnInspectModal';

const ReturnManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const returns = useSelector(selectReturnsList);
  const status = useSelector(selectReturnsStatus);
  const error = useSelector(selectReturnsError);

  const [filters, setFilters] = useState({
    status: '',
    outcome: '',
  });
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  useEffect(() => {
    dispatch(fetchReturns(filters));
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

  const handleInspect = (returnRecord) => {
    setSelectedReturn(returnRecord);
    setShowInspectModal(true);
  };

  const handleInspectSuccess = () => {
    setShowInspectModal(false);
    setSelectedReturn(null);
    dispatch(fetchReturns(filters));
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      INSPECTED: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getOutcomeBadgeColor = (outcome) => {
    const colors = {
      REWORK: 'bg-orange-100 text-orange-800',
      SCRAP: 'bg-red-100 text-red-800',
      ACCEPT_RETURN: 'bg-green-100 text-green-800',
    };
    return colors[outcome] || 'bg-gray-100 text-gray-800';
  };

  const filteredReturns = returns.filter((ret) => {
    if (filters.status && ret.status !== filters.status) return false;
    if (filters.outcome && ret.outcome !== filters.outcome) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Return Management</h1>
        <p className="mt-2 text-sm text-gray-600">Manage returned goods</p>
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
              <option value="PENDING">Pending</option>
              <option value="INSPECTED">Inspected</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outcome
            </label>
            <select
              name="outcome"
              value={filters.outcome}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All</option>
              <option value="REWORK">Rework</option>
              <option value="SCRAP">Scrap</option>
              <option value="ACCEPT_RETURN">Accept Return</option>
            </select>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {status === 'loading' ? (
          <div className="p-8 text-center">Loading...</div>
        ) : filteredReturns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No returns found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  DN Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Outcome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReturns.map((ret) => (
                <tr key={ret.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ret.deliveryNote?.dnNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ret.client?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{ret.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                        ret.status
                      )}`}
                    >
                      {ret.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {ret.outcome ? (
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getOutcomeBadgeColor(
                          ret.outcome
                        )}`}
                      >
                        {ret.outcome}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(ret.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {ret.status === 'PENDING' && (
                      <button
                        onClick={() => handleInspect(ret)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Inspect
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/returns/${ret.id}`)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showInspectModal && selectedReturn && (
        <ReturnInspectModal
          returnRecord={selectedReturn}
          onClose={() => {
            setShowInspectModal(false);
            setSelectedReturn(null);
          }}
          onSuccess={handleInspectSuccess}
        />
      )}
    </div>
  );
};

export default ReturnManagement;

