import { cn } from "../utils";

interface LeaderboardEntry {
  rank?: number;
  ambassador?: {
    user?: { name?: string };
    hub_name?: string;
    referral_code?: string;
  };
  wallet?: {
    total_earned?: number;
    total_withdrawn?: number;
    current_balance?: number;
  };
  total_points?: number;
  leads_generated?: number;
  referrals_converted?: number;
  tasks_completed?: number;
  earnings_generated?: number;
}

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
  tab: string;
  campaignId?: string;
  metric?: "performance" | "training";
}

export function LeaderboardTable({ data, tab, metric = "performance" }: LeaderboardTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-base-content/50 text-center py-8">
        No leaderboard data available.
      </div>
    );
  }

  const displayData = data.map((entry) => {
    const wallet = entry.wallet || {};
    const ambassador = entry.ambassador || {};
    return {
      rank: entry.rank || 0,
      ambassadorName: ambassador.user?.name || ambassador.referral_code || "Unknown",
      hubName: ambassador.hub_name || "N/A",
      totalEarnings: wallet.total_earned || 0,
      totalWithdrawn: wallet.total_withdrawn || 0,
      currentBalance: wallet.current_balance || 0,
      totalPoints: entry.total_points || 0,
      leadsGenerated: entry.leads_generated || 0,
      referralsConverted: entry.referrals_converted || 0,
      tasksCompleted: entry.tasks_completed || 0,
    };
  });

  const getMedal = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Ambassador</th>
            {tab === "national" && <th>Hub</th>}
            <th>Points</th>
            <th>Leads</th>
            <th>Referrals</th>
            <th className={cn(metric === "training" && "text-primary")}>Tasks</th>
            <th className={cn(metric === "performance" && "text-primary")}>Earned (KES)</th>
          </tr>
        </thead>
        <tbody>
          {displayData.map((entry, index) => (
            <tr key={entry.ambassadorName + index} className={cn(index < 3 && "bg-primary/5")}>
              <td className="text-lg">{getMedal(entry.rank)}</td>
              <td className="font-semibold">{entry.ambassadorName}</td>
              {tab === "national" && <td>{entry.hubName}</td>}
              <td>{entry.totalPoints}</td>
              <td>{entry.leadsGenerated}</td>
              <td>{entry.referralsConverted}</td>
              <td className={cn(metric === "training" && "font-bold text-primary")}>{entry.tasksCompleted}</td>
              <td className={cn(metric === "performance" && "font-bold text-primary")}>KES {entry.totalEarnings.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}