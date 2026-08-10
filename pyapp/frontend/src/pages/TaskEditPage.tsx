import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskAPI, campaignAPI, taskTypeAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useNavigate, useParams } from "react-router-dom";

export default function TaskEditPage() {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const queryClient = useQueryClient();

  const canEditTasks = user && checkPermission('tasks:update');

  if (!canEditTasks) {
    return <div className="text-error">You don't have permission to edit tasks</div>;
  }

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => (await campaignAPI.getCampaigns({})).data?.items || [],
    enabled: !!user,
  });

  const { data: taskTypes } = useQuery({
    queryKey: ["taskTypes"],
    queryFn: async () => {
      const response = await taskTypeAPI.getTaskTypes();
      return response.data?.items || response.data || [];
    },
    enabled: !!user,
  });

  // Fetch task details
  const { data: task, isLoading: taskLoading, error: taskError } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const response = await taskAPI.getTask(taskId);
      return response.data;
    },
    enabled: !!taskId && !!user,
  });

  const [editTask, setEditTask] = useState({
    campaignId: "",
    description: "",
    reward: "",
    deadline: "",
    typeId: "",
  });

  useEffect(() => {
    if (task) {
      setEditTask({
        campaignId: task.campaign_id || "",
        description: task.description || "",
        reward: String(task.reward || ""),
        deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : "",
        typeId: task.type_id || "",
      });
    }
  }, [task]);

  const updateTaskMutation = useMutation({
    mutationFn: async (data: typeof editTask) => {
      await taskAPI.updateTask(taskId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      navigate("/tasks");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to update task";
      alert(message);
    },
  });

  if (taskLoading) return <div className="text-base-content/50 py-8 text-center">Loading...</div>;
  if (taskError) return <div className="text-error">Failed to load task details</div>;
  if (!task) return <div className="text-error">Task not found</div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTaskMutation.mutateAsync(editTask);
  };

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">Edit Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label"><span className="label-text">Campaign</span></label>
            <select
              value={editTask.campaignId}
              onChange={(e) => setEditTask((p) => ({ ...p, campaignId: e.target.value }))}
              className="select select-bordered w-full"
              required
            >
              <option value="">Select Campaign</option>
              {campaigns?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.platform?.display_name || "Unknown Platform"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label"><span className="label-text">Task Type</span></label>
            <select
              value={editTask.typeId}
              onChange={(e) => setEditTask((p) => ({ ...p, typeId: e.target.value }))}
              className="select select-bordered w-full"
              required
            >
              <option value="">Select Task Type</option>
              {taskTypes?.map((tt: any) => (
                <option key={tt.id} value={tt.id}>
                  {tt.display_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label"><span className="label-text">Description</span></label>
            <textarea
              value={editTask.description}
              onChange={(e) => setEditTask((p) => ({ ...p, description: e.target.value }))}
              className="textarea textarea-bordered w-full"
              rows={4}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label"><span className="label-text">Reward (KES)</span></label>
              <input
                type="number"
                value={editTask.reward}
                onChange={(e) => setEditTask((p) => ({ ...p, reward: e.target.value }))}
                className="input input-bordered w-full"
                required
              />
            </div>
            <div>
              <label className="label"><span className="label-text">Deadline</span></label>
              <input
                type="datetime-local"
                value={editTask.deadline}
                onChange={(e) => setEditTask((p) => ({ ...p, deadline: e.target.value }))}
                className="input input-bordered w-full"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-outline btn-secondary"
              onClick={() => navigate("/tasks")}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={updateTaskMutation.isPending}>
              {updateTaskMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <><Icon name="edit" className="w-4 h-4 mr-1" /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
