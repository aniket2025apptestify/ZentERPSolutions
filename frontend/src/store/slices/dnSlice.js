import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  list: [],
  current: null,
  tracking: [],
  status: 'idle',
  error: null,
};

// Async thunks
export const fetchDNList = createAsyncThunk(
  'dn/fetchDNList',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.clientId) params.append('clientId', filters.clientId);

      const response = await api.get(
        `/api/dn${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch delivery notes'
      );
    }
  }
);

export const fetchDNDetails = createAsyncThunk(
  'dn/fetchDNDetails',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/dn/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch delivery note'
      );
    }
  }
);

export const createDN = createAsyncThunk(
  'dn/createDN',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/dn', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create delivery note'
      );
    }
  }
);

export const loadDN = createAsyncThunk(
  'dn/loadDN',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/dn/${id}/load`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update loading'
      );
    }
  }
);

export const assignVehicle = createAsyncThunk(
  'dn/assignVehicle',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/dn/${id}/assign-vehicle`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to assign vehicle'
      );
    }
  }
);

export const dispatchDN = createAsyncThunk(
  'dn/dispatchDN',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/dn/${id}/dispatch`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to dispatch delivery note'
      );
    }
  }
);

export const addTracking = createAsyncThunk(
  'dn/addTracking',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/dn/${id}/tracking`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to add tracking'
      );
    }
  }
);

export const deliverDN = createAsyncThunk(
  'dn/deliverDN',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/dn/${id}/deliver`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to deliver'
      );
    }
  }
);

// DN slice
const dnSlice = createSlice({
  name: 'dn',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentDN: (state) => {
      state.current = null;
    },
    clearTracking: (state) => {
      state.tracking = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch DN list
    builder
      .addCase(fetchDNList.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDNList.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchDNList.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch DN details
    builder
      .addCase(fetchDNDetails.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDNDetails.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
        state.tracking = action.payload.tracking || [];
        state.error = null;
      })
      .addCase(fetchDNDetails.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create DN
    builder
      .addCase(createDN.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createDN.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list.unshift(action.payload.deliveryNote);
        state.current = action.payload.deliveryNote;
        state.error = null;
      })
      .addCase(createDN.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Load DN
    builder
      .addCase(loadDN.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadDN.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.current && state.current.id === action.payload.id) {
          state.current = action.payload;
        }
        const index = state.list.findIndex((dn) => dn.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(loadDN.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Assign vehicle
    builder
      .addCase(assignVehicle.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(assignVehicle.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.current && state.current.id === action.payload.id) {
          state.current = action.payload;
        }
        const index = state.list.findIndex((dn) => dn.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(assignVehicle.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Dispatch DN
    builder
      .addCase(dispatchDN.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(dispatchDN.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.current && state.current.id === action.payload.id) {
          state.current = action.payload;
        }
        const index = state.list.findIndex((dn) => dn.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(dispatchDN.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Add tracking
    builder
      .addCase(addTracking.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(addTracking.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tracking.unshift(action.payload);
        if (state.current) {
          state.current.tracking = [action.payload, ...(state.current.tracking || [])];
        }
        state.error = null;
      })
      .addCase(addTracking.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Deliver DN
    builder
      .addCase(deliverDN.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deliverDN.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.current && state.current.id === action.payload.id) {
          state.current = action.payload;
        }
        const index = state.list.findIndex((dn) => dn.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(deliverDN.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentDN, clearTracking } = dnSlice.actions;

// Selectors
export const selectDNList = (state) => state.dn.list;
export const selectCurrentDN = (state) => state.dn.current;
export const selectDNTracking = (state) => state.dn.tracking;
export const selectDNStatus = (state) => state.dn.status;
export const selectDNError = (state) => state.dn.error;

export default dnSlice.reducer;

