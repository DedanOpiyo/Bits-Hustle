import { FormEvent, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { assignmentAPI, assignmentCategoryAPI } from '../services/api';
import SEO from '../components/SEO';

const priorities = ['Low', 'Medium', 'High', 'Urgent'];

const steps = [
  ['Submit Your Brief', 'Provide project details, budget, deadline, and reference files.'],
  ['Expert Review', 'Our team reviews your brief, clarifies requirements, and selects the ideal specialist.'],
  ['Expert Execution', 'A vetted specialist completes the work and submits the deliverable.'],
  ['Quality Assurance', 'Our team reviews the deliverable and marks the assignment complete upon approval.'],
];

function roleName(user: any) {
  return user?.role?.name || user?.roles?.[0] || '';
}

export default function LandingPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [openModal, setOpenModal] = useState(false);

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['assignment-categories'],
    queryFn: async () => {
      const response = await assignmentCategoryAPI.getCategories();
      return response.data || [];
    },
  });

  const categories = useMemo(() => categoriesData.map((c: any) => c.display_name || c.name), [categoriesData]);

  const [form, setForm] = useState({ title: '', category: '', description: '', budget: '', deadline: '', priority: 'Medium', files: '', client_name: '', client_email: '', client_phone: '' });
  const [briefFiles, setBriefFiles] = useState<FileList | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const uploadedFiles = briefFiles
        ? await Promise.all(Array.from(briefFiles).map(async (file) => {
            const response = await assignmentAPI.uploadBriefFile(file);
            return response.data;
          }))
        : [];
      const manualFiles = form.files.split(',').map((file) => file.trim()).filter(Boolean);
      const payload = {
        ...form,
        budget: Number(form.budget),
        files: [...uploadedFiles, ...manualFiles],
      };
      // No authenticated user context in this component — create a public assignment
      return assignmentAPI.createPublicAssignment(payload);
    },
    onSuccess: () => {
      setForm({ title: '', category: '', description: '', budget: '', deadline: '', priority: 'Medium', files: '', client_name: '', client_email: '', client_phone: '' });
      setBriefFiles(null);
      queryClient.invalidateQueries({ queryKey: ['gig-assignments'] });
      toast('Assignment request submitted. Admin has been notified.', 'success');
      setOpenModal(false);
    },
    onError: () => {
      toast('Failed to submit assignment. Please try again.', 'error');
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title || !form.description || !form.budget || !form.deadline || !form.client_name || !form.client_email) {
      toast('Please fill in all required fields.', 'warning');
      return;
    }
    const budgetNum = parseFloat(form.budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      toast('Budget must be a number greater than zero.', 'warning');
      return;
    }
    const deadlineDate = new Date(form.deadline);
    if (isNaN(deadlineDate.getTime())) {
      toast('Invalid date.', 'warning');
      return;
    }
    if (deadlineDate <= new Date()) {
      toast('Deadline must be a future date.', 'warning');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <SEO
        title="Professional Assignment Management"
        description="Submit your project brief once. Our expert team reviews requirements, matches you with qualified specialists, and oversees the entire engagement from start to finish."
        type="website"
      />
      <header className="navbar max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex-1">
          <Link to="/" className="text-xl font-black tracking-tight">BitsHustle Gigs</Link>
        </div>
        <div className="flex-none">
          <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
        </div>
      </header>

      <main>
        <section className="hero min-h-[70vh] bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10">
          <div className="hero-content max-w-7xl grid lg:grid-cols-2 gap-10 px-4 md:px-6 py-16">
<div>
    <div className="badge badge-primary badge-outline mb-4">Managed Service — Not an Open Marketplace</div>
    <h1 className="text-4xl md:text-6xl font-black leading-tight">
      Professional Assignment Management by Vetted Experts
    </h1>
    <p className="py-6 text-lg text-base-content/75 max-w-2xl">
      Submit your project brief once. Our expert administrators review requirements, match you with qualified specialists, oversee progress, review deliverables, and provide continuous updates throughout the engagement.
    </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setOpenModal(true)} className="btn btn-primary btn-lg">Submit an Assignment</button>
              </div>
<div className="mt-6 flex flex-wrap gap-2 text-sm text-base-content/70">
                 <span className="badge badge-ghost">No bidding</span>
                 <span className="badge badge-ghost">No worker searching</span>
                 <span className="badge badge-ghost">Expert Reviewed</span>
                 <span className="badge badge-ghost">Status tracking</span>
               </div>
            </div>

            <div className="card bg-base-100 shadow-2xl border border-base-300">
              <div className="card-body space-y-4">
                <h2 className="card-title">Client assignment snapshot</h2>
                <div className="rounded-box bg-base-200 p-4">
                  <div className="font-bold">Logo Design for Coffee Shop</div>
                  <div className="text-sm opacity-70">Design • Budget $150 • Due in 7 days</div>
                  <div className="mt-3 flex items-center gap-2"><span className="badge badge-warning">Pending Review</span><span className="text-sm">Admin checking brief</span></div>
                </div>
                <div className="steps steps-vertical lg:steps-horizontal w-full">
                  <div className="step step-primary">Submit</div>
                  <div className="step step-primary">Assign</div>
                  <div className="step">Work</div>
                  <div className="step">Approve</div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="stat bg-base-200 rounded-box p-3"><div className="stat-title text-xs">Pending</div><div className="stat-value text-xl">3</div></div>
                  <div className="stat bg-base-200 rounded-box p-3"><div className="stat-title text-xs">In Progress</div><div className="stat-value text-xl">2</div></div>
                  <div className="stat bg-base-200 rounded-box p-3"><div className="stat-title text-xs">Complete</div><div className="stat-value text-xl">15</div></div>
                </div>
              </div>
            </div>
          </div>
        </section>


<section className="max-w-7xl mx-auto px-4 md:px-6 py-16">
           <div className="text-center max-w-3xl mx-auto mb-10">
             <h2 className="text-3xl md:text-4xl font-black">How It Works</h2>
             <p className="mt-3 text-base-content/70">A streamlined managed workflow designed for clients seeking professional results without marketplace complexity.</p>
           </div>
          <div className="grid md:grid-cols-4 gap-4">
            {steps.map(([title, description], index) => (
              <div key={title} className="card bg-base-100 border border-base-300 shadow-sm">
                <div className="card-body">
                  <div className="badge badge-primary w-fit">Step {index + 1}</div>
                  <h3 className="font-bold text-lg">{title}</h3>
                  <p className="text-sm text-base-content/70">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-base-200 py-16">
          <div className="max-w-7xl mx-auto px-4 md:px-6 grid lg:grid-cols-2 gap-10 items-center">
<div>
               <h2 className="text-3xl md:text-4xl font-black">Submit Various Types of Work</h2>
               <p className="mt-4 text-base-content/70">From creative projects to research and administrative tasks, your request is reviewed by our team and assigned to a qualified specialist.</p>
               <div className="mt-6 flex flex-wrap gap-2">
                 {categories.map((category: string) => <span key={category} className="badge badge-lg badge-outline">{category}</span>)}
               </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card bg-base-100 border border-base-300"><div className="card-body"><h3 className="font-bold">For Clients</h3><p className="text-sm opacity-70">Upload files, track progress, communicate for clarifications, and access invoices.</p></div></div>
              <div className="card bg-base-100 border border-base-300"><div className="card-body"><h3 className="font-bold">Managed Quality</h3><p className="text-sm opacity-70">Our team assigns specialists, reviews submissions, approves deliverables, and requests revisions when needed.</p></div></div>
              <div className="card bg-base-100 border border-base-300"><div className="card-body"><h3 className="font-bold">Private by Design</h3><p className="text-sm opacity-70">Clients access only their own assignments and never browse a pool of workers.</p></div></div>
              <div className="card bg-base-100 border border-base-300"><div className="card-body"><h3 className="font-bold">Clear Tracking</h3><p className="text-sm opacity-70">Each assignment includes status updates, timelines, file exchanges, message history, and deliverables.</p></div></div>
            </div>
          </div>
        </section>

<section className="max-w-5xl mx-auto px-4 md:px-6 py-16 text-center">
           <h2 className="text-3xl md:text-4xl font-black">Ready to Submit Your First Assignment?</h2>
           <p className="mt-4 text-base-content/70">Submit your project brief below. No account required — our team will manage the entire process.</p>
           <div className="mt-8 flex justify-center">
             <button onClick={() => setOpenModal(true)} className="btn btn-primary btn-lg">Submit Assignment</button>
           </div>
         </section>
      </main>
      {openModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Submit Your Assignment</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpenModal(false)}>Cancel</button>
            </div>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid md:grid-cols-2 gap-4">
                <input className="input input-bordered" placeholder="Assignment title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                <select className="select select-bordered" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                  <option value="">Select category</option>
                  {categories.map((category: string) => <option key={category} value={category}>{category}</option>)}
                </select>
                <textarea className="textarea textarea-bordered md:col-span-2" placeholder="Describe what you need, deliverables, and any specific requirements..." rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                <input className="input input-bordered" type="number" min="1" step="0.01" placeholder="Budget (USD)" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} required />
                <input className="input input-bordered" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />
                <select className="select select-bordered" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} required>
                  {priorities.map((priority) => <option key={priority} value={priority}>{priority} priority</option>)}
                </select>
                <input className="input input-bordered" placeholder="Your name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} required />
                <input className="input input-bordered" type="email" placeholder="Your email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} required />
                <input className="input input-bordered" type="tel" placeholder="Your phone (optional)" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} />
                <input className="input input-bordered" placeholder="Reference URLs (optional, comma separated)" value={form.files} onChange={(e) => setForm({ ...form, files: e.target.value })} />
                <input className="file-input file-input-bordered" type="file" multiple onChange={(e) => setBriefFiles(e.target.files)} />
<div className="md:col-span-2">
                   <button className="btn btn-primary btn-lg" type="submit" disabled={createMutation.isPending}>
                     {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                   </button>
                   <p className="text-sm text-base-content/70 mt-2">No account required. Our team will review and assign a specialist.</p>
                 </div>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setOpenModal(false)} />
        </div>
      )}
    </div>
  );
}
