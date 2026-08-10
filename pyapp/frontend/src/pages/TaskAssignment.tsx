import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskAPI, campaignAPI, taskTypeAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";

interface CampaignItem {
  id: string;
  name: string;
  platform_id?: string;
  platform?: {
    id?: string;
    display_name?: string;
  };
}

interface TaskTypeItem {
  id: string;
  display_name: string;
}

export default function TaskAssignment() {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();
  const queryClient = useQueryClient();

  // Check if user has permission to create tasks
  const canCreateTasks = user && checkPermission('tasks:create');

  if (!canCreateTasks) {
    return <div className="text-error">You don't have permission to assign tasks</div>;
  }

    const { data: campaigns, isLoading: campaignsLoading } = useQuery({
      queryKey: ["campaigns"],
      queryFn: async () => (await campaignAPI.getCampaigns({})).data?.items || [],
      enabled: !!user,
    });

   const { data: taskTypes, isLoading: taskTypesLoading } = useQuery<TaskTypeItem[], Error>({
     queryKey: ["taskTypes"],
     queryFn: async () => {
       const response = await taskTypeAPI.getTaskTypes();
       return response.data?.items || response.data || [];
     },
     enabled: !!user,
   });

   const [newTask, setNewTask] = useState<{
     campaignId: string;
     description: string;
     reward: string;
     deadline: string;
     typeId: string;
   }>({
     campaignId: "",
     description: "",
     reward: "",
     deadline: "",
     typeId: "",
   });

interface CreateTaskPayload {
  campaignId: string;
  description: string;
  reward: string;
  deadline: string;
  typeId: string;
  platformId: string;
}

const createTask = useMutation<
   any, // Return type of the mutation function
   any, // Error type
   CreateTaskPayload // Payload type
>({
     mutationFn: async (payload: CreateTaskPayload) => {
       return await taskAPI.createTask(payload);
     },
     onSuccess: () => {
       setNewTask({
         campaignId: "",
         description: "",
         reward: "",
         deadline: "",
         typeId: "",
       });
       queryClient.invalidateQueries({ queryKey: ["tasks"] });
     },
   });

   const selectedCampaign = campaigns?.find((c: CampaignItem) => c.id === newTask.campaignId);
   const selectedPlatformId = selectedCampaign?.platform_id || selectedCampaign?.platform?.id;

  if (campaignsLoading || taskTypesLoading) return null;
  if (!Array.isArray(taskTypes)) return <div className="text-error">Failed to load task types</div>;

  return (
    <>
      <div className="card bg-base-100 border border-base-300 shadow-sm mb-6">
        <div className="card-body">
          <h2 className="card-title">Create New Task</h2>
<form onSubmit={(e) => {
             e.preventDefault();
             createTask.mutateAsync({
               ...newTask,
               platformId: selectedPlatformId,
             });
           }} className="space-y-4">
             <div>
               <label className="label">
                 <span className="label-text">Campaign</span>
               </label>
               <select
                 value={newTask.campaignId}
                 onChange={(e) => setNewTask((p) => ({ ...p, campaignId: e.target.value }))}
                 className="select select-bordered w-full"
                 required
               >
                 <option value="">Select Campaign</option>
 {campaigns?.map((c: CampaignItem) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.platform?.display_name || "Unknown Platform"})
                    </option>
                  ))}
                </select>
             </div>
            <div>
              <label className="label">
                <span className="label-text">Task Type</span>
              </label>
              <select
                value={newTask.typeId}
                onChange={(e) => setNewTask((p) => ({ ...p, typeId: e.target.value }))}
                className="select select-bordered w-full"
                required
              >
                <option value="">Select Task Type</option>
                {taskTypes?.map((tt ) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
                className="textarea textarea-bordered w-full"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <span className="label-text">Reward (KES)</span>
                </label>
                <input
                  type="number"
                  value={newTask.reward}
                  onChange={(e) => setNewTask((p) => ({ ...p, reward: e.target.value }))}
                  className="input input-bordered w-full"
                  required
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Deadline</span>
                </label>
                <input
                  type="datetime-local"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask((p) => ({ ...p, deadline: e.target.value }))}
                  className="input input-bordered w-full"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary" disabled={createTask.isPending}>
                {createTask.isPending ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <><Icon name="add" className="w-4 h-4 mr-1" /> Assign Task</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body">
          <h2 className="card-title mb-4">Assigned Tasks</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Campaign</th>
                  <th>Platform</th>
                  <th>Reward</th>
                  <th>Type</th>
                  <th>Deadline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="text-base-content/50 py-8 text-center">
                    No tasks assigned yet. Use the form above to assign tasks.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

