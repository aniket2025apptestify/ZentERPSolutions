import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import AuthProvider from './components/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TenantList from './pages/TenantList';
import TenantDetail from './pages/TenantDetail';
import TenantOnboardingWizard from './pages/TenantOnboardingWizard';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes with Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* SuperAdmin Routes */}
            <Route
              path="/super/tenants"
              element={
                <ProtectedRoute>
                  <SuperAdminRoute>
                    <Layout>
                      <TenantList />
                    </Layout>
                  </SuperAdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super/tenants/new"
              element={
                <ProtectedRoute>
                  <SuperAdminRoute>
                    <Layout>
                      <TenantOnboardingWizard />
                    </Layout>
                  </SuperAdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super/tenants/:id"
              element={
                <ProtectedRoute>
                  <SuperAdminRoute>
                    <Layout>
                      <TenantDetail />
                    </Layout>
                  </SuperAdminRoute>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </Provider>
  );
}

export default App;
