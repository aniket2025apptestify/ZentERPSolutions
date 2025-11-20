import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  createVendorQuote,
  selectVendorQuotesStatus,
  selectVendorQuotesError,
  clearError,
} from '../../store/slices/vendorQuotesSlice';
import { fetchVendors } from '../../store/slices/vendorsSlice';
import { selectVendors } from '../../store/slices/vendorsSlice';
import { fetchMaterialRequestById } from '../../store/slices/materialRequestsSlice';
import { selectCurrentMaterialRequest } from '../../store/slices/materialRequestsSlice';

const EnterVendorQuote = () => {
  const { mrId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const materialRequestId = mrId || searchParams.get('mrId');

  const vendors = useSelector(selectVendors);
  const materialRequest = useSelector(selectCurrentMaterialRequest);
  const status = useSelector(selectVendorQuotesStatus);
  const error = useSelector(selectVendorQuotesError);

  const [formData, setFormData] = useState({
    vendorId: '',
    quoteNumber: '',
    quotedBy: '',
  });

  const [lines, setLines] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (materialRequestId) {
      dispatch(fetchMaterialRequestById(materialRequestId));
    }
    dispatch(fetchVendors());
  }, [dispatch, materialRequestId]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (materialRequest && materialRequest.items && lines.length === 0) {
      // Initialize lines from MR items
      const initialLines = materialRequest.items.map((item) => ({
        description: item.itemName,
        itemId: item.itemId || null,
        qty: item.qty || 1,
        unitRate: 0,
        leadTimeDays: 0,
      }));
      setLines(initialLines);
    }
  }, [materialRequest, lines.length]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLineChange = (index, field, value) => {
    const updatedLines = [...lines];
    updatedLines[index] = {
      ...updatedLines[index],
      [field]: field === 'qty' || field === 'unitRate' || field === 'leadTimeDays' 
        ? parseFloat(value) || 0 
        : value,
    };
    setLines(updatedLines);
  };

  const calculateTotal = () => {
    return lines.reduce((sum, line) => sum + (line.qty * line.unitRate), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.vendorId || !formData.quoteNumber) {
      alert('Please fill in all required fields');
      return;
    }

    if (lines.length === 0) {
      alert('Please add at least one quote line');
      return;
    }

    setIsSubmitting(true);

    try {
      const totalAmount = calculateTotal();
      
      await dispatch(
        createVendorQuote({
          materialRequestId,
          vendorId: formData.vendorId,
          quoteNumber: formData.quoteNumber,
          quotedBy: formData.quotedBy,
          lines: lines,
          totalAmount: totalAmount,
        })
      ).unwrap();

      navigate(`/procurement/material-requests/${materialRequestId}`);
    } catch (err) {
      console.error('Error creating vendor quote:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!materialRequest && materialRequestId) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => navigate(`/procurement/material-requests/${materialRequestId}`)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          ← Back to Material Request
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Enter Vendor Quote</h1>
        <p className="mt-2 text-sm text-gray-600">
          For Material Request: {materialRequest?.requestNumber}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Quote Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor *
              </label>
              <div className="flex gap-2">
                <select
                  name="vendorId"
                  value={formData.vendorId}
                  onChange={handleChange}
                  required
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => navigate('/procurement/vendors')}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm whitespace-nowrap"
                  title="Go to Vendors page to add new vendor"
                >
                  + Add Vendor
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quote Number *
              </label>
              <input
                type="text"
                name="quoteNumber"
                value={formData.quoteNumber}
                onChange={handleChange}
                required
                placeholder="VQ-001"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quoted By
              </label>
              <input
                type="text"
                name="quotedBy"
                value={formData.quotedBy}
                onChange={handleChange}
                placeholder="Vendor representative name"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Quote Lines</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Item Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Unit Rate ($)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Lead Time (Days)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Line Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={line.qty}
                        onChange={(e) => handleLineChange(index, 'qty', e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={line.unitRate}
                        onChange={(e) => handleLineChange(index, 'unitRate', e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={line.leadTimeDays}
                        onChange={(e) => handleLineChange(index, 'leadTimeDays', e.target.value)}
                        min="0"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ${((line.qty || 0) * (line.unitRate || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-right text-sm font-medium text-gray-700">
                    Total Amount:
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">
                    ${calculateTotal().toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(`/procurement/material-requests/${materialRequestId}`)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || status === 'loading'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quote'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EnterVendorQuote;

