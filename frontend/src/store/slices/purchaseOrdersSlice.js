import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const initialState = {
  list: [],
  current: null,
  status: 'idle',
  error: null,
};

export const fetchPurchaseOrders = createAsyncThunk(
  'purchaseOrders/fetchPurchaseOrders',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.vendorId) params.append('vendorId', filters.vendorId);
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.subGroupId) params.append('subGroupId', filters.subGroupId);

      const response = await api.get(
        `/api/procurement/purchase-orders${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch purchase orders'
      );
    }
  }
);

export const fetchPurchaseOrderById = createAsyncThunk(
  'purchaseOrders/fetchPurchaseOrderById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/procurement/purchase-orders/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch purchase order'
      );
    }
  }
);

export const createPurchaseOrder = createAsyncThunk(
  'purchaseOrders/createPurchaseOrder',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/procurement/purchase-orders', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create purchase order'
      );
    }
  }
);

export const approvePurchaseOrder = createAsyncThunk(
  'purchaseOrders/approvePurchaseOrder',
  async ({ id, approvedBy, notes }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/procurement/purchase-orders/${id}/approve`, {
        approvedBy,
        notes,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to approve purchase order'
      );
    }
  }
);

export const sendPurchaseOrder = createAsyncThunk(
  'purchaseOrders/sendPurchaseOrder',
  async ({ id, sentBy, sendEmail, emailMessage }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/procurement/purchase-orders/${id}/send`, {
        sentBy,
        sendEmail,
        emailMessage,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to send purchase order'
      );
    }
  }
);

const purchaseOrdersSlice = createSlice({
  name: 'purchaseOrders',
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
      .addCase(fetchPurchaseOrders.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPurchaseOrders.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchPurchaseOrders.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchPurchaseOrderById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPurchaseOrderById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
      })
      .addCase(fetchPurchaseOrderById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createPurchaseOrder.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createPurchaseOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list.unshift(action.payload);
      })
      .addCase(createPurchaseOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(approvePurchaseOrder.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(approvePurchaseOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((po) => po.id === action.payload.poId);
        if (index !== -1) {
          state.list[index].status = 'APPROVED';
        }
        if (state.current?.id === action.payload.poId) {
          state.current.status = 'APPROVED';
        }
      })
      .addCase(approvePurchaseOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(sendPurchaseOrder.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(sendPurchaseOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((po) => po.id === action.payload.poId);
        if (index !== -1) {
          state.list[index].status = action.payload.status;
        }
        if (state.current?.id === action.payload.poId) {
          state.current.status = action.payload.status;
        }
      })
      .addCase(sendPurchaseOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrent } = purchaseOrdersSlice.actions;
export const selectPurchaseOrders = (state) => state.purchaseOrders.list;
export const selectCurrentPurchaseOrder = (state) => state.purchaseOrders.current;
export const selectPurchaseOrdersStatus = (state) => state.purchaseOrders.status;
export const selectPurchaseOrdersError = (state) => state.purchaseOrders.error;

export default purchaseOrdersSlice.reducer;

