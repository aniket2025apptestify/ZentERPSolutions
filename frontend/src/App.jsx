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
import Users from './pages/Users';
import InquiryList from './pages/InquiryList';
import InquiryDetail from './pages/InquiryDetail';
import NewInquiry from './pages/NewInquiry';
import ClientList from './pages/ClientList';
import ClientDetail from './pages/ClientDetail';
import QuotationList from './pages/QuotationList';
import QuotationDetail from './pages/QuotationDetail';
import NewQuotation from './pages/NewQuotation';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import NewProject from './pages/NewProject';
import RoleBasedRoute from './components/RoleBasedRoute';
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

            {/* User Management Routes (DIRECTOR or IT_ADMIN only) */}
            <Route
              path="/settings/users"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['DIRECTOR', 'IT_ADMIN']}>
                    <Layout>
                      <Users />
                    </Layout>
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />

            {/* Inquiry Management Routes */}
            <Route
              path="/inquiries"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InquiryList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inquiries/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <NewInquiry />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inquiries/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InquiryDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Client Management Routes */}
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ClientList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ClientDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Quotation Management Routes */}
            <Route
              path="/quotations"
              element={
                <ProtectedRoute>
                  <Layout>
                    <QuotationList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/quotations/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <NewQuotation />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/quotations/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <QuotationDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Project Management Routes */}
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProjectList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <NewProject />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProjectDetail />
                  </Layout>
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
