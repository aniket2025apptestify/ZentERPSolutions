import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  items: [],
  selectedItem: null,
  transactions: [],
  wastageReport: [],
  status: 'idle',
  error: null,
  pagination: null,
};

// Async thunks
export const fetchItems = createAsyncThunk(
  'inventory/fetchItems',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.lowStock) params.append('lowStock', filters.lowStock);
      if (filters.systemItem !== undefined && filters.systemItem !== '')
        params.append('systemItem', filters.systemItem);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await api.get(
        `/api/inventory/items${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch inventory items'
      );
    }
  }
);

export const fetchItemById = createAsyncThunk(
  'inventory/fetchItemById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/inventory/items/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch inventory item'
      );
    }
  }
);

export const createItem = createAsyncThunk(
  'inventory/createItem',
  async (itemData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/inventory/items', itemData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create inventory item'
      );
    }
  }
);

export const updateItem = createAsyncThunk(
  'inventory/updateItem',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/inventory/items/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update inventory item'
      );
    }
  }
);

export const deleteItem = createAsyncThunk(
  'inventory/deleteItem',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/inventory/items/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete inventory item'
      );
    }
  }
);

export const createStockTransaction = createAsyncThunk(
  'inventory/createStockTransaction',
  async (transactionData, { rejectWithValue }) => {
    try {
      const response = await api.post(
        '/api/inventory/stock-transaction',
        transactionData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create stock transaction'
      );
    }
  }
);

export const fetchTransactions = createAsyncThunk(
  'inventory/fetchTransactions',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.itemId) params.append('itemId', filters.itemId);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.type) params.append('type', filters.type);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await api.get(
        `/api/inventory/stock-transactions${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch stock transactions'
      );
    }
  }
);

export const issueMaterial = createAsyncThunk(
  'inventory/issueMaterial',
  async (issueData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/inventory/issue', issueData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to issue material'
      );
    }
  }
);

export const reserveStock = createAsyncThunk(
  'inventory/reserveStock',
  async (reserveData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/inventory/reserve', reserveData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to reserve stock'
      );
    }
  }
);

export const unreserveStock = createAsyncThunk(
  'inventory/unreserveStock',
  async (unreserveData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/inventory/unreserve', unreserveData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to unreserve stock'
      );
    }
  }
);

export const fetchWastageReport = createAsyncThunk(
  'inventory/fetchWastageReport',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.itemId) params.append('itemId', filters.itemId);
      if (filters.jobId) params.append('jobId', filters.jobId);

      const response = await api.get(
        `/api/inventory/wastage-report${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch wastage report'
      );
    }
  }
);

export const checkLowStock = createAsyncThunk(
  'inventory/checkLowStock',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/inventory/check-low-stock');
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to check low stock'
      );
    }
  }
);

// Slice
const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedItem: (state) => {
      state.selectedItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch items
      .addCase(fetchItems.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items || action.payload;
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch item by ID
      .addCase(fetchItemById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchItemById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedItem = action.payload;
      })
      .addCase(fetchItemById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Create item
      .addCase(createItem.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createItem.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.unshift(action.payload);
      })
      .addCase(createItem.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Update item
      .addCase(updateItem.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateItem.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedItem?.id === action.payload.id) {
          state.selectedItem = action.payload;
        }
      })
      .addCase(updateItem.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Delete item
      .addCase(deleteItem.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteItem.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.selectedItem?.id === action.payload) {
          state.selectedItem = null;
        }
      })
      .addCase(deleteItem.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch transactions
      .addCase(fetchTransactions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.transactions = action.payload.transactions || action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Issue material
      .addCase(issueMaterial.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(issueMaterial.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(issueMaterial.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch wastage report
      .addCase(fetchWastageReport.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchWastageReport.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.wastageReport = action.payload;
      })
      .addCase(fetchWastageReport.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Check low stock
      .addCase(checkLowStock.fulfilled, (state, action) => {
        // Low stock check doesn't change state, just returns data
      });
  },
});

export const { clearError, clearSelectedItem } = inventorySlice.actions;

// Selectors
export const selectItems = (state) => state.inventory.items;
export const selectSelectedItem = (state) => state.inventory.selectedItem;
export const selectTransactions = (state) => state.inventory.transactions;
export const selectWastageReport = (state) => state.inventory.wastageReport;
export const selectInventoryStatus = (state) => state.inventory.status;
export const selectInventoryError = (state) => state.inventory.error;
export const selectInventoryPagination = (state) => state.inventory.pagination;

export default inventorySlice.reducer;

