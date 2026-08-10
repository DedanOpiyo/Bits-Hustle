import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "../components/Icon";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { usePlatforms } from "../constants/platforms";
import { referralRateAPI, tierTypeAPI, actionTypeAPI } from "../services/api";
import { useToast } from "../contexts/ToastContext";

export default function ReferralRatesPage() {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();
  const queryClient = useQueryClient();
  const { data: platforms } = usePlatforms();
  const { toast } = useToast();

  const canManageRates = user && checkPermission("referral_rates:create");

  if (!canManageRates) {
    return <div className="text-error">You don't have permission to manage referral rates</div>;
  }

  const { data: ratesData, isLoading } = useQuery({
    queryKey: ["referral-rates"],
    queryFn: async () => {
      const response = await referralRateAPI.getRates();
      return response.data?.items || response.data || [];
    },
    enabled: !!user,
  });

  const { data: tiersData } = useQuery({
    queryKey: ["tier-types"],
    queryFn: async () => {
      const response = await tierTypeAPI.getTierTypes();
      return response.data?.items || response.data || [];
    },
  });

  const { data: actionsData } = useQuery({
    queryKey: ["action-types"],
    queryFn: async () => {
      const response = await actionTypeAPI.getActionTypes();
      return response.data?.items || response.data || [];
    },
  });

  // Ensure we always have arrays, even if data is null/undefined
  const rates = Array.isArray(ratesData) ? ratesData : [];
  const tiers = Array.isArray(tiersData) ? tiersData : [];
  const actions = Array.isArray(actionsData) ? actionsData : [];
  const plat = Array.isArray(platforms) ? platforms : [];

  const [newRate, setNewRate] = useState({
    platform_id: "",
    tier: "DEFAULT",
    action: "CONVERSION",
    rate: "",
    is_percentage: false,
  });

  const [editingRate, setEditingRate] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    platform_id: "",
    tier: "DEFAULT",
    action: "CONVERSION",
    rate: "",
    is_percentage: false,
  });

  const createRate = useMutation({
    mutationFn: async (data: any) => {
      const response = await referralRateAPI.setRate({ ...data, rate: parseFloat(data.rate) });
      return response.data;
    },
    onSuccess: () => {
      setNewRate({ platform_id: "", tier: "DEFAULT", action: "CONVERSION", rate: "", is_percentage: false });
      queryClient.invalidateQueries({ queryKey: ["referral-rates"] });
      toast("Rate added successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.response?.data?.message || "Failed to add rate";
      toast(msg, "error");
    },
  });

  const updateRate = useMutation({
    mutationFn: async ({ data }: { id: string; data: any }) => {
      const response = await referralRateAPI.setRate({ ...data, rate: parseFloat(data.rate) });
      return response.data;
    },
    onSuccess: () => {
      setEditingRate(null);
      queryClient.invalidateQueries({ queryKey: ["referral-rates"] });
      toast("Rate updated successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.response?.data?.message || "Failed to update rate";
      toast(msg, "error");
    },
  });

  const deleteRate = useMutation({
    mutationFn: async (id: string) => {
      await referralRateAPI.deleteRate(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referral-rates"] });
      toast("Rate deleted successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.response?.data?.message || "Failed to delete rate";
      toast(msg, "error");
    },
  });

  if (isLoading) return null;

  const startEdit = (r: any) => {
    setEditingRate(r);
    setEditForm({
      platform_id: r.platform_id || "",
      tier: r.tier || "DEFAULT",
      action: r.action || "CONVERSION",
      rate: String(r.rate || ""),
      is_percentage: Boolean(r.is_percentage),
    });
  };

  const formatRate = (rate: any) => {
    const value = Number(rate.rate || 0).toLocaleString();
    return rate.is_percentage ? `${value}%` : `KES ${value}`;
  };

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">Referral Rates Management</h2>

        <details className="collapse collapse-arrow border border-base-300 mb-6">
          <summary className="collapse-title text-lg font-semibold">Add New Rate</summary>
          <div className="collapse-content">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createRate.mutateAsync(newRate);
              }}
              className="grid md:grid-cols-5 gap-4"
            >
              <div>
                <label className="label"><span className="label-text">Platform</span></label>
                <select
                  value={newRate.platform_id}
                  onChange={(e) => setNewRate((p) => ({ ...p, platform_id: e.target.value }))}
                  className="select select-bordered w-full"
                >
                  <option value="">All Platforms (Default)</option>
                  {plat.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label"><span className="label-text">Tier</span></label>
                <select
                  value={newRate.tier}
                  onChange={(e) => setNewRate((p) => ({ ...p, tier: e.target.value }))}
                  className="select select-bordered w-full"
                >
                  {tiers.map((t: any) => (
                    <option key={t.id} value={t.name}>{t.display_name || t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label"><span className="label-text">Action</span></label>
                <select
                  value={newRate.action}
                  onChange={(e) => setNewRate((p) => ({ ...p, action: e.target.value }))}
                  className="select select-bordered w-full"
                >
                  {actions.map((a: any) => (
                    <option key={a.id} value={a.name}>{a.display_name || a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label"><span className="label-text">Rate Type</span></label>
                <select
                  value={newRate.is_percentage ? "percentage" : "fixed"}
                  onChange={(e) => setNewRate((p) => ({ ...p, is_percentage: e.target.value === "percentage" }))}
                  className="select select-bordered w-full"
                >
                  <option value="fixed">Fixed amount (KES)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
              <div>
                <label className="label"><span className="label-text">{newRate.is_percentage ? "Rate (%)" : "Rate (KES)"}</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={newRate.is_percentage ? "100" : undefined}
                  value={newRate.rate}
                  onChange={(e) => setNewRate((p) => ({ ...p, rate: e.target.value }))}
                  className="input input-bordered w-full"
                  placeholder={newRate.is_percentage ? "e.g., 5" : "e.g., 100"}
                  required
                />
                <p className="text-xs text-base-content/60 mt-1">
                  {newRate.is_percentage
                    ? "Reward is calculated from the webhook transaction amount."
                    : "Reward is paid as a fixed KES amount per conversion."}
                </p>
              </div>
              <div className="md:col-span-5">
                <button type="submit" className="btn btn-primary" disabled={createRate.isPending}>
                  {createRate.isPending ? <span className="loading loading-spinner loading-sm" /> : <><Icon name="add" className="w-4 h-4 mr-1" /> Add Rate</>}
                </button>
              </div>
            </form>
          </div>
        </details>

        {editingRate && (
          <div className="card bg-base-100 border border-primary shadow-sm mb-6">
            <div className="card-body">
              <h3 className="card-title">Edit Rate</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateRate.mutateAsync({ id: editingRate.id, data: editForm });
                }}
                className="grid md:grid-cols-5 gap-4"
              >
                <div>
                  <label className="label"><span className="label-text">Platform</span></label>
                  <select
                    value={editForm.platform_id}
                    onChange={(e) => setEditForm((p) => ({ ...p, platform_id: e.target.value }))}
                    className="select select-bordered w-full"
                  >
                    <option value="">All Platforms (Default)</option>
                    {plat.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.displayName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label"><span className="label-text">Tier</span></label>
                  <select
                    value={editForm.tier}
                    onChange={(e) => setEditForm((p) => ({ ...p, tier: e.target.value }))}
                    className="select select-bordered w-full"
                  >
                    {tiers.map((t: any) => (
                      <option key={t.id} value={t.name}>{t.display_name || t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label"><span className="label-text">Action</span></label>
                  <select
                    value={editForm.action}
                    onChange={(e) => setEditForm((p) => ({ ...p, action: e.target.value }))}
                    className="select select-bordered w-full"
                  >
                    {actions.map((a: any) => (
                      <option key={a.id} value={a.name}>{a.display_name || a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label"><span className="label-text">Rate Type</span></label>
                  <select
                    value={editForm.is_percentage ? "percentage" : "fixed"}
                    onChange={(e) => setEditForm((p) => ({ ...p, is_percentage: e.target.value === "percentage" }))}
                    className="select select-bordered w-full"
                  >
                    <option value="fixed">Fixed amount (KES)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="label"><span className="label-text">{editForm.is_percentage ? "Rate (%)" : "Rate (KES)"}</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={editForm.is_percentage ? "100" : undefined}
                    value={editForm.rate}
                    onChange={(e) => setEditForm((p) => ({ ...p, rate: e.target.value }))}
                    className="input input-bordered w-full"
                    required
                  />
                  <p className="text-xs text-base-content/60 mt-1">
                    {editForm.is_percentage
                      ? "Reward is calculated from the webhook transaction amount."
                      : "Reward is paid as a fixed KES amount per conversion."}
                  </p>
                </div>
                <div className="md:col-span-5 flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={updateRate.isPending}>Save</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingRate(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Tier</th>
                <th>Action</th>
                <th>Rate Type</th>
                <th>Rate</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.length ? (
                rates.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.platform?.display_name || r.platform_name || "All Platforms"}</td>
                    <td><span className="badge badge-ghost badge-sm">{r.tier}</span></td>
                    <td><span className="badge badge-outline badge-sm">{r.action}</span></td>
                    <td><span className="badge badge-info badge-sm">{r.is_percentage ? "Percentage" : "Fixed KES"}</span></td>
                    <td className="font-semibold">{formatRate(r)}</td>
                    <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(r)} className="btn btn-ghost btn-xs">
                          <Icon name="edit" className="w-3 h-3" />
                        </button>
                        <button onClick={() => { if (confirm("Delete this rate?")) deleteRate.mutateAsync(r.id); }} className="btn btn-ghost btn-xs text-error">
                          <Icon name="trash" className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center text-base-content/50 py-8">No rates configured yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
