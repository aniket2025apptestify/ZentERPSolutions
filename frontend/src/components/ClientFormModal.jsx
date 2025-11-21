import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createClient, updateClient, selectClientsError, clearError } from '../store/slices/clientsSlice';

const ClientFormModal = ({ client = null, onClose }) => {
  const dispatch = useDispatch();
  const error = useSelector(selectClientsError);
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
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
    paymentTerms: '',
    creditLimit: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        companyName: client.companyName || '',
        email: client.email || '',
        phone: client.phone || '',
        phone2: client.phone2 || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        country: client.country || '',
        zipCode: client.zipCode || '',
        vatNumber: client.vatNumber || '',
        gstin: client.gstin || '',
        panNumber: client.panNumber || '',
        taxId: client.taxId || '',
        website: client.website || '',
        registrationNumber: client.registrationNumber || '',
        paymentTerms: client.paymentTerms || '',
        creditLimit: client.creditLimit || '',
        notes: client.notes || '',
      });
    } else {
      setFormData({
        name: '',
        companyName: '',
        email: '',
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
        paymentTerms: '',
        creditLimit: '',
        notes: '',
      });
    }
    setValidationErrors({});
  }, [client]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const validateEmail = (email) => {
    if (!email) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    if (!phone) return true; // Optional field
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    if (error) {
      dispatch(clearError());
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (formData.email && !validateEmail(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      errors.phone = 'Invalid phone format';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (client) {
        await dispatch(updateClient({ id: client.id, ...formData })).unwrap();
      } else {
        await dispatch(createClient(formData)).unwrap();
      }
      onClose();
    } catch (err) {
      console.error('Failed to save client:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {client ? 'Edit Client' : 'Create New Client'}
                  </h3>

                  {error && (
                    <div className="mb-4 rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">{error}</h3>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                            validationErrors.name ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {validationErrors.name && (
                          <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="companyName" className="block text-sm font-semibold text-gray-700 mb-2">
                          Company Name
                        </label>
                        <input
                          type="text"
                          name="companyName"
                          id="companyName"
                          value={formData.companyName}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          id="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                            validationErrors.email ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {validationErrors.email && (
                          <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                          Phone
                        </label>
                        <input
                          type="text"
                          name="phone"
                          id="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+91 9999999999"
                          className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                            validationErrors.phone ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {validationErrors.phone && (
                          <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="phone2" className="block text-sm font-semibold text-gray-700 mb-2">
                          Alternative Phone
                        </label>
                        <input
                          type="text"
                          name="phone2"
                          id="phone2"
                          value={formData.phone2}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="website" className="block text-sm font-semibold text-gray-700 mb-2">
                          Website
                        </label>
                        <input
                          type="url"
                          name="website"
                          id="website"
                          value={formData.website}
                          onChange={handleChange}
                          placeholder="https://example.com"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        name="address"
                        id="address"
                        rows={2}
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      <div>
                        <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          name="city"
                          id="city"
                          value={formData.city}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="state" className="block text-sm font-semibold text-gray-700 mb-2">
                          State
                        </label>
                        <input
                          type="text"
                          name="state"
                          id="state"
                          value={formData.state}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="country" className="block text-sm font-semibold text-gray-700 mb-2">
                          Country
                        </label>
                        <input
                          type="text"
                          name="country"
                          id="country"
                          value={formData.country}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="zipCode" className="block text-sm font-semibold text-gray-700 mb-2">
                          Zip Code
                        </label>
                        <input
                          type="text"
                          name="zipCode"
                          id="zipCode"
                          value={formData.zipCode}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label htmlFor="vatNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                          VAT Number
                        </label>
                        <input
                          type="text"
                          name="vatNumber"
                          id="vatNumber"
                          value={formData.vatNumber}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="gstin" className="block text-sm font-semibold text-gray-700 mb-2">
                          GSTIN
                        </label>
                        <input
                          type="text"
                          name="gstin"
                          id="gstin"
                          value={formData.gstin}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="panNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                          PAN Number
                        </label>
                        <input
                          type="text"
                          name="panNumber"
                          id="panNumber"
                          value={formData.panNumber}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label htmlFor="taxId" className="block text-sm font-semibold text-gray-700 mb-2">
                          Tax ID
                        </label>
                        <input
                          type="text"
                          name="taxId"
                          id="taxId"
                          value={formData.taxId}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="registrationNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                          Registration Number
                        </label>
                        <input
                          type="text"
                          name="registrationNumber"
                          id="registrationNumber"
                          value={formData.registrationNumber}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="paymentTerms" className="block text-sm font-semibold text-gray-700 mb-2">
                          Payment Terms
                        </label>
                        <input
                          type="text"
                          name="paymentTerms"
                          id="paymentTerms"
                          value={formData.paymentTerms}
                          onChange={handleChange}
                          placeholder="e.g., Net 30"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="creditLimit" className="block text-sm font-semibold text-gray-700 mb-2">
                        Credit Limit
                      </label>
                      <input
                        type="number"
                        name="creditLimit"
                        id="creditLimit"
                        value={formData.creditLimit}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        id="notes"
                        rows={3}
                        value={formData.notes}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex justify-center rounded-xl border border-transparent shadow-lg px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-base font-medium text-white hover:shadow-xl transition-all sm:ml-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-6 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientFormModal;

