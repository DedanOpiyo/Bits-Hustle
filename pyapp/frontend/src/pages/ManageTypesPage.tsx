import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "../components/Icon";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useToast } from "../contexts/ToastContext";
import { platformAPI, tierTypeAPI, actionTypeAPI } from "../services/api";

type TypeTab = "platforms" | "tiers" | "actions" | "assignment-categories";

type FormState = {
  name: string;
  display_name: string;
  description: string;
  referral_url_template: string;
  sort_order: number;
  is_active: boolean;
};

const emptyForm: FormState = { name: "", display_name: "", description: "", referral_url_template: "", sort_order: 0, is_active: true };

export default function ManageTypesPage() {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const canManage = user && checkPermission("platforms:create");
  if (!canManage) return <div className="text-error">You don't have permission to manage types</div>;

  const [activeTab, setActiveTab] = useState<TypeTab>("platforms");
  const [newItem, setNewItem] = useState<FormState>(emptyForm);
  const [editingItem, setEditingItem] = useState<{ id: string; data: FormState } | null>(null);

  // ── Queries ──
  const { data: platformsData, isLoading: loadingPlatforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const response = await platformAPI.getPlatforms();
      const data = response.data;
      if (Array.isArray(data)) return data;
      return data?.items || [];
    },
    enabled: activeTab === 'platforms',
  });

  const { data: tiersData, isLoading: loadingTiers } = useQuery({
    queryKey: ["tier-types"],
    queryFn: async () => {
      const response = await tierTypeAPI.getTierTypes();
      return response.data?.items || [];
    },
    enabled: activeTab === "tiers",
  });

  const { data: actionsData, isLoading: loadingActions } = useQuery({
    queryKey: ["action-types"],
    queryFn: async () => {
      const response = await actionTypeAPI.getActionTypes();
      return response.data?.items || [];
    },
    enabled: activeTab === "actions",
  });

  const items = activeTab === "platforms" ? platformsData : activeTab === "tiers" ? tiersData : actionsData;
  const isLoading = activeTab === "platforms" ? loadingPlatforms : activeTab === "tiers" ? loadingTiers : loadingActions;

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: async (data: FormState) => {
      if (activeTab === "platforms") return platformAPI.createPlatform(data);
      if (activeTab === "tiers") return tierTypeAPI.createTierType(data);
      return actionTypeAPI.createActionType(data);
    },
    onSuccess: () => {
      setNewItem(emptyForm);
      const key = activeTab === "platforms" ? "platforms" : activeTab === "tiers" ? "tier-types" : "action-types";
      queryClient.invalidateQueries({ queryKey: [key] });
      toast("Item added successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to add item";
      toast(msg, "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormState }) => {
      if (activeTab === "platforms") return platformAPI.updatePlatform(id, data);
      if (activeTab === "tiers") return tierTypeAPI.updateTierType(id, data);
      return actionTypeAPI.updateActionType(id, data);
    },
    onSuccess: () => {
      setEditingItem(null);
      const key = activeTab === "platforms" ? "platforms" : activeTab === "tiers" ? "tier-types" : "action-types";
      queryClient.invalidateQueries({ queryKey: [key] });
      toast("Item updated successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to update item";
      toast(msg, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (activeTab === "platforms") return platformAPI.deletePlatform(id);
      if (activeTab === "tiers") return tierTypeAPI.deleteTierType(id);
      return actionTypeAPI.deleteActionType(id);
    },
    onSuccess: () => {
      const key = activeTab === "platforms" ? "platforms" : activeTab === "tiers" ? "tier-types" : "action-types";
      queryClient.invalidateQueries({ queryKey: [key] });
      toast("Item deleted successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to delete item";
      toast(msg, "error");
    },
  });

  if (isLoading) return null;

  const title = activeTab === "platforms" ? "Platforms" : activeTab === "tiers" ? "Tiers" : "Actions";
  const label = title.slice(0, -1); // singular

  const startEdit = (item: any) => {
    setEditingItem({
      id: item.id,
      data: {
        name: item.name || "",
        display_name: item.display_name || "",
        description: item.description || "",
        referral_url_template: item.referral_url_template || "",
        sort_order: item.sort_order ?? 0,
        is_active: item.is_active ?? true,
      },
    });
  };

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">Manage {title}</h2>

        {/* Tabs */}
        <div role="tablist" className="tabs tabs-lifted mb-6">
          {(["platforms", "tiers", "actions"] as TypeTab[]).map(tab => (
            <button
              key={tab}
              role="tab"
              className={`tab ${activeTab === tab ? "tab-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "platforms" ? "Platforms" : tab === "tiers" ? "Tiers" : "Actions"}
            </button>
          ))}
        </div>

        {/* Add New */}
        <details className="collapse collapse-arrow border border-base-300 mb-6">
          <summary className="collapse-title text-lg font-semibold">Add New {label}</summary>
          <div className="collapse-content">
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newItem.name || !newItem.display_name) return toast("Name and Display Name required", "error");
                createMutation.mutateAsync(newItem);
              }}
              className="grid md:grid-cols-4 gap-4"
            >
              <div>
                <label className="label"><span className="label-text">Name (slug)</span></label>
                <input type="text" value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} className="input input-bordered w-full" placeholder="e.g., TIER_4" required />
              </div>
              <div>
                <label className="label"><span className="label-text">Display Name</span></label>
                <input type="text" value={newItem.display_name} onChange={e => setNewItem(p => ({ ...p, display_name: e.target.value }))} className="input input-bordered w-full" placeholder="e.g., Tier 4" required />
              </div>
              <div>
                <label className="label"><span className="label-text">Description</span></label>
                <input type="text" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} className="input input-bordered w-full" placeholder="Optional" />
              </div>
              <div>
                <label className="label"><span className="label-text">Sort Order</span></label>
                <input type="number" value={newItem.sort_order} onChange={e => setNewItem(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} className="input input-bordered w-full" />
              </div>
              <div className="md:col-span-4">
                <label className="label"><span className="label-text">Referral URL Template</span></label>
                <input type="text" value={newItem.referral_url_template} onChange={e => setNewItem(p => ({ ...p, referral_url_template: e.target.value }))} className="input input-bordered w-full" placeholder="e.g., https://example.com/register?ref={referral_code}" />
                <p className="text-xs text-base-content/50 mt-1">Use <code className="bg-base-200 px-1 rounded">{"{referral_code}"}</code> as a placeholder for the ambassador's code.</p>
              </div>
              <div className="md:col-span-4">
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <span className="loading loading-spinner loading-sm" /> : <><Icon name="add" className="w-4 h-4 mr-1" /> Add {label}</>}
                </button>
              </div>
            </form>
          </div>
        </details>

        {/* Edit Form */}
        {editingItem && (
          <div className="card bg-base-100 border border-primary shadow-sm mb-6">
            <div className="card-body">
              <h3 className="card-title">Edit {label}</h3>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  updateMutation.mutateAsync({ id: editingItem.id, data: editingItem.data });
                }}
                className="grid md:grid-cols-4 gap-4"
              >
                <div>
                  <label className="label"><span className="label-text">Name (slug)</span></label>
                  <input type="text" value={editingItem.data.name} onChange={e => setEditingItem(p => p ? { ...p, data: { ...p.data, name: e.target.value } } : null)} className="input input-bordered w-full" required />
                </div>
                <div>
                  <label className="label"><span className="label-text">Display Name</span></label>
                  <input type="text" value={editingItem.data.display_name} onChange={e => setEditingItem(p => p ? { ...p, data: { ...p.data, display_name: e.target.value } } : null)} className="input input-bordered w-full" required />
                </div>
                <div>
                  <label className="label"><span className="label-text">Description</span></label>
                  <input type="text" value={editingItem.data.description} onChange={e => setEditingItem(p => p ? { ...p, data: { ...p.data, description: e.target.value } } : null)} className="input input-bordered w-full" />
                </div>
                <div>
                  <label className="label"><span className="label-text">Sort Order</span></label>
                  <input type="number" value={editingItem.data.sort_order} onChange={e => setEditingItem(p => p ? { ...p, data: { ...p.data, sort_order: parseInt(e.target.value) || 0 } } : null)} className="input input-bordered w-full" />
                </div>
                <div className="md:col-span-4">
                  <label className="label"><span className="label-text">Referral URL Template</span></label>
                  <input type="text" value={editingItem.data.referral_url_template} onChange={e => setEditingItem(p => p ? { ...p, data: { ...p.data, referral_url_template: e.target.value } } : null)} className="input input-bordered w-full" placeholder="e.g., https://example.com/register?ref={referral_code}" />
                  <p className="text-xs text-base-content/50 mt-1">Use <code className="bg-base-200 px-1 rounded">{"{referral_code}"}</code> as a placeholder for the ambassador's code.</p>
                </div>
                <div className="md:col-span-4 flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>Save</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingItem(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Name</th>
                <th>Display Name</th>
                <th>Description</th>
                <th>Sort Order</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items?.length ? (
                items.map((item: any) => (
                  <tr key={item.id}>
                    <td><code className="text-xs">{item.name}</code></td>
                    <td>{item.display_name}</td>
                    <td className="text-base-content/60">{item.description || "—"}</td>
                    <td>{item.sort_order ?? 0}</td>
                    <td>{item.is_active ? <span className="badge badge-success badge-sm">Active</span> : <span className="badge badge-ghost badge-sm">Inactive</span>}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(item)} className="btn btn-ghost btn-xs"><Icon name="edit" className="w-3 h-3" /></button>
                        <button onClick={() => { if (confirm(`Delete ${item.display_name}?`)) deleteMutation.mutateAsync(item.id); }} className="btn btn-ghost btn-xs text-error"><Icon name="trash" className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="text-center text-base-content/50 py-8">No {title.toLowerCase()} configured yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
