import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  list: [],
  currentJob: null,
  boardStages: [], // from tenant settings
  status: 'idle', // idle, loading, succeeded, failed
  error: null,
};

// Async thunks
export const fetchProductionBoard = createAsyncThunk(
  'production/fetchProductionBoard',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.stage) params.append('stage', filters.stage);
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.subGroupId) params.append('subGroupId', filters.subGroupId);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
      if (filters.date) params.append('date', filters.date);

      const response = await api.get(
        `/api/production/jobs${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch production board'
      );
    }
  }
);

export const fetchJobDetails = createAsyncThunk(
  'production/fetchJobDetails',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/production/jobs/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch job details'
      );
    }
  }
);

export const createJob = createAsyncThunk(
  'production/createJob',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/production/jobs', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create job'
      );
    }
  }
);

export const updateJobStatus = createAsyncThunk(
  'production/updateJobStatus',
  async ({ jobId, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/production/jobs/${jobId}/status`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update job status'
      );
    }
  }
);

export const logJobHours = createAsyncThunk(
  'production/logJobHours',
  async ({ jobId, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/production/jobs/${jobId}/log`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to log hours'
      );
    }
  }
);

export const createQCRecord = createAsyncThunk(
  'production/createQCRecord',
  async ({ jobId, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/production/jobs/${jobId}/qc`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create QC record'
      );
    }
  }
);

export const assignJob = createAsyncThunk(
  'production/assignJob',
  async ({ jobId, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/production/jobs/${jobId}/assign`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to assign job'
      );
    }
  }
);

export const attachPhotos = createAsyncThunk(
  'production/attachPhotos',
  async ({ jobId, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/production/jobs/${jobId}/attach-photos`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to attach photos'
      );
    }
  }
);

// Production slice
const productionSlice = createSlice({
  name: 'production',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentJob: (state) => {
      state.currentJob = null;
    },
    setBoardStages: (state, action) => {
      state.boardStages = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch production board
    builder
      .addCase(fetchProductionBoard.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProductionBoard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchProductionBoard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch job details
    builder
      .addCase(fetchJobDetails.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchJobDetails.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentJob = action.payload;
        state.error = null;
      })
      .addCase(fetchJobDetails.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create job
    builder
      .addCase(createJob.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list.unshift(action.payload);
        state.error = null;
      })
      .addCase(createJob.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Update job status
    builder
      .addCase(updateJobStatus.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateJobStatus.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((job) => job.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.currentJob && state.currentJob.id === action.payload.id) {
          state.currentJob = action.payload;
        }
        state.error = null;
      })
      .addCase(updateJobStatus.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Log job hours
    builder
      .addCase(logJobHours.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(logJobHours.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Update job in list if exists
        const index = state.list.findIndex((job) => job.id === action.payload.productionJobId);
        if (index !== -1) {
          state.list[index].actualHours = action.payload.updatedActualHours;
          state.list[index].actualQty = action.payload.updatedActualQty;
        }
        // Refresh current job if it's the same
        if (state.currentJob && state.currentJob.id === action.payload.productionJobId) {
          // Optionally refetch job details
        }
        state.error = null;
      })
      .addCase(logJobHours.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create QC record
    builder
      .addCase(createQCRecord.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createQCRecord.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
        // Optionally refetch job details to get updated QC records
      })
      .addCase(createQCRecord.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Assign job
    builder
      .addCase(assignJob.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(assignJob.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((job) => job.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.currentJob && state.currentJob.id === action.payload.id) {
          state.currentJob = action.payload;
        }
        state.error = null;
      })
      .addCase(assignJob.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Attach photos
    builder
      .addCase(attachPhotos.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(attachPhotos.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
        // Optionally refetch job details to get updated photos
      })
      .addCase(attachPhotos.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentJob, setBoardStages } = productionSlice.actions;

// Selectors
export const selectProductionList = (state) => state.production.list;
export const selectCurrentJob = (state) => state.production.currentJob;
export const selectBoardStages = (state) => state.production.boardStages;
export const selectProductionStatus = (state) => state.production.status;
export const selectProductionError = (state) => state.production.error;

export default productionSlice.reducer;

