import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { leaderboardAPI, campaignAPI } from "../services/api";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { cn } from "../utils";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();

  const canViewLeaderboard = user && checkPermission("leaderboard:read");

  if (!canViewLeaderboard) {
    return <div className="text-error">You don't have permission to view leaderboard</div>;
  }

  const [tab, setTab] = useState<"hub" | "national" | "campaign">("hub");
  const [campaignId, setCampaignId] = useState("");
  const [metric, setMetric] = useState<"performance" | "training">("performance");

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const response = await campaignAPI.getCampaigns({});
      return response.data?.items || [];
    },
    enabled: !!user,
  });

  const { data: leaderboardData, isLoading, error } = useQuery({
    queryKey: ["leaderboard", tab, campaignId],
    queryFn: async () => {
      const params: Record<string, string> = { scope: tab, metric };
      if (tab === "campaign" && campaignId) {
        params.campaign_id = campaignId;
      }
      const response = await leaderboardAPI.getLeaderboard(params);
      return response.data?.items || response.data || [];
    },
    enabled: !!user && (tab !== "campaign" || !!campaignId),
  });

  const campaignList = campaigns || [];

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">Leaderboards</h2>

        <div role="tablist" className="tabs tabs-boxed mb-4">
          <button role="tab" className={cn("tab", tab === "hub" && "tab-active")} onClick={() => setTab("hub")}>
            Hub Ranking
          </button>
          <button role="tab" className={cn("tab", tab === "national" && "tab-active")} onClick={() => setTab("national")}>
            National Ranking
          </button>
          <button role="tab" className={cn("tab", tab === "campaign" && "tab-active")} onClick={() => setTab("campaign")}>
            Campaign Ranking
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-sm text-base-content/60">Rank by:</span>
          <div className="join">
            <button
              className={cn("btn btn-sm join-item", metric === "performance" && "btn-primary")}
              onClick={() => setMetric("performance")}
            >
              Performance
            </button>
            <button
              className={cn("btn btn-sm join-item", metric === "training" && "btn-primary")}
              onClick={() => setMetric("training")}
            >
              Training
            </button>
          </div>
          <span className="text-xs text-base-content/50">
            {metric === "performance"
              ? "Ranks ambassadors by earnings, leads, referrals and completed tasks."
              : "Ranks ambassadors by the training tasks they complete."}
          </span>
        </div>


        {tab === "campaign" && (
          <div className="mb-4">
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="select select-bordered w-full max-w-xs"
            >
              <option value="">Select Campaign</option>
              {campaignList.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : error ? (
          <div className="text-error text-center py-8">Failed to load leaderboard data</div>
        ) : (
          <LeaderboardTable data={leaderboardData} tab={tab} metric={metric} campaignId={campaignId} />
        )}
      </div>
    </div>
  );
}
