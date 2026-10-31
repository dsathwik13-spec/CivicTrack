import { z } from 'zod';

// ─── Auth Validation ───
export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255).transform(v => v.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  first_name: z.string().min(1, 'First name is required').max(100).trim(),
  last_name: z.string().min(1, 'Last name is required').max(100).trim(),
  phone: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().max(255).transform(v => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required').max(128),
});

// ─── Complaint Validation ───
export const createComplaintSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200).trim(),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000).trim(),
  category: z.enum([
    'roads_potholes', 'water_supply', 'sanitation_waste',
    'streetlights', 'drainage', 'public_infrastructure', 'other'
  ]),
  location: z.string().min(3, 'Location is required').max(500).trim(),
  city: z.string().min(2, 'City is required').max(100).trim(),
  incident_date: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    'submitted', 'acknowledged', 'assigned', 'in_progress',
    'awaiting_information', 'resolved', 'closed', 'reopened'
  ]),
  reason: z.string().max(1000).optional(),
  resolution_notes: z.string().max(5000).optional(),
});

export const assignComplaintSchema = z.object({
  department_id: z.number().int().positive(),
  officer_id: z.number().int().positive(),
  reason: z.string().max(1000).optional(),
});

export const updatePrioritySchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  reason: z.string().max(1000).optional(),
});

// ─── Public Update Validation ───
export const publicUpdateSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000).trim(),
});

// ─── Internal Note Validation ───
export const internalNoteSchema = z.object({
  note: z.string().min(1, 'Note is required').max(5000).trim(),
});

// ─── Department Validation ───
export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  description: z.string().max(1000).trim().default(''),
});

// ─── User Management Validation ───
export const updateUserRoleSchema = z.object({
  role: z.enum(['citizen', 'officer', 'manager', 'admin']),
  department_id: z.number().int().positive().nullable().optional(),
});

// ─── SLA Policy Validation ───
export const slaPolicySchema = z.object({
  category: z.enum([
    'roads_potholes', 'water_supply', 'sanitation_waste',
    'streetlights', 'drainage', 'public_infrastructure', 'other'
  ]),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  target_hours: z.number().int().min(1).max(720),
  escalation_hours: z.number().int().min(1).max(720),
  department_id: z.number().int().positive().optional(),
});

// ─── Query Params ───
export const complaintQuerySchema = z.object({
  page: z.string().optional().transform(v => Math.max(1, parseInt(v || '1'))),
  pageSize: z.string().optional().transform(v => Math.min(100, Math.max(1, parseInt(v || '20')))),
  search: z.string().max(200).optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  department_id: z.string().optional(),
  sort: z.string().optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  overdue: z.string().optional(),
  mine: z.string().optional(),
});
