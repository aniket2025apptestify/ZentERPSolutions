import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createInvoice } from '../../store/slices/invoicesSlice';
import { fetchProjects } from '../../store/slices/projectsSlice';
import { selectProjects } from '../../store/slices/projectsSlice';
import { fetchClients } from '../../store/slices/clientsSlice';
import { selectClients } from '../../store/slices/clientsSlice';
import { selectUser } from '../../store/slices/authSlice';

const CreateInvoice = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const projects = useSelector(selectProjects);
  const clients = useSelector(selectClients);
  const currentUser = useSelector(selectUser);

  const [formData, setFormData] = useState({
    invoiceType: 'EXTERNAL',
    projectId: '',
    clientId: '',
    lines: [{ description: '', qty: 1, unit: '', unitRate: 0 }],
    discount: 0,
    vatPercent: 5,
    dueDate: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchClients());
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index][field] = value;
    
    // Recalculate line total
    if (field === 'qty' || field === 'unitRate') {
      newLines[index].total = newLines[index].qty * newLines[index].unitRate;
    }
    
    setFormData((prev) => ({ ...prev, lines: newLines }));
  };

  const addLine = () => {
    setFormData((prev) => ({
      ...prev,
      lines: [...prev.lines, { description: '', qty: 1, unit: '', unitRate: 0, total: 0 }],
    }));
  };

  const removeLine = (index) => {
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.lines.reduce((sum, line) => sum + (line.qty * line.unitRate), 0);
    const subtotalAfterDiscount = subtotal - (formData.discount || 0);
    const vatAmount = (subtotalAfterDiscount * (formData.vatPercent || 0)) / 100;
    const total = subtotalAfterDiscount + vatAmount;
    return { subtotal, subtotalAfterDiscount, vatAmount, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { subtotal, vatAmount, total } = calculateTotals();
      
      const invoiceData = {
        ...formData,
        lines: formData.lines.map((line) => ({
          description: line.description,
          qty: parseFloat(line.qty),
          unit: line.unit || null,
          unitRate: parseFloat(line.unitRate),
        })),
        createdBy: currentUser?.id,
      };

      const result = await dispatch(createInvoice(invoiceData)).unwrap();
      navigate(`/invoices/${result.invoice.id}`);
    } catch (err) {
      setError(err || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, subtotalAfterDiscount, vatAmount, total } = calculateTotals();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
        <button
          onClick={() => navigate('/invoices')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Invoices
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Type *
            </label>
            <select
              name="invoiceType"
              value={formData.invoiceType}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="EXTERNAL">External</option>
              <option value="INTERNAL">Internal</option>
              <option value="PROFORMA">Proforma</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client *
            </label>
            <select
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name || client.companyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              name="projectId"
              value={formData.projectId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VAT %
            </label>
            <input
              type="number"
              name="vatPercent"
              value={formData.vatPercent}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount
            </label>
            <input
              type="number"
              name="discount"
              value={formData.discount}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Invoice Lines */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Invoice Lines</h3>
            <button
              type="button"
              onClick={addLine}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Line
            </button>
          </div>

          <div className="space-y-4">
            {formData.lines.map((line, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <input
                    type="text"
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Qty"
                    value={line.qty}
                    onChange={(e) => handleLineChange(index, 'qty', parseFloat(e.target.value) || 0)}
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Unit"
                    value={line.unit}
                    onChange={(e) => handleLineChange(index, 'unit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Rate"
                    value={line.unitRate}
                    onChange={(e) => handleLineChange(index, 'unitRate', parseFloat(e.target.value) || 0)}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="col-span-1 text-right font-medium">
                  ${((line.qty || 0) * (line.unitRate || 0)).toFixed(2)}
                </div>
                <div className="col-span-1">
                  {formData.lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t pt-4 mb-6">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {formData.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-${formData.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>VAT ({formData.vatPercent}%):</span>
                <span>${vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoice;

