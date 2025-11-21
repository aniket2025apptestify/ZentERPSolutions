import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const initialState = {
  list: [],
  status: 'idle',
  error: null,
};

export const fetchVendorQuotesForMR = createAsyncThunk(
  'vendorQuotes/fetchVendorQuotesForMR',
  async (mrId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/procurement/material-requests/${mrId}/vendor-quotes`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch vendor quotes'
      );
    }
  }
);

export const createVendorQuote = createAsyncThunk(
  'vendorQuotes/createVendorQuote',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/procurement/vendor-quotes', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create vendor quote'
      );
    }
  }
);

const vendorQuotesSlice = createSlice({
  name: 'vendorQuotes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearList: (state) => {
      state.list = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorQuotesForMR.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVendorQuotesForMR.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchVendorQuotesForMR.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createVendorQuote.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createVendorQuote.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Quote will be added to list when MR is refetched
      })
      .addCase(createVendorQuote.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearList } = vendorQuotesSlice.actions;
export const selectVendorQuotes = (state) => state.vendorQuotes.list;
export const selectVendorQuotesStatus = (state) => state.vendorQuotes.status;
export const selectVendorQuotesError = (state) => state.vendorQuotes.error;

export default vendorQuotesSlice.reducer;

