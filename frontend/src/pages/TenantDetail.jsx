import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTenantById, selectCurrentTenant, selectTenantsStatus, selectTenantsError } from '../store/slices/tenantsSlice';

const TenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const tenant = useSelector(selectCurrentTenant);
  const status = useSelector(selectTenantsStatus);
  const error = useSelector(selectTenantsError);

  useEffect(() => {
    if (id) {
      dispatch(fetchTenantById(id));
    }
  }, [id, dispatch]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-red-600">{error || 'Tenant not found'}</p>
          <button
            onClick={() => navigate('/super/tenants')}
            className="mt-4 text-indigo-600 hover:text-indigo-900"
          >
            ← Back to Tenants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/super/tenants')}
            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium mb-4"
          >
            ← Back to Tenants
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="mt-2 text-sm text-gray-600">Tenant Details</p>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Tenant Code</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {tenant.code}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900">{tenant.address || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">VAT Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{tenant.vatNumber || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(tenant.createdAt).toLocaleString()}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Statistics</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <div className="flex space-x-4">
                    <span>{tenant._count?.users || 0} Users</span>
                    <span>{tenant._count?.clients || 0} Clients</span>
                    <span>{tenant._count?.projects || 0} Projects</span>
                  </div>
                </dd>
              </div>
              {tenant.productionStages && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Production Stages</dt>
                  <dd className="mt-1">
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(tenant.productionStages) &&
                        tenant.productionStages.map((stage) => (
                          <span
                            key={stage}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                          >
                            {stage}
                          </span>
                        ))}
                    </div>
                  </dd>
                </div>
              )}
              {tenant.settings && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Settings</dt>
                  <dd className="mt-1">
                    <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-auto">
                      {JSON.stringify(tenant.settings, null, 2)}
                    </pre>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantDetail;

