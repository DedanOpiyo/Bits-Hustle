import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { checkinAPI, hubAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { cn } from "../utils";
import { format } from "date-fns";

export default function HubAttendancePage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dateFilter, setDateFilter] = useState<string>(selectedDate);

  const { data: myHub } = useQuery({
    queryKey: ["my-hub"],
    queryFn: async () => {
      const resp = await hubAPI.getMyHub();
      return resp.data;
    },
    enabled: !!user,
  });

  const { data: attendance, isLoading } = useQuery({
    queryKey: ["hub-attendance", myHub?.id, selectedDate],
    queryFn: async () => {
      if (!myHub?.id) return null;
      const resp = await checkinAPI.getHubAttendance(myHub.id, { date: selectedDate });
      return resp.data;
    },
    enabled: !!myHub?.id,
  });

  const { data: trends } = useQuery({
    queryKey: ["hub-attendance-trends", myHub?.id],
    queryFn: async () => {
      if (!myHub?.id) return null;
      const resp = await checkinAPI.getHubAttendanceTrends(myHub.id, { days: 7 });
      return resp.data;
    },
    enabled: !!myHub?.id,
  });

  const handleApplyDate = () => {
    setSelectedDate(dateFilter);
  };

  if (isLoading) {
    return <div className="text-base-content/50 py-8 text-center">Loading attendance...</div>;
  }

  if (!attendance) {
    return <div className="text-error py-8 text-center">No hub data found.</div>;
  }

  const items = attendance.items || [];
  const isDateToday = selectedDate === new Date().toISOString().split("T")[0];

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Hub Attendance</h1>
          <p className="text-base-content/60 mt-1">
            {myHub?.name || "Hub"} &mdash; {attendance.hubName}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input input-bordered input-sm"
          />
          <button className="btn btn-sm btn-primary" onClick={handleApplyDate}>
            <Icon name="search" className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-primary">
            <Icon name="people" className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/50 text-sm uppercase tracking-wide">Unique Ambassadors</div>
          <div className="stat-value text-2xl font-bold">{attendance.uniqueAmbassadors}</div>
        </div>
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-success">
            <Icon name="checkCircle" className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/50 text-sm uppercase tracking-wide">Active Sessions</div>
          <div className="stat-value text-2xl font-bold text-success">{attendance.activeSessions}</div>
        </div>
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-info">
            <Icon name="history" className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/50 text-sm uppercase tracking-wide">Completed Sessions</div>
          <div className="stat-value text-2xl font-bold">{attendance.completedSessions}</div>
        </div>
        <div className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5">
          <div className="stat-figure text-warning">
            <Icon name="clock" className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/50 text-sm uppercase tracking-wide">Avg Duration</div>
          <div className="stat-value text-2xl font-bold">{attendance.avgSessionDurationMinutes} min</div>
        </div>
      </div>

      {trends && trends.length > 0 && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <Icon name="chart" className="w-5 h-5" />
              7-Day Attendance Trend
            </h2>
            <div className="flex items-end gap-2 h-32">
              {trends.map((day: any) => {
                const maxCheckins = Math.max(...trends.map((d: any) => d.checkins), 1);
                const height = Math.max((day.checkins / maxCheckins) * 100, 4);
                const isDaySelected = day.date === selectedDate;
                const isDayToday = day.date === new Date().toISOString().split("T")[0];
                return (
                  <button
                    key={day.date}
                    onClick={() => { setSelectedDate(day.date); setDateFilter(day.date); }}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 transition-all",
                      isDaySelected && "ring-2 ring-primary rounded"
                    )}
                  >
                    <span className="text-xs font-medium">{day.checkins}</span>
                    <div
                      className={cn(
                        "w-full rounded-t transition-all",
                        isDayToday ? "bg-primary" : "bg-primary/30 hover:bg-primary/50"
                      )}
                      style={{ height: `${height}%`, minHeight: "4px" }}
                    />
                    <span className="text-xs text-base-content/50">
                      {isDayToday ? "Today" : new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h2 className="card-title mb-4">
            <Icon name="history" className="w-5 h-5" />
            Attendance Log &mdash; {isDateToday ? "Today" : format(new Date(selectedDate), "MMMM d, yyyy")}
          </h2>
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Ambassador</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((ci: any) => {
                    const checkInTime = ci.check_in_time ? new Date(ci.check_in_time) : null;
                    const checkOutTime = ci.check_out_time ? new Date(ci.check_out_time) : null;
                    const durationMinutes = checkInTime && checkOutTime
                      ? Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000)
                      : checkInTime
                        ? Math.round((new Date().getTime() - checkInTime.getTime()) / 60000)
                        : null;
                    const isActive = !ci.check_out_time;
                    const ambassadorName = ci.ambassador?.user?.name || "Unknown";
                    return (
                      <tr key={ci.id}>
                        <td className="font-medium">{ambassadorName}</td>
                        <td>{checkInTime ? format(checkInTime, "HH:mm") : "—"}</td>
                        <td>{checkOutTime ? format(checkOutTime, "HH:mm") : "—"}</td>
                        <td>{durationMinutes ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m` : "—"}</td>
                        <td>
                          <span className={cn("badge", isActive ? "badge-success" : "badge-neutral")}>
                            {isActive ? "Active" : "Completed"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/50 py-8 text-center">No check-ins recorded for this date.</p>
          )}
        </div>
      </div>
    </div>
  );
}
