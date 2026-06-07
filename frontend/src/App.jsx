import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import Login          from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Employees      from './pages/Employees';
import Clients        from './pages/Clients';
import WorkEntries    from './pages/WorkEntries';
import Revenue        from './pages/Revenue';
import Reports        from './pages/Reports';
import AuditLog       from './pages/AuditLog';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        user ? <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace /> : <Login />
      } />

      {/* ── Admin routes ─────────────────────────────────────────────── */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/admin/employees" element={
        <ProtectedRoute requiredRole="admin"><Employees /></ProtectedRoute>
      } />
      <Route path="/admin/clients" element={
        <ProtectedRoute requiredRole="admin"><Clients /></ProtectedRoute>
      } />
      <Route path="/admin/work" element={
        <ProtectedRoute requiredRole="admin"><WorkEntries /></ProtectedRoute>
      } />
      <Route path="/admin/revenue" element={
        <ProtectedRoute requiredRole="admin"><Revenue /></ProtectedRoute>
      } />
      <Route path="/admin/reports" element={
        <ProtectedRoute requiredRole="admin"><Reports /></ProtectedRoute>
      } />
      <Route path="/admin/audit" element={
        <ProtectedRoute requiredRole="admin"><AuditLog /></ProtectedRoute>
      } />

      {/* ── Employee routes ───────────────────────────────────────────── */}
      <Route path="/dashboard" element={
        <ProtectedRoute requiredRole="employee"><EmployeeDashboard /></ProtectedRoute>
      } />
      <Route path="/clients" element={
        <ProtectedRoute requiredRole="employee"><Clients /></ProtectedRoute>
      } />
      <Route path="/work" element={
        <ProtectedRoute requiredRole="employee"><WorkEntries /></ProtectedRoute>
      } />

      {/* Default redirect */}
      <Route path="/" element={
        user
          ? <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />
          : <Navigate to="/login" replace />
      } />

      {/* 404 catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
