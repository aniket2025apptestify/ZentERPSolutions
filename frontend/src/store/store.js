import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tenantsReducer from './slices/tenantsSlice';
import usersReducer from './slices/usersSlice';
import inquiriesReducer from './slices/inquiriesSlice';
import clientsReducer from './slices/clientsSlice';
import documentsReducer from './slices/documentsSlice';
import quotationsReducer from './slices/quotationsSlice';
import projectsReducer from './slices/projectsSlice';

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
  },
});

