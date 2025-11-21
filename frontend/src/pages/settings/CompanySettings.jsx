import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';

const CompanySettings = () => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    countryCode: '',
    zipCode: '',
    phone: '',
    vatNumber: '',
    gstin: '',
    companyInfoFormat: '{company_name}\n{address}\n{city} {state}\n{country_code} {zip_code}',
    customFields: [],
    cloudinary: {
      cloudName: '',
      apiKey: '',
      apiSecret: '',
      enabled: false,
    },
    smtp: {
      enabled: false,
      host: '',
      port: '587',
      secure: false,
      user: '',
      password: '',
      fromName: '',
      fromEmail: '',
      replyTo: '',
    },
  });
  const [testingCloudinary, setTestingCloudinary] = useState(false);
  const [testingSMTP, setTestingSMTP] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/tenant/settings');
      const data = response.data;
      
      setFormData({
        name: data.name || '',
        address: data.address || '',
        city: data.settings?.city || '',
        state: data.settings?.state || '',
        countryCode: data.settings?.countryCode || '',
        zipCode: data.settings?.zipCode || '',
        phone: data.settings?.phone || '',
        vatNumber: data.vatNumber || '',
        gstin: data.settings?.gstin || '',
        companyInfoFormat: data.settings?.companyInfoFormat || '{company_name}\n{address}\n{city} {state}\n{country_code} {zip_code}',
        customFields: data.settings?.customFields || [],
        cloudinary: {
          cloudName: data.settings?.cloudinary?.cloudName || '',
          apiKey: data.settings?.cloudinary?.apiKey || '',
          apiSecret: data.settings?.cloudinary?.apiSecret || '',
          enabled: data.settings?.cloudinary?.enabled || false,
        },
        smtp: {
          enabled: data.settings?.smtp?.enabled || false,
          host: data.settings?.smtp?.host || '',
          port: data.settings?.smtp?.port || '587',
          secure: data.settings?.smtp?.secure || false,
          user: data.settings?.smtp?.user || '',
          password: data.settings?.smtp?.password || '', // Will be empty for security
          fromName: data.settings?.smtp?.fromName || data.name || '',
          fromEmail: data.settings?.smtp?.fromEmail || '',
          replyTo: data.settings?.smtp?.replyTo || '',
        },
      });
      
      if (data.logoUrl) {
        // If it's a Cloudinary URL, use it directly; otherwise prepend API URL
        if (data.logoUrl.startsWith('http://') || data.logoUrl.startsWith('https://')) {
          setLogoUrl(data.logoUrl);
          setLogoPreview(data.logoUrl);
        } else {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          setLogoUrl(`${apiUrl}${data.logoUrl}`);
          setLogoPreview(`${apiUrl}${data.logoUrl}`);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('cloudinary.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        cloudinary: {
          ...prev.cloudinary,
          [field]: type === 'checkbox' ? checked : value,
        },
      }));
    } else if (name.startsWith('smtp.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        smtp: {
          ...prev.smtp,
          [field]: type === 'checkbox' ? checked : value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleTestCloudinary = async () => {
    setTestingCloudinary(true);
    try {
      const response = await api.post('/api/tenant/settings/test-cloudinary', {
        cloudName: formData.cloudinary.cloudName,
        apiKey: formData.cloudinary.apiKey,
        apiSecret: formData.cloudinary.apiSecret,
      });
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Cloudinary connection successful!' });
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Connection failed' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to test Cloudinary connection',
      });
    } finally {
      setTestingCloudinary(false);
    }
  };

  const handleTestSMTP = async () => {
    setTestingSMTP(true);
    try {
      const response = await api.post('/api/tenant/settings/test-smtp', {
        host: formData.smtp.host,
        port: formData.smtp.port,
        secure: formData.smtp.secure,
        user: formData.smtp.user,
        password: formData.smtp.password,
      });
      if (response.data.success) {
        setMessage({ type: 'success', text: 'SMTP connection successful!' });
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Connection failed' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to test SMTP connection',
      });
    } finally {
      setTestingSMTP(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      setMessage({ type: 'error', text: 'Please enter a test email address' });
      return;
    }

    setSendingTestEmail(true);
    try {
      const response = await api.post('/api/tenant/settings/test-email', {
        smtpConfig: {
          host: formData.smtp.host,
          port: formData.smtp.port,
          secure: formData.smtp.secure,
          user: formData.smtp.user,
          password: formData.smtp.password,
          fromName: formData.smtp.fromName,
          fromEmail: formData.smtp.fromEmail,
        },
        toEmail: testEmailAddress,
      });
      if (response.data.success) {
        setMessage({ type: 'success', text: `Test email sent successfully to ${testEmailAddress}!` });
        setTestEmailAddress('');
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Failed to send test email' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to send test email',
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Logo file size must be less than 5MB' });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/tenant/settings/logo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload logo');
      }

      const data = await response.json();
      setLogoUrl(`${apiUrl}${data.logoUrl}`);
      setLogoPreview(`${apiUrl}${data.logoUrl}`);
      setLogoFile(null);
      setMessage({ type: 'success', text: 'Logo uploaded successfully' });
    } catch (error) {
      console.error('Failed to upload logo:', error);
      setMessage({ type: 'error', text: 'Failed to upload logo' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Upload logo first if selected
      if (logoFile) {
        await handleUploadLogo();
      }
      
      // Prepare settings data - don't send password if it's masked (user didn't change it)
      const settingsToSave = { ...formData };
      if (settingsToSave.smtp.password === '••••••••' || settingsToSave.smtp.password === '') {
        // Don't send password if it's masked or empty (backend will keep existing)
        delete settingsToSave.smtp.password;
      }
      
      // Then save settings
      await api.put('/api/tenant/settings', settingsToSave);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
      
      // Refresh settings to get updated data (especially masked password)
      await fetchSettings();
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = () => {
    setFormData((prev) => ({
      ...prev,
      customFields: [...prev.customFields, { label: '', value: '', placeholder: '' }],
    }));
  };

  const updateCustomField = (index, field, value) => {
    setFormData((prev) => {
      const newFields = [...prev.customFields];
      newFields[index] = { ...newFields[index], [field]: value };
      return { ...prev, customFields: newFields };
    });
  };

  const removeCustomField = (index) => {
    setFormData((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
        <p className="mt-2 text-sm text-gray-600">Manage your company information</p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-md bg-blue-50 p-4 border border-blue-200">
        <p className="text-sm text-blue-800">
          These information will be displayed on invoices/estimates/payments and other PDF documents where company info is required.
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div
          className={`mb-4 rounded-md p-4 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Company Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
              <input
                type="text"
                name="countryCode"
                value={formData.countryCode}
                onChange={handleChange}
                placeholder="IN"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
              <input
                type="text"
                name="vatNumber"
                value={formData.vatNumber}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Company Logo</h2>
          <div className="flex items-start gap-6">
            {logoPreview && (
              <div className="flex-shrink-0">
                <img
                  src={logoPreview}
                  alt="Company Logo"
                  className="h-24 w-24 object-contain border border-gray-300 rounded"
                />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-2 text-sm text-gray-500">Upload a logo image (max 5MB)</p>
            </div>
          </div>
        </div>

        {/* Company Information Format */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Company Information Format (PDF and HTML)</h2>
          <textarea
            name="companyInfoFormat"
            value={formData.companyInfoFormat}
            onChange={handleChange}
            rows={6}
            className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
            placeholder="{company_name}&#10;{address}&#10;{city} {state}&#10;{country_code} {zip_code}"
          />
          <p className="mt-2 text-sm text-gray-500">
            Available placeholders: {' '}
            <code className="bg-gray-100 px-1 rounded">
              {'{company_name}, {address}, {city}, {state}, {zip_code}, {country_code}, {phone}, {vat_number}, {vat_number_with_label}'}
            </code>
          </p>
        </div>

        {/* Cloudinary Storage Configuration */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Cloudinary Storage</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure Cloudinary for cloud storage. Files will be uploaded to Cloudinary instead of local storage when enabled.
          </p>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="cloudinary.enabled"
                id="cloudinary.enabled"
                checked={formData.cloudinary.enabled}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="cloudinary.enabled" className="ml-2 block text-sm text-gray-900">
                Enable Cloudinary Storage
              </label>
            </div>
            {formData.cloudinary.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cloud Name *
                  </label>
                  <input
                    type="text"
                    name="cloudinary.cloudName"
                    value={formData.cloudinary.cloudName}
                    onChange={handleChange}
                    required={formData.cloudinary.enabled}
                    placeholder="your-cloud-name"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key *
                  </label>
                  <input
                    type="text"
                    name="cloudinary.apiKey"
                    value={formData.cloudinary.apiKey}
                    onChange={handleChange}
                    required={formData.cloudinary.enabled}
                    placeholder="123456789012345"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Secret *
                  </label>
                  <input
                    type="password"
                    name="cloudinary.apiSecret"
                    value={formData.cloudinary.apiSecret}
                    onChange={handleChange}
                    required={formData.cloudinary.enabled}
                    placeholder="••••••••••••••••"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleTestCloudinary}
                    disabled={testingCloudinary || !formData.cloudinary.cloudName || !formData.cloudinary.apiKey || !formData.cloudinary.apiSecret}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {testingCloudinary ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SMTP Email Configuration */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">SMTP Email Configuration</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure your SMTP server settings to send emails (quotations, material requests, etc.) from your own email server.
            If not configured, the system will use default SMTP settings from environment variables.
          </p>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="smtp.enabled"
                id="smtp.enabled"
                checked={formData.smtp.enabled}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="smtp.enabled" className="ml-2 block text-sm text-gray-900">
                Enable Custom SMTP
              </label>
            </div>
            {formData.smtp.enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Host *
                    </label>
                    <input
                      type="text"
                      name="smtp.host"
                      value={formData.smtp.host}
                      onChange={handleChange}
                      required={formData.smtp.enabled}
                      placeholder="smtp.gmail.com"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Port *
                    </label>
                    <input
                      type="text"
                      name="smtp.port"
                      value={formData.smtp.port}
                      onChange={handleChange}
                      required={formData.smtp.enabled}
                      placeholder="587"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Username/Email *
                    </label>
                    <input
                      type="text"
                      name="smtp.user"
                      value={formData.smtp.user}
                      onChange={handleChange}
                      required={formData.smtp.enabled}
                      placeholder="your-email@example.com"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Password *
                    </label>
                    <input
                      type="password"
                      name="smtp.password"
                      value={formData.smtp.password}
                      onChange={handleChange}
                      required={formData.smtp.enabled}
                      placeholder="••••••••••••••••"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave empty to keep existing password. For Gmail, use an App Password.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Name
                    </label>
                    <input
                      type="text"
                      name="smtp.fromName"
                      value={formData.smtp.fromName}
                      onChange={handleChange}
                      placeholder="Your Company Name"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Email
                    </label>
                    <input
                      type="email"
                      name="smtp.fromEmail"
                      value={formData.smtp.fromEmail}
                      onChange={handleChange}
                      placeholder="noreply@example.com"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave empty to use SMTP username
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reply-To Email
                    </label>
                    <input
                      type="email"
                      name="smtp.replyTo"
                      value={formData.smtp.replyTo}
                      onChange={handleChange}
                      placeholder="support@example.com"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <input
                      type="checkbox"
                      name="smtp.secure"
                      id="smtp.secure"
                      checked={formData.smtp.secure}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="smtp.secure" className="ml-2 block text-sm text-gray-900">
                      Use SSL/TLS (Port 465)
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleTestSMTP}
                    disabled={testingSMTP || !formData.smtp.host || !formData.smtp.user || !formData.smtp.password}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {testingSMTP ? 'Testing...' : 'Test SMTP Connection'}
                  </button>
                  <div className="flex gap-2 flex-1 max-w-md">
                    <input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="Enter email to send test email"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={sendingTestEmail || !testEmailAddress || !formData.smtp.host || !formData.smtp.user || !formData.smtp.password}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                    >
                      {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Custom Fields */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Custom Fields</h2>
            <button
              type="button"
              onClick={addCustomField}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              + Add Custom Field
            </button>
          </div>
          {formData.customFields.length === 0 ? (
            <p className="text-sm text-gray-500">No custom fields added yet</p>
          ) : (
            <div className="space-y-3">
              {formData.customFields.map((field, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                      placeholder="e.g., GSTIN"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                      placeholder="e.g., {cf_1}"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomField(index)}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanySettings;

