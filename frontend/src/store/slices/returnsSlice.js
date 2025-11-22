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
export const fetchReturns = createAsyncThunk(
  'returns/fetchReturns',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);

      const response = await api.get(
        `/api/returns${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch returns'
      );
    }
  }
);

export const fetchReturnById = createAsyncThunk(
  'returns/fetchReturnById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/returns/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch return record'
      );
    }
  }
);

export const createReturn = createAsyncThunk(
  'returns/createReturn',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/returns', payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create return record'
      );
    }
  }
);

export const inspectReturn = createAsyncThunk(
  'returns/inspectReturn',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/returns/${id}/inspect`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to inspect return'
      );
    }
  }
);

export const createReplacementDN = createAsyncThunk(
  'returns/createReplacementDN',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/returns/${id}/replace`, payload);
      return { id, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create replacement DN'
      );
    }
  }
);

// Returns slice
const returnsSlice = createSlice({
  name: 'returns',
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
    // Fetch returns
    builder
      .addCase(fetchReturns.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchReturns.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchReturns.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch return by ID
    builder
      .addCase(fetchReturnById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchReturnById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
        state.error = null;
      })
      .addCase(fetchReturnById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create return
    builder
      .addCase(createReturn.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createReturn.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list.unshift(action.payload);
        state.error = null;
      })
      .addCase(createReturn.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Inspect return
    builder
      .addCase(inspectReturn.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(inspectReturn.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Refresh current return if it matches
        if (state.current && state.current.id === action.payload.returnId) {
          // Refetch to get updated data
        }
        state.error = null;
      })
      .addCase(inspectReturn.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create replacement DN
    builder
      .addCase(createReplacementDN.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createReplacementDN.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(createReplacementDN.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrent } = returnsSlice.actions;

// Selectors
export const selectReturnsList = (state) => state.returns.list;
export const selectCurrentReturn = (state) => state.returns.current;
export const selectReturnsStatus = (state) => state.returns.status;
export const selectReturnsError = (state) => state.returns.error;

export default returnsSlice.reducer;

