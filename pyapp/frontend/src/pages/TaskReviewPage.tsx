import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskAPI } from "../services/api";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { cn } from "../utils";

export default function TaskReviewPage() {
  const { user } = useAuth();
  const { taskId } = useParams<{ taskId: string }>();
  const queryClient = useQueryClient();

  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
   const [isProcessing, setIsProcessing] = useState(false);
   const { checkPermission, checkRole } = usePermissions();

   // Fetch task details
   const { data: task, isLoading: taskLoading, error: taskError } = useQuery({
     queryKey: ["task", taskId],
     queryFn: async () => {
       const response = await taskAPI.getTask(taskId);
       return response.data;
     },
     enabled: !!taskId && !!user,
   });

  // Fetch all submissions for review
  const { data: submissionsData, isLoading: submissionsLoading } = useQuery({
    queryKey: ["taskSubmissions"],
    queryFn: async () => {
      const { data } = await api.get('/task-submissions');
      return data;
    },
    enabled: !!user && !!taskId,
  });

  // Filter submissions for this task that need review
  const pendingSubmissions = (submissionsData?.items || []).filter(
    (sub: any) => sub.task_id === taskId && sub.status?.name !== 'APPROVED' && sub.status?.name !== 'REJECTED'
  );
  const reviewedSubmissions = (submissionsData?.items || []).filter(
    (sub: any) => sub.task_id === taskId && (sub.status?.name === 'APPROVED' || sub.status?.name === 'REJECTED')
  );
  const allSubmissions = [...pendingSubmissions, ...reviewedSubmissions];

  const reviewSubmission = useMutation({
    mutationFn: async (data: { submissionId: string; action: 'approve' | 'reject'; reason?: string }) => {
      return await taskAPI.reviewSubmission(data.submissionId, {
        statusName: data.action === 'approve' ? 'APPROVED' : 'REJECTED',
        rejectionReason: data.reason,
      });
    },
    onSuccess: () => {
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["taskSubmissions", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      // Reset form
      setReviewAction(null);
      setReviewReason("");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "An error occurred";
      setFormError(message);
      setIsProcessing(false);
    },
  });

  const handleReview = async (submissionId: string, action: 'approve' | 'reject', reason?: string) => {
    setFormError(null);
    setIsProcessing(true);

    try {
      await reviewSubmission.mutateAsync({
        submissionId,
        action,
        reason,
      });
    } catch (err) {
      // Error is handled in onError
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return <div className="text-error">You must be logged in to view this page</div>;
  }

  if (taskLoading || submissionsLoading) {
    return <div className="text-base-content/50 py-8 text-center">Loading...</div>;
  }

  if (taskError) {
    return <div className="text-error">Failed to load task details</div>;
  }

   if (!task) {
     return <div className="text-error">Task not found</div>;
   }

   const isHubManager = checkPermission('hub_manager:access');
   const isSuperAdmin = checkRole('SUPER_ADMIN');
   if (!isHubManager && !isSuperAdmin) {
     return <div className="text-error">You don't have permission to review task submissions</div>;
   }

  if (!allSubmissions || allSubmissions.length === 0) {
    return (
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h2 className="card-title mb-4">Task Submission Review</h2>
          <p className="text-base-content/50 py-8 text-center">No submissions found for this task.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">Task Submission Review</h2>
        <div className="space-y-6">
          {/* Task Info */}
<div className="card bg-base-100 border border-base-300 shadow-sm">
             <div className="card-body">
               <h3 className="card-title">{task.description}</h3>
               <p className="mb-4">{task.description}</p>
               <div className="space-y-2">
                 <div>
                   <span className="badge badge-outline">Reward: KES {task.reward?.toLocaleString()}</span>
                   <span className="badge badge-outline ml-2">Platform: {task.platform?.display_name || 'N/A'}</span>
                   <span className="badge badge-outline ml-2">Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}</span>
                 </div>
               </div>
             </div>
           </div>

          {/* Submissions */}
          <div>
            <h3 className="card-title mb-4">Submissions Awaiting Review</h3>
            {allSubmissions.map((sub: any) => (
              <div key={sub.id} className="card bg-base-100 border border-base-300 shadow-sm mb-4">
                <div className="card-body">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="card-title">Submission by {sub.ambassador?.user?.name || 'Unknown Ambassador'}</h4>
                      <p className="text-base-content/60">Submitted: {sub.created_at ? new Date(sub.created_at).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div>
                      <span className={"badge " + (sub.status?.name === 'APPROVED' ? 'badge-success' : sub.status?.name === 'REJECTED' ? 'badge-error' : sub.status?.name === 'SUBMITTED' ? 'badge-warning' : 'badge-neutral')}>
                        {sub.status?.display_name || sub.status?.name || sub.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  
                  {sub.proof_url && (
                    <div className="mb-4">
                      <h5 className="font-bold mb-2">Proof:</h5>
                      {/* In a real app, we would display the actual proof based on URL type */}
                      <div className="border border-base-300 rounded p-4">
                        <p className="text-base-content/60 italic">Proof URL: {sub.proof_url}</p>
                        {/* For images, we could show: <img src={sub.proof_url} alt="Task proof" className="max-w-full h-auto rounded" /> */}
                      </div>
                    </div>
                  )}
                  
                  {sub.description && (
                    <div className="mb-4">
                      <h5 className="font-bold mb-2">Description:</h5>
                      <p className="text-base-content/60">{sub.description}</p>
                    </div>
                  )}

                  {/* Review Form - only show for pending submissions */}
                  {(sub.status?.name === 'SUBMITTED' || sub.status?.name === 'PENDING' || sub.status === 'SUBMITTED' || sub.status === 'PENDING') && (
                    <div className="border-t border-base-300 pt-4">
                      <h5 className="font-bold mb-2">Review Submission</h5>
                      {formError && (
                        <div className="alert alert-error mb-4">
                          <span>{formError}</span>
                        </div>
                      )}
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="label"><span className="label-text">Action</span></label>
                          <div className="flex gap-4">
                            <button
                              type="button"
                              className={cn("btn", reviewAction === 'approve' ? "btn-success" : "btn-outline")}
                              onClick={() => setReviewAction('approve')}
                            >
                              <Icon name="check" className="w-4 h-4 mr-1" /> Approve
                            </button>
                            <button
                              type="button"
                              className={cn("btn", reviewAction === 'reject' ? "btn-error" : "btn-outline")}
                              onClick={() => setReviewAction('reject')}
                            >
                              <Icon name="close" className="w-4 h-4 mr-1" /> Reject
                            </button>
                          </div>
                        </div>

                        {reviewAction === 'reject' && (
                          <div className="space-y-2">
                            <label className="label"><span className="label-text">Rejection Reason (Required)</span></label>
                            <textarea
                              value={reviewReason}
                              onChange={(e) => setReviewReason(e.target.value)}
                              placeholder="Please provide a reason for rejection"
                              className="textarea textarea-bordered w-full"
                              rows={3}
                              required
                            />
                          </div>
                        )}

                        {reviewAction && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={isProcessing || (reviewAction === 'reject' && !reviewReason)}
                              onClick={() => handleReview(sub.id, reviewAction, reviewAction === 'reject' ? reviewReason : undefined)}
                            >
                              {isProcessing ? (
                                <span className="loading loading-spinner loading-sm" />
                              ) : (
                                <>
                                  <Icon name="check" className="w-4 h-4 mr-1" />
                                  Confirm {reviewAction === 'approve' ? 'Approval' : 'Rejection'}
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-secondary ml-2"
                              onClick={() => {
                                setReviewAction(null);
                                setReviewReason("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Show review info if already reviewed */}
                  {((sub.status?.name === 'APPROVED' || sub.status?.name === 'REJECTED' || sub.status === 'APPROVED' || sub.status === 'REJECTED') && sub.reviewed_at) && (
                    <div className="border-t border-base-300 pt-4">
                      <h5 className="font-bold mb-2">Review Info</h5>
                      <p className="text-base-content/60">
                        <strong>Reviewed:</strong> {new Date(sub.reviewed_at).toLocaleString()} by {sub.reviewed_by?.user?.name || 'Unknown Reviewer'}
                      </p>
                      {sub.rejection_reason && (
                        <div className="mt-2">
                          <strong>Rejection Reason:</strong> <span className="text-base-content/60">{sub.rejection_reason}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
