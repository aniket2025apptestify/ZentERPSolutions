import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchQuotationById,
  updateQuotation,
  sendQuotation,
  approveQuotation,
  rejectQuotation,
  convertQuotation,
  selectCurrentQuotation,
  selectQuotationsStatus,
  selectQuotationsError,
  clearError,
  clearCurrentQuotation,
} from '../store/slices/quotationsSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import { selectUsers } from '../store/slices/usersSlice';
import { selectUser } from '../store/slices/authSlice';
import UploadAttachments from '../components/UploadAttachments';

const QuotationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const quotation = useSelector(selectCurrentQuotation);
  const status = useSelector(selectQuotationsStatus);
  const error = useSelector(selectQuotationsError);
  const users = useSelector(selectUsers);
  const currentUser = useSelector(selectUser);

  const [isEditing, setIsEditing] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [formData, setFormData] = useState({
    validityDays: 30,
    discount: 0,
    vatPercent: 5,
    notes: '',
  });
  const [sendData, setSendData] = useState({
    emailMessage: 'Please find attached our quotation for your consideration.',
    sendEmail: true,
  });
  const [convertData, setConvertData] = useState({
    projectName: '',
    type: 'EXTERNAL',
    startDate: '',
    subGroups: [],
  });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchQuotationById(id));
      dispatch(fetchUsers());
    }

    return () => {
      dispatch(clearCurrentQuotation());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (quotation) {
      setFormData({
        validityDays: quotation.validityDays || 30,
        discount: quotation.discount || 0,
        vatPercent: quotation.vatPercent || 5,
        notes: quotation.notes || '',
      });
      if (quotation.client) {
        setConvertData((prev) => ({
          ...prev,
          projectName: `${quotation.client.name} - Project`,
        }));
      }
    }
  }, [quotation]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'validityDays' || name === 'discount' || name === 'vatPercent'
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleSave = async () => {
    try {
      await dispatch(
        updateQuotation({
          id: quotation.id,
          payload: formData,
        })
      ).unwrap();
      setIsEditing(false);
      dispatch(fetchQuotationById(id));
    } catch (err) {
      console.error('Failed to update quotation:', err);
    }
  };

  const handleSend = async () => {
    try {
      await dispatch(
        sendQuotation({
          id: quotation.id,
          payload: {
            sentBy: currentUser?.userId,
            ...sendData,
          },
        })
      ).unwrap();
      setShowSendModal(false);
      dispatch(fetchQuotationById(id));
    } catch (err) {
      console.error('Failed to send quotation:', err);
    }
  };

  const handleApprove = async () => {
    if (
      !window.confirm(
        'Are you sure you want to approve this quotation? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await dispatch(
        approveQuotation({
          id: quotation.id,
          payload: {
            approvedBy: currentUser?.userId,
          },
        })
      ).unwrap();
      dispatch(fetchQuotationById(id));
    } catch (err) {
      console.error('Failed to approve quotation:', err);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      await dispatch(
        rejectQuotation({
          id: quotation.id,
          payload: {
            rejectedBy: currentUser?.userId,
            reason: rejectReason,
          },
        })
      ).unwrap();
      setShowRejectModal(false);
      setRejectReason('');
      dispatch(fetchQuotationById(id));
    } catch (err) {
      console.error('Failed to reject quotation:', err);
    }
  };

  const handleConvert = async () => {
    if (!convertData.projectName.trim()) {
      alert('Please provide a project name');
      return;
    }

    try {
      const result = await dispatch(
        convertQuotation({
          id: quotation.id,
          payload: {
            ...convertData,
            createdBy: currentUser?.userId,
          },
        })
      ).unwrap();
      setShowConvertModal(false);
      alert(
        `Project ${result.project.projectCode} created successfully!`
      );
      navigate(`/projects/${result.project.id}`);
    } catch (err) {
      console.error('Failed to convert quotation:', err);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CONVERTED: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getUserName = (userId) => {
    if (!userId) return 'Unknown';
    const user = users.find((u) => u.id === userId);
    return user ? user.name : userId;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const canEdit = quotation?.status === 'DRAFT' || quotation?.status === 'SENT';
  const canApprove =
    (currentUser?.role === 'DIRECTOR' || currentUser?.role === 'PROJECT_MANAGER') &&
    quotation?.status === 'SENT';
  const canConvert = quotation?.status === 'APPROVED';

  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!quotation) {
    return <div className="p-8 text-center">Quotation not found</div>;
  }

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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {quotation.quotationNumber}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {quotation.client?.name}
              {quotation.client?.companyName && ` - ${quotation.client.companyName}`}
            </p>
          </div>
          <div className="flex gap-2">
            <span
              className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                quotation.status
              )}`}
            >
              {quotation.status}
            </span>
            {canEdit && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            )}
          </div>
        </div>
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

      {/* Actions */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>
        <div className="flex flex-wrap gap-2">
          {quotation.status === 'DRAFT' && (
            <button
              onClick={() => setShowSendModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Send Quotation
            </button>
          )}
          {canApprove && (
            <button
              onClick={handleApprove}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Approve
            </button>
          )}
          {quotation.status !== 'REJECTED' &&
            quotation.status !== 'CONVERTED' && (
              <button
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reject
              </button>
            )}
          {canConvert && (
            <button
              onClick={() => setShowConvertModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Convert to Project
            </button>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client
            </label>
            <div className="text-gray-900">
              {quotation.client?.name}
              {quotation.client?.companyName && (
                <div className="text-sm text-gray-500">
                  {quotation.client.companyName}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prepared By
            </label>
            <div className="text-gray-900">{getUserName(quotation.preparedBy)}</div>
          </div>

          {isEditing ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validity Days
                </label>
                <input
                  type="number"
                  name="validityDays"
                  value={formData.validityDays}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="discount"
                  value={formData.discount}
                  onChange={handleInputChange}
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
                  name="vatPercent"
                  value={formData.vatPercent}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validity Days
                </label>
                <div className="text-gray-900">{quotation.validityDays || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Created At
                </label>
                <div className="text-gray-900">
                  {new Date(quotation.createdAt).toLocaleString()}
                </div>
              </div>
            </>
          )}

          {quotation.sentAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sent At
              </label>
              <div className="text-gray-900">
                {new Date(quotation.sentAt).toLocaleString()}
              </div>
            </div>
          )}

          {quotation.approvedBy && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approved By
              </label>
              <div className="text-gray-900">
                {getUserName(quotation.approvedBy)}
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="4"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        )}

        {quotation.notes && !isEditing && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <div className="text-gray-900 whitespace-pre-wrap">
              {quotation.notes}
            </div>
          </div>
        )}

        {isEditing && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Line Items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Area (sqm)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Unit Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Labour
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Overheads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotation.quotationLines?.map((line, index) => (
                <tr key={line.id || index}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {line.itemName}
                    </div>
                    {line.remarks && (
                      <div className="text-sm text-gray-500">{line.remarks}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {line.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {line.areaSqm?.toFixed(2) || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(line.unitRate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(line.labourCost)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(line.overheads)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(line.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Totals</h2>
        <div className="space-y-2 text-right">
          <div className="text-lg">
            <span className="font-medium">Subtotal:</span>{' '}
            {formatCurrency(quotation.subtotal)}
          </div>
          {quotation.discount > 0 && (
            <div className="text-lg">
              <span className="font-medium">Discount:</span>{' '}
              {formatCurrency(quotation.discount)}
            </div>
          )}
          {quotation.vatAmount > 0 && (
            <div className="text-lg">
              <span className="font-medium">VAT ({quotation.vatPercent}%):</span>{' '}
              {formatCurrency(quotation.vatAmount)}
            </div>
          )}
          <div className="text-2xl font-bold border-t pt-2">
            <span>Total:</span> {formatCurrency(quotation.totalAmount)}
          </div>
        </div>
      </div>

      {/* Attachments */}
      {quotation.attachments && quotation.attachments.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Attachments</h2>
          <div className="space-y-2">
            {quotation.attachments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded"
              >
                <span className="text-sm text-gray-900">{doc.fileName}</span>
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${doc.fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Send Quotation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Message
                </label>
                <textarea
                  value={sendData.emailMessage}
                  onChange={(e) =>
                    setSendData({ ...sendData, emailMessage: e.target.value })
                  }
                  rows="4"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={sendData.sendEmail}
                    onChange={(e) =>
                      setSendData({ ...sendData, sendEmail: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Send email to client</span>
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Reject Quotation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows="4"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter reason for rejection..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Convert to Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={convertData.projectName}
                  onChange={(e) =>
                    setConvertData({ ...convertData, projectName: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={convertData.type}
                  onChange={(e) =>
                    setConvertData({ ...convertData, type: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="EXTERNAL">External</option>
                  <option value="INTERNAL">Internal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={convertData.startDate}
                  onChange={(e) =>
                    setConvertData({ ...convertData, startDate: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sub-Groups
                </label>
                <div className="space-y-2">
                  {convertData.subGroups.map((sg, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={sg.name}
                        onChange={(e) => {
                          const updated = [...convertData.subGroups];
                          updated[index].name = e.target.value;
                          setConvertData({ ...convertData, subGroups: updated });
                        }}
                        placeholder="Sub-group name"
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                      />
                      <input
                        type="number"
                        value={sg.plannedQty}
                        onChange={(e) => {
                          const updated = [...convertData.subGroups];
                          updated[index].plannedQty = parseFloat(e.target.value) || 0;
                          setConvertData({ ...convertData, subGroups: updated });
                        }}
                        placeholder="Qty"
                        className="w-24 border border-gray-300 rounded-md px-3 py-2"
                      />
                      <button
                        onClick={() => {
                          const updated = convertData.subGroups.filter(
                            (_, i) => i !== index
                          );
                          setConvertData({ ...convertData, subGroups: updated });
                        }}
                        className="text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setConvertData({
                        ...convertData,
                        subGroups: [
                          ...convertData.subGroups,
                          { name: '', plannedQty: 0, lines: [] },
                        ],
                      });
                    }}
                    className="text-blue-600 text-sm"
                  >
                    + Add Sub-Group
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Convert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationDetail;

