import axios, { AxiosResponse } from 'axios';
import { onAuthLogout } from '../lib/authLogout';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export function unwrapResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
  return response.data as unknown as T;
}

export function unwrapListResponse<T>(response: AxiosResponse<ApiResponse<PaginatedResponse<T>>>): T[] {
  const data = response.data as unknown as PaginatedResponse<T> | T[];
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
    return data.items;
  }
  return [];
}

export async function apiGet<T>(endpoint: string, config?: any): Promise<T[]> {
  const response = await api.get(endpoint, config);
  const data = response.data as unknown as PaginatedResponse<T> | T[];
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
    return data.items;
  }
  return [];
}

export async function apiGetOne<T>(endpoint: string, config?: any): Promise<T | null> {
  const response = await api.get(endpoint, config);
  const data = response.data as unknown;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as T;
  }
  return null;
}

// Create axios instance with base URL
const apiUrl = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: unwrap backend envelope, handle 401
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && body.success === true) {
      response.data = body.data;
    } else if (body && typeof body === 'object' && body.success === false) {
      const error = new Error(body.message || 'Request failed');
      (error as any).response = response;
      return Promise.reject(error);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      onAuthLogout();
    }
    return Promise.reject(error);
  },
);

// Auth API endpoints
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (userData: any) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post(`/auth/reset-password/${token}`, { password }),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/auth/change-password', data),
};

// Hub API endpoints
export const hubAPI = {
  getHubs: () => api.get('/hubs'),
  getPublicHubs: () => api.get('/public/hubs'),
  getHub: (id: string) => api.get(`/hubs/${id}`),
  getMyHub: () => api.get('/hubs/my-hub'),
};

// Role Type API endpoints
export const roleTypeAPI = {
  getRoleTypes: () => api.get('/role-types'),
  getRoleType: (id: string) => api.get(`/role-types/${id}`),
  createRoleType: (data: any) => api.post('/role-types', data),
  updateRoleType: (id: string, data: any) => api.put(`/role-types/${id}`, data),
  deleteRoleType: (id: string) => api.delete(`/role-types/${id}`),
};

// Permission API endpoints
export const permissionAPI = {
  getPermissions: () => api.get('/permissions'),
  getPermission: (id: string) => api.get(`/permissions/${id}`),
  createPermission: (data: any) => api.post('/permissions', data),
  updatePermission: (id: string, data: any) => api.put(`/permissions/${id}`, data),
  deletePermission: (id: string) => api.delete(`/permissions/${id}`),
};

// Role Permission API endpoints
export const rolePermissionAPI = {
  getRolePermissions: () => api.get('/role-permissions'),
  getRolePermission: (id: string) => api.get(`/role-permissions/${id}`),
  createRolePermission: (data: any) => api.post('/role-permissions', data),
  updateRolePermission: (id: string, data: any) => api.put(`/role-permissions/${id}`, data),
  deleteRolePermission: (id: string) => api.delete(`/role-permissions/${id}`),
};

// Wallet API endpoints
export const walletAPI = {
  getWalletDetails: (walletId: string) => api.get(`/wallets/${walletId}/details`),
  getTransactions: (walletId: string) => api.get(`/wallets/${walletId}/transactions`),
  getBalanceByPlatform: (walletId: string) => api.get(`/wallets/${walletId}/balance`),
};

// Ambassador API endpoints
export const ambassadorAPI = {
  getAmbassador: (id: any) => api.get(`/ambassadors/${id}`),
  getAmbassadorDetail: (id: any) => api.get(`/ambassadors/${id}/detail`),
  createAmbassador: (data: any) => api.post(`/ambassadors`, data),
  updateAmbassador: (id: any, data: any) => api.put(`/ambassadors/${id}`, data),
  getWallet: (id: any) => api.get(`/ambassadors/${id}/wallet`),
  getTransactions: (id: any) => api.get(`/ambassadors/${id}/transactions`),
  getSubmissions: (id: any) => api.get(`/ambassadors/${id}/submissions`),
  getHubAmbassadors: (hubId: any, params?: any) => api.get(`/hubs/${hubId}/ambassadors`, { params }),
  flagFraud: (id: any, data: any) => api.post(`/ambassadors/${id}/fraud-flag`, data),
};

// Task API endpoints
export const taskAPI = {
  getTasks: (params: any) => api.get('/tasks', { params }),
  getTask: (id: any) => api.get(`/tasks/${id}`),
  createTask: (data: any) => api.post('/tasks', data),
  updateTask: (id: any, data: any) => api.put(`/tasks/${id}`, data),
  deleteTask: (id: any) => api.delete(`/tasks/${id}`),
  uploadProofFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/uploads/task-proof', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  submitTask: (ambassadorId: any, taskId: any, proofUrl: any) => api.post(`/task-submissions`, { ambassadorId, taskId, proofUrl }),
  getSubmissions: (ambassadorId: any) => api.get(`/ambassadors/${ambassadorId}/submissions`),
  updateSubmission: (submissionId: any, statusId: any) => api.put(`/task-submissions/${submissionId}`, { statusId }),
  // New method for updating submission with review details
  reviewSubmission: (submissionId: any, data: any) => api.put(`/task-submissions/${submissionId}/review`, data),
};

// Managed Gig Assignment API endpoints
export const assignmentAPI = {
  getAssignments: (params?: any) => api.get('/assignments', { params }),
  getAssignment: (id: string) => api.get(`/assignments/${id}`),
  createAssignment: (data: any) => api.post('/assignments', data),
  createPublicAssignment: (data: any) => api.post('/public/assignments', data),
  assignWorker: (id: string, data: any) => api.post(`/assignments/${id}/assign`, data),
  acceptAssignment: (id: string) => api.post(`/assignments/${id}/accept`),
  rejectAssignment: (id: string) => api.post(`/assignments/${id}/reject`),
  submitWork: (id: string, data: any) => api.post(`/assignments/${id}/submit`, data),
  reviewAssignment: (id: string, data: any) => api.post(`/assignments/${id}/review`, data),
  getProposals: (id: string) => api.get(`/assignments/${id}/proposals`),
  submitProposal: (id: string, data: { proposedAmount: number; coverLetter: string; estimatedDays?: number }) =>
    api.post(`/assignments/${id}/proposals`, data),
  reviewProposal: (
    assignmentId: string,
    proposalId: string,
    data: {
      action: 'approve' | 'reject';
      adjustType?: 'percentage' | 'amount';
      adjustValue?: number;
      adminNotes?: string;
      rejectionReason?: string;
    },
  ) => api.post(`/assignments/${assignmentId}/proposals/${proposalId}/review`, data),
  sendProposalsToClient: (id: string, proposalIds: string[]) =>
    api.post(`/assignments/${id}/proposals/send-to-client`, { proposalIds }),
  selectProposal: (assignmentId: string, proposalId: string, data?: { amendment?: string }) =>
    api.post(`/assignments/${assignmentId}/proposals/${proposalId}/select`, data || {}),
  negotiateAndAssign: (
    id: string,
    data: { finalPrice: number; proposalId?: string; negotiationNotes?: string; adminNotes?: string },
  ) => api.post(`/assignments/${id}/negotiate`, data),
  getMessages: (id: string) => api.get(`/assignments/${id}/messages`),
  createMessage: (id: string, message: string) => api.post(`/assignments/${id}/messages`, { message }),
  getWorkers: () => api.get('/assignment-workers'),
  createWorker: (data: any) => api.post('/assignment-workers', data),
  deleteWorker: (id: string) => api.delete(`/assignment-workers/${id}`),
  updateWorkerStatus: (id: string, isActive: boolean) => api.put(`/assignment-workers/${id}/status`, { isActive }),
  getOverviewReport: () => api.get('/assignment-reports/overview'),
  getWorkerEarnings: () => api.get('/assignment-reports/worker-earnings'),
  exportReportCsv: () => api.get('/assignment-reports/export.csv', { responseType: 'blob' }),
  downloadInvoice: (id: string) => api.get(`/assignments/${id}/invoice`, { responseType: 'blob' }),
  uploadBriefFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/uploads/assignment-brief', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadDeliverableFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/uploads/assignment-deliverable', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Task Type API endpoints
export const taskTypeAPI = {
  getTaskTypes: () => api.get('/task-type-types'),
};

export const appealAPI = {
  getMyAppeals: () => api.get('/my-appeals'),
};

// Payout API endpoints
export const payoutAPI = {
  getPayoutRequests: (params: any) => api.get('/payout-requests', { params }),
  createPayoutRequest: (data: any) => api.post('/payout-requests', data),
  reviewPayoutRequest: (id: any, data: any) => api.put(`/payout-requests/${id}`, data),
  authorizePayoutRequest: (id: any, data?: any) => api.post(`/payout-requests/${id}/authorize`, data || {}),
  appealPayoutRequest: (id: any, data: any) => api.post(`/payout-requests/${id}/appeal`, data),
  updatePayoutRequest: (id: any, data: any) => api.put(`/payout-requests/${id}/edit`, data),
};

// Campaign API endpoints
export const campaignAPI = {
  getCampaigns: (params: any) => api.get('/campaigns', { params }),
  getCampaign: (id: any) => api.get(`/campaigns/${id}`),
  createCampaign: (data: any) => api.post('/campaigns', data),
  updateCampaign: (id: any, data: any) => api.put(`/campaigns/${id}`, data),
  deleteCampaign: (id: any) => api.delete(`/campaigns/${id}`),
  reviewCampaign: (id: any, data: any) => api.post(`/campaigns/${id}/review`, data),
  getPartnerCampaigns: () => api.get('/partner/campaigns'),
};

// Analytics API endpoints
export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),
  getFinanceKPIs: () => api.get('/analytics/finance-kpis'),
  getAmbassadorKPIs: () => api.get('/analytics/ambassador-kpis'),
  getHubKPIs: () => api.get('/analytics/hub-kpis'),
  getPlatformMetrics: () => api.get('/analytics/platforms'),
  getDailyQuestions: () => api.get('/analytics/daily-questions'),
  getFunnelAnalysis: () => api.get('/analytics/funnel'),
  getAdvancedKPIs: () => api.get('/analytics/advanced-kpis'),
  getHubManagerDashboard: (hubId: any) => api.get(`/analytics/hub-manager/${hubId}`),
};

// Check-in API endpoints
export const checkinAPI = {
  getCheckIns: (params: any) => api.get('/check-ins', { params }),
  createCheckIn: (data: { hubId: string; override?: boolean }) => api.post('/check-ins', data),
  checkOut: (id: any) => api.post(`/check-ins/${id}/checkout`),
  getHubQRCode: (hubId: any) => api.get(`/hubs/${hubId}/qr-code`),
  scanQRCode: (code: any) => api.post('/check-ins/scan', { code }),
  getHubAttendance: (hubId: any, params?: any) => api.get(`/check-ins/hub/${hubId}`, { params }),
  getHubAttendanceTrends: (hubId: any, params?: any) => api.get(`/check-ins/hub/${hubId}/trends`, { params }),
};

// Lead Status Type API endpoints
export const leadStatusTypeAPI = {
  getLeadStatusTypes: () => api.get('/lead-status-types'),
};

// Lead API endpoints
export const leadAPI = {
  getLeads: (params: any) => api.get('/leads', { params }),
  createLead: (data: any) => api.post('/leads', data),
  updateLead: (id: any, data: any) => api.put(`/leads/${id}`, data),
  updateLeadStatus: (id: any, statusId: string) => api.put(`/leads/${id}/status`, { statusId }),
  deleteLead: (id: any) => api.delete(`/leads/${id}`),
};

// Assignment Category API endpoints
export const assignmentCategoryAPI = {
  getCategories: () => api.get('/assignment-categories'),
  createCategory: (data: any) => api.post('/assignment-categories', data),
  updateCategory: (id: string, data: any) => api.put(`/assignment-categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/assignment-categories/${id}`),
};

// Referral API endpoints
export const referralAPI = {
  getReferrals: (params: any) => api.get('/referrals', { params }),
  getMyReferrals: (params: any) => api.get('/referrals/my', { params }),
  createReferral: (data: any) => api.post('/referrals', data),
  updateMyReferralStatus: (id: any, status: any) => api.put(`/referrals/${id}/my-status`, { status }),
};

// Learning Resource API endpoints
export const learningResourceAPI = {
  getResources: (params: any) => api.get('/learning-resources', { params }),
  createResource: (data: any) => api.post('/learning-resources', data),
  updateResource: (id: any, data: any) => api.put(`/learning-resources/${id}`, data),
  deleteResource: (id: any) => api.delete(`/learning-resources/${id}`),
};

// Leaderboard API endpoints
export const leaderboardAPI = {
  getLeaderboard: (params: any) => api.get('/leaderboard', { params }),
};

// Announcement API endpoints
export const announcementAPI = {
  getAnnouncements: (params: any) => api.get('/announcements', { params }),
  getAnnouncement: (id: string) => api.get(`/announcements/${id}`),
  createAnnouncement: (data: any) => api.post('/announcements', data),
  updateAnnouncement: (id: string, data: any) => api.put(`/announcements/${id}`, data),
  deleteAnnouncement: (id: string) => api.delete(`/announcements/${id}`),
};

// Platform API endpoints
export const platformAPI = {
  getPlatforms: () => api.get('/platforms'),
  createPlatform: (data: any) => api.post('/platforms', data),
  updatePlatform: (id: string, data: any) => api.put(`/platforms/${id}`, data),
  deletePlatform: (id: string) => api.delete(`/platforms/${id}`),
  generateWebhookSecret: (id: string) => api.post(`/platforms/${id}/webhook-secret`),
};

// Tier Type API endpoints
export const tierTypeAPI = {
  getTierTypes: () => api.get('/tier-types'),
  createTierType: (data: any) => api.post('/tier-types', data),
  updateTierType: (id: string, data: any) => api.put(`/tier-types/${id}`, data),
  deleteTierType: (id: string) => api.delete(`/tier-types/${id}`),
};

// Action Type API endpoints
export const actionTypeAPI = {
  getActionTypes: () => api.get('/action-types'),
  createActionType: (data: any) => api.post('/action-types', data),
  updateActionType: (id: string, data: any) => api.put(`/action-types/${id}`, data),
  deleteActionType: (id: string) => api.delete(`/action-types/${id}`),
};

// Referral Rate API endpoints
export const referralRateAPI = {
  getRates: (params?: any) => api.get('/referral-rates', { params }),
  setRate: (data: any) => api.post('/referral-rates', data),
  deleteRate: (rateId: string) => api.delete(`/referral-rates/${rateId}`),
};

// Notification API endpoints
export const notificationAPI = {
  getNotifications: (params: any) => api.get('/notifications', { params }),
  markAsRead: (id: any) => api.put(`/notifications/${id}/read`),
  deleteNotification: (id: any) => api.delete(`/notifications/${id}`),
};

// Platform API Key endpoints
export const platformApiKeyAPI = {
  getKeys: (params?: any) => api.get('/platform-api-keys', { params }),
  createKey: (data: any) => api.post('/platform-api-keys', data),
  regenerateKey: (platformId: string, data?: { name?: string; revoke_existing?: boolean; scopes?: string[] }) => api.post('/platform-api-keys/regenerate', { platform_id: platformId, ...data }),
  deleteKey: (id: string) => api.delete(`/platform-api-keys/${id}`),
};

// Platform Action endpoints
export const platformActionAPI = {
  getActions: (params?: any) => api.get('/platform-actions', { params }),
  getPendingActions: () => api.get('/platform-actions/pending'),
  approveAction: (id: string) => api.post(`/platform-actions/${id}/approve`),
};

export default api;
