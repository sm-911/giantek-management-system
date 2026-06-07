import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
// Wraps pages that require authentication and optionally a specific role.
// If not logged in → redirect to /login
// If wrong role    → redirect to their dashboard
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  // Show nothing while checking session
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }

  return children;
};

export default ProtectedRoute;
