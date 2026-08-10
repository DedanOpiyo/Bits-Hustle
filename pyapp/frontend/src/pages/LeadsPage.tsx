import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadAPI, platformAPI, campaignAPI, leadStatusTypeAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";

export default function LeadsPage() {
  const { user } = useAuth();
  const { checkPermission, checkRole } = usePermissions();
  const queryClient = useQueryClient();

  const canViewLeads = user && checkPermission("leads:read");
  const canCreateLeads = user && checkPermission("leads:create");
  const canUpdateLeadStatus = !!user && checkRole("HUB_MANAGER");

  const { data: platforms } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const response = await platformAPI.getPlatforms();
      return Array.isArray(response.data) ? response.data : (response.data?.items || []);
    },
    enabled: !!user,
  });

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const response = await campaignAPI.getCampaigns({});
      return response.data?.items || [];
    },
    enabled: !!user,
  });

  const { data: leadStatusTypes } = useQuery({
    queryKey: ["lead-status-types"],
    queryFn: async () => {
      const response = await leadStatusTypeAPI.getLeadStatusTypes();
      return Array.isArray(response.data) ? response.data : response.data || [];
    },
    enabled: !!user,
  });

  const { data: leads, isLoading, error } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const response = await leadAPI.getLeads({});
      return response.data?.items || [];
    },
    enabled: !!user,
  });

  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    platform: "",
    campaign: "",
    status: "",
  });

  const [formError, setFormError] = useState<string | null>(null);

  const createLead = useMutation({
    mutationFn: async (data: any) => {
      const payload: any = {
        contactInfo: {
          name: data.name,
          email: data.email,
          phone: data.phone,
        },
        campaignId: data.campaign,
        platformId: data.platform,
      };
      if (data.status) {
        payload.statusId = data.status;
      }
      await leadAPI.createLead(payload);
    },
    onSuccess: () => {
      setNewLead({ name: "", email: "", phone: "", platform: "", campaign: "", status: "" });
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "An error occurred";
      if (message.includes("Duplicate lead detected")) {
        setFormError("A lead with this phone or email already exists in this campaign");
      } else {
        setFormError(message);
      }
    },
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ leadId, statusId }: { leadId: string; statusId: string }) => {
      await leadAPI.updateLeadStatus(leadId, statusId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to update lead status";
      setFormError(message);
    },
  });

  if (!canViewLeads) {
    return <div className="text-error">You don't have permission to view leads</div>;
  }

  if (isLoading) return null;
  if (error) return <div className="text-error">Failed to load leads</div>;

  const getStatusBadge = (status: string) => {
    const cls = status === "converted" ? "badge-success" : status === "lost" ? "badge-error" : "badge-neutral";
    return <span className={"badge " + cls}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">Your Leads</h2>

        {canCreateLeads && (
          <div className="card bg-base-100 border border-base-300 shadow-sm mb-6">
            <div className="card-body">
              <h3 className="card-title">Add New Lead</h3>
              {formError && (
                <div className="alert alert-error mb-4">
                  <span>{formError}</span>
                </div>
              )}
              <form onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                createLead.mutateAsync(newLead);
              }} className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label"><span className="label-text">Full Name</span></label>
                  <input type="text" value={newLead.name} onChange={(e) => setNewLead((p) => ({ ...p, name: e.target.value }))} className="input input-bordered w-full" required />
                </div>
                <div>
                  <label className="label"><span className="label-text">Email</span></label>
                  <input type="email" value={newLead.email} onChange={(e) => setNewLead((p) => ({ ...p, email: e.target.value }))} className="input input-bordered w-full" />
                </div>
                <div>
                  <label className="label"><span className="label-text">Phone</span></label>
                  <input type="tel" value={newLead.phone} onChange={(e) => setNewLead((p) => ({ ...p, phone: e.target.value }))} className="input input-bordered w-full" />
                </div>
                <div>
                  <label className="label"><span className="label-text">Platform</span></label>
                  <select value={newLead.platform} onChange={(e) => setNewLead((p) => ({ ...p, platform: e.target.value }))} className="select select-bordered w-full" required>
                    <option value="">Select Platform</option>
                    {platforms && platforms.map((p: any) => (<option key={p.id} value={p.id}>{p.display_name || p.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="label"><span className="label-text">Campaign</span></label>
                  <select value={newLead.campaign} onChange={(e) => setNewLead((p) => ({ ...p, campaign: e.target.value }))} className="select select-bordered w-full" required>
                    <option value="">Select Campaign</option>
                    {campaigns && campaigns.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="label"><span className="label-text">Status</span></label>
                  <select value={newLead.status} onChange={(e) => setNewLead((p) => ({ ...p, status: e.target.value }))} className="select select-bordered w-full">
                    <option value="">Select Status</option>
                    {leadStatusTypes && leadStatusTypes.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.display_name || s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="btn btn-primary" disabled={createLead.isPending}>
                    {createLead.isPending ? <span className="loading loading-spinner loading-sm" /> : <><Icon name="add" className="w-4 h-4 mr-1" /> Add Lead</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Owned By</th>
                {canUpdateLeadStatus && <th>Decision</th>}
              </tr>
            </thead>
            <tbody>
              {leads?.length ? (
                leads.map((l: any) => (
                  <tr key={l.id}>
                    <td>{l.name || l.contact_info?.name || "-"}</td>
                    <td>{l.email || l.contact_info?.email || l.phone || l.contact_info?.phone || "-"}</td>
                    <td>{l.platform?.display_name || l.platform?.name || "-"}</td>
                    <td>{l.status?.name ? getStatusBadge(l.status.name) : getStatusBadge(l.status || "new")}</td>
                    <td>{l.submitted_by_ambassador?.user?.name || l.ambassador?.user?.name || "�"}</td>
                    {canUpdateLeadStatus && (
                      <td>
                        <select
                          value={l.status_id || l.status?.id || ""}
                          onChange={(e) => {
                            if (!e.target.value) return;
                            setFormError(null);
                            updateLeadStatus.mutate({ leadId: l.id, statusId: e.target.value });
                          }}
                          className="select select-bordered select-sm w-full max-w-xs"
                          disabled={updateLeadStatus.isPending}
                        >
                          <option value="">Select decision</option>
                          {leadStatusTypes && leadStatusTypes.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.display_name || s.name}</option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canUpdateLeadStatus ? 6 : 5} className="text-center text-base-content/50 py-8">No leads yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
