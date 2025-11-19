import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchInquiryById,
  updateInquiry,
  addFollowUp,
  selectCurrentInquiry,
  selectInquiriesStatus,
  selectInquiriesError,
  clearError,
  clearCurrentInquiry,
} from '../store/slices/inquiriesSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import { selectUsers } from '../store/slices/usersSlice';
import UploadAttachments from '../components/UploadAttachments';
import api from '../services/api';

const InquiryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const inquiry = useSelector(selectCurrentInquiry);
  const status = useSelector(selectInquiriesStatus);
  const error = useSelector(selectInquiriesError);
  const users = useSelector(selectUsers);

  const [isEditing, setIsEditing] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [formData, setFormData] = useState({
    status: '',
    notes: '',
    assignedTo: '',
    visitDate: '',
  });
  const [followUpData, setFollowUpData] = useState({
    type: 'CALL',
    notes: '',
    date: '',
  });

  useEffect(() => {
    if (id) {
      dispatch(fetchInquiryById(id));
      dispatch(fetchUsers());
    }

    return () => {
      dispatch(clearCurrentInquiry());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (inquiry) {
      setFormData({
        status: inquiry.status || '',
        notes: inquiry.notes || '',
        assignedTo: inquiry.assignedTo || '',
        visitDate: inquiry.visitDate
          ? new Date(inquiry.visitDate).toISOString().split('T')[0]
          : '',
      });
    }
  }, [inquiry]);

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
      [name]: value,
    }));
  };

  const handleFollowUpChange = (e) => {
    const { name, value } = e.target;
    setFollowUpData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      await dispatch(
        updateInquiry({
          id: inquiry.id,
          data: {
            ...formData,
            visitDate: formData.visitDate || null,
          },
        })
      ).unwrap();
      setIsEditing(false);
      dispatch(fetchInquiryById(id));
    } catch (err) {
      console.error('Failed to update inquiry:', err);
    }
  };

  const handleAddFollowUp = async (e) => {
    e.preventDefault();
    try {
      await dispatch(
        addFollowUp({
          id: inquiry.id,
          followUpData,
        })
      ).unwrap();
      setFollowUpData({
        type: 'CALL',
        notes: '',
        date: '',
      });
      setShowFollowUpForm(false);
      dispatch(fetchInquiryById(id));
    } catch (err) {
      console.error('Failed to add follow-up:', err);
    }
  };

  const handleDownload = (document) => {
    const fileUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${document.fileUrl}`;
    window.open(fileUrl, '_blank');
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      NEW: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      VISITED: 'bg-purple-100 text-purple-800',
      QUOTED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getUserName = (userId) => {
    if (!userId) return 'Unassigned';
    const user = users.find((u) => u.id === userId);
    return user ? user.name : userId;
  };

  if (status === 'loading' && !inquiry) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Inquiry not found</p>
        <button
          onClick={() => navigate('/inquiries')}
          className="mt-4 text-indigo-600 hover:text-indigo-900"
        >
          Back to Inquiries
        </button>
      </div>
    );
  }

  const followUps = inquiry.followUps || [];
  const documents = inquiry.documents || [];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <button
              onClick={() => navigate('/inquiries')}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              ← Back to Inquiries
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Inquiry Details</h1>
            <p className="mt-2 text-sm text-gray-600">
              Client: {inquiry.client?.name || 'N/A'}
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Edit
            </button>
          )}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                {isEditing ? (
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="NEW">New</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="VISITED">Visited</option>
                    <option value="QUOTED">Quoted</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                ) : (
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                        inquiry.status
                      )}`}
                    >
                      {inquiry.status}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Source</label>
                <p className="mt-1 text-sm text-gray-900">{inquiry.source}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Project Type</label>
                <p className="mt-1 text-sm text-gray-900">{inquiry.projectType}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <p className="mt-1 text-sm text-gray-900">{inquiry.location || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                {isEditing ? (
                  <select
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 text-sm text-gray-900">
                    {getUserName(inquiry.assignedTo)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Visit Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    name="visitDate"
                    value={formData.visitDate}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">
                    {inquiry.visitDate
                      ? new Date(inquiry.visitDate).toLocaleDateString()
                      : '-'}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              {isEditing ? (
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {inquiry.notes || '-'}
                </p>
              )}
            </div>

            {isEditing && (
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      status: inquiry.status || '',
                      notes: inquiry.notes || '',
                      assignedTo: inquiry.assignedTo || '',
                      visitDate: inquiry.visitDate
                        ? new Date(inquiry.visitDate).toISOString().split('T')[0]
                        : '',
                    });
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Follow-ups */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Follow-ups</h2>
              <button
                onClick={() => setShowFollowUpForm(!showFollowUpForm)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {showFollowUpForm ? 'Cancel' : '+ Add Follow-up'}
              </button>
            </div>

            {showFollowUpForm && (
              <form onSubmit={handleAddFollowUp} className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      name="type"
                      value={followUpData.type}
                      onChange={handleFollowUpChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    >
                      <option value="CALL">Call</option>
                      <option value="EMAIL">Email</option>
                      <option value="MEETING">Meeting</option>
                      <option value="VISIT">Visit</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={followUpData.date}
                      onChange={handleFollowUpChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={followUpData.notes}
                    onChange={handleFollowUpChange}
                    rows={3}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Add Follow-up
                </button>
              </form>
            )}

            {followUps.length === 0 ? (
              <p className="text-sm text-gray-500">No follow-ups yet</p>
            ) : (
              <div className="space-y-3">
                {followUps.map((followUp, index) => (
                  <div key={followUp.id || index} className="border-l-4 border-indigo-500 pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {followUp.type}
                          </span>
                          {(followUp.date || followUp.followUpDate) && (
                            <span className="text-xs text-gray-500">
                              {new Date(followUp.date || followUp.followUpDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{followUp.notes}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(followUp.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Attachments</h2>
            <UploadAttachments
              entityType="INQUIRY"
              entityId={inquiry.id}
              onUploadSuccess={() => dispatch(fetchInquiryById(id))}
            />
            {documents.length > 0 && (
              <div className="mt-4 space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="text-sm text-gray-900">{doc.fileName}</span>
                    </div>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="text-sm text-indigo-600 hover:text-indigo-900"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Client Information</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{inquiry.client?.name || '-'}</p>
              </div>
              {inquiry.client?.companyName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {inquiry.client.companyName}
                  </p>
                </div>
              )}
              {inquiry.client?.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{inquiry.client.email}</p>
                </div>
              )}
              {inquiry.client?.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{inquiry.client.phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InquiryDetail;

