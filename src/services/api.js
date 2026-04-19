import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

export const API_BASE_URL =
  Constants.expoConfig?.extra?.API_URL || 'https://www.productivo.in/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 5000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Don't wipe the token on MPIN/verify 401 — wrong PIN should not log the user out
    const url = error.config?.url || '';
    const isMpinVerify = url.includes('/mpin/verify');
    if (error.response?.status === 401 && !isMpinVerify) {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/register', data),
  signupRequestOtp: (data) => api.post('/auth/signup/request-otp', data),
  signupVerifyOtp: (data) => api.post('/auth/signup/verify-otp', data),
  getProfile: () => api.get('/auth/profile'),
  getSubscription: () => api.get('/subscription'),
  updateProfile: (data) => api.put('/auth/profile', data),
  setupBiometric: (data) => api.put('/auth/biometric', data),
  setupMpin: (data) => api.post('/auth/mpin/setup', data),
  verifyMpin: (data) => api.post('/auth/mpin/verify', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  deleteOwnAccount: () => api.delete('/auth/account'),
  // Phone profile flow
  setPhone: (phoneNumber) => api.post('/auth/profile/phone', { phoneNumber }),
  updatePhone: (phoneNumber) => api.patch('/auth/profile/phone', { phoneNumber }),
  requestPhoneChange: (reason) => api.post('/auth/profile/phone/request-change', { reason }),
  listPhoneRequests: () => api.get('/auth/phone-change-requests'),
  approvePhoneRequest: (id, note) => api.post(`/auth/phone-change-requests/${id}/approve`, { note }),
  rejectPhoneRequest: (id, note) => api.post(`/auth/phone-change-requests/${id}/reject`, { note }),
};

export const taskAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  addSubtask: (id, data) => api.post(`/tasks/${id}/subtasks`, data),
  updateSubtask: (id, subtaskId, data) => api.put(`/tasks/${id}/subtasks/${subtaskId}`, data),
  deleteSubtask: (id, subtaskId) => api.delete(`/tasks/${id}/subtasks/${subtaskId}`),
  addAttachment: (id, formData) => api.post(`/tasks/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  }),
  // Notes
  listNotes: (id, params) => api.get(`/tasks/${id}/notes`, { params }),
  addNote: (id, data) => api.post(`/tasks/${id}/notes`, data),
  updateNote: (id, noteId, data) => api.put(`/tasks/${id}/notes/${noteId}`, data),
  deleteNote: (id, noteId) => api.delete(`/tasks/${id}/notes/${noteId}`),
  // Task timer
  getTimer: (id) => api.get(`/tasks/${id}/timer`),
  startTimer: (id) => api.post(`/tasks/${id}/timer/start`),
  stopTimer: (id, note) => api.post(`/tasks/${id}/timer/stop`, { note }),
  getTimeLogs: (id) => api.get(`/tasks/${id}/time-logs`),
};

export const attendanceAPI = {
  clockIn: () => api.post('/attendance/clock-in'),
  clockOut: () => api.post('/attendance/clock-out'),
  myToday: () => api.get('/attendance/me/today'),
  myHistory: (params) => api.get('/attendance/me', { params }),
  adminList: (params) => api.get('/attendance', { params }),
  listMembers: () => api.get('/attendance/members'),
  exportExcel: (params) => api.get('/attendance/export', { params, responseType: 'blob' }),
};

export const projectAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getStats: (id) => api.get(`/projects/${id}/stats`),
};

export const clientAPI = {
  getAll: (params) => api.get('/clients', { params }),
  getById: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
  updatePipeline: (id, data) => api.patch(`/clients/${id}/pipeline`, data),
  addNote: (id, data) => api.post(`/clients/${id}/notes`, data),
  getByPipeline: () => api.get('/clients/pipeline'),
};

export const meetingAPI = {
  getAll: (params) => api.get('/meetings', { params }),
  getById: (id) => api.get(`/meetings/${id}`),
  create: (data) => api.post('/meetings', data),
  update: (id, data) => api.put(`/meetings/${id}`, data),
  delete: (id) => api.delete(`/meetings/${id}`),
  cancel: (id) => api.post(`/meetings/${id}/cancel`),
  addNotes: (id, data) => api.put(`/meetings/${id}/notes`, data),
  generateNotesPdf: (id) => api.post(`/meetings/${id}/notes/generate-pdf`),
  sendNotes: (id) => api.post(`/meetings/${id}/notes/send`),
};

export const invoiceAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  revise: (id, data) => api.post(`/invoices/${id}/revise`, data),
  generatePdf: (id) => api.post(`/invoices/${id}/generate-pdf`),
  download: (id) => api.get(`/invoices/${id}/download`, { responseType: 'blob' }),
  downloadReceipt: (id, paymentId) => api.get(`/invoices/${id}/receipt${paymentId ? `?paymentId=${paymentId}` : ''}`, { responseType: 'blob' }),
  send: (id, data) => api.post(`/invoices/${id}/send`, data),
  addPayment: (id, data) => api.post(`/invoices/${id}/payments`, data),
  updatePayment: (id, paymentId, data) => api.put(`/invoices/${id}/payments/${paymentId}`, data),
  removePayment: (id, paymentId) => api.delete(`/invoices/${id}/payments/${paymentId}`),
};

export const categoryAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  seedDefaults: () => api.post('/categories/seed'),
};

export const organizationAPI = {
  get: () => api.get('/organizations'),
  getById: (id) => api.get(`/organizations/${id}`),
  create: (data) => api.post('/organizations', data),
  update: (id, data) => api.put(`/organizations/${id}`, data),
  delete: (id) => api.delete(`/organizations/${id}`),
  getMembers: (id) => api.get(`/organizations/${id}/members`),
  addMember: (id, data) => api.post(`/organizations/${id}/members`, data),
  removeMember: (orgId, userId) => api.delete(`/organizations/${orgId}/members/${userId}`),
  updateInvoicePermission: (id, canViewInvoices) => api.patch(`/organizations/${id}/invoice-permission`, { canViewInvoices }),
  getTree: () => api.get('/organizations/tree'),
};

export const projectMembersAPI = {
  add: (projectId, data) => api.post(`/projects/${projectId}/members`, data),
  update: (projectId, memberId, data) => api.put(`/projects/${projectId}/members/${memberId}`, data),
  remove: (projectId, memberId) => api.delete(`/projects/${projectId}/members/${memberId}`),
};

export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const paymentAccountAPI = {
  getAll: (params) => api.get('/payment-accounts', { params }),
  create: (data) => api.post('/payment-accounts', data),
  getById: (id) => api.get(`/payment-accounts/${id}`),
  update: (id, data) => api.put(`/payment-accounts/${id}`, data),
  delete: (id) => api.delete(`/payment-accounts/${id}`),
  setDefault: (id) => api.post(`/payment-accounts/${id}/default`),
};

export const dashboardAPI = {
  getStats: (params) => api.get('/dashboard/stats', { params }),
};

export const uploadAPI = {
  upload: (formData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  }),
};

export const whatsappAPI = {
  getConversations: () => api.get('/whatsapp/conversations'),
  getMessages: (phone, params) => api.get(`/whatsapp/conversations/${phone}/messages`, { params }),
  markRead: (phone) => api.patch(`/whatsapp/conversations/${phone}/mark-read`),
  sendMessage: (phone, data) => api.post(`/whatsapp/conversations/${phone}/send`, data),
  exchangeToken: (shortLivedToken) => api.post('/whatsapp/token/exchange', { shortLivedToken }),
  getStats: () => api.get('/whatsapp/stats'),
};

export const superAdminAPI = {
  getUsers: (params) => api.get('/superadmin/users', { params }),
  getOverview: () => api.get('/superadmin/overview'),
  getLogs: (params) => api.get('/superadmin/logs', { params }),
  getPayments: (params) => api.get('/superadmin/payments', { params }),
  blockAccount: (id) => api.patch(`/superadmin/accounts/${id}/block`),
  deleteAccount: (id) => api.delete(`/superadmin/accounts/${id}`),
};

export const usageAPI = {
  getOverview: (params = {}) => api.get('/usage/overview', { params }),
  listSuperadmins: () => api.get('/usage/superadmins'),
};

// Cashfree hosted-checkout flow for WhatsApp add-ons.
// initiatePurchase returns { paymentUrl } — opened in an in-app browser on mobile.
export const whatsappAddonAPI = {
  getMine: () => api.get('/whatsapp-addons/me'),
  initiatePurchase: (data) => api.post('/payments/addon/initiate', data),
  sendInvoice: (invoiceId) => api.post(`/whatsapp-addons/send-invoice/${invoiceId}`),
  sendTaskReminder: (taskId, data) => api.post(`/whatsapp-addons/send-task-reminder/${taskId}`, data),
  sendMeetingInvite: (meetingId) => api.post(`/whatsapp-addons/send-meeting-invite/${meetingId}`),
  getLogs: (params = {}) => api.get('/whatsapp-addons/logs', { params }),
};

export const locationAPI = {
  getStates: () => api.get('/location/states'),
  getCities: (stateIso2) => api.get(`/location/cities/${stateIso2}`),
  getUsage: () => api.get('/location/usage'),
};

export const enquiryAPI = {
  getAll: (params) => api.get('/enquiries', { params }),
  update: (id, data) => api.patch(`/enquiries/${id}`, data),
  submitPremium: (data) => api.post('/enquiries/premium', data),
};

export const featureFlagAPI = {
  getMyWhatsapp: () => api.get('/feature-flags/whatsapp/me'),
  listWhatsapp: () => api.get('/feature-flags/whatsapp'),
  getWhatsapp: (superadminId) => api.get(`/feature-flags/whatsapp/${superadminId}`),
  setWhatsapp: (superadminId, data) => api.put(`/feature-flags/whatsapp/${superadminId}`, data),
};

export default api;
