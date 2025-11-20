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
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      RECEIVED_PARTIAL: 'bg-yellow-100 text-yellow-800',
      RECEIVED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const canApprove = ['PROCUREMENT', 'DIRECTOR', 'PROJECT_MANAGER'].includes(
    currentUser?.role
  );

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => navigate('/procurement/purchase-orders')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          ← Back to Purchase Orders
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{purchaseOrder.poNumber}</h1>
            <p className="mt-2 text-sm text-gray-600">Purchase Order Details</p>
          </div>
          <div className="flex gap-2">
            <span
              className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                purchaseOrder.status
              )}`}
            >
              {purchaseOrder.status}
            </span>
            {purchaseOrder.status === 'DRAFT' && (
              <button
                onClick={() => setShowSendModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Send PO
              </button>
            )}
            {(purchaseOrder.status === 'DRAFT' || purchaseOrder.status === 'SENT') &&
              canApprove && (
                <button
                  onClick={() => setShowApproveModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Approve
                </button>
              )}
            {purchaseOrder.status === 'APPROVED' && (
              <button
                onClick={() => navigate(`/procurement/grn/create?poId=${id}`)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Create GRN
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">PO Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">PO Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{purchaseOrder.poNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Vendor</dt>
              <dd className="mt-1 text-sm text-gray-900">{purchaseOrder.vendor?.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Project</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {purchaseOrder.project?.projectCode || '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                ${purchaseOrder.totalAmount?.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created By</dt>
              <dd className="mt-1 text-sm text-gray-900">{purchaseOrder.createdBy}</dd>
            </div>
            {purchaseOrder.approvedBy && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Approved By</dt>
                <dd className="mt-1 text-sm text-gray-900">{purchaseOrder.approvedBy}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">GRNs</h2>
          {purchaseOrder.grns && purchaseOrder.grns.length > 0 ? (
            <div className="space-y-2">
              {purchaseOrder.grns.map((grn) => (
                <div key={grn.id} className="border border-gray-200 rounded-md p-3">
                  <p className="font-medium">{grn.grnNumber}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(grn.receivedDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No GRNs created yet</p>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">PO Lines</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Unit Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {purchaseOrder.poLines?.map((line) => (
              <tr key={line.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {line.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {line.qty}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {line.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${line.unitRate?.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${line.amount?.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showApproveModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">Approve Purchase Order</h3>
            <p className="mb-4">Are you sure you want to approve this purchase order?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">Send Purchase Order</h3>
            <p className="mb-4">Send this purchase order to the vendor?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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

