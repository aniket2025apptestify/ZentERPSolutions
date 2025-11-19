import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createTenant, selectTenantsStatus, selectTenantsError, clearError } from '../store/slices/tenantsSlice';

const STEPS = [
  { id: 1, name: 'Basic Info', description: 'Tenant name and code' },
  { id: 2, name: 'Production Stages', description: 'Configure production workflow' },
  { id: 3, name: 'Settings', description: 'VAT and timezone' },
  { id: 4, name: 'Admin User', description: 'Create admin account' },
];

const DEFAULT_PRODUCTION_STAGES = [
  'CUTTING',
  'FABRICATION',
  'MACHINING',
  'ASSEMBLY',
  'GLAZING',
  'QC',
  'PACKING',
];

const TenantOnboardingWizard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const status = useSelector(selectTenantsStatus);
  const error = useSelector(selectTenantsError);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1
    name: '',
    code: '',
    address: '',
    vatNumber: '',
    // Step 2
    productionStages: [...DEFAULT_PRODUCTION_STAGES],
    newStage: '',
    // Step 3
    vatPercent: 5,
    timezone: 'Asia/Kolkata',
    // Step 4
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) dispatch(clearError());
  };

  const handleAddStage = () => {
    if (formData.newStage.trim() && !formData.productionStages.includes(formData.newStage.trim().toUpperCase())) {
      setFormData((prev) => ({
        ...prev,
        productionStages: [...prev.productionStages, prev.newStage.trim().toUpperCase()],
        newStage: '',
      }));
    }
  };

  const handleRemoveStage = (stage) => {
    setFormData((prev) => ({
      ...prev,
      productionStages: prev.productionStages.filter((s) => s !== stage),
    }));
  };

  const handleNext = () => {
    // Validation
    if (currentStep === 1) {
      if (!formData.name || !formData.code) {
        alert('Please fill in all required fields');
        return;
      }
    } else if (currentStep === 2) {
      if (formData.productionStages.length === 0) {
        alert('Please add at least one production stage');
        return;
      }
    } else if (currentStep === 3) {
      // No strict validation needed
    } else if (currentStep === 4) {
      if (!formData.adminName || !formData.adminEmail || !formData.adminPassword) {
        alert('Please fill in all admin user fields');
        return;
      }
      if (formData.adminPassword !== formData.adminPasswordConfirm) {
        alert('Passwords do not match');
        return;
      }
      if (formData.adminPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }
    }

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const tenantData = {
      name: formData.name,
      code: formData.code.toUpperCase(),
      address: formData.address || undefined,
      vatNumber: formData.vatNumber || undefined,
      productionStages: formData.productionStages,
      settings: {
        vatPercent: parseFloat(formData.vatPercent) || 0,
        timezone: formData.timezone,
      },
      admin: {
        name: formData.adminName,
        email: formData.adminEmail,
        password: formData.adminPassword,
      },
    };

    try {
      await dispatch(createTenant(tenantData)).unwrap();
      navigate('/super/tenants');
    } catch (err) {
      console.error('Failed to create tenant:', err);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Tenant Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., SkyTeck Aluminium"
              />
            </div>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Tenant Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                id="code"
                required
                value={formData.code}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm uppercase"
                placeholder="e.g., SKYTECK"
                style={{ textTransform: 'uppercase' }}
              />
              <p className="mt-2 text-sm text-gray-500">Unique code for this tenant (uppercase, no spaces)</p>
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                name="address"
                id="address"
                rows={3}
                value={formData.address}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., Pune, India"
              />
            </div>
            <div>
              <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700">
                VAT Number
              </label>
              <input
                type="text"
                name="vatNumber"
                id="vatNumber"
                value={formData.vatNumber}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., VAT123"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Production Stages
              </label>
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  value={formData.newStage}
                  onChange={(e) => setFormData((prev) => ({ ...prev, newStage: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddStage()}
                  className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm uppercase"
                  placeholder="Add new stage (e.g., WELDING)"
                  style={{ textTransform: 'uppercase' }}
                />
                <button
                  type="button"
                  onClick={handleAddStage}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.productionStages.map((stage) => (
                  <span
                    key={stage}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                  >
                    {stage}
                    <button
                      type="button"
                      onClick={() => handleRemoveStage(stage)}
                      className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500"
                    >
                      <span className="sr-only">Remove</span>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="vatPercent" className="block text-sm font-medium text-gray-700">
                VAT Percentage
              </label>
              <input
                type="number"
                name="vatPercent"
                id="vatPercent"
                min="0"
                max="100"
                step="0.01"
                value={formData.vatPercent}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                Timezone
              </label>
              <select
                name="timezone"
                id="timezone"
                value={formData.timezone}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              </select>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="adminName" className="block text-sm font-medium text-gray-700">
                Admin Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="adminName"
                id="adminName"
                required
                value={formData.adminName}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., Admin User"
              />
            </div>
            <div>
              <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
                Admin Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="adminEmail"
                id="adminEmail"
                required
                value={formData.adminEmail}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., admin@skyteck.com"
              />
            </div>
            <div>
              <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="adminPassword"
                id="adminPassword"
                required
                value={formData.adminPassword}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Minimum 6 characters"
              />
            </div>
            <div>
              <label htmlFor="adminPasswordConfirm" className="block text-sm font-medium text-gray-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="adminPasswordConfirm"
                id="adminPasswordConfirm"
                required
                value={formData.adminPasswordConfirm}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Re-enter password"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/super/tenants')}
            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium mb-4"
          >
            ← Back to Tenants
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Tenant</h1>
          <p className="mt-2 text-sm text-gray-600">Set up a new tenant with default settings</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {STEPS.map((step, stepIdx) => (
                <li key={step.id} className={`${stepIdx !== STEPS.length - 1 ? 'pr-8 sm:pr-20' : ''} relative`}>
                  <div className="flex items-center">
                    <div
                      className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                        step.id <= currentStep
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-gray-300 bg-white text-gray-500'
                      }`}
                    >
                      {step.id < currentStep ? (
                        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-sm font-medium">{step.id}</span>
                      )}
                    </div>
                    <div className="ml-4 min-w-0 flex-1">
                      <p className={`text-sm font-medium ${step.id <= currentStep ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {step.name}
                      </p>
                      <p className="text-sm text-gray-500">{step.description}</p>
                    </div>
                  </div>
                  {stepIdx !== STEPS.length - 1 && (
                    <div className="absolute top-4 left-4 -ml-px h-0.5 w-full bg-gray-300" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Form Card */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            {error && (
              <div className="mb-6 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            {renderStepContent()}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={status === 'loading'}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Creating...' : 'Create Tenant'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantOnboardingWizard;

