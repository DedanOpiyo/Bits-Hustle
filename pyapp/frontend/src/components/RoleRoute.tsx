import { Navigate, Outlet, useLocation } from 'react-router-dom';
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
};

interface RoleRouteProps {
  allowedRoles: string[];
  children?: React.ReactNode;
}

export default function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { user, loading } = useAuth();
  const { checkRole } = usePermissions();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-300">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  // Check if user has any of the allowed roles
  const hasAllowedRole = allowedRoles.some(role => checkRole(role));
  
  if (!hasAllowedRole) {
    // Redirect to user's role-appropriate page
    const userRole = user.role?.name;
    const redirectTo = userRole && ROLE_REDIRECTS[userRole] 
      ? ROLE_REDIRECTS[userRole] 
      : '/dashboard';
    
    console.warn(`[RoleRoute] Access denied to ${location.pathname}. User role: ${userRole}. Allowed roles: ${allowedRoles.join(', ')}. Redirecting to: ${redirectTo}`);
    
    return <Navigate replace to={redirectTo} />;
  }

  // If children are provided, render them; otherwise render Outlet
  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
}