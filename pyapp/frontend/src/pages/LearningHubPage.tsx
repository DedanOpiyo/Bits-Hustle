import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { learningResourceAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { cn } from "../utils";
import type { IconName } from "../components/Icon";

const RESOURCE_TYPE_ICONS: Record<string, IconName> = {
  pdf: "file",
  video: "play",
  script: "chat",
  explainer: "info",
  flyer: "document",
  best_practice: "book",
};

const RESOURCE_TYPE_BADGES: Record<string, string> = {
  pdf: "badge-error",
  video: "badge-info",
  script: "badge-warning",
  explainer: "badge-neutral",
  flyer: "badge-success",
  best_practice: "badge-info",
};

export default function LearningHubPage() {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();
  const queryClient = useQueryClient();

  const canViewResources = user && checkPermission("learning_resources:read");
  const canCreateResources = user && checkPermission("learning_resources:create");

  if (!canViewResources) {
    return <div className="text-error">You don't have permission to view learning resources</div>;
  }

  const { data: resources, isLoading, error } = useQuery({
    queryKey: ["learningResources"],
    queryFn: async () => {
      const response = await learningResourceAPI.getResources({});
      return response.data?.items || [];
    },
    enabled: !!user,
  });

  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    category: "",
    type: "",
    url: "",
    thumbnailUrl: "",
    tags: "",
    isActive: true,
  });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");

const allResources = resources || [];
   const categories = [...new Set(allResources.map((r: any) => r.category).filter(Boolean))] as string[];
   const types = [...new Set(allResources.map((r: any) => r.type).filter(Boolean))] as string[];

  const createResource = useMutation({
    mutationFn: async (data: any) => {
      await learningResourceAPI.createResource(data);
    },
    onSuccess: () => {
      setNewResource({ title: "", description: "", category: "", type: "", url: "", thumbnailUrl: "", tags: "", isActive: true });
      queryClient.invalidateQueries({ queryKey: ["learningResources"] });
    },
    onError: () => {},
  });

  if (isLoading) return null;
  if (error) return <div className="text-error">Failed to load learning resources</div>;

  const filteredResources = allResources.filter((r: any) => {
    if (selectedCategory && r.category !== selectedCategory) return false;
    if (selectedType && r.type !== selectedType) return false;
    return true;
  });

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">Learning Hub</h2>

        <div className="alert alert-info mb-4">
          <Icon name="info" className="w-5 h-5" />
          <span>
            <strong>Learning Hub function:</strong> The ambassador training &amp; resource library. Browse
            guides, video tutorials, sales scripts and best practices to build your skills, then open any
            resource to study it. Managers curate the materials; ambassadors consume them to improve
            performance.
          </span>
        </div>

        {canCreateResources && (
          <details className="collapse collapse-arrow border border-base-300 mb-6">
            <summary className="collapse-title text-lg font-semibold">Add New Learning Resource</summary>
            <div className="collapse-content">
              <form onSubmit={(e) => { e.preventDefault(); createResource.mutateAsync(newResource); }} className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label"><span className="label-text">Title</span></label>
                  <input type="text" value={newResource.title} onChange={(e) => setNewResource((p) => ({ ...p, title: e.target.value }))} className="input input-bordered w-full" required />
                </div>
                <div>
                  <label className="label"><span className="label-text">Category</span></label>
                  <select value={newResource.category} onChange={(e) => setNewResource((p) => ({ ...p, category: e.target.value }))} className="select select-bordered w-full" required>
                    <option value="">Select Category</option>
                    {["Marketing", "Sales", "Customer Service", "Product Knowledge", "Entrepreneurship"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label"><span className="label-text">Type</span></label>
                  <select value={newResource.type} onChange={(e) => setNewResource((p) => ({ ...p, type: e.target.value }))} className="select select-bordered w-full" required>
                    <option value="">Select Type</option>
                    <option value="pdf">PDF Guide</option>
                    <option value="video">Video Tutorial</option>
                    <option value="script">Sales Script</option>
                    <option value="explainer">Product Explainer</option>
                    <option value="flyer">Flyer</option>
                    <option value="best_practice">Best Practice</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label"><span className="label-text">URL</span></label>
                  <input type="url" value={newResource.url} onChange={(e) => setNewResource((p) => ({ ...p, url: e.target.value }))} className="input input-bordered w-full" required />
                </div>
                <div className="md:col-span-2">
                  <label className="label"><span className="label-text">Description</span></label>
                  <textarea value={newResource.description} onChange={(e) => setNewResource((p) => ({ ...p, description: e.target.value }))} className="textarea textarea-bordered w-full" rows={2} />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="btn btn-primary" disabled={createResource.isPending}>
                    {createResource.isPending ? <span className="loading loading-spinner loading-sm" /> : <><Icon name="add" className="w-4 h-4 mr-1" /> Add Resource</>}
                  </button>
                </div>
              </form>
            </div>
          </details>
        )}

        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-48">
            <label className="label"><span className="label-text">Category</span></label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="select select-bordered w-full">
              <option value="">All Categories</option>
              {categories.map((c: string) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <label className="label"><span className="label-text">Type</span></label>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="select select-bordered w-full">
              <option value="">All Types</option>
              {types.map((t: string) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
        </div>

        {filteredResources.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((r: any) => {
              const icon = RESOURCE_TYPE_ICONS[r.type] || "document";
              const badgeCls = RESOURCE_TYPE_BADGES[r.type] || "badge-neutral";
              return (
                <div key={r.id} className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name={icon} className="w-5 h-5 text-primary" />
                        <h3 className="card-title text-sm">{r.title}</h3>
                      </div>
                      <span className={cn("badge badge-xs", badgeCls)}>{r.type}</span>
                    </div>
                    {r.description && <p className="text-xs text-base-content/60 mt-2 line-clamp-2">{r.description}</p>}
                    <div className="mt-3">
                      <span className="badge badge-ghost badge-xs">{r.category}</span>
                      {r.tags && typeof r.tags === "string" && r.tags.split(",").map((tag: string, i: number) => (
                        <span key={i} className="badge badge-ghost badge-xs ml-1">{tag.trim()}</span>
                      ))}
                    </div>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm mt-3">
                      <Icon name="external-link" className="w-3 h-3 mr-1" /> Open
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-base-content/50 py-8 text-center">No learning resources available.</p>
        )}
      </div>
    </div>
  );
}
