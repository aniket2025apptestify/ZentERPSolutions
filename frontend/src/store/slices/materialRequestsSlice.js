import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const initialState = {
  list: [],
  current: null,
  status: 'idle',
  error: null,
};

export const fetchMaterialRequests = createAsyncThunk(
  'materialRequests/fetchMaterialRequests',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.subGroupId) params.append('subGroupId', filters.subGroupId);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(
        `/api/procurement/material-requests${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch material requests'
      );
    }
  }
);

export const fetchMaterialRequestById = createAsyncThunk(
  'materialRequests/fetchMaterialRequestById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/procurement/material-requests/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch material request'
      );
    }
  }
);

export const createMaterialRequest = createAsyncThunk(
  'materialRequests/createMaterialRequest',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/procurement/material-requests', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create material request'
      );
    }
  }
);

const materialRequestsSlice = createSlice({
  name: 'materialRequests',
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
      .addCase(fetchMaterialRequests.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMaterialRequests.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchMaterialRequests.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchMaterialRequestById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMaterialRequestById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
      })
      .addCase(fetchMaterialRequestById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createMaterialRequest.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createMaterialRequest.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // The API returns { id, requestNumber, status }, not the full object
        // We'll refetch the list instead of adding incomplete data
        state.error = null;
      })
      .addCase(createMaterialRequest.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrent } = materialRequestsSlice.actions;
export const selectMaterialRequests = (state) => state.materialRequests.list;
export const selectCurrentMaterialRequest = (state) => state.materialRequests.current;
export const selectMaterialRequestsStatus = (state) => state.materialRequests.status;
export const selectMaterialRequestsError = (state) => state.materialRequests.error;

export default materialRequestsSlice.reducer;

