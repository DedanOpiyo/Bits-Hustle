import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskAPI, ambassadorAPI } from "../services/api";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";

export default function TaskSubmissionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const queryClient = useQueryClient();
  const ambassadorProfileId = user?.ambassador_profile?.id || user?.ambassador_id || null;

  const [proofUrl, setProofUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

// Fetch task details
  const { data: task, isLoading: taskLoading, error: taskError } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const response = await taskAPI.getTask(taskId);
      return response.data;
    },
    enabled: !!taskId && !!user,
  });

  // Fetch ambassador info
  const { data: ambassador, isLoading: ambassadorLoading } = useQuery({
    queryKey: ["ambassador", ambassadorProfileId],
    queryFn: async () => {
      if (!ambassadorProfileId) return null;
      const response = await ambassadorAPI.getAmbassador(ambassadorProfileId);
      return response.data;
    },
    enabled: !!ambassadorProfileId,
  });

  const submitProof = useMutation({
    mutationFn: async (data: { taskId: string; proofUrl: string }) => {
      const { data: response } = await api.post('/task-submissions', {
        taskId: data.taskId,
        proofUrl: data.proofUrl,
      });
      return response;
    },
    onSuccess: () => {
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["ambassadorSubmissions"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      navigate(-1); // Go back to previous page
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "An error occurred";
      setFormError(message);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (!proofUrl && !selectedFile) {
      setFormError("Proof file or URL is required");
      setIsSubmitting(false);
      return;
    }

    try {
      let finalProofUrl = proofUrl;
      if (selectedFile) {
        const uploadResponse = await taskAPI.uploadProofFile(selectedFile);
        finalProofUrl = uploadResponse.data?.url;
      }

      if (!finalProofUrl) {
        setFormError("Proof file or URL is required");
        setIsSubmitting(false);
        return;
      }

      await submitProof.mutateAsync({
        taskId: taskId!,
        proofUrl: finalProofUrl,
      });
    } catch (err) {
      // Error is handled in onError
    }
  };

  if (!user) {
    return <div className="text-error">You must be logged in to view this page</div>;
  }

  if (taskLoading || ambassadorLoading) {
    return <div className="text-base-content/50 py-8 text-center">Loading...</div>;
  }

  if (taskError) {
    return <div className="text-error">Failed to load task details</div>;
  }

  if (!task) {
    return <div className="text-error">Task not found</div>;
  }

  if (!ambassador) {
    return <div className="text-error">Ambassador profile not found</div>;
  }

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">Submit Task Proof</h2>
<div className="card bg-base-100 border border-base-300 shadow-sm mb-6">
<div className="card-body">
               <h3 className="card-title mb-2">Task Details</h3>
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

        {formError && (
          <div className="alert alert-error mb-4">
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label"><span className="label-text">Upload Proof File</span></label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSelectedFile(file);
                if (file) setProofUrl("");
              }}
              className="file-input file-input-bordered w-full"
            />
            <p className="text-xs text-base-content/50 mt-1">Allowed: JPG, PNG, WEBP, PDF, DOC, DOCX. Max 10MB.</p>
          </div>

          <div>
            <label className="label"><span className="label-text">Proof URL (Optional if file uploaded)</span></label>
            <input
              type="text"
              value={proofUrl}
              onChange={(e) => {
                setProofUrl(e.target.value);
                if (e.target.value) setSelectedFile(null);
              }}
              placeholder="Paste URL to proof if you are not uploading a file"
              className="input input-bordered w-full"
            />
          </div>

          <div>
            <label className="label"><span className="label-text">Description (Optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your proof or task completion"
              className="textarea textarea-bordered w-full"
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <Icon name="upload" className="w-4 h-4 mr-1" />
                  Submit Proof
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-secondary ml-2"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

