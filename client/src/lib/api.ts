import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Auth ───
export const authApi = {
  register: (data: { email: string; password: string; first_name: string; last_name: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// ─── Complaints ───
export const complaintsApi = {
  create: (data: any) => api.post('/complaints', data),
  list: (params: Record<string, string>) => api.get('/complaints', { params }),
  get: (id: number) => api.get(`/complaints/${id}`),
  track: (grievanceId: string) => api.get(`/complaints/track/${grievanceId}`),
  updateStatus: (id: number, data: { status: string; reason?: string; resolution_notes?: string }) =>
    api.put(`/complaints/${id}/status`, data),
  assign: (id: number, data: { department_id: number; officer_id: number; reason?: string }) =>
    api.put(`/complaints/${id}/assign`, data),
  updatePriority: (id: number, data: { priority: string; reason?: string }) =>
    api.put(`/complaints/${id}/priority`, data),
  addUpdate: (id: number, data: { message: string }) =>
    api.post(`/complaints/${id}/updates`, data),
  addNote: (id: number, data: { note: string }) =>
    api.post(`/complaints/${id}/notes`, data),
};

// ─── Dashboard ───
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  analytics: (params?: Record<string, string>) => api.get('/dashboard/analytics', { params }),
  escalations: () => api.get('/dashboard/escalations'),
};

// ─── Admin ───
export const adminApi = {
  users: (params: Record<string, string>) => api.get('/admin/users', { params }),
  updateUserRole: (id: number, data: { role: string; department_id?: number | null }) =>
    api.put(`/admin/users/${id}/role`, data),
  toggleUserStatus: (id: number) => api.put(`/admin/users/${id}/status`),
  departments: () => api.get('/admin/departments'),
  createDepartment: (data: { name: string; description: string }) =>
    api.post('/admin/departments', data),
  departmentOfficers: (id: number) => api.get(`/admin/departments/${id}/officers`),
  auditLogs: (params: Record<string, string>) => api.get('/admin/audit-logs', { params }),
};

// ─── Notifications ───
export const notificationsApi = {
  list: (params?: Record<string, string>) => api.get('/notifications', { params }),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export default api;
