import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { checkinAPI, hubAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { cn } from "../utils";

type TrendRow = {
  date: string;
  checkins: number;
  uniqueAmbassadors: number;
};

export default function AttendanceAnalyticsPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(7);

  const { data: hubs } = useQuery({
    queryKey: ["hubs"],
    queryFn: async () => {
      const resp = await hubAPI.getHubs();
      return resp.data || [];
    },
    enabled: !!user,
    select: (data: any) => {
      const list = Array.isArray(data) ? data : data.items || [];
      if (user?.role?.name === "HUB_MANAGER") {
        return list.filter((h: any) => h.manager_id === user?.id || h.manager?.id === user?.id);
      }
      return list;
    },
  });

  const resolvedHubId = hubs && hubs.length > 0 ? (hubs as any[])[0]?.id : null;

  const { data: trends, isLoading, isError, refetch } = useQuery({
    queryKey: ["hub-attendance-trends", resolvedHubId, days],
    queryFn: async () => {
      if (!resolvedHubId) return [];
      const resp = await checkinAPI.getHubAttendanceTrends(resolvedHubId, { days });
      return resp.data || [];
    },
    enabled: !!resolvedHubId,
  });

  const ranges = [7, 14, 30] as const;
  const trendRows = (trends as TrendRow[]) || [];

  const totalCheckIns = trendRows.reduce((sum, d) => sum + d.checkins, 0);
  const totalAmbassadors = trendRows.reduce((sum, d) => sum + d.uniqueAmbassadors, 0);
  const avgDaily = trendRows.length ? Math.round(totalCheckIns / trendRows.length) : 0;

  if (!resolvedHubId && !isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body text-center">
            <Icon name="building" className="w-10 h-10 mx-auto mb-2 text-base-content/40" />
            <h1 className="text-2xl font-bold">Attendance Analytics</h1>
            <p className="text-base-content/60">No hub assigned. Contact your administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  const maxCheckins = Math.max(...trendRows.map((d) => d.checkins), 1);

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Attendance Analytics</h1>
          <p className="text-base-content/60 mt-1">Hub check-in trends and performance</p>
        </div>
        <div className="flex gap-2">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={cn("btn btn-sm", days === r ? "btn-primary" : "btn-ghost")}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-primary">
            <Icon name="qr" className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/50 text-sm uppercase tracking-wide">Total Check-ins</div>
          <div className="stat-value text-2xl font-bold">{totalCheckIns}</div>
          <div className="stat-desc">{days} day window</div>
        </div>
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-success">
            <Icon name="people" className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/50 text-sm uppercase tracking-wide">Unique Ambassadors</div>
          <div className="stat-value text-2xl font-bold">{totalAmbassadors}</div>
          <div className="stat-desc">distinct visitors</div>
        </div>
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-info">
            <Icon name="chart" className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/50 text-sm uppercase tracking-wide">Daily Average</div>
          <div className="stat-value text-2xl font-bold">{avgDaily}</div>
          <div className="stat-desc">check-ins per day</div>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title">
              <Icon name="history" className="w-5 h-5" />
              {days}-Day Attendance Trend
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>
              <Icon name="refresh" className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="text-base-content/50 py-8 text-center">Loading analytics...</div>
          ) : isError ? (
            <div className="text-error py-8 text-center">Failed to load attendance data.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-end gap-1 sm:gap-2 h-40">
                {trendRows.map((day) => {
                  const height = Math.max((day.checkins / maxCheckins) * 100, 4);
                  const dayLabel = new Date(day.date).toLocaleDateString("en", { weekday: "short", day: "numeric" });
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium">{day.checkins}</span>
                      <div
                        className="w-full rounded-t bg-primary/80 hover:bg-primary"
                        style={{ height: `${height}%`, minHeight: "4px" }}
                      />
                      <span className="text-[10px] text-base-content/50">{dayLabel}</span>
                    </div>
                  );
                })}
              </div>

              <div className="overflow-x-auto">
                <table className="table table-zebra table-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check-ins</th>
                      <th>Unique Ambassadors</th>
                      <th>Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendRows.map((day) => {
                      const ratio = day.checkins === 0 ? 0 : Math.round((day.uniqueAmbassadors / day.checkins) * 100);
                      return (
                        <tr key={day.date}>
                          <td className="font-medium">{new Date(day.date).toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" })}</td>
                          <td>{day.checkins}</td>
                          <td>{day.uniqueAmbassadors}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <div className="h-2 rounded-full bg-base-300">
                                  <div
                                    className={cn("h-2 rounded-full", ratio >= 80 ? "bg-success" : ratio >= 40 ? "bg-warning" : "bg-error")}
                                    style={{ width: `${Math.min(ratio, 100)}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs text-base-content/60 w-10 text-right">{ratio}%</span>
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
        </div>
      </div>
    </div>
  );
}
