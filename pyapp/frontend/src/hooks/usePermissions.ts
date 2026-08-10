import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for checking user permissions
 * @returns Object with permission checking functions
 */
export const usePermissions = () => {
  const { hasPermission, user } = useAuth();

  /**
   * Check if user has a specific permission
   * @param permission - Permission string to check
   * @returns boolean indicating if user has the permission
   */
  const checkPermission = (permission: string): boolean => {
    return hasPermission(permission);
  };

  /**
   * Check if user has all of the specified permissions
   * @param permissions - Array of permission strings to check
   * @returns boolean indicating if user has all permissions
   */
  const checkAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  /**
   * Check if user has any of the specified permissions
   * @param permissions - Array of permission strings to check
   * @returns boolean indicating if user has at least one permission
   */
  const checkAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  /**
   * Check if user has a specific role (based on permission naming convention)
   * Assumes roles are prefixed with 'role:' or stored as separate role field
   * @param role - Role string to check
   * @returns boolean indicating if user has the role
   */
  const checkRole = (role: string): boolean => {
    if (hasPermission(`role:${role}`)) {
      return true;
    }
    
    if (role === "GIG_WORKER" && user && (user as any).is_assignment_worker) {
      return true;
    }
    
    if (user && typeof user === 'object' && user !== null) {
      const userRole = (user as any).role;
      if (userRole && typeof userRole === 'object' && userRole.name) {
        return userRole.name === role;
      }
      const userRoles = (user as any).roles;
      if (Array.isArray(userRoles)) {
        return userRoles.includes(role);
      }
      if (typeof userRoles === 'string') {
        return userRoles === role;
      }
    }
    
    return false;
  };

  /**
   * Check if user has any of the specified roles
   * @param roles - Array of role strings to check
   * @returns boolean indicating if user has at least one role
   */
  const checkAnyRole = (roles: string[]): boolean => {
    return roles.some(role => checkRole(role));
  };

  return {
    checkPermission,
    checkAllPermissions,
    checkAnyPermission,
    checkRole,
    checkAnyRole,
    user,
    permissions: user ? (user as any).permissions || [] : []
  };
};