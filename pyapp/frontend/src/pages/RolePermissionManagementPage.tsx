import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "../components/Icon";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useToast } from "../contexts/ToastContext";
import { roleTypeAPI, permissionAPI, rolePermissionAPI } from "../services/api";

type Role = {
  id: string;
  name: string;
  display_name: string;
  description?: string;
};

type Permission = {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
};

type RolePermission = {
  id: string;
  role_id: string;
  permission_id: string;
};

type PermissionChange = {
  toAdd: string[];
  toRemove: RolePermission[];
};

export default function RolePermissionManagementPage() {
  const { user } = useAuth();
  const { checkRole } = usePermissions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const canManageRolePermissions = !!user && checkRole("SUPER_ADMIN");

  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());

  const unwrapList = <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && "items" in data) {
      const items = (data as { items?: T[] }).items;
      return Array.isArray(items) ? items : [];
    }
    return [];
  };

  // Fetch roles
  const {
    data: rolesData,
    isLoading: rolesLoading,
    error: rolesError
  } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await roleTypeAPI.getRoleTypes();
      return unwrapList<Role>(response.data);
    },
    enabled: !!user,
  });

  // Fetch permissions
  const {
    data: permissionsData,
    isLoading: permissionsLoading,
    error: permissionsError
  } = useQuery<Permission[]>({
    queryKey: ["permissions"],
    queryFn: async () => {
      const response = await permissionAPI.getPermissions();
      return unwrapList<Permission>(response.data);
    },
    enabled: !!user,
  });

  // Fetch all role permissions (junction)
  const {
    data: rolePermissionsData,
    isLoading: rpLoading,
    error: rpError
  } = useQuery<RolePermission[]>({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const response = await rolePermissionAPI.getRolePermissions();
      return unwrapList<RolePermission>(response.data);
    },
    enabled: !!user,
  });

  const roles = rolesData ?? [];
  const permissions = useMemo(() => permissionsData ?? [], [permissionsData]);
  const allRolePermissions = useMemo(() => rolePermissionsData ?? [], [rolePermissionsData]);

  // Load permissions when role selection changes
  useEffect(() => {
    if (!selectedRoleId) {
      setRolePermissions(new Set());
      return;
    }
    
    const assigned = allRolePermissions
      .filter((rp: RolePermission) => rp.role_id === selectedRoleId)
      .map((rp: RolePermission) => rp.permission_id);
    setRolePermissions(new Set(assigned));
    setHasChanges(false);
  }, [selectedRoleId, allRolePermissions]);

  // Filter permissions based on search text
  const filteredPermissions = useMemo(() => {
    if (!filterText.trim()) return permissions;
    
    const searchTerm = filterText.toLowerCase();
    return permissions.filter((permission: Permission) =>
      permission.name.toLowerCase().includes(searchTerm) ||
      permission.resource.toLowerCase().includes(searchTerm) ||
      permission.action.toLowerCase().includes(searchTerm) ||
      (permission.description && permission.description.toLowerCase().includes(searchTerm))
    );
  }, [permissions, filterText]);

  // Group permissions by resource
  const permissionsByResource = useMemo<Record<string, Permission[]>>(() => {
    const grouped = filteredPermissions.reduce<Record<string, Permission[]>>((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
    
    // Sort permissions within each resource by action
    Object.keys(grouped).forEach(resource => {
      grouped[resource].sort((a: Permission, b: Permission) => a.action.localeCompare(b.action));
    });
    
    return grouped;
  }, [filteredPermissions]);

  // Get resource counts
  const resourceStats = useMemo<Record<string, { total: number; assigned: number }>>(() => {
    const stats: Record<string, { total: number; assigned: number }> = {};
    Object.entries(permissionsByResource).forEach(([resource, perms]) => {
      const assigned = perms.filter(p => rolePermissions.has(p.id)).length;
      stats[resource] = { total: perms.length, assigned };
    });
    return stats;
  }, [permissionsByResource, rolePermissions]);

  // Toggle resource expansion
  const toggleResource = useCallback((resource: string) => {
    setExpandedResources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resource)) {
        newSet.delete(resource);
      } else {
        newSet.add(resource);
      }
      return newSet;
    });
  }, []);

  // Expand/collapse all resources
  const toggleAllResources = useCallback(() => {
    if (expandedResources.size === Object.keys(permissionsByResource).length) {
      setExpandedResources(new Set());
    } else {
      setExpandedResources(new Set(Object.keys(permissionsByResource)));
    }
  }, [expandedResources, permissionsByResource]);

  // Mutations for creating and deleting role permissions
  const createRPMutation = useMutation({
    mutationFn: async (data: { roleId: string; permissionId: string }) => {
      return await rolePermissionAPI.createRolePermission(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to assign permission";
      toast(msg, "error");
    },
  });

  const deleteRPMutation = useMutation({
    mutationFn: async (id: string) => {
      return await rolePermissionAPI.deleteRolePermission(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to remove permission";
      toast(msg, "error");
    },
  });

  // Handle checkbox change for a permission
  const handlePermissionToggle = useCallback((permissionId: string, checked: boolean) => {
    setRolePermissions((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(permissionId);
      } else {
        newSet.delete(permissionId);
      }
      return newSet;
    });
    setHasChanges(true);
  }, []);

  // Handle resource-level toggle (select/deselect all permissions in a resource)
  const handleResourceToggle = useCallback((resource: string, checked: boolean) => {
    const resourcePermissions = permissionsByResource[resource] || [];
    setRolePermissions((prev) => {
      const newSet = new Set(prev);
      resourcePermissions.forEach(permission => {
        if (checked) {
          newSet.add(permission.id);
        } else {
          newSet.delete(permission.id);
        }
      });
      return newSet;
    });
    setHasChanges(true);
  }, [permissionsByResource]);

  // Calculate changes to be made
  const calculateChanges = useCallback((): PermissionChange => {
    if (!selectedRoleId) return { toAdd: [], toRemove: [] };
    
    const currentRPs = allRolePermissions.filter(
      (rp: RolePermission) => rp.role_id === selectedRoleId
    );
    const currentPermissionIds = new Set(currentRPs.map((rp: RolePermission) => rp.permission_id));
    
    const toAdd = [...rolePermissions].filter((pid) => !currentPermissionIds.has(pid));
    const toRemove = currentRPs.filter((rp) => !rolePermissions.has(rp.permission_id));
    
    return { toAdd, toRemove };
  }, [selectedRoleId, allRolePermissions, rolePermissions]);

  // Save changes for the selected role
  const handleSave = async () => {
    if (!selectedRoleId) return;
    
    const changes = calculateChanges();
    
    if (changes.toAdd.length === 0 && changes.toRemove.length === 0) {
      toast("No changes to save", "info");
      return;
    }
    
    // Confirm bulk changes
    const totalChanges = changes.toAdd.length + changes.toRemove.length;
    if (totalChanges > 10) {
      const confirmed = window.confirm(
        `This will make ${totalChanges} changes (${changes.toAdd.length} additions, ${changes.toRemove.length} removals). Continue?`
      );
      if (!confirmed) return;
    }
    
    setIsLoading(true);
    
    try {
      // Create promises for all operations
      const addPromises = changes.toAdd.map((permissionId) =>
        createRPMutation.mutateAsync({ roleId: selectedRoleId, permissionId })
      );
      
      const removePromises = changes.toRemove.map((rp) =>
        deleteRPMutation.mutateAsync(rp.id)
      );
      
      // Execute all operations
      const results = await Promise.allSettled([...addPromises, ...removePromises]);
      
      const failures = results.filter(r => r.status === 'rejected');
      
      if (failures.length > 0) {
        toast(`Failed to update ${failures.length} of ${totalChanges} permissions`, "error");
      } else {
        toast(`Successfully updated ${totalChanges} permissions`, "success");
      }
      
      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      setHasChanges(false);
      
       // Clear selection to force reload
       const originalRoleId = selectedRoleId;
       setSelectedRoleId("");
       setTimeout(() => {
         setSelectedRoleId(originalRoleId);
       }, 100);
      
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to update role permissions";
      toast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel changes
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      const confirmed = window.confirm("Discard all unsaved changes?");
      if (!confirmed) return;
    }
    
    // Reload original permissions
    if (selectedRoleId) {
      const assigned = allRolePermissions
        .filter((rp: RolePermission) => rp.role_id === selectedRoleId)
        .map((rp: RolePermission) => rp.permission_id);
      setRolePermissions(new Set(assigned));
    }
    setHasChanges(false);
    setFilterText("");
  }, [hasChanges, selectedRoleId, allRolePermissions]);

  // Select/deselect all permissions
  const handleSelectAll = useCallback(() => {
    const allPermissionIds = new Set(permissions.map(p => p.id));
    setRolePermissions(allPermissionIds);
    setHasChanges(true);
  }, [permissions]);

  const handleDeselectAll = useCallback(() => {
    setRolePermissions(new Set());
    setHasChanges(true);
  }, []);

  if (!user) {
    return null;
  }

  // Only Super Admin can manage role permissions
  if (!canManageRolePermissions) {
    return (
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <div className="alert alert-error">
            <Icon name="error" className="w-5 h-5" />
            <span>Only Super Admins can manage role permissions</span>
          </div>
        </div>
      </div>
    );
  }

  // Loading and error states
  if (rolesLoading || permissionsLoading || rpLoading) {
    return (
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <div className="flex flex-col items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary" />
            <p className="mt-4 text-base-content/70">Loading role permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (rolesError || permissionsError || rpError) {
    return (
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <div className="alert alert-error">
            <Icon name="alert-circle" className="w-5 h-5" />
            <span>Failed to load data. Please try again later.</span>
          </div>
        </div>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <div className="alert alert-warning">
            <Icon name="alert-triangle" className="w-5 h-5" />
            <span>No roles found. Please create roles first.</span>
          </div>
        </div>
      </div>
    );
  }

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const changes = calculateChanges();
  const hasPendingChanges = hasChanges && (changes.toAdd.length > 0 || changes.toRemove.length > 0);

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Role Permission Management</h2>
          <div className="badge badge-info gap-1">
            <Icon name="shield" className="w-3 h-3" />
            Super Admin Only
          </div>
        </div>

        {/* Role Selection */}
        <div className="mb-6">
          <label className="label block text-lg font-medium mb-2">
            Select Role
          </label>
          <select
            value={selectedRoleId}
            onChange={(e) => {
              setSelectedRoleId(e.target.value);
              setFilterText("");
              setExpandedResources(new Set());
            }}
            className="select select-bordered w-full max-w-xs"
            disabled={isLoading}
            aria-label="Select role to manage permissions"
          >
            <option value="">Select a role</option>
            {roles.map((role: Role) => (
              <option key={role.id} value={role.id}>
                {role.display_name} {role.name !== role.display_name && `(${role.name})`}
              </option>
            ))}
          </select>
          {selectedRole && selectedRole.description && (
            <p className="text-sm text-base-content/60 mt-1">
              {selectedRole.description}
            </p>
          )}
        </div>

        {selectedRoleId && (
          <>
            {/* Search and Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="text"
                  placeholder="Filter permissions by name, resource, or action..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="input input-bordered w-full pl-9"
                  aria-label="Filter permissions"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={toggleAllResources}
                  className="btn btn-sm btn-ghost"
                  disabled={isLoading}
                >
                  {expandedResources.size === Object.keys(permissionsByResource).length 
                    ? "Collapse All" 
                    : "Expand All"}
                </button>
                
                <button
                  onClick={handleSelectAll}
                  className="btn btn-sm btn-outline"
                  disabled={isLoading}
                >
                  <Icon name="check-square" className="w-3 h-3 mr-1" />
                  Select All
                </button>
                
                <button
                  onClick={handleDeselectAll}
                  className="btn btn-sm btn-outline"
                  disabled={isLoading}
                >
                  <Icon name="square" className="w-3 h-3 mr-1" />
                  Deselect All
                </button>
              </div>
            </div>

            {/* Permissions List Grouped by Resource */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto p-1">
              {Object.entries(permissionsByResource).length === 0 ? (
                <div className="text-center py-8 text-base-content/50">
                  <Icon name="filter" className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No permissions match your filter</p>
                </div>
              ) : (
                Object.entries(permissionsByResource).map(([resource, resourcePermissions]) => {
                  const stats = resourceStats[resource];
                  const isExpanded = expandedResources.has(resource);
                  const allChecked = resourcePermissions.every(p => rolePermissions.has(p.id));
                  const someChecked = resourcePermissions.some(p => rolePermissions.has(p.id));
                  
                  return (
                    <div key={resource} className="border border-base-200 rounded-lg overflow-hidden">
                      {/* Resource Header */}
                      <div 
                        className="flex items-center justify-between p-3 bg-base-200/50 cursor-pointer hover:bg-base-200 transition-colors"
                        onClick={() => toggleResource(resource)}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon 
                            name={isExpanded ? "chevron-down" : "chevron-right"} 
                            className="w-4 h-4 text-base-content/60"
                          />
                          <div>
                            <h3 className="font-semibold capitalize">{resource}</h3>
                            <p className="text-xs text-base-content/50">
                              {stats.assigned} of {stats.total} permissions assigned
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="w-24 bg-base-300 rounded-full h-1.5">
                            <div 
                              className="bg-primary h-1.5 rounded-full transition-all"
                              style={{ width: `${(stats.assigned / stats.total) * 100}%` }}
                            />
                          </div>
                          
                          <label 
                            className="flex items-center space-x-2 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={allChecked}
                              ref={input => {
                                if (input) input.indeterminate = !allChecked && someChecked;
                              }}
                              onChange={(e) => handleResourceToggle(resource, e.target.checked)}
                              className="checkbox checkbox-sm checkbox-primary"
                              disabled={isLoading}
                              aria-label={`Toggle all ${resource} permissions`}
                            />
                            <span className="text-sm">Resource</span>
                          </label>
                        </div>
                      </div>
                      
                      {/* Permissions List */}
                      {isExpanded && (
                        <div className="divide-y divide-base-200">
                          {resourcePermissions.map((permission: Permission) => {
                            const isAssigned = rolePermissions.has(permission.id);
                            return (
                              <label
                                key={permission.id}
                                className="flex items-start space-x-3 p-3 hover:bg-base-200/30 transition-colors cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  onChange={(e) => handlePermissionToggle(permission.id, e.target.checked)}
                                  className="checkbox checkbox-primary mt-0.5"
                                  disabled={isLoading}
                                  aria-label={`Toggle ${permission.name} permission`}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium">{permission.name}</div>
                                    <div className="badge badge-sm badge-ghost">
                                      {permission.action}
                                    </div>
                                  </div>
                                  <div className="text-sm text-base-content/60 mt-0.5">
                                    Resource: {permission.resource}
                                  </div>
                                  {permission.description && (
                                    <div className="text-xs text-base-content/50 mt-1">
                                      {permission.description}
                                    </div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Pending Changes Summary */}
            {hasPendingChanges && (
              <div className="mt-4 p-3 bg-info/10 rounded-lg border border-info/20">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <span className="font-semibold">Pending Changes:</span>
                    {changes.toAdd.length > 0 && (
                      <span className="text-success">
                        +{changes.toAdd.length} to add
                      </span>
                    )}
                    {changes.toRemove.length > 0 && (
                      <span className="text-error">
                        -{changes.toRemove.length} to remove
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setHasChanges(false);
                      const assigned = allRolePermissions
                        .filter((rp: RolePermission) => rp.role_id === selectedRoleId)
                        .map((rp: RolePermission) => rp.permission_id);
                      setRolePermissions(new Set(assigned));
                    }}
                    className="btn btn-xs btn-ghost"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={handleCancel}
                className="btn btn-ghost"
                disabled={isLoading || !hasChanges}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary"
                disabled={isLoading || !hasPendingChanges}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    <span className="ml-2">Saving...</span>
                  </>
                ) : (
                  <>
                    <Icon name="save" className="w-4 h-4 mr-1" />
                    Save Changes ({changes.toAdd.length + changes.toRemove.length})
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
