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
export const fetchDrivers = createAsyncThunk(
  'drivers/fetchDrivers',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(
        `/api/drivers${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch drivers'
      );
    }
  }
);

export const fetchDriverById = createAsyncThunk(
  'drivers/fetchDriverById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/drivers/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch driver'
      );
    }
  }
);

export const createDriver = createAsyncThunk(
  'drivers/createDriver',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/drivers', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create driver'
      );
    }
  }
);

export const updateDriver = createAsyncThunk(
  'drivers/updateDriver',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/drivers/${id}`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update driver'
      );
    }
  }
);

export const deleteDriver = createAsyncThunk(
  'drivers/deleteDriver',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/drivers/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete driver'
      );
    }
  }
);

// Driver slice
const driverSlice = createSlice({
  name: 'drivers',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentDriver: (state) => {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch drivers
    builder
      .addCase(fetchDrivers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDrivers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchDrivers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch driver by ID
    builder
      .addCase(fetchDriverById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDriverById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
        state.error = null;
      })
      .addCase(fetchDriverById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create driver
    builder
      .addCase(createDriver.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createDriver.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list.unshift(action.payload);
        state.error = null;
      })
      .addCase(createDriver.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Update driver
    builder
      .addCase(updateDriver.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateDriver.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.current && state.current.id === action.payload.id) {
          state.current = action.payload;
        }
        state.error = null;
      })
      .addCase(updateDriver.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Delete driver
    builder
      .addCase(deleteDriver.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteDriver.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = state.list.filter((d) => d.id !== action.payload);
        if (state.current && state.current.id === action.payload) {
          state.current = null;
        }
        state.error = null;
      })
      .addCase(deleteDriver.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentDriver } = driverSlice.actions;

// Selectors
export const selectDrivers = (state) => state.drivers.list;
export const selectCurrentDriver = (state) => state.drivers.current;
export const selectDriverStatus = (state) => state.drivers.status;
export const selectDriverError = (state) => state.drivers.error;

export default driverSlice.reducer;

