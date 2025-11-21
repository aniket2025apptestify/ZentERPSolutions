import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchDNDetails,
  loadDN,
  assignVehicle,
  dispatchDN,
  addTracking,
  deliverDN,
  selectCurrentDN,
  selectDNStatus,
  selectDNError,
  clearCurrentDN,
} from '../../store/slices/dnSlice';
import { fetchVehicles } from '../../store/slices/vehicleSlice';
import { selectVehicles } from '../../store/slices/vehicleSlice';
import { fetchDrivers } from '../../store/slices/driverSlice';
import { selectDrivers } from '../../store/slices/driverSlice';
import { selectUser } from '../../store/slices/authSlice';

const DNDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const dn = useSelector(selectCurrentDN);
  const status = useSelector(selectDNStatus);
  const error = useSelector(selectDNError);
  const vehicles = useSelector(selectVehicles);
  const drivers = useSelector(selectDrivers);
  const currentUser = useSelector(selectUser);

  const [activeTab, setActiveTab] = useState('overview');
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [loadingData, setLoadingData] = useState({ items: [] });
  const [assignData, setAssignData] = useState({ vehicleId: '', driverId: '' });
  const [deliveryData, setDeliveryData] = useState({
    deliveredQty: [],
    receivedBy: '',
    remarks: '',
  });

  useEffect(() => {
    if (id) {
      dispatch(fetchDNDetails(id));
      dispatch(fetchVehicles({ status: 'AVAILABLE' }));
      dispatch(fetchDrivers({ status: 'ACTIVE' }));
    }

    return () => {
      dispatch(clearCurrentDN());
    };
  }, [id, dispatch]);

  const getStatusBadgeColor = (status) => {
    const colors = {
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
      LOADING: 'bg-amber-50 text-amber-700 border-amber-200',
      DISPATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
      DELIVERED: 'bg-green-50 text-green-700 border-green-200',
      RETURNED: 'bg-orange-50 text-orange-700 border-orange-200',
      CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const handleLoad = async () => {
    try {
      // Ensure all items are in loadingData
      const itemsToSave = dn.items?.map((item) => {
        const existing = loadingData.items.find((i) => i.dnItemId === item.id);
        return existing || {
          dnItemId: item.id,
          loadedQty: item.loadedQty || item.qty,
        };
      }) || [];

      await dispatch(
        loadDN({
          id,
          payload: {
            items: itemsToSave,
            photos: [],
          },
        })
      ).unwrap();
      setShowLoadingModal(false);
      setLoadingData({ items: [] });
      dispatch(fetchDNDetails(id));
    } catch (err) {
      console.error('Failed to load DN:', err);
    }
  };

  const handleAssignVehicle = async () => {
    try {
      await dispatch(
        assignVehicle({
          id,
          payload: assignData,
        })
      ).unwrap();
      setShowAssignModal(false);
      dispatch(fetchDNDetails(id));
    } catch (err) {
      console.error('Failed to assign vehicle:', err);
    }
  };

  const handleDispatch = async () => {
    try {
      await dispatch(
        dispatchDN({
          id,
          payload: {
            dispatchedAt: new Date().toISOString(),
            remarks: '',
          },
        })
      ).unwrap();
      setShowDispatchModal(false);
      dispatch(fetchDNDetails(id));
    } catch (err) {
      console.error('Failed to dispatch DN:', err);
    }
  };

  const handleDeliver = async () => {
    try {
      await dispatch(
        deliverDN({
          id,
          payload: {
            ...deliveryData,
            deliveredAt: new Date().toISOString(),
          },
        })
      ).unwrap();
      setShowDeliveryModal(false);
      dispatch(fetchDNDetails(id));
    } catch (err) {
      console.error('Failed to deliver DN:', err);
    }
  };

  if (status === 'loading') {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading delivery note...</p>
      </div>
    );
  }

  if (!dn) {
    return <div className="p-8 text-center">Delivery Note not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {dn.dnNumber}
            </h1>
            <p className="mt-2 text-sm text-gray-600">Delivery Note Details</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`px-4 py-1.5 inline-flex text-sm font-semibold rounded-full border ${getStatusBadgeColor(
                dn.status
              )}`}
            >
              {dn.status}
            </span>
            {dn.status === 'DRAFT' && (
              <button
                onClick={() => {
                  // Initialize loading data
                  setLoadingData({
                    items: dn.items?.map((item) => ({
                      dnItemId: item.id,
                      loadedQty: item.loadedQty || item.qty,
                    })) || [],
                  });
                  setShowLoadingModal(true);
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-medium transition-colors shadow-sm"
              >
                Start Loading
              </button>
            )}
            {dn.status === 'LOADING' && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors shadow-sm"
              >
                Assign Vehicle
              </button>
            )}
            {dn.status === 'LOADING' && dn.vehicleId && (
              <button
                onClick={() => setShowDispatchModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors shadow-sm"
              >
                Dispatch
              </button>
            )}
            {dn.status === 'DISPATCHED' && (
              <button
                onClick={() => setShowDeliveryModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition-colors shadow-sm"
              >
                Mark Delivered
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'items', 'tracking', 'qc', 'returns'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Project
                </h3>
                <p className="text-lg font-medium text-gray-900">
                  {dn.project?.name}
                </p>
                <p className="text-sm text-gray-500">
                  {dn.project?.projectCode}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Client
                </h3>
                <p className="text-lg font-medium text-gray-900">
                  {dn.client?.name}
                </p>
                <p className="text-sm text-gray-500">
                  {dn.client?.companyName}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Delivery Address
                </h3>
                <p className="text-sm text-gray-900">{dn.address}</p>
              </div>
              {dn.vehicle && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Vehicle
                  </h3>
                  <p className="text-lg font-medium text-gray-900">
                    {dn.vehicle.numberPlate}
                  </p>
                  <p className="text-sm text-gray-500">{dn.vehicle.type}</p>
                </div>
              )}
              {dn.driver && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Driver
                  </h3>
                  <p className="text-lg font-medium text-gray-900">
                    {dn.driver.name}
                  </p>
                  <p className="text-sm text-gray-500">{dn.driver.phone}</p>
                </div>
              )}
              {dn.dispatchedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Dispatched At
                  </h3>
                  <p className="text-sm text-gray-900">
                    {new Date(dn.dispatchedAt).toLocaleString()}
                  </p>
                </div>
              )}
              {dn.deliveredAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Delivered At
                  </h3>
                  <p className="text-sm text-gray-900">
                    {new Date(dn.deliveredAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            {dn.remarks && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Remarks
                </h3>
                <p className="text-sm text-gray-900">{dn.remarks}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'items' && (
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
                    Loaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Delivered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    UOM
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dn.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.description}
                      </div>
                      {item.inventoryItem && (
                        <div className="text-sm text-gray-500">
                          {item.inventoryItem.itemCode}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.qty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.loadedQty || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.deliveredQty || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.uom || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tracking' && (
          <div className="space-y-4">
            {dn.tracking && dn.tracking.length > 0 ? (
              dn.tracking.map((track) => (
                <div
                  key={track.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {track.location || 'Location not specified'}
                      </p>
                      {track.latitude && track.longitude && (
                        <p className="text-xs text-gray-500 mt-1">
                          {track.latitude}, {track.longitude}
                        </p>
                      )}
                      {track.remarks && (
                        <p className="text-sm text-gray-600 mt-2">
                          {track.remarks}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(track.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                No tracking data available
              </p>
            )}
          </div>
        )}

        {activeTab === 'qc' && (
          <div className="space-y-4">
            {dn.qcRecords && dn.qcRecords.length > 0 ? (
              dn.qcRecords.map((qc) => (
                <div
                  key={qc.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        qc.qcStatus === 'PASS'
                          ? 'bg-green-100 text-green-800'
                          : qc.qcStatus === 'FAIL'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {qc.qcStatus}
                    </span>
                    <p className="text-xs text-gray-500">
                      {new Date(qc.inspectedAt).toLocaleString()}
                    </p>
                  </div>
                  {qc.remarks && (
                    <p className="text-sm text-gray-600">{qc.remarks}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                No QC records available
              </p>
            )}
          </div>
        )}

        {activeTab === 'returns' && (
          <div className="space-y-4">
            {dn.returns && dn.returns.length > 0 ? (
              dn.returns.map((ret) => (
                <div
                  key={ret.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        ret.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : ret.status === 'INSPECTED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {ret.status}
                    </span>
                    <p className="text-xs text-gray-500">
                      {new Date(ret.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">{ret.reason}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                No return records available
              </p>
            )}
          </div>
        )}
      </div>

      {/* Loading Modal */}
      {showLoadingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Record Loading</h2>
            <div className="space-y-4">
              {dn.items?.map((item) => {
                const loadingItem = loadingData.items.find(
                  (i) => i.dnItemId === item.id
                ) || { dnItemId: item.id, loadedQty: item.loadedQty || item.qty };
                return (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-gray-500">
                        Qty: {item.qty} {item.uom}
                      </p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={item.qty}
                      step="0.01"
                      value={loadingItem.loadedQty || ''}
                      placeholder="Loaded Qty"
                      className="w-32 border border-gray-300 rounded-lg px-3 py-2"
                      onChange={(e) => {
                        const value = e.target.value
                          ? parseFloat(e.target.value)
                          : 0;
                        setLoadingData((prev) => {
                          const existing = prev.items.find(
                            (i) => i.dnItemId === item.id
                          );
                          if (existing) {
                            return {
                              ...prev,
                              items: prev.items.map((i) =>
                                i.dnItemId === item.id
                                  ? { ...i, loadedQty: value }
                                  : i
                              ),
                            };
                          } else {
                            return {
                              ...prev,
                              items: [
                                ...prev.items,
                                { dnItemId: item.id, loadedQty: value },
                              ],
                            };
                          }
                        });
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowLoadingModal(false);
                  setLoadingData({ items: [] });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleLoad}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Vehicle Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Assign Vehicle</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Vehicle</label>
                <select
                  value={assignData.vehicleId}
                  onChange={(e) =>
                    setAssignData({ ...assignData, vehicleId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select Vehicle</option>
                  {vehicles
                    .filter((v) => v.status === 'AVAILABLE')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.numberPlate} - {v.type}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Driver</label>
                <select
                  value={assignData.driverId}
                  onChange={(e) =>
                    setAssignData({ ...assignData, driverId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select Driver</option>
                  {drivers
                    .filter((d) => d.status === 'ACTIVE')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} - {d.phone}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignVehicle}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Confirm Dispatch</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to dispatch this delivery note? This will
              deduct inventory.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDispatchModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatch}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Mark as Delivered</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Received By
                </label>
                <input
                  type="text"
                  value={deliveryData.receivedBy}
                  onChange={(e) =>
                    setDeliveryData({
                      ...deliveryData,
                      receivedBy: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Name of person who received"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Delivered Quantities
                </label>
                {dn.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-gray-500">
                        Loaded: {item.loadedQty || 0} {item.uom}
                      </p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={item.loadedQty || item.qty}
                      placeholder="Delivered Qty"
                      className="w-32 border border-gray-300 rounded-lg px-3 py-2"
                      onChange={(e) => {
                        const deliveredQty = deliveryData.deliveredQty.filter(
                          (q) => q.dnItemId !== item.id
                        );
                        if (e.target.value) {
                          deliveredQty.push({
                            dnItemId: item.id,
                            qty: parseFloat(e.target.value),
                          });
                        }
                        setDeliveryData({ ...deliveryData, deliveredQty });
                      }}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Remarks</label>
                <textarea
                  value={deliveryData.remarks}
                  onChange={(e) =>
                    setDeliveryData({
                      ...deliveryData,
                      remarks: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows="3"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeliver}
                className="px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                Mark Delivered
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DNDetail;

