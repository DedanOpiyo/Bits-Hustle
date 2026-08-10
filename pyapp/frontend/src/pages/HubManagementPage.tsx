import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "../components/Icon";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import QRCode from "react-qr-code";
import api from "../services/api";

const hubAPI = {
  getHubs: (params: any) => api.get("/hubs", { params }),
  createHub: (data: any) => api.post("/hubs", data),
  updateHub: (id: string, data: any) => api.put(`/hubs/${id}`, data),
  deleteHub: (id: string) => api.delete(`/hubs/${id}`),
};

const userAPI = {
  getUsers: (params: any) => api.get("/users", { params }),
  getRoleTypes: () => api.get("/role-types"),
};

export default function HubManagementPage() {
  const { user } = useAuth();
  const { checkPermission, checkRole } = usePermissions();
  const queryClient = useQueryClient();

  const canManage = user && checkPermission("hubs:create");

  if (!canManage) {
    return <div className="text-error">You don't have permission to manage hubs</div>;
  }

  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      const saved = localStorage.getItem(`credentials:${user.email}`);
      if (saved) {
        try {
          const creds = JSON.parse(saved);
          if (creds.email && creds.password) {
            const credentials = { email: creds.email, password: creds.password };
            const str = JSON.stringify(credentials);
            const encoder = new TextEncoder();
            const bytes = encoder.encode(str);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const encoded = btoa(binary);
            const qrString = `LOGIN://${encoded}`;
            setQrCodeData(qrString);
          }
        } catch (e) {
          console.error("Failed to parse saved credentials", e);
        }
      } else {
        setQrCodeData(null);
      }
    } else {
      setQrCodeData(null);
    }
  }, [user?.email]);

  const { data: hubsData, isLoading } = useQuery({
    queryKey: ["hubs"],
    queryFn: async () => {
      const response = await hubAPI.getHubs({});
      return response.data?.items || [];
    },
    enabled: !!user,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const response = await userAPI.getUsers({ perPage: 200 });
      return response.data?.items || [];
    },
    enabled: !!user,
  });

  const [newHub, setNewHub] = useState({ name: "", location: "", managerId: "" });
  const [editingHub, setEditingHub] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", location: "", managerId: "" });

    const hubs = hubsData || [];
    const users = usersData || [];

  const createHub = useMutation({
    mutationFn: async (data: any) => { await hubAPI.createHub(data); },
    onSuccess: () => {
      setNewHub({ name: "", location: "", managerId: "" });
      queryClient.invalidateQueries({ queryKey: ["hubs"] });
    },
  });

  const updateHub = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => { await hubAPI.updateHub(id, data); },
    onSuccess: () => {
      setEditingHub(null);
      queryClient.invalidateQueries({ queryKey: ["hubs"] });
    },
  });

  const deleteHub = useMutation({
    mutationFn: async (id: string) => { await hubAPI.deleteHub(id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hubs"] }); },
  });

if (isLoading) return null;

   return (
     <div className="card bg-base-100 border border-base-300">
       <div className="card-body relative">
{qrCodeData ? (
            <div className="absolute top-2 right-2">
              <div className="tooltip tooltip-top" data-tip="Scan to log in">
<QRCode
                    title="Scan to log in"
                    value={qrCodeData}
                    size={80}
                    level="Q"
                    className="bg-white p-1 rounded"
                  />
              </div>
            </div>
          ) : (
            <div className="absolute top-2 right-2 text-xs text-center text-base-content/50">
              Log in first to enable QR login
            </div>
          )}
         <h2 className="card-title mb-4">Hub Management</h2>

         <details className="collapse collapse-arrow border border-base-300 mb-6">
           <summary className="collapse-title text-lg font-semibold">Create Hub</summary>
           <div className="collapse-content">
             <form onSubmit={(e) => { e.preventDefault(); createHub.mutateAsync(newHub); }} className="grid md:grid-cols-3 gap-4">
               <div>
                 <label className="label"><span className="label-text">Hub Name</span></label>
                 <input type="text" value={newHub.name} onChange={(e) => setNewHub((p) => ({ ...p, name: e.target.value }))} className="input input-bordered w-full" required />
               </div>
               <div>
                 <label className="label"><span className="label-text">Location</span></label>
                 <input type="text" value={newHub.location} onChange={(e) => setNewHub((p) => ({ ...p, location: e.target.value }))} className="input input-bordered w-full" required />
               </div>
               <div>
                 <label className="label"><span className="label-text">Hub Manager</span></label>
                 <select value={newHub.managerId} onChange={(e) => setNewHub((p) => ({ ...p, managerId: e.target.value }))} className="select select-bordered w-full" required>
                   <option value="">Select Manager</option>
                   {users.filter((u: any) => u.role?.name === "HUB_MANAGER").map((u: any) => (
                     <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                   ))}
                 </select>
               </div>
               <div className="md:col-span-3">
                 <button type="submit" className="btn btn-primary" disabled={createHub.isPending}>
                   {createHub.isPending ? <span className="loading loading-spinner loading-sm" /> : <><Icon name="add" className="w-4 h-4 mr-1" /> Create Hub</>}
                 </button>
               </div>
             </form>
           </div>
         </details>

         {editingHub && (
           <div className="card bg-base-100 border border-primary shadow-sm mb-6">
             <div className="card-body">
               <h3 className="card-title">Edit Hub: {editingHub.name}</h3>
               <form onSubmit={(e) => { e.preventDefault(); updateHub.mutateAsync({ id: editingHub.id, data: editForm }); }} className="grid md:grid-cols-3 gap-4">
                 <div>
                   <label className="label"><span className="label-text">Hub Name</span></label>
                   <input type="text" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="input input-bordered w-full" required />
                 </div>
                 <div>
                   <label className="label"><span className="label-text">Location</span></label>
                   <input type="text" value={editForm.location} onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))} className="input input-bordered w-full" required />
                 </div>
                 <div>
                   <label className="label"><span className="label-text">Hub Manager</span></label>
                   <select value={editForm.managerId} onChange={(e) => setEditForm((p) => ({ ...p, managerId: e.target.value }))} className="select select-bordered w-full" required>
                     <option value="">Select Manager</option>
                     {users.filter((u: any) => u.role?.name === "HUB_MANAGER").map((u: any) => (
                       <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                     ))}
                   </select>
                 </div>
                 <div className="md:col-span-3 flex gap-2">
                   <button type="submit" className="btn btn-primary" disabled={updateHub.isPending}>Save Changes</button>
                   <button type="button" className="btn btn-ghost" onClick={() => setEditingHub(null)}>Cancel</button>
                 </div>
               </form>
             </div>
           </div>
         )}

         <div className="overflow-x-auto">
           <table className="table table-zebra">
             <thead>
               <tr>
                 <th>Hub Name</th>
                 <th>Location</th>
                 <th>Manager</th>
                 <th>Ambassadors</th>
                 <th>Created</th>
                 <th>Actions</th>
               </tr>
             </thead>
             <tbody>
               {hubs.length ? (
                 hubs.map((h: any) => (
                   <tr key={h.id}>
                     <td className="font-medium">{h.name}</td>
                     <td>{h.location}</td>
                     <td>{h.manager?.name || "N/A"}</td>
                     <td>{h.ambassadors?.length || 0}</td>
                     <td>{h.created_at ? new Date(h.created_at).toLocaleDateString() : "—"}</td>
                     <td>
                       <div className="flex gap-1">
                         <button onClick={() => { setEditingHub(h); setEditForm({ name: h.name || "", location: h.location || "", managerId: h.manager_id || "" }); }} className="btn btn-ghost btn-xs"><Icon name="edit" className="w-3 h-3" /></button>
                         <button onClick={() => { if (confirm(`Delete hub "${h.name}"?`)) deleteHub.mutateAsync(h.id); }} className="btn btn-ghost btn-xs text-error"><Icon name="trash" className="w-3 h-3" /></button>
                       </div>
                     </td>
                   </tr>
                 ))
               ) : (
                 <tr><td colSpan={6} className="text-base-content/50 py-8 text-center">No hubs yet.</td></tr>
               )}
             </tbody>
           </table>
         </div>
       </div>
     </div>
   );
}
