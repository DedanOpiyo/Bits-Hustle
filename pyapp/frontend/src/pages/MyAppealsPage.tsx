import { useQuery } from "@tanstack/react-query";
import { appealAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";

type AppealItem = {
  id: string;
  status: string;
  reason: string;
  created_at: string;
  payout_request_id?: string;
  payout_request?: {
    id: string;
    amount: number;
    status?: { name: string; display_name: string };
    platform?: { id: string; display_name: string };
  };
};

const statusBadge = (status?: string) => {
  const name = (status || "").toUpperCase();
  if (name === "APPROVED") return "badge-success";
  if (name === "REJECTED") return "badge-error";
  if (name === "PENDING") return "badge-warning";
  return "badge-neutral";
};

export default function MyAppealsPage() {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();

  const canViewAppeals = user && checkPermission("appeals:read");
  const isAmbassador = user && checkPermission("ambassador:access");

  if (!canViewAppeals && !isAmbassador) {
    return <div className="text-error">You don't have permission to view appeals</div>;
  }

  const { data: appeals, isLoading, error } = useQuery<AppealItem[]>({
    queryKey: ["my-appeals"],
    queryFn: async () => {
      const response = await appealAPI.getMyAppeals();
      return (response.data as AppealItem[]) || [];
    },
    enabled: !!user,
  });

  if (isLoading) return null;
  if (error) return <div className="text-error">Failed to load appeals</div>;

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">My Appeals</h2>
        <p className="text-sm text-base-content/60 mb-6">
          Track the status of your payout appeals.
        </p>
        {appeals && appeals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Appeal ID</th>
                  <th>Payout Amount</th>
                  <th>Payout Status</th>
                  <th>Platform</th>
                  <th>Appeal Status</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {appeals.map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono text-xs">{a.payout_request_id || a.id}</td>
                    <td>KES {Number(a.payout_request?.amount || 0).toLocaleString()}</td>
                    <td>
                      <span className={"badge " + statusBadge(a.payout_request?.status?.name)}>
                        {a.payout_request?.status?.display_name || a.payout_request?.status?.name || "N/A"}
                      </span>
                    </td>
                    <td>{a.payout_request?.platform?.display_name || "—"}</td>
                    <td>
                      <span className={"badge " + statusBadge(a.status)}>
                        {a.status}
                      </span>
                    </td>
                    <td className="max-w-xs truncate" title={a.reason}>
                      {a.reason}
                    </td>
                    <td className="text-sm text-base-content/70">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-base-content/50 py-8 text-center">No appeals yet.</p>
        )}
      </div>
    </div>
  );
}
