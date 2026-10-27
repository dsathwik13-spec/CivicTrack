import { Router, Request, Response } from 'express';
import { getDb } from '../database/connection';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/notifications — Get user's notifications
router.get('/', requireAuth, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;

    const total = db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?'
    ).get(req.userId) as { count: number };

    const unreadCount = db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).get(req.userId) as { count: number };

    const notifications = db.prepare(`
      SELECT n.*, c.grievance_id
      FROM notifications n
      LEFT JOIN complaints c ON n.related_complaint_id = c.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.userId, pageSize, offset);

    res.json({
      success: true,
      data: {
        items: notifications,
        unreadCount: unreadCount.count,
        total: total.count,
        page,
        pageSize,
        totalPages: Math.ceil(total.count / pageSize),
      },
    });
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', requireAuth, (req: Request, res: Response) => {
  try {
    const db = getDb();
    db.prepare(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
    ).run(parseInt(req.params.id), req.userId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', requireAuth, (req: Request, res: Response) => {
  try {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
});

export default router;
