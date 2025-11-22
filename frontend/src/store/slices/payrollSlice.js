import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  list: [],
  selectedPayroll: null,
  status: 'idle',
  error: null,
  generateResult: null,
};

// Async thunks
export const fetchPayroll = createAsyncThunk(
  'payroll/fetchPayroll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);
      if (filters.paid !== undefined) params.append('paid', filters.paid);

      const queryString = params.toString();
      const url = queryString ? `/api/hr/payroll?${queryString}` : '/api/hr/payroll';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch payroll'
      );
    }
  }
);

export const fetchPayrollById = createAsyncThunk(
  'payroll/fetchPayrollById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/hr/payroll/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch payroll'
      );
    }
  }
);

export const generatePayroll = createAsyncThunk(
  'payroll/generatePayroll',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/hr/payroll/generate', payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to generate payroll'
      );
    }
  }
);

export const payPayroll = createAsyncThunk(
  'payroll/payPayroll',
  async ({ id, ...paymentData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/hr/payroll/${id}/pay`, paymentData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to mark payroll as paid'
      );
    }
  }
);

export const getPayslipPdf = createAsyncThunk(
  'payroll/getPayslipPdf',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/hr/payroll/${id}/payslip`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to get payslip'
      );
    }
  }
);

// Payroll slice
const payrollSlice = createSlice({
  name: 'payroll',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedPayroll: (state) => {
      state.selectedPayroll = null;
    },
    clearGenerateResult: (state) => {
      state.generateResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayroll.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPayroll.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchPayroll.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchPayrollById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPayrollById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedPayroll = action.payload;
        state.error = null;
      })
      .addCase(fetchPayrollById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(generatePayroll.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(generatePayroll.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.generateResult = action.payload;
        state.error = null;
      })
      .addCase(generatePayroll.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(payPayroll.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(payPayroll.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((p) => p.id === action.payload.payrollRecord.id);
        if (index !== -1) {
          state.list[index] = action.payload.payrollRecord;
        }
        if (state.selectedPayroll?.id === action.payload.payrollRecord.id) {
          state.selectedPayroll = action.payload.payrollRecord;
        }
        state.error = null;
      })
      .addCase(payPayroll.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(getPayslipPdf.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getPayslipPdf.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(getPayslipPdf.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearSelectedPayroll, clearGenerateResult } = payrollSlice.actions;

// Selectors
export const selectPayroll = (state) => state.payroll.list;
export const selectSelectedPayroll = (state) => state.payroll.selectedPayroll;
export const selectPayrollStatus = (state) => state.payroll.status;
export const selectPayrollError = (state) => state.payroll.error;
export const selectGenerateResult = (state) => state.payroll.generateResult;

export default payrollSlice.reducer;

