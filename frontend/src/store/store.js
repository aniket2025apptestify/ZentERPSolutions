import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tenantsReducer from './slices/tenantsSlice';
import usersReducer from './slices/usersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tenants: tenantsReducer,
    users: usersReducer,
  },
});

