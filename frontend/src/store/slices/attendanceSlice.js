import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  records: [],
  totals: null,
  status: 'idle',
  error: null,
  bulkUploadResult: null,
};

// Async thunks
export const fetchAttendance = createAsyncThunk(
  'attendance/fetchAttendance',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.jobId) params.append('jobId', filters.jobId);

      const queryString = params.toString();
      const url = queryString ? `/api/hr/attendance?${queryString}` : '/api/hr/attendance';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch attendance'
      );
    }
  }
);

export const createAttendance = createAsyncThunk(
  'attendance/createAttendance',
  async (attendanceData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/hr/attendance', attendanceData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create attendance'
      );
    }
  }
);

export const bulkUploadAttendance = createAsyncThunk(
  'attendance/bulkUploadAttendance',
  async ({ file, data }, { rejectWithValue }) => {
    try {
      let response;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        response = await api.post('/api/hr/attendance/bulk', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else if (data) {
        response = await api.post('/api/hr/attendance/bulk', data);
      } else {
        throw new Error('File or data is required');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to upload attendance'
      );
    }
  }
);

// Attendance slice
const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearBulkUploadResult: (state) => {
      state.bulkUploadResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendance.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAttendance.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.records = action.payload.attendances || [];
        state.totals = action.payload.totals || null;
        state.error = null;
      })
      .addCase(fetchAttendance.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createAttendance.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createAttendance.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.records.unshift(action.payload);
        state.error = null;
      })
      .addCase(createAttendance.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(bulkUploadAttendance.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(bulkUploadAttendance.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.bulkUploadResult = action.payload;
        state.error = null;
      })
      .addCase(bulkUploadAttendance.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearBulkUploadResult } = attendanceSlice.actions;

// Selectors
export const selectAttendance = (state) => state.attendance.records;
export const selectAttendanceTotals = (state) => state.attendance.totals;
export const selectAttendanceStatus = (state) => state.attendance.status;
export const selectAttendanceError = (state) => state.attendance.error;
export const selectBulkUploadResult = (state) => state.attendance.bulkUploadResult;

export default attendanceSlice.reducer;

