import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Icon } from '../components/Icon';
import { cn } from '../utils';
import { ambassadorAPI, taskAPI, checkinAPI, announcementAPI, platformAPI } from '../services/api';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const { checkPermission, checkRole } = usePermissions();
  const isHubManager = !!user && checkPermission('hub_manager:access');
  const isSuperAdmin = !!user && checkRole('SUPER_ADMIN');
  const isFinanceOfficer = !!user && checkRole('FINANCE_OFFICER');
  const isSupportOfficer = !!user && checkRole('SUPPORT_OFFICER');
  const ambassadorProfileId = user?.ambassador_profile?.id || user?.ambassador_id || null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const userName = (user?.name || 'User').split(' ')[0];

  const { data: wallet } = useQuery({
    queryKey: ['wallet', ambassadorProfileId],
    queryFn: async () => {
      if (!ambassadorProfileId) return null;
      const response = await ambassadorAPI.getWallet(ambassadorProfileId);
      return response.data;
    },
    enabled: !!ambassadorProfileId,
  });

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const response = await ambassadorAPI.getAmbassadorDetail(ambassadorProfileId);
      return response.data;
    },
    enabled: !!ambassadorProfileId,
  });

  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const response = await platformAPI.getPlatforms();
      return Array.isArray(response.data) ? response.data : (response.data?.items || []);
    },
    enabled: !!ambassadorProfileId,
  });

  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());

  const referralCode = profile?.referral_code;

  const referralLinks = useMemo<{ id: string; platform: string; url: string }[]>(() => {
    if (!referralCode) return [];
    return (platforms || [])
      .filter((p: any) => p.referral_url_template && p.is_active !== false)
      .map((p: any) => ({
        id: p.id,
        platform: p.display_name || p.name,
        url: (p.referral_url_template as string)
          .replace(/\{\{referral_code\}\}/g, referralCode)
          .replace(/\{referral_code\}/g, referralCode),
      }));
  }, [platforms, referralCode]);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedLink(value);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const toggleLink = (url: string) => {
    setSelectedLinks((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const selectedCount = selectedLinks.size;
  const allSelected = referralLinks.length > 0 && selectedCount === referralLinks.length;
  const selectedText = referralLinks.filter((l) => selectedLinks.has(l.url)).map((l) => l.url).join('\n');

  const copySelected = async () => {
    if (!selectedCount) return;
    await copyToClipboard(selectedText);
  };

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await taskAPI.getTasks({});
      return response.data;
    },
  });

  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const response = await announcementAPI.getAnnouncements({});
      return response.data;
    },
  });

  const { data: checkins } = useQuery({
    queryKey: ['checkins'],
    queryFn: async () => {
      const response = await checkinAPI.getCheckIns({});
      return response.data;
    },
  });

  if (isHubManager && !isSuperAdmin) {
    return <Navigate to="/hub-dashboard" replace />;
  }

  if (isFinanceOfficer && !isSuperAdmin) {
    return <Navigate to="/finance" replace />;
  }

  if (isSupportOfficer && !isSuperAdmin) {
    return <Navigate to="/support-tickets" replace />;
  }

  const formatKES = (v: number) => "KES " + (v || 0).toLocaleString();

  const stats = [
    { label: 'Wallet Balance', value: formatKES(wallet?.current_balance || 0), icon: 'wallet' },
    { label: 'Referral Code', value: profile?.referral_code || 'N/A', icon: 'users' },
    { label: 'Total Check-ins', value: checkins?.length || 0, icon: 'qrCheckIn' },
    { label: 'Active Tasks', value: tasks?.length || 0, icon: 'tasks' },
  ];

  return (
    <div className="animate-fadeIn space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Good {greeting}, {userName}!
        </h1>
        <p className="text-base-content/60 mt-1">
          {format(new Date(), 'EEEE, MMMM do')}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat bg-base-100 rounded-2xl shadow-sm border border-base-300 p-5 hover:shadow-md transition-shadow">
            <div className="text-primary">
              <Icon name={s.icon as any} className="w-8 h-8" />
            </div>
            <div className="stat-title text-base-content/50 text-sm uppercase tracking-wide">{s.label}</div>
            <div className="stat-value text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Check-in at Hub', icon: 'qrCheckIn', to: '/qr-checkin' },
          { label: 'Learning Hub', icon: 'bookOpen', to: '/learning-hub' },
          { label: 'My Tasks', icon: 'tasks', to: '/tasks' },
          { label: 'Referrals', icon: 'users', to: '/referrals' },
        ].map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="card bg-gradient-to-br from-base-100 to-base-200/30 border border-base-300 hover:border-primary/50 hover:shadow-lg transition-all p-5 text-center group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
              <Icon name={a.icon as any} className="w-8 h-8 mx-auto text-primary" />
            </div>
            <span className="font-medium text-sm">{a.label}</span>
          </Link>
        ))}
      </div>

      {referralCode && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="card-title mb-0">
                <Icon name="share" className="w-5 h-5 text-primary" />
                Share Your Referral Links
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-base-content/60 hidden sm:inline">Your code:</span>
                <span className="font-mono badge badge-outline">{referralCode}</span>
                <button className="btn btn-ghost btn-xs" onClick={() => copyToClipboard(referralCode)}>
                  {copiedLink === referralCode ? <Icon name="check" className="w-4 h-4 text-success" /> : <Icon name="copy" className="w-4 h-4" />}
                  <span className="ml-1">{copiedLink === referralCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
            {referralLinks.length ? (
              <>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-xs"
                        checked={allSelected}
                        onChange={() => setSelectedLinks(allSelected ? new Set() : new Set(referralLinks.map((l) => l.url)))}
                      />
                      Select all
                    </label>
                    {selectedCount > 0 && (
                      <span className="badge badge-sm badge-primary">{selectedCount} selected</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn btn-ghost btn-xs" onClick={() => setSelectedLinks(new Set())}>Clear</button>
                    <button className={cn("btn btn-primary btn-xs", !selectedCount && "btn-disabled")} disabled={!selectedCount} onClick={copySelected}>
                      {copiedLink === selectedText && selectedCount > 0 ? <Icon name="check" className="w-4 h-4" /> : <Icon name="copy" className="w-4 h-4" />}
                      <span className="ml-1">{copiedLink === selectedText && selectedCount > 0 ? 'Copied' : 'Copy Selected'}</span>
                    </button>
                  </div>
                </div>
                <div className="grid gap-2">
                  {referralLinks.map((link) => (
                    <label key={link.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-base-200/30 cursor-pointer hover:bg-base-200/60">
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary checkbox-xs"
                          checked={selectedLinks.has(link.url)}
                          onChange={() => toggleLink(link.url)}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{link.platform}</p>
                          <p className="text-xs text-base-content/50 truncate">{link.url}</p>
                        </div>
                      </div>
                      <button type="button" className={cn("btn btn-xs shrink-0", copiedLink === link.url ? "btn-success" : "btn-primary")} onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyToClipboard(link.url); }}>
                        {copiedLink === link.url ? <Icon name="check" className="w-4 h-4" /> : <Icon name="copy" className="w-4 h-4" />}
                        <span className="ml-1">{copiedLink === link.url ? 'Copied' : 'Copy'}</span>
                      </button>
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-base-content/60">
                No share links configured yet. An admin can set referral URL templates in Platform Integrations.
              </p>
            )}
          </div>
        </div>
      )}

      {tasks && tasks.length > 0 && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <Icon name="tasks" className="w-5 h-5 text-primary" />
              Recent Tasks
            </h2>
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-base-200/30">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.title}</p>
                    <p className="text-xs text-base-content/50">{task.platform?.displayName || 'General'}</p>
                  </div>
                  <span className="badge badge-sm badge-outline">{task.status?.display_name || task.status?.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {announcements && announcements.length > 0 && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title mb-0">
                <Icon name="megaphone" className="w-5 h-5 text-primary" />
                Recent Announcements
              </h2>
                <Link to="/announcements" className="btn btn-ghost btn-sm">
                  View All
                  <Icon name="external-link" className="w-4 h-4 ml-1" />
                </Link>
            </div>
            <div className="space-y-3">
              {announcements.slice(0, 3).map((ann: any) => {
                const priorityConfig: Record<string, string> = {
                  URGENT: "badge-error",
                  HIGH: "badge-warning",
                  NORMAL: "badge-neutral",
                };
                const typeConfig: Record<string, string> = {
                  SYSTEM: "badge-info",
                  HUB: "badge-success",
                };
                const isExpired = ann.expires_at && new Date(ann.expires_at) < new Date();
                return (
                  <div key={ann.id} className={cn("p-3 rounded-lg bg-base-200/30", isExpired && "opacity-50")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{ann.title}</p>
                          <span className={cn("badge badge-xs", priorityConfig[ann.priority] || "badge-neutral")}>
                            {ann.priority}
                          </span>
                          <span className={cn("badge badge-xs", typeConfig[ann.type] || "badge-info")}>
                            {ann.type}
                          </span>
                        </div>
                        <p className="text-sm text-base-content/60 line-clamp-2">{ann.content}</p>
                        <div className="flex gap-2 mt-1 text-xs text-base-content/50">
                          <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                          {ann.expires_at && <span>• Expires: {new Date(ann.expires_at).toLocaleDateString()}</span>}
                          {ann.hub && <span>• {ann.hub.name}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
