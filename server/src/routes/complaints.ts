import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { getDb } from '../database/connection';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth';
import {
  createComplaintSchema, updateStatusSchema, assignComplaintSchema,
  updatePrioritySchema, publicUpdateSchema, internalNoteSchema,
  complaintQuerySchema
} from '../validation/schemas';
import { VALID_TRANSITIONS, Complaint, ComplaintStatus } from '../types';

const router = Router();

// ─── Generate unique grievance ID ───
function generateGrievanceId(): string {
  return 'CT-' + nanoid(10).toUpperCase();
}

// ─── Calculate target resolution date from SLA ───
async function calculateTargetDate(db: any, category: string, priority: string, createdAt: string): Promise<string | null> {
  const sla = await db.prepare(`
    SELECT target_hours FROM sla_policies 
    WHERE category = ? AND priority = ? AND is_active = 1
    ORDER BY department_id IS NULL ASC
    LIMIT 1
  `).get(category, priority) as { target_hours: number } | undefined;

  if (!sla) return null;

  const created = new Date(createdAt + 'Z');
  const target = new Date(created.getTime() + sla.target_hours * 60 * 60 * 1000);
  return target.toISOString().replace('T', ' ').split('.')[0];
}

// POST /api/complaints — Create new complaint
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { title, description, category, location, city, incident_date } = parsed.data;
    const db = getDb();

    // Generate unique grievance_id
    let grievance_id: string = '';
    let attempts = 0;
    do {
      grievance_id = generateGrievanceId();
      const existing = await db.prepare('SELECT id FROM complaints WHERE grievance_id = ?').get(grievance_id);
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      res.status(500).json({ success: false, error: 'Failed to generate unique ID' });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').split('.')[0];
    const targetDate = await calculateTargetDate(db, category, 'medium', now);

    // Transaction: insert complaint + initial status history
    const tx = db.transaction(async () => {
      const result = await db.prepare(`
        INSERT INTO complaints 
        (grievance_id, title, description, category, priority, status, citizen_id,
         location, city, incident_date, target_resolution_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'medium', 'submitted', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        grievance_id, title, description, category, req.userId,
        location, city, incident_date || null, targetDate, now, now
      );

      const complaintId = result.lastInsertRowid;

      // Initial status history entry
      await db.prepare(`
        INSERT INTO status_history (complaint_id, previous_status, new_status, changed_by_user_id, reason, is_public, created_at)
        VALUES (?, NULL, 'submitted', ?, 'Complaint registered', 1, ?)
      `).run(complaintId, req.userId, now);

      // Audit log
      await db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, 'create', 'complaint', ?, ?, ?)
      `).run(req.userId, complaintId, `Complaint ${grievance_id} created`, now);

      return complaintId;
    });

    const complaintId = await tx();

    const complaint = await db.prepare(`
      SELECT * FROM complaints WHERE id = ?
    `).get(complaintId);

    res.status(201).json({
      success: true,
      data: { complaint },
      message: 'Complaint registered successfully',
    });
  } catch (err) {
    console.error('Create complaint error:', err);
    res.status(500).json({ success: false, error: 'Failed to register complaint' });
  }
});

// GET /api/complaints/my — List complaints filed by the currently authenticated user
router.get('/my', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = complaintQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid query parameters' });
      return;
    }

    const { page, pageSize, search, category, status, priority, sort, order, date_from, date_to } = parsed.data;
    const db = getDb();

    // STRICT OWNER CHECK: Always filter by the authenticated user's ID
    let where = 'WHERE c.citizen_id = ?';
    const params: any[] = [req.userId];

    if (search) {
      where += ' AND (c.grievance_id LIKE ? OR c.title LIKE ? OR c.description LIKE ? OR c.category LIKE ? OR c.location LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (category) {
      where += ' AND c.category = ?';
      params.push(category);
    }

    if (status) {
      const statuses = status.split(',');
      where += ` AND c.status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }

    if (priority) {
      where += ' AND c.priority = ?';
      params.push(priority);
    }

    if (date_from) {
      where += ' AND c.created_at >= ?';
      params.push(date_from);
    }

    if (date_to) {
      where += ' AND c.created_at <= ?';
      params.push(date_to + ' 23:59:59');
    }

    const validSorts = ['created_at', 'updated_at', 'priority', 'status', 'category', 'title'];
    const sortCol = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const countResult = await db.prepare(`
      SELECT COUNT(*) as total FROM complaints c ${where}
    `).get(...params) as { total: number };

    const offset = (page - 1) * pageSize;

    const complaints = await db.prepare(`
      SELECT c.*, 
             d.name as department_name,
             u_citizen.first_name || ' ' || u_citizen.last_name as citizen_name,
             u_officer.first_name || ' ' || u_officer.last_name as officer_name
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u_citizen ON c.citizen_id = u_citizen.id
      LEFT JOIN users u_officer ON c.assigned_officer_id = u_officer.id
      ${where}
      ORDER BY c.${sortCol} ${sortOrder}
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    res.json({
      success: true,
      data: {
        items: complaints,
        total: countResult.total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.total / pageSize),
      },
    });
  } catch (err) {
    console.error('List my complaints error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch your registered complaints' });
  }
});

// GET /api/complaints/public — Public feed for home page and city portal
router.get('/public', optionalAuth, async (req: Request, res: Response) => {
  try {
    const parsed = complaintQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid query parameters' });
      return;
    }

    const { page, pageSize, search, category, status } = parsed.data;
    const db = getDb();

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      where += ' AND (c.grievance_id LIKE ? OR c.title LIKE ? OR c.description LIKE ? OR c.category LIKE ? OR c.location LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (category) {
      where += ' AND c.category = ?';
      params.push(category);
    }

    if (status) {
      const statuses = status.split(',');
      where += ` AND c.status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }

    const countResult = await db.prepare(`
      SELECT COUNT(*) as total FROM complaints c ${where}
    `).get(...params) as { total: number };

    const offset = (page - 1) * pageSize;

    const complaints = await db.prepare(`
      SELECT c.id, c.grievance_id, c.title, c.description, c.category, c.priority, c.status,
             c.location, c.city, c.incident_date, c.target_resolution_date, c.resolved_at,
             c.resolution_notes, c.is_overdue, c.created_at, c.updated_at,
             d.name as department_name
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      ${where}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    res.json({
      success: true,
      data: {
        items: complaints,
        total: countResult.total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.total / pageSize),
      },
    });
  } catch (err) {
    console.error('List public complaints error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch public complaints' });
  }
});

// GET /api/complaints — List complaints with filters
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = complaintQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid query parameters' });
      return;
    }

    const { page, pageSize, search, category, status, priority, department_id, sort, order, date_from, date_to, overdue, mine } = parsed.data;
    const db = getDb();

    let where = 'WHERE 1=1';
    const params: any[] = [];

    // Citizens or explicitly requesting own complaints can only see their own
    if (req.userRole === 'citizen' || mine === 'true') {
      where += ' AND c.citizen_id = ?';
      params.push(req.userId);
    }
    // Officers see assigned complaints
    else if (req.userRole === 'officer') {
      where += ' AND (c.assigned_officer_id = ? OR c.department_id IN (SELECT department_id FROM users WHERE id = ?))';
      params.push(req.userId, req.userId);
    }
    // Managers see their department
    else if (req.userRole === 'manager') {
      where += ' AND (c.department_id IN (SELECT department_id FROM users WHERE id = ?) OR c.department_id IS NULL)';
      params.push(req.userId);
    }
    // Admins see everything

    if (search) {
      where += ' AND (c.grievance_id LIKE ? OR c.title LIKE ? OR c.description LIKE ? OR c.category LIKE ? OR c.location LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (category) {
      where += ' AND c.category = ?';
      params.push(category);
    }

    if (status) {
      const statuses = status.split(',');
      where += ` AND c.status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }

    if (priority) {
      where += ' AND c.priority = ?';
      params.push(priority);
    }

    if (department_id) {
      where += ' AND c.department_id = ?';
      params.push(parseInt(department_id));
    }

    if (date_from) {
      where += ' AND c.created_at >= ?';
      params.push(date_from);
    }

    if (date_to) {
      where += ' AND c.created_at <= ?';
      params.push(date_to + ' 23:59:59');
    }

    if (overdue === 'true') {
      where += ' AND c.is_overdue = 1';
    }

    // Validate sort column
    const validSorts = ['created_at', 'updated_at', 'priority', 'status', 'category', 'title'];
    const sortCol = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const countResult = await db.prepare(`
      SELECT COUNT(*) as total FROM complaints c ${where}
    `).get(...params) as { total: number };

    const offset = (page - 1) * pageSize;

    const complaints = await db.prepare(`
      SELECT c.*, 
             d.name as department_name,
             u_citizen.first_name || ' ' || u_citizen.last_name as citizen_name,
             u_officer.first_name || ' ' || u_officer.last_name as officer_name
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u_citizen ON c.citizen_id = u_citizen.id
      LEFT JOIN users u_officer ON c.assigned_officer_id = u_officer.id
      ${where}
      ORDER BY c.${sortCol} ${sortOrder}
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    res.json({
      success: true,
      data: {
        items: complaints,
        total: countResult.total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.total / pageSize),
      },
    });
  } catch (err) {
    console.error('List complaints error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch complaints' });
  }
});

// GET /api/complaints/track/:grievanceId — Public tracking (limited info)
router.get('/track/:grievanceId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const complaint = await db.prepare(`
      SELECT c.grievance_id, c.title, c.category, c.status, c.priority, 
             c.location, c.city, c.created_at, c.updated_at,
             c.target_resolution_date, c.is_overdue, c.resolution_notes,
             d.name as department_name
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.grievance_id = ?
    `).get(req.params.grievanceId);

    if (!complaint) {
      res.status(404).json({ success: false, error: 'No complaint found with this reference' });
      return;
    }

    // Get public status history
    const history = await db.prepare(`
      SELECT sh.new_status, sh.previous_status, sh.reason, sh.created_at,
             u.first_name || ' ' || u.last_name as changed_by
      FROM status_history sh
      LEFT JOIN users u ON sh.changed_by_user_id = u.id
      WHERE sh.complaint_id = (SELECT id FROM complaints WHERE grievance_id = ?)
        AND sh.is_public = 1
      ORDER BY sh.created_at ASC
    `).all(req.params.grievanceId);

    // Get public updates
    const updates = await db.prepare(`
      SELECT pu.message, pu.created_at,
             u.first_name || ' ' || u.last_name as author
      FROM public_updates pu
      LEFT JOIN users u ON pu.user_id = u.id
      WHERE pu.complaint_id = (SELECT id FROM complaints WHERE grievance_id = ?)
      ORDER BY pu.created_at DESC
    `).all(req.params.grievanceId);

    res.json({
      success: true,
      data: { complaint, history, updates },
    });
  } catch (err) {
    console.error('Track complaint error:', err);
    res.status(500).json({ success: false, error: 'Failed to track complaint' });
  }
});

// GET /api/complaints/:id — Full complaint details
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const complaintId = parseInt(req.params.id);

    const complaint = await db.prepare(`
      SELECT c.*, 
             d.name as department_name,
             u_citizen.first_name || ' ' || u_citizen.last_name as citizen_name,
             u_citizen.email as citizen_email,
             u_officer.first_name || ' ' || u_officer.last_name as officer_name
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u_citizen ON c.citizen_id = u_citizen.id
      LEFT JOIN users u_officer ON c.assigned_officer_id = u_officer.id
      WHERE c.id = ?
    `).get(complaintId) as any;

    if (!complaint) {
      res.status(404).json({ success: false, error: 'Complaint not found' });
      return;
    }

    // Citizens can only see their own
    if (req.userRole === 'citizen' && complaint.citizen_id !== req.userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Remove private citizen info for non-staff
    if (req.userRole === 'citizen') {
      delete complaint.citizen_email;
    }

    // Public status history
    const history = await db.prepare(`
      SELECT sh.*, u.first_name || ' ' || u.last_name as changed_by_name
      FROM status_history sh
      LEFT JOIN users u ON sh.changed_by_user_id = u.id
      WHERE sh.complaint_id = ?
      ${req.userRole === 'citizen' ? 'AND sh.is_public = 1' : ''}
      ORDER BY sh.created_at ASC
    `).all(complaintId);

    // Public updates
    const updates = await db.prepare(`
      SELECT pu.*, u.first_name || ' ' || u.last_name as author_name
      FROM public_updates pu
      LEFT JOIN users u ON pu.user_id = u.id
      WHERE pu.complaint_id = ?
      ORDER BY pu.created_at DESC
    `).all(complaintId);

    // Internal notes (only for staff)
    let notes: any[] = [];
    if (req.userRole !== 'citizen') {
      notes = await db.prepare(`
        SELECT n.*, u.first_name || ' ' || u.last_name as author_name
        FROM internal_notes n
        LEFT JOIN users u ON n.user_id = u.id
        WHERE n.complaint_id = ?
        ORDER BY n.created_at DESC
      `).all(complaintId);
    }

    // Assignment history
    const assignments = await db.prepare(`
      SELECT ah.*, 
             u_prev.first_name || ' ' || u_prev.last_name as previous_officer_name,
             u_new.first_name || ' ' || u_new.last_name as new_officer_name,
             d_prev.name as previous_department_name,
             d_new.name as new_department_name,
             u_by.first_name || ' ' || u_by.last_name as assigned_by_name
      FROM assignment_history ah
      LEFT JOIN users u_prev ON ah.previous_officer_id = u_prev.id
      LEFT JOIN users u_new ON ah.new_officer_id = u_new.id
      LEFT JOIN departments d_prev ON ah.previous_department_id = d_prev.id
      LEFT JOIN departments d_new ON ah.new_department_id = d_new.id
      LEFT JOIN users u_by ON ah.assigned_by_user_id = u_by.id
      WHERE ah.complaint_id = ?
      ORDER BY ah.created_at DESC
    `).all(complaintId);

    // Attachments
    const attachments = await db.prepare(`
      SELECT a.id, a.original_filename, a.mime_type, a.file_size, a.is_public, a.created_at,
             u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by_user_id = u.id
      WHERE a.complaint_id = ?
      ${req.userRole === 'citizen' ? 'AND a.is_public = 1' : ''}
      ORDER BY a.created_at DESC
    `).all(complaintId);

    // Escalation events
    let escalations: any[] = [];
    if (req.userRole !== 'citizen') {
      escalations = await db.prepare(`
        SELECT e.*, u.first_name || ' ' || u.last_name as escalated_to_name
        FROM escalation_events e
        LEFT JOIN users u ON e.escalated_to_user_id = u.id
        WHERE e.complaint_id = ?
        ORDER BY e.created_at DESC
      `).all(complaintId);
    }

    res.json({
      success: true,
      data: {
        complaint,
        history,
        updates,
        notes,
        assignments,
        attachments,
        escalations,
      },
    });
  } catch (err) {
    console.error('Get complaint error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch complaint details' });
  }
});

// PUT /api/complaints/:id/status — Update complaint status
router.put('/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid status update' });
      return;
    }

    const { status: newStatus, reason, resolution_notes } = parsed.data;
    const db = getDb();
    const complaintId = parseInt(req.params.id);

    const complaint = await db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId) as Complaint | undefined;
    if (!complaint) {
      res.status(404).json({ success: false, error: 'Complaint not found' });
      return;
    }

    // Validate transition
    const validNext = VALID_TRANSITIONS[complaint.status as ComplaintStatus] || [];
    if (!validNext.includes(newStatus as ComplaintStatus)) {
      res.status(400).json({
        success: false,
        error: `Cannot transition from "${complaint.status}" to "${newStatus}"`,
      });
      return;
    }

    // Permission checks
    if (req.userRole === 'citizen') {
      // Citizens can only reopen their own resolved/closed complaints
      if (complaint.citizen_id !== req.userId) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }
      if (newStatus !== 'reopened') {
        res.status(403).json({ success: false, error: 'Citizens can only request reopening' });
        return;
      }
    }

    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    const tx = db.transaction(async () => {
      const updateFields: string[] = ['status = ?', 'updated_at = ?'];
      const updateParams: any[] = [newStatus, now];

      if (newStatus === 'resolved' && resolution_notes) {
        updateFields.push('resolved_at = ?', 'resolution_notes = ?');
        updateParams.push(now, resolution_notes);
      }

      if (newStatus === 'closed') {
        updateFields.push('closed_at = ?');
        updateParams.push(now);
      }

      updateParams.push(complaintId);

      await db.prepare(`UPDATE complaints SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateParams);

      // Status history
      await db.prepare(`
        INSERT INTO status_history (complaint_id, previous_status, new_status, changed_by_user_id, reason, is_public, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(complaintId, complaint.status, newStatus, req.userId, reason || null, now);

      // Audit log
      await db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, 'status_change', 'complaint', ?, ?, ?)
      `).run(req.userId, complaintId, `Status: ${complaint.status} → ${newStatus}`, now);

      // Notification to citizen
      if (req.userRole !== 'citizen') {
        await db.prepare(`
          INSERT INTO notifications (user_id, title, message, type, related_complaint_id, created_at)
          VALUES (?, 'Complaint Status Updated', ?, 'info', ?, ?)
        `).run(
          complaint.citizen_id,
          `Your complaint "${complaint.title}" status changed to ${newStatus}`,
          complaintId, now
        );
      }
    });

    await tx();

    const updated = await db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);
    res.json({ success: true, data: { complaint: updated }, message: 'Status updated successfully' });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// PUT /api/complaints/:id/assign — Assign complaint to officer/department
router.put('/:id/assign', requireRole('manager', 'admin'), async (req: Request, res: Response) => {
  try {
    const parsed = assignComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid assignment data' });
      return;
    }

    const { department_id, officer_id, reason } = parsed.data;
    const db = getDb();
    const complaintId = parseInt(req.params.id);

    const complaint = await db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId) as Complaint | undefined;
    if (!complaint) {
      res.status(404).json({ success: false, error: 'Complaint not found' });
      return;
    }

    // Role-based boundary enforcement: Managers can only assign complaints within their own department
    if (req.userRole === 'manager') {
      const managerUser = await db.prepare('SELECT department_id FROM users WHERE id = ?').get(req.userId) as { department_id: number | null } | undefined;
      const managerDeptId = managerUser?.department_id;
      if (!managerDeptId) {
        res.status(403).json({ success: false, error: 'Manager has no assigned department' });
        return;
      }
      if (department_id !== managerDeptId) {
        res.status(403).json({ success: false, error: 'Managers can only assign complaints to their own department' });
        return;
      }
      if (complaint.department_id !== null && complaint.department_id !== undefined && complaint.department_id !== managerDeptId) {
        res.status(403).json({ success: false, error: 'Cannot reassign complaints belonging to another department' });
        return;
      }
    }

    // Verify officer exists and belongs to department
    const officer = await db.prepare(`
      SELECT id, department_id, role FROM users WHERE id = ? AND is_active = 1
    `).get(officer_id) as any;

    if (!officer || (officer.role !== 'officer' && officer.role !== 'manager')) {
      res.status(400).json({ success: false, error: 'Invalid officer selection' });
      return;
    }

    // Verify department exists
    const dept = await db.prepare('SELECT id FROM departments WHERE id = ? AND is_active = 1').get(department_id);
    if (!dept) {
      res.status(400).json({ success: false, error: 'Invalid department' });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    const tx = db.transaction(async () => {
      // Update complaint
      const newStatus = complaint.status === 'submitted' || complaint.status === 'acknowledged' || complaint.status === 'reopened'
        ? 'assigned' : complaint.status;

      await db.prepare(`
        UPDATE complaints SET department_id = ?, assigned_officer_id = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).run(department_id, officer_id, newStatus, now, complaintId);

      // Assignment history
      await db.prepare(`
        INSERT INTO assignment_history 
        (complaint_id, previous_officer_id, new_officer_id, previous_department_id, new_department_id, assigned_by_user_id, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        complaintId, complaint.assigned_officer_id || null, officer_id,
        complaint.department_id || null, department_id, req.userId, reason || null, now
      );

      // Status history if status changed
      if (newStatus !== complaint.status) {
        await db.prepare(`
          INSERT INTO status_history (complaint_id, previous_status, new_status, changed_by_user_id, reason, is_public, created_at)
          VALUES (?, ?, ?, ?, ?, 1, ?)
        `).run(complaintId, complaint.status, newStatus, req.userId, 'Complaint assigned to department', now);
      }

      // Audit log
      await db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, 'assign', 'complaint', ?, ?, ?)
      `).run(req.userId, complaintId, `Assigned to officer ${officer_id} in dept ${department_id}`, now);

      // Notify officer
      await db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, related_complaint_id, created_at)
        VALUES (?, 'New Assignment', ?, 'info', ?, ?)
      `).run(officer_id, `You have been assigned complaint: ${complaint.title}`, complaintId, now);
    });

    await tx();

    const updated = await db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);
    res.json({ success: true, data: { complaint: updated }, message: 'Complaint assigned successfully' });
  } catch (err) {
    console.error('Assign complaint error:', err);
    res.status(500).json({ success: false, error: 'Failed to assign complaint' });
  }
});

// PUT /api/complaints/:id/priority — Update priority
router.put('/:id/priority', requireRole('officer', 'manager', 'admin'), async (req: Request, res: Response) => {
  try {
    const parsed = updatePrioritySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid priority' });
      return;
    }

    const { priority, reason } = parsed.data;
    const db = getDb();
    const complaintId = parseInt(req.params.id);

    const complaint = await db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId) as Complaint | undefined;
    if (!complaint) {
      res.status(404).json({ success: false, error: 'Complaint not found' });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    // Recalculate target date based on new priority
    const targetDate = await calculateTargetDate(db, complaint.category, priority, complaint.created_at);

    await db.prepare(`
      UPDATE complaints SET priority = ?, target_resolution_date = ?, updated_at = ? WHERE id = ?
    `).run(priority, targetDate, now, complaintId);

    await db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, 'priority_change', 'complaint', ?, ?, ?)
    `).run(req.userId, complaintId, `Priority: ${complaint.priority} → ${priority}. ${reason || ''}`, now);

    const updated = await db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);
    res.json({ success: true, data: { complaint: updated }, message: 'Priority updated' });
  } catch (err) {
    console.error('Update priority error:', err);
    res.status(500).json({ success: false, error: 'Failed to update priority' });
  }
});

// POST /api/complaints/:id/updates — Add public update
router.post('/:id/updates', requireRole('officer', 'manager', 'admin'), async (req: Request, res: Response) => {
  try {
    const parsed = publicUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid update' });
      return;
    }

    const db = getDb();
    const complaintId = parseInt(req.params.id);
    const complaint = await db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId) as Complaint | undefined;

    if (!complaint) {
      res.status(404).json({ success: false, error: 'Complaint not found' });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    await db.prepare(`
      INSERT INTO public_updates (complaint_id, user_id, message, created_at)
      VALUES (?, ?, ?, ?)
    `).run(complaintId, req.userId, parsed.data.message, now);

    // Notify citizen
    await db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, related_complaint_id, created_at)
      VALUES (?, 'New Update on Your Complaint', ?, 'info', ?, ?)
    `).run(complaint.citizen_id, `New update on "${complaint.title}"`, complaintId, now);

    res.status(201).json({ success: true, message: 'Update posted' });
  } catch (err) {
    console.error('Add update error:', err);
    res.status(500).json({ success: false, error: 'Failed to add update' });
  }
});

// POST /api/complaints/:id/notes — Add internal note
router.post('/:id/notes', requireRole('officer', 'manager', 'admin'), async (req: Request, res: Response) => {
  try {
    const parsed = internalNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid note' });
      return;
    }

    const db = getDb();
    const complaintId = parseInt(req.params.id);

    const complaint = await db.prepare('SELECT id FROM complaints WHERE id = ?').get(complaintId);
    if (!complaint) {
      res.status(404).json({ success: false, error: 'Complaint not found' });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    await db.prepare(`
      INSERT INTO internal_notes (complaint_id, user_id, note, created_at)
      VALUES (?, ?, ?, ?)
    `).run(complaintId, req.userId, parsed.data.note, now);

    res.status(201).json({ success: true, message: 'Internal note added' });
  } catch (err) {
    console.error('Add note error:', err);
    res.status(500).json({ success: false, error: 'Failed to add note' });
  }
});

export default router;
