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
  },
});

