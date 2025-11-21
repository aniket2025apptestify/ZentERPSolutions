import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchPurchaseOrderById,
  approvePurchaseOrder,
  sendPurchaseOrder,
  selectCurrentPurchaseOrder,
  selectPurchaseOrdersStatus,
  clearCurrent,
} from '../../store/slices/purchaseOrdersSlice';
import { selectUser } from '../../store/slices/authSlice';

const PurchaseOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const purchaseOrder = useSelector(selectCurrentPurchaseOrder);
  const status = useSelector(selectPurchaseOrdersStatus);
  const currentUser = useSelector(selectUser);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchPurchaseOrderById(id));
    }

    return () => {
      dispatch(clearCurrent());
    };
  }, [id, dispatch]);

  const handleApprove = async () => {
    try {
      await dispatch(
        approvePurchaseOrder({
          id,
          approvedBy: currentUser?.userId,
        })
      ).unwrap();
      setShowApproveModal(false);
      dispatch(fetchPurchaseOrderById(id));
    } catch (err) {
      console.error('Failed to approve PO:', err);
    }
  };

  const handleSend = async () => {
    try {
      await dispatch(
        sendPurchaseOrder({
          id,
          sentBy: currentUser?.userId,
          sendEmail: false,
        })
      ).unwrap();
      setShowSendModal(false);
      dispatch(fetchPurchaseOrderById(id));
    } catch (err) {
      console.error('Failed to send PO:', err);
    }
  };

  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!purchaseOrder) {
    return <div className="p-8 text-center">Purchase Order not found</div>;
  }

  const getStatusBadgeColor = (status) => {
    const colors = {
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
      SENT: 'bg-blue-50 text-blue-700 border-blue-200',
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      RECEIVED_PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
      RECEIVED: 'bg-green-50 text-green-700 border-green-200',
      CLOSED: 'bg-gray-50 text-gray-700 border-gray-200',
      CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const canApprove = ['PROCUREMENT', 'DIRECTOR', 'PROJECT_MANAGER'].includes(
    currentUser?.role
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <button
          onClick={() => navigate('/procurement/purchase-orders')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Purchase Orders
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{purchaseOrder.poNumber}</h1>
            <p className="mt-2 text-sm text-gray-600">Purchase Order Details</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`px-4 py-1.5 inline-flex text-sm font-semibold rounded-full border ${getStatusBadgeColor(
                purchaseOrder.status
              )}`}
            >
              {purchaseOrder.status.replace('_', ' ')}
            </span>
            {purchaseOrder.status === 'DRAFT' && (
              <button
                onClick={() => setShowSendModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors shadow-sm"
              >
                Send PO
              </button>
            )}
            {(purchaseOrder.status === 'DRAFT' || purchaseOrder.status === 'SENT') &&
              canApprove && (
                <button
                  onClick={() => setShowApproveModal(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors shadow-sm"
                >
                  Approve
                </button>
              )}
            {purchaseOrder.status === 'APPROVED' && (
              <button
                onClick={() => navigate(`/procurement/grn/create?poId=${id}`)}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium transition-colors shadow-sm"
              >
                Create GRN
              </button>
            )}
            <button
              onClick={() => {
                const token = localStorage.getItem('token');
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const url = `${apiUrl}/api/procurement/purchase-orders/${id}/pdf`;
                fetch(url, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                })
                  .then((res) => {
                    if (!res.ok) {
                      return res.text().then(text => {
                        throw new Error(text || 'Failed to generate PDF');
                      });
                    }
                    const contentType = res.headers.get('content-type');
                    if (contentType && !contentType.includes('application/pdf')) {
                      return res.text().then(text => {
                        throw new Error('Response is not a PDF');
                      });
                    }
                    return res.blob();
                  })
                  .then((blob) => {
                    if (!blob.type.includes('pdf') && blob.size > 0) {
                      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                      const blobUrl = window.URL.createObjectURL(pdfBlob);
                      window.open(blobUrl, '_blank');
                    } else if (blob.type.includes('pdf')) {
                      const blobUrl = window.URL.createObjectURL(blob);
                      window.open(blobUrl, '_blank');
                    } else {
                      throw new Error('Invalid PDF file');
                    }
                  })
                  .catch((err) => {
                    console.error('Failed to generate PDF:', err);
                    alert('Failed to generate PDF. Please try again.');
                  });
              }}
              className="px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 flex items-center gap-2 font-medium transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              View/Print PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">PO Information</h2>
          <dl className="space-y-5">
            <div className="pb-4 border-b border-gray-100">
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">PO Number</dt>
              <dd className="text-base font-semibold text-gray-900">{purchaseOrder.poNumber}</dd>
            </div>
            {purchaseOrder.client && (
            <div className="pb-4 border-b border-gray-100">
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Client</dt>
              <dd className="text-base font-semibold text-gray-900">
                {purchaseOrder.client.companyName || purchaseOrder.client.name}
              </dd>
              {purchaseOrder.client.email && (
                <dd className="mt-1 text-sm text-gray-600 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {purchaseOrder.client.email}
                </dd>
              )}
              {purchaseOrder.client.phone && (
                <dd className="mt-1 text-sm text-gray-600 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {purchaseOrder.client.phone}
                </dd>
              )}
              {purchaseOrder.client.address && (
                <dd className="mt-1 text-sm text-gray-600 flex items-start">
                  <svg className="w-4 h-4 mr-2 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {purchaseOrder.client.address}
                </dd>
              )}
              {purchaseOrder.client.vatNumber && (
                <dd className="mt-2 inline-block px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-md border border-blue-200">
                  VAT: {purchaseOrder.client.vatNumber}
                </dd>
              )}
            </div>
            )}
            <div className="pb-4 border-b border-gray-100">
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Project</dt>
              <dd className="text-sm text-gray-900">
                {purchaseOrder.project?.projectCode || '-'}
              </dd>
            </div>
            <div className="pb-4 border-b border-gray-100">
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Amount</dt>
              <dd className="text-xl font-bold text-gray-900">
                ${purchaseOrder.totalAmount?.toFixed(2) || '0.00'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created By</dt>
              <dd className="text-sm text-gray-900">{purchaseOrder.createdBy}</dd>
            </div>
            {purchaseOrder.approvedBy && (
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Approved By</dt>
                <dd className="text-sm text-gray-900">{purchaseOrder.approvedBy}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            GRNs <span className="text-gray-500 font-normal">({purchaseOrder.grns?.length || 0})</span>
          </h2>
          {purchaseOrder.grns && purchaseOrder.grns.length > 0 ? (
            <div className="space-y-3">
              {purchaseOrder.grns.map((grn) => {
                const items = Array.isArray(grn.items) ? grn.items : [];
                const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
                return (
                  <div
                    key={grn.id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all bg-gray-50/50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{grn.grnNumber}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-600 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(grn.receivedDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            By: <span className="font-medium">{grn.receivedBy}</span>
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">{items.length}</span> item(s) • Total Qty: <span className="font-medium">{totalQty}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/procurement/grn/${grn.id}`)}
                        className="ml-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-colors font-medium border border-blue-200"
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="mt-4 text-sm text-gray-500">No GRNs created yet</p>
            </div>
          )}
        </div>
      </div>

      {/* PO Lines Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">PO Lines</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Unit Rate
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {purchaseOrder.poLines?.map((line) => (
                <tr key={line.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {line.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {line.qty}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {line.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${line.unitRate?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                    ${line.amount?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50/50">
              <tr>
                <td colSpan="4" className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                  Total:
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-lg font-bold text-gray-900">
                  ${purchaseOrder.totalAmount?.toFixed(2) || '0.00'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Approve Purchase Order</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to approve this purchase order?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Send Purchase Order</h3>
            <p className="text-sm text-gray-600 mb-6">Send this purchase order to the supplier?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderDetail;

