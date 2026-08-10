import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "../components/Icon";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useToast } from "../contexts/ToastContext";
import { platformAPI, platformApiKeyAPI, platformActionAPI } from "../services/api";

type TabType = "platforms" | "keys" | "pending";

export default function PlatformIntegrationsPage() {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const canManage = user && checkPermission("platforms:create");
  if (!canManage) return <div className="text-error">You don't have permission to manage integrations</div>;

  const [activeTab, setActiveTab] = useState<TabType>("platforms");
  const [newKey, setNewKey] = useState({ platform_id: "", name: "" });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatedWebhookSecret, setGeneratedWebhookSecret] = useState<string | null>(null);
  const [revokeOldOnRecreate, setRevokeOldOnRecreate] = useState(false);

  // ── Queries ──
  const { data: platforms } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const res = await platformAPI.getPlatforms();
      return res.data || [];
    },
  });

  const { data: apiKeysData } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const res = await platformApiKeyAPI.getKeys();
      return res.data?.items || res.data || [];
    },
    enabled: activeTab === "keys",
  });

  const { data: pendingData } = useQuery({
    queryKey: ["pending-actions"],
    queryFn: async () => {
      const res = await platformActionAPI.getPendingActions();
      return res.data || [];
    },
    enabled: activeTab === "pending",
    refetchInterval: 10000,
  });

  const apiKeys = apiKeysData || [];
  const pendingActions = pendingData || [];

  // ── Mutations ──
  const createKey = useMutation({
    mutationFn: async (data: any) => {
      const res = await platformApiKeyAPI.createKey(data);
      return res.data;
    },
    onSuccess: (data) => {
      setNewKey({ platform_id: "", name: "" });
      setGeneratedKey(data?.key || null);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast("API key generated — copy it now, it won't be shown again!", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Failed to create key";
      toast(msg, "error");
    },
  });

  const regenerateKey = useMutation({
    mutationFn: async ({ platformId, name, revokeExisting }: { platformId: string; name?: string; revokeExisting?: boolean }) => {
      const res = await platformApiKeyAPI.regenerateKey(platformId, { name, revoke_existing: revokeExisting });
      return res.data;
    },
    onSuccess: (data) => {
      setGeneratedKey(data?.key || null);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast("API key recreated — copy it now, it won't be shown again!", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Failed to recreate key";
      toast(msg, "error");
    },
  });

  const deleteKey = useMutation({
    mutationFn: async (id: string) => {
      await platformApiKeyAPI.deleteKey(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast("API key revoked", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Failed to revoke key";
      toast(msg, "error");
    },
  });

  const generateWebhookSecret = useMutation({
    mutationFn: async (platformId: string) => {
      const res = await platformAPI.generateWebhookSecret(platformId);
      return res.data;
    },
    onSuccess: (data) => {
      setGeneratedWebhookSecret(data?.webhook_secret || null);
      queryClient.invalidateQueries({ queryKey: ["platforms"] });
      toast("Webhook secret generated — copy it now!", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Failed to generate webhook secret";
      toast(msg, "error");
    },
  });

  const approveAction = useMutation({
    mutationFn: async (id: string) => {
      await platformActionAPI.approveAction(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-actions"] });
      queryClient.invalidateQueries({ queryKey: ["action-types"] });
      queryClient.invalidateQueries({ queryKey: ["referral-rates"] });
      toast("Action approved and is now active", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Failed to approve action";
      toast(msg, "error");
    },
  });

  const getPlatformName = (platformId: string) => {
    const p = platforms?.find((p: any) => p.id === platformId);
    return p?.display_name || p?.name || "Unknown";
  };

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">Platform Integrations</h2>

        {/* Tabs */}
        <div role="tablist" className="tabs tabs-lifted mb-6">
          <button role="tab" className={`tab ${activeTab === "platforms" ? "tab-active" : ""}`} onClick={() => setActiveTab("platforms")}>
            Platforms
          </button>
          <button role="tab" className={`tab ${activeTab === "keys" ? "tab-active" : ""}`} onClick={() => setActiveTab("keys")}>
            API Keys
          </button>
          <button role="tab" className={`tab ${activeTab === "pending" ? "tab-active" : ""}`} onClick={() => setActiveTab("pending")}>
            Pending Actions ({pendingActions.length})
          </button>
        </div>

        {/* ── Platforms Tab ── */}
        {activeTab === "platforms" && (
          <>
            {generatedWebhookSecret && (
              <div className="alert alert-warning mb-6">
                <Icon name="warning" className="w-5 h-5" />
                <div>
                  <h3 className="font-bold">Copy your webhook secret now!</h3>
                  <p className="text-sm">This secret will not be shown again. Share it securely with your platform team.</p>
                  <code className="block mt-2 p-2 bg-base-200 rounded text-xs select-all">{generatedWebhookSecret}</code>
                </div>
                <button onClick={() => setGeneratedWebhookSecret(null)}><Icon name="close" className="w-4 h-4" /></button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Referral URL Template</th>
                    <th>Webhook Secret</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {platforms?.length ? (
                    platforms.map((p: any) => (
                      <tr key={p.id}>
                        <td>{p.display_name || p.name}</td>
                        <td>
                          {p.referral_url_template ? (
                            <code className="text-xs bg-base-200 px-2 py-1 rounded break-all">{p.referral_url_template}</code>
                          ) : (
                            <span className="text-base-content/40 text-xs">Not configured</span>
                          )}
                        </td>
                        <td>
                          {p.webhook_secret_prefix ? (
                            <code className="text-xs bg-base-200 px-2 py-1 rounded">whsec_{p.webhook_secret_prefix}…</code>
                          ) : (
                            <span className="text-base-content/40 text-xs">Not generated</span>
                          )}
                        </td>
                        <td>{p.is_active !== false ? <span className="badge badge-success badge-sm">Active</span> : <span className="badge badge-ghost badge-sm">Inactive</span>}</td>
                        <td>
                          <button onClick={() => { if (confirm("Regenerate this webhook secret? The old secret will stop working immediately.")) generateWebhookSecret.mutateAsync(p.id); }} disabled={generateWebhookSecret.isPending} className="btn btn-primary btn-xs">
                            <Icon name="refresh" className="w-3 h-3" /> Regenerate Secret
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="text-center text-base-content/50 py-8">No platforms configured.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-base-content/50 mt-4">
              <p>Use <code className="bg-base-200 px-1 rounded">{"{referral_code}"}</code> as a placeholder — it will be replaced with the ambassador's actual referral code when generating share links.</p>
            </div>
          </>
        )}

        {/* ── API Keys Tab ── */}
        {activeTab === "keys" && (
          <>
            {/* Generated Key Alert */}
            {generatedKey && (
              <div className="alert alert-warning mb-6">
                <Icon name="warning" className="w-5 h-5" />
                <div>
                  <h3 className="font-bold">Copy your API key now!</h3>
                  <p className="text-sm">This key will not be shown again.</p>
                  <code className="block mt-2 p-2 bg-base-200 rounded text-xs select-all">{generatedKey}</code>
                </div>
                <button onClick={() => setGeneratedKey(null)}><Icon name="close" className="w-4 h-4" /></button>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm mb-4">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={revokeOldOnRecreate}
                onChange={e => setRevokeOldOnRecreate(e.target.checked)}
              />
              <span>Revoke the old active key when recreating a key</span>
            </label>

            {/* Generate Key Form */}
            <details className="collapse collapse-arrow border border-base-300 mb-6" open>
              <summary className="collapse-title text-lg font-semibold">Generate New API Key</summary>
              <div className="collapse-content">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (!newKey.platform_id || !newKey.name) return toast("Platform and name required", "error");
                    createKey.mutateAsync(newKey);
                  }}
                  className="grid md:grid-cols-3 gap-4"
                >
                  <div>
                    <label className="label"><span className="label-text">Platform</span></label>
                    <select
                      value={newKey.platform_id}
                      onChange={e => setNewKey(p => ({ ...p, platform_id: e.target.value }))}
                      className="select select-bordered w-full"
                      required
                    >
                      <option value="">Select platform…</option>
                      {platforms?.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.display_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label"><span className="label-text">Key Name</span></label>
                    <input type="text" value={newKey.name} onChange={e => setNewKey(p => ({ ...p, name: e.target.value }))} className="input input-bordered w-full" placeholder="e.g., Production Key" required />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="btn btn-primary" disabled={createKey.isPending}>
                      {createKey.isPending ? <span className="loading loading-spinner loading-sm" /> : <><Icon name="add" className="w-4 h-4 mr-1" /> Generate Key</>}
                    </button>
                  </div>
                </form>
              </div>
            </details>

            {/* Keys Table */}
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Platform</th>
                    <th>Key Prefix</th>
                    <th>Scopes</th>
                    <th>Last Used</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.length ? (
                    apiKeys.map((k: any) => (
                      <tr key={k.id}>
                        <td>{k.name}</td>
                        <td>{getPlatformName(k.platform_id)}</td>
                        <td><code className="text-xs">b2h_{k.key_prefix}…</code></td>
                        <td>{k.scopes?.join(", ") || "all"}</td>
                        <td>{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}</td>
                        <td>{k.is_active ? <span className="badge badge-success badge-sm">Active</span> : <span className="badge badge-ghost badge-sm">Revoked</span>}</td>
                        <td>
                          <button onClick={() => regenerateKey.mutateAsync({ platformId: k.platform_id, name: `${k.name} - Recreated`, revokeExisting: revokeOldOnRecreate })} disabled={regenerateKey.isPending} className="btn btn-ghost btn-xs mr-2">
                            <Icon name="refresh" className="w-3 h-3" /> Recreate
                          </button>
                          <button onClick={() => { if (confirm("Revoke this API key?")) deleteKey.mutateAsync(k.id); }} className="btn btn-ghost btn-xs text-error">
                            <Icon name="trash" className="w-3 h-3" /> Revoke
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={7} className="text-center text-base-content/50 py-8">No API keys generated yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Pending Actions Tab ── */}
        {activeTab === "pending" && (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Action Name</th>
                  <th>Display Name</th>
                  <th>Platform</th>
                  <th>Description</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingActions.length ? (
                  pendingActions.map((a: any) => (
                    <tr key={a.id}>
                      <td><code className="text-xs">{a.name}</code></td>
                      <td>{a.display_name}</td>
                      <td>{getPlatformName(a.platform_id)}</td>
                      <td className="text-base-content/60">{a.description || "—"}</td>
                      <td>{a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}</td>
                      <td>
                        <button onClick={() => { if (confirm(`Approve "${a.display_name}"?`)) approveAction.mutateAsync(a.id); }} className="btn btn-success btn-xs">
                          <Icon name="check" className="w-3 h-3" /> Approve
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="text-center text-base-content/50 py-8">No pending actions to approve.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
