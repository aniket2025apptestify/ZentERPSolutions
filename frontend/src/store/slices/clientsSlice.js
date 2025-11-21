import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  list: [],
  selectedClient: null,
  status: 'idle', // idle, loading, succeeded, failed
  error: null,
};

// Async thunks
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.company) params.append('company', filters.company);
      if (filters.email) params.append('email', filters.email);
      if (filters.phone) params.append('phone', filters.phone);

      const queryString = params.toString();
      const url = queryString ? `/api/clients?${queryString}` : '/api/clients';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch clients'
      );
    }
  }
);

export const fetchClientById = createAsyncThunk(
  'clients/fetchClientById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/clients/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch client'
      );
    }
  }
);

export const createClient = createAsyncThunk(
  'clients/createClient',
  async (clientData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/clients', clientData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create client'
      );
    }
  }
);

export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ id, ...clientData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/clients/${id}`, clientData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update client'
      );
    }
  }
);

export const deleteClient = createAsyncThunk(
  'clients/deleteClient',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/clients/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete client'
      );
    }
  }
);

// Clients slice
const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedClient: (state) => {
      state.selectedClient = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch clients
    builder
      .addCase(fetchClients.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch client by ID
    builder
      .addCase(fetchClientById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchClientById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedClient = action.payload;
        state.error = null;
      })
      .addCase(fetchClientById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create client
    builder
      .addCase(createClient.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list.unshift(action.payload);
        state.error = null;
      })
      .addCase(createClient.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Update client
    builder
      .addCase(updateClient.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.selectedClient?.id === action.payload.id) {
          state.selectedClient = action.payload;
        }
        state.error = null;
      })
      .addCase(updateClient.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Delete client
    builder
      .addCase(deleteClient.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = state.list.filter((c) => c.id !== action.payload);
        if (state.selectedClient?.id === action.payload) {
          state.selectedClient = null;
        }
        state.error = null;
      })
      .addCase(deleteClient.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearSelectedClient } = clientsSlice.actions;

// Selectors
export const selectClients = (state) => state.clients.list;
export const selectSelectedClient = (state) => state.clients.selectedClient;
export const selectClientsStatus = (state) => state.clients.status;
export const selectClientsError = (state) => state.clients.error;

export default clientsSlice.reducer;
