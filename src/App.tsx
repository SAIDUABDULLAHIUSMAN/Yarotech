import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { SalesPage } from './pages/SalesPage';
import { StaffSalesPage } from './pages/StaffSalesPage';
import { ReportsPage } from './components/Reports/ReportsPage';
import { SettingsPage } from './components/Settings/SettingsPage';
import { ProductManagement } from './components/Admin/ProductManagement';
import { TransactionMonitoring } from './components/Admin/TransactionMonitoring';
import { AuditLog } from './components/Admin/AuditLog';
import { MyTransactions } from './components/Staff/MyTransactions';
import { SalesHistory } from './components/Sales/SalesHistory';
import { AdminSalesHistory } from './components/Admin/AdminSalesHistory';
import { useUserRole } from './hooks/useUserRole';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const isAdmin = role === 'admin';

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Dashboard';
      case 'sales':
        return 'Sales';
      case 'sales-history':
        return 'Sales History';
      case 'my-transactions':
        return 'My Transactions';
      case 'products':
        return 'Product Management';
      case 'transactions':
        return 'All Transactions';
      case 'audit':
        return 'Audit Log';
      case 'reports':
        return 'Reports';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  const renderPage = () => {
    if (isAdmin) {
      switch (currentPage) {
        case 'dashboard':
          return <DashboardPage />;
        case 'products':
          return <ProductManagement />;
        case 'sales':
          return <SalesPage />;
        case 'sales-history':
          return <AdminSalesHistory />;
        case 'transactions':
          return <TransactionMonitoring />;
        case 'audit':
          return <AuditLog />;
        case 'reports':
          return <ReportsPage />;
        case 'settings':
          return <SettingsPage />;
        default:
          return <DashboardPage />;
      }
    } else {
      switch (currentPage) {
        case 'dashboard':
          return <StaffSalesPage />;
        case 'my-transactions':
          return <SalesHistory />;
        default:
          return <StaffSalesPage />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isAdmin={isAdmin}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={getPageTitle()}
        />

        <main className="flex-1 p-6 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
