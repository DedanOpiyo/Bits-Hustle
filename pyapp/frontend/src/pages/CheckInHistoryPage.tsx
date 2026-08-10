import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { checkinAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { format } from "date-fns";
import { cn } from "../utils";

export default function CheckInHistoryPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["checkins", "history"],
    queryFn: async () => {
      const resp = await checkinAPI.getCheckIns({});
      return (resp.data as any[]) || [];
    },
    enabled: !!user,
  });

  const rows = data || [];

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Check-In History</h1>
        <p className="text-base-content/60 mt-1">
          Your recent check-in sessions across all hubs
        </p>
      </div>

      {isLoading ? (
        <div className="text-base-content/50 py-8 text-center">Loading history...</div>
      ) : rows.length === 0 ? (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body text-center">
            <Icon name="history" className="w-10 h-10 mx-auto mb-2 text-base-content/40" />
            <h2 className="text-lg font-semibold">No check-ins yet</h2>
            <p className="text-base-content/60">
              Your check-in history will appear here after your first scan.
            </p>
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 border border-base-300">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Hub</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((ci: any) => {
                  const checkIn = ci.check_in_time ? new Date(ci.check_in_time) : null;
                  const checkOut = ci.check_out_time ? new Date(ci.check_out_time) : null;
                  const duration =
                    checkIn && checkOut
                      ? Math.round((checkOut.getTime() - checkIn.getTime()) / 60000)
                      : null;
                  const isActive = !checkOut;
                  return (
                    <tr key={ci.id}>
                      <td className="font-medium">{ci.hub?.name || "Unknown"}</td>
                      <td>{checkIn ? format(checkIn, "MMM d, yyyy") : "—"}</td>
                      <td>{checkIn ? format(checkIn, "HH:mm") : "—"}</td>
                      <td>{checkOut ? format(checkOut, "HH:mm") : "—"}</td>
                      <td>
                        {duration
                          ? `${Math.floor(duration / 60)}h ${duration % 60}m`
                          : "—"}
                      </td>
                      <td>
                        <span
                          className={cn(
                            "badge",
                            isActive ? "badge-success" : "badge-neutral",
                          )}
                        >
                          {isActive ? "Active" : "Completed"}
                        </span>
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
  );
}
