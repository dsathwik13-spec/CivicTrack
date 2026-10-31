import { Session } from 'express-session';

// ─── Roles ───
export type UserRole = 'citizen' | 'officer' | 'manager' | 'admin';

// ─── User ───
export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  department_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  department_id?: number;
  department_name?: string;
  is_active: boolean;
  created_at: string;
}

// ─── Department ───
export interface Department {
  id: number;
  name: string;
  description: string;
  head_user_id?: number;
  is_active: boolean;
  created_at: string;
}

// ─── Complaint Statuses ───
export type ComplaintStatus =
  | 'submitted'
  | 'acknowledged'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_information'
  | 'resolved'
  | 'closed'
  | 'reopened';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

export type ComplaintCategory =
  | 'roads_potholes'
  | 'water_supply'
  | 'sanitation_waste'
  | 'streetlights'
  | 'drainage'
  | 'public_infrastructure'
  | 'other';

// ─── Complaint ───
export interface Complaint {
  id: number;
  grievance_id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  citizen_id: number;
  department_id?: number;
  assigned_officer_id?: number;
  location: string;
  city: string;
  incident_date?: string;
  target_resolution_date?: string;
  resolved_at?: string;
  closed_at?: string;
  resolution_notes?: string;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Status History ───
export interface StatusHistory {
  id: number;
  complaint_id: number;
  previous_status: ComplaintStatus | null;
  new_status: ComplaintStatus;
  changed_by_user_id: number;
  reason?: string;
  is_public: boolean;
  created_at: string;
}

// ─── Assignment History ───
export interface AssignmentHistory {
  id: number;
  complaint_id: number;
  previous_officer_id?: number;
  new_officer_id: number;
  previous_department_id?: number;
  new_department_id: number;
  assigned_by_user_id: number;
  reason?: string;
  created_at: string;
}

// ─── Public Update ───
export interface PublicUpdate {
  id: number;
  complaint_id: number;
  user_id: number;
  message: string;
  created_at: string;
}

// ─── Internal Note ───
export interface InternalNote {
  id: number;
  complaint_id: number;
  user_id: number;
  note: string;
  created_at: string;
}

// ─── Attachment ───
export interface Attachment {
  id: number;
  complaint_id: number;
  uploaded_by_user_id: number;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  file_size: number;
  is_public: boolean;
  created_at: string;
}

// ─── SLA Policy ───
export interface SLAPolicy {
  id: number;
  category: ComplaintCategory;
  department_id?: number;
  priority: ComplaintPriority;
  target_hours: number;
  escalation_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Escalation Event ───
export interface EscalationEvent {
  id: number;
  complaint_id: number;
  escalation_level: number;
  escalated_to_user_id?: number;
  reason: string;
  threshold_hours: number;
  created_at: string;
}

// ─── Notification ───
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  related_complaint_id?: number;
  is_read: boolean;
  created_at: string;
}

// ─── Audit Log ───
export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  details?: string;
  ip_address?: string;
  created_at: string;
}

// ─── Session Extension ───
declare module 'express-session' {
  interface SessionData {
    userId: number;
    userRole: UserRole;
  }
}

// ─── Valid Status Transitions ───
export const VALID_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  submitted: ['acknowledged', 'assigned'],
  acknowledged: ['assigned', 'in_progress'],
  assigned: ['in_progress', 'acknowledged'],
  in_progress: ['awaiting_information', 'resolved'],
  awaiting_information: ['in_progress', 'resolved'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['acknowledged', 'assigned', 'in_progress'],
};

// ─── Category Labels ───
export const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  roads_potholes: 'Roads & Potholes',
  water_supply: 'Water Supply',
  sanitation_waste: 'Sanitation & Waste Management',
  streetlights: 'Streetlights',
  drainage: 'Drainage',
  public_infrastructure: 'Public Infrastructure',
  other: 'Other Public Services',
};

// ─── Priority Labels ───
export const PRIORITY_LABELS: Record<ComplaintPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

// ─── Status Labels ───
export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  submitted: 'Submitted',
  acknowledged: 'Acknowledged',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  awaiting_information: 'Awaiting Information',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};

// ─── API Response Types ───
export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Dashboard Stats ───
export interface DashboardStats {
  total: number;
  submitted: number;
  acknowledged: number;
  assigned: number;
  inProgress: number;
  awaitingInfo: number;
  resolved: number;
  closed: number;
  reopened: number;
  overdue: number;
  avgResolutionHours: number;
  resolutionRate: number;
}
