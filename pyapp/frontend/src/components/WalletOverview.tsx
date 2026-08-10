type WalletOverviewProps = {
  wallet: {
    id?: string;
    current_balance?: number;
    available_balance?: number;
    pending_earnings?: number;
    total_earned?: number;
    total_withdrawn?: number;
    is_active?: boolean;
  } | null;
};

export default function WalletOverview({ wallet }: WalletOverviewProps) {
  if (!wallet) {
    return (
      <div className="text-base-content/50 text-center py-8">
        Loading wallet data...
      </div>
    );
  }

  const formatCurrency = (amount: number | string | null | undefined) => {
    return `KES ${Number(amount).toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-base-100 border border-base-300 text-center">
          <h3 className="card-title">Current Balance</h3>
          <p className="text-2xl font-bold">{formatCurrency(wallet.current_balance)}</p>
          <p className="text-xs text-base-content/60">Available: {formatCurrency(wallet.available_balance || 0)}</p>
        </div>
        <div className="card bg-base-100 border border-base-300 text-center">
          <h3 className="card-title">Pending Earnings</h3>
          <p className="text-2xl font-bold">{formatCurrency(wallet.pending_earnings)}</p>
          <p className="text-xs text-base-content/60">Approved tasks awaiting payment</p>
        </div>
        <div className="card bg-base-100 border border-base-300 text-center">
          <h3 className="card-title">Total Earned</h3>
          <p className="text-2xl font-bold">{formatCurrency(wallet.total_earned)}</p>
          <p className="text-xs text-base-content/60">Lifetime earnings</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-base-100 border border-base-300 text-center">
          <h3 className="card-title">Total Withdrawn</h3>
          <p className="text-2xl font-bold">{formatCurrency(wallet.total_withdrawn)}</p>
          <p className="text-xs text-base-content/60">Lifetime withdrawals</p>
        </div>
        <div className="card bg-base-100 border border-base-300 text-center">
          <h3 className="card-title">Wallet ID</h3>
          <p className="text-lg font-mono">{wallet.id?.substring(0, 8)}...</p>
          <p className="text-xs text-base-content/60">Unique identifier</p>
        </div>
        <div className="card bg-base-100 border border-base-300 text-center">
          <h3 className="card-title">Status</h3>
          <p className="text-2xl font-bold">
            <span className={"badge " + (wallet.is_active ? "badge-success" : "badge-error")}>
              {wallet.is_active ? "Active" : "Inactive"}
            </span>
          </p>
          <p className="text-xs text-base-content/60">Account status</p>
        </div>
      </div>
    </div>
  );
}
