import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchGRNById,
  selectCurrentGRN,
  selectGRNsStatus,
  clearCurrent,
} from '../../store/slices/grnSlice';

const GRNDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const grn = useSelector(selectCurrentGRN);
  const status = useSelector(selectGRNsStatus);

  useEffect(() => {
    if (id) {
      dispatch(fetchGRNById(id));
    }

    return () => {
      dispatch(clearCurrent());
    };
  }, [id, dispatch]);

  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!grn) {
    return <div className="p-8 text-center">GRN not found</div>;
  }

  const items = Array.isArray(grn.items) ? grn.items : [];

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => navigate('/procurement/grn')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          ← Back to GRNs
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{grn.grnNumber}</h1>
            <p className="mt-2 text-sm text-gray-600">Goods Receipt Note Details</p>
          </div>
          <button
            onClick={() => {
              const token = localStorage.getItem('token');
              const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
              const url = `${apiUrl}/api/procurement/grn/${id}/pdf`;
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
                    // Validate blob type
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
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            View/Print PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">GRN Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">GRN Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{grn.grnNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Purchase Order</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {grn.purchaseOrder?.poNumber || '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Received By</dt>
              <dd className="mt-1 text-sm text-gray-900">{grn.receivedBy}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Received Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(grn.receivedDate).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(grn.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Purchase Order Details</h2>
          {grn.purchaseOrder && (
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">PO Number</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {grn.purchaseOrder.poNumber}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Vendor</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {grn.purchaseOrder.vendor?.name || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {grn.purchaseOrder.status}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  ${grn.purchaseOrder.totalAmount?.toFixed(2) || '0.00'}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Received Items</h2>
        <div className="overflow-x-auto">
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
                  Batch No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.qty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.batchNo || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.remarks || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GRNDetail;

