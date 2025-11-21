import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  selectVehicles,
  selectVehicleStatus,
  selectVehicleError,
  clearError,
} from '../../store/slices/vehicleSlice';
import { fetchDrivers } from '../../store/slices/driverSlice';
import { selectDrivers } from '../../store/slices/driverSlice';

const VehicleManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const vehicles = useSelector(selectVehicles);
  const status = useSelector(selectVehicleStatus);
  const error = useSelector(selectVehicleError);
  const drivers = useSelector(selectDrivers);

  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    numberPlate: '',
    type: '',
    capacity: '',
    driverId: '',
  });

  useEffect(() => {
    dispatch(fetchVehicles());
    dispatch(fetchDrivers({ status: 'ACTIVE' }));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        capacity: formData.capacity ? parseFloat(formData.capacity) : null,
        driverId: formData.driverId || null,
      };

      if (editingVehicle) {
        await dispatch(
          updateVehicle({ id: editingVehicle.id, payload })
        ).unwrap();
      } else {
        await dispatch(createVehicle(payload)).unwrap();
      }
      setShowModal(false);
      setEditingVehicle(null);
      setFormData({ numberPlate: '', type: '', capacity: '', driverId: '' });
      dispatch(fetchVehicles());
    } catch (err) {
      console.error('Failed to save vehicle:', err);
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      numberPlate: vehicle.numberPlate,
      type: vehicle.type,
      capacity: vehicle.capacity?.toString() || '',
      driverId: vehicle.driverId || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await dispatch(deleteVehicle(id)).unwrap();
        dispatch(fetchVehicles());
      } catch (err) {
        console.error('Failed to delete vehicle:', err);
      }
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      AVAILABLE: 'bg-green-100 text-green-800',
      IN_USE: 'bg-blue-100 text-blue-800',
      MAINTENANCE: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicle Management</h1>
          <p className="mt-2 text-sm text-gray-600">Manage fleet vehicles</p>
        </div>
        <button
          onClick={() => {
            setEditingVehicle(null);
            setFormData({ numberPlate: '', type: '', capacity: '', driverId: '' });
            setShowModal(true);
          }}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
        >
          Add Vehicle
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
        {status === 'loading' ? (
          <div className="p-12 text-center">Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Number Plate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Driver
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {vehicle.numberPlate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{vehicle.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {vehicle.capacity || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                        vehicle.status
                      )}`}
                    >
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {vehicle.driver?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Number Plate *
                </label>
                <input
                  type="text"
                  value={formData.numberPlate}
                  onChange={(e) =>
                    setFormData({ ...formData, numberPlate: e.target.value })
                  }
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type *</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  required
                  placeholder="e.g., Pickup, Truck, Tempo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Capacity (tons)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Driver</label>
                <select
                  value={formData.driverId}
                  onChange={(e) =>
                    setFormData({ ...formData, driverId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">None</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingVehicle(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleManagement;

