import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { inspectReturn } from '../../store/slices/returnsSlice';
import { selectUser } from '../../store/slices/authSlice';

const ReturnInspectModal = ({ returnRecord, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [formData, setFormData] = useState({
    result: 'REWORK',
    remarks: '',
    reworkAssignedTo: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.result) {
      setError('Please select an inspection result');
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        inspectReturn({
          id: returnRecord.id,
          payload: {
            inspectedBy: user?.id || user?.userId,
            result: formData.result,
            remarks: formData.remarks || undefined,
            reworkAssignedTo:
              formData.result === 'REWORK' && formData.reworkAssignedTo
                ? formData.reworkAssignedTo
                : undefined,
          },
        })
      ).unwrap();
      onSuccess();
    } catch (err) {
      setError(err || 'Failed to inspect return');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Inspect Return</h2>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            <strong>DN:</strong> {returnRecord.deliveryNote?.dnNumber || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Client:</strong> {returnRecord.client?.name || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Reason:</strong> {returnRecord.reason}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Inspection Result <span className="text-red-500">*</span>
            </label>
            <select
              name="result"
              value={formData.result}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="REWORK">Rework</option>
              <option value="SCRAP">Scrap</option>
              <option value="ACCEPT_RETURN">Accept Return</option>
            </select>
          </div>

          {formData.result === 'REWORK' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign Rework To (User ID)
              </label>
              <input
                type="text"
                name="reworkAssignedTo"
                value={formData.reworkAssignedTo}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter user ID (optional)"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Add inspection remarks"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Submit Inspection'}
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

export default ReturnInspectModal;

