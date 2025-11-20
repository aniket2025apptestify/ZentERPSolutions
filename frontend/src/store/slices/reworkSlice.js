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
export const fetchReworks = createAsyncThunk(
  'rework/fetchReworks',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
      if (filters.sourceProductionJobId) params.append('sourceProductionJobId', filters.sourceProductionJobId);
      if (filters.sourceDNId) params.append('sourceDNId', filters.sourceDNId);

      const response = await api.get(
        `/api/rework${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch rework jobs'
      );
    }
  }
);

export const fetchReworkById = createAsyncThunk(
  'rework/fetchReworkById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/rework/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch rework job'
      );
    }
  }
);

export const createRework = createAsyncThunk(
  'rework/createRework',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/rework', payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create rework job'
      );
    }
  }
);

export const updateRework = createAsyncThunk(
  'rework/updateRework',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/rework/${id}`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update rework job'
      );
    }
  }
);

// Rework slice
const reworkSlice = createSlice({
  name: 'rework',
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
    // Fetch reworks
    builder
      .addCase(fetchReworks.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchReworks.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchReworks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch rework by ID
    builder
      .addCase(fetchReworkById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchReworkById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
        state.error = null;
      })
      .addCase(fetchReworkById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create rework
    builder
      .addCase(createRework.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createRework.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list.unshift(action.payload);
        state.error = null;
      })
      .addCase(createRework.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Update rework
    builder
      .addCase(updateRework.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateRework.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.current && state.current.id === action.payload.id) {
          state.current = action.payload;
        }
        state.error = null;
      })
      .addCase(updateRework.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrent } = reworkSlice.actions;

// Selectors
export const selectReworkList = (state) => state.rework.list;
export const selectCurrentRework = (state) => state.rework.current;
export const selectReworkStatus = (state) => state.rework.status;
export const selectReworkError = (state) => state.rework.error;

export default reworkSlice.reducer;

