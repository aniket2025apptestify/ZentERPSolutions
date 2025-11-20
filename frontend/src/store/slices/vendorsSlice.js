import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const initialState = {
  list: [],
  current: null,
  status: 'idle',
  error: null,
};

export const fetchVendors = createAsyncThunk(
  'vendors/fetchVendors',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(
        `/api/procurement/vendors${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch vendors'
      );
    }
  }
);

export const fetchVendorById = createAsyncThunk(
  'vendors/fetchVendorById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/procurement/vendors/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch vendor'
      );
    }
  }
);

export const createVendor = createAsyncThunk(
  'vendors/createVendor',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/procurement/vendors', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create vendor'
      );
    }
  }
);

const vendorsSlice = createSlice({
  name: 'vendors',
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
      .addCase(fetchVendors.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchVendorById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVendorById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
      })
      .addCase(fetchVendorById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createVendor.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createVendor.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list.push(action.payload);
      })
      .addCase(createVendor.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrent } = vendorsSlice.actions;
export const selectVendors = (state) => state.vendors.list;
export const selectCurrentVendor = (state) => state.vendors.current;
export const selectVendorsStatus = (state) => state.vendors.status;
export const selectVendorsError = (state) => state.vendors.error;

export default vendorsSlice.reducer;

