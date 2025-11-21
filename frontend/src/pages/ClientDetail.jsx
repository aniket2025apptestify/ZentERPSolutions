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
    purchaseOrders: [],
    materialRequests: [],
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
      const [inquiriesRes, quotationsRes, projectsRes, invoicesRes, purchaseOrdersRes] = await Promise.all([
        api.get(`/api/inquiries?clientId=${id}`).catch(() => ({ data: [] })),
        api.get(`/api/quotations?clientId=${id}`).catch(() => ({ data: [] })),
        api.get(`/api/projects?clientId=${id}`).catch(() => ({ data: [] })),
        api.get(`/api/invoices?clientId=${id}`).catch(() => ({ data: [] })),
        api.get(`/api/procurement/purchase-orders?clientId=${id}`).catch(() => ({ data: [] })),
      ]);

      // Get material requests through projects
      const projectIds = projectsRes.data.map((p) => p.id);
      let materialRequests = [];
      if (projectIds.length > 0) {
        const mrPromises = projectIds.map((projectId) =>
          api.get(`/api/procurement/material-requests?projectId=${projectId}`).catch(() => ({ data: [] }))
        );
        const mrResults = await Promise.all(mrPromises);
        materialRequests = mrResults.flatMap((res) => res.data);
      }

      setRelatedData({
        inquiries: inquiriesRes.data || [],
        quotations: quotationsRes.data || [],
        projects: projectsRes.data || [],
        invoices: invoicesRes.data || [],
        purchaseOrders: purchaseOrdersRes.data || [],
        materialRequests: materialRequests || [],
        documents: [],
      });
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
    { id: 'inquiries', name: `Inquiries (${relatedData.inquiries.length})` },
    { id: 'quotations', name: `Quotations (${relatedData.quotations.length})` },
    { id: 'projects', name: `Projects (${relatedData.projects.length})` },
    { id: 'purchaseOrders', name: `Purchase Orders (${relatedData.purchaseOrders.length})` },
    { id: 'materialRequests', name: `RFQ/Material Requests (${relatedData.materialRequests.length})` },
    { id: 'invoices', name: `Invoices (${relatedData.invoices.length})` },
    { id: 'documents', name: 'Documents' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/clients')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Clients
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{client.name}</h1>
            {client.companyName && (
              <p className="mt-2 text-sm text-gray-600">{client.companyName}</p>
            )}
          </div>
          <button
            onClick={handleEdit}
            className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200"
          >
            Edit Client
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start">
          <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-200/50">
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

        <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-200/50">
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

        <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-200/50">
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

        <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-200/50">
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
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
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Client Information</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</dt>
                    <dd className="text-sm font-semibold text-gray-900">{client.name}</dd>
                  </div>
                  {client.companyName && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Company Name</dt>
                      <dd className="text-sm text-gray-900">{client.companyName}</dd>
                    </div>
                  )}
                  {client.email && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</dt>
                      <dd className="text-sm text-gray-900">
                        <a href={`mailto:${client.email}`} className="text-blue-600 hover:text-blue-900">
                          {client.email}
                        </a>
                      </dd>
                    </div>
                  )}
                  {client.phone && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</dt>
                      <dd className="text-sm text-gray-900">
                        <a href={`tel:${client.phone}`} className="text-blue-600 hover:text-blue-900">
                          {client.phone}
                        </a>
                      </dd>
                    </div>
                  )}
                  {client.phone2 && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Alternative Phone</dt>
                      <dd className="text-sm text-gray-900">
                        <a href={`tel:${client.phone2}`} className="text-blue-600 hover:text-blue-900">
                          {client.phone2}
                        </a>
                      </dd>
                    </div>
                  )}
                  {client.website && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Website</dt>
                      <dd className="text-sm text-gray-900">
                        <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900">
                          {client.website}
                        </a>
                      </dd>
                    </div>
                  )}
                  {client.address && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Address</dt>
                      <dd className="text-sm text-gray-900">{client.address}</dd>
                    </div>
                  )}
                  {(client.city || client.state || client.country || client.zipCode) && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Location</dt>
                      <dd className="text-sm text-gray-900">
                        {[client.city, client.state, client.country, client.zipCode].filter(Boolean).join(', ')}
                      </dd>
                    </div>
                  )}
                  {client.vatNumber && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">VAT Number</dt>
                      <dd className="text-sm text-gray-900">{client.vatNumber}</dd>
                    </div>
                  )}
                  {client.gstin && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">GSTIN</dt>
                      <dd className="text-sm text-gray-900">{client.gstin}</dd>
                    </div>
                  )}
                  {client.panNumber && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">PAN Number</dt>
                      <dd className="text-sm text-gray-900">{client.panNumber}</dd>
                    </div>
                  )}
                  {client.taxId && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tax ID</dt>
                      <dd className="text-sm text-gray-900">{client.taxId}</dd>
                    </div>
                  )}
                  {client.registrationNumber && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Registration Number</dt>
                      <dd className="text-sm text-gray-900">{client.registrationNumber}</dd>
                    </div>
                  )}
                  {client.paymentTerms && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Payment Terms</dt>
                      <dd className="text-sm text-gray-900">{client.paymentTerms}</dd>
                    </div>
                  )}
                  {client.creditLimit && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Credit Limit</dt>
                      <dd className="text-sm font-semibold text-gray-900">${client.creditLimit.toFixed(2)}</dd>
                    </div>
                  )}
                  {client.notes && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</dt>
                      <dd className="text-sm text-gray-900 whitespace-pre-wrap">{client.notes}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created On</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Last Updated</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(client.updatedAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Inquiries Tab */}
          {activeTab === 'inquiries' && (
            <div>
              {loadingRelated ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-600">Loading inquiries...</p>
                </div>
              ) : relatedData.inquiries.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No inquiries found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedData.inquiries.map((inquiry) => (
                    <div
                      key={inquiry.id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => navigate(`/inquiries/${inquiry.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{inquiry.source || 'Inquiry'}</p>
                          <p className="text-sm text-gray-600 mt-1">{inquiry.projectType}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(inquiry.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          inquiry.status === 'CONVERTED' ? 'bg-green-100 text-green-700' :
                          inquiry.status === 'LOST' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {inquiry.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quotations Tab */}
          {activeTab === 'quotations' && (
            <div>
              {loadingRelated ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-600">Loading quotations...</p>
                </div>
              ) : relatedData.quotations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No quotations found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedData.quotations.map((quotation) => (
                    <div
                      key={quotation.id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => navigate(`/quotations/${quotation.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{quotation.quotationNumber}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            ${quotation.totalAmount?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(quotation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          quotation.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                          quotation.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {quotation.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div>
              {loadingRelated ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-600">Loading projects...</p>
                </div>
              ) : relatedData.projects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No projects found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedData.projects.map((project) => (
                    <div
                      key={project.id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{project.projectCode} - {project.name}</p>
                          <p className="text-sm text-gray-600 mt-1">{project.location}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          project.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          project.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Purchase Orders Tab */}
          {activeTab === 'purchaseOrders' && (
            <div>
              {loadingRelated ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-600">Loading purchase orders...</p>
                </div>
              ) : relatedData.purchaseOrders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No purchase orders found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedData.purchaseOrders.map((po) => (
                    <div
                      key={po.id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => navigate(`/procurement/purchase-orders/${po.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{po.poNumber}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            ${po.totalAmount?.toFixed(2) || '0.00'} • {po.vendor?.name || 'No Supplier'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(po.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          po.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          po.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {po.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Material Requests (RFQ) Tab */}
          {activeTab === 'materialRequests' && (
            <div>
              {loadingRelated ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-600">Loading material requests...</p>
                </div>
              ) : relatedData.materialRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No material requests found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedData.materialRequests.map((mr) => (
                    <div
                      key={mr.id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => navigate(`/procurement/material-requests/${mr.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{mr.requestNumber}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {mr.project?.projectCode || 'No Project'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(mr.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          mr.status === 'FULFILLED' ? 'bg-green-50 text-green-700 border-green-200' :
                          mr.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {mr.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div>
              {loadingRelated ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-600">Loading invoices...</p>
                </div>
              ) : relatedData.invoices.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No invoices found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedData.invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{invoice.invoiceNumber || `Invoice #${invoice.id}`}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            ${invoice.totalAmount?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(invoice.createdAt || invoice.invoiceDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                          invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {invoice.status || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="text-center py-12">
              <p className="text-gray-500">Documents list will be displayed here</p>
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

