import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchMaterialRequestById,
  selectCurrentMaterialRequest,
  selectMaterialRequestsStatus,
  clearCurrent,
} from '../../store/slices/materialRequestsSlice';
import { fetchVendorQuotesForMR } from '../../store/slices/vendorQuotesSlice';
import { selectVendorQuotes } from '../../store/slices/vendorQuotesSlice';

const MaterialRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const materialRequest = useSelector(selectCurrentMaterialRequest);
  const status = useSelector(selectMaterialRequestsStatus);
  const vendorQuotes = useSelector(selectVendorQuotes);

  useEffect(() => {
    if (id) {
      dispatch(fetchMaterialRequestById(id));
      dispatch(fetchVendorQuotesForMR(id));
    }

    return () => {
      dispatch(clearCurrent());
    };
  }, [id, dispatch]);

  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!materialRequest) {
    return <div className="p-8 text-center">Material Request not found</div>;
  }

  const getStatusBadgeColor = (status) => {
    const colors = {
      REQUESTED: 'bg-blue-100 text-blue-800',
      QUOTED: 'bg-yellow-100 text-yellow-800',
      PO_CREATED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => navigate('/procurement/material-requests')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          ← Back to Material Requests
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {materialRequest.requestNumber}
            </h1>
            <p className="mt-2 text-sm text-gray-600">Material Request Details</p>
          </div>
          <span
            className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeColor(
              materialRequest.status
            )}`}
          >
            {materialRequest.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Request Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Request Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{materialRequest.requestNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Project</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {materialRequest.project?.projectCode || '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Sub Group</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {materialRequest.subGroup?.name || '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Requested By</dt>
              <dd className="mt-1 text-sm text-gray-900">{materialRequest.requestedBy}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Requested Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(materialRequest.requestedDate).toLocaleDateString()}
              </dd>
            </div>
            {materialRequest.notes && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900">{materialRequest.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Vendor Quotes</h2>
          {vendorQuotes.length === 0 ? (
            <p className="text-sm text-gray-500">No quotes received yet</p>
          ) : (
            <div className="space-y-3">
              {vendorQuotes.map((quote) => (
                <div key={quote.id} className="border border-gray-200 rounded-md p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{quote.vendor?.name}</p>
                      <p className="text-sm text-gray-500">{quote.quoteNumber}</p>
                      <p className="text-sm font-medium text-green-600">
                        Total: ${quote.totalAmount?.toFixed(2)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        quote.status === 'SUBMITTED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {quote.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/procurement/material-requests/${id}/enter-quote`)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                + Enter Vendor Quote
              </button>
              {materialRequest.status === 'QUOTED' && vendorQuotes.length > 0 && (
                <button
                  onClick={() => navigate(`/procurement/mr/${id}/quotes`)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Compare Quotes & Create PO
                </button>
              )}
            </div>
            <button
              onClick={async () => {
                const vendorId = prompt('Enter Vendor ID to send MR via email:');
                if (vendorId) {
                  try {
                    const response = await fetch(`/api/procurement/material-requests/${id}/send-to-vendor`, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                      },
                      body: JSON.stringify({ vendorId }),
                    });
                    const data = await response.json();
                    if (data.success) {
                      alert('Material Request sent to vendor successfully!');
                    } else {
                      alert('Error: ' + (data.message || 'Failed to send'));
                    }
                  } catch (err) {
                    alert('Error sending email: ' + err.message);
                  }
                }
              }}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              📧 Send MR to Vendor via Email
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Requested Items</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Item Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Unit
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.isArray(materialRequest.items) && materialRequest.items.length > 0 ? (
              materialRequest.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.itemName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.qty}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.unit}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                  No items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaterialRequestDetail;

