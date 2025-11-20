import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createGRN,
  selectGRNsError,
  clearError,
} from '../../store/slices/grnSlice';
import { fetchPurchaseOrderById } from '../../store/slices/purchaseOrdersSlice';
import { selectCurrentPurchaseOrder } from '../../store/slices/purchaseOrdersSlice';
import { selectUser } from '../../store/slices/authSlice';

const CreateGRN = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const purchaseOrder = useSelector(selectCurrentPurchaseOrder);
  const error = useSelector(selectGRNsError);
  const currentUser = useSelector(selectUser);

  const poId = searchParams.get('poId');

  const [formData, setFormData] = useState({
    purchaseOrderId: poId || '',
    receivedBy: currentUser?.id || '',
    receivedDate: new Date().toISOString().split('T')[0],
  });

  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (poId) {
      dispatch(fetchPurchaseOrderById(poId));
    }
  }, [dispatch, poId]);

  useEffect(() => {
    if (purchaseOrder && purchaseOrder.poLines) {
      setFormData((prev) => ({ ...prev, purchaseOrderId: purchaseOrder.id }));
      setItems(
        purchaseOrder.poLines.map((line) => ({
          itemId: line.itemId || null,
          description: line.description,
          qty: line.qty,
          receivedQty: 0,
          batchNo: '',
          remarks: '',
        }))
      );
    }
  }, [purchaseOrder]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === 'receivedQty' ? parseFloat(value) || 0 : value;
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        items: items
          .filter((item) => item.receivedQty > 0)
          .map((item) => ({
            itemId: item.itemId,
            description: item.description,
            qty: item.receivedQty,
            batchNo: item.batchNo || null,
            remarks: item.remarks || null,
          })),
      };

      const result = await dispatch(createGRN(payload)).unwrap();
      navigate(`/procurement/purchase-orders/${formData.purchaseOrderId}`);
    } catch (err) {
      console.error('Failed to create GRN:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!purchaseOrder && poId) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => navigate('/procurement/purchase-orders')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          ← Back to Purchase Orders
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create GRN</h1>
        <p className="mt-2 text-sm text-gray-600">Goods Receipt Note</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">{error}</h3>
        </div>
      )}

      {purchaseOrder && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Purchase Order Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">PO Number</p>
              <p className="font-medium">{purchaseOrder.poNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Vendor</p>
              <p className="font-medium">{purchaseOrder.vendor?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium">{purchaseOrder.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="font-medium">${purchaseOrder.totalAmount?.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Received By *
            </label>
            <input
              type="text"
              name="receivedBy"
              value={formData.receivedBy}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Received Date *
            </label>
            <input
              type="date"
              name="receivedDate"
              value={formData.receivedDate}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Received Items</h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ordered Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Received Qty *
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
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.qty}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={item.receivedQty}
                      onChange={(e) => handleItemChange(index, 'receivedQty', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-24 border border-gray-300 rounded-md px-2 py-1"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={item.batchNo}
                      onChange={(e) => handleItemChange(index, 'batchNo', e.target.value)}
                      className="w-32 border border-gray-300 rounded-md px-2 py-1"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={item.remarks}
                      onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/procurement/purchase-orders')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create GRN'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateGRN;

