import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  createDN,
  selectDNError,
  clearError,
} from '../../store/slices/dnSlice';
import { fetchProjects } from '../../store/slices/projectsSlice';
import { selectProjects } from '../../store/slices/projectsSlice';
import { fetchClients } from '../../store/slices/clientsSlice';
import { selectClients } from '../../store/slices/clientsSlice';
import { fetchProductionBoard } from '../../store/slices/productionSlice';
import { selectProductionList } from '../../store/slices/productionSlice';
import { fetchItems } from '../../store/slices/inventorySlice';
import { selectItems } from '../../store/slices/inventorySlice';
import { selectUser } from '../../store/slices/authSlice';

const CreateDN = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const projects = useSelector(selectProjects);
  const clients = useSelector(selectClients);
  const productionJobs = useSelector(selectProductionList);
  const items = useSelector(selectItems);
  const error = useSelector(selectDNError);
  const currentUser = useSelector(selectUser);

  const [formData, setFormData] = useState({
    projectId: '',
    clientId: '',
    address: '',
    remarks: '',
    createdBy: currentUser?.userId || '',
  });

  const [dnItems, setDnItems] = useState([
    {
      itemId: '',
      description: '',
      qty: 1,
      uom: '',
      productionJobId: '',
      remarks: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchClients());
    dispatch(fetchProductionBoard());
    dispatch(fetchItems());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  // Auto-fetch client when project is selected
  useEffect(() => {
    if (formData.projectId) {
      const project = projects.find((p) => p.id === formData.projectId);
      if (project?.clientId) {
        setFormData((prev) => ({
          ...prev,
          clientId: project.clientId,
          address: project.client?.address || '',
        }));
      }
    }
  }, [formData.projectId, projects]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...dnItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // If itemId is selected, auto-fill description and uom
    if (field === 'itemId' && value) {
      const item = items.find((i) => i.id === value);
      if (item) {
        updatedItems[index].description = item.itemName;
        updatedItems[index].uom = item.unit || item.uom || '';
      }
    }

    setDnItems(updatedItems);
  };

  const addItem = () => {
    setDnItems([
      ...dnItems,
      {
        itemId: '',
        description: '',
        qty: 1,
        uom: '',
        productionJobId: '',
        remarks: '',
      },
    ]);
  };

  const removeItem = (index) => {
    setDnItems(dnItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        items: dnItems.map((item) => ({
          itemId: item.itemId || null,
          description: item.description,
          qty: parseFloat(item.qty),
          uom: item.uom || null,
          productionJobId: item.productionJobId || null,
          remarks: item.remarks || null,
        })),
      };

      const result = await dispatch(createDN(payload)).unwrap();
      navigate(`/dispatch/dn/${result.dnId}`);
    } catch (err) {
      console.error('Failed to create DN:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate('/dispatch')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dispatch
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create Delivery Note</h1>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project *
              </label>
              <select
                name="projectId"
                value={formData.projectId}
                onChange={handleFormChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.projectCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client *
              </label>
              <select
                name="clientId"
                value={formData.clientId}
                onChange={handleFormChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Client</option>
                {clients
                  .filter((c) => c.isActive)
                  .map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Address *
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleFormChange}
                required
                rows="3"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleFormChange}
                rows="2"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {dnItems.map((item, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-6 gap-4"
              >
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item
                  </label>
                  <select
                    value={item.itemId}
                    onChange={(e) =>
                      handleItemChange(index, 'itemId', e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Item</option>
                    {items.map((invItem) => (
                      <option key={invItem.id} value={invItem.id}>
                        {invItem.itemName} ({invItem.itemCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      handleItemChange(index, 'description', e.target.value)
                    }
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Qty *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.qty}
                    onChange={(e) =>
                      handleItemChange(index, 'qty', e.target.value)
                    }
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UOM
                  </label>
                  <input
                    type="text"
                    value={item.uom}
                    onChange={(e) =>
                      handleItemChange(index, 'uom', e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Production Job (Optional)
                  </label>
                  <select
                    value={item.productionJobId}
                    onChange={(e) =>
                      handleItemChange(index, 'productionJobId', e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">None</option>
                    {productionJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.jobCardNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks
                  </label>
                  <input
                    type="text"
                    value={item.remarks}
                    onChange={(e) =>
                      handleItemChange(index, 'remarks', e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="md:col-span-1 flex items-end">
                  {dnItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/dispatch')}
            className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Delivery Note'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateDN;

