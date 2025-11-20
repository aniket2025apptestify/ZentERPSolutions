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
import MaterialRequestList from './pages/procurement/MaterialRequestList';
import CreateMaterialRequest from './pages/procurement/CreateMaterialRequest';
import MaterialRequestDetail from './pages/procurement/MaterialRequestDetail';
import EnterVendorQuote from './pages/procurement/EnterVendorQuote';
import CompareVendorQuotes from './pages/procurement/CompareVendorQuotes';
import VendorList from './pages/procurement/VendorList';
import PurchaseOrderList from './pages/procurement/PurchaseOrderList';
import CreatePurchaseOrder from './pages/procurement/CreatePurchaseOrder';
import PurchaseOrderDetail from './pages/procurement/PurchaseOrderDetail';
import CreateGRN from './pages/procurement/CreateGRN';
import GRNList from './pages/procurement/GRNList';
import GRNDetail from './pages/procurement/GRNDetail';
import VendorPortal from './pages/vendor/VendorPortal';
import VendorLogin from './pages/vendor/VendorLogin';
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

            {/* Procurement Routes */}
            <Route
              path="/procurement/material-requests"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MaterialRequestList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/procurement/material-requests/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateMaterialRequest />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/procurement/material-requests/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MaterialRequestDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/procurement/material-requests/:mrId/enter-quote"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EnterVendorQuote />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/procurement/mr/:mrId/quotes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CompareVendorQuotes />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Vendor Portal Routes (Public) */}
            <Route path="/vendor/login" element={<VendorLogin />} />
            <Route path="/vendor/quote/:mrId" element={<VendorPortal />} />
            <Route
              path="/vendor/quote-success"
              element={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="bg-white shadow rounded-lg p-8 text-center">
                    <h1 className="text-2xl font-bold text-green-600 mb-4">Quote Submitted!</h1>
                    <p className="text-gray-600">Your quote has been submitted successfully.</p>
                  </div>
                </div>
              }
            />
            <Route
              path="/procurement/vendors"
              element={
                <ProtectedRoute>
                  <Layout>
                    <VendorList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/procurement/purchase-orders"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PurchaseOrderList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/procurement/purchase-orders/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreatePurchaseOrder />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/procurement/purchase-orders/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PurchaseOrderDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/procurement/grn"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GRNList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/procurement/grn/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateGRN />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/procurement/grn/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GRNDetail />
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
