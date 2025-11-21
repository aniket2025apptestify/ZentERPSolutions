import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  inquiries: [],
  currentInquiry: null,
  status: 'idle', // idle, loading, succeeded, failed
  error: null,
};

// Async thunks
export const fetchInquiries = createAsyncThunk(
  'inquiries/fetchInquiries',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(
        `/api/inquiries${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch inquiries'
      );
    }
  }
);

export const fetchInquiryById = createAsyncThunk(
  'inquiries/fetchInquiryById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/inquiries/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch inquiry'
      );
    }
  }
);

export const createInquiry = createAsyncThunk(
  'inquiries/createInquiry',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/inquiries', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create inquiry'
      );
    }
  }
);

export const updateInquiry = createAsyncThunk(
  'inquiries/updateInquiry',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/inquiries/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update inquiry'
      );
    }
  }
);

export const addFollowUp = createAsyncThunk(
  'inquiries/addFollowUp',
  async ({ id, followUpData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/inquiries/${id}/followups`, followUpData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to add follow-up'
      );
    }
  }
);

export const deleteInquiry = createAsyncThunk(
  'inquiries/deleteInquiry',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/inquiries/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete inquiry'
      );
    }
  }
);

// Inquiries slice
const inquiriesSlice = createSlice({
  name: 'inquiries',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentInquiry: (state) => {
      state.currentInquiry = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch inquiries
    builder
      .addCase(fetchInquiries.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchInquiries.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.inquiries = action.payload;
        state.error = null;
      })
      .addCase(fetchInquiries.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch inquiry by ID
    builder
      .addCase(fetchInquiryById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchInquiryById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentInquiry = action.payload;
        state.error = null;
      })
      .addCase(fetchInquiryById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create inquiry
    builder
      .addCase(createInquiry.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createInquiry.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.inquiries.unshift(action.payload);
        state.error = null;
      })
      .addCase(createInquiry.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Update inquiry
    builder
      .addCase(updateInquiry.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateInquiry.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.inquiries.findIndex(
          (inq) => inq.id === action.payload.id
        );
        if (index !== -1) {
          state.inquiries[index] = action.payload;
        }
        if (state.currentInquiry?.id === action.payload.id) {
          state.currentInquiry = action.payload;
        }
        state.error = null;
      })
      .addCase(updateInquiry.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Add follow-up
    builder
      .addCase(addFollowUp.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(addFollowUp.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.inquiries.findIndex(
          (inq) => inq.id === action.payload.id
        );
        if (index !== -1) {
          state.inquiries[index] = action.payload;
        }
        if (state.currentInquiry?.id === action.payload.id) {
          state.currentInquiry = action.payload;
        }
        state.error = null;
      })
      .addCase(addFollowUp.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Delete inquiry
    builder
      .addCase(deleteInquiry.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteInquiry.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.inquiries = state.inquiries.filter((inq) => inq.id !== action.payload);
        if (state.currentInquiry?.id === action.payload) {
          state.currentInquiry = null;
        }
        state.error = null;
      })
      .addCase(deleteInquiry.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentInquiry } = inquiriesSlice.actions;

// Selectors
export const selectInquiries = (state) => state.inquiries.inquiries;
export const selectCurrentInquiry = (state) => state.inquiries.currentInquiry;
export const selectInquiriesStatus = (state) => state.inquiries.status;
export const selectInquiriesError = (state) => state.inquiries.error;

export default inquiriesSlice.reducer;

