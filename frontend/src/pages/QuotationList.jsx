import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchQuotations,
  selectQuotations,
  selectQuotationsStatus,
  selectQuotationsError,
  clearError,
} from '../store/slices/quotationsSlice';
import { fetchClients } from '../store/slices/clientsSlice';
import { selectClients } from '../store/slices/clientsSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import { selectUsers } from '../store/slices/usersSlice';

const QuotationList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const quotations = useSelector(selectQuotations);
  const status = useSelector(selectQuotationsStatus);
  const error = useSelector(selectQuotationsError);
  const users = useSelector(selectUsers);
  const clients = useSelector(selectClients);

  const [filters, setFilters] = useState({
    status: '',
    clientId: '',
    preparedBy: '',
    from: '',
    to: '',
    search: '',
  });

  useEffect(() => {
    dispatch(fetchQuotations(filters));
    dispatch(fetchUsers());
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
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleApplyFilters = () => {
    dispatch(fetchQuotations(filters));
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      status: '',
      clientId: '',
      preparedBy: '',
      from: '',
      to: '',
      search: '',
    };
    setFilters(clearedFilters);
    dispatch(fetchQuotations(clearedFilters));
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CONVERTED: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getUserName = (userId) => {
    if (!userId) return 'Unknown';
    const user = users.find((u) => u.id === userId);
    return user ? user.name : userId;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and track all quotations
          </p>
        </div>
        <button
          onClick={() => navigate('/quotations/create')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + New Quotation
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
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CONVERTED">Converted</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client
            </label>
            <select
              name="clientId"
              value={filters.clientId}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prepared By
            </label>
            <select
              name="preparedBy"
              value={filters.preparedBy}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              name="from"
              value={filters.from}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              name="to"
              value={filters.to}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply Filters
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {status === 'loading' ? (
          <div className="p-8 text-center">Loading...</div>
        ) : quotations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No quotations found
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quotation #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prepared By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotations.map((quotation) => (
                <tr key={quotation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {quotation.quotationNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {quotation.client?.name || 'N/A'}
                    </div>
                    {quotation.client?.companyName && (
                      <div className="text-sm text-gray-500">
                        {quotation.client.companyName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                        quotation.status
                      )}`}
                    >
                      {quotation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(quotation.totalAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getUserName(quotation.preparedBy)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(quotation.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => navigate(`/quotations/${quotation.id}`)}
                      className="text-blue-600 hover:text-blue-900"
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
    </div>
  );
};

export default QuotationList;

