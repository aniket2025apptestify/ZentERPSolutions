import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const initialState = {
  list: [],
  current: null,
  status: 'idle',
  error: null,
};

export const fetchGRNs = createAsyncThunk(
  'grn/fetchGRNs',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.purchaseOrderId) params.append('purchaseOrderId', filters.purchaseOrderId);

      const response = await api.get(
        `/api/procurement/grn${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch GRNs'
      );
    }
  }
);

export const fetchGRNById = createAsyncThunk(
  'grn/fetchGRNById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/procurement/grn/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch GRN'
      );
    }
  }
);

export const createGRN = createAsyncThunk(
  'grn/createGRN',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/procurement/grn', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create GRN'
      );
    }
  }
);

const grnSlice = createSlice({
  name: 'grn',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrent: (state) => {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGRNs.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchGRNs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchGRNs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchGRNById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchGRNById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
      })
      .addCase(fetchGRNById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createGRN.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createGRN.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list.unshift(action.payload);
      })
      .addCase(createGRN.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrent } = grnSlice.actions;
export const selectGRNs = (state) => state.grn.list;
export const selectCurrentGRN = (state) => state.grn.current;
export const selectGRNsStatus = (state) => state.grn.status;
export const selectGRNsError = (state) => state.grn.error;

export default grnSlice.reducer;

