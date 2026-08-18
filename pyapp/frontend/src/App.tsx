import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { QueryClientProvider } from '@tanstack/react-query';

import Dashboard from './pages/Dashboard';
import HubDashboard from './pages/HubDashboard';
import HubAttendancePage from './pages/HubAttendancePage';
import HubAmbassadorsPage from './pages/HubAmbassadorsPage';
import QrCheckin from './pages/QrCheckin';
import AttendanceAnalyticsPage from './pages/AttendanceAnalyticsPage';
import CheckInHistoryPage from './pages/CheckInHistoryPage';
import HubQRPage from './pages/HubQRPage';
import PartnerPortal from './pages/PartnerPortal';
import Analytics from './pages/Analytics';
import TasksPage from './pages/TasksPage';
import PayoutsPage from './pages/PayoutsPage';
import MyAppealsPage from './pages/MyAppealsPage';
import LeadsPage from './pages/LeadsPage';
import ReferralsPage from './pages/ReferralsPage';
import NotificationsPage from './pages/NotificationsPage';
import LearningHubPage from './pages/LearningHubPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import WalletDetailsPage from './pages/WalletDetailsPage';

import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';
import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './components/MainLayout';

import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

import TaskSubmissionPage from './pages/TaskSubmissionPage';
import TaskReviewPage from './pages/TaskReviewPage';
import TaskAssignment from './pages/TaskAssignment';
import TaskEditPage from './pages/TaskEditPage';
import TaskViewPage from './pages/TaskViewPage';

import HubManagementPage from './pages/HubManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import RolePermissionManagementPage from './pages/RolePermissionManagementPage';
import ReferralRatesPage from './pages/ReferralRatesPage';
import ManageTypesPage from './pages/ManageTypesPage';
import PlatformIntegrationsPage from './pages/PlatformIntegrationsPage';
import AssignmentCategoriesPage from './pages/AssignmentCategoriesPage';
import SupportTicketsPage from './pages/SupportTicketsPage';
import FinanceDashboard from './pages/FinanceDashboard';
import GigAssignmentsPage from './pages/GigAssignmentsPage';
import LandingPage from './pages/LandingPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';

import queryClient from './lib/queryClient';
import { setAuthLogoutHandler } from './lib/authLogout';

function IndexRedirect() {
  return <LandingPage />;
}

/**
 * Sends an authenticated user to the correct platform
 * based on their role.
 */
function AccessPlatformRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role =
    user.role?.name ||
    user.roles?.[0] ||
    '';

  const normalizedRole = role.toUpperCase();

  switch (normalizedRole) {
    case 'AMBASSADOR':
      return <Navigate to="/dashboard" replace />;

    case 'HUB_MANAGER':
      return <Navigate to="/hub-dashboard" replace />;

    case 'CLIENT':
      return <Navigate to="/my-gigs" replace />;

    case 'GIG_WORKER':
      return <Navigate to="/my-gigs" replace />;

    case 'ADMIN':
      return <Navigate to="/gig-management" replace />;

    case 'FINANCE_OFFICER':
      return <Navigate to="/finance" replace />;

    case 'SUPPORT_OFFICER':
      return <Navigate to="/support-tickets" replace />;

    case 'SUPER_ADMIN':
      return <Navigate to="/analytics" replace />;

    default:
      return <Navigate to="/login" replace />;
  }
}

function AppLogoutBridge() {
  const { logout } = useAuth();

  React.useEffect(() => {
    setAuthLogoutHandler(logout);
  }, [logout]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <ErrorBoundary>
              <AppLogoutBridge />

              <Routes>

                {/* =====================================================
                    PUBLIC ROUTES
                ====================================================== */}

                <Route
                  path="/"
                  element={<IndexRedirect />}
                />

                <Route
                  path="/landingpage"
                  element={<LandingPage />}
                />

                <Route
                  path="/about-us"
                  element={<LandingPage />}
                />

                <Route
                  path="/blog"
                  element={<BlogPage />}
                />

                <Route
                  path="/blog/:slug"
                  element={<BlogPostPage />}
                />

                <Route
                  path="/login"
                  element={<LoginPage />}
                />

                <Route
                  path="/register"
                  element={<RegisterPage />}
                />

                <Route
                  path="/forgot-password"
                  element={<ForgotPasswordPage />}
                />

                <Route
                  path="/reset-password"
                  element={<ResetPasswordPage />}
                />


                {/* =====================================================
                    PROTECTED ROUTES
                ====================================================== */}

                <Route element={<PrivateRoute />}>

                  {/* Main platform access */}
                  <Route
                    path="/access-platform"
                    element={<AccessPlatformRedirect />}
                  />


                  {/* =================================================
                      AMBASSADOR ROUTES
                  ================================================== */}

                  <Route
                    element={
                      <RoleRoute
                        allowedRoles={[
                          'AMBASSADOR',
                          'SUPER_ADMIN',
                        ]}
                      />
                    }
                  >
                    <Route
                      path="/dashboard"
                      element={
                        <MainLayout title="Dashboard">
                          <Dashboard />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/tasks"
                      element={
                        <MainLayout title="Tasks">
                          <TasksPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/my-appeals"
                      element={
                        <MainLayout title="My Appeals">
                          <MyAppealsPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/leads"
                      element={
                        <MainLayout title="Leads">
                          <LeadsPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/referrals"
                      element={
                        <MainLayout title="Referrals">
                          <ReferralsPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/wallet-details"
                      element={
                        <MainLayout title="Wallet Details">
                          <WalletDetailsPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/qr-checkin"
                      element={
                        <MainLayout title="QR Check-in">
                          <QrCheckin />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/check-in-history"
                      element={
                        <MainLayout title="Check-In History">
                          <CheckInHistoryPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/task-submit/:taskId"
                      element={
                        <MainLayout title="Submit Task">
                          <TaskSubmissionPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/task-view/:taskId"
                      element={
                        <MainLayout title="View Task">
                          <TaskViewPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/learning-hub"
                      element={
                        <MainLayout title="Learning Hub">
                          <LearningHubPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/leaderboard"
                      element={
                        <MainLayout title="Leaderboard">
                          <LeaderboardPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/notifications"
                      element={
                        <MainLayout title="Notifications">
                          <NotificationsPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/referral-rates"
                      element={
                        <MainLayout title="Referral Rates">
                          <ReferralRatesPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/partner-portal"
                      element={
                        <MainLayout title="Partner Portal">
                          <PartnerPortal />
                        </MainLayout>
                      }
                    />
                  </Route>


                  {/* =================================================
                      ANNOUNCEMENTS
                  ================================================== */}

                  <Route
                    element={
                      <RoleRoute
                        allowedRoles={[
                          'AMBASSADOR',
                          'HUB_MANAGER',
                          'SUPER_ADMIN',
                        ]}
                      />
                    }
                  >
                    <Route
                      path="/announcements"
                      element={
                        <MainLayout title="Announcements">
                          <AnnouncementsPage />
                        </MainLayout>
                      }
                    />
                  </Route>


                  {/* =================================================
                      GIG / ASSIGNMENT ROUTES
                  ================================================== */}

                  <Route
                    element={
                      <RoleRoute
                        allowedRoles={[
                          'CLIENT',
                          'GIG_WORKER',
                          'ADMIN',
                          'SUPER_ADMIN',
                        ]}
                      />
                    }
                  >
                    <Route
                      path="/assignments"
                      element={
                        <MainLayout title="Gig Assignments">
                          <GigAssignmentsPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/submit-assignment"
                      element={
                        <MainLayout title="Submit Assignment">
                          <GigAssignmentsPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/my-gigs"
                      element={
                        <MainLayout title="My Gigs">
                          <GigAssignmentsPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/gig-management"
                      element={
                        <MainLayout title="Gig Management">
                          <GigAssignmentsPage />
                        </MainLayout>
                      }
                    />
                  </Route>


                  {/* =================================================
                      HUB MANAGER
                  ================================================== */}

                  <Route
                    element={
                      <RoleRoute
                        allowedRoles={[
                          'HUB_MANAGER',
                          'SUPER_ADMIN',
                        ]}
                      />
                    }
                  >
                    <Route
                      path="/hub-dashboard"
                      element={
                        <MainLayout title="Hub Dashboard">
                          <HubDashboard />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/hub/attendance"
                      element={
                        <MainLayout title="Hub Attendance">
                          <HubAttendancePage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/hub/ambassadors"
                      element={
                        <MainLayout title="Hub Ambassadors">
                          <HubAmbassadorsPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/hub/ambassadors/:ambassadorId"
                      element={
                        <MainLayout title="Ambassador Details">
                          <HubAmbassadorsPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/hub/qr/:hubId"
                      element={
                        <MainLayout title="Hub QR">
                          <HubQRPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/task-review/:taskId"
                      element={
                        <MainLayout title="Review Task">
                          <TaskReviewPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/attendance-analytics"
                      element={
                        <MainLayout title="Attendance Analytics">
                          <AttendanceAnalyticsPage />
                        </MainLayout>
                      }
                    />
                  </Route>


                  {/* =================================================
                      SUPER ADMIN
                  ================================================== */}

                  <Route
                    element={
                      <RoleRoute
                        allowedRoles={[
                          'SUPER_ADMIN',
                        ]}
                      />
                    }
                  >
                    <Route
                      path="/analytics"
                      element={
                        <MainLayout title="Analytics">
                          <Analytics />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/hub-management"
                      element={
                        <MainLayout title="Hub Management">
                          <HubManagementPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/user-management"
                      element={
                        <MainLayout title="User Management">
                          <UserManagementPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/role-permissions"
                      element={
                        <MainLayout title="Role Permissions">
                          <RolePermissionManagementPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/manage-types"
                      element={
                        <MainLayout title="Manage Types">
                          <ManageTypesPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/assignment-categories"
                      element={
                        <MainLayout title="Assignment Categories">
                          <AssignmentCategoriesPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/platform-integrations"
                      element={
                        <MainLayout title="Platform Integrations">
                          <PlatformIntegrationsPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/task-assignment"
                      element={
                        <MainLayout title="Assign Tasks">
                          <TaskAssignment />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/task-edit/:taskId"
                      element={
                        <MainLayout title="Edit Task">
                          <TaskEditPage />
                        </MainLayout>
                      }
                    />
                  </Route>


                  {/* =================================================
                      FINANCE
                  ================================================== */}

                  <Route
                    element={
                      <RoleRoute
                        allowedRoles={[
                          'FINANCE_OFFICER',
                          'SUPER_ADMIN',
                        ]}
                      />
                    }
                  >
                    <Route
                      path="/payouts"
                      element={
                        <MainLayout title="Payouts">
                          <PayoutsPage />
                        </MainLayout>
                      }
                    />

                    <Route
                      path="/finance"
                      element={
                        <MainLayout title="Finance Dashboard">
                          <FinanceDashboard />
                        </MainLayout>
                      }
                    />
                  </Route>


                  {/* =================================================
                      SUPPORT
                  ================================================== */}

                  <Route
                    element={
                      <RoleRoute
                        allowedRoles={[
                          'SUPPORT_OFFICER',
                          'SUPER_ADMIN',
                        ]}
                      />
                    }
                  >
                    <Route
                      path="/support-tickets"
                      element={
                        <MainLayout title="Support Tickets">
                          <SupportTicketsPage />
                        </MainLayout>
                      }
                    />
                  </Route>


                  {/* =================================================
                      404
                  ================================================== */}

                  <Route
                    path="*"
                    element={
                      <MainLayout
                        title="404"
                        noIndex
                      >
                        <div className="card bg-base-200 m-8 p-8 text-center">
                          <h1 className="text-2xl font-bold">
                            404 - Not Found
                          </h1>

                          <p className="mt-2 opacity-70">
                            The page you are looking for does not exist.
                          </p>
                        </div>
                      </MainLayout>
                    }
                  />

                </Route>

              </Routes>
            </ErrorBoundary>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}