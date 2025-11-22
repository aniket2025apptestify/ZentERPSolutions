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
export const fetchSubcontractInvoices = createAsyncThunk(
  'subcontractInvoice/fetchSubcontractInvoices',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.swoId) params.append('swoId', filters.swoId);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(
        `/api/subcontract/invoices${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch subcontract invoices'
      );
    }
  }
);

export const createSubcontractInvoice = createAsyncThunk(
  'subcontractInvoice/createSubcontractInvoice',
  async ({ swoId, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/subcontract/swo/${swoId}/invoice`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create subcontract invoice'
      );
    }
  }
);

export const approveSubcontractInvoice = createAsyncThunk(
  'subcontractInvoice/approveSubcontractInvoice',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/subcontract/invoices/${id}/approve`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to approve invoice'
      );
    }
  }
);

export const paySubcontractInvoice = createAsyncThunk(
  'subcontractInvoice/paySubcontractInvoice',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/subcontract/invoices/${id}/pay`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to record payment'
      );
    }
  }
);

// Subcontract invoice slice
const subcontractInvoiceSlice = createSlice({
  name: 'subcontractInvoice',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentInvoice: (state) => {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch invoices
    builder
      .addCase(fetchSubcontractInvoices.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSubcontractInvoices.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchSubcontractInvoices.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create invoice
    builder
      .addCase(createSubcontractInvoice.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createSubcontractInvoice.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list.unshift(action.payload.invoice);
        state.error = null;
      })
      .addCase(createSubcontractInvoice.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Approve invoice
    builder
      .addCase(approveSubcontractInvoice.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(approveSubcontractInvoice.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((inv) => inv.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(approveSubcontractInvoice.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Pay invoice
    builder
      .addCase(paySubcontractInvoice.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(paySubcontractInvoice.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((inv) => inv.id === action.payload.invoice.id);
        if (index !== -1) {
          state.list[index] = action.payload.invoice;
        }
        state.error = null;
      })
      .addCase(paySubcontractInvoice.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentInvoice } = subcontractInvoiceSlice.actions;
export default subcontractInvoiceSlice.reducer;
