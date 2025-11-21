import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  tenants: [],
  currentTenant: null,
  status: 'idle', // idle, loading, succeeded, failed
  error: null,
};

// Async thunks
export const fetchTenants = createAsyncThunk(
  'tenants/fetchTenants',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/tenants');
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch tenants'
      );
    }
  }
);

export const fetchTenantById = createAsyncThunk(
  'tenants/fetchTenantById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/tenants/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch tenant'
      );
    }
  }
);

export const createTenant = createAsyncThunk(
  'tenants/createTenant',
  async (tenantData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/tenants', tenantData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create tenant'
      );
    }
  }
);

export const updateTenant = createAsyncThunk(
  'tenants/updateTenant',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/tenants/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update tenant'
      );
    }
  }
);

// Tenants slice
const tenantsSlice = createSlice({
  name: 'tenants',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTenant: (state, action) => {
      state.currentTenant = action.payload;
    },
    clearCurrentTenant: (state) => {
      state.currentTenant = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch tenants
    builder
      .addCase(fetchTenants.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTenants.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tenants = action.payload;
        state.error = null;
      })
      .addCase(fetchTenants.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch tenant by ID
    builder
      .addCase(fetchTenantById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTenantById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentTenant = action.payload;
        state.error = null;
      })
      .addCase(fetchTenantById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create tenant
    builder
      .addCase(createTenant.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createTenant.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tenants.unshift(action.payload.tenant);
        state.error = null;
      })
      .addCase(createTenant.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Update tenant
    builder
      .addCase(updateTenant.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateTenant.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.tenants.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.tenants[index] = action.payload;
        }
        if (state.currentTenant?.id === action.payload.id) {
          state.currentTenant = action.payload;
        }
        state.error = null;
      })
      .addCase(updateTenant.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, setCurrentTenant, clearCurrentTenant } = tenantsSlice.actions;

// Selectors
export const selectTenants = (state) => state.tenants.tenants;
export const selectCurrentTenant = (state) => state.tenants.currentTenant;
export const selectTenantsStatus = (state) => state.tenants.status;
export const selectTenantsError = (state) => state.tenants.error;

export default tenantsSlice.reducer;

