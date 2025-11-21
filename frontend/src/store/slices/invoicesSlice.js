import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  list: [],
  current: null,
  status: 'idle',
  error: null,
};

// Async thunks
export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);

      const response = await api.get(
        `/api/invoices${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch invoices'
      );
    }
  }
);

export const getInvoice = createAsyncThunk(
  'invoices/getInvoice',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/invoices/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch invoice'
      );
    }
  }
);

export const createInvoice = createAsyncThunk(
  'invoices/createInvoice',
  async (invoiceData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/invoices', invoiceData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create invoice'
      );
    }
  }
);

export const createInvoiceFromDNs = createAsyncThunk(
  'invoices/createInvoiceFromDNs',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/invoices/from-dns', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create invoice from DNs'
      );
    }
  }
);

export const updateInvoice = createAsyncThunk(
  'invoices/updateInvoice',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/invoices/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update invoice'
      );
    }
  }
);

export const sendInvoice = createAsyncThunk(
  'invoices/sendInvoice',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/invoices/${id}/send`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to send invoice'
      );
    }
  }
);

export const cancelInvoice = createAsyncThunk(
  'invoices/cancelInvoice',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/invoices/${id}/cancel`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to cancel invoice'
      );
    }
  }
);

export const getInvoiceAging = createAsyncThunk(
  'invoices/getInvoiceAging',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/invoices/${id}/aging`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch invoice aging'
      );
    }
  }
);

// Slice
const invoicesSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    clearCurrent: (state) => {
      state.current = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch invoices
      .addCase(fetchInvoices.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Get invoice
      .addCase(getInvoice.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(getInvoice.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
      })
      .addCase(getInvoice.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Create invoice
      .addCase(createInvoice.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload.invoice;
        state.list.unshift(action.payload.invoice);
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Create invoice from DNs
      .addCase(createInvoiceFromDNs.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createInvoiceFromDNs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
        state.list.unshift(action.payload);
      })
      .addCase(createInvoiceFromDNs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Update invoice
      .addCase(updateInvoice.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
        const index = state.list.findIndex((inv) => inv.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      .addCase(updateInvoice.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Send invoice
      .addCase(sendInvoice.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(sendInvoice.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.current && state.current.id === action.payload.id) {
          state.current = action.payload;
        }
        const index = state.list.findIndex((inv) => inv.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      .addCase(sendInvoice.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Cancel invoice
      .addCase(cancelInvoice.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(cancelInvoice.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.current && state.current.id === action.payload.id) {
          state.current = action.payload;
        }
        const index = state.list.findIndex((inv) => inv.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      .addCase(cancelInvoice.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Get invoice aging
      .addCase(getInvoiceAging.fulfilled, (state, action) => {
        // Aging data can be stored in current invoice or separately
        if (state.current && state.current.id === action.payload.invoiceId) {
          state.current.aging = action.payload;
        }
      });
  },
});

export const { clearCurrent, clearError } = invoicesSlice.actions;

// Selectors
export const selectInvoicesList = (state) => state.invoices.list;
export const selectCurrentInvoice = (state) => state.invoices.current;
export const selectInvoicesStatus = (state) => state.invoices.status;
export const selectInvoicesError = (state) => state.invoices.error;

export default invoicesSlice.reducer;

