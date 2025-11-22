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
export const createCreditNote = createAsyncThunk(
  'creditNotes/createCreditNote',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/credit-notes', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create credit note'
      );
    }
  }
);

export const applyCreditNote = createAsyncThunk(
  'creditNotes/applyCreditNote',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/credit-notes/${id}/apply`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to apply credit note'
      );
    }
  }
);

export const fetchCreditNotes = createAsyncThunk(
  'creditNotes/fetchCreditNotes',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.invoiceId) params.append('invoiceId', filters.invoiceId);
      if (filters.status) params.append('status', filters.status);
      if (filters.applied !== undefined) params.append('applied', filters.applied);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);

      const response = await api.get(
        `/api/credit-notes${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch credit notes'
      );
    }
  }
);

export const getCreditNote = createAsyncThunk(
  'creditNotes/getCreditNote',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/credit-notes/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch credit note'
      );
    }
  }
);

// Slice
const creditNotesSlice = createSlice({
  name: 'creditNotes',
  initialState,
  reducers: {
    clearCurrent: (state) => {
      state.current = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create credit note
      .addCase(createCreditNote.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createCreditNote.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Note: API returns { creditNoteId, creditNoteNumber, status }
        // We may need to refetch to get full credit note
        state.error = null;
      })
      .addCase(createCreditNote.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Apply credit note
      .addCase(applyCreditNote.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(applyCreditNote.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.current && state.current.id === action.payload.id) {
          state.current = action.payload;
        }
        const index = state.list.findIndex((cn) => cn.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      .addCase(applyCreditNote.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch credit notes
      .addCase(fetchCreditNotes.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCreditNotes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchCreditNotes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Get credit note
      .addCase(getCreditNote.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(getCreditNote.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
      })
      .addCase(getCreditNote.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearCurrent, clearError } = creditNotesSlice.actions;
export default creditNotesSlice.reducer;

