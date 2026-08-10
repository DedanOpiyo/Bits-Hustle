import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { analyticsAPI, payoutAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { cn } from "../utils";
import { format } from "date-fns";

const PAYOUT_STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-warning",
  APPROVED: "badge-success",
  REJECTED: "badge-error",
};

export default function FinanceDashboard() {
  const { user } = useAuth();
  const { checkAnyRole, checkPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);

  const canHandlePayouts = checkAnyRole(["FINANCE_OFFICER", "SUPER_ADMIN"]) || checkPermission("payout_requests:approve");

  const { data: financeKPIs } = useQuery({
    queryKey: ["finance-kpis"],
    queryFn: async () => {
      const resp = await analyticsAPI.getFinanceKPIs();
      return resp.data;
    },
    enabled: !!user,
  });

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ["payouts", "all"],
    queryFn: async () => {
      const resp = await payoutAPI.getPayoutRequests({ limit: 50 });
      return resp.data?.items || resp.data || [];
    },
    enabled: !!user,
  });

  const { data: ambassadorKPIs } = useQuery({
    queryKey: ["ambassador-kpis"],
    queryFn: async () => {
      const resp = await analyticsAPI.getAmbassadorKPIs();
      return resp.data;
    },
    enabled: !!user,
  });

  const reviewPayout = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await payoutAPI.reviewPayoutRequest(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      queryClient.invalidateQueries({ queryKey: ["finance-kpis"] });
      setSelectedPayout(null);
      setReviewAction(null);
      setReviewReason("");
      setReviewNotes("");
      setReviewError(null);
    },
    onError: (error: any) => {
      setReviewError(error.response?.data?.message || error.message || "Failed to review payout");
    },
  });

  const authorizePayout = useMutation({
    mutationFn: async ({ id, data }: { id: string; data?: any }) => {
      return await payoutAPI.authorizePayoutRequest(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      queryClient.invalidateQueries({ queryKey: ["finance-kpis"] });
      setSelectedPayout(null);
      setReviewAction(null);
      setReviewReason("");
      setReviewNotes("");
      setReviewError(null);
    },
    onError: (error: any) => {
      setReviewError(error.response?.data?.message || error.message || "Failed to authorize M-Pesa payout");
    },
  });

  const payouts = payoutsData || [];
  const getStatusName = (p: any) => String(p.status?.name || p.status || "").toUpperCase();
  const pendingPayouts = payouts.filter((p: any) => getStatusName(p) === "PENDING");
  const formatKES = (v: number) => "KES " + ((v || 0) as number).toLocaleString();

  if (payoutsLoading) {
    return <div className="text-base-content/50 py-8 text-center">Loading finance dashboard...</div>;
  }

  const handleReview = (payoutId: string) => {
    if (!reviewAction) return;
    if (reviewAction === "reject" && !reviewReason) return;
    setReviewError(null);
    const data = {
      action: reviewAction,
      rejectionReason: reviewAction === "reject" ? reviewReason : undefined,
      adminNotes: reviewNotes || undefined,
    };
    if (reviewAction === "approve") {
      authorizePayout.mutateAsync({ id: payoutId, data });
    } else {
      reviewPayout.mutateAsync({ id: payoutId, data });
    }
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Finance Dashboard</h1>
        <p className="text-base-content/60 mt-1">
          Monitor commissions, process payouts, and audit wallet transactions
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-primary">
            <Icon name="wallet" className="w-8 h-8" />
          </div>
          <div className="stat-title text-xs">Total Commissions</div>
          <div className="stat-value text-xl font-bold">{formatKES(financeKPIs?.totalCommissionsEarned)}</div>
        </div>
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-success">
            <Icon name="checkCircle" className="w-8 h-8" />
          </div>
          <div className="stat-title text-xs">Approved Payouts</div>
          <div className="stat-value text-xl font-bold text-success">{formatKES(financeKPIs?.totalPayoutsApproved)}</div>
        </div>
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-warning">
            <Icon name="clock" className="w-8 h-8" />
          </div>
          <div className="stat-title text-xs">Pending Payouts</div>
          <div className="stat-value text-xl font-bold text-warning">{pendingPayouts.length}</div>
        </div>
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-info">
            <Icon name="chart" className="w-8 h-8" />
          </div>
          <div className="stat-title text-xs">Avg Turnaround</div>
          <div className="stat-value text-xl font-bold">{financeKPIs?.avgTurnaroundHours || 0}h</div>
        </div>
      </div>

      {pendingPayouts.length > 0 && (
        <div className="alert alert-warning">
          <Icon name="warning" className="w-6 h-6" />
          <div>
            <h3 className="font-bold">{pendingPayouts.length} payout request(s) awaiting approval</h3>
            <p className="text-sm">Total pending: {formatKES(pendingPayouts.reduce((sum: number, p: any) => sum + (p.amount || 0), 0))}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <Icon name="payout" className="w-5 h-5" />
              Pending Payout Requests
            </h2>
            {pendingPayouts.length > 0 ? (
              <div className="space-y-3">
                {pendingPayouts.slice(0, 10).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-base-200/30 cursor-pointer hover:bg-base-200/50" onClick={() => {
    if (canHandlePayouts) {
      setSelectedPayout(p);
      setReviewAction(null);
      setReviewReason("");
      setReviewNotes("");
      setReviewError(null);
    }
  }}>
                    <div>
                      <p className="font-medium text-sm">{p.ambassador?.user?.name || "Unknown"}</p>
                      <p className="text-xs text-base-content/50">{p.method || "N/A"} &bull; {new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatKES(p.amount)}</span>
{(
                         <button
                           type="button"
                           className="btn btn-xs btn-success"
                           disabled={!canHandlePayouts || authorizePayout.isPending}
                           onClick={(e) => {
                             e.stopPropagation();
                             if (canHandlePayouts) {
                               setSelectedPayout(p);
                               setReviewAction("approve");
                               setReviewError(null);
                             }
                           }}
                         >
                           {authorizePayout.isPending ? <span className="loading loading-spinner loading-xs" /> : <Icon name="check" className="w-3 h-3 mr-1" />}
                           Finance Approve
                         </button>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base-content/50 py-8 text-center">No pending payout requests.</p>
            )}
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <Icon name="people" className="w-5 h-5" />
              Ambassador Overview
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between p-3 rounded-lg bg-base-200/30">
                <span className="text-base-content/60">Total Ambassadors</span>
                <span className="font-bold">{ambassadorKPIs?.total || 0}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-base-200/30">
                <span className="text-base-content/60">Active (30d)</span>
                <span className="font-bold text-success">{ambassadorKPIs?.active || 0}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-base-200/30">
                <span className="text-base-content/60">Avg Earnings</span>
                <span className="font-bold">{formatKES(ambassadorKPIs?.avgEarnings)}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-base-200/30">
                <span className="text-base-content/60">New (7d)</span>
                <span className="font-bold">{ambassadorKPIs?.new7d || 0}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-base-200/30">
                <span className="text-base-content/60">Retention (30d)</span>
                <span className="font-bold">{ambassadorKPIs?.retention30d || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h2 className="card-title mb-4">
            <Icon name="history" className="w-5 h-5" />
            Recent Payout Activity
          </h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Ambassador</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Reviewed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.slice(0, 20).map((p: any) => (
                  <tr key={p.id} className={cn("cursor-pointer hover:bg-base-200/50", getStatusName(p) === "PENDING" && "bg-warning/5")}>
                    <td className="font-medium">{p.ambassador?.user?.name || "Unknown"}</td>
                    <td>{formatKES(p.amount)}</td>
                    <td className="text-sm">{p.method || "N/A"}</td>
                    <td><span className={cn("badge", PAYOUT_STATUS_COLORS[p.status?.name] || "badge-neutral", "badge-sm")}>{p.status?.display_name || p.status?.name}</span></td>
                    <td className="text-xs text-base-content/50">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="text-xs text-base-content/50">{p.reviewed_at ? format(new Date(p.reviewed_at), "MMM d") : "—"}</td>
                    <td>
                      {getStatusName(p) === "PENDING" && (
                        <button
                          type="button"
                          className="btn btn-xs btn-success"
                          disabled={authorizePayout.isPending}
                          onClick={() => { setSelectedPayout(p); setReviewAction("approve"); setReviewError(null); }}
                        >
                          {authorizePayout.isPending ? <span className="loading loading-spinner loading-xs" /> : <Icon name="check" className="w-3 h-3 mr-1" />}
                          Finance Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedPayout && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Review Payout Request</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label"><span className="label-text">Ambassador</span></label>
                  <p className="font-medium">{selectedPayout.ambassador?.user?.name || "Unknown"}</p>
                </div>
                <div>
                  <label className="label"><span className="label-text">Amount</span></label>
                  <p className="font-bold text-lg">{formatKES(selectedPayout.amount)}</p>
                </div>
                <div>
                  <label className="label"><span className="label-text">Method</span></label>
                  <p>{selectedPayout.method || "N/A"}</p>
                </div>
                <div>
                  <label className="label"><span className="label-text">Wallet Balance</span></label>
                  <p>{formatKES(selectedPayout.ambassador?.wallet?.current_balance)}</p>
                </div>
              </div>

              {selectedPayout.details && (
                <div>
                  <label className="label"><span className="label-text">Payment Details</span></label>
                  <p className="text-sm bg-base-200/30 p-3 rounded">{selectedPayout.details}</p>
                </div>
              )}

{canHandlePayouts ? (
                 <>
                   <div className="divider" />
                   <div className="space-y-3">
                     <label className="label"><span className="label-text font-medium">Action</span></label>
                     <div className="flex gap-4">
                       <button type="button" className={cn("btn", reviewAction === "approve" ? "btn-success" : "btn-outline")} onClick={() => setReviewAction("approve")}>
                         <Icon name="check" className="w-4 h-4 mr-1" /> Approve
                       </button>
                       <button type="button" className={cn("btn", reviewAction === "reject" ? "btn-error" : "btn-outline")} onClick={() => setReviewAction("reject")}>
                         <Icon name="close" className="w-4 h-4 mr-1" /> Reject
                       </button>
                     </div>

                     {reviewAction === "reject" && (
                       <div>
                         <label className="label"><span className="label-text">Rejection Reason (Required)</span></label>
                         <textarea value={reviewReason} onChange={(e) => setReviewReason(e.target.value)} className="textarea textarea-bordered w-full" rows={2} placeholder="Provide a reason for rejection..." />
                       </div>
                     )}

                     <div>
                       <label className="label"><span className="label-text">Admin Notes (Optional)</span></label>
                       <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} className="textarea textarea-bordered w-full" rows={2} placeholder="Internal notes..." />
                     </div>

                     {reviewAction && (
                       <div className="flex gap-2 justify-end">
                         <button className="btn btn-ghost" onClick={() => { setSelectedPayout(null); setReviewAction(null); }}>{'Cancel'}</button>
                         <button className={cn("btn", reviewAction === "approve" ? "btn-success" : "btn-error")} disabled={(reviewAction === "reject" && !reviewReason) || reviewPayout.isPending || authorizePayout.isPending} onClick={() => handleReview(selectedPayout.id)}>
                           {(reviewPayout.isPending || authorizePayout.isPending) && <span className="loading loading-spinner loading-sm mr-2" />}
                           Confirm {reviewAction === "approve" ? "Finance Approval & M-Pesa Payout" : "Rejection"}
                         </button>
                       </div>
                     )}
                     {reviewError && <div className="alert alert-error text-sm"><span>{reviewError}</span></div>}
                   </div>
                 </>
               ) : (
                 <p className="text-error text-center">You do not have permission to approve or reject payouts.</p>
               )}
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => { setSelectedPayout(null); setReviewAction(null); }} />
        </div>
      )}
    </div>
  );
}
