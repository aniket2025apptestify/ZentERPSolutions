import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  selectVendors,
  selectVendorsStatus,
  selectVendorsError,
  clearError,
} from '../../store/slices/vendorsSlice';

const VendorList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const vendors = useSelector(selectVendors);
  const status = useSelector(selectVendorsStatus);
  const error = useSelector(selectVendorsError);

  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    contactPerson: '',
    email: '',
    email2: '',
    phone: '',
    phone2: '',
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    vatNumber: '',
    gstin: '',
    panNumber: '',
    taxId: '',
    website: '',
    registrationNumber: '',
    bankDetails: '',
    paymentTerms: '',
    creditLimit: '',
    notes: '',
  });

  useEffect(() => {
    dispatch(fetchVendors({ search: searchTerm }));
  }, [dispatch, searchTerm]);

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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      // Parse bankDetails if it's a JSON string
      if (submitData.bankDetails && submitData.bankDetails.trim()) {
        try {
          submitData.bankDetails = JSON.parse(submitData.bankDetails);
        } catch (err) {
          alert('Invalid JSON format in Bank Details. Please check and try again.');
          return;
        }
      } else {
        submitData.bankDetails = null;
      }

      if (editingVendor) {
        await dispatch(updateVendor({ id: editingVendor.id, data: submitData })).unwrap();
      } else {
        await dispatch(createVendor(submitData)).unwrap();
      }
      handleCloseModal();
      dispatch(fetchVendors({ search: searchTerm }));
    } catch (err) {
      console.error('Failed to save vendor:', err);
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name || '',
      companyName: vendor.companyName || '',
      contactPerson: vendor.contactPerson || '',
      email: vendor.email || '',
      email2: vendor.email2 || '',
      phone: vendor.phone || '',
      phone2: vendor.phone2 || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      country: vendor.country || '',
      zipCode: vendor.zipCode || '',
      vatNumber: vendor.vatNumber || '',
      gstin: vendor.gstin || '',
      panNumber: vendor.panNumber || '',
      taxId: vendor.taxId || '',
      website: vendor.website || '',
      registrationNumber: vendor.registrationNumber || '',
      bankDetails: vendor.bankDetails 
        ? (typeof vendor.bankDetails === 'string' 
            ? vendor.bankDetails 
            : JSON.stringify(vendor.bankDetails, null, 2))
        : '',
      paymentTerms: vendor.paymentTerms || '',
      creditLimit: vendor.creditLimit || '',
      notes: vendor.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await dispatch(deleteVendor(deleteConfirm.id)).unwrap();
      setDeleteConfirm(null);
      dispatch(fetchVendors({ search: searchTerm }));
    } catch (err) {
      console.error('Failed to delete vendor:', err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVendor(null);
    setFormData({
      name: '',
      companyName: '',
      contactPerson: '',
      email: '',
      email2: '',
      phone: '',
      phone2: '',
      address: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
      vatNumber: '',
      gstin: '',
      panNumber: '',
      taxId: '',
      website: '',
      registrationNumber: '',
      bankDetails: '',
      paymentTerms: '',
      creditLimit: '',
      notes: '',
    });
  };

  const filteredVendors = vendors.filter((vendor) =>
    searchTerm
      ? vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.phone?.includes(searchTerm)
      : true
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Vendors</h1>
          <p className="mt-2 text-sm text-gray-600">Manage your supplier master data</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 hover:scale-105"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Vendor
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start">
          <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Search and Filter Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search vendors by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
          />
        </div>
      </div>

      {/* Vendors Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
        {status === 'loading' ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
            <p className="mt-4 text-sm text-gray-600">Loading vendors...</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-4 text-sm font-semibold text-gray-900">No vendors found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new vendor.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Contact Person
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => navigate(`/procurement/vendors/${vendor.id}`)}
                      >
                        {vendor.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vendor.contactPerson || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vendor.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vendor.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">{vendor.address || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(vendor)}
                          className="text-blue-600 hover:text-blue-800 font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(vendor)}
                          className="text-red-600 hover:text-red-800 font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingVendor ? 'Edit Vendor' : 'New Vendor'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    placeholder="Enter vendor name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    placeholder="Enter contact person name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    placeholder="vendor@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Alternative Email
                  </label>
                  <input
                    type="email"
                    name="email2"
                    value={formData.email2}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    placeholder="vendor2@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    placeholder="+1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Alternative Phone
                  </label>
                  <input
                    type="text"
                    name="phone2"
                    value={formData.phone2}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    placeholder="+1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  placeholder="Enter vendor address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    name="vatNumber"
                    value={formData.vatNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    placeholder="e.g., Net 30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Credit Limit
                </label>
                <input
                  type="number"
                  name="creditLimit"
                  value={formData.creditLimit}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bank Details <span className="text-gray-400 text-xs">(JSON format)</span>
                </label>
                <textarea
                  name="bankDetails"
                  value={formData.bankDetails}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white font-mono"
                  placeholder='{"accountNumber": "123456", "bankName": "Bank Name", "ifsc": "IFSC123"}'
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  placeholder="Additional notes about the vendor"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200"
                >
                  {editingVendor ? 'Update Vendor' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Vendor</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold">{deleteConfirm.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorList;
