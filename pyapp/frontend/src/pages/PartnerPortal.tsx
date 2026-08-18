import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { campaignAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { usePlatforms } from "../constants/platforms";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";

const statusStyles: Record<string, string> = {
  PENDING: "badge-warning text-black",
  APPROVED: "badge-success",
  REJECTED: "badge-error",
};

function StatusBadge({ status }: { status: string }) {
  return <span className={"badge " + (statusStyles[status] || "badge-neutral")}>{status}</span>;
}

export default function PartnerPortal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { checkPermission, checkAnyRole } = usePermissions();

  const canViewCampaigns = user && checkPermission("campaigns:read");
  const canCreateCampaigns = user && checkPermission("campaigns:create");
  const canDeleteCampaigns = user && checkPermission("campaigns:delete");
  // Accept/Reject of a campaign is a manager/admin responsibility only, not the partner's.
  const canReviewCampaigns = user && checkAnyRole(["HUB_MANAGER", "SUPER_ADMIN"]);

  if (!canViewCampaigns) {
    return <div className="text-error">You don't have permission to view the partner portal</div>;
  }

  const [newCampaign, setNewCampaign] = useState({ name: "", description: "", startDate: "", endDate: "", budget: "", platformId: "" });
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", startDate: "", endDate: "", budget: "", platformId: "" });
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);

  const { data: platforms, isLoading: platformsLoading } = usePlatforms();
  const { data: campaignsData, isLoading, error } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const response = await campaignAPI.getCampaigns({});
      return response.data?.items || [];
    },
  });

  const campaigns = campaignsData || [];

  const createCampaign = useMutation({
    mutationFn: async (payload: any) => {
      await campaignAPI.createCampaign(payload);
    },
    onSuccess: () => {
      setNewCampaign({ name: "", description: "", startDate: "", endDate: "", budget: "", platformId: "" });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await campaignAPI.updateCampaign(id, data);
    },
    onSuccess: () => {
      setEditingCampaign(null);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      await campaignAPI.deleteCampaign(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await campaignAPI.reviewCampaign(id, { approvalStatus: status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  if (isLoading || platformsLoading) return null;
  if (error) return <div className="text-error">Failed to load campaigns</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCampaign.mutateAsync({ ...newCampaign, budget: parseFloat(newCampaign.budget) || 0 });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCampaign.mutateAsync({ id: editingCampaign.id, data: { ...editForm, budget: parseFloat(editForm.budget) || 0 } });
  };

  const startEdit = (c: any) => {
    setEditingCampaign(c);
    setEditForm({
      name: c.name || "",
      description: c.description || "",
      startDate: c.start_date ? new Date(c.start_date).toISOString().split("T")[0] : "",
      endDate: c.end_date ? new Date(c.end_date).toISOString().split("T")[0] : "",
      budget: String(c.budget || ""),
      platformId: c.platform_id || "",
    });
  };

  const viewCampaignDetails = (c: any) => {
    setSelectedCampaign(c);
    setShowCampaignDetails(true);
  };

  return (
    <>
      {canCreateCampaigns && (
        <details className="collapse collapse-arrow border border-base-300 mb-8">
          <summary className="collapse-title text-lg font-semibold">Create Campaign</summary>
          <div className="collapse-content">
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label"><span className="label-text">Campaign Name</span></label>
                <input type="text" value={newCampaign.name} onChange={(e) => setNewCampaign((p) => ({ ...p, name: e.target.value }))} className="input input-bordered w-full" required />
              </div>
              <div className="md:col-span-2">
                <label className="label"><span className="label-text">Description</span></label>
                <textarea value={newCampaign.description} onChange={(e) => setNewCampaign((p) => ({ ...p, description: e.target.value }))} className="textarea textarea-bordered w-full h-24" required />
              </div>
              <div>
                <label className="label"><span className="label-text">Start Date</span></label>
                <input type="date" value={newCampaign.startDate} onChange={(e) => setNewCampaign((p) => ({ ...p, startDate: e.target.value }))} className="input input-bordered w-full" required />
              </div>
              <div>
                <label className="label"><span className="label-text">End Date</span></label>
                <input type="date" value={newCampaign.endDate} onChange={(e) => setNewCampaign((p) => ({ ...p, endDate: e.target.value }))} className="input input-bordered w-full" required />
              </div>
              <div>
                <label className="label"><span className="label-text">Budget (KES)</span></label>
                <input type="number" value={newCampaign.budget} min={0} onChange={(e) => setNewCampaign((p) => ({ ...p, budget: e.target.value }))} className="input input-bordered w-full" required />
              </div>
              <div>
                <label className="label"><span className="label-text">Platform</span></label>
                <select value={newCampaign.platformId} onChange={(e) => setNewCampaign((p) => ({ ...p, platformId: e.target.value }))} className="select select-bordered w-full" required>
                  <option value="">Select Platform</option>
                  {platforms?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.display_name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="btn btn-primary" disabled={createCampaign.isPending}>
                  {createCampaign.isPending ? <span className="loading loading-spinner loading-sm" /> : <><Icon name="add" className="w-4 h-4 mr-1" /> Create Campaign</>}
                </button>
              </div>
            </form>
          </div>
        </details>
      )}

      {editingCampaign && (
        <div className="card bg-base-100 border border-primary shadow-sm mb-8">
          <div className="card-body">
            <h2 className="card-title">Edit Campaign: {editingCampaign.name}</h2>
            <form onSubmit={handleEditSubmit} className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label"><span className="label-text">Campaign Name</span></label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="input input-bordered w-full" required />
              </div>
              <div className="md:col-span-2">
                <label className="label"><span className="label-text">Description</span></label>
                <textarea value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} className="textarea textarea-bordered w-full h-24" required />
              </div>
              <div>
                <label className="label"><span className="label-text">Start Date</span></label>
                <input type="date" value={editForm.startDate} onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))} className="input input-bordered w-full" required />
              </div>
              <div>
                <label className="label"><span className="label-text">End Date</span></label>
                <input type="date" value={editForm.endDate} onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))} className="input input-bordered w-full" required />
              </div>
              <div>
                <label className="label"><span className="label-text">Budget (KES)</span></label>
                <input type="number" value={editForm.budget} min={0} onChange={(e) => setEditForm((p) => ({ ...p, budget: e.target.value }))} className="input input-bordered w-full" required />
              </div>
              <div>
                <label className="label"><span className="label-text">Platform</span></label>
                <select value={editForm.platformId} onChange={(e) => setEditForm((p) => ({ ...p, platformId: e.target.value }))} className="select select-bordered w-full" required>
                  <option value="">Select Platform</option>
                  {platforms?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.display_name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={updateCampaign.isPending}>
                  {updateCampaign.isPending ? <span className="loading loading-spinner loading-sm" /> : "Save Changes"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingCampaign(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCampaignDetails && selectedCampaign && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-4xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedCampaign.name}</h2>
              <button onClick={() => setShowCampaignDetails(false)} className="btn btn-sm btn-ghost">
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-base-content/70 mb-4">{selectedCampaign.description}</p>
            <div className="flex gap-2 mb-4">
              <span className="badge badge-outline">Platform: {selectedCampaign.platform?.display_name || "N/A"}</span>
              <StatusBadge status={selectedCampaign.approval_status || selectedCampaign.approvalStatus} />
              {selectedCampaign.is_active && <span className="badge badge-info">Active</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="stat bg-base-200 rounded-box p-4">
                <div className="stat-title text-xs">Budget</div>
                <div className="stat-value text-lg">KES {(selectedCampaign.budget || 0).toLocaleString()}</div>
              </div>
              <div className="stat bg-base-200 rounded-box p-4">
                <div className="stat-title text-xs">Tasks</div>
                <div className="stat-value text-lg">{selectedCampaign.tasks?.length || 0}</div>
              </div>
              <div className="stat bg-base-200 rounded-box p-4">
                <div className="stat-title text-xs">Leads</div>
                <div className="stat-value text-lg">{selectedCampaign.leads?.length || 0}</div>
              </div>
              <div className="stat bg-base-200 rounded-box p-4">
                <div className="stat-title text-xs">Period</div>
                <div className="stat-value text-xs">
                  {selectedCampaign.start_date ? new Date(selectedCampaign.start_date).toLocaleDateString() : "—"} → {selectedCampaign.end_date ? new Date(selectedCampaign.end_date).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>
            {selectedCampaign.tasks && selectedCampaign.tasks.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Tasks</h3>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr><th>Type</th><th>Description</th><th>Reward</th><th>Deadline</th></tr>
                    </thead>
                    <tbody>
                      {selectedCampaign.tasks.map((t: any) => (
                        <tr key={t.id}>
                          <td>{t.type?.display_name || t.type_id}</td>
                          <td className="max-w-xs truncate">{t.description}</td>
                          <td>KES {t.reward?.toLocaleString()}</td>
                          <td>{t.deadline ? new Date(t.deadline).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {selectedCampaign.leads && selectedCampaign.leads.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Leads Captured</h3>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr><th>Name</th><th>Contact</th><th>Status</th><th>Submitted By</th></tr>
                    </thead>
                    <tbody>
                      {selectedCampaign.leads.slice(0, 10).map((l: any) => (
                        <tr key={l.id}>
                          <td>{l.contact_info?.name || "N/A"}</td>
                          <td>{l.contact_info?.phone || l.contact_info?.email || "N/A"}</td>
                          <td><span className={"badge badge-sm " + (l.status?.name === "CONVERTED" ? "badge-success" : l.status?.name === "LOST" ? "badge-error" : "badge-neutral")}>{l.status?.name || l.status_id || "N/A"}</span></td>
                          <td>{l.submitted_by_ambassador?.user?.name || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedCampaign.leads.length > 10 && <p className="text-xs text-base-content/50 mt-1">Showing 10 of {selectedCampaign.leads.length} leads</p>}
              </div>
            )}
            <div className="modal-action">
              <button onClick={() => setShowCampaignDetails(false)} className="btn">Close</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCampaignDetails(false)}></div>
        </div>
      )}

      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body">
          <h2 className="card-title mb-4">Active Campaigns</h2>
          {campaigns.length === 0 ? (
            <p className="text-base-content/50 py-8 text-center">No campaigns yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    {["Name", "Platform", "Budget", "Tasks", "Leads", "Dates", "Status", "Actions"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c: any) => (
                    <tr key={c.id} className="hover">
                      <td className="font-medium cursor-pointer text-primary" onClick={() => viewCampaignDetails(c)}>{c.name}</td>
                      <td>{c.platform?.display_name || c.platform_name || "N/A"}</td>
                      <td>KES {(c.budget || 0).toLocaleString()}</td>
                      <td>{c.tasks?.length || 0}</td>
                      <td>{c.leads?.length || 0}</td>
                      <td className="text-sm text-base-content/60">
                        {c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"} – {c.end_date ? new Date(c.end_date).toLocaleDateString() : "—"}
                      </td>
                      <td><StatusBadge status={c.approval_status || c.approvalStatus} /></td>
                       <td>
                         <div className="flex gap-1 flex-wrap">
                           {(c.approval_status || c.approvalStatus) === "PENDING" && canReviewCampaigns && (
                             <>
                               <button onClick={() => updateStatus.mutateAsync({ id: c.id, status: "APPROVED" })} className="btn btn-success btn-xs" disabled={updateStatus.isPending}>Approve</button>
                               <button onClick={() => updateStatus.mutateAsync({ id: c.id, status: "REJECTED" })} className="btn btn-error btn-xs" disabled={updateStatus.isPending}>Reject</button>
                             </>
                           )}
                          {canCreateCampaigns && (
                            <button onClick={() => startEdit(c)} className="btn btn-ghost btn-xs"><Icon name="edit" className="w-3 h-3" /></button>
                          )}
                          {canDeleteCampaigns && (
                            <button onClick={() => { if (confirm(`Delete campaign "${c.name}"?`)) deleteCampaign.mutateAsync(c.id); }} className="btn btn-ghost btn-xs text-error"><Icon name="trash" className="w-3 h-3" /></button>
                          )}
                          <button onClick={() => viewCampaignDetails(c)} className="btn btn-ghost btn-xs"><Icon name="eye" className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
