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

export const updateVendor = createAsyncThunk(
  'vendors/updateVendor',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/procurement/vendors/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update vendor'
      );
    }
  }
);

export const deleteVendor = createAsyncThunk(
  'vendors/deleteVendor',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/procurement/vendors/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete vendor'
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
      })
      .addCase(updateVendor.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateVendor.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((v) => v.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.current?.id === action.payload.id) {
          state.current = action.payload;
        }
      })
      .addCase(updateVendor.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(deleteVendor.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteVendor.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = state.list.filter((v) => v.id !== action.payload);
        if (state.current?.id === action.payload) {
          state.current = null;
        }
      })
      .addCase(deleteVendor.rejected, (state, action) => {
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

