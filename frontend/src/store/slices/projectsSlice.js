import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  list: [],
  current: null, // full project with subGroups
  status: 'idle', // idle, loading, succeeded, failed
  error: null,
};

// Async thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(
        `/api/projects${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch projects'
      );
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/projects/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch project'
      );
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/projects', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create project'
      );
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/projects/${id}`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update project'
      );
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/projects/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete project'
      );
    }
  }
);

export const addSubGroup = createAsyncThunk(
  'projects/addSubGroup',
  async ({ projectId, payload }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/projects/${projectId}/subgroups`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to add sub-group'
      );
    }
  }
);

export const fetchProjectProgress = createAsyncThunk(
  'projects/fetchProjectProgress',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/projects/${id}/progress`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch project progress'
      );
    }
  }
);

export const completeProject = createAsyncThunk(
  'projects/completeProject',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/projects/${id}/complete`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to complete project'
      );
    }
  }
);

// Projects slice
const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentProject: (state) => {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch projects
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch project by ID
    builder
      .addCase(fetchProjectById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
        state.error = null;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Create project
    builder
      .addCase(createProject.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Add to list if it has progress info
        if (action.payload.project) {
          state.list.unshift({
            ...action.payload.project,
            progress: 0,
          });
        }
        state.current = action.payload;
        state.error = null;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Update project
    builder
      .addCase(updateProject.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.list.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = { ...state.list[index], ...action.payload };
        }
        if (state.current?.id === action.payload.id) {
          state.current = action.payload;
        }
        state.error = null;
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Delete project
    builder
      .addCase(deleteProject.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = state.list.filter((p) => p.id !== action.payload);
        if (state.current?.id === action.payload) {
          state.current = null;
        }
        state.error = null;
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Add sub-group
    builder
      .addCase(addSubGroup.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(addSubGroup.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.current) {
          if (!state.current.subGroups) {
            state.current.subGroups = [];
          }
          state.current.subGroups.push(action.payload);
        }
        state.error = null;
      })
      .addCase(addSubGroup.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch project progress
    builder
      .addCase(fetchProjectProgress.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProjectProgress.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Store progress in current project if it matches
        if (state.current && state.current.id === action.payload.projectId) {
          state.current.progress = action.payload.progress;
        }
        state.error = null;
      })
      .addCase(fetchProjectProgress.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Complete project
    builder
      .addCase(completeProject.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(completeProject.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.current && state.current.id === action.payload.project.id) {
          state.current = action.payload.project;
        }
        const index = state.list.findIndex(
          (p) => p.id === action.payload.project.id
        );
        if (index !== -1) {
          state.list[index] = {
            ...state.list[index],
            ...action.payload.project,
          };
        }
        state.error = null;
      })
      .addCase(completeProject.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentProject } = projectsSlice.actions;

// Selectors
export const selectProjects = (state) => state.projects.list;
export const selectCurrentProject = (state) => state.projects.current;
export const selectProjectsStatus = (state) => state.projects.status;
export const selectProjectsError = (state) => state.projects.error;

export default projectsSlice.reducer;

