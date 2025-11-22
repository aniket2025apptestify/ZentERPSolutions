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
import VendorDetail from './pages/procurement/VendorDetail';
import PurchaseOrderList from './pages/procurement/PurchaseOrderList';
import CreatePurchaseOrder from './pages/procurement/CreatePurchaseOrder';
import PurchaseOrderDetail from './pages/procurement/PurchaseOrderDetail';
import CreateGRN from './pages/procurement/CreateGRN';
import GRNList from './pages/procurement/GRNList';
import GRNDetail from './pages/procurement/GRNDetail';
import VendorPortal from './pages/vendor/VendorPortal';
import VendorLogin from './pages/vendor/VendorLogin';
import StockDashboard from './pages/inventory/StockDashboard';
import InventoryItemDetail from './pages/inventory/InventoryItemDetail';
import CreateItem from './pages/inventory/CreateItem';
import MaterialIssue from './pages/inventory/MaterialIssue';
import WastageReport from './pages/inventory/WastageReport';
import StockLedger from './pages/inventory/StockLedger';
import ProductionBoard from './pages/production/ProductionBoard';
import JobDetail from './pages/production/JobDetail';
import CreateJob from './pages/production/CreateJob';
import QCDashboard from './pages/qc/QCDashboard';
import QCDetail from './pages/qc/QCDetail';
import ReworkBoard from './pages/rework/ReworkBoard';
import ReworkDetail from './pages/rework/ReworkDetail';
import ReturnManagement from './pages/returns/ReturnManagement';
import CompanySettings from './pages/settings/CompanySettings';
import RoleBasedRoute from './components/RoleBasedRoute';
import DispatchDashboard from './pages/dispatch/DispatchDashboard';
import DNDetail from './pages/dispatch/DNDetail';
import CreateDN from './pages/dispatch/CreateDN';
import VehicleManagement from './pages/dispatch/VehicleManagement';
import DriverManagement from './pages/dispatch/DriverManagement';
import InvoiceList from './pages/invoicing/InvoiceList';
import InvoiceDetail from './pages/invoicing/InvoiceDetail';
import CreateInvoice from './pages/invoicing/CreateInvoice';
import CreditNotes from './pages/invoicing/CreditNotes';
import ARAgingReport from './pages/invoicing/ARAgingReport';
import SWODashboard from './pages/subcontract/SWODashboard';
import CreateSWO from './pages/subcontract/CreateSWO';
import SWODetail from './pages/subcontract/SWODetail';
import IssueMaterial from './pages/subcontract/IssueMaterial';
import ReceiveGoods from './pages/subcontract/ReceiveGoods';
import CreateSubcontractInvoice from './pages/subcontract/CreateInvoice';
import EmployeeDirectory from './pages/hr/EmployeeDirectory';
import AttendanceDashboard from './pages/hr/AttendanceDashboard';
import LeaveManagement from './pages/hr/LeaveManagement';
import PayrollGeneration from './pages/hr/PayrollGeneration';
import PayslipViewer from './pages/hr/PayslipViewer';
import ExpiringDocuments from './pages/hr/ExpiringDocuments';
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

            {/* Settings Routes (DIRECTOR or PROJECT_MANAGER only) */}
            <Route
              path="/settings/company"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['DIRECTOR', 'PROJECT_MANAGER']}>
                    <Layout>
                      <CompanySettings />
                    </Layout>
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
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
              path="/procurement/vendors/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <VendorDetail />
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

            {/* Inventory Routes */}
            <Route
              path="/inventory/stock"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StockDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/items/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateItem />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/items/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InventoryItemDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/issue"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MaterialIssue />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/wastage"
              element={
                <ProtectedRoute>
                  <Layout>
                    <WastageReport />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/ledger"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StockLedger />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Production Routes */}
            <Route
              path="/production/board"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProductionBoard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/production/jobs/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateJob />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/production/jobs/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <JobDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* QC Routes */}
            <Route
              path="/qc"
              element={
                <ProtectedRoute>
                  <Layout>
                    <QCDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/qc/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <QCDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Rework Routes */}
            <Route
              path="/rework"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ReworkBoard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rework/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ReworkDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Returns Routes */}
            <Route
              path="/returns"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ReturnManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Dispatch Routes */}
            <Route
              path="/dispatch"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DispatchDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatch/dn/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateDN />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatch/dn/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DNDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatch/vehicles"
              element={
                <ProtectedRoute>
                  <Layout>
                    <VehicleManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatch/drivers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DriverManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Invoicing Routes */}
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InvoiceList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateInvoice />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InvoiceDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/credit-notes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreditNotes />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/ar-aging"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ARAgingReport />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Subcontract Routes */}
            <Route
              path="/subcontract/swo"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SWODashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subcontract/swo/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateSWO />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subcontract/swo/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SWODetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subcontract/swo/:id/issue-material"
              element={
                <ProtectedRoute>
                  <Layout>
                    <IssueMaterial />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subcontract/swo/:id/receive"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ReceiveGoods />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subcontract/swo/:id/invoice"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateSubcontractInvoice />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* HR Routes */}
            <Route
              path="/hr/employees"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['DIRECTOR', 'HR', 'FINANCE']}>
                    <Layout>
                      <EmployeeDirectory />
                    </Layout>
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr/attendance"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['DIRECTOR', 'HR', 'PRODUCTION']}>
                    <Layout>
                      <AttendanceDashboard />
                    </Layout>
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr/leaves"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['DIRECTOR', 'HR']}>
                    <Layout>
                      <LeaveManagement />
                    </Layout>
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr/payroll"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['DIRECTOR', 'HR', 'FINANCE']}>
                    <Layout>
                      <PayrollGeneration />
                    </Layout>
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr/payslip/:id"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['DIRECTOR', 'HR', 'FINANCE']}>
                    <Layout>
                      <PayslipViewer />
                    </Layout>
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr/alerts"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['DIRECTOR', 'HR']}>
                    <Layout>
                      <ExpiringDocuments />
                    </Layout>
                  </RoleBasedRoute>
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
