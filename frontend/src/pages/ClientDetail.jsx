import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchClientById,
  selectSelectedClient,
  selectClientsStatus,
  selectClientsError,
  clearError,
  clearSelectedClient,
} from '../store/slices/clientsSlice';
import ClientFormModal from '../components/ClientFormModal';
import api from '../services/api';

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const client = useSelector(selectSelectedClient);
  const status = useSelector(selectClientsStatus);
  const error = useSelector(selectClientsError);

  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [relatedData, setRelatedData] = useState({
    inquiries: [],
    quotations: [],
    projects: [],
    invoices: [],
    documents: [],
  });
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchClientById(id));
      loadRelatedData();
    }

    return () => {
      dispatch(clearSelectedClient());
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

  const loadRelatedData = async () => {
    if (!id) return;

    setLoadingRelated(true);
    try {
      // Fetch related data - for now we'll use the stats from the client object
      // In a full implementation, you might want separate endpoints for each entity type
      // For now, we'll just show the stats
      setLoadingRelated(false);
    } catch (error) {
      console.error('Failed to load related data:', error);
      setLoadingRelated(false);
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleModalClose = () => {
    setShowEditModal(false);
    dispatch(fetchClientById(id));
  };

  if (status === 'loading' && !client) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Client not found</p>
        <button
          onClick={() => navigate('/clients')}
          className="mt-4 text-indigo-600 hover:text-indigo-900"
        >
          Back to Clients
        </button>
      </div>
    );
  }

  const stats = client.stats || {
    inquiries: 0,
    quotations: 0,
    projects: 0,
    invoices: 0,
  };

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'inquiries', name: `Inquiries (${stats.inquiries})` },
    { id: 'quotations', name: `Quotations (${stats.quotations})` },
    { id: 'projects', name: `Projects (${stats.projects})` },
    { id: 'invoices', name: `Invoices (${stats.invoices})` },
    { id: 'documents', name: 'Documents' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <button
              onClick={() => navigate('/clients')}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              ← Back to Clients
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
            {client.companyName && (
              <p className="mt-2 text-sm text-gray-600">{client.companyName}</p>
            )}
          </div>
          <button
            onClick={handleEdit}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Edit Client
          </button>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Inquiries</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.inquiries}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Quotations</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.quotations}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Projects</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.projects}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Invoices</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.invoices}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                `}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Client Information</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.name}</dd>
                  </div>
                  {client.companyName && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.companyName}</dd>
                    </div>
                  )}
                  {client.email && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a href={`mailto:${client.email}`} className="text-indigo-600 hover:text-indigo-900">
                          {client.email}
                        </a>
                      </dd>
                    </div>
                  )}
                  {client.phone && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a href={`tel:${client.phone}`} className="text-indigo-600 hover:text-indigo-900">
                          {client.phone}
                        </a>
                      </dd>
                    </div>
                  )}
                  {client.address && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Address</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.address}</dd>
                    </div>
                  )}
                  {client.vatNumber && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">VAT Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.vatNumber}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created On</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(client.updatedAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Other Tabs - Placeholder */}
          {activeTab !== 'overview' && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {activeTab === 'inquiries' && 'Inquiries list will be displayed here'}
                {activeTab === 'quotations' && 'Quotations list will be displayed here'}
                {activeTab === 'projects' && 'Projects list will be displayed here'}
                {activeTab === 'invoices' && 'Invoices list will be displayed here'}
                {activeTab === 'documents' && 'Documents list will be displayed here'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                This feature will be implemented in future phases
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <ClientFormModal client={client} onClose={handleModalClose} />
      )}
    </div>
  );
};

export default ClientDetail;

