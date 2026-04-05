import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// For Android emulator: 10.0.2.2 maps to host machine's localhost
// For physical device: use your machine's LAN IP (e.g. http://192.168.x.x:3001/api/v1)
import { Platform } from 'react-native';
export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3001/api/v1'
    : 'http://localhost:3001/api/v1';

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
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  setupBiometric: (data) => api.put('/auth/biometric', data),
  setupMpin: (data) => api.post('/auth/mpin/setup', data),
  verifyMpin: (data) => api.post('/auth/mpin/verify', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const taskAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  addSubtask: (id, data) => api.post(`/tasks/${id}/subtasks`, data),
  updateSubtask: (id, subtaskId, data) => api.put(`/tasks/${id}/subtasks/${subtaskId}`, data),
  addAttachment: (id, formData) => api.post(`/tasks/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  }),
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
};

export const meetingAPI = {
  getAll: (params) => api.get('/meetings', { params }),
  getById: (id) => api.get(`/meetings/${id}`),
  create: (data) => api.post('/meetings', data),
  update: (id, data) => api.put(`/meetings/${id}`, data),
  delete: (id) => api.delete(`/meetings/${id}`),
  cancel: (id) => api.post(`/meetings/${id}/cancel`),
  addNotes: (id, data) => api.put(`/meetings/${id}/notes`, data),
};

export const invoiceAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  revise: (id, data) => api.post(`/invoices/${id}/revise`, data),
  generatePdf: (id) => api.post(`/invoices/${id}/generate-pdf`),
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
  getMembers: (id) => api.get(`/organizations/${id}/members`),
  addMember: (id, data) => api.post(`/organizations/${id}/members`, data),
  removeMember: (orgId, userId) => api.delete(`/organizations/${orgId}/members/${userId}`),
};

export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const paymentAccountAPI = {
  getAll: () => api.get('/payment-accounts'),
  create: (data) => api.post('/payment-accounts', data),
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
};

export const superAdminAPI = {
  getOverview: () => api.get('/superadmin/overview'),
  getLogs: (params) => api.get('/superadmin/logs', { params }),
};

export const locationAPI = {
  getStates: () => api.get('/location/states'),
  getCities: (stateIso2) => api.get(`/location/cities/${stateIso2}`),
  getUsage: () => api.get('/location/usage'),
};

export default api;
