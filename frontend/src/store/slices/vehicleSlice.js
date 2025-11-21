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
export const fetchVehicles = createAsyncThunk(
  'vehicles/fetchVehicles',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(
        `/api/vehicles${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch vehicles'
      );
    }
  }
);

export const fetchVehicleById = createAsyncThunk(
  'vehicles/fetchVehicleById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/vehicles/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch vehicle'
      );
    }
  }
);

export const createVehicle = createAsyncThunk(
  'vehicles/createVehicle',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/vehicles', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create vehicle'
      );
    }
  }
);

export const updateVehicle = createAsyncThunk(
  'vehicles/updateVehicle',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/vehicles/${id}`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update vehicle'
      );
    }
  }
);

export const deleteVehicle = createAsyncThunk(
  'vehicles/deleteVehicle',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/vehicles/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete vehicle'
      );
    }
  }
);

// Vehicle slice
const vehicleSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentVehicle: (state) => {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch vehicles
    builder
      .addCase(fetchVehicles.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch vehicle by ID
    builder
      .addCase(fetchVehicleById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVehicleById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
        state.error = null;
      })
      .addCase(fetchVehicleById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create vehicle
    builder
      .addCase(createVehicle.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createVehicle.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list.unshift(action.payload);
        state.error = null;
      })
      .addCase(createVehicle.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Update vehicle
    builder
      .addCase(updateVehicle.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateVehicle.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((v) => v.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.current && state.current.id === action.payload.id) {
          state.current = action.payload;
        }
        state.error = null;
      })
      .addCase(updateVehicle.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Delete vehicle
    builder
      .addCase(deleteVehicle.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = state.list.filter((v) => v.id !== action.payload);
        if (state.current && state.current.id === action.payload) {
          state.current = null;
        }
        state.error = null;
      })
      .addCase(deleteVehicle.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentVehicle } = vehicleSlice.actions;

// Selectors
export const selectVehicles = (state) => state.vehicles.list;
export const selectCurrentVehicle = (state) => state.vehicles.current;
export const selectVehicleStatus = (state) => state.vehicles.status;
export const selectVehicleError = (state) => state.vehicles.error;

export default vehicleSlice.reducer;

