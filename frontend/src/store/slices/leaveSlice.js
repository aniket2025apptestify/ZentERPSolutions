import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  list: [],
  selectedLeave: null,
  status: 'idle',
  error: null,
};

// Async thunks
export const fetchLeaves = createAsyncThunk(
  'leaves/fetchLeaves',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.status) params.append('status', filters.status);
      if (filters.leaveType) params.append('leaveType', filters.leaveType);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);

      const queryString = params.toString();
      const url = queryString ? `/api/hr/leave?${queryString}` : '/api/hr/leave';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch leaves'
      );
    }
  }
);

export const fetchLeaveById = createAsyncThunk(
  'leaves/fetchLeaveById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/hr/leave/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch leave'
      );
    }
  }
);

export const applyLeave = createAsyncThunk(
  'leaves/applyLeave',
  async (leaveData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/hr/leave', leaveData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to apply leave'
      );
    }
  }
);

export const approveLeave = createAsyncThunk(
  'leaves/approveLeave',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/hr/leave/${id}/approve`, { action: 'approve' });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to approve leave'
      );
    }
  }
);

export const rejectLeave = createAsyncThunk(
  'leaves/rejectLeave',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/hr/leave/${id}/reject`, { action: 'reject' });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to reject leave'
      );
    }
  }
);

// Leave slice
const leaveSlice = createSlice({
  name: 'leaves',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedLeave: (state) => {
      state.selectedLeave = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaves.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchLeaves.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchLeaves.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchLeaveById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchLeaveById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedLeave = action.payload;
        state.error = null;
      })
      .addCase(fetchLeaveById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(applyLeave.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(applyLeave.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list.unshift(action.payload);
        state.error = null;
      })
      .addCase(applyLeave.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(approveLeave.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(approveLeave.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((l) => l.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.selectedLeave?.id === action.payload.id) {
          state.selectedLeave = action.payload;
        }
        state.error = null;
      })
      .addCase(approveLeave.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(rejectLeave.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(rejectLeave.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((l) => l.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.selectedLeave?.id === action.payload.id) {
          state.selectedLeave = action.payload;
        }
        state.error = null;
      })
      .addCase(rejectLeave.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearSelectedLeave } = leaveSlice.actions;

// Selectors
export const selectLeaves = (state) => state.leaves.list;
export const selectSelectedLeave = (state) => state.leaves.selectedLeave;
export const selectLeavesStatus = (state) => state.leaves.status;
export const selectLeavesError = (state) => state.leaves.error;

export default leaveSlice.reducer;

