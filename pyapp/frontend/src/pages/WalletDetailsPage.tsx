import { useQuery } from "@tanstack/react-query";
import { ambassadorAPI, walletAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { cn } from "../utils";

export default function WalletDetailsPage() {
  const { user } = useAuth();
  const { checkPermission, checkRole } = usePermissions();

  const canViewWallet = !!user && (checkPermission("wallet:read") || checkRole("AMBASSADOR"));

  if (!canViewWallet) {
    return <div className="text-error">You don't have permission to view wallet details</div>;
  }

  const ambassadorId = user?.ambassador_profile?.id || user?.ambassador_id || null;

  if (!ambassadorId) {
    return <div className="text-error text-center py-8">You must be an ambassador to view wallet details</div>;
  }

  const { data: walletData, isLoading: walletLoading, error: walletError } = useQuery({
      queryKey: ["wallet-details", ambassadorId],
      queryFn: async () => {
          const response = await ambassadorAPI.getWallet(ambassadorId);
          if (!response.data?.id) throw new Error("Wallet not found");
          const details = await walletAPI.getWalletDetails(response.data.id);
          return details.data;
      },
      enabled: !!ambassadorId,
  });

  if (walletLoading) return null;
  if (walletError) return <div className="text-error text-center py-8">Failed to load wallet details</div>;

  if (!walletData) return <div className="text-error text-center py-8">Wallet not found</div>;

  const platformBreakdown = walletData.balance_by_platform || [];
  const transactions = walletData.transaction_history || [];

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-6">Wallet Details</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="stat bg-base-200 rounded-xl">
            <div className="stat-title">Current Balance</div>
            <div className="stat-value text-primary">KES {(walletData.current_balance || 0).toLocaleString()}</div>
          </div>
          <div className="stat bg-base-200 rounded-xl">
            <div className="stat-title">Pending Earnings</div>
            <div className="stat-value text-warning">KES {(walletData.pending_earnings || 0).toLocaleString()}</div>
          </div>
          <div className="stat bg-base-200 rounded-xl">
            <div className="stat-title">Total Earned</div>
            <div className="stat-value text-success">KES {(walletData.total_earned || 0).toLocaleString()}</div>
          </div>
          <div className="stat bg-base-200 rounded-xl">
            <div className="stat-title">Total Withdrawn</div>
            <div className="stat-value text-info">KES {(walletData.total_withdrawn || 0).toLocaleString()}</div>
          </div>
        </div>

        {/* Platform Breakdown */}
        {platformBreakdown.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Icon name="chart" className="w-5 h-5" /> Balance by Platform
            </h3>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Total Earned (KES)</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {platformBreakdown.map((p: any) => {
                    const share = walletData.total_earned > 0
                      ? ((p.total_earned / walletData.total_earned) * 100).toFixed(1)
                      : "0.0";
                    return (
                      <tr key={p.platform_id || p.platform_name}>
                        <td>{p.platform_name}</td>
                        <td>KES {(p.total_earned || 0).toLocaleString()}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-base-300 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${share}%` }} />
                            </div>
                            <span className="text-xs">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Icon name="history" className="w-5 h-5" /> Transaction History
          </h3>
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Platform</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: any) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className="max-w-xs truncate">{tx.description}</td>
                      <td className={cn("font-semibold", (tx.amount || 0) < 0 ? "text-error" : "text-success")}>
                        {(tx.amount || 0) < 0 ? `-KES ${Math.abs(tx.amount).toLocaleString()}` : `+KES ${(tx.amount || 0).toLocaleString()}`}
                      </td>
                      <td>
                        <span className={cn(
                          "badge",
                          tx.type === "EARNING" ? "badge-success"
                            : tx.type === "WITHDRAWAL" ? "badge-error"
                              : tx.type === "HUB_FEE" ? "badge-warning"
                                : "badge-neutral"
                        )}>
                          {tx.type}
                        </span>
                      </td>
                      <td>{tx.platform?.display_name || tx.platform?.name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/50 text-center py-8">No transactions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}


