import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchVendorById,
  selectCurrentVendor,
  selectVendorsStatus,
  selectVendorsError,
  clearError,
  clearCurrent,
} from '../../store/slices/vendorsSlice';
import api from '../../services/api';

const VendorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const vendor = useSelector(selectCurrentVendor);
  const status = useSelector(selectVendorsStatus);
  const error = useSelector(selectVendorsError);

  const [activeTab, setActiveTab] = useState('overview');
  const [relatedData, setRelatedData] = useState({
    purchaseOrders: [],
    materialRequests: [],
    vendorQuotes: [],
  });
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchVendorById(id));
      loadRelatedData();
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

  const loadRelatedData = async () => {
    if (!id) return;

    setLoadingRelated(true);
    try {
      const [purchaseOrdersRes, vendorQuotesRes] = await Promise.all([
        api.get(`/api/procurement/purchase-orders?vendorId=${id}`).catch(() => ({ data: [] })),
        api.get(`/api/procurement/vendor-quotes?vendorId=${id}`).catch(() => ({ data: [] })),
      ]);

      // Get material requests - these are sent to vendors, so we'll check vendor quotes
      // Material requests are linked through vendor quotes
      let materialRequests = [];
      if (vendorQuotesRes.data && vendorQuotesRes.data.length > 0) {
        const mrIds = [...new Set(vendorQuotesRes.data.map((vq) => vq.materialRequestId).filter(Boolean))];
        if (mrIds.length > 0) {
          const mrPromises = mrIds.map((mrId) =>
            api.get(`/api/procurement/material-requests/${mrId}`).catch(() => ({ data: null }))
          );
          const mrResults = await Promise.all(mrPromises);
          materialRequests = mrResults.filter((res) => res.data).map((res) => res.data);
        }
      }

      setRelatedData({
        purchaseOrders: purchaseOrdersRes.data || [],
        materialRequests: materialRequests || [],
        vendorQuotes: vendorQuotesRes.data || [],
      });
      setLoadingRelated(false);
    } catch (error) {
      console.error('Failed to load related data:', error);
      setLoadingRelated(false);
    }
  };

  if (status === 'loading' && !vendor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Vendor not found</p>
        <button
          onClick={() => navigate('/procurement/vendors')}
          className="mt-4 text-blue-600 hover:text-blue-900"
        >
          Back to Vendors
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'purchaseOrders', name: `Purchase Orders (${relatedData.purchaseOrders.length})` },
    { id: 'materialRequests', name: `RFQ/Material Requests (${relatedData.materialRequests.length})` },
    { id: 'vendorQuotes', name: `Vendor Quotes (${relatedData.vendorQuotes.length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/procurement/vendors')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Vendors
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{vendor.name}</h1>
            {vendor.contactPerson && (
              <p className="mt-2 text-sm text-gray-600">Contact: {vendor.contactPerson}</p>
            )}
          </div>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Vendor Information</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</dt>
                    <dd className="text-sm font-semibold text-gray-900">{vendor.name}</dd>
                  </div>
                  {vendor.companyName && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Company Name</dt>
                      <dd className="text-sm text-gray-900">{vendor.companyName}</dd>
                    </div>
                  )}
                  {vendor.contactPerson && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact Person</dt>
                      <dd className="text-sm text-gray-900">{vendor.contactPerson}</dd>
                    </div>
                  )}
                  {vendor.email && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</dt>
                      <dd className="text-sm text-gray-900">
                        <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:text-blue-900">
                          {vendor.email}
                        </a>
                      </dd>
                    </div>
                  )}
                  {vendor.email2 && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Alternative Email</dt>
                      <dd className="text-sm text-gray-900">
                        <a href={`mailto:${vendor.email2}`} className="text-blue-600 hover:text-blue-900">
                          {vendor.email2}
                        </a>
                      </dd>
                    </div>
                  )}
                  {vendor.phone && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</dt>
                      <dd className="text-sm text-gray-900">
                        <a href={`tel:${vendor.phone}`} className="text-blue-600 hover:text-blue-900">
                          {vendor.phone}
                        </a>
                      </dd>
                    </div>
                  )}
                  {vendor.phone2 && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Alternative Phone</dt>
                      <dd className="text-sm text-gray-900">
                        <a href={`tel:${vendor.phone2}`} className="text-blue-600 hover:text-blue-900">
                          {vendor.phone2}
                        </a>
                      </dd>
                    </div>
                  )}
                  {vendor.website && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Website</dt>
                      <dd className="text-sm text-gray-900">
                        <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900">
                          {vendor.website}
                        </a>
                      </dd>
                    </div>
                  )}
                  {vendor.address && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Address</dt>
                      <dd className="text-sm text-gray-900">{vendor.address}</dd>
                    </div>
                  )}
                  {(vendor.city || vendor.state || vendor.country || vendor.zipCode) && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Location</dt>
                      <dd className="text-sm text-gray-900">
                        {[vendor.city, vendor.state, vendor.country, vendor.zipCode].filter(Boolean).join(', ')}
                      </dd>
                    </div>
                  )}
                  {vendor.vatNumber && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">VAT Number</dt>
                      <dd className="text-sm text-gray-900">{vendor.vatNumber}</dd>
                    </div>
                  )}
                  {vendor.gstin && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">GSTIN</dt>
                      <dd className="text-sm text-gray-900">{vendor.gstin}</dd>
                    </div>
                  )}
                  {vendor.panNumber && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">PAN Number</dt>
                      <dd className="text-sm text-gray-900">{vendor.panNumber}</dd>
                    </div>
                  )}
                  {vendor.taxId && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tax ID</dt>
                      <dd className="text-sm text-gray-900">{vendor.taxId}</dd>
                    </div>
                  )}
                  {vendor.registrationNumber && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Registration Number</dt>
                      <dd className="text-sm text-gray-900">{vendor.registrationNumber}</dd>
                    </div>
                  )}
                  {vendor.paymentTerms && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Payment Terms</dt>
                      <dd className="text-sm text-gray-900">{vendor.paymentTerms}</dd>
                    </div>
                  )}
                  {vendor.creditLimit && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Credit Limit</dt>
                      <dd className="text-sm font-semibold text-gray-900">${vendor.creditLimit.toFixed(2)}</dd>
                    </div>
                  )}
                  {vendor.bankDetails && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bank Details</dt>
                      <dd className="text-sm text-gray-900 font-mono bg-gray-50 p-3 rounded-lg">
                        {typeof vendor.bankDetails === 'string' 
                          ? vendor.bankDetails 
                          : JSON.stringify(vendor.bankDetails, null, 2)}
                      </dd>
                    </div>
                  )}
                  {vendor.notes && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</dt>
                      <dd className="text-sm text-gray-900 whitespace-pre-wrap">{vendor.notes}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created On</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(vendor.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Last Updated</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(vendor.updatedAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>
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
                            ${po.totalAmount?.toFixed(2) || '0.00'} • {po.client?.companyName || po.client?.name || 'No Client'}
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

          {/* Vendor Quotes Tab */}
          {activeTab === 'vendorQuotes' && (
            <div>
              {loadingRelated ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-600">Loading vendor quotes...</p>
                </div>
              ) : relatedData.vendorQuotes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No vendor quotes found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedData.vendorQuotes.map((vq) => (
                    <div
                      key={vq.id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{vq.quoteNumber || `Quote #${vq.id}`}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            ${vq.totalAmount?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(vq.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {vq.status || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorDetail;

