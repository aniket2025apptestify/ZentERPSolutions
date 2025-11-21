import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  list: [],
  invoicePayments: [],
  status: 'idle',
  error: null,
};

// Async thunks
export const recordPayment = createAsyncThunk(
  'payments/recordPayment',
  async ({ invoiceId, paymentData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/invoices/${invoiceId}/pay`, paymentData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to record payment'
      );
    }
  }
);

export const fetchPayments = createAsyncThunk(
  'payments/fetchPayments',
  async (invoiceId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/invoices/${invoiceId}/payments`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch payments'
      );
    }
  }
);

export const fetchAllPayments = createAsyncThunk(
  'payments/fetchAllPayments',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.method) params.append('method', filters.method);
      if (filters.invoiceId) params.append('invoiceId', filters.invoiceId);

      const response = await api.get(
        `/api/payments${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch payments'
      );
    }
  }
);

// Slice
const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearInvoicePayments: (state) => {
      state.invoicePayments = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Record payment
      .addCase(recordPayment.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(recordPayment.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.invoicePayments.push(action.payload.payment);
      })
      .addCase(recordPayment.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch payments
      .addCase(fetchPayments.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.invoicePayments = action.payload;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch all payments
      .addCase(fetchAllPayments.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAllPayments.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchAllPayments.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearInvoicePayments } = paymentsSlice.actions;
export default paymentsSlice.reducer;

