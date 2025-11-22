import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { receiveGoods, fetchSWOById, selectCurrentSWO } from '../../store/slices/swoSlice';
import { selectUser } from '../../store/slices/authSlice';

const ReceiveGoods = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const swo = useSelector(selectCurrentSWO);
  const currentUser = useSelector(selectUser);

  const [items, setItems] = useState([{ description: '', itemId: null, qty: 1, uom: 'pcs', qualityStatus: 'ACCEPTED', batchNo: '' }]);
  const [documents, setDocuments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchSWOById(id));
  }, [dispatch, id]);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === 'qty' ? parseFloat(value) || 0 : value;
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { description: '', itemId: null, qty: 1, uom: 'pcs', qualityStatus: 'ACCEPTED', batchNo: '' }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await dispatch(receiveGoods({
        id,
        payload: {
          receivedBy: currentUser?.id,
          receivedDate: new Date().toISOString(),
          items: items.filter((item) => item.description && item.qty > 0),
          documents: documents.length > 0 ? documents : undefined,
        },
      })).unwrap();
      navigate(`/subcontract/swo/${id}`);
    } catch (err) {
      alert('Failed to receive goods: ' + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Receive Goods from Vendor</h1>
        <p className="mt-2 text-sm text-gray-600">SWO: {swo?.swoNumber}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6 space-y-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Received Items</h2>
            <button type="button" onClick={addItem} className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700">
              + Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    required
                    placeholder="Item description"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                    min="0"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">UOM</label>
                  <input
                    type="text"
                    value={item.uom}
                    onChange={(e) => handleItemChange(index, 'uom', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quality Status</label>
                  <select
                    value={item.qualityStatus}
                    onChange={(e) => handleItemChange(index, 'qualityStatus', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="PARTIAL">Partial</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="w-full px-3 py-2 text-sm text-red-600 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate(`/subcontract/swo/${id}`)}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Receiving...' : 'Receive Goods'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReceiveGoods;

