import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  list: [],
  current: null, // full quotation with lines
  status: 'idle', // idle, loading, succeeded, failed
  error: null,
};

// Async thunks
export const fetchQuotations = createAsyncThunk(
  'quotations/fetchQuotations',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.preparedBy) params.append('preparedBy', filters.preparedBy);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(
        `/api/quotations${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch quotations'
      );
    }
  }
);

export const fetchQuotationById = createAsyncThunk(
  'quotations/fetchQuotationById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/quotations/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch quotation'
      );
    }
  }
);

export const createQuotation = createAsyncThunk(
  'quotations/createQuotation',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/quotations', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create quotation'
      );
    }
  }
);

export const updateQuotation = createAsyncThunk(
  'quotations/updateQuotation',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/quotations/${id}`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update quotation'
      );
    }
  }
);

export const sendQuotation = createAsyncThunk(
  'quotations/sendQuotation',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/quotations/${id}/send`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to send quotation'
      );
    }
  }
);

export const approveQuotation = createAsyncThunk(
  'quotations/approveQuotation',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/quotations/${id}/approve`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to approve quotation'
      );
    }
  }
);

export const rejectQuotation = createAsyncThunk(
  'quotations/rejectQuotation',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/quotations/${id}/reject`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to reject quotation'
      );
    }
  }
);

export const convertQuotation = createAsyncThunk(
  'quotations/convertQuotation',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/quotations/${id}/convert`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to convert quotation'
      );
    }
  }
);

// Quotations slice
const quotationsSlice = createSlice({
  name: 'quotations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentQuotation: (state) => {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch quotations
    builder
      .addCase(fetchQuotations.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchQuotations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchQuotations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch quotation by ID
    builder
      .addCase(fetchQuotationById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchQuotationById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
        state.error = null;
      })
      .addCase(fetchQuotationById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create quotation
    builder
      .addCase(createQuotation.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createQuotation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list.unshift(action.payload);
        state.current = action.payload;
        state.error = null;
      })
      .addCase(createQuotation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Update quotation
    builder
      .addCase(updateQuotation.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateQuotation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex(
          (q) => q.id === action.payload.id
        );
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.current?.id === action.payload.id) {
          state.current = action.payload;
        }
        state.error = null;
      })
      .addCase(updateQuotation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Send quotation
    builder
      .addCase(sendQuotation.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(sendQuotation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const quotation = action.payload.quotation;
        const index = state.list.findIndex((q) => q.id === quotation.id);
        if (index !== -1) {
          state.list[index] = quotation;
        }
        if (state.current?.id === quotation.id) {
          state.current = quotation;
        }
        state.error = null;
      })
      .addCase(sendQuotation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Approve quotation
    builder
      .addCase(approveQuotation.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(approveQuotation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const quotation = action.payload.quotation;
        const index = state.list.findIndex((q) => q.id === quotation.id);
        if (index !== -1) {
          state.list[index] = quotation;
        }
        if (state.current?.id === quotation.id) {
          state.current = quotation;
        }
        state.error = null;
      })
      .addCase(approveQuotation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Reject quotation
    builder
      .addCase(rejectQuotation.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(rejectQuotation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const quotation = action.payload.quotation;
        const index = state.list.findIndex((q) => q.id === quotation.id);
        if (index !== -1) {
          state.list[index] = quotation;
        }
        if (state.current?.id === quotation.id) {
          state.current = quotation;
        }
        state.error = null;
      })
      .addCase(rejectQuotation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Convert quotation
    builder
      .addCase(convertQuotation.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(convertQuotation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Update quotation status to CONVERTED
        if (state.current) {
          state.current.status = 'CONVERTED';
        }
        const index = state.list.findIndex(
          (q) => q.id === action.payload.project.quotationId
        );
        if (index !== -1) {
          state.list[index].status = 'CONVERTED';
        }
        state.error = null;
      })
      .addCase(convertQuotation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentQuotation } = quotationsSlice.actions;

// Selectors
export const selectQuotations = (state) => state.quotations.list;
export const selectCurrentQuotation = (state) => state.quotations.current;
export const selectQuotationsStatus = (state) => state.quotations.status;
export const selectQuotationsError = (state) => state.quotations.error;

export default quotationsSlice.reducer;

