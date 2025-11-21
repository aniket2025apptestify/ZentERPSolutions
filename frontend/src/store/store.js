import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tenantsReducer from './slices/tenantsSlice';
import usersReducer from './slices/usersSlice';
import inquiriesReducer from './slices/inquiriesSlice';
import clientsReducer from './slices/clientsSlice';
import documentsReducer from './slices/documentsSlice';
import quotationsReducer from './slices/quotationsSlice';
import projectsReducer from './slices/projectsSlice';
import materialRequestsReducer from './slices/materialRequestsSlice';
import vendorsReducer from './slices/vendorsSlice';
import vendorQuotesReducer from './slices/vendorQuotesSlice';
import purchaseOrdersReducer from './slices/purchaseOrdersSlice';
import grnReducer from './slices/grnSlice';
import inventoryReducer from './slices/inventorySlice';
import productionReducer from './slices/productionSlice';
import qcReducer from './slices/qcSlice';
import reworkReducer from './slices/reworkSlice';
import returnsReducer from './slices/returnsSlice';
import dnReducer from './slices/dnSlice';
import vehicleReducer from './slices/vehicleSlice';
import driverReducer from './slices/driverSlice';
import invoicesReducer from './slices/invoicesSlice';
import paymentsReducer from './slices/paymentsSlice';
import creditNotesReducer from './slices/creditNotesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tenants: tenantsReducer,
    users: usersReducer,
    inquiries: inquiriesReducer,
    clients: clientsReducer,
    documents: documentsReducer,
    quotations: quotationsReducer,
    projects: projectsReducer,
    materialRequests: materialRequestsReducer,
    vendors: vendorsReducer,
    vendorQuotes: vendorQuotesReducer,
    purchaseOrders: purchaseOrdersReducer,
    grn: grnReducer,
    inventory: inventoryReducer,
    production: productionReducer,
    qc: qcReducer,
    rework: reworkReducer,
    returns: returnsReducer,
    dn: dnReducer,
    vehicles: vehicleReducer,
    drivers: driverReducer,
    invoices: invoicesReducer,
    payments: paymentsReducer,
    creditNotes: creditNotesReducer,
  },
});

