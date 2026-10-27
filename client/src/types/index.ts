export type UserRole = 'citizen' | 'officer' | 'manager' | 'admin';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role: UserRole;
  department_id?: number | null;
  department_name?: string | null;
  is_active: number | boolean;
  created_at: string;
  updated_at?: string;
}

export type ComplaintCategory =
  | 'roads_potholes'
  | 'water_supply'
  | 'sanitation_waste'
  | 'streetlights'
  | 'drainage'
  | 'public_infrastructure'
  | 'other';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

export type ComplaintStatus =
  | 'submitted'
  | 'acknowledged'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_information'
  | 'resolved'
  | 'closed'
  | 'reopened';

export interface Complaint {
  id: number;
  grievance_id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  department_id?: number | null;
  department_name?: string | null;
  assigned_officer_id?: number | null;
  assigned_to?: number | null;
  officer_first_name?: string | null;
  officer_last_name?: string | null;
  officer_name?: string | null;
  citizen_id?: number | null;
  citizen_name?: string | null;
  citizen_phone?: string | null;
  citizen_email?: string | null;
  location: string;
  city: string;
  ward?: string;
  address?: string;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  incident_date?: string | null;
  sla_target_hours?: number;
  target_resolution_date?: string | null;
  target_resolution_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  resolution_notes?: string | null;
  is_overdue?: number | boolean;
  is_escalated?: number | boolean;
  escalation_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ComplaintHistory {
  id: number;
  complaint_id: number;
  previous_status?: string | null;
  new_status: string;
  changed_by_user_id?: number | null;
  changed_by?: string | null;
  reason?: string | null;
  is_public?: number | boolean;
  created_at: string;
}

export interface ComplaintUpdate {
  id: number;
  complaint_id: number;
  user_id?: number | null;
  author?: string | null;
  message: string;
  created_at: string;
}

export interface ComplaintNote {
  id: number;
  complaint_id: number;
  user_id: number;
  user_name?: string | null;
  note: string;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  description?: string | null;
  head_user_id?: number | null;
  head_name?: string | null;
  member_count?: number;
  open_complaints?: number;
  is_active: number | boolean;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  related_complaint_id?: number | null;
  is_read: number | boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  user_email?: string | null;
  action: string;
  entity_type: string;
  entity_id?: number | null;
  details?: string | null;
  created_at: string;
}

export interface DashboardStats {
  total: number;
  byStatus: Record<string, number>;
  overdue: number;
  avgResolutionHours: number;
  resolutionRate: number;
}
