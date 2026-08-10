import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

// Role-based redirect destinations
const ROLE_REDIRECTS: Record<string, string> = {
  SUPER_ADMIN: '/dashboard',
  ADMIN: '/gig-management',
  HUB_MANAGER: '/hub-dashboard',
  FINANCE_OFFICER: '/finance',
  SUPPORT_OFFICER: '/support-tickets',
  CLIENT: '/assignments',
  GIG_WORKER: '/my-gigs',
  AMBASSADOR: '/dashboard',
  // Add future roles here
};

interface PrivateRouteProps {
  requiredPermission?: string;
  requiredRole?: string;
  allowedRoles?: string[]; // Alternative: explicitly list allowed roles
}

export default function PrivateRoute({
  requiredPermission,
  requiredRole,
  allowedRoles
}: PrivateRouteProps) {
  const { user, loading } = useAuth();
  const { checkPermission, checkRole } = usePermissions();

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-base-300">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );

  if (!user) return <Navigate replace to="/login" />;

  // Check role-based redirect (only on /dashboard route)
  // This ensures users are directed to their role-appropriate landing page
  const userRole = user.role?.name;
  if (userRole && ROLE_REDIRECTS[userRole]) {
    // Get current path from window location
    const currentPath = window.location.pathname;
    if (currentPath === '/dashboard' || currentPath === '/') {
      const redirectTo = ROLE_REDIRECTS[userRole];
      if (redirectTo !== currentPath) {
        return <Navigate replace to={redirectTo} />;
      }
    }
  }

  // Check specific role requirement
  if (requiredRole && !checkRole(requiredRole)) {
    // Redirect to role-appropriate page
    const redirectTo = userRole && ROLE_REDIRECTS[userRole]
      ? ROLE_REDIRECTS[userRole]
      : '/dashboard';
    return <Navigate replace to={redirectTo} />;
  }

  // Check allowed roles list
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => checkRole(role));
    if (!hasAllowedRole) {
      const redirectTo = userRole && ROLE_REDIRECTS[userRole]
        ? ROLE_REDIRECTS[userRole]
        : '/dashboard';
      return <Navigate replace to={redirectTo} />;
    }
  }

  // Check permission if required
  if (requiredPermission && !checkPermission(requiredPermission)) {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}
