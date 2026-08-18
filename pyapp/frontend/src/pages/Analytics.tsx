import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { Icon } from "../components/Icon";
import { cn } from "../utils";

type TabKey = "overview" | "finance" | "hubs" | "platforms" | "daily" | "funnel" | "ambassadors" | "advanced";

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5 animate-pulse">
          <div className="stat-title text-base-content/40 mb-2 h-4 w-24 bg-base-200 rounded" />
          <div className="stat-value text-lg h-8 w-20 bg-base-200 rounded" />
        </div>
      ))}
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <span className="loading loading-spinner loading-lg text-primary" />
      <p className="text-base-content/60">Loading analytics...</p>
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const formatKES = (v: number) => "KES " + ((v || 0) as number).toLocaleString();

  const canView = !!user && checkPermission("analytics:read");

const logAnalyticsQuery = (name: string, queryFn: () => Promise<any>) => async () => {
    const start = performance.now();
    try {
      const data = await queryFn();
      const duration = Math.round(performance.now() - start);
      console.log(`[Analytics] ${name} loaded in ${duration}ms`, data);
      return data;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      console.error(`[Analytics] ${name} failed after ${duration}ms`, error);
      throw error;
    }
  };

const { data: overview, isLoading: overviewLoading, isError: overviewError } = useQuery({
  queryKey: ["analytics", "overview"],
  queryFn: logAnalyticsQuery("overview", () => analyticsAPI.getOverview().then(r => r.data)),
  enabled: !!user && canView,
  retry: 2,
  retryDelay: 1000,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
});
const { data: finance, isLoading: financeLoading, isError: financeError } = useQuery({
  queryKey: ["analytics", "finance"],
  queryFn: logAnalyticsQuery("finance", () => analyticsAPI.getFinanceKPIs().then(r => r.data)),
  enabled: !!user && canView,
  retry: 2,
  retryDelay: 1000,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
});
const { data: hub, isLoading: hubLoading, isError: hubError } = useQuery({
  queryKey: ["analytics", "hubs"],
  queryFn: logAnalyticsQuery("hubs", () => analyticsAPI.getHubKPIs().then(r => r.data)),
  enabled: !!user && canView,
  retry: 2,
  retryDelay: 1000,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
});
const { data: platformMetrics, isLoading: platformsLoading, isError: platformsError } = useQuery({
  queryKey: ["analytics", "platforms"],
  queryFn: logAnalyticsQuery("platforms", () => analyticsAPI.getPlatformMetrics().then(r => r.data)),
  enabled: !!user && canView,
  retry: 2,
  retryDelay: 1000,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
});
const { data: ambassadorKPIs, isLoading: ambassadorLoading, isError: ambassadorError } = useQuery({
  queryKey: ["analytics", "ambassadors"],
  queryFn: logAnalyticsQuery("ambassadors", () => analyticsAPI.getAmbassadorKPIs().then(r => r.data)),
  enabled: !!user && canView,
  retry: 2,
  retryDelay: 1000,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
});
const { data: dailyQuestions, isLoading: dailyLoading, isError: dailyError } = useQuery({
  queryKey: ["analytics", "daily"],
  queryFn: logAnalyticsQuery("daily", () => analyticsAPI.getDailyQuestions().then(r => r.data)),
  enabled: !!user && canView,
  retry: 2,
  retryDelay: 1000,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
});
const { data: funnel, isLoading: funnelLoading, isError: funnelError } = useQuery({
  queryKey: ["analytics", "funnel"],
  queryFn: logAnalyticsQuery("funnel", () => analyticsAPI.getFunnelAnalysis().then(r => r.data)),
  enabled: !!user && canView,
  retry: 2,
  retryDelay: 1000,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
});
const { data: advancedKPIs, isLoading: advancedLoading, isError: advancedError } = useQuery({
  queryKey: ["analytics", "advanced"],
  queryFn: logAnalyticsQuery("advanced", () => analyticsAPI.getAdvancedKPIs().then(r => r.data)),
  enabled: !!user && canView,
  retry: 2,
  retryDelay: 1000,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
});

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "finance", label: "Finance" },
    { key: "hubs", label: "Hubs" },
    { key: "platforms", label: "Platforms" },
    { key: "ambassadors", label: "Ambassadors" },
    { key: "daily", label: "7 Questions" },
    { key: "funnel", label: "Funnel" },
    { key: "advanced", label: "Advanced" },
  ];

  if (!user || !canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="alert-circle" className="w-12 h-12 text-base-content/30 mb-4" />
        <p className="text-base-content/60">No permission to view analytics</p>
      </div>
    );
  }

  const showOverviewLoading = activeTab === "overview" && overviewLoading;
  const showOverviewError = activeTab === "overview" && overviewError;

  const globalLoading = overviewLoading || financeLoading || hubLoading || platformsLoading || ambassadorLoading || dailyLoading || funnelLoading || advancedLoading;

  if (globalLoading) {
    return <PageLoader />;
  }

  return (
    <>
      <div role="tablist" className="tabs tabs-boxed bg-base-100 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} role="tab" className={cn("tab whitespace-nowrap", activeTab === t.key && "tab-active")} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {showOverviewLoading && <LoadingCards />}
      {showOverviewError && (
        <div className="alert alert-error">
          <Icon name="alert-circle" className="w-5 h-5" />
          <span>Failed to load overview data.</span>
        </div>
      )}

      {!showOverviewLoading && !showOverviewError && activeTab === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Total Revenue" value={formatKES(overview?.totalRevenue)} />
          <StatCard title="Tasks Completed" value={String(overview?.totalTasks ?? 0)} />
          <StatCard title="Total Leads" value={String(overview?.totalLeads ?? 0)} />
          <StatCard title="Avg Turnaround" value={`${finance?.avgTurnaroundHours ?? 0}h`} />
        </div>
      )}

{activeTab === "finance" && (
         <>
           {financeError && (
             <div className="alert alert-error">
               <Icon name="alert-circle" className="w-5 h-5" />
               <span>Failed to load finance data.</span>
             </div>
           )}
           {!financeError && finance ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
               <StatCard title="Total Commissions" value={formatKES(finance.totalCommissionsEarned)} />
               <StatCard title="Payouts Approved" value={formatKES(finance.totalPayoutsApproved)} />
               <StatCard title="Pending Payouts" value={String(finance.pendingPayoutsCount ?? 0)} />
               <StatCard title="Avg Payout" value={formatKES(finance.avgPayoutAmount)} />
               <StatCard title="Avg Turnaround" value={`${finance.avgTurnaroundHours ?? 0}h`} />
             </div>
           ) : null}
         </>
       )}

      {activeTab === "hubs" && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Daily Attendance</h3>
          {hubLoading && (
            <div className="flex items-center gap-2 text-base-content/50">
              <span className="loading loading-spinner loading-sm" />
              <span>Loading hub data...</span>
            </div>
          )}
          {hubError && !hubLoading && (
            <div className="alert alert-error">
              <Icon name="alert-circle" className="w-5 h-5" />
              <span>Failed to load hub data.</span>
            </div>
          )}
{!hubLoading && !hubError && (
             <>
               {hub && hub.dailyAttendance && hub.dailyAttendance.length > 0 ? (
                 <table className="table table-zebra">
                   <thead><tr><th>Hub</th><th>Check-ins Today</th></tr></thead>
                   <tbody>
                     {hub.dailyAttendance.map((h: any) => (
                       <tr key={h.hubId}><td>{h.hubName}</td><td>{h.checkins}</td></tr>
                     ))}
                   </tbody>
                 </table>
               ) : <p className="text-base-content/50">No attendance data today.</p>}
             </>
           )}
        </div>
      )}

      {activeTab === "platforms" && (
        <div className="space-y-6">
          {platformsLoading && (
            <div className="flex items-center gap-2 text-base-content/50">
              <span className="loading loading-spinner loading-sm" />
              <span>Loading platform data...</span>
            </div>
          )}
          {platformsError && !platformsLoading && (
            <div className="alert alert-error">
              <Icon name="alert-circle" className="w-5 h-5" />
              <span>Failed to load platform data.</span>
            </div>
          )}
          {!platformsLoading && !platformsError && (
            <>
              {platformMetrics?.length ? (
                <table className="table table-zebra">
                  <thead><tr><th>Platform</th><th>Leads</th><th>Campaigns</th><th>Total Earnings</th></tr></thead>
                  <tbody>
                    {platformMetrics.map((p: any) => (
                      <tr key={p.platform.id}>
                        <td>{p.platform.display_name}</td>
                        <td>{p.leadCount}</td>
                        <td>{p.campaignCount}</td>
                        <td>{formatKES(p.totalEarnings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-base-content/50">No platform data.</p>}
            </>
          )}
        </div>
      )}

{activeTab === "ambassadors" && (
         <>
           {ambassadorError && (
             <div className="alert alert-error">
               <Icon name="alert-circle" className="w-5 h-5" />
               <span>Failed to load ambassador data.</span>
             </div>
           )}
           {!ambassadorError && ambassadorKPIs ? (
             <>
               <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                 <StatCard title="Total Ambassadors" value={String(ambassadorKPIs.total)} />
                 <StatCard title="Active (30d)" value={String(ambassadorKPIs.active)} />
                 <StatCard title="New (7d)" value={String(ambassadorKPIs.new7d)} />
                 <StatCard title="New (30d)" value={String(ambassadorKPIs.new30d)} />
                 <StatCard title="Avg Earnings" value={formatKES(ambassadorKPIs.avgEarnings)} />
               </div>
               {ambassadorKPIs.topPerformers && ambassadorKPIs.topPerformers.length > 0 && (
                 <div>
                   <h3 className="text-lg font-semibold mb-2">Top Performers</h3>
                   <table className="table table-zebra">
                     <thead><tr><th>#</th><th>Name</th><th>Total Earned</th></tr></thead>
                     <tbody>
                       {ambassadorKPIs.topPerformers.map((p: any, idx: number) => (
                         <tr key={p.ambassadorId}><td>{idx + 1}</td><td>{p.name}</td><td>{formatKES(p.totalEarned)}</td></tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
             </>
           ) : null}
         </>
       )}

      {activeTab === "daily" && (
        <div className="space-y-6">
          {dailyLoading && (
            <div className="flex items-center gap-2 text-base-content/50">
              <span className="loading loading-spinner loading-sm" />
              <span>Loading daily questions...</span>
            </div>
          )}
          {dailyError && !dailyLoading && (
            <div className="alert alert-error">
              <Icon name="alert-circle" className="w-5 h-5" />
              <span>Failed to load daily questions.</span>
            </div>
          )}
          {!dailyLoading && !dailyError && dailyQuestions && (
            <>
              <h3 className="text-lg font-semibold">Seven Daily Questions — {new Date(dailyQuestions.date).toLocaleDateString()}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard title="1. Who showed up?" value={`${dailyQuestions.whoShowedUp?.uniqueAmbassadors ?? 0} ambassadors`} sub={`${dailyQuestions.whoShowedUp?.totalCheckins ?? 0} check-ins`} />
                <StatCard title="2. Who worked?" value={`${dailyQuestions.whoWorked?.tasksApproved ?? 0} approved`} sub={`${dailyQuestions.whoWorked?.tasksSubmitted ?? 0} submitted`} />
                <StatCard title="3. What produced?" value={`${dailyQuestions.whatProduced?.leadsGenerated ?? 0} leads`} />
                <StatCard title="4. Conversions?" value={`${dailyQuestions.growthRevenue?.conversionsToday ?? 0} today`} />
                <StatCard title="5. Earnings today?" value={formatKES(dailyQuestions.whatToPay?.earningsToday)} sub={`${dailyQuestions.whatToPay?.pendingPayouts ?? 0} pending`} />
                <StatCard title="6. Top hub?" value={dailyQuestions.winningHubs?.[0]?.hubName || "N/A"} sub={`${dailyQuestions.winningHubs?.[0]?.checkinsToday || 0} check-ins`} />
                <StatCard title="7. Lead drop-off?" value={`${dailyQuestions.leakAnalysis?.leadFunnel?.[0]?.percentage ?? 0}% at first stage`} />
              </div>

{dailyQuestions.growthRevenue?.byPlatform?.length > 0 && (
                 <div>
                   <h3 className="text-lg font-semibold mb-2">Revenue by Platform</h3>
                   <table className="table table-zebra">
                     <thead><tr><th>Platform</th><th>Conversions</th><th>Revenue</th></tr></thead>
                     <tbody>
                       {dailyQuestions.growthRevenue?.byPlatform?.map((p: any) => (
                         <tr key={p.platform}><td>{p.platform ?? "N/A"}</td><td>{p.conversions ?? 0}</td><td>{formatKES(p.revenue)}</td></tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}

{dailyQuestions.winningHubs?.length > 0 && (
                 <div>
                   <h3 className="text-lg font-semibold mb-2">Hub Rankings</h3>
                   <table className="table table-zebra">
                     <thead><tr><th>Rank</th><th>Hub</th><th>Check-ins</th><th>Ambassadors</th><th>Leads</th></tr></thead>
                     <tbody>
                       {dailyQuestions.winningHubs?.map((h: any, _idx: number) => (
                         <tr key={h.hubId}><td>{h.hubName ?? "N/A"}</td><td>{h.checkinsToday ?? 0}</td><td>{h.ambassadors ?? 0}</td><td>{h.leads ?? 0}</td></tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
            </>
          )}
        </div>
      )}

      {activeTab === "funnel" && (
        <div className="space-y-8">
          {funnelLoading && (
            <div className="flex items-center gap-2 text-base-content/50">
              <span className="loading loading-spinner loading-sm" />
              <span>Loading funnel analysis...</span>
            </div>
          )}
          {funnelError && !funnelLoading && (
            <div className="alert alert-error">
              <Icon name="alert-circle" className="w-5 h-5" />
              <span>Failed to load funnel data.</span>
            </div>
          )}
          {!funnelLoading && !funnelError && funnel && (
            <>
              <h3 className="text-lg font-semibold">Funnel Analysis</h3>

              {(["leadFunnel", "referralFunnel", "taskFunnel", "payoutFunnel"] as const).map((key) => {
                const title = key.replace("Funnel", "").charAt(0).toUpperCase() + key.replace("Funnel", "").slice(1);
                const data = funnel[key] || [];
                return (
                  <div key={key}>
                    <h4 className="font-semibold mb-2">{title} Funnel</h4>
                    <div className="space-y-2">
                      {data.map((stage: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="w-28 text-sm font-medium truncate">{stage.stage}</span>
                          <div className="flex-1 h-6 bg-base-200 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full flex items-center justify-end pr-2 text-xs text-primary-content font-bold" style={{ width: `${Math.max(stage.percentage, 2)}%` }}>
                              {stage.percentage > 10 ? `${stage.percentage}%` : ""}
                            </div>
                          </div>
                          <span className="w-16 text-sm text-right">{stage.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard title="Total Leads" value={String(funnel.totals?.leads ?? 0)} />
                <StatCard title="Total Referrals" value={String(funnel.totals?.referrals ?? 0)} />
                <StatCard title="Task Submissions" value={String(funnel.totals?.taskSubmissions ?? 0)} />
                <StatCard title="Payout Requests" value={String(funnel.totals?.payoutRequests ?? 0)} />
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "advanced" && (
        <div className="space-y-8">
          {advancedLoading && (
            <div className="flex items-center gap-2 text-base-content/50">
              <span className="loading loading-spinner loading-sm" />
              <span>Loading advanced KPIs...</span>
            </div>
          )}
          {advancedError && !advancedLoading && (
            <div className="alert alert-error">
              <Icon name="alert-circle" className="w-5 h-5" />
              <span>Failed to load advanced KPIs.</span>
            </div>
          )}
          {!advancedLoading && !advancedError && advancedKPIs && (
            <>
              <h3 className="text-lg font-semibold">Advanced KPIs</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard title="Cost Per Acquisition" value={formatKES(advancedKPIs.costPerAcquisition)} />
                <StatCard title="Total Campaign Spend" value={formatKES(advancedKPIs.totalCampaignSpend)} />
                <StatCard title="Total Conversions" value={String(advancedKPIs.totalConversions ?? 0)} />
                <StatCard title="Retention (30d)" value={`${ambassadorKPIs?.retention30d ?? 0}%`} />
                <StatCard title="Retention (60d)" value={`${ambassadorKPIs?.retention60d ?? 0}%`} />
                <StatCard title="Retention (90d)" value={`${ambassadorKPIs?.retention90d ?? 0}%`} />
              </div>

{advancedKPIs.campaignROI?.length > 0 && (
                 <div>
                   <h3 className="text-lg font-semibold mb-2">Campaign ROI</h3>
                   <table className="table table-zebra">
                     <thead><tr><th>Campaign</th><th>Revenue</th><th>Cost</th><th>ROI</th></tr></thead>
                     <tbody>
                       {advancedKPIs.campaignROI?.map((c: any) => (
                         <tr key={c.campaignId}>
                           <td>{c.campaignName}</td>
                           <td>{formatKES(c.revenue)}</td>
                           <td>{formatKES(c.cost)}</td>
                           <td className={cn("font-semibold", c.roi >= 0 ? "text-success" : "text-error")}>
                             {c.roi >= 0 ? "+" : ""}{c.roi}%
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}

{advancedKPIs.hubROI?.length > 0 && (
                 <div>
                   <h3 className="text-lg font-semibold mb-2">Hub ROI</h3>
                   <table className="table table-zebra">
                     <thead><tr><th>Hub</th><th>Check-ins</th><th>Ambassadors</th><th>Value Generated</th><th>Operating Cost</th><th>ROI</th></tr></thead>
                     <tbody>
                       {advancedKPIs.hubROI?.map((h: any) => (
                         <tr key={h.hubId}>
                           <td>{h.hubName}</td>
                           <td>{h.checkins}</td>
                           <td>{h.ambassadors}</td>
                           <td>{formatKES(h.valueGenerated)}</td>
                           <td>{formatKES(h.operatingCost)}</td>
                           <td className={cn("font-semibold", h.roi >= 0 ? "text-success" : "text-error")}>
                             {h.roi >= 0 ? "+" : ""}{h.roi}%
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
            </>
          )}
        </div>
      )}
    </>
  );
}

function StatCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
      <div className="stat-title">{title}</div>
      <div className="stat-value text-lg">{value}</div>
      {sub && <div className="stat-desc">{sub}</div>}
    </div>
  );
}
