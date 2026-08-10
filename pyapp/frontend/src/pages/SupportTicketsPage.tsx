import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import api from "../services/api";
import { Icon } from "../components/Icon";
import { cn } from "../utils";

const ticketAPI = {
  getTickets: (params?: any) => api.get("/support-tickets", { params }),
  getMyTickets: () => api.get("/my-support-tickets"),
  createTicket: (data: any) => api.post("/support-tickets", data),
  updateTicket: (id: string, data: any) => api.put(`/support-tickets/${id}`, data),
  escalateTicket: (id: string, data: any) => api.post(`/support-tickets/${id}/escalate`, data),
};

const CATEGORIES = [
  "Account Issues",
  "Task Approval Disputes",
  "Missing Earnings",
  "Payout Problems",
  "Technical Issues",
  "General Inquiry",
];

const PRIORITY_CONFIG: Record<string, { badge: string; color: string }> = {
  LOW: { badge: "badge-neutral", color: "text-base-content/50" },
  MEDIUM: { badge: "badge-info", color: "text-info" },
  HIGH: { badge: "badge-warning", color: "text-warning" },
  URGENT: { badge: "badge-error", color: "text-error" },
};

const STATUS_CONFIG: Record<string, { badge: string; label: string }> = {
  OPEN: { badge: "badge-info", label: "Open" },
  IN_PROGRESS: { badge: "badge-warning", label: "In Progress" },
  RESOLVED: { badge: "badge-success", label: "Resolved" },
  CLOSED: { badge: "badge-neutral", label: "Closed" },
};

export default function SupportTicketsPage() {
  const { user } = useAuth();
  const { checkRole, checkPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("ALL");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyForm, setReplyForm] = useState({ status: "", priority: "", resolution: "" });
  const [createForm, setCreateForm] = useState({ subject: "", description: "", category: "General Inquiry", priority: "MEDIUM" });
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isSupportOfficer = checkRole("SUPPORT_OFFICER");
  const canManageTickets = checkPermission("support_tickets:manage") || checkRole("SUPPORT_OFFICER");
  const isAmbassador = checkPermission("ambassador:access");

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ["support-tickets", filter],
    queryFn: async () => {
      if (isAmbassador && !canManageTickets) {
        const resp = await ticketAPI.getMyTickets();
        return resp.data;
      }
      const params = filter !== "ALL" ? { status: filter } : {};
      const resp = await ticketAPI.getTickets(params);
      return resp.data;
    },
    enabled: !!user,
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await ticketAPI.updateTicket(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setSelectedTicket(null);
      setReplyForm({ status: "", priority: "", resolution: "" });
    },
  });

  const escalateTicket = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      return await ticketAPI.escalateTicket(id, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });

  const createTicket = useMutation({
    mutationFn: async (data: any) => {
      return await ticketAPI.createTicket(data);
    },
    onSuccess: () => {
      setShowCreateModal(false);
      setCreateForm({ subject: "", description: "", category: "General Inquiry", priority: "MEDIUM" });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });

  const tickets = ticketsData?.items || ticketsData || [];
  const filteredTickets = filter === "ALL" ? tickets : tickets.filter((t: any) => t.status === filter);

  const openCount = tickets.filter((t: any) => t.status === "OPEN").length;
  const inProgressCount = tickets.filter((t: any) => t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter((t: any) => t.status === "RESOLVED").length;

  if (isLoading) {
    return <div className="text-base-content/50 py-8 text-center">Loading tickets...</div>;
  }

  const handleReply = (ticket: any) => {
    if (!replyForm.status && !replyForm.resolution) return;
    updateTicket.mutateAsync({
      id: ticket.id,
      data: {
        ...(replyForm.status && { status: replyForm.status }),
        ...(replyForm.priority && { priority: replyForm.priority }),
        ...(replyForm.resolution && { resolution: replyForm.resolution }),
      },
    });
  };

  const handleEscalate = (ticket: any) => {
    if (confirm(`Escalate ticket ${ticket.ticket_number} to the next level?`)) {
      escalateTicket.mutateAsync({ id: ticket.id });
    }
  };

  if (selectedTicket) {
    const tConfig = STATUS_CONFIG[selectedTicket.status] || { badge: "badge-neutral", label: selectedTicket.status };
    const pConfig = PRIORITY_CONFIG[selectedTicket.priority] || PRIORITY_CONFIG.MEDIUM;

    return (
      <div className="animate-fadeIn space-y-6">
        <div className="flex items-center gap-4">
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTicket(null)}>
            <Icon name="arrowLeft" className="w-4 h-4 mr-1" /> Back to Tickets
          </button>
          <div>
            <h1 className="text-2xl font-bold">{selectedTicket.ticket_number}</h1>
            <p className="text-base-content/60">{selectedTicket.subject}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {(selectedTicket.ambassador?.user?.name || "A").charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{selectedTicket.ambassador?.user?.name || "Unknown"}</h3>
                    <p className="text-sm text-base-content/50">
                      {selectedTicket.ambassador?.user?.email} &bull; Hub: {selectedTicket.ambassador?.hub?.name || "N/A"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className={cn("badge", tConfig.badge)}>{tConfig.label}</span>
                    <span className={cn("badge", pConfig.badge)}>{selectedTicket.priority}</span>
                  </div>
                </div>
                <div className="divider my-4" />
                <div>
                  <h4 className="font-medium mb-2">Category: {selectedTicket.category}</h4>
                  <p className="whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>
                <p className="text-xs text-base-content/40 mt-4">
                  Created: {new Date(selectedTicket.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {canManageTickets && (
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h2 className="card-title mb-4">Update Ticket</h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="label"><span className="label-text">Status</span></label>
                      <select value={replyForm.status} onChange={(e) => setReplyForm(p => ({ ...p, status: e.target.value }))} className="select select-bordered w-full">
                        <option value="">Keep current</option>
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>
                    <div>
                      <label className="label"><span className="label-text">Priority</span></label>
                      <select value={replyForm.priority} onChange={(e) => setReplyForm(p => ({ ...p, priority: e.target.value }))} className="select select-bordered w-full">
                        <option value="">Keep current</option>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="label"><span className="label-text">Resolution / Reply</span></label>
                    <textarea value={replyForm.resolution} onChange={(e) => setReplyForm(p => ({ ...p, resolution: e.target.value }))} className="textarea textarea-bordered w-full" rows={4} placeholder="Enter your response or resolution details..." />
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-primary" disabled={updateTicket.isPending || (!replyForm.status && !replyForm.resolution)} onClick={() => handleReply(selectedTicket)}>
                      {updateTicket.isPending ? <span className="loading loading-spinner loading-sm" /> : "Submit Update"}
                    </button>
                    <button className="btn btn-warning" onClick={() => handleEscalate(selectedTicket)}>
                      <Icon name="alert" className="w-4 h-4 mr-1" /> Escalate
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <h2 className="card-title mb-4">Ticket Info</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Ticket Number</span>
                    <span className="font-mono">{selectedTicket.ticket_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Category</span>
                    <span>{selectedTicket.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Status</span>
                    <span className={cn("badge", tConfig.badge, "badge-sm")}>{tConfig.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Priority</span>
                    <span className={cn("badge", pConfig.badge, "badge-sm")}>{selectedTicket.priority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Assigned To</span>
                    <span>{selectedTicket.assigned_to?.name || "Unassigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Created</span>
                    <span>{new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Updated</span>
                    <span>{new Date(selectedTicket.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedTicket.resolution && (
              <div className="card bg-base-100 border border-success/30">
                <div className="card-body">
                  <h2 className="card-title text-success mb-2">Resolution</h2>
                  <p className="whitespace-pre-wrap text-sm">{selectedTicket.resolution}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <p className="text-base-content/60 mt-1">
            {isSupportOfficer ? "Manage and respond to support inquiries" : "View and track your support tickets"}
          </p>
        </div>
        <div className="flex gap-2">
          {isAmbassador && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
              <Icon name="add" className="w-4 h-4 mr-1" /> New Ticket
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-info">
            <Icon name="inbox" className="w-8 h-8" />
          </div>
          <div className="stat-title text-xs">All Tickets</div>
          <div className="stat-value text-2xl font-bold">{tickets.length}</div>
        </div>
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-warning">
            <Icon name="clock" className="w-8 h-8" />
          </div>
          <div className="stat-title text-xs">Open</div>
          <div className="stat-value text-2xl font-bold text-warning">{openCount}</div>
        </div>
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-primary">
            <Icon name="loader" className="w-8 h-8" />
          </div>
          <div className="stat-title text-xs">In Progress</div>
          <div className="stat-value text-2xl font-bold text-primary">{inProgressCount}</div>
        </div>
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-success">
            <Icon name="checkCircle" className="w-8 h-8" />
          </div>
          <div className="stat-title text-xs">Resolved</div>
          <div className="stat-value text-2xl font-bold text-success">{resolvedCount}</div>
        </div>
      </div>

      {canManageTickets && (
        <div className="flex flex-wrap gap-2">
          {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
            <button key={s} className={cn("btn btn-xs", filter === s && "btn-active")} onClick={() => setFilter(s)}>
              {s === "ALL" ? "All" : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      )}

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          {filteredTickets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    {canManageTickets && <th>Ambassador</th>}
                    <th>Category</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t: any) => {
                    const tConfig = STATUS_CONFIG[t.status] || { badge: "badge-neutral", label: t.status };
                    const pConfig = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.MEDIUM;
                    return (
                      <tr key={t.id} className="cursor-pointer hover:bg-base-200/50" onClick={() => setSelectedTicket(t)}>
                        <td>
                          <div>
                            <p className="font-medium">{t.ticket_number}</p>
                            <p className="text-xs text-base-content/50 truncate max-w-[200px]">{t.subject}</p>
                          </div>
                        </td>
                        {canManageTickets && (
                          <td className="text-sm">{t.ambassador?.user?.name || "Unknown"}</td>
                        )}
                        <td className="text-sm">{t.category}</td>
                        <td><span className={cn("badge", tConfig.badge, "badge-sm")}>{tConfig.label}</span></td>
                        <td><span className={cn("badge", pConfig.badge, "badge-sm")}>{t.priority}</span></td>
                        <td className="text-xs text-base-content/50">{new Date(t.created_at).toLocaleDateString()}</td>
                        <td>
                          <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); setSelectedTicket(t); }}>
                            <Icon name="eye" className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/50 py-8 text-center">No tickets found.</p>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create Support Ticket</h3>
            <div className="space-y-4">
              <div>
                <label className="label"><span className="label-text">Category</span></label>
                <select value={createForm.category} onChange={(e) => setCreateForm(p => ({ ...p, category: e.target.value }))} className="select select-bordered w-full">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label"><span className="label-text">Subject</span></label>
                <input type="text" value={createForm.subject} onChange={(e) => setCreateForm(p => ({ ...p, subject: e.target.value }))} className="input input-bordered w-full" placeholder="Brief description of your issue" required />
              </div>
              <div>
                <label className="label"><span className="label-text">Description</span></label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm(p => ({ ...p, description: e.target.value }))} className="textarea textarea-bordered w-full" rows={4} placeholder="Provide detailed information about your issue..." required />
              </div>
              <div>
                <label className="label"><span className="label-text">Priority</span></label>
                <select value={createForm.priority} onChange={(e) => setCreateForm(p => ({ ...p, priority: e.target.value }))} className="select select-bordered w-full">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={!createForm.subject || !createForm.description || createTicket.isPending} onClick={() => createTicket.mutateAsync(createForm)}>
                  {createTicket.isPending ? <span className="loading loading-spinner loading-sm" /> : "Submit Ticket"}
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCreateModal(false)} />
        </div>
      )}
    </div>
  );
}
