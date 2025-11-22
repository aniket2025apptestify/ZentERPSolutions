import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { createSubcontractInvoice } from '../../store/slices/subcontractInvoiceSlice';
import { fetchSWOById, selectCurrentSWO } from '../../store/slices/swoSlice';
import { selectUser } from '../../store/slices/authSlice';

const CreateInvoice = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const swo = useSelector(selectCurrentSWO);
  const currentUser = useSelector(selectUser);

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    amount: '',
    documents: [],
    createdBy: currentUser?.id || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchSWOById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (currentUser?.id) {
      setFormData((prev) => ({ ...prev, createdBy: currentUser.id }));
    }
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await dispatch(createSubcontractInvoice({
        swoId: id,
        payload: {
          ...formData,
          amount: parseFloat(formData.amount),
          invoiceDate: formData.invoiceDate,
        },
      })).unwrap();
      navigate(`/subcontract/swo/${id}`);
    } catch (err) {
      alert('Failed to create invoice: ' + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create Vendor Invoice</h1>
        <p className="mt-2 text-sm text-gray-600">SWO: {swo?.swoNumber}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
            <input
              type="text"
              name="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={handleChange}
              placeholder="Leave empty to auto-generate"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date</label>
            <input
              type="date"
              name="invoiceDate"
              value={formData.invoiceDate}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              required
              placeholder={swo?.totalAmount ? `SWO Total: ${swo.totalAmount}` : ''}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
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
            {isSubmitting ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoice;

