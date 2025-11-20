import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { logJobHours } from '../../store/slices/productionSlice';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';

const LogHoursForm = ({ jobId, stage, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [formData, setFormData] = useState({
    hours: '',
    outputQty: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'hours' || name === 'outputQty' ? parseFloat(value) || '' : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.hours || formData.hours <= 0) {
      setError('Hours must be greater than 0');
      return;
    }

    if (formData.outputQty !== '' && formData.outputQty < 0) {
      setError('Output quantity must be >= 0');
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        logJobHours({
          jobId,
          payload: {
            userId: user?.id || user?.userId,
            hours: formData.hours,
            outputQty: formData.outputQty || undefined,
            notes: formData.notes || undefined,
            stage,
            date: formData.date ? new Date(formData.date).toISOString() : undefined,
          },
        })
      ).unwrap();
      onSuccess();
    } catch (err) {
      setError(err || 'Failed to log hours');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Log Hours</h2>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hours <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="hours"
              value={formData.hours}
              onChange={handleChange}
              step="0.5"
              min="0"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter hours worked"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Output Quantity
            </label>
            <input
              type="number"
              name="outputQty"
              value={formData.outputQty}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter quantity completed"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Add any notes or remarks"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Logging...' : 'Log Hours'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogHoursForm;

