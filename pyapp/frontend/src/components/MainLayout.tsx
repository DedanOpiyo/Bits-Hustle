import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Icon, IconName } from './Icon';
import { cn } from '../utils';
import SEO from './SEO';

interface NavItem {
  to: string;
  icon: IconName;
  label: string;
  permission?: string;
  roles?: string[]; // Role-based filtering
}

const navItems: NavItem[] = [
  // Hub Manager routes
  { to: '/hub-dashboard', icon: 'building', label: 'Hub Dashboard', roles: ['HUB_MANAGER', 'SUPER_ADMIN'] },
  { to: '/hub/attendance', icon: 'history', label: 'Attendance', roles: ['HUB_MANAGER', 'SUPER_ADMIN'] },
  { to: '/hub/ambassadors', icon: 'people', label: 'Ambassadors', roles: ['HUB_MANAGER', 'SUPER_ADMIN'] },
  { to: '/attendance-analytics', icon: 'chart', label: 'Attendance Analytics', roles: ['HUB_MANAGER', 'SUPER_ADMIN'] },

  // Managed gig assignment routes
  { to: '/assignments', icon: 'tasks', label: 'My Assignments', roles: ['CLIENT'] },
  { to: '/submit-assignment', icon: 'add', label: 'Submit Assignment', roles: ['CLIENT'] },
  { to: '/my-gigs', icon: 'tasks', label: 'My Gigs', roles: ['GIG_WORKER'] },
  { to: '/gig-management', icon: 'tasks', label: 'Gig Management', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { to: '/gig-management', icon: 'tasks', label: 'Pending Assignments', roles: ['ADMIN', 'SUPER_ADMIN'] },

  // Ambassador routes
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard', roles: ['AMBASSADOR'] },
  { to: '/tasks', icon: 'tasks', label: 'Tasks', roles: ['AMBASSADOR'] },
  { to: '/my-appeals', icon: 'file', label: 'My Appeals', roles: ['AMBASSADOR'] },
  { to: '/leads', icon: 'leads', label: 'Leads', roles: ['AMBASSADOR'] },
  { to: '/referrals', icon: 'referrals', label: 'Referrals', roles: ['AMBASSADOR'] },
  { to: '/wallet-details', icon: 'wallet', label: 'Wallet', roles: ['AMBASSADOR'] },
  { to: '/qr-checkin', icon: 'qrCheckIn', label: 'QR Check-in', roles: ['AMBASSADOR'] },
  { to: '/check-in-history', icon: 'history', label: 'Check-In History', roles: ['AMBASSADOR'] },
  { to: '/learning-hub', icon: 'learning', label: 'Learning Hub', roles: ['AMBASSADOR'] },
  { to: '/leaderboard', icon: 'leaderboard', label: 'Leaderboard', roles: ['AMBASSADOR'] },
  { to: '/notifications', icon: 'notifications', label: 'Notifications', roles: ['AMBASSADOR'] },
  { to: '/announcements', icon: 'megaphone', label: 'Announcements', roles: ['AMBASSADOR', 'HUB_MANAGER', 'SUPER_ADMIN'] },
  { to: '/referral-rates', icon: 'chart', label: 'Referral Rates', roles: ['AMBASSADOR', 'SUPER_ADMIN'] },
  { to: '/partner-portal', icon: 'partnerPortal', label: 'Partner Portal', roles: ['AMBASSADOR'] },

  // Finance routes
  { to: '/finance', icon: 'wallet', label: 'Finance', roles: ['FINANCE_OFFICER', 'SUPER_ADMIN'] },
  { to: '/payouts', icon: 'payout', label: 'Payouts', roles: ['FINANCE_OFFICER', 'SUPER_ADMIN'] },

  // Support routes
  { to: '/support-tickets', icon: 'support', label: 'Support Tickets', roles: ['SUPPORT_OFFICER', 'SUPER_ADMIN'] },

  // Super Admin routes
  { to: '/analytics', icon: 'analytics', label: 'Analytics', roles: ['SUPER_ADMIN'] },
  { to: '/hub-management', icon: 'building', label: 'Hubs', roles: ['SUPER_ADMIN'] },
  { to: '/user-management', icon: 'users', label: 'Users', roles: ['SUPER_ADMIN'] },
  { to: '/role-permissions', icon: 'shield', label: 'Role Permissions', roles: ['SUPER_ADMIN'] },
  { to: '/manage-types', icon: 'file', label: 'Manage Types', roles: ['SUPER_ADMIN'] },
  { to: '/assignment-categories', icon: 'file', label: 'Assignment Categories', roles: ['SUPER_ADMIN'] },
  { to: '/platform-integrations', icon: 'external-link', label: 'Platform Integrations', roles: ['SUPER_ADMIN'] },
  { to: '/task-assignment', icon: 'tasks', label: 'Assign Tasks', roles: ['SUPER_ADMIN'] },
];

interface MainLayoutProps {
  title: ReactNode;
  children: ReactNode;
  rightChildren?: ReactNode;
  noIndex?: boolean;
  description?: string;
}

export default function MainLayout({
  title,
  children,
  rightChildren,
  noIndex = false,
  description,
}: MainLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const pageTitle = typeof title === 'string' ? title : undefined;

  return (
    <div className="min-h-screen bg-base-200">
      <SEO title={pageTitle} description={description} noIndex={noIndex} />
      {/* Top Bar */}
      <header className="navbar bg-base-100 border-b border-base-300 px-4 sticky top-0 z-30">
        <div className="flex-1">
          <button
            className="btn btn-ghost lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Icon name="menu" className="w-5 h-5" />
          </button>
          <button
            className="btn btn-ghost hidden lg:inline-flex items-center"
            onClick={() => navigate(-1)}
          >
            <Icon name="arrowLeft" className="w-4 h-4 mr-1" />
            Back
          </button>
          <h1 className="text-lg font-bold ml-2">{title}</h1>
          <DesktopNav activePath={location.pathname} />
        </div>
        <div className="flex-none gap-2">
          {rightChildren}
          {user && (
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-circle avatar"
              >
                <div className="w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {(user.name ?? "?").charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-52 p-2 shadow"
              >
                <li>
                  <span className="font-semibold">{user.name}</span>
                </li>
                <li>
                  <span className="text-xs text-base-content/50">
                    {user.role?.display_name || user.role?.name || "User"}
                  </span>
                </li>
                <li>
                  <button onClick={handleLogout} className="text-error">
                    <Icon name="logout" className="w-4 h-4" />
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        activePath={location.pathname}
      />

      {/* Main Content */}
      <main className="p-4 md:p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}

function DesktopNav({ activePath }: { activePath: string }) {
  const { checkRole } = usePermissions();

  const visibleItems = navItems.filter((item) => {
    // If no roles specified, show to all authenticated users
    if (!item.roles || item.roles.length === 0) return false;
    // Check if user has any of the allowed roles
    return item.roles.some(role => checkRole(role));
  });

  return (
    <div className="hidden lg:flex flex-wrap items-center gap-1 ml-4">
      {visibleItems.map((item) => (
        <Link
          key={`${item.to}-${item.label}`}
          to={item.to}
          className={cn(
            'btn btn-ghost btn-sm gap-1 normal-case',
            activePath.startsWith(item.to) && 'btn-active',
          )}
        >
          <Icon name={item.icon} className="w-4 h-4" />
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function MobileDrawer({
  isOpen,
  onClose,
  activePath,
}: {
  isOpen: boolean;
  onClose: () => void;
  activePath: string;
}) {
  const { checkRole } = usePermissions();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const visibleItems = navItems.filter((item) => {
    // If no roles specified, hide the item
    if (!item.roles || item.roles.length === 0) return false;
    // Check if user has any of the allowed roles
    return item.roles.some(role => checkRole(role));
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="absolute left-0 top-0 h-full w-64 bg-base-100 shadow-xl p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Navigation</h2>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>
            <ul className="menu menu-compact gap-1">
              {visibleItems.map((item) => (
                <li key={`${item.to}-${item.label}`}>
                  <Link
                    to={item.to}
                    className={cn(
                      activePath.startsWith(item.to) && 'active',
                    )}
                    onClick={onClose}
                  >
                    <Icon name={item.icon} className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <button onClick={handleLogout} className="text-error">
                  <Icon name="logout" className="w-5 h-5" />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}