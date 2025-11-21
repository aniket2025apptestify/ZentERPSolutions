import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  list: [],
  current: null,
  pendingCount: 0,
  status: 'idle',
  error: null,
};

// Async thunks
export const fetchQCList = createAsyncThunk(
  'qc/fetchQCList',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.productionJobId) params.append('productionJobId', filters.productionJobId);
      if (filters.dnId) params.append('dnId', filters.dnId);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(
        `/api/qc${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch QC records'
      );
    }
  }
);

export const fetchQCById = createAsyncThunk(
  'qc/fetchQCById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/qc/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch QC record'
      );
    }
  }
);

export const createProductionQC = createAsyncThunk(
  'qc/createProductionQC',
  async ({ productionJobId, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/qc/production/${productionJobId}`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create QC record'
      );
    }
  }
);

export const createDNQC = createAsyncThunk(
  'qc/createDNQC',
  async ({ dnId, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/qc/delivery-note/${dnId}`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create DN QC record'
      );
    }
  }
);

// QC slice
const qcSlice = createSlice({
  name: 'qc',
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
    // Fetch QC list
    builder
      .addCase(fetchQCList.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchQCList.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.pendingCount = action.payload.filter(
          (qc) => qc.qcStatus === 'FAIL' && !qc.reworkJobId
        ).length;
        state.error = null;
      })
      .addCase(fetchQCList.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch QC by ID
    builder
      .addCase(fetchQCById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchQCById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
        state.error = null;
      })
      .addCase(fetchQCById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create production QC
    builder
      .addCase(createProductionQC.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createProductionQC.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(createProductionQC.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create DN QC
    builder
      .addCase(createDNQC.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createDNQC.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(createDNQC.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrent } = qcSlice.actions;

// Selectors
export const selectQCList = (state) => state.qc.list;
export const selectCurrentQC = (state) => state.qc.current;
export const selectQCPendingCount = (state) => state.qc.pendingCount;
export const selectQCStatus = (state) => state.qc.status;
export const selectQCError = (state) => state.qc.error;

export default qcSlice.reducer;

