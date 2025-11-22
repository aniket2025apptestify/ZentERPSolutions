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
export const fetchSWOs = createAsyncThunk(
  'swo/fetchSWOs',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.vendorId) params.append('vendorId', filters.vendorId);
      if (filters.projectId) params.append('projectId', filters.projectId);

      const response = await api.get(
        `/api/subcontract/swo${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch SWOs'
      );
    }
  }
);

export const fetchSWOById = createAsyncThunk(
  'swo/fetchSWOById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/subcontract/swo/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch SWO'
      );
    }
  }
);

export const createSWO = createAsyncThunk(
  'swo/createSWO',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/subcontract/swo', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create SWO'
      );
    }
  }
);

export const issueMaterial = createAsyncThunk(
  'swo/issueMaterial',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/subcontract/swo/${id}/issue-material`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to issue material'
      );
    }
  }
);

export const startSWO = createAsyncThunk(
  'swo/startSWO',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/subcontract/swo/${id}/start`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to start SWO'
      );
    }
  }
);

export const receiveGoods = createAsyncThunk(
  'swo/receiveGoods',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/subcontract/swo/${id}/receive`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to receive goods'
      );
    }
  }
);

export const closeSWO = createAsyncThunk(
  'swo/closeSWO',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/subcontract/swo/${id}/close`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to close SWO'
      );
    }
  }
);

export const fetchSWOsByVendor = createAsyncThunk(
  'swo/fetchSWOsByVendor',
  async (vendorId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/subcontract/vendors/${vendorId}/swo`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch SWOs by vendor'
      );
    }
  }
);

// SWO slice
const swoSlice = createSlice({
  name: 'swo',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentSWO: (state) => {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch SWOs
    builder
      .addCase(fetchSWOs.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSWOs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchSWOs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch SWO by ID
    builder
      .addCase(fetchSWOById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSWOById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
        state.error = null;
      })
      .addCase(fetchSWOById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create SWO
    builder
      .addCase(createSWO.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createSWO.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Optionally add to list if needed
        state.error = null;
      })
      .addCase(createSWO.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Issue material
    builder
      .addCase(issueMaterial.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(issueMaterial.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Update current SWO if it's loaded
        if (state.current && state.current.id === action.meta.arg.id) {
          state.current.status = action.payload.status;
        }
        state.error = null;
      })
      .addCase(issueMaterial.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Start SWO
    builder
      .addCase(startSWO.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(startSWO.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.current && state.current.id === action.meta.arg.id) {
          state.current = action.payload;
        }
        state.error = null;
      })
      .addCase(startSWO.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Receive goods
    builder
      .addCase(receiveGoods.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(receiveGoods.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.current && state.current.id === action.meta.arg.id) {
          state.current.status = action.payload.status;
        }
        state.error = null;
      })
      .addCase(receiveGoods.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Close SWO
    builder
      .addCase(closeSWO.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(closeSWO.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.current && state.current.id === action.meta.arg.id) {
          state.current = action.payload.swo;
        }
        state.error = null;
      })
      .addCase(closeSWO.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentSWO } = swoSlice.actions;

// Selectors
export const selectSWOs = (state) => state.swo.list;
export const selectCurrentSWO = (state) => state.swo.current;
export const selectSWOsStatus = (state) => state.swo.status;
export const selectSWOsError = (state) => state.swo.error;

export default swoSlice.reducer;
