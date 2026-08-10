import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useToast } from "../contexts/ToastContext";
import { assignmentCategoryAPI } from "../services/api";

type FormState = {
  name: string;
  display_name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

const emptyForm: FormState = { name: "", display_name: "", description: "", sort_order: 0, is_active: true };

export default function AssignmentCategoriesPage() {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const canManage = user && checkPermission("assignments:manage");
  if (!canManage) return <div className="text-error">You don't have permission to manage assignment categories</div>;

  const [newItem, setNewItem] = useState<FormState>(emptyForm);
  const [editingItem, setEditingItem] = useState<{ id: string; data: FormState } | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["assignment-categories"],
    queryFn: async () => {
      const response = await assignmentCategoryAPI.getCategories();
      return response.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormState) => assignmentCategoryAPI.createCategory(data),
    onSuccess: () => {
      setNewItem(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["assignment-categories"] });
      toast("Category added successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to add category";
      toast(msg, "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormState }) => assignmentCategoryAPI.updateCategory(id, data),
    onSuccess: () => {
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["assignment-categories"] });
      toast("Category updated successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to update category";
      toast(msg, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => assignmentCategoryAPI.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment-categories"] });
      toast("Category deleted successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to delete category";
      toast(msg, "error");
    },
  });

  if (isLoading) return <div className="loading loading-spinner loading-lg" />;

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">Assignment Categories</h2>

        <details className="collapse collapse-arrow border border-base-300 mb-6">
          <summary className="collapse-title text-lg font-semibold">Add New Category</summary>
          <div className="collapse-content">
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newItem.name || !newItem.display_name) return toast("Name and Display Name required", "error");
                createMutation.mutateAsync(newItem);
              }}
              className="grid md:grid-cols-4 gap-4"
            >
              <div>
                <label className="label"><span className="label-text">Name (slug)</span></label>
                <input type="text" value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} className="input input-bordered w-full" placeholder="e.g., design" required />
              </div>
              <div>
                <label className="label"><span className="label-text">Display Name</span></label>
                <input type="text" value={newItem.display_name} onChange={e => setNewItem(p => ({ ...p, display_name: e.target.value }))} className="input input-bordered w-full" placeholder="e.g., Design" required />
              </div>
              <div>
                <label className="label"><span className="label-text">Description</span></label>
                <input type="text" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} className="input input-bordered w-full" placeholder="Optional" />
              </div>
              <div>
                <label className="label"><span className="label-text">Sort Order</span></label>
                <input type="number" value={newItem.sort_order} onChange={e => setNewItem(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} className="input input-bordered w-full" />
              </div>
              <div className="md:col-span-4">
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <span className="loading loading-spinner loading-sm" /> : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </details>

        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Display Name</th>
                <th>Name (slug)</th>
                <th>Description</th>
                <th>Sort Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((item: any) => {
                const isEditing = editingItem?.id === item.id;
                return (
                <tr key={item.id}>
                  <td>
                    {isEditing ? (
                      <input type="text" value={editingItem!.data.display_name} onChange={e => setEditingItem(p => p ? { ...p, data: { ...p.data, display_name: e.target.value } } : null)} className="input input-bordered input-sm w-full" />
                    ) : (
                      <div className="font-semibold">{item.display_name}</div>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="text" value={editingItem!.data.name} onChange={e => setEditingItem(p => p ? { ...p, data: { ...p.data, name: e.target.value } } : null)} className="input input-bordered input-sm w-full" />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="text" value={editingItem!.data.description} onChange={e => setEditingItem(p => p ? { ...p, data: { ...p.data, description: e.target.value } } : null)} className="input input-bordered input-sm w-full" />
                    ) : (
                      item.description || "—"
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="number" value={editingItem!.data.sort_order} onChange={e => setEditingItem(p => p ? { ...p, data: { ...p.data, sort_order: parseInt(e.target.value) || 0 } } : null)} className="input input-bordered input-sm w-20" />
                    ) : (
                      item.sort_order
                    )}
                  </td>
                  <td>
                    <span className={`badge ${item.is_active ? 'badge-success' : 'badge-ghost'}`}>{item.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button className="btn btn-success btn-xs" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: item.id, data: editingItem!.data })}>Save</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => setEditingItem(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-primary btn-xs" onClick={() => setEditingItem({ id: item.id, data: { name: item.name, display_name: item.display_name, description: item.description || '', sort_order: item.sort_order || 0, is_active: item.is_active } })}>Edit</button>
                          <button className="btn btn-error btn-xs" disabled={deleteMutation.isPending} onClick={() => { if (confirm('Delete this category?')) deleteMutation.mutate(item.id); }}>Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
              })}
              {!categories.length && <tr><td colSpan={6} className="text-center opacity-70">No categories found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
