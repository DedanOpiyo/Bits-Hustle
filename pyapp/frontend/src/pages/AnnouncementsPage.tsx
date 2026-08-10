import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { announcementAPI, hubAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { cn } from "../utils";
import type { IconName } from "../components/Icon";

const PRIORITY_CONFIG: Record<string, { badge: string; alert: string; icon: IconName }> = {
  NORMAL: { badge: "badge-neutral", alert: "alert-info", icon: "info" },
  HIGH: { badge: "badge-warning", alert: "alert-warning", icon: "warning" },
  URGENT: { badge: "badge-error", alert: "alert-error", icon: "alert" },
};

const TYPE_CONFIG: Record<string, { badge: string; label: string }> = {
  SYSTEM: { badge: "badge-info", label: "System" },
  HUB: { badge: "badge-success", label: "Hub" },
};

type AnnouncementForm = {
  title: string;
  content: string;
  type: "SYSTEM" | "HUB";
  priority: "NORMAL" | "HIGH" | "URGENT";
  expiresAt: string;
  hubId: string;
  isActive: boolean;
};

const emptyForm: AnnouncementForm = {
  title: "",
  content: "",
  type: "SYSTEM",
  priority: "NORMAL",
  expiresAt: "",
  hubId: "",
  isActive: true,
};

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();
  const queryClient = useQueryClient();

  const canViewAnnouncements = user && checkPermission("announcements:read");
  const canCreateAnnouncements = user && (checkPermission("announcements:create") || checkPermission("hub_manager:access"));

  if (!canViewAnnouncements) {
    return <div className="text-error">You don't have permission to view announcements</div>;
  }

  const { data: announcements, isLoading, error } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const resp = await announcementAPI.getAnnouncements({});
      return resp.data?.items || resp.data || [];
    },
    enabled: !!user,
  });

  const { data: hubs } = useQuery({
    queryKey: ["hubs"],
    queryFn: async () => {
      const resp = await hubAPI.getHubs();
      return resp.data?.items || resp.data || [];
    },
    enabled: !!canCreateAnnouncements,
  });

  const [form, setForm] = useState<AnnouncementForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: AnnouncementForm) => {
      const payload = {
        title: data.title,
        content: data.content,
        type: data.type,
        priority: data.priority,
        expiresAt: data.expiresAt || null,
        hubId: data.type === "HUB" ? data.hubId : null,
        isActive: data.isActive,
      };
      await announcementAPI.createAnnouncement(payload);
    },
    onSuccess: () => {
      setForm(emptyForm);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "An error occurred";
      setFormError(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AnnouncementForm }) => {
      const payload = {
        title: data.title,
        content: data.content,
        type: data.type,
        priority: data.priority,
        expiresAt: data.expiresAt || null,
        hubId: data.type === "HUB" ? data.hubId : null,
        isActive: data.isActive,
      };
      await announcementAPI.updateAnnouncement(id, payload);
    },
    onSuccess: () => {
      setForm(emptyForm);
      setEditingId(null);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "An error occurred";
      setFormError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await announcementAPI.deleteAnnouncement(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (announcement: any) => {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title || "",
      content: announcement.content || "",
      type: announcement.type || "SYSTEM",
      priority: announcement.priority || "NORMAL",
      expiresAt: announcement.expires_at ? announcement.expires_at.slice(0, 16) : "",
      hubId: announcement.hub_id || "",
      isActive: announcement.is_active !== false,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  };

  if (isLoading) return null;
  if (error) return <div className="text-error">Failed to load announcements</div>;

  const allAnnouncements = Array.isArray(announcements?.items)
    ? announcements.items
    : Array.isArray(announcements)
      ? announcements
      : [];

  const filteredAnnouncements = filter
    ? allAnnouncements.filter((a: any) => a.priority === filter)
    : allAnnouncements;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">Announcements</h2>

        {canCreateAnnouncements && (
          <details className="collapse collapse-arrow border border-base-300 mb-6" open={!!editingId}>
            <summary className="collapse-title text-lg font-semibold">
              {editingId ? "Edit Announcement" : "Create New Announcement"}
            </summary>
            <div className="collapse-content">
              {formError && (
                <div className="alert alert-error mb-4">
                  <span>{formError}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label"><span className="label-text">Title</span></label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className="input input-bordered w-full"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label"><span className="label-text">Content</span></label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                    className="textarea textarea-bordered w-full"
                    rows={4}
                    required
                  />
                </div>
                <div>
                  <label className="label"><span className="label-text">Type</span></label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as "SYSTEM" | "HUB" }))}
                    className="select select-bordered w-full"
                    required
                  >
                    <option value="SYSTEM">System-wide</option>
                    <option value="HUB">Hub-specific</option>
                  </select>
                </div>
                <div>
                  <label className="label"><span className="label-text">Priority</span></label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as "NORMAL" | "HIGH" | "URGENT" }))}
                    className="select select-bordered w-full"
                    required
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                {form.type === "HUB" && (
                  <div className="md:col-span-2">
                    <label className="label"><span className="label-text">Hub</span></label>
                    <select
                      value={form.hubId}
                      onChange={(e) => setForm((p) => ({ ...p, hubId: e.target.value }))}
                      className="select select-bordered w-full"
                      required={form.type === "HUB"}
                    >
                      <option value="">Select a hub...</option>
                      {(Array.isArray(hubs) ? hubs : []).map((hub: any) => (
                        <option key={hub.id} value={hub.id}>{hub.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="label"><span className="label-text">Expires At (optional)</span></label>
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                    className="input input-bordered w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="label cursor-pointer">
                    <span className="label-text">Active</span>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                      className="toggle toggle-primary"
                    />
                  </label>
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={isPending}>
                    {isPending ? <span className="loading loading-spinner loading-sm" /> : (
                      <>
                        <Icon name={editingId ? "edit" : "add"} className="w-4 h-4 mr-1" />
                        {editingId ? "Update Announcement" : "Create Announcement"}
                      </>
                    )}
                  </button>
                  {editingId && (
                    <button type="button" className="btn btn-ghost" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </details>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <button className={cn("btn btn-xs", !filter && "btn-active")} onClick={() => setFilter("")}>All</button>
          {["URGENT", "HIGH", "NORMAL"].map((p) => (
            <button key={p} className={cn("btn btn-xs", filter === p && "btn-active")} onClick={() => setFilter(p)}>
              {p}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredAnnouncements?.length ? (
            filteredAnnouncements.map((a: any) => {
              const pConfig = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.NORMAL;
              const tConfig = TYPE_CONFIG[a.type] || TYPE_CONFIG.SYSTEM;
              const isExpired = a.expires_at && new Date(a.expires_at) < new Date();
              return (
                <div key={a.id} className={cn("alert", pConfig.alert, isExpired && "opacity-50")}>
                  <Icon name={pConfig.icon} className="w-6 h-6 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-bold">{a.title}</h3>
                    <p className="text-sm whitespace-pre-wrap">{a.content}</p>
                    <div className="flex gap-2 mt-1 text-xs opacity-70">
                      <span className={cn("badge", tConfig.badge, "badge-xs")}>{tConfig.label}</span>
                      <span>{new Date(a.created_at).toLocaleDateString()}</span>
                      {a.expires_at && <span>Expires: {new Date(a.expires_at).toLocaleDateString()}</span>}
                      {a.hub && <span>Hub: {a.hub.name}</span>}
                    </div>
                  </div>
                  {canCreateAnnouncements && (
                    <div className="flex gap-1">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleEdit(a)}
                        title="Edit"
                      >
                        <Icon name="edit" className="w-4 h-4" />
                      </button>
                      {!isExpired && (
                        <button
                          className="btn btn-error btn-xs"
                          onClick={() => {
                            if (confirm("Delete this announcement?")) {
                              deleteMutation.mutateAsync(a.id);
                            }
                          }}
                          title="Delete"
                        >
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-base-content/50 py-8 text-center">No announcements yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
