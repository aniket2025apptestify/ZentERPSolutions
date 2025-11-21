import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { createVendorQuote } from '../../store/slices/vendorQuotesSlice';
import { useDispatch } from 'react-redux';

const VendorPortal = () => {
  const { mrId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const vendorId = searchParams.get('vendorId');

  const [materialRequest, setMaterialRequest] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    quoteNumber: '',
    quotedBy: '',
  });

  const [lines, setLines] = useState([]);

  useEffect(() => {
    if (!vendorId) {
      setError('Vendor ID is required. Please use the link provided in the email.');
      setLoading(false);
      return;
    }

    fetchMaterialRequest();
    fetchVendor();
  }, [mrId, vendorId]);

  const fetchMaterialRequest = async () => {
    try {
      // For vendor portal, we need a public endpoint or token-based access
      const response = await api.get(`/api/procurement/material-requests/${mrId}`);
      setMaterialRequest(response.data);
      
      // Initialize lines from MR items
      if (response.data.items && response.data.items.length > 0) {
        const initialLines = response.data.items.map((item) => ({
          description: item.itemName,
          itemId: item.itemId || null,
          qty: item.qty || 1,
          unitRate: 0,
          leadTimeDays: 0,
        }));
        setLines(initialLines);
      }
    } catch (err) {
      setError('Failed to load material request');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendor = async () => {
    try {
      const response = await api.get(`/api/procurement/vendors/${vendorId}`);
      setVendor(response.data);
    } catch (err) {
      console.error('Failed to load vendor info');
    }
  };

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
    
    if (!formData.quoteNumber) {
      alert('Please enter a quote number');
      return;
    }

    if (!vendorId) {
      alert('Vendor ID is required');
      return;
    }

    setSubmitting(true);

    try {
      const totalAmount = calculateTotal();
      
      await dispatch(
        createVendorQuote({
          materialRequestId: mrId,
          vendorId: vendorId,
          quoteNumber: formData.quoteNumber,
          quotedBy: formData.quotedBy,
          lines: lines,
          totalAmount: totalAmount,
        })
      ).unwrap();

      alert('Quote submitted successfully!');
      navigate('/vendor/quote-success');
    } catch (err) {
      alert('Error submitting quote: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (error || !materialRequest) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{error || 'Material Request not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Submit Quote</h1>
          <p className="mt-2 text-sm text-gray-600">
            Material Request: {materialRequest.requestNumber}
          </p>
          {vendor && (
            <p className="mt-1 text-sm text-gray-600">Vendor: {vendor.name}</p>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Request Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Request Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{materialRequest.requestNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Requested Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(materialRequest.requestedDate).toLocaleDateString()}
              </dd>
            </div>
            {materialRequest.project && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Project</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {materialRequest.project.projectCode || '-'}
                </dd>
              </div>
            )}
            {materialRequest.notes && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900">{materialRequest.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Quote Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="Your name"
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
                          required
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
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Quote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorPortal;

