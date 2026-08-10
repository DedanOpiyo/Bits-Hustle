import { useQuery } from "@tanstack/react-query";
import { taskAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { usePlatforms } from "../constants/platforms";

export default function TaskViewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const { data: platforms } = usePlatforms();

   // Fetch task details
   const { data: task, isLoading: taskLoading, error: taskError } = useQuery({
     queryKey: ["task", taskId],
     queryFn: async () => {
       const response = await taskAPI.getTask(taskId);
       return response.data;
     },
     enabled: !!taskId && !!user,
   });

   if (!user) {
     return <div className="text-error">You must be logged in to view this page</div>;
   }

   if (taskLoading) {
    return <div className="text-base-content/50 py-8 text-center">Loading task details...</div>;
  }

  if (taskError) {
    return <div className="text-error">Failed to load task details</div>;
  }

  if (!task) {
    return <div className="text-error">Task not found</div>;
  }

  // Get platform details - either from embedded data or by looking up in platforms array
  const getPlatformDisplayName = (): string => {
    // If task has embedded platform data with display_name, use it
    if (task.platform?.display_name) {
      return task.platform.display_name;
    }
    
    // If task has embedded platform data with displayName (camelCase), use it
    if (task.platform?.displayName) {
      return task.platform.displayName;
    }
    
    // If we have platforms loaded and task has platform ID, look it up
    if (platforms && task.platform_id) {
      const platform = platforms.find(p => p.id === task.platform_id);
      if (platform) {
        return platform.displayName; // Platform type uses camelCase
      }
    }
    
    // If we have platforms loaded and task has embedded platform with ID, look it up
    if (platforms && task.platform?.id) {
      const platform = platforms.find(p => p.id === task.platform.id);
      if (platform) {
        return platform.displayName; // Platform type uses camelCase
      }
    }
    
    return 'N/A';
  };

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Task Details</h2>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate("/tasks")}
          >
            Back to Tasks
          </button>
        </div>

        <div className="space-y-6">
          {/* Task Info */}
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body">
              <h3 className="card-title">Task Information</h3>
              <p className="mb-4">{task.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="badge badge-outline">Reward: KES {task.reward?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="badge badge-outline">Platform: {getPlatformDisplayName()}</span>
                </div>
                <div>
                  <span className="badge badge-outline">Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div>
                  <span className="badge badge-outline">Type: {task.type?.display_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="badge badge-outline">Campaign: {task.campaign?.name || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
