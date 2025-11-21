import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createQuotation,
  selectQuotationsError,
  clearError,
} from '../store/slices/quotationsSlice';
import { fetchClients } from '../store/slices/clientsSlice';
import { selectClients } from '../store/slices/clientsSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import { selectUsers } from '../store/slices/usersSlice';
import { fetchInquiries } from '../store/slices/inquiriesSlice';
import { selectInquiries } from '../store/slices/inquiriesSlice';
import { selectUser } from '../store/slices/authSlice';

const NewQuotation = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clients = useSelector(selectClients);
  const users = useSelector(selectUsers);
  const inquiries = useSelector(selectInquiries);
  const error = useSelector(selectQuotationsError);
  const currentUser = useSelector(selectUser);

  const inquiryId = searchParams.get('inquiryId');

  const [formData, setFormData] = useState({
    inquiryId: inquiryId || '',
    clientId: '',
    preparedBy: currentUser?.userId || '',
    validityDays: 30,
    discount: 0,
    vatPercent: 5,
    notes: '',
    attachments: [],
  });

  const [lines, setLines] = useState([
    {
      itemName: '',
      width: '',
      height: '',
      quantity: 1,
      areaSqm: '',
      runningMeter: '',
      unitRate: 0,
      systemType: 'SYSTEM',
      materialList: [],
      labourCost: 0,
      overheads: 0,
      remarks: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchClients());
    dispatch(fetchUsers());
    dispatch(fetchInquiries());
  }, [dispatch]);

  useEffect(() => {
    if (inquiryId) {
      const inquiry = inquiries.find((i) => i.id === inquiryId);
      if (inquiry) {
        setFormData((prev) => ({
          ...prev,
          inquiryId: inquiryId,
          clientId: inquiry.clientId,
        }));
      }
    }
  }, [inquiryId, inquiries]);

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
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'validityDays' || name === 'discount' || name === 'vatPercent' 
        ? parseFloat(value) || 0 
        : value,
    }));
  };

  const handleLineChange = (index, field, value) => {
    const updatedLines = [...lines];
    const line = updatedLines[index];

    if (field === 'width' || field === 'height' || field === 'quantity') {
      line[field] = value === '' ? '' : parseFloat(value) || 0;
      // Auto-calculate area if width and height are provided
      if (field === 'width' || field === 'height' || field === 'quantity') {
        if (line.width && line.height && line.quantity) {
          line.areaSqm = (line.width * line.height * line.quantity).toFixed(2);
        } else {
          line.areaSqm = '';
        }
      }
    } else if (field === 'unitRate' || field === 'labourCost' || field === 'overheads') {
      line[field] = parseFloat(value) || 0;
    } else if (field === 'quantity') {
      line[field] = parseInt(value) || 1;
    } else {
      line[field] = value;
    }

    setLines(updatedLines);
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        itemName: '',
        width: '',
        height: '',
        quantity: 1,
        areaSqm: '',
        runningMeter: '',
        unitRate: 0,
        systemType: 'SYSTEM',
        materialList: [],
        labourCost: 0,
        overheads: 0,
        remarks: '',
      },
    ]);
  };

  const removeLine = (index) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const calculateLineTotal = (line) => {
    let base = 0;
    if (line.areaSqm) {
      base = parseFloat(line.areaSqm) * (line.unitRate || 0);
    } else if (line.runningMeter) {
      base = parseFloat(line.runningMeter) * (line.unitRate || 0);
    } else if (line.width && line.height && line.quantity) {
      base = line.width * line.height * line.quantity * (line.unitRate || 0);
    }
    return base + (line.labourCost || 0) + (line.overheads || 0);
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);
    const subtotalAfterDiscount = Math.max(0, subtotal - (formData.discount || 0));
    const vatAmount = (subtotalAfterDiscount * (formData.vatPercent || 0)) / 100;
    const total = subtotalAfterDiscount + vatAmount;

    return {
      subtotal: subtotal.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      total: total.toFixed(2),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare lines data
      const linesData = lines.map((line) => ({
        itemName: line.itemName,
        width: line.width ? parseFloat(line.width) : null,
        height: line.height ? parseFloat(line.height) : null,
        quantity: parseInt(line.quantity) || 1,
        areaSqm: line.areaSqm ? parseFloat(line.areaSqm) : null,
        runningMeter: line.runningMeter ? parseFloat(line.runningMeter) : null,
        unitRate: parseFloat(line.unitRate) || 0,
        systemType: line.systemType || 'SYSTEM',
        materialList: line.materialList || [],
        labourCost: parseFloat(line.labourCost) || 0,
        overheads: parseFloat(line.overheads) || 0,
        remarks: line.remarks || '',
      }));

      const payload = {
        ...formData,
        inquiryId: formData.inquiryId || null,
        lines: linesData,
      };

      const quotation = await dispatch(createQuotation(payload)).unwrap();
      navigate(`/quotations/${quotation.id}`);
    } catch (err) {
      console.error('Failed to create quotation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/quotations')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          ← Back to Quotations
        </button>
        <h1 className="text-3xl font-bold text-gray-900">New Quotation</h1>
        <p className="mt-2 text-sm text-gray-600">Create a new quotation</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inquiry (Optional)
              </label>
              <select
                name="inquiryId"
                value={formData.inquiryId}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">None</option>
                {inquiries.map((inquiry) => (
                  <option key={inquiry.id} value={inquiry.id}>
                    {inquiry.source} - {inquiry.projectType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select Client</option>
                {clients
                  .filter((c) => c.isActive)
                  .map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.companyName ? `- ${client.companyName}` : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prepared By <span className="text-red-500">*</span>
              </label>
              <select
                name="preparedBy"
                value={formData.preparedBy}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select User</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Validity Days
              </label>
              <input
                type="number"
                name="validityDays"
                value={formData.validityDays}
                onChange={handleChange}
                min="1"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Line Items</h2>
            <button
              type="button"
              onClick={addLine}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + Add Line
            </button>
          </div>

          <div className="space-y-4">
            {lines.map((line, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Line {index + 1}</h3>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={line.itemName}
                      onChange={(e) => handleLineChange(index, 'itemName', e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={line.width}
                      onChange={(e) => handleLineChange(index, 'width', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={line.height}
                      onChange={(e) => handleLineChange(index, 'height', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area (sqm)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={line.areaSqm}
                      onChange={(e) => handleLineChange(index, 'areaSqm', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      readOnly={!!(line.width && line.height && line.quantity)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Running Meter
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={line.runningMeter}
                      onChange={(e) => handleLineChange(index, 'runningMeter', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Rate <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unitRate}
                      onChange={(e) => handleLineChange(index, 'unitRate', e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      System Type
                    </label>
                    <select
                      value={line.systemType}
                      onChange={(e) => handleLineChange(index, 'systemType', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="SYSTEM">System</option>
                      <option value="NON_SYSTEM">Non-System</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Labour Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.labourCost}
                      onChange={(e) => handleLineChange(index, 'labourCost', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Overheads
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.overheads}
                      onChange={(e) => handleLineChange(index, 'overheads', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remarks
                    </label>
                    <input
                      type="text"
                      value={line.remarks}
                      onChange={(e) => handleLineChange(index, 'remarks', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-600">
                      <strong>Line Total:</strong>{' '}
                      {calculateLineTotal(line).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Totals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="discount"
                value={formData.discount}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VAT Percent
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="vatPercent"
                value={formData.vatPercent}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div className="mt-6 space-y-2 text-right">
            <div className="text-lg">
              <span className="font-medium">Subtotal:</span>{' '}
              {totals.subtotal}
            </div>
            <div className="text-lg">
              <span className="font-medium">Discount:</span>{' '}
              {formData.discount.toFixed(2)}
            </div>
            <div className="text-lg">
              <span className="font-medium">VAT ({formData.vatPercent}%):</span>{' '}
              {totals.vatAmount}
            </div>
            <div className="text-2xl font-bold border-t pt-2">
              <span>Total:</span> {totals.total}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Notes</h2>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="4"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Additional notes..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/quotations')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Quotation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewQuotation;

