import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { ambassadorAPI, hubAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { cn } from "../utils";

export default function HubAmbassadorsPage() {
  const { user } = useAuth();
  const { checkRole } = usePermissions();
  const queryClient = useQueryClient();
  const canCreate = user && (checkRole("SUPER_ADMIN") || checkRole("HUB_MANAGER"));

  const [selectedAmbassadorId, setSelectedAmbassadorId] = useState<string | null>(null);
  const [fraudModal, setFraudModal] = useState(false);
  const [fraudForm, setFraudForm] = useState({ type: "MANUAL_FLAG", severity: "MEDIUM", message: "", details: "" });
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", phoneNumber: "", referralCode: "" });
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: myHub } = useQuery({
    queryKey: ["my-hub"],
    queryFn: async () => {
      const resp = await hubAPI.getMyHub();
      return resp.data;
    },
    enabled: !!user,
  });

  const { data: ambassadorsData, isLoading } = useQuery({
    queryKey: ["hub-ambassadors", myHub?.id],
    queryFn: async () => {
      if (!myHub?.id) return null;
      const resp = await ambassadorAPI.getHubAmbassadors(myHub.id, { perPage: 100 });
      return resp.data;
    },
    enabled: !!myHub?.id,
  });

  const { data: ambassadorDetail } = useQuery({
    queryKey: ["ambassador-detail", selectedAmbassadorId],
    queryFn: async () => {
      if (!selectedAmbassadorId) return null;
      const resp = await ambassadorAPI.getAmbassadorDetail(selectedAmbassadorId);
      return resp.data;
    },
    enabled: !!selectedAmbassadorId,
    staleTime: 0,
  });

  const flagFraud = useMutation({
    mutationFn: async (data: { ambassadorId: string; payload: any }) => {
      return await ambassadorAPI.flagFraud(data.ambassadorId, data.payload);
    },
    onSuccess: () => {
      setFraudModal(false);
      setFraudForm({ type: "MANUAL_FLAG", severity: "MEDIUM", message: "", details: "" });
      queryClient.invalidateQueries({ queryKey: ["ambassador-detail"] });
      queryClient.invalidateQueries({ queryKey: ["hub-ambassadors"] });
    },
  });

  const createAmbassador = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        hubId: myHub?.id,
      };
      return await ambassadorAPI.createAmbassador(payload);
    },
    onSuccess: () => {
      setCreateModal(false);
      setCreateForm({ name: "", email: "", phoneNumber: "", referralCode: "" });
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ["hub-ambassadors"] });
    },
    onError: (error: any) => {
      setCreateError(error.response?.data?.message || error.message || "Failed to create ambassador");
    },
  });

  const formatKES = (v: number) => "KES " + ((v || 0) as number).toLocaleString();

  if (isLoading) {
    return <div className="text-base-content/50 py-8 text-center">Loading ambassadors...</div>;
  }

  if (!ambassadorsData) {
    return <div className="text-error py-8 text-center">No hub data found.</div>;
  }

  const ambassadors = ambassadorsData.items || [];

  const statusBadge = (status: string) => {
    const lower = status?.toLowerCase() || "";
    const cls =
      lower === "active" ? "badge-success"
        : lower === "suspended" ? "badge-error"
          : lower === "inactive" ? "badge-neutral"
            : "badge-warning";
    return <span className={cn("badge", cls)}>{status}</span>;
  };

  const tierBadge = (tier: string) => {
    const lower = tier?.toLowerCase() || "";
    const cls =
      lower === "hub officer" ? "badge-error"
        : lower === "campus lead" ? "badge-warning"
          : lower === "senior ambassador" ? "badge-info"
            : lower === "ambassador" ? "badge-primary"
              : "badge-neutral";
    return <span className={cn("badge badge-outline", cls)}>{tier}</span>;
  };

  if (ambassadorDetail) {
    const detail = ambassadorDetail;
    const perf = detail.performance || {};
    const wallet = detail.wallet || {};

    return (
      <div className="animate-fadeIn space-y-6">
        <div className="flex items-center gap-4">
          <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedAmbassadorId(null); queryClient.removeQueries({ queryKey: ["ambassador-detail"] }); }}>
            <Icon name="arrowLeft" className="w-4 h-4 mr-1" /> Back to List
          </button>
          <h1 className="text-2xl font-bold">Ambassador Profile</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                    {(detail.user?.name || "A").charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{detail.user?.name || "Unknown"}</h2>
                    <p className="text-sm text-base-content/60">{detail.user?.email} &bull; {detail.user?.phone_number || "No phone"}</p>
                    <div className="flex gap-2 mt-2">
                      {statusBadge(detail.status)}
                      {tierBadge(detail.tier)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="stat bg-base-100 rounded-xl border border-base-300 p-4">
                <div className="stat-title text-xs">Total Tasks</div>
                <div className="stat-value text-xl font-bold">{perf.totalTasks || 0}</div>
              </div>
              <div className="stat bg-base-100 rounded-xl border border-base-300 p-4">
                <div className="stat-title text-xs">Approved</div>
                <div className="stat-value text-xl font-bold text-success">{perf.approvedTasks || 0}</div>
              </div>
              <div className="stat bg-base-100 rounded-xl border border-base-300 p-4">
                <div className="stat-title text-xs">Pending</div>
                <div className="stat-value text-xl font-bold text-warning">{perf.pendingTasks || 0}</div>
              </div>
              <div className="stat bg-base-100 rounded-xl border border-base-300 p-4">
                <div className="stat-title text-xs">Rejected</div>
                <div className="stat-value text-xl font-bold text-error">{perf.rejectedTasks || 0}</div>
              </div>
              <div className="stat bg-base-100 rounded-xl border border-base-300 p-4">
                <div className="stat-title text-xs">Leads</div>
                <div className="stat-value text-xl font-bold">{perf.totalLeads || 0}</div>
              </div>
              <div className="stat bg-base-100 rounded-xl border border-base-300 p-4">
                <div className="stat-title text-xs">Referrals</div>
                <div className="stat-value text-xl font-bold">{perf.totalReferrals || 0} <span className="text-xs text-base-content/50">({perf.convertedReferrals || 0} converted)</span></div>
              </div>
            </div>

            {detail.recentSubmissions && detail.recentSubmissions.length > 0 && (
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h2 className="card-title mb-4">Recent Task Submissions</h2>
                  <div className="space-y-2">
                    {detail.recentSubmissions.map((sub: any) => {
                      const statusName = sub.status?.display_name || sub.status?.name || sub.status;
                      const statusCls =
                        statusName?.toLowerCase() === "approved" ? "badge-success"
                          : statusName?.toLowerCase() === "rejected" ? "badge-error"
                            : "badge-warning";
                      return (
                        <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-base-200/30">
                          <div>
                            <p className="font-medium text-sm">{sub.task?.description?.slice(0, 60) || "Task"}</p>
                            <p className="text-xs text-base-content/50">{new Date(sub.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className={cn("badge", statusCls)}>{statusName}</span>
                        </div>
                      );
                    })}  
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <h2 className="card-title mb-4">
                  <Icon name="wallet" className="w-5 h-5" />
                  Wallet (Read-Only)
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Current Balance</span>
                    <span className="font-bold">{formatKES(wallet.current_balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Pending Earnings</span>
                    <span className="font-medium">{formatKES(wallet.pending_earnings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Total Earned</span>
                    <span className="font-medium">{formatKES(wallet.total_earned)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Total Withdrawn</span>
                    <span className="font-medium">{formatKES(wallet.total_withdrawn)}</span>
                  </div>
                  <div className="divider my-2" />
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Last 30d Earnings</span>
                    <span className="font-bold text-success">{formatKES(perf.earningsLast30Days)}</span>
                  </div>
                </div>
              </div>
            </div>

            {detail.recentTransactions && detail.recentTransactions.length > 0 && (
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h2 className="card-title mb-2">Recent Transactions</h2>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {detail.recentTransactions.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium truncate max-w-[150px]">{tx.description?.slice(0, 30)}</p>
                          <p className="text-xs text-base-content/50">{new Date(tx.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={cn("font-medium", tx.type === "EARNING" ? "text-success" : "text-error")}>
                          {tx.type === "EARNING" ? "+" : "-"}{formatKES(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="card bg-base-100 border border-error/30">
              <div className="card-body">
                <h2 className="card-title text-error mb-2">
                  <Icon name="alert" className="w-5 h-5" />
                  Flag Suspicious Activity
                </h2>
                <p className="text-sm text-base-content/60 mb-4">Report fraud or suspicious behavior for review.</p>
                <button className="btn btn-error btn-sm" onClick={() => setFraudModal(true)}>
                  <Icon name="alert" className="w-4 h-4 mr-1" /> Flag Ambassador
                </button>
              </div>
            </div>

            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <h2 className="card-title mb-2">Info</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Referral Code</span>
                    <span className="font-mono">{detail.referral_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Hub</span>
                    <span>{detail.hub?.name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Last Check-In</span>
                    <span>{perf.lastCheckIn ? new Date(perf.lastCheckIn).toLocaleDateString() : "Never"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Fraud Strikes</span>
                    <span className={cn("font-bold", (detail.fraud_strike_count || 0) >= 2 ? "text-error" : "")}>
                      {detail.fraud_strike_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {fraudModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg text-error mb-4">Flag Suspicious Activity</h3>
              <div className="space-y-4">
                <div>
                  <label className="label"><span className="label-text">Type</span></label>
                  <select value={fraudForm.type} onChange={(e) => setFraudForm(p => ({ ...p, type: e.target.value }))} className="select select-bordered w-full">
                    <option value="MANUAL_FLAG">Manual Flag</option>
                    <option value="FAKE_LEAD">Fake Lead</option>
                    <option value="DUPLICATE_FRAUD">Duplicate Fraud</option>
                    <option value="IDENTITY_FRAUD">Identity Fraud</option>
                    <option value="TASK_FRAUD">Task Fraud</option>
                  </select>
                </div>
                <div>
                  <label className="label"><span className="label-text">Severity</span></label>
                  <select value={fraudForm.severity} onChange={(e) => setFraudForm(p => ({ ...p, severity: e.target.value }))} className="select select-bordered w-full">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="label"><span className="label-text">Description (Required)</span></label>
                  <textarea value={fraudForm.message} onChange={(e) => setFraudForm(p => ({ ...p, message: e.target.value }))} className="textarea textarea-bordered w-full" rows={3} required placeholder="Describe the suspicious activity..." />
                </div>
                <div className="flex gap-2 justify-end">
                  <button className="btn btn-ghost" onClick={() => { setFraudModal(false); setFraudForm({ type: "MANUAL_FLAG", severity: "MEDIUM", message: "", details: "" }); }}>Cancel</button>
                  <button className="btn btn-error" disabled={!fraudForm.message || flagFraud.isPending} onClick={() => selectedAmbassadorId && flagFraud.mutateAsync({ ambassadorId: selectedAmbassadorId, payload: fraudForm })}>  
                    {flagFraud.isPending ? <span className="loading loading-spinner loading-sm" /> : "Submit Flag"}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => setFraudModal(false)} />
          </div>
        )}

        {createModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Create Ambassador</h3>
              {createError && (
                <div className="alert alert-error mb-4">
                  <span>{createError}</span>
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); setCreateError(null); createAmbassador.mutateAsync(createForm); }} className="space-y-4">
                <div>
                  <label className="label"><span className="label-text">Full Name</span></label>
                  <input type="text" value={createForm.name} onChange={(e) => setCreateForm(p => ({ ...p, name: e.target.value }))} className="input input-bordered w-full" required />
                </div>
                <div>
                  <label className="label"><span className="label-text">Email</span></label>
                  <input type="email" value={createForm.email} onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))} className="input input-bordered w-full" required />
                </div>
                <div>
                  <label className="label"><span className="label-text">Phone (optional)</span></label>
                  <input type="tel" value={createForm.phoneNumber} onChange={(e) => setCreateForm(p => ({ ...p, phoneNumber: e.target.value }))} className="input input-bordered w-full" />
                </div>
                <div>
                  <label className="label"><span className="label-text">Referral Code (optional)</span></label>
                  <input type="text" value={createForm.referralCode} onChange={(e) => setCreateForm(p => ({ ...p, referralCode: e.target.value }))} className="input input-bordered w-full" placeholder="Auto-generated if empty" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" className="btn btn-ghost" onClick={() => { setCreateModal(false); setCreateForm({ name: "", email: "", phoneNumber: "", referralCode: "" }); setCreateError(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={createAmbassador.isPending}>
                    {createAmbassador.isPending ? <span className="loading loading-spinner loading-sm" /> : "Create Ambassador"}
                  </button>
                </div>
              </form>
            </div>
            <div className="modal-backdrop" onClick={() => { setCreateModal(false); setCreateForm({ name: "", email: "", phoneNumber: "", referralCode: "" }); setCreateError(null); }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hub Ambassadors</h1>
          <p className="text-base-content/60 mt-1">
            {myHub?.name || "Hub"} &mdash; {ambassadors.length} ambassadors
          </p>
        </div>
        {canCreate && (
          <button className="btn btn-primary btn-sm" onClick={() => setCreateModal(true)}>
            <Icon name="add" className="w-4 h-4 mr-1" /> Create Ambassador
          </button>
        )}
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Ambassador</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Tasks</th>
                  <th>Leads</th>
                  <th>Referrals</th>
                  <th>Wallet</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ambassadors.length ? (
                  ambassadors.map((a: any) => (
                    <tr key={a.id} className="cursor-pointer hover:bg-base-200/50" onClick={() => setSelectedAmbassadorId(a.id)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {(a.user?.name || "A").charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{a.user?.name || "Unknown"}</p>
                            <p className="text-xs text-base-content/50">{a.referral_code}</p>
                          </div>
                        </div>
                      </td>
                      <td>{tierBadge(a.tier)}</td>
                      <td>{statusBadge(a.status)}</td>
                      <td>{a.stats?.approvedTasks || 0} / {a.stats?.totalTasks || 0}</td>
                      <td>{a.stats?.totalLeads || 0}</td>
                      <td>{a.stats?.totalReferrals || 0}</td>
                      <td>{formatKES(a.wallet?.current_balance)}</td>
                      <td className="text-xs text-base-content/50">
                        {a.stats?.lastCheckIn ? new Date(a.stats.lastCheckIn).toLocaleDateString() : "Never"}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button type="button" className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); setSelectedAmbassadorId(a.id); }}>
                            <Icon name="eye" className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={9} className="text-base-content/50 py-8 text-center">No ambassadors in this hub yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {createModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create Ambassador</h3>
            {createError && (
              <div className="alert alert-error mb-4">
                <span>{createError}</span>
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); setCreateError(null); createAmbassador.mutateAsync(createForm); }} className="space-y-4">
              <div>
                <label className="label"><span className="label-text">Full Name</span></label>
                <input type="text" value={createForm.name} onChange={(e) => setCreateForm(p => ({ ...p, name: e.target.value }))} className="input input-bordered w-full" required />
              </div>
              <div>
                <label className="label"><span className="label-text">Email</span></label>
                <input type="email" value={createForm.email} onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))} className="input input-bordered w-full" required />
              </div>
              <div>
                <label className="label"><span className="label-text">Phone (optional)</span></label>
                <input type="tel" value={createForm.phoneNumber} onChange={(e) => setCreateForm(p => ({ ...p, phoneNumber: e.target.value }))} className="input input-bordered w-full" />
              </div>
              <div>
                <label className="label"><span className="label-text">Referral Code (optional)</span></label>
                <input type="text" value={createForm.referralCode} onChange={(e) => setCreateForm(p => ({ ...p, referralCode: e.target.value }))} className="input input-bordered w-full" placeholder="Auto-generated if empty" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-ghost" onClick={() => { setCreateModal(false); setCreateForm({ name: "", email: "", phoneNumber: "", referralCode: "" }); setCreateError(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createAmbassador.isPending}>
                  {createAmbassador.isPending ? <span className="loading loading-spinner loading-sm" /> : "Create Ambassador"}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => { setCreateModal(false); setCreateForm({ name: "", email: "", phoneNumber: "", referralCode: "" }); setCreateError(null); }} />
        </div>
      )}
    </div>
  );
}