
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/LoginPage';
import AdminLayout from '@/components/AdminLayout';
import Navigation from '@/components/Navigation';
import Index from '@/pages/Index';
import ActiveUsers from '@/pages/ActiveUsers';
import ExpiredUsers from '@/pages/ExpiredUsers';
import HistoricalData from '@/pages/HistoricalData';
import AdminDashboard from '@/pages/AdminDashboard';
import UserManagement from '@/pages/UserManagement';
import DataComparison from '@/pages/DataComparison';
import NotFound from '@/pages/NotFound';
import Dashboard from './pages/Dashboard';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useAuth();
  return currentUser ? <>{children}</> : <Navigate to="/login" replace />;
};

// Admin Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useAuth();
  return currentUser?.role === 'admin' ? <>{children}</> : <Navigate to="/" replace />;
};

// Main App Content
const AppContent = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <Routes>
      {/* Public Routes (after login) */}
      <Route path="/" element={<><Navigation /><Dashboard /></>} />
      <Route path="/active-users" element={<><Navigation /><ActiveUsers /></>} />
      <Route path="/expired-users" element={<><Navigation /><ExpiredUsers /></>} />
      <Route path="/historical" element={<><Navigation /><HistoricalData /></>} />
      <Route path="/compare" element={<><Navigation /><DataComparison /></>} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </AdminRoute>
      } />
      <Route path="/admin/users" element={
        <AdminRoute>
          <AdminLayout>
            <UserManagement />
          </AdminLayout>
        </AdminRoute>
      } />
      <Route path="/admin/compare" element={
        <AdminRoute>
          <AdminLayout>
            <DataComparison />
          </AdminLayout>
        </AdminRoute>
      } />
      
      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;