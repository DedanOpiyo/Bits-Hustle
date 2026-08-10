import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskAPI, ambassadorAPI } from '../services/api';
import { apiGet } from '../services/api';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils';

export default function TasksPage() {
    const { user } = useAuth();
    const { checkPermission, checkRole } = usePermissions();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const ambassadorProfileId = user?.ambassador_profile?.id || user?.ambassador_id || null;

    // All hooks must be called unconditionally at the top
    const canViewTasks = !!user && checkPermission('tasks:read');
    const canCreateTasks = !!user && checkPermission('tasks:create');
    const isAmbassador = !!user && checkPermission('ambassador:access');
    const isHubManager = !!user && checkPermission('hub_manager:access');
    const isSuperAdmin = !!user && checkRole('SUPER_ADMIN');

    // Fetch all tasks
    const { data: allTasks = [], isLoading: tasksLoading, error: tasksError } = useQuery({
        queryKey: ['all-tasks'],
        queryFn: async () => {
            const response = await taskAPI.getTasks({});
            return response.data?.items || [];
        },
        enabled: !!user,
    });

    // Fetch all ambassadors to get their rankings and submissions
    const { data: allAmbassadors = [], isLoading: ambassadorsLoading } = useQuery({
        queryKey: ['all-ambassadors'],
        queryFn: async () => {
            // Try to get all ambassadors from the API
            try {
                const response = await apiGet(`/ambassadors`);
                return Array.isArray(response) ? response : ((response as any)?.items || []);
            } catch (error) {
                console.warn('Failed to fetch ambassadors list:', error);
                return [];
            }
        },
        enabled: !!user,
    });

    // Get current ambassador's data (including rank)
    const { data: ambassador, isLoading: ambassadorLoading } = useQuery({
        queryKey: ['ambassador', ambassadorProfileId],
        queryFn: async () => {
            if (!isAmbassador || !user) return null;
            if (!ambassadorProfileId) return null;
            const response = await ambassadorAPI.getAmbassador(ambassadorProfileId);
            return response.data;
        },
        enabled: isAmbassador && !!ambassadorProfileId,
    });

    // Fetch submissions for all ambassadors to find taken tasks
    const { data: allSubmissions = [], isLoading: submissionsLoading } = useQuery({
        queryKey: ['all-submissions'],
        queryFn: async () => {
            if (!allAmbassadors || allAmbassadors.length === 0) return [];
            
            // Get submissions for each ambassador
            const ambassadorPromises = allAmbassadors
                .filter((amb: any) => amb.id) // Only ambassadors with ID
                .map((amb: any) => 
                    ambassadorAPI.getSubmissions(amb.id).then(res => res.data?.items || []).catch(() => [])
                );
            
            const ambassadorResults = await Promise.all(ambassadorPromises);
            // Flatten the array of arrays
            return ambassadorResults.flat();
        },
        enabled: !!user && allAmbassadors.length > 0,
    });

    const deleteTask = useMutation({
        mutationFn: async (id: string) => {
            await taskAPI.deleteTask(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });

    // Get current ambassador's submissions for status badges.
    // Keep this hook before any conditional return to preserve React hook order.
    const { data: ambassadorSubmissions = [], isLoading: ambassadorSubmissionsLoading } = useQuery({
        queryKey: ['ambassadorSubmissions', ambassadorProfileId],
        queryFn: async () => {
            if (!isAmbassador || !user) return [];
            if (!ambassadorProfileId) return [];
            const response = await ambassadorAPI.getSubmissions(ambassadorProfileId);
            return response.data?.items || [];
        },
        enabled: isAmbassador && !!ambassadorProfileId,
    });

    // Check if user has permission to view tasks
    const shouldShowPermissionError = !canViewTasks;
    const shouldShowLoading = tasksLoading || ambassadorsLoading || ambassadorLoading || submissionsLoading || ambassadorSubmissionsLoading;
    const shouldShowError = tasksError;

    if (shouldShowPermissionError) {
        return <div className="text-error">You don't have permission to view tasks</div>;
    }

    if (shouldShowLoading) return null;
    if (shouldShowError) return <div className="text-error">Failed to load tasks</div>;

    // Get ambassador rank (default to 1 if not available)
    const ambassadorRank = ambassador?.rank || 1;

    // Create a set of task IDs that have been submitted (taken)
    const submittedTaskIds = new Set();
    allSubmissions.forEach((sub: any) => {
        if (sub.task_id) {
            submittedTaskIds.add(sub.task_id);
        }
    });

    // Filter tasks: 
    // 1. Exclude tasks that have been taken by any ambassador
    // 2. Only include tasks where ambassador's rank meets the task's minimum rank requirement
    const availableTasks = allTasks.filter((task: any) => {
        // Skip if task has been taken
        if (submittedTaskIds.has(task.id)) {
            return false;
        }
        
        // Check rank requirement (if task has a minRank field)
        const minRank = task?.minRank ?? 0; // Default to 0 (no requirement) if not specified
        return ambassadorRank >= minRank;
    });

    const submissionsByTaskId: Record<string, any> = {};
    ambassadorSubmissions?.forEach((sub: any) => {
        submissionsByTaskId[sub.task_id] = sub;
    });

    const getStatusBadge = (sub: any) => {
        const statusName = sub?.status?.display_name || sub?.status?.name || sub?.status;
        if (!statusName) return <span className="badge badge-neutral">Not Submitted</span>;
        const lower = statusName.toLowerCase();
        const cls =
            lower === "approved" ? "badge-success"
                : lower === "rejected" ? "badge-error"
                    : lower === "submitted" ? "badge-warning"
                        : "badge-neutral";
        return <span className={cn("badge", cls)}>{statusName}</span>;
    };

    return (
        <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="card-title">Available Tasks</h2>
                    {isAmbassador && ambassadorRank > 1 && (
                        <span className="badge badge-info ml-2">
                            Rank: {ambassadorRank}
                        </span>
                    )}
                    {canCreateTasks && (
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/task-assignment')}>
                            <Icon name="add" className="w-4 h-4 mr-1" /> Create Task
                        </button>
                    )}
                </div>
                {availableTasks.length ? (
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Task</th>
                                    <th>Platform</th>
                                    <th>Reward</th>
                                    <th>Rank Req.</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {availableTasks.map((t: any) => {
                                    // For ambassador view, check if they have submitted this specific task
                                    const ambassadorSubmission = ambassadorSubmissions?.find(
                                        (sub: any) => sub.task_id === t.id && 
                                                    (sub.ambassador_id === ambassadorProfileId || 
                                                     (sub.ambassador_profile && sub.ambassador_profile.id === ambassadorProfileId))
                                    );
                                    
                                    return (
                                        <tr key={t.id}>
                                            <td>{t.description?.slice(0, 50)}{t.description?.length > 50 ? '...' : ''}</td>
                                            <td>{t.platform?.display_name || 'N/A'}</td>
                                            <td>KES {t.reward?.toLocaleString()}</td>
                                            <td>
                                                {t.minRank !== undefined ? (
                                                    <span className="badge badge-ghost">
                                                        {t.minRank}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs">None</span>
                                                )}
                                            </td>
                                            <td>
                                                {isAmbassador ? (
                                                    ambassadorSubmission ? (
                                                        <span className={cn("badge", 
                                                            ambassadorSubmission.status?.name?.toLowerCase() === 'approved' ? "badge-success" :
                                                            ambassadorSubmission.status?.name?.toLowerCase() === 'rejected' ? "badge-error" :
                                                            ambassadorSubmission.status?.name?.toLowerCase() === 'submitted' ? "badge-warning" :
                                                                "badge-neutral")}>
                                                            {ambassadorSubmission.status?.name}
                                                        </span>
                                                    ) : <span className="badge badge-neutral">Not Submitted</span>
                                                ) : (
                                                    <span className="text-xs">Submitted by others</span>
                                                )}
                                            </td>
                                            <td>
                                                {isAmbassador ? (
                                                    !ambassadorSubmission ? (
                                                        <button
                                                            className="btn btn-primary btn-xs"
                                                            onClick={() => navigate(`/task-submit/${t.id}`)}
                                                        >
                                                            Submit Proof
                                                        </button>
                                                    ) : ambassadorSubmission.status?.name?.toLowerCase() === 'rejected' ? (
                                                        <>
                                                            <button
                                                                className="btn btn-warning btn-xs mr-2"
                                                                onClick={() => navigate(`/task-submit/${t.id}`)}
                                                            >
                                                                Resubmit
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-sm text-base-content/50">
                                                            Reviewed {ambassadorSubmission.reviewed_at ? new Date(ambassadorSubmission.reviewed_at).toLocaleDateString() : ''}
                                                        </span>
                                                    )
                                               ) : isHubManager || isSuperAdmin ? (
                                                        <>
                                                            <button
                                                                className="btn btn-primary btn-xs mr-2"
                                                                onClick={() => navigate(`/task-edit/${t.id}`)}
                                                            >
                                                                <Icon name="edit" className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                className="btn btn-info btn-xs mr-2"
                                                                onClick={() => navigate(`/task-review/${t.id}`)}
                                                            >
                                                                <Icon name="info" className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                className="btn btn-error btn-xs"
                                                                onClick={() => {
                                                                    if (confirm('Delete this task?')) {
                                                                        deleteTask.mutate(t.id);
                                                                    }
                                                                }}
                                                                disabled={deleteTask.isPending}
                                                            >
                                                                {deleteTask.isPending ? <span className="loading loading-spinner loading-xs" /> : <Icon name="trash" className="w-4 h-4" />}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            className="btn btn-primary btn-xs"
                                                            onClick={() => navigate(`/task-view/${t.id}`)}
                                                        >
                                                            <Icon name="eye" className="w-4 h-4" />
                                                        </button>
                                                    )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-base-content/50 py-8 text-center">No tasks available.</p>
                )}
            </div>
        </div>
    );
}
