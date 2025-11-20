import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createQCRecord } from '../../store/slices/productionSlice';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';

const QCForm = ({ jobId, stage, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [formData, setFormData] = useState({
    qcStatus: 'PASS',
    remarks: '',
    defects: [{ desc: '', severity: 'MEDIUM', photoDocId: '' }],
    createRework: false,
    reworkExpectedHours: '',
    reworkAssignedTo: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleDefectChange = (index, field, value) => {
    setFormData((prev) => {
      const newDefects = [...prev.defects];
      newDefects[index] = {
        ...newDefects[index],
        [field]: value,
      };
      return {
        ...prev,
        defects: newDefects,
      };
    });
  };

  const addDefect = () => {
    setFormData((prev) => ({
      ...prev,
      defects: [...prev.defects, { desc: '', severity: 'MEDIUM', photoDocId: '' }],
    }));
  };

  const removeDefect = (index) => {
    setFormData((prev) => ({
      ...prev,
      defects: prev.defects.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.qcStatus === 'FAIL' && formData.defects.length === 0) {
      setError('Please add at least one defect for FAIL status');
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        createQCRecord({
          jobId,
          payload: {
            inspectorId: user?.id || user?.userId,
            stage,
            qcStatus: formData.qcStatus,
            defects:
              formData.qcStatus === 'FAIL' && formData.defects.length > 0
                ? formData.defects.filter((d) => d.desc.trim() !== '')
                : null,
            remarks: formData.remarks || undefined,
            createRework: formData.qcStatus === 'FAIL' ? formData.createRework : false,
            reworkExpectedHours:
              formData.qcStatus === 'FAIL' && formData.createRework && formData.reworkExpectedHours
                ? parseFloat(formData.reworkExpectedHours)
                : undefined,
            reworkAssignedTo:
              formData.qcStatus === 'FAIL' && formData.createRework && formData.reworkAssignedTo
                ? formData.reworkAssignedTo
                : undefined,
          },
        })
      ).unwrap();
      onSuccess();
    } catch (err) {
      setError(err || 'Failed to create QC record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">QC Inspection</h2>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              QC Status <span className="text-red-500">*</span>
            </label>
            <select
              name="qcStatus"
              value={formData.qcStatus}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="PASS">PASS</option>
              <option value="FAIL">FAIL</option>
            </select>
          </div>

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
              placeholder="Add any remarks or observations"
            />
          </div>

          {formData.qcStatus === 'FAIL' && (
            <>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Defects
                  </label>
                  <button
                    type="button"
                    onClick={addDefect}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Defect
                  </button>
                </div>
                {formData.defects.map((defect, index) => (
                  <div key={index} className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={defect.desc}
                      onChange={(e) =>
                        handleDefectChange(index, 'desc', e.target.value)
                      }
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Defect description"
                    />
                    <select
                      value={defect.severity}
                      onChange={(e) =>
                        handleDefectChange(index, 'severity', e.target.value)
                      }
                      className="w-32 border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                    <input
                      type="text"
                      value={defect.photoDocId}
                      onChange={(e) =>
                        handleDefectChange(index, 'photoDocId', e.target.value)
                      }
                      className="w-32 border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Photo Doc ID"
                    />
                    {formData.defects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDefect(index)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="createRework"
                    checked={formData.createRework}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Create Rework Job
                  </span>
                </label>
              </div>

              {formData.createRework && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Hours
                    </label>
                    <input
                      type="number"
                      name="reworkExpectedHours"
                      value={formData.reworkExpectedHours}
                      onChange={handleChange}
                      step="0.5"
                      min="0"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Expected hours for rework"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign To (User ID)
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
                </>
              )}
            </>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit QC Record'}
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

export default QCForm;

