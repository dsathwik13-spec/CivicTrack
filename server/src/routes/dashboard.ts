import { Router, Request, Response } from 'express';
import { getDb } from '../database/connection';
import { requireRole, optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/stats — Aggregated grievance statistics
router.get('/stats', optionalAuth, (req: Request, res: Response) => {
  try {
    const db = getDb();

    let where = 'WHERE 1=1';
    const params: any[] = [];

    // If department scope requested by officer or manager
    if (req.query.scope === 'department') {
      if (req.userRole === 'officer') {
        where += ' AND (c.assigned_officer_id = ? OR c.department_id IN (SELECT department_id FROM users WHERE id = ?))';
        params.push(req.userId, req.userId);
      } else if (req.userRole === 'manager') {
        where += ' AND (c.department_id IN (SELECT department_id FROM users WHERE id = ?) OR c.department_id IS NULL)';
        params.push(req.userId);
      }
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM complaints c ${where}`).get(...params) as { count: number };
    
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count FROM complaints c ${where} GROUP BY status
    `).all(...params) as { status: string; count: number }[];

    const overdue = db.prepare(`
      SELECT COUNT(*) as count FROM complaints c ${where} AND c.is_overdue = 1
    `).get(...params) as { count: number };

    // Average resolution time (in hours)
    const avgRes = db.prepare(`
      SELECT AVG(
        (julianday(c.resolved_at) - julianday(c.created_at)) * 24
      ) as avg_hours
      FROM complaints c ${where} AND c.resolved_at IS NOT NULL
    `).get(...params) as { avg_hours: number | null };

    const resolved = db.prepare(`
      SELECT COUNT(*) as count FROM complaints c ${where} AND c.status IN ('resolved', 'closed')
    `).get(...params) as { count: number };

    const statusMap: Record<string, number> = {};
    for (const s of statusCounts) {
      statusMap[s.status] = s.count;
    }

    res.json({
      success: true,
      data: {
        total: total.count,
        submitted: statusMap['submitted'] || 0,
        acknowledged: statusMap['acknowledged'] || 0,
        assigned: statusMap['assigned'] || 0,
        inProgress: statusMap['in_progress'] || 0,
        awaitingInfo: statusMap['awaiting_information'] || 0,
        resolved: statusMap['resolved'] || 0,
        closed: statusMap['closed'] || 0,
        reopened: statusMap['reopened'] || 0,
        overdue: overdue.count,
        avgResolutionHours: Math.round((avgRes.avg_hours || 0) * 10) / 10,
        resolutionRate: total.count > 0 ? Math.round((resolved.count / total.count) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/dashboard/analytics
router.get('/analytics', optionalAuth, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const dateFrom = req.query.date_from as string || '';
    const dateTo = req.query.date_to as string || '';

    let dateWhere = '';
    const dateParams: any[] = [];
    if (dateFrom) {
      dateWhere += ' AND c.created_at >= ?';
      dateParams.push(dateFrom);
    }
    if (dateTo) {
      dateWhere += ' AND c.created_at <= ?';
      dateParams.push(dateTo + ' 23:59:59');
    }

    // Complaints by category
    const byCategory = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM complaints c WHERE 1=1 ${dateWhere}
      GROUP BY category ORDER BY count DESC
    `).all(...dateParams);

    // Complaints by status
    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM complaints c WHERE 1=1 ${dateWhere}
      GROUP BY status ORDER BY count DESC
    `).all(...dateParams);

    // Complaints by priority
    const byPriority = db.prepare(`
      SELECT priority, COUNT(*) as count 
      FROM complaints c WHERE 1=1 ${dateWhere}
      GROUP BY priority ORDER BY count DESC
    `).all(...dateParams);

    // Department workload
    const byDepartment = db.prepare(`
      SELECT d.name, COUNT(c.id) as total,
             SUM(CASE WHEN c.status IN ('submitted','acknowledged','assigned','in_progress','awaiting_information','reopened') THEN 1 ELSE 0 END) as open_count,
             SUM(CASE WHEN c.status IN ('resolved','closed') THEN 1 ELSE 0 END) as resolved_count,
             SUM(CASE WHEN c.is_overdue = 1 THEN 1 ELSE 0 END) as overdue_count
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.department_id IS NOT NULL ${dateWhere}
      GROUP BY c.department_id
      ORDER BY total DESC
    `).all(...dateParams);

    // Complaints over time (last 30 days)
    const overTime = db.prepare(`
      SELECT date(c.created_at) as date, COUNT(*) as count
      FROM complaints c
      WHERE c.created_at >= date('now', '-30 days') ${dateWhere}
      GROUP BY date(c.created_at)
      ORDER BY date ASC
    `).all(...dateParams);

    // Resolution time by category
    const resolutionByCategory = db.prepare(`
      SELECT c.category,
             AVG((julianday(c.resolved_at) - julianday(c.created_at)) * 24) as avg_hours,
             COUNT(*) as resolved_count
      FROM complaints c
      WHERE c.resolved_at IS NOT NULL ${dateWhere}
      GROUP BY c.category
    `).all(...dateParams);

    // SLA compliance
    const slaCompliance = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN c.is_overdue = 0 AND c.status IN ('resolved','closed') THEN 1 ELSE 0 END) as within_sla,
        SUM(CASE WHEN c.is_overdue = 1 THEN 1 ELSE 0 END) as breached
      FROM complaints c
      WHERE c.status IN ('resolved','closed') ${dateWhere}
    `).get(...dateParams);

    res.json({
      success: true,
      data: {
        byCategory,
        byStatus,
        byPriority,
        byDepartment,
        overTime,
        resolutionByCategory,
        slaCompliance,
      },
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// GET /api/dashboard/escalations
router.get('/escalations', requireRole('officer', 'manager', 'admin'), (req: Request, res: Response) => {
  try {
    const db = getDb();

    const overdueComplaints = db.prepare(`
      SELECT c.*, d.name as department_name,
             u_officer.first_name || ' ' || u_officer.last_name as officer_name,
             u_citizen.first_name || ' ' || u_citizen.last_name as citizen_name
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u_officer ON c.assigned_officer_id = u_officer.id
      LEFT JOIN users u_citizen ON c.citizen_id = u_citizen.id
      WHERE c.is_overdue = 1 
        AND c.status NOT IN ('resolved', 'closed')
      ORDER BY c.target_resolution_date ASC
    `).all();

    const recentEscalations = db.prepare(`
      SELECT e.*, c.grievance_id, c.title as complaint_title,
             u.first_name || ' ' || u.last_name as escalated_to_name
      FROM escalation_events e
      JOIN complaints c ON e.complaint_id = c.id
      LEFT JOIN users u ON e.escalated_to_user_id = u.id
      ORDER BY e.created_at DESC
      LIMIT 50
    `).all();

    res.json({
      success: true,
      data: { overdueComplaints, recentEscalations },
    });
  } catch (err) {
    console.error('Escalations error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch escalations' });
  }
});

export default router;
