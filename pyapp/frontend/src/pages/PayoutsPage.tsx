import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { platformAPI, payoutAPI, ambassadorAPI, walletAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { cn } from "../utils";

const MIN_PAYOUT_THRESHOLD = 500;

function validateMpesaPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return null;
  if (digits.startsWith("7") && digits.length === 9) return null;
  if (digits.startsWith("254") && digits.length === 12) return null;
  return "Enter a valid M-Pesa number (e.g. 0712XXXXXX or 254712XXXXXX)";
}

function parsePayoutDetails(details: unknown): Record<string, unknown> | string | null {
  if (!details) return null;
  if (typeof details === "object") return details as Record<string, unknown>;
  if (typeof details !== "string") return String(details);

  try {
    const parsed = JSON.parse(details);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return details;
  }

  return details;
}

function getPayoutAccount(details: unknown): string {
  const parsedDetails = parsePayoutDetails(details);
  if (parsedDetails && typeof parsedDetails === "object") {
    const account = parsedDetails.account;
    if (typeof account === "string" && account.trim()) return account;
    const phone = parsedDetails.phone;
    if (typeof phone === "string" && phone.trim()) return phone;
  }
  if (typeof parsedDetails === "string") return parsedDetails;
  return "";
}

function getPayoutDetailsSummary(details: unknown): string {
  const parsedDetails = parsePayoutDetails(details);
  if (!parsedDetails) return "—";
  if (typeof parsedDetails === "string") return parsedDetails;

  const account = typeof parsedDetails.account === "string" ? parsedDetails.account : "";
  const phone = typeof parsedDetails.phone === "string" ? parsedDetails.phone : "";
  const b2c = parsedDetails.b2c && typeof parsedDetails.b2c === "object"
    ? (parsedDetails.b2c as Record<string, unknown>).ConversationID || (parsedDetails.b2c as Record<string, unknown>).ResponseDescription || "B2C sent"
    : "";

  return [account || phone, b2c ? `B2C: ${String(b2c)}` : ""]
    .filter(Boolean)
    .join(" | ") || "—";
}

function getB2CStatusBadge(details: unknown): { label: string; className: string } | null {
  const parsed = parsePayoutDetails(details);
  if (!parsed || typeof parsed !== "object") return null;
  const status = typeof parsed.b2c_status === "string" ? parsed.b2c_status : "";
  if (!status) return null;
  if (status === "COMPLETED") return { label: "Completed", className: "badge-success" };
  if (status === "FAILED") return { label: "Failed", className: "badge-error" };
  if (status === "TIMEOUT") return { label: "Timed Out", className: "badge-warning" };
  if (status === "AWAITING_CALLBACK") return { label: "Processing", className: "badge-info" };
  return { label: status, className: "badge-neutral" };
}

function getPayoutMethodLabel(method: unknown): string {
  if (method === "mpesa_b2c" || method === "b2c") return "M-Pesa B2C";
  if (method === "mpesa") return "M-Pesa B2C";
  if (method === "bank") return "Bank Transfer";
  return typeof method === "string" ? method : "";
}

export default function PayoutsPage() {
  const { user } = useAuth();
  const { checkPermission, checkAnyPermission } = usePermissions();
  const queryClient = useQueryClient();

  const canViewPayouts = user && checkPermission('payout_requests:read');
  const canCreatePayouts = user && checkPermission('payout_requests:create');
  const canApprovePayouts = user && checkAnyPermission(['payout_requests:approve', 'payout_requests:reject']);
  const canEditPayouts = user && checkPermission('payout_requests:update');

  if (!canViewPayouts) {
    return <div className="text-error">You don't have permission to view payouts</div>;
  }

  const { data: payouts, isLoading, error } = useQuery({
    queryKey: ["payouts"],
    queryFn: async () => {
      const response = await payoutAPI.getPayoutRequests({});
      return response.data?.items || [];
    },
  });

  const { data: platforms } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const response = await platformAPI.getPlatforms();
      return Array.isArray(response.data) ? response.data : response.data?.items || [];
    },
  });

  const [newPayout, setNewPayout] = useState({ amount: "", method: "mpesa_b2c", account: "", platformId: "" });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch the requesting user's wallet to surface their current balance and
  // the maximum amount they are allowed to withdraw.
  const ambassadorId = user?.ambassador_profile?.id || user?.ambassador_id || null;
  const { data: walletData } = useQuery({
    queryKey: ["payouts-wallet", ambassadorId],
    queryFn: async () => {
      const walletResponse = await ambassadorAPI.getWallet(ambassadorId);
      if (!walletResponse.data?.id) return null;
      const details = await walletAPI.getWalletDetails(walletResponse.data.id);
      return details.data;
    },
    enabled: !!ambassadorId && !!canCreatePayouts,
  });

  // State for edit modal
  const [editPayoutId, setEditPayoutId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    amount: "",
    method: "",
    account: "",
    platformId: "",
    phone: ""
  });

  const currentBalance = walletData?.current_balance || 0;
  const pendingEarnings = walletData?.pending_earnings || 0;
  const maxWithdrawable = Math.max(0, currentBalance - pendingEarnings);
  const requestedAmount = parseFloat(newPayout.amount) || 0;

  const [appealPayoutId, setAppealPayoutId] = useState<string | null>(null);
  const [appealReason, setAppealReason] = useState("");

  // State for view modal
  const [viewPayoutId, setViewPayoutId] = useState<string | null>(null);
  const [viewPayoutData, setViewPayoutData] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);

// State for review modal
  const [reviewPayoutId, setReviewPayoutId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isReviewProcessing, setIsReviewProcessing] = useState(false);

  const createPayout = useMutation({
    mutationFn: async (data: { amount: number; method: string; platformId: string; details: { account: string; phone?: string } }) => {
      await payoutAPI.createPayoutRequest(data);
    },
    onSuccess: () => {
      setNewPayout({ amount: "", method: "mpesa_b2c", account: "", platformId: "" });
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || "An error occurred";
      setFormError(msg);
    },
  });

  const appealPayout = useMutation({
    mutationFn: async (data: { id: string; reason: string }) => {
      await payoutAPI.appealPayoutRequest(data.id, { reason: data.reason });
    },
    onSuccess: () => {
      setAppealPayoutId(null);
      setAppealReason("");
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || "An error occurred";
      setFormError(msg);
    },
  });

  // Mutation for reviewing payout requests
  const reviewPayout = useMutation({
    mutationFn: async (data: { id: string; action: 'approve' | 'reject'; reason?: string }) => {
      const reviewData = {
        action: data.action,
        ...(data.action === 'reject' && data.reason ? { rejectionReason: data.reason } : {}),
      };

      if (data.action === 'approve') {
        await payoutAPI.authorizePayoutRequest(data.id, reviewData);
      } else {
        await payoutAPI.reviewPayoutRequest(data.id, reviewData);
      }
    },
    onSuccess: () => {
      setReviewPayoutId(null);
      setReviewAction(null);
      setReviewReason("");
      setReviewError(null);
      setIsReviewProcessing(false);
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "An error occurred";
      setReviewError(message);
      setIsReviewProcessing(false);
    },
  });

  // Function to fetch payout details for viewing
  const fetchPayoutDetails = async (id: string) => {
    setViewLoading(true);
    try {
      if (payouts) {
        const payout = payouts.find((p: any) => p.id === id);
        if (payout) {
          setViewPayoutData(payout);
        }
      }
    } catch (err) {
      console.error('Error fetching payout details:', err);
    } finally {
      setViewLoading(false);
    }
  };

// Function to fetch payout details for editing
  const fetchPayoutDetailsForEdit = async (id: string) => {
    setEditLoading(true);
    setEditFormError(null);
    try {
      const response = await payoutAPI.getPayoutRequests({ id });
      const payouts = response.data?.items || [];
      if (payouts.length > 0) {
        const payout = payouts[0];
        
        // Parse details for form
        const details = parsePayoutDetails(payout.details);
        let account = "";
        let phone = "";
        
        if (typeof details === "object" && details !== null) {
          account = (details.account ?? "").toString();
          phone = ((details.phone ?? details.account) ?? "").toString();
        } else if (typeof details === "string") {
          account = details.toString();
        }
        
        setEditFormData({
          amount: payout.amount?.toString() || "",
          method: payout.method || "",
          account: account,
          platformId: payout.platformId || "",
          phone: phone
        });
      }
    } catch (err) {
      console.error('Error fetching payout details for edit:', err);
      setEditFormError('Failed to load payout details');
    } finally {
      setEditLoading(false);
    }
  };

// Function to update a payout request
   const updatePayout = useMutation({
     mutationFn: async (data: { 
       id: string; 
       amount: number; 
       method: string; 
       account: string; 
       platformId: string;
       phone?: string
     }) => {
       // Prepare details based on method
       let details: any;
       if (data.method === "mpesa_b2c") {
         details = { phone: data.phone };
       } else {
         details = { account: data.account };
       }
       
       await payoutAPI.updatePayoutRequest(data.id, {
         amount: data.amount,
         method: data.method,
         platformId: data.platformId,
         details: details
       });
     },
     onSuccess: () => {
       setEditPayoutId(null);
       setEditFormData({
         amount: "",
         method: "",
         account: "",
         platformId: "",
         phone: ""
       });
       setFormError(null);
       queryClient.invalidateQueries({ queryKey: ["payouts"] });
     },
     onError: (error: any) => {
       const msg = error.response?.data?.message || error.message || "An error occurred";
       setEditFormError(msg);
     },
   });

  if (isLoading) return null;
  if (error) return <div className="text-error">Failed to load payouts</div>;

  return (
    <>
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h2 className="card-title mb-4">Payouts</h2>

          {canCreatePayouts && (
            <div className="card bg-base-100 border border-base-300 shadow-sm mb-6">
              <div className="card-body">
                <h3 className="card-title">Request New Payout</h3>

                {/* Wallet balance + maximum withdrawable */}
                <div className="stats stats-vertical sm:stats-horizontal shadow-sm bg-base-200 mb-4 w-full">
                  <div className="stat">
                    <div className="stat-title">Current Balance</div>
                    <div className="stat-value text-primary text-2xl">KES {Number(currentBalance).toLocaleString()}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Pending Earnings</div>
                    <div className="stat-value text-warning text-2xl">KES {Number(pendingEarnings).toLocaleString()}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Max Withdrawable</div>
                    <div className="stat-value text-success text-2xl">KES {Number(maxWithdrawable).toLocaleString()}</div>
                  </div>
                </div>

                {formError && (
                  <div className="alert alert-error mb-4">
                    <span>{formError}</span>
                  </div>
                )}
                <form onSubmit={(e) => {
                  e.preventDefault();
                  setFormError(null);
                  const amount = parseFloat(newPayout.amount);
                  if (isNaN(amount) || amount < MIN_PAYOUT_THRESHOLD) {
                    setFormError(`Minimum payout amount is KES ${MIN_PAYOUT_THRESHOLD.toLocaleString()}`);
                    return;
                  }
                  if (amount > maxWithdrawable) {
                    setFormError(`Amount exceeds your maximum withdrawable balance of KES ${Number(maxWithdrawable).toLocaleString()}`);
                    return;
                  }
                  if (newPayout.method === "mpesa_b2c") {
                    const phoneError = validateMpesaPhone(newPayout.account);
                    if (phoneError) {
                      setFormError(phoneError);
                      return;
                    }
                  }
                  createPayout.mutateAsync({
                    amount,
                    method: newPayout.method,
                    platformId: newPayout.platformId,
                    details: {
                      account: newPayout.account,
                      ...(newPayout.method === "mpesa_b2c" ? { phone: newPayout.account } : {}),
                    },
                  });
                }} className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text">Amount (KES)</span>
                    </label>
                      <input
                        type="number"
                        value={newPayout.amount}
                        onChange={(e) => setNewPayout((p) => ({ ...p, amount: e.target.value }))}
                        className="input input-bordered w-full bg-base-100"
                         min={MIN_PAYOUT_THRESHOLD}
                         max={maxWithdrawable || undefined}
                         required
                       />
                       <label className="label">
                         <span className="label-text-alt text-base-content/50">
                           Minimum: KES {MIN_PAYOUT_THRESHOLD.toLocaleString()}
                           {maxWithdrawable > 0 && ` · Max: KES ${Number(maxWithdrawable).toLocaleString()}`}
                         </span>
                       </label>
                       {requestedAmount > 0 && (
                         <label className="label">
                           <span className={cn(
                             "label-text-alt",
                             requestedAmount > maxWithdrawable ? "text-error" : "text-success",
                           )}>
                             {requestedAmount > maxWithdrawable
                               ? `Exceeds max by KES ${Number(requestedAmount - maxWithdrawable).toLocaleString()}`
                               : `Remaining after payout: KES ${Number(maxWithdrawable - requestedAmount).toLocaleString()}`}
                           </span>
                         </label>
                       )}
                   </div>
                  <div>
                    <label className="label">
                      <span className="label-text">Method</span>
                    </label>
                     <select
                       value={newPayout.method}
                       onChange={(e) => setNewPayout((p) => ({ ...p, method: e.target.value }))}
                       className="select select-bordered w-full bg-base-100"
                       required
                     >
                       <option value="mpesa_b2c">M-Pesa B2C</option>
                       <option value="bank">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text">Platform</span>
                    </label>
                    <select
                      value={newPayout.platformId}
                      onChange={(e) => setNewPayout((p) => ({ ...p, platformId: e.target.value }))}
                      className="select select-bordered w-full bg-base-100"
                      required
                    >
                      <option value="">Select Platform</option>
                      {(platforms || []).map((platform: any) => (
                        <option key={platform.id} value={platform.id}>
                          {platform.display_name || platform.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text">{newPayout.method === "mpesa_b2c" ? "M-Pesa Phone Number" : "Account Details"}</span>
                    </label>
                     <input
                       type="text"
                       value={newPayout.account}
                       onChange={(e) => setNewPayout((p) => ({ ...p, account: e.target.value }))}
                       className="input input-bordered w-full bg-base-100"
                      placeholder={newPayout.method === "mpesa_b2c" ? "2547XXXXXXXX" : "Account Number"}
                      required
                    />
                  </div>
                  <div className="md:col-span-2 xl:col-span-4">
                    <button type="submit" className="btn btn-primary" disabled={createPayout.isPending}>
                      {createPayout.isPending ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        <><Icon name="add" className="w-4 h-4 mr-1" /> Request Payout</>
                      )}
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
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Platform</th>
                  <th>Status</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts?.length ? (
                  payouts.map((p: any) => {
                    const statusName = p.status?.name?.toLowerCase() || p.status?.toLowerCase() || "";
                    const isRejected = statusName === "rejected";
                    const isAppealing = appealPayoutId === p.id;
                    const isViewing = viewPayoutId === p.id;
                    const isReviewing = reviewPayoutId === p.id;
                    
                    return (
                      <tr key={p.id}>
                        <td>{new Date(p.created_at).toLocaleDateString()}</td>
                        <td>KES {p.amount?.toLocaleString()}</td>
                        <td>{getPayoutMethodLabel(p.method)}</td>
                        <td>{p.platform?.display_name || p.platform?.name || "—"}</td>
                         <td>
                           <div className="flex flex-col gap-1">
                             <span className={"badge " + (statusName === "approved" ? "badge-success" : isRejected ? "badge-error" : statusName === "failed" ? "badge-error" : statusName === "completed" ? "badge-success" : "badge-neutral")}>
                               {p.status?.display_name || p.status?.name || p.status || "PENDING"}
                             </span>
                             {getB2CStatusBadge(p.details) && (
                               <span className={"badge badge-sm " + getB2CStatusBadge(p.details)!.className}>
                                 {getB2CStatusBadge(p.details)!.label}
                               </span>
                             )}
                           </div>
                         </td>
                        <td>
                          <span className="text-xs max-w-xs block" title={getPayoutDetailsSummary(p.details)}>
                            {getPayoutDetailsSummary(p.details)}
                          </span>
                          {isRejected && p.rejection_reason && (
                            <span className="text-error text-xs max-w-xs block mt-1" title={p.rejection_reason}>
                              {p.rejection_reason}
                            </span>
                          )}
                        </td>
                        <td>
{/* Action Buttons */}
                           <div className="space-y-2 mb-2">
                             <button
                               className="btn btn-xs btn-primary"
                               onClick={() => {
                                 setViewPayoutId(p.id);
                                 fetchPayoutDetails(p.id);
                               }}
                               disabled={isViewing}
                             >
                               {isViewing ? (
                                 <span className="loading loading-spinner loading-xs" />
                               ) : (
                                 <Icon name="file" className="w-4 h-4 mr-1" />
                               )} View
                             </button>
{canEditPayouts && statusName === "pending" && (
                                <button
                                  className="btn btn-xs btn-warning"
                                  onClick={() => {
                                    setEditPayoutId(p.id);
                                    fetchPayoutDetailsForEdit(p.id);
                                  }}
                                  disabled={editLoading}
                                >
                                  {editLoading ? (
                                    <span className="loading loading-spinner loading-xs" />
                                  ) : (
                                    <Icon name="edit" className="w-4 h-4 mr-1" />
                                  )} Edit
                                </button>
                              )}
                             {canApprovePayouts && statusName === "pending" && (
                               <div className="flex flex-wrap gap-1">
                                 <button
                                   className="btn btn-xs btn-success"
                                   onClick={() => {
                                     setReviewPayoutId(p.id);
                                     setReviewAction('approve');
                                     setReviewReason("");
                                     setReviewError("");
                                   }}
                                   disabled={isReviewing}
                                 >
                                   {isReviewing ? (
                                     <span className="loading loading-spinner loading-xs" />
                                   ) : (
                                     <Icon name="check" className="w-4 h-4 mr-1" />
                                   )} Finance Approve
                                 </button>
                                 <button
                                   className="btn btn-xs btn-info"
                                   onClick={() => {
                                     setReviewPayoutId(p.id);
                                     setReviewAction(null);
                                     setReviewReason("");
                                     setReviewError("");
                                   }}
                                   disabled={isReviewing}
                                 >
                                   <Icon name="edit" className="w-4 h-4 mr-1" /> Review
                                 </button>
                               </div>
                             )}
                           </div>
                          
                          {/* Existing Appeal UI */}
                          {isRejected && !isAppealing && (
                            <button
                              className="btn btn-warning btn-xs"
                              onClick={() => setAppealPayoutId(p.id)}
                            >
                              Appeal
                            </button>
                          )}
                          {isAppealing && (
                            <div className="flex gap-2 items-center">
                              <input
                                 type="text"
                                 value={appealReason}
                                 onChange={(e) => setAppealReason(e.target.value)}
                                 placeholder="Appeal reason..."
                                 className="input input-bordered input-xs input-sm w-40 bg-base-100"
                               />
                              <button
                                className="btn btn-success btn-xs"
                                disabled={!appealReason || appealPayout.isPending}
                                onClick={() => appealPayout.mutateAsync({ id: p.id, reason: appealReason })}
                              >
                                {appealPayout.isPending ? <span className="loading loading-spinner loading-xs" /> : "Submit"}
                              </button>
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => { setAppealPayoutId(null); setAppealReason(""); }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-base-content/50 py-8 text-center">
                      No payouts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Payout Modal */}
      {viewPayoutId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="relative bg-base-100 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">Payout Details</h3>
              <button
                onClick={() => {
                  setViewPayoutId(null);
                  setViewPayoutData(null);
                }}
                className="btn btn-ghost btn-sm"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
            
            {viewLoading ? (
              <div className="text-center py-8">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : (
              <div className="space-y-4">
                {!viewPayoutData ? (
                  <p className="text-base-content/50 text-center">Loading payout details...</p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Date:</span>
                        <span className="text-base-content/60">{new Date(viewPayoutData.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Amount:</span>
                        <span className="font-bold text-primary">KES {viewPayoutData.amount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Method:</span>
                        <span className="text-base-content/60">{getPayoutMethodLabel(viewPayoutData.method)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Platform:</span>
                        <span className="text-base-content/60">
                          {viewPayoutData.platform?.display_name || viewPayoutData.platform?.name || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Account Details:</span>
                        <span className="text-base-content/60">{getPayoutAccount(viewPayoutData.details)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Status:</span>
                        <div className="flex gap-1">
                          <span className={"badge " + (viewPayoutData.status?.name?.toLowerCase() === "approved" ? "badge-success" : viewPayoutData.status?.name?.toLowerCase() === "rejected" ? "badge-error" : viewPayoutData.status?.name?.toLowerCase() === "failed" ? "badge-error" : viewPayoutData.status?.name?.toLowerCase() === "completed" ? "badge-success" : "badge-neutral")}>
                            {viewPayoutData.status?.display_name || viewPayoutData.status?.name || viewPayoutData.status || "PENDING"}
                          </span>
                          {getB2CStatusBadge(viewPayoutData.details) && (
                            <span className={"badge " + getB2CStatusBadge(viewPayoutData.details)!.className}>
                              {getB2CStatusBadge(viewPayoutData.details)!.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {(() => {
                        const parsed = parsePayoutDetails(viewPayoutData.details);
                        if (parsed && typeof parsed === "object" && parsed.b2c_transaction_id) {
                          return (
                            <div className="mt-2 p-3 bg-base-200 rounded">
                              <span className="font-medium text-sm block">M-Pesa Transaction:</span>
                              <p className="text-sm font-mono">{String(parsed.b2c_transaction_id)}</p>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {(() => {
                        const parsed = parsePayoutDetails(viewPayoutData.details);
                        if (parsed && typeof parsed === "object" && parsed.b2c_callback && typeof parsed.b2c_callback === "object") {
                          const cb = parsed.b2c_callback as Record<string, unknown>;
                          const resultDesc = typeof cb.ResultDesc === "string" ? cb.ResultDesc : "";
                          const resultCode = typeof cb.ResultCode === "number" ? cb.ResultCode : -1;
                          if (resultCode !== 0 && resultDesc) {
                            return (
                              <div className="mt-2 p-3 bg-error/10 rounded">
                                <span className="font-medium text-sm block">B2C Error:</span>
                                <p className="text-error text-sm">{resultDesc}</p>
                              </div>
                            );
                          }
                        }
                        return null;
                      })()}
                      
                      {viewPayoutData.rejection_reason && (
                        <div className="mt-4 p-4 bg-error/10 rounded">
                          <span className="font-medium mb-2 block">Rejection Reason:</span>
                          <p className="text-error text-sm">{viewPayoutData.rejection_reason}</p>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="font-medium">Details:</span>
                        <span className="text-base-content/60 text-right max-w-xs">{getPayoutDetailsSummary(viewPayoutData.details)}</span>
                      </div>

                      {viewPayoutData.reviewed_at && (
                        <div className="mt-4 p-4 bg-base-200 rounded">
                          <span className="font-medium mb-2 block">Review Info:</span>
                          <p className="text-sm">
                            Reviewed: {new Date(viewPayoutData.reviewed_at).toLocaleString()} by {viewPayoutData.reviewed_by?.user?.name || 'Unknown Reviewer'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

{/* Review Payout Modal */}
       {reviewPayoutId && (
         <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
           <div className="relative bg-base-100 rounded-lg shadow-xl w-full max-w-md p-6">
             <div className="flex justify-between items-start mb-4">
               <h3 className="text-lg font-bold">Review Payout Request</h3>
               <button
                 onClick={() => {
                   setReviewPayoutId(null);
                   setReviewAction(null);
                   setReviewReason("");
                   setReviewError(null);
                 }}
                 className="btn btn-ghost btn-sm"
               >
                 <Icon name="x" className="w-4 h-4" />
               </button>
             </div>
             
             <form onSubmit={(e) => {
               e.preventDefault();
               if (!reviewAction) {
                 setReviewError("Please select an action (Approve or Reject)");
                 return;
               }
               
               if (reviewAction === 'reject' && !reviewReason.trim()) {
                 setReviewError("Please provide a reason for rejection");
                 return;
               }
               
               setReviewError(null);
               setIsReviewProcessing(true);
               reviewPayout.mutateAsync({
                 id: reviewPayoutId,
                 action: reviewAction,
                 reason: reviewAction === 'reject' ? reviewReason : undefined
               });
             }} className="space-y-4">
               {/* Payout Info */}
               <div className="border border-base-300 rounded p-4 mb-4">
                 <div className="space-y-2">
                   <div className="flex justify-between">
                     <span className="font-medium">Amount:</span>
                     <span className="font-bold text-primary">KES {payouts?.find((p: any) => p.id === reviewPayoutId)?.amount?.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="font-medium">Method:</span>
                     <span className="text-base-content/60">{getPayoutMethodLabel(payouts?.find((p: any) => p.id === reviewPayoutId)?.method)}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="font-medium">Platform:</span>
                     <span className="text-base-content/60">
                       {payouts?.find((p: any) => p.id === reviewPayoutId)?.platform?.display_name ||
                         payouts?.find((p: any) => p.id === reviewPayoutId)?.platform?.name ||
                         "—"}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="font-medium">Account:</span>
                         <span className="text-base-content/60">
                           {getPayoutAccount(payouts?.find((p: any) => p.id === reviewPayoutId)?.details)}
                         </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="font-medium">Status:</span>
                     <span className={"badge badge-neutral"}>PENDING (Awaiting Review)</span>
                   </div>
                 </div>
               </div>
               
               {/* Action Selection */}
               <div className="space-y-2">
                 <label className="label"><span className="label-text">Action</span></label>
                 <div className="flex gap-4">
                   <button
                     type="button"
                     className={cn("btn w-1/2", reviewAction === 'approve' ? "btn-success" : "btn-outline")}
                     onClick={() => setReviewAction('approve')}
                     disabled={isReviewProcessing}
                   >
                     <Icon name="check" className="w-4 h-4 mr-1" /> Approve
                   </button>
                   <button
                     type="button"
                     className={cn("btn w-1/2", reviewAction === 'reject' ? "btn-error" : "btn-outline")}
                     onClick={() => setReviewAction('reject')}
                     disabled={isReviewProcessing}
                   >
                     <Icon name="x" className="w-4 h-4 mr-1" /> Reject
                   </button>
                 </div>
               </div>
               
               {/* Rejection Reason (only show when reject is selected) */}
               {reviewAction === 'reject' && (
                 <div className="space-y-2">
                   <label className="label"><span className="label-text">Rejection Reason (Required)</span></label>
                   <textarea
                     value={reviewReason}
                     onChange={(e) => setReviewReason(e.target.value)}
                     placeholder="Please provide a reason for rejection"
                     className="textarea textarea-bordered w-full bg-base-100"
                     rows={3}
                     required
                     disabled={isReviewProcessing}
                   />
                   {reviewError && (
                     <p className="text-error text-xs mt-1">{reviewError}</p>
                   )}
                 </div>
               )}
               
               {/* Submit Button */}
               <div className="flex justify-end">
                 <button
                   type="button"
                   className="btn btn-outline btn-secondary mr-2"
                   onClick={() => {
                     setReviewPayoutId(null);
                     setReviewAction(null);
                     setReviewReason("");
                     setReviewError(null);
                   }}
                   disabled={isReviewProcessing}
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   className="btn btn-primary"
                   disabled={isReviewProcessing || !reviewAction || (reviewAction === 'reject' && !reviewReason.trim())}
                 >
                   {isReviewProcessing ? (
                     <span className="loading loading-spinner loading-sm" />
                   ) : (
                     <>
                       <Icon name="check" className="w-4 h-4 mr-1" />
                       {reviewAction === 'approve' ? 'Confirm Finance Approval & M-Pesa Payout' : 'Confirm Rejection'}
                     </>
                   )}
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}
       
       {/* Edit Payout Modal */}
       {editPayoutId && (
         <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
           <div className="relative bg-base-100 rounded-lg shadow-xl w-full max-w-md p-6">
             <div className="flex justify-between items-start mb-4">
               <h3 className="text-lg font-bold">Edit Payout Request</h3>
<button
                  onClick={() => {
                    setEditPayoutId(null);
                    setEditFormData({
                      amount: "",
                      method: "",
                      account: "",
                      platformId: "",
                      phone: ""
                    });
                    setEditFormError(null);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  <Icon name="x" className="w-4 h-4" />
                </button>
             </div>
             
             {editLoading ? (
               <div className="text-center py-8">
                 <span className="loading loading-spinner loading-lg" />
               </div>
             ) : (
               <form onSubmit={(e) => {
                 e.preventDefault();
                 setEditFormError(null);
                 
                 // Validate form
                 const amount = parseFloat(editFormData.amount);
                 if (isNaN(amount) || amount <= 0) {
                   setEditFormError("Please enter a valid amount");
                   return;
                 }
                 
                 if (!editFormData.method) {
                   setEditFormError("Please select a method");
                   return;
                 }
                 
                 if (!editFormData.account && !editFormData.phone) {
                   setEditFormError("Please provide account details");
                   return;
                 }
                 
                 if (!editFormData.platformId) {
                   setEditFormError("Please select a platform");
                   return;
                 }
                 
// Prepare details based on method
                  if (editFormData.method === "mpesa_b2c") {
                    // For M-Pesa, we'll pass phone as account in the details
                  } else {
                    // For bank transfer, we'll pass account in the details
                  }
                 
                 updatePayout.mutateAsync({
                   id: editPayoutId,
                   amount: amount,
                   method: editFormData.method,
                   account: editFormData.account,
                   platformId: editFormData.platformId,
                   phone: editFormData.phone
                 });
               }} className="space-y-4">
                 <div>
                   <label className="label"><span className="label-text">Amount (KES)</span></label>
                   <input
                     type="number"
                     value={editFormData.amount}
                     onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                     className="input input-bordered w-full bg-base-100"
                     min={MIN_PAYOUT_THRESHOLD}
                     required
                   />
                   {parseFloat(editFormData.amount) > 0 && (
                     <p className="text-xs text-base-content/50">
                       Minimum: KES {MIN_PAYOUT_THRESHOLD.toLocaleString()}
                     </p>
                   )}
                 </div>
                 
                 <div>
                   <label className="label"><span className="label-text">Method</span></label>
                   <select
                     value={editFormData.method}
                     onChange={(e) => setEditFormData(prev => ({ ...prev, method: e.target.value }))}
                     className="select select-bordered w-full bg-base-100"
                     required
                   >
                     <option value="mpesa_b2c">M-Pesa B2C</option>
                     <option value="bank">Bank Transfer</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className="label"><span className="label-text">Platform</span></label>
                   <select
                     value={editFormData.platformId}
                     onChange={(e) => setEditFormData(prev => ({ ...prev, platformId: e.target.value }))}
                     className="select select-bordered w-full bg-base-100"
                     required
                   >
                     <option value="">Select Platform</option>
                     {(platforms || []).map((platform: any) => (
                       <option key={platform.id} value={platform.id}>
                         {platform.display_name || platform.name}
                       </option>
                     ))}
                   </select>
                 </div>
                 
<div>
                    <label className="label"><span className="label-text">
                      {editFormData.method === "mpesa_b2c" ? "M-Pesa Phone Number" : "Account Details"}
                    </span></label>
                   <input
                     type="text"
                     value={editFormData.account}
                     onChange={(e) => setEditFormData(prev => ({ ...prev, account: e.target.value }))}
                     className="input input-bordered w-full bg-base-100"
                     placeholder={editFormData.method === "mpesa_b2c" ? "2547XXXXXXXX" : "Account Number"}
                     required
                   />
                   {editFormData.method === "mpesa_b2c" && (
                     <p className="text-xs text-base-content/50">
                       Format: 2547XXXXXXXX
                     </p>
                   )}
                 </div>
                 
                 {editFormData.method === "mpesa_b2c" && (
                   <div>
                     <label className="label"><span className="label-text">Phone Number (Alternative)</span></label>
                     <input
                       type="text"
                       value={editFormData.phone}
                       onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                       className="input input-bordered w-full bg-base-100"
                       placeholder="Alternative phone number"
                     />
                   </div>
                 )}
                 
                 {editFormError && (
                   <div className="alert alert-error mt-4">
                     <span>{editFormError}</span>
                   </div>
                 )}
                 
<div className="flex justify-end">
                    <button
                      type="button"
                      className="btn btn-outline btn-secondary mr-2"
                      onClick={() => {
                        setEditPayoutId(null);
                        setEditFormData({
                          amount: "",
                          method: "",
                          account: "",
                          platformId: "",
                          phone: ""
                        });
                        setEditFormError(null);
                      }}
                      disabled={updatePayout.isPending}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={updatePayout.isPending || !editFormData.amount || !editFormData.method || (!editFormData.account && !editFormData.phone) || !editFormData.platformId}
                    >
                      {updatePayout.isPending ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        <>
                          <Icon name="save" className="w-4 h-4 mr-1" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
               </form>
             )}
           </div>
         </div>
       )}
     </>
   );
 }
