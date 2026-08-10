import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "../components/Icon";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { cn } from "../utils";
import api, { assignmentAPI } from "../services/api";

const userAPI = {
  getUsers: (params: any) => api.get("/users", { params }),
  createUser: (data: any) => api.post("/users", data),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  activateUser: (id: string) => api.put(`/users/${id}/activate`),
  deactivateUser: (id: string) => api.put(`/users/${id}/deactivate`),
  getRoleTypes: () => api.get("/role-types"),
};

export default function UserManagementPage() {
  const { user } = useAuth();
  const { checkRole } = usePermissions();
  const queryClient = useQueryClient();

  const isAdmin = user && checkRole("SUPER_ADMIN");

  if (!isAdmin) {
    return <div className="text-error">Only Super Admins can manage users</div>;
  }

  const [search, setSearch] = useState("");
  const [newUser, setNewUser] = useState({ name: "", email: "", roleId: "", phoneNumber: "" });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", phoneNumber: "", roleId: "", email: "" });
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      const response = await userAPI.getUsers({ perPage: 200, search });
      return response.data?.items || [];
    },
    enabled: !!user,
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["role-types"],
    queryFn: async () => {
      const response = await userAPI.getRoleTypes();
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data && typeof response.data === 'object' && 'items' in response.data) {
        const items = response.data.items;
        return Array.isArray(items) ? items : [];
      }
      return [];
    },
    enabled: !!user,
  });

  const { data: workersData } = useQuery({
    queryKey: ["assignment-workers"],
    queryFn: async () => {
      const response = await assignmentAPI.getWorkers();
      return response.data || [];
    },
    enabled: !!user,
  });

  const users = usersData || [];
  const roles = Array.isArray(rolesData) ? rolesData : [];
  const workers = Array.isArray(workersData) ? workersData : [];
  const workerIds = new Set(workers.map((w: any) => w.id));

  const createUser = useMutation({
    mutationFn: async (data: any) => { await userAPI.createUser(data); },
    onSuccess: () => {
      setCreateError(null);
      setNewUser({ name: "", email: "", roleId: "", phoneNumber: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || "Failed to create user";
      setCreateError(msg);
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => { await userAPI.updateUser(id, data); },
    onSuccess: () => {
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => { await userAPI.deleteUser(id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  const activateUser = useMutation({
    mutationFn: async (id: string) => { await userAPI.activateUser(id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  const deactivateUser = useMutation({
    mutationFn: async (id: string) => { await userAPI.deactivateUser(id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  const createWorker = useMutation({
    mutationFn: async (userId: string) => assignmentAPI.createWorker({ userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment-workers"] });
    },
  });

  const removeWorker = useMutation({
    mutationFn: async (workerId: string) => assignmentAPI.deleteWorker(workerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment-workers"] });
    },
  });

  if (isLoading) return null;

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">User Management</h2>

        <details className="collapse collapse-arrow border border-base-300 mb-6">
          <summary className="collapse-title text-lg font-semibold">Create User</summary>
          <div className="collapse-content">
            {createError && (
              <div className="alert alert-error mb-4">
                <span>{createError}</span>
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); setCreateError(null); createUser.mutateAsync(newUser); }} className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label"><span className="label-text">Full Name</span></label>
                <input type="text" value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} className="input input-bordered w-full" required />
              </div>
              <div>
                <label className="label"><span className="label-text">Email</span></label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} className="input input-bordered w-full" required />
              </div>
               <div>
                 <label className="label"><span className="label-text">Role</span></label>
                 <select value={newUser.roleId} onChange={(e) => setNewUser((p) => ({ ...p, roleId: e.target.value }))} className="select select-bordered w-full" required disabled={rolesLoading}>
                   <option value="">Select Role</option>
                   {rolesLoading ? (
                     <option>Loading roles...</option>
                   ) : (
                     roles.map((r: any) => (
                       <option key={r.id} value={r.id}>{r.display_name}</option>
                     ))
                   )}
                 </select>
               </div>
              <div>
                <label className="label"><span className="label-text">Phone (optional)</span></label>
                <input type="tel" value={newUser.phoneNumber} onChange={(e) => setNewUser((p) => ({ ...p, phoneNumber: e.target.value }))} className="input input-bordered w-full" />
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="btn btn-primary" disabled={createUser.isPending}>
                  {createUser.isPending ? <span className="loading loading-spinner loading-sm" /> : <><Icon name="add" className="w-4 h-4 mr-1" /> Create User</>}
                </button>
              </div>
            </form>
          </div>
        </details>

        {editingUser && (
          <div className="card bg-base-100 border border-primary shadow-sm mb-6">
            <div className="card-body">
<h3 className="card-title">Edit User: {editingUser.name}</h3>
               <form onSubmit={(e) => { e.preventDefault(); updateUser.mutateAsync({ id: editingUser.id, data: editForm }); }} className="grid md:grid-cols-3 gap-4">
                 <div>
                   <label className="label"><span className="label-text">Full Name</span></label>
                   <input type="text" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="input input-bordered w-full" required />
                 </div>
                 <div>
                   <label className="label"><span className="label-text">Email</span></label>
                   <input type="email" value={editForm.email || ''} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} className="input input-bordered w-full" required />
                 </div>
                 <div>
                   <label className="label"><span className="label-text">Phone</span></label>
                   <input type="tel" value={editForm.phoneNumber} onChange={(e) => setEditForm((p) => ({ ...p, phoneNumber: e.target.value }))} className="input input-bordered w-full" />
                 </div>
                <div>
                  <label className="label"><span className="label-text">Role</span></label>
                  <select value={editForm.roleId} onChange={(e) => setEditForm((p) => ({ ...p, roleId: e.target.value }))} className="select select-bordered w-full" required disabled={rolesLoading}>
                    <option value="">Select Role</option>
                    {rolesLoading ? (
                      <option>Loading roles...</option>
                    ) : (
                      roles.map((r: any) => (
                        <option key={r.id} value={r.id}>{r.display_name}</option>
                      ))
                    )}
                  </select>
                </div>
                 <div className="md:col-span-3 flex gap-2">
                   <button type="submit" className="btn btn-primary" disabled={updateUser.isPending}>Save Changes</button>
                   <button type="button" className="btn btn-ghost" onClick={() => setEditingUser(null)}>Cancel</button>
                 </div>
               </form>
            </div>
          </div>
        )}

        <div className="mb-4">
          <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="input input-bordered w-full max-w-md" />
        </div>

        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Gig Worker</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? (
                users.map((u: any) => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className="badge badge-ghost badge-sm">{u.role?.display_name || u.role?.name || "N/A"}</span></td>
                    <td>{u.phone_number || "—"}</td>
                    <td>
                      <span className={cn("badge", u.is_active || u.is_user_active ? "badge-success" : "badge-error")}>
                        {u.is_active || u.is_user_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {workerIds.has(u.id) ? (
                        <span className="badge badge-success badge-sm">Yes</span>
                      ) : (
                        <span className="badge badge-ghost badge-sm">No</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => { setEditingUser(u); setEditForm({ name: u.name || "", phoneNumber: u.phone_number || "", roleId: u.role_id || "", email: u.email || "" }); }} className="btn btn-ghost btn-xs"><Icon name="edit" className="w-3 h-3" /></button>
                        {u.is_active || u.is_user_active ? (
                          <button onClick={() => deactivateUser.mutateAsync(u.id)} className="btn btn-warning btn-xs" disabled={deactivateUser.isPending}>Deactivate</button>
                        ) : (
                          <button onClick={() => activateUser.mutateAsync(u.id)} className="btn btn-success btn-xs" disabled={activateUser.isPending}>Activate</button>
                        )}
                        {workerIds.has(u.id) ? (
                          <button onClick={() => { if (confirm(`Remove gig worker access for "${u.name}"?`)) removeWorker.mutateAsync(u.id); }} className="btn btn-error btn-xs">Remove Worker</button>
                        ) : (
                          <button onClick={() => createWorker.mutateAsync(u.id)} className="btn btn-primary btn-xs">Make Worker</button>
                        )}
                        <button onClick={() => { if (confirm(`Delete user "${u.name}"?`)) deleteUser.mutateAsync(u.id); }} className="btn btn-ghost btn-xs text-error"><Icon name="trash" className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="text-base-content/50 py-8 text-center">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
