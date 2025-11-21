import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchDNList,
  selectDNList,
  selectDNStatus,
  selectDNError,
  clearError,
} from '../../store/slices/dnSlice';
import { fetchProjects } from '../../store/slices/projectsSlice';
import { selectProjects } from '../../store/slices/projectsSlice';
import { fetchClients } from '../../store/slices/clientsSlice';
import { selectClients } from '../../store/slices/clientsSlice';

const DispatchDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const deliveryNotes = useSelector(selectDNList);
  const status = useSelector(selectDNStatus);
  const error = useSelector(selectDNError);
  const projects = useSelector(selectProjects);
  const clients = useSelector(selectClients);

  const [filters, setFilters] = useState({
    status: '',
    projectId: '',
    clientId: '',
  });

  useEffect(() => {
    dispatch(fetchDNList(filters));
    dispatch(fetchProjects());
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    dispatch(fetchDNList(filters));
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
      LOADING: 'bg-amber-50 text-amber-700 border-amber-200',
      DISPATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
      DELIVERED: 'bg-green-50 text-green-700 border-green-200',
      RETURNED: 'bg-orange-50 text-orange-700 border-orange-200',
      CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getStatusCounts = () => {
    const counts = {
      DRAFT: 0,
      LOADING: 0,
      DISPATCHED: 0,
      DELIVERED: 0,
      RETURNED: 0,
      CANCELLED: 0,
    };
    deliveryNotes.forEach((dn) => {
      if (counts[dn.status] !== undefined) {
        counts[dn.status]++;
      }
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Dispatch & Delivery
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage delivery notes, vehicle assignments, and tracking
          </p>
        </div>
        <button
          onClick={() => navigate('/dispatch/dn/create')}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 hover:scale-105"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Delivery Note
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start">
          <svg
            className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div
            key={status}
            className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setFilters((prev) => ({ ...prev, status }));
              dispatch(fetchDNList({ ...filters, status }));
            }}
          >
            <div className="text-sm font-medium text-gray-600 mb-1">
              {status}
            </div>
            <div className="text-2xl font-bold text-gray-900">{count}</div>
          </div>
        ))}
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="LOADING">Loading</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="DELIVERED">Delivered</option>
              <option value="RETURNED">Returned</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project
            </label>
            <select
              name="projectId"
              value={filters.projectId}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.projectCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client
            </label>
            <select
              name="clientId"
              value={filters.clientId}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Clients</option>
              {clients
                .filter((c) => c.isActive)
                .map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleApplyFilters}
            className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Delivery Notes Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
        {status === 'loading' ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading delivery notes...</p>
          </div>
        ) : deliveryNotes.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-4 text-gray-600">No delivery notes found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DN Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deliveryNotes.map((dn) => (
                  <tr
                    key={dn.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/dispatch/dn/${dn.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {dn.dnNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {dn.project?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {dn.project?.projectCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {dn.client?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                          dn.status
                        )}`}
                      >
                        {dn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dn.vehicle ? (
                        <div>
                          <div>{dn.vehicle.numberPlate}</div>
                          <div className="text-xs">{dn.vehicle.type}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dn.driver ? dn.driver.name : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(dn.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dispatch/dn/${dn.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DispatchDashboard;

