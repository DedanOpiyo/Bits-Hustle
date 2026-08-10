import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignmentAPI, assignmentCategoryAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';

type GigProposal = {
  id: string;
  proposed_amount?: number;
  adjusted_amount?: number | null;
  final_amount?: number | null;
  cover_letter: string;
  estimated_days?: number | null;
  status: string;
  admin_notes?: string | null;
  rejection_reason?: string | null;
  price_adjust_type?: string | null;
  price_adjust_value?: number | null;
  client_amendment?: string | null;
  worker?: { id?: string; name?: string; email?: string } | null;
};

type Assignment = {
  id: string;
  title: string;
  category: string;
  description: string;
  budget?: number;
  budget_hidden?: boolean;
  final_price?: number | null;
  selected_proposal_id?: string | null;
  client_amendment_notes?: string | null;
  negotiation_notes?: string | null;
  deadline: string;
  status: string;
  priority: string;
  admin_notes?: string;
  revision_notes?: string;
  client?: { name?: string; email?: string } | null;
  worker?: { id?: string; name?: string; email?: string } | null;
  submissions?: Array<{ id: string; deliverable_file?: string; deliverable_link?: string; submission_notes?: string; submitted_at?: string }>;
  timeline?: Array<{ at: string; actorName?: string; action: string; message: string }>;
  messages?: AssignmentMessage[];
  proposals?: GigProposal[];
  my_proposal?: GigProposal | null;
};

type AssignmentMessage = { id: string; message: string; created_at?: string; sender?: { id?: string; name?: string; role?: { display_name?: string; name?: string } } };

type Worker = { id: string; name: string; email: string };
type ReportOverview = {
  total: number;
  completed: number;
  completionRate: number;
  submittedCount: number;
  totalBudget: number;
  completedBudget: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  urgent: Assignment[];
};
type WorkerEarning = { workerId: string; workerName: string; workerEmail: string; assignedCount: number; completedCount: number; earned: number };

const priorities = ['Low', 'Medium', 'High', 'Urgent'];

function statusClass(status: string) {
  if (status === 'Pending Review' || status === 'Open for Proposals') return 'badge-warning';
  if (status === 'Proposals Under Review' || status === 'Proposals Sent to Client') return 'badge-info';
  if (status === 'Client Selected' || status === 'Negotiating') return 'badge-accent';
  if (status === 'Assigned') return 'badge-info';
  if (status === 'In Progress') return 'badge-primary';
  if (status === 'Submitted for Review') return 'badge-accent';
  if (status === 'Completed') return 'badge-success';
  if (status === 'Revision Needed') return 'badge-error';
  return 'badge-neutral';
}

function proposalStatusClass(status: string) {
  if (status === 'Approved' || status === 'Won' || status === 'Client Selected') return 'badge-success';
  if (status === 'Rejected' || status === 'Lost') return 'badge-error';
  if (status === 'Sent to Client' || status === 'Client Amended') return 'badge-info';
  return 'badge-warning';
}

function effectiveAmount(proposal: GigProposal): number {
  if (proposal.final_amount != null) return Number(proposal.final_amount);
  if (proposal.adjusted_amount != null) return Number(proposal.adjusted_amount);
  return Number(proposal.proposed_amount || 0);
}

function stats(assignments: Assignment[]) {
  return {
    pending: assignments.filter((a) => ['Pending Review', 'Open for Proposals', 'Proposals Under Review'].includes(a.status)).length,
    assigned: assignments.filter((a) => a.status === 'Assigned').length,
    inProgress: assignments.filter((a) => a.status === 'In Progress' || a.status === 'Revision Needed').length,
    submitted: assignments.filter((a) => a.status === 'Submitted for Review').length,
    completed: assignments.filter((a) => a.status === 'Completed').length,
    total: assignments.length,
  };
}

function formatMoney(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `KES ${Number(value).toLocaleString()}`;
}

export default function GigAssignmentsPage() {
  const { checkRole } = usePermissions();
  const isClient = checkRole('CLIENT');
  const isWorker = checkRole('GIG_WORKER');
  const isAdmin = checkRole('ADMIN') || checkRole('SUPER_ADMIN');
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [form, setForm] = useState({ title: '', category: '', description: '', budget: '', deadline: '', priority: 'Medium', files: '' });
  const [briefFiles, setBriefFiles] = useState<FileList | null>(null);
  const [assignForm, setAssignForm] = useState({ workerId: '', adminNotes: '' });
  const [submissionForm, setSubmissionForm] = useState({ deliverableFile: '', deliverableLink: '', submissionNotes: '' });
  const [deliverableFile, setDeliverableFile] = useState<File | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [messageText, setMessageText] = useState('');
  const [proposalForm, setProposalForm] = useState({ proposedAmount: '', coverLetter: '', estimatedDays: '' });
  const [proposalReview, setProposalReview] = useState<Record<string, { adjustType: '' | 'percentage' | 'amount'; adjustValue: string; adminNotes: string; rejectionReason: string }>>({});
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const [clientAmendment, setClientAmendment] = useState('');
  const [negotiateForm, setNegotiateForm] = useState({ finalPrice: '', negotiationNotes: '', adminNotes: '' });

  const { data: assignments = [], isLoading, error } = useQuery({
    queryKey: ['gig-assignments'],
    queryFn: async () => {
      const response = await assignmentAPI.getAssignments({ perPage: 100 });
      return response.data?.items || [];
    },
  });

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['assignment-categories'],
    queryFn: async () => {
      const response = await assignmentCategoryAPI.getCategories();
      return response.data || [];
    },
  });

  const categories = useMemo(() => categoriesData.map((c: { display_name?: string; name?: string }) => c.display_name || c.name || ''), [categoriesData]);

  const { data: workers = [] } = useQuery({
    queryKey: ['gig-workers'],
    queryFn: async () => {
      const response = await assignmentAPI.getWorkers();
      return response.data || [];
    },
    enabled: isAdmin,
  });

  const { data: overview } = useQuery<ReportOverview | undefined>({
    queryKey: ['gig-overview-report'],
    queryFn: async () => {
      const response = await assignmentAPI.getOverviewReport();
      return response.data;
    },
    enabled: isAdmin,
  });

  const { data: earnings = [] } = useQuery<WorkerEarning[]>({
    queryKey: ['gig-worker-earnings'],
    queryFn: async () => {
      const response = await assignmentAPI.getWorkerEarnings();
      return response.data || [];
    },
    enabled: isAdmin || isWorker,
  });

  const { data: messages = [] } = useQuery<AssignmentMessage[]>({
    queryKey: ['gig-assignment-messages', selected?.id],
    queryFn: async () => {
      if (!selected?.id) return [];
      const response = await assignmentAPI.getMessages(selected.id);
      return response.data || [];
    },
    enabled: !!selected?.id,
  });

  const summary = useMemo(() => stats(assignments), [assignments]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['gig-assignments'] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const uploadedFiles = briefFiles
        ? await Promise.all(Array.from(briefFiles).map(async (file) => {
          const response = await assignmentAPI.uploadBriefFile(file);
          return response.data;
        }))
        : [];
      const manualFiles = form.files.split(',').map((file) => file.trim()).filter(Boolean);
      return assignmentAPI.createAssignment({
        ...form,
        budget: Number(form.budget),
        files: [...uploadedFiles, ...manualFiles],
      });
    },
    onSuccess: () => {
      setForm({ title: '', category: '', description: '', budget: '', deadline: '', priority: 'Medium', files: '' });
      setBriefFiles(null);
      refresh();
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, payload }: { id: string; action: string; payload?: Record<string, unknown> }) => {
      if (action === 'assign') return assignmentAPI.assignWorker(id, payload);
      if (action === 'accept') return assignmentAPI.acceptAssignment(id);
      if (action === 'reject') return assignmentAPI.rejectAssignment(id);
      if (action === 'submit') {
        let submitPayload = payload;
        if (deliverableFile) {
          const response = await assignmentAPI.uploadDeliverableFile(deliverableFile);
          submitPayload = { ...payload, deliverableFile: response.data?.url || response.data };
        }
        return assignmentAPI.submitWork(id, submitPayload);
      }
      return assignmentAPI.reviewAssignment(id, payload);
    },
    onSuccess: (response) => {
      setSelected(response.data);
      setSubmissionForm({ deliverableFile: '', deliverableLink: '', submissionNotes: '' });
      setDeliverableFile(null);
      setReviewNotes('');
      refresh();
    },
  });

  const proposalMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.id) return null;
      return assignmentAPI.submitProposal(selected.id, {
        proposedAmount: Number(proposalForm.proposedAmount),
        coverLetter: proposalForm.coverLetter,
        estimatedDays: proposalForm.estimatedDays ? Number(proposalForm.estimatedDays) : undefined,
      });
    },
    onSuccess: async () => {
      setProposalForm({ proposedAmount: '', coverLetter: '', estimatedDays: '' });
      if (selected?.id) {
        const response = await assignmentAPI.getAssignment(selected.id);
        setSelected(response.data);
      }
      refresh();
    },
  });

  const proposalReviewMutation = useMutation({
    mutationFn: async ({ proposalId, action }: { proposalId: string; action: 'approve' | 'reject' }) => {
      if (!selected?.id) return null;
      const state = proposalReview[proposalId] || { adjustType: '', adjustValue: '', adminNotes: '', rejectionReason: '' };
      return assignmentAPI.reviewProposal(selected.id, proposalId, {
        action,
        adjustType: state.adjustType || undefined,
        adjustValue: state.adjustValue ? Number(state.adjustValue) : undefined,
        adminNotes: state.adminNotes || undefined,
        rejectionReason: state.rejectionReason || undefined,
      });
    },
    onSuccess: async () => {
      if (selected?.id) {
        const response = await assignmentAPI.getAssignment(selected.id);
        setSelected(response.data);
      }
      refresh();
    },
  });

  const sendToClientMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.id) return null;
      return assignmentAPI.sendProposalsToClient(selected.id, selectedProposalIds);
    },
    onSuccess: (response) => {
      if (response?.data) setSelected(response.data);
      setSelectedProposalIds([]);
      refresh();
    },
  });

  const selectProposalMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      if (!selected?.id) return null;
      return assignmentAPI.selectProposal(selected.id, proposalId, { amendment: clientAmendment || undefined });
    },
    onSuccess: (response) => {
      if (response?.data) setSelected(response.data);
      setClientAmendment('');
      refresh();
    },
  });

  const negotiateMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.id) return null;
      return assignmentAPI.negotiateAndAssign(selected.id, {
        finalPrice: Number(negotiateForm.finalPrice),
        proposalId: selected.selected_proposal_id || undefined,
        negotiationNotes: negotiateForm.negotiationNotes || undefined,
        adminNotes: negotiateForm.adminNotes || undefined,
      });
    },
    onSuccess: (response) => {
      if (response?.data) setSelected(response.data);
      setNegotiateForm({ finalPrice: '', negotiationNotes: '', adminNotes: '' });
      refresh();
    },
  });

  const workerStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => assignmentAPI.updateWorkerStatus(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gig-workers'] }),
  });

  const messageMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.id) return null;
      return assignmentAPI.createMessage(selected.id, messageText);
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['gig-assignment-messages', selected?.id] });
      refresh();
    },
  });

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate();
  };

  const downloadBlob = async (request: Promise<{ data: BlobPart; headers?: { [key: string]: unknown } }>, filename: string) => {
    const response = await request;
    const contentType = String(response.headers?.['content-type'] || 'application/octet-stream');
    const blob = new Blob([response.data], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const selectedLatestSubmission = selected?.submissions?.[0];
  const proposals = selected?.proposals || [];
  const approvedProposals = proposals.filter((p) => p.status === 'Approved');
  const clientVisibleProposals = proposals.filter((p) => ['Sent to Client', 'Client Selected', 'Client Amended', 'Won', 'Lost'].includes(p.status));
  const selectedProposal = proposals.find((p) => p.id === selected?.selected_proposal_id) || null;
  const openForProposals = selected && ['Pending Review', 'Open for Proposals', 'Proposals Under Review'].includes(selected.status);
  const canSubmitProposal = isWorker && openForProposals && !selected?.my_proposal && !selected?.worker?.id;

  const toggleProposalSelection = (proposalId: string) => {
    setSelectedProposalIds((prev) => (prev.includes(proposalId) ? prev.filter((id) => id !== proposalId) : [...prev, proposalId]));
  };

  const updateProposalReview = (proposalId: string, patch: Partial<{ adjustType: '' | 'percentage' | 'amount'; adjustValue: string; adminNotes: string; rejectionReason: string }>) => {
    setProposalReview((prev) => ({
      ...prev,
      [proposalId]: {
        adjustType: prev[proposalId]?.adjustType || '',
        adjustValue: prev[proposalId]?.adjustValue || '',
        adminNotes: prev[proposalId]?.adminNotes || '',
        rejectionReason: prev[proposalId]?.rejectionReason || '',
        ...patch,
      },
    }));
  };

  if (isLoading) return <div className="loading loading-spinner loading-lg" />;
  if (error) return <div className="alert alert-error">Failed to load gig assignments.</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="stat bg-base-100 rounded-box border border-base-300"><div className="stat-title">Total</div><div className="stat-value text-2xl">{summary.total}</div></div>
        <div className="stat bg-base-100 rounded-box border border-base-300"><div className="stat-title">Pending</div><div className="stat-value text-2xl text-warning">{summary.pending}</div></div>
        <div className="stat bg-base-100 rounded-box border border-base-300"><div className="stat-title">Assigned</div><div className="stat-value text-2xl text-info">{summary.assigned}</div></div>
        <div className="stat bg-base-100 rounded-box border border-base-300"><div className="stat-title">In Progress</div><div className="stat-value text-2xl text-primary">{summary.inProgress}</div></div>
        <div className="stat bg-base-100 rounded-box border border-base-300"><div className="stat-title">Completed</div><div className="stat-value text-2xl text-success">{summary.completed}</div></div>
      </div>

      {(isAdmin || isWorker) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {isAdmin && overview && (
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <div className="flex justify-between gap-2 items-center">
                  <h2 className="card-title">Assignment Reports</h2>
                  <button className="btn btn-outline btn-sm" onClick={() => downloadBlob(assignmentAPI.exportReportCsv(), 'assignment-report.csv')}>Export CSV</button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-box bg-base-200"><b>Completion Rate</b><div className="text-2xl font-bold">{overview.completionRate}%</div></div>
                  <div className="p-3 rounded-box bg-base-200"><b>Submitted</b><div className="text-2xl font-bold">{overview.submittedCount}</div></div>
                  <div className="p-3 rounded-box bg-base-200"><b>Total Budget</b><div className="text-xl font-bold">{formatMoney(overview.totalBudget)}</div></div>
                  <div className="p-3 rounded-box bg-base-200"><b>Completed Value</b><div className="text-xl font-bold">{formatMoney(overview.completedBudget)}</div></div>
                </div>
                <div>
                  <h3 className="font-semibold mt-3">Urgent Work</h3>
                  <ul className="list-disc ml-5 text-sm">
                    {overview.urgent.map((item) => <li key={item.id}>{item.title} — {item.status} — due {new Date(item.deadline).toLocaleDateString()}</li>)}
                    {!overview.urgent.length && <li>No urgent pending assignments.</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <h2 className="card-title">{isWorker ? 'My Earnings' : 'Worker Earnings'}</h2>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead><tr><th>Worker</th><th>Assigned</th><th>Completed</th><th>Earned</th></tr></thead>
                  <tbody>
                    {earnings.map((row) => (
                      <tr key={row.workerId}>
                        <td><div className="font-semibold">{row.workerName}</div><div className="text-xs opacity-60">{row.workerEmail}</div></td>
                        <td>{row.assignedCount}</td>
                        <td>{row.completedCount}</td>
                        <td>{formatMoney(row.earned)}</td>
                      </tr>
                    ))}
                    {!earnings.length && <tr><td colSpan={4} className="text-center opacity-70">No earnings yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title">Workers Management</h2>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead><tr><th>Worker</th><th>Email</th><th>Action</th></tr></thead>
                <tbody>
                  {workers.map((worker: Worker) => (
                    <tr key={worker.id}>
                      <td>{worker.name}</td>
                      <td>{worker.email}</td>
                      <td>
                        <button className="btn btn-xs btn-warning" onClick={() => workerStatusMutation.mutate({ id: worker.id, isActive: false })}>Disable</button>
                      </td>
                    </tr>
                  ))}
                  {!workers.length && <tr><td colSpan={3} className="text-center opacity-70">No active gig workers found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isClient && (
        <form className="card bg-base-100 border border-base-300" onSubmit={onCreate}>
          <div className="card-body grid md:grid-cols-2 gap-4">
            <h2 className="card-title md:col-span-2">Submit New Assignment</h2>
            <input className="input input-bordered" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <select className="select select-bordered" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category</option>
              {categories.map((category: string) => <option key={category} value={category}>{category}</option>)}
            </select>
            <textarea className="textarea textarea-bordered md:col-span-2" placeholder="Description / brief" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            <input className="input input-bordered" type="number" min="1" placeholder="Budget (admin only)" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} required />
            <input className="input input-bordered" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />
            <select className="select select-bordered" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select>
            <input className="input input-bordered" placeholder="File URLs/references, comma separated" value={form.files} onChange={(e) => setForm({ ...form, files: e.target.value })} />
            <input className="file-input file-input-bordered md:col-span-2" type="file" multiple onChange={(e) => setBriefFiles(e.target.files)} />
            <div className="md:col-span-2"><button className="btn btn-primary" disabled={createMutation.isPending}>Submit Assignment</button></div>
          </div>
        </form>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title">{isAdmin ? 'All Assignments' : isWorker ? 'Open Gigs & My Work' : 'My Assignments'}</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead><tr><th>Assignment</th><th>Status</th><th>Budget</th><th>Deadline</th><th>{isAdmin ? 'Owner' : 'Worker'}</th></tr></thead>
                <tbody>
                  {assignments.map((assignment: Assignment) => (
                    <tr
                      key={assignment.id}
                      className="cursor-pointer hover"
                      onClick={() => {
                        setSelected(assignment);
                        setAssignForm({ workerId: assignment.worker?.id || '', adminNotes: assignment.admin_notes || '' });
                        setSelectedProposalIds([]);
                        setNegotiateForm({
                          finalPrice: assignment.final_price != null ? String(assignment.final_price) : '',
                          negotiationNotes: assignment.negotiation_notes || '',
                          adminNotes: assignment.admin_notes || '',
                        });
                      }}
                    >
                      <td><div className="font-semibold">{assignment.title}</div><div className="text-xs opacity-70">{assignment.category} • {assignment.priority}</div></td>
                      <td><span className={`badge ${statusClass(assignment.status)}`}>{assignment.status}</span></td>
                      <td>{assignment.budget_hidden ? 'Hidden' : formatMoney(assignment.budget)}</td>
                      <td>{assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : '—'}</td>
                      <td>{isAdmin ? assignment.client?.name : assignment.worker?.name || 'Not assigned'}</td>
                    </tr>
                  ))}
                  {!assignments.length && <tr><td colSpan={5} className="text-center opacity-70">No assignments found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title">Assignment Details</h2>
            {!selected ? <p className="opacity-70">Select an assignment to view the brief, proposals, workflow actions, submissions, and timeline.</p> : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg">{selected.title}</h3>
                  <span className={`badge ${statusClass(selected.status)}`}>{selected.status}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{selected.description}</p>
                <div className="text-sm space-y-1">
                  <div><b>Client:</b> {selected.client?.name || '—'} {selected.client?.email ? `(${selected.client.email})` : ''}</div>
                  <div><b>Worker:</b> {selected.worker?.name || 'Not assigned'}</div>
                  <div><b>Budget:</b> {selected.budget_hidden ? 'Hidden from workers' : formatMoney(selected.budget)}</div>
                  {selected.final_price != null && <div><b>Final price:</b> {formatMoney(selected.final_price)}</div>}
                  <div><b>Deadline:</b> {selected.deadline ? new Date(selected.deadline).toLocaleString() : '—'}</div>
                  {selected.admin_notes && <div><b>Admin notes:</b> {selected.admin_notes}</div>}
                  {selected.revision_notes && <div><b>Revision notes:</b> {selected.revision_notes}</div>}
                  {selected.client_amendment_notes && <div><b>Client amendments:</b> {selected.client_amendment_notes}</div>}
                  {selected.negotiation_notes && <div><b>Negotiation notes:</b> {selected.negotiation_notes}</div>}
                  {(isClient || isAdmin) && selected.status === 'Completed' && (
                    <div><button className="btn btn-outline btn-xs mt-2" onClick={() => downloadBlob(assignmentAPI.downloadInvoice(selected.id), `${selected.title.replace(/[^a-z0-9]+/gi, '-')}-invoice.txt`)}>Download Invoice</button></div>
                  )}
                  {Array.isArray((selected as Assignment & { files?: unknown[] }).files) && ((selected as Assignment & { files?: unknown[] }).files?.length || 0) > 0 && (
                    <div>
                      <b>Brief files:</b>
                      <ul className="list-disc ml-5">
                        {((selected as Assignment & { files?: Array<string | { url?: string; original_filename?: string; filename?: string }> }).files || []).map((file, index) => {
                          const url = typeof file === 'string' ? file : file.url || '';
                          const label = typeof file === 'string' ? file : file.original_filename || file.filename || file.url || 'file';
                          return <li key={`${url}-${index}`}><a className="link" href={url} target="_blank" rel="noreferrer">{label}</a></li>;
                        })}
                      </ul>
                    </div>
                  )}
                </div>

                {canSubmitProposal && (
                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-semibold">Submit Proposal</h4>
                    <p className="text-xs opacity-70">Client budget is hidden. Propose your charge for this work.</p>
                    <input className="input input-bordered w-full" type="number" min="1" placeholder="Your proposed amount (KES)" value={proposalForm.proposedAmount} onChange={(e) => setProposalForm({ ...proposalForm, proposedAmount: e.target.value })} required />
                    <input className="input input-bordered w-full" type="number" min="1" placeholder="Estimated days (optional)" value={proposalForm.estimatedDays} onChange={(e) => setProposalForm({ ...proposalForm, estimatedDays: e.target.value })} />
                    <textarea className="textarea textarea-bordered w-full" placeholder="Cover letter / approach" rows={4} value={proposalForm.coverLetter} onChange={(e) => setProposalForm({ ...proposalForm, coverLetter: e.target.value })} required />
                    <button className="btn btn-primary btn-sm" disabled={!proposalForm.proposedAmount || !proposalForm.coverLetter || proposalMutation.isPending} onClick={() => proposalMutation.mutate()}>Submit Proposal</button>
                  </div>
                )}

                {isWorker && selected.my_proposal && (
                  <div className="border-t pt-4 text-sm space-y-1">
                    <h4 className="font-semibold">My Proposal</h4>
                    <div><span className={`badge ${proposalStatusClass(selected.my_proposal.status)}`}>{selected.my_proposal.status}</span></div>
                    <div><b>Proposed:</b> {formatMoney(selected.my_proposal.proposed_amount)}</div>
                    {selected.my_proposal.adjusted_amount != null && <div><b>Admin adjusted:</b> {formatMoney(selected.my_proposal.adjusted_amount)}</div>}
                    {selected.my_proposal.final_amount != null && <div><b>Final:</b> {formatMoney(selected.my_proposal.final_amount)}</div>}
                    {selected.my_proposal.rejection_reason && <div className="text-error"><b>Rejection:</b> {selected.my_proposal.rejection_reason}</div>}
                    <p className="whitespace-pre-wrap opacity-80">{selected.my_proposal.cover_letter}</p>
                  </div>
                )}

                {isAdmin && proposals.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="font-semibold">Proposals ({proposals.length})</h4>
                    {proposals.map((proposal) => {
                      const reviewState = proposalReview[proposal.id] || { adjustType: '' as const, adjustValue: '', adminNotes: '', rejectionReason: '' };
                      return (
                        <div key={proposal.id} className="rounded-box border border-base-300 p-3 space-y-2 text-sm">
                          <div className="flex justify-between gap-2 items-start">
                            <div>
                              <div className="font-semibold">{proposal.worker?.name || 'Worker'}</div>
                              <div className="text-xs opacity-60">{proposal.worker?.email}</div>
                            </div>
                            <span className={`badge ${proposalStatusClass(proposal.status)}`}>{proposal.status}</span>
                          </div>
                          <div><b>Proposed:</b> {formatMoney(proposal.proposed_amount)}</div>
                          {proposal.adjusted_amount != null && <div><b>Adjusted:</b> {formatMoney(proposal.adjusted_amount)}</div>}
                          {proposal.estimated_days != null && <div><b>Est. days:</b> {proposal.estimated_days}</div>}
                          <p className="whitespace-pre-wrap opacity-80">{proposal.cover_letter}</p>
                          {proposal.status === 'Pending' && (
                            <div className="space-y-2 pt-2 border-t border-base-200">
                              <div className="grid grid-cols-2 gap-2">
                                <select className="select select-bordered select-sm" value={reviewState.adjustType} onChange={(e) => updateProposalReview(proposal.id, { adjustType: e.target.value as '' | 'percentage' | 'amount' })}>
                                  <option value="">No price adjust</option>
                                  <option value="percentage">Adjust by %</option>
                                  <option value="amount">Adjust by amount</option>
                                </select>
                                <input className="input input-bordered input-sm" type="number" placeholder={reviewState.adjustType === 'percentage' ? '% e.g. -10 or 5' : 'KES e.g. -200'} value={reviewState.adjustValue} onChange={(e) => updateProposalReview(proposal.id, { adjustValue: e.target.value })} disabled={!reviewState.adjustType} />
                              </div>
                              <input className="input input-bordered input-sm w-full" placeholder="Admin notes" value={reviewState.adminNotes} onChange={(e) => updateProposalReview(proposal.id, { adminNotes: e.target.value })} />
                              <input className="input input-bordered input-sm w-full" placeholder="Rejection reason (if rejecting)" value={reviewState.rejectionReason} onChange={(e) => updateProposalReview(proposal.id, { rejectionReason: e.target.value })} />
                              <div className="flex gap-2">
                                <button className="btn btn-success btn-xs" disabled={proposalReviewMutation.isPending} onClick={() => proposalReviewMutation.mutate({ proposalId: proposal.id, action: 'approve' })}>Approve</button>
                                <button className="btn btn-error btn-xs" disabled={proposalReviewMutation.isPending || !reviewState.rejectionReason} onClick={() => proposalReviewMutation.mutate({ proposalId: proposal.id, action: 'reject' })}>Reject</button>
                              </div>
                            </div>
                          )}
                          {proposal.status === 'Approved' && (
                            <label className="label cursor-pointer justify-start gap-2">
                              <input type="checkbox" className="checkbox checkbox-sm" checked={selectedProposalIds.includes(proposal.id)} onChange={() => toggleProposalSelection(proposal.id)} />
                              <span className="label-text">Include when sending to client</span>
                            </label>
                          )}
                        </div>
                      );
                    })}
                    {approvedProposals.length > 0 && selected.status !== 'Proposals Sent to Client' && !['Assigned', 'In Progress', 'Completed', 'Client Selected'].includes(selected.status) && (
                      <button className="btn btn-primary btn-sm" disabled={!selectedProposalIds.length || sendToClientMutation.isPending} onClick={() => sendToClientMutation.mutate()}>
                        Send Selected Proposals to Client ({selectedProposalIds.length})
                      </button>
                    )}
                  </div>
                )}

                {isClient && clientVisibleProposals.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="font-semibold">Worker Proposals</h4>
                    {selected.status === 'Proposals Sent to Client' && (
                      <textarea className="textarea textarea-bordered w-full" placeholder="Optional amendments / notes for admin" value={clientAmendment} onChange={(e) => setClientAmendment(e.target.value)} />
                    )}
                    {clientVisibleProposals.map((proposal) => (
                      <div key={proposal.id} className="rounded-box border border-base-300 p-3 space-y-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <div className="font-semibold">{proposal.worker?.name || 'Worker'}</div>
                          <span className={`badge ${proposalStatusClass(proposal.status)}`}>{proposal.status}</span>
                        </div>
                        <div><b>Quoted price:</b> {formatMoney(effectiveAmount(proposal))}</div>
                        {proposal.estimated_days != null && <div><b>Est. days:</b> {proposal.estimated_days}</div>}
                        <p className="whitespace-pre-wrap opacity-80">{proposal.cover_letter}</p>
                        {selected.status === 'Proposals Sent to Client' && proposal.status === 'Sent to Client' && (
                          <button className="btn btn-primary btn-xs" disabled={selectProposalMutation.isPending} onClick={() => selectProposalMutation.mutate(proposal.id)}>Select this proposal</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isAdmin && selected.status === 'Client Selected' && selectedProposal && (
                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-semibold">Negotiate & Assign Winner</h4>
                    <p className="text-xs opacity-70">Selected: {selectedProposal.worker?.name} — current quote {formatMoney(effectiveAmount(selectedProposal))}</p>
                    {selected.client_amendment_notes && <p className="text-sm"><b>Client amendment:</b> {selected.client_amendment_notes}</p>}
                    <input className="input input-bordered w-full" type="number" min="1" placeholder="Final agreed price (KES)" value={negotiateForm.finalPrice} onChange={(e) => setNegotiateForm({ ...negotiateForm, finalPrice: e.target.value })} />
                    <textarea className="textarea textarea-bordered w-full" placeholder="Negotiation notes" value={negotiateForm.negotiationNotes} onChange={(e) => setNegotiateForm({ ...negotiateForm, negotiationNotes: e.target.value })} />
                    <textarea className="textarea textarea-bordered w-full" placeholder="Admin notes for worker" value={negotiateForm.adminNotes} onChange={(e) => setNegotiateForm({ ...negotiateForm, adminNotes: e.target.value })} />
                    <button className="btn btn-primary btn-sm" disabled={!negotiateForm.finalPrice || negotiateMutation.isPending} onClick={() => negotiateMutation.mutate()}>Finalize Price & Assign Winner</button>
                  </div>
                )}

                {isAdmin && selected.status === 'Pending Review' && (
                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-semibold">Direct Assign Worker (legacy)</h4>
                    <select className="select select-bordered w-full" value={assignForm.workerId} onChange={(e) => setAssignForm({ ...assignForm, workerId: e.target.value })}>
                      <option value="">Select Worker</option>
                      {workers.map((worker: Worker) => <option key={worker.id} value={worker.id}>{worker.name} ({worker.email})</option>)}
                    </select>
                    <textarea className="textarea textarea-bordered w-full" placeholder="Internal notes for worker" value={assignForm.adminNotes} onChange={(e) => setAssignForm({ ...assignForm, adminNotes: e.target.value })} />
                    <button className="btn btn-primary btn-sm" disabled={!assignForm.workerId || actionMutation.isPending} onClick={() => actionMutation.mutate({ id: selected.id, action: 'assign', payload: assignForm })}>Assign Worker</button>
                  </div>
                )}

                {isWorker && selected.status === 'Assigned' && (
                  <div className="flex gap-2 border-t pt-4">
                    <button className="btn btn-success btn-sm" onClick={() => actionMutation.mutate({ id: selected.id, action: 'accept' })}>Accept</button>
                    <button className="btn btn-error btn-sm" onClick={() => actionMutation.mutate({ id: selected.id, action: 'reject' })}>Reject</button>
                  </div>
                )}

                {isWorker && ['In Progress', 'Revision Needed'].includes(selected.status) && (
                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-semibold">Submit Completed Work</h4>
                    <input className="file-input file-input-bordered w-full" type="file" onChange={(e) => setDeliverableFile(e.target.files?.[0] || null)} />
                    <input className="input input-bordered w-full" placeholder="Deliverable file URL/path" value={submissionForm.deliverableFile} onChange={(e) => setSubmissionForm({ ...submissionForm, deliverableFile: e.target.value })} />
                    <input className="input input-bordered w-full" placeholder="OR deliverable link" value={submissionForm.deliverableLink} onChange={(e) => setSubmissionForm({ ...submissionForm, deliverableLink: e.target.value })} />
                    <textarea className="textarea textarea-bordered w-full" placeholder="Submission notes" value={submissionForm.submissionNotes} onChange={(e) => setSubmissionForm({ ...submissionForm, submissionNotes: e.target.value })} />
                    <button className="btn btn-primary btn-sm" disabled={!deliverableFile && !submissionForm.deliverableFile && !submissionForm.deliverableLink} onClick={() => actionMutation.mutate({ id: selected.id, action: 'submit', payload: submissionForm })}>Submit Work</button>
                  </div>
                )}

                {selectedLatestSubmission && (
                  <div className="border-t pt-4 text-sm">
                    <h4 className="font-semibold">Latest Submission</h4>
                    {selectedLatestSubmission.deliverable_file && <div><b>File:</b> {selectedLatestSubmission.deliverable_file}</div>}
                    {selectedLatestSubmission.deliverable_link && <div><b>Link:</b> <a className="link" href={selectedLatestSubmission.deliverable_link} target="_blank" rel="noreferrer">Open deliverable</a></div>}
                    {selectedLatestSubmission.submission_notes && <p>{selectedLatestSubmission.submission_notes}</p>}
                  </div>
                )}

                {isAdmin && selected.status === 'Submitted for Review' && (
                  <div className="space-y-2 border-t pt-4">
                    <textarea className="textarea textarea-bordered w-full" placeholder="Review or revision notes" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
                    <div className="flex flex-wrap gap-2">
                      <button className="btn btn-success btn-sm" onClick={() => actionMutation.mutate({ id: selected.id, action: 'review', payload: { action: 'approve', notes: reviewNotes } })}>Approve</button>
                      <button className="btn btn-warning btn-sm" onClick={() => actionMutation.mutate({ id: selected.id, action: 'review', payload: { action: 'revision', notes: reviewNotes } })}>Request Revisions</button>
                      <button className="btn btn-error btn-sm" onClick={() => actionMutation.mutate({ id: selected.id, action: 'review', payload: { action: 'reject', notes: reviewNotes } })}>Reject</button>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Messages</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto rounded-box bg-base-200 p-3 mb-3">
                    {messages.map((message) => (
                      <div key={message.id} className="rounded-box bg-base-100 p-2 text-sm">
                        <div className="font-semibold">{message.sender?.name || 'User'} <span className="text-xs opacity-60">{message.sender?.role?.display_name || message.sender?.role?.name || ''}</span></div>
                        <p className="whitespace-pre-wrap">{message.message}</p>
                        <div className="text-xs opacity-60">{message.created_at ? new Date(message.created_at).toLocaleString() : ''}</div>
                      </div>
                    ))}
                    {!messages.length && <div className="text-sm opacity-70">No messages yet.</div>}
                  </div>
                  <textarea className="textarea textarea-bordered w-full" placeholder="Write a message or clarification" value={messageText} onChange={(e) => setMessageText(e.target.value)} />
                  <button className="btn btn-primary btn-sm mt-2" disabled={!messageText.trim() || messageMutation.isPending} onClick={() => messageMutation.mutate()}>Send Message</button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Timeline</h4>
                  <ul className="timeline timeline-vertical timeline-compact">
                    {(selected.timeline || []).map((item, index) => (
                      <li key={`${item.at}-${index}`}>
                        <div className="timeline-start text-xs opacity-60">{new Date(item.at).toLocaleString()}</div>
                        <div className="timeline-middle">●</div>
                        <div className="timeline-end text-sm"><b>{item.actorName || 'System'}:</b> {item.message}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
