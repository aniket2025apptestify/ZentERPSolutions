import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchSWOById,
  selectCurrentSWO,
  selectSWOsStatus,
  startSWO,
  closeSWO,
} from '../../store/slices/swoSlice';
import { selectUser } from '../../store/slices/authSlice';

const SWODetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const swo = useSelector(selectCurrentSWO);
  const status = useSelector(selectSWOsStatus);
  const currentUser = useSelector(selectUser);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      dispatch(fetchSWOById(id));
    }
  }, [dispatch, id]);

  const handleStart = async () => {
    if (window.confirm('Start this SWO?')) {
      try {
        await dispatch(startSWO({ id, payload: { startedBy: currentUser?.id } })).unwrap();
        dispatch(fetchSWOById(id));
      } catch (err) {
        alert('Failed to start SWO: ' + err);
      }
    }
  };

  const handleClose = async () => {
    if (window.confirm('Close this SWO? This action cannot be undone.')) {
      try {
        await dispatch(closeSWO({ id, payload: { closedBy: currentUser?.id } })).unwrap();
        dispatch(fetchSWOById(id));
      } catch (err) {
        alert('Failed to close SWO: ' + err);
      }
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
      ISSUED: 'bg-blue-50 text-blue-700 border-blue-200',
      IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
      RECEIVED: 'bg-green-50 text-green-700 border-green-200',
      CLOSED: 'bg-gray-50 text-gray-700 border-gray-200',
      CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!swo) {
    return <div className="text-center py-12">SWO not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{swo.swoNumber}</h1>
          <p className="mt-1 text-sm text-gray-600">Subcontract Work Order Details</p>
        </div>
        <div className="flex gap-3">
          {swo.status === 'ISSUED' && (
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Start SWO
            </button>
          )}
          {['RECEIVED', 'IN_PROGRESS'].includes(swo.status) && (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close SWO
            </button>
          )}
          <button
            onClick={() => navigate('/subcontract/swo')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(swo.status)}`}>
          {swo.status.replace('_', ' ')}
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'material', 'receipts', 'invoices', 'audit'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Vendor</label>
                <p className="mt-1 text-sm text-gray-900">{swo.vendor?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Project</label>
                <p className="mt-1 text-sm text-gray-900">{swo.project?.projectCode || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Sub Group</label>
                <p className="mt-1 text-sm text-gray-900">{swo.subGroup?.name || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Total Amount</label>
                <p className="mt-1 text-sm text-gray-900">
                  {swo.totalAmount ? `${swo.currency || 'AED'} ${swo.totalAmount.toLocaleString()}` : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Expected Start</label>
                <p className="mt-1 text-sm text-gray-900">
                  {swo.expectedStart ? new Date(swo.expectedStart).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Expected End</label>
                <p className="mt-1 text-sm text-gray-900">
                  {swo.expectedEnd ? new Date(swo.expectedEnd).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>
            {swo.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1 text-sm text-gray-900">{swo.description}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'material' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Material Issued</h3>
              {swo.status === 'DRAFT' && (
                <button
                  onClick={() => navigate(`/subcontract/swo/${id}/issue-material`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Issue Material
                </button>
              )}
            </div>
            {swo.materialIssued && Array.isArray(swo.materialIssued) && swo.materialIssued.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch No</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {swo.materialIssued.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.itemId || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.qty}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.uom || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.batchNo || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-500">No material issued yet</p>
            )}
          </div>
        )}

        {activeTab === 'receipts' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Receipts</h3>
              {['IN_PROGRESS', 'ISSUED'].includes(swo.status) && (
                <button
                  onClick={() => navigate(`/subcontract/swo/${id}/receive`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Receive Goods
                </button>
              )}
            </div>
            {swo.subcontractReceipts && swo.subcontractReceipts.length > 0 ? (
              <div className="space-y-4">
                {swo.subcontractReceipts.map((receipt) => (
                  <div key={receipt.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">Receipt #{receipt.id.slice(-8)}</p>
                        <p className="text-sm text-gray-500">
                          Received: {new Date(receipt.receivedDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {receipt.items && Array.isArray(receipt.items) && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">Items:</p>
                        <ul className="mt-1 space-y-1">
                          {receipt.items.map((item, idx) => (
                            <li key={idx} className="text-sm text-gray-600">
                              {item.description || item.itemId} - Qty: {item.qty} {item.uom || ''} - Status: {item.qualityStatus || 'ACCEPTED'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No receipts yet</p>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Vendor Invoices</h3>
              <button
                onClick={() => navigate(`/subcontract/swo/${id}/invoice`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Invoice
              </button>
            </div>
            {swo.subcontractInvoices && swo.subcontractInvoices.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {swo.subcontractInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.invoiceNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                          invoice.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-500">No invoices yet</p>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Audit Log</h3>
            {swo.auditLogs && swo.auditLogs.length > 0 ? (
              <div className="space-y-2">
                {swo.auditLogs.map((log) => (
                  <div key={log.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.action}</p>
                        <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No audit logs</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SWODetail;
