import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { analyticsAPI, hubAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { format } from "date-fns";
import QRCode from "react-qr-code";

export default function HubDashboard() {
  const { user } = useAuth();

  const { data: myHub } = useQuery({
    queryKey: ["my-hub"],
    queryFn: async () => {
      const resp = await hubAPI.getMyHub();
      return resp.data;
    },
    enabled: !!user,
  });

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["hub-manager-dashboard", myHub?.id],
    queryFn: async () => {
      if (!myHub?.id) return null;
      const resp = await analyticsAPI.getHubManagerDashboard(myHub.id);
      return resp.data;
    },
    enabled: !!myHub?.id,
  });

  if (isLoading) {
    return <div className="text-base-content/50 py-8 text-center">Loading hub dashboard...</div>;
  }

  if (!dashboard) {
    return <div className="text-error py-8 text-center">No hub data found. Contact your admin to assign a hub.</div>;
  }

  const overview = dashboard.overview;
  const formatKES = (v: number) => "KES " + (v || 0).toLocaleString();

  const stats = [
    { label: "Total Ambassadors", value: overview.totalAmbassadors, icon: "people" },
    { label: "Active (30d)", value: overview.activeAmbassadors, icon: "checkCircle" },
    { label: "Checked In Today", value: overview.todayUniqueAmbassadors, icon: "qrCheckIn" },
    { label: "Pending Reviews", value: overview.pendingSubmissions, icon: "tasks", alert: overview.pendingSubmissions > 0 },
    { label: "Leads This Week", value: overview.leadsThisWeek, icon: "leads" },
    { label: "Approved This Month", value: overview.conversionsThisMonth, icon: "check" },
    { label: "Earnings This Month", value: formatKES(overview.earningsThisMonth), icon: "wallet" },
    { label: "Pending Payouts", value: overview.pendingPayouts, icon: "payout" },
  ];

  return (
    <div className="animate-fadeIn space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {dashboard.hub?.name || "Hub Dashboard"}
          </h1>
          <p className="text-base-content/60 mt-1">
            {dashboard.hub?.location} &mdash; {format(new Date(), "EEEE, MMMM do")}
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-lg border border-base-300 bg-white p-3">
            <QRCode
              value={dashboard.hub?.id ? `hub-${dashboard.hub.id}` : ""}
              size={96}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox="0 0 256 256"
            />
          </div>
          <Link
            to={`/hub/qr/${dashboard.hub?.id}`}
            className="text-xs text-primary hover:underline"
          >
            View Check-in QR
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5 hover:shadow-md transition-shadow">
            <div className={`stat-figure ${s.alert ? "text-warning" : "text-primary"}`}>
              <Icon name={s.icon as any} className="w-8 h-8" />
            </div>
            <div className="stat-title text-base-content/50 text-sm uppercase tracking-wide">{s.label}</div>
            <div className={`stat-value text-2xl font-bold ${s.alert ? "text-warning" : ""}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {overview.pendingSubmissions > 0 && (
        <div className="alert alert-warning">
          <Icon name="warning" className="w-6 h-6" />
          <div>
            <h3 className="font-bold">{overview.pendingSubmissions} task submission(s) awaiting review</h3>
            <Link to="/tasks" className="btn btn-sm btn-warning mt-2">Review Now</Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dashboard.activeSessions && dashboard.activeSessions.length > 0 && (
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <h2 className="card-title mb-4">
                <Icon name="qr" className="w-5 h-5 text-success" />
                Currently Checked In
              </h2>
              <div className="space-y-3">
                {dashboard.activeSessions.slice(0, 10).map((session: any) => (
                  <div key={session.checkInId} className="flex items-center gap-3 p-3 rounded-lg bg-base-200/30">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Icon name="people" className="w-5 h-5 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{session.ambassadorName}</p>
                      <p className="text-xs text-base-content/50">
                        Since {session.checkInTime ? new Date(session.checkInTime).toLocaleTimeString() : "unknown"}
                      </p>
                    </div>
                    {session.durationMinutes && (
                      <span className="badge badge-sm badge-outline">{Math.round(session.durationMinutes)} min</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <Icon name="trophy" className="w-5 h-5 text-primary" />
              Top Performers
            </h2>
            {dashboard.topPerformers && dashboard.topPerformers.length > 0 ? (
              <div className="space-y-3">
                {dashboard.topPerformers.slice(0, 5).map((amb: any, i: number) => (
                  <Link
                    key={amb.ambassadorId}
                    to={`/hub/ambassadors/${amb.ambassadorId}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{amb.name}</p>
                      <p className="text-xs text-base-content/50">{amb.tier} &bull; {amb.referralCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{formatKES(amb.totalEarned)}</p>
                      <p className="text-xs text-base-content/50">earned</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-base-content/50 text-center py-8">No performer data yet.</p>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "View Attendance", icon: "history", to: "/hub/attendance" },
          { label: "Review Tasks", icon: "tasks", to: "/tasks" },
          { label: "Manage Ambassadors", icon: "people", to: "/hub/ambassadors" },
          { label: "Post Announcement", icon: "megaphone", to: "/announcements" },
        ].map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="card bg-gradient-to-br from-base-100 to-base-200/30 border border-base-300 hover:border-primary/50 hover:shadow-lg transition-all p-5 text-center group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
              <Icon name={a.icon as any} className="w-8 h-8 mx-auto text-primary" />
            </div>
            <span className="font-medium text-sm">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
