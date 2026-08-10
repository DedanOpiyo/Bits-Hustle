import { useQuery } from "@tanstack/react-query";
import { referralAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";

export default function ReferralsPage() {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();

  const canViewReferrals = user && checkPermission("referrals:read");
  const isAmbassador = user && checkPermission("ambassador:access");

  const { data: referrals, isLoading, error } = useQuery({
    queryKey: ["referrals"],
    queryFn: async () => {
      const response = isAmbassador
        ? await referralAPI.getMyReferrals({})
        : await referralAPI.getReferrals({});
      return Array.isArray(response.data) ? response.data : (response.data?.items || []);
    },
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    const cls = status === "CONVERTED" ? "badge-success" : status === "REJECTED" ? "badge-error" : "badge-neutral";
    return <span className={"badge " + cls}>{status}</span>;
  };

  if (!canViewReferrals) {
    return <div className="text-error">You don't have permission to view referrals</div>;
  }

  if (isLoading) return null;
  if (error) return <div className="text-error">Failed to load referrals</div>;

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">Your Referrals</h2>
        <p className="text-sm text-base-content/60 mb-6">
          Referrals are created automatically when an external Bits platform reports a signup using your ambassador referral code.
        </p>

        <div className="overflow-x-auto">
          <table className="table table-zebra">
<thead>
               <tr>
                 <th>Name</th>
                 <th>Platform</th>
                 <th>Action</th>
                 <th>Status</th>
                 <th>Date</th>
               </tr>
             </thead>
             <tbody>
               {referrals?.length ? (
                 referrals.map((r: any) => (
                   <tr key={r.id}>
                     <td>{r.name || r.referred_user?.name || "�"}</td>
                     <td>{r.platform?.display_name || r.platform?.name || "�"}</td>
                     <td>{r.action || "�"}</td>
                     <td>{r.conversion_status ? getStatusBadge(r.conversion_status) : getStatusBadge(r.status)}</td>
                     <td>{new Date(r.created_at).toLocaleDateString()}</td>
                   </tr>
                 ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-base-content/50 py-8">No referrals yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
