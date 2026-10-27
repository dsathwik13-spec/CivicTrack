import { Router, Request, Response } from 'express';
import { getDb } from '../database/connection';
import { requireRole, requireAuth } from '../middleware/auth';
import { createDepartmentSchema, updateUserRoleSchema } from '../validation/schemas';

const router = Router();

// GET /api/admin/users — List all users
router.get('/users', requireRole('admin'), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const search = req.query.search as string || '';
    const role = req.query.role as string || '';

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      where += ' AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (role) {
      where += ' AND u.role = ?';
      params.push(role);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM users u ${where}`).get(...params) as { count: number };
    const offset = (page - 1) * pageSize;

    const users = db.prepare(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role,
             u.department_id, u.is_active, u.created_at,
             d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    res.json({
      success: true,
      data: {
        items: users,
        total: total.count,
        page,
        pageSize,
        totalPages: Math.ceil(total.count / pageSize),
      },
    });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ success: false, error: 'Failed to list users' });
  }
});

// PUT /api/admin/users/:id/role — Update user role
router.put('/users/:id/role', requireRole('admin'), (req: Request, res: Response) => {
  try {
    const parsed = updateUserRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid data' });
      return;
    }

    const db = getDb();
    const userId = parseInt(req.params.id);

    // Prevent self-demotion
    if (userId === req.userId && parsed.data.role !== 'admin') {
      res.status(400).json({ success: false, error: 'Cannot change your own role' });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').split('.')[0];
    db.prepare(`
      UPDATE users SET role = ?, department_id = ?, updated_at = ? WHERE id = ?
    `).run(parsed.data.role, parsed.data.department_id || null, now, userId);

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, 'update_role', 'user', ?, ?, ?)
    `).run(req.userId, userId, `Role changed to ${parsed.data.role}`, now);

    res.json({ success: true, message: 'User role updated' });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

// PUT /api/admin/users/:id/status — Toggle user active status
router.put('/users/:id/status', requireRole('admin'), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = parseInt(req.params.id);

    if (userId === req.userId) {
      res.status(400).json({ success: false, error: 'Cannot deactivate your own account' });
      return;
    }

    const user = db.prepare('SELECT is_active FROM users WHERE id = ?').get(userId) as { is_active: number } | undefined;
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const newStatus = user.is_active ? 0 : 1;
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(newStatus, now, userId);

    res.json({ success: true, message: newStatus ? 'User activated' : 'User deactivated' });
  } catch (err) {
    console.error('Toggle user status error:', err);
    res.status(500).json({ success: false, error: 'Failed to update user status' });
  }
});

// ─── Departments ───

// GET /api/admin/departments
router.get('/departments', requireAuth, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const departments = db.prepare(`
      SELECT d.*, 
             u.first_name || ' ' || u.last_name as head_name,
             (SELECT COUNT(*) FROM users WHERE department_id = d.id AND is_active = 1) as member_count,
             (SELECT COUNT(*) FROM complaints WHERE department_id = d.id AND status NOT IN ('resolved','closed')) as open_complaints
      FROM departments d
      LEFT JOIN users u ON d.head_user_id = u.id
      WHERE d.is_active = 1
      ORDER BY d.name ASC
    `).all();

    res.json({ success: true, data: { departments } });
  } catch (err) {
    console.error('List departments error:', err);
    res.status(500).json({ success: false, error: 'Failed to list departments' });
  }
});

// POST /api/admin/departments
router.post('/departments', requireRole('admin'), (req: Request, res: Response) => {
  try {
    const parsed = createDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid department data' });
      return;
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO departments (name, description) VALUES (?, ?)
    `).run(parsed.data.name, parsed.data.description);

    const department = db.prepare('SELECT * FROM departments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: { department } });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      res.status(409).json({ success: false, error: 'Department name already exists' });
      return;
    }
    console.error('Create department error:', err);
    res.status(500).json({ success: false, error: 'Failed to create department' });
  }
});

// GET /api/admin/departments/:id/officers
router.get('/departments/:id/officers', requireRole('officer', 'manager', 'admin'), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const deptId = parseInt(req.params.id);

    const officers = db.prepare(`
      SELECT id, first_name, last_name, email, role
      FROM users
      WHERE department_id = ? AND is_active = 1 AND role IN ('officer', 'manager')
      ORDER BY first_name ASC
    `).all(deptId);

    res.json({ success: true, data: { officers } });
  } catch (err) {
    console.error('List officers error:', err);
    res.status(500).json({ success: false, error: 'Failed to list officers' });
  }
});

// ─── Audit Logs ───
router.get('/audit-logs', requireRole('admin'), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
    const offset = (page - 1) * pageSize;

    const total = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number };

    const logs = db.prepare(`
      SELECT al.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `).all(pageSize, offset);

    res.json({
      success: true,
      data: {
        items: logs,
        total: total.count,
        page,
        pageSize,
        totalPages: Math.ceil(total.count / pageSize),
      },
    });
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

export default router;
