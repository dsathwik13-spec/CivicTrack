import { getDb } from '../database/connection';

/**
 * Check for overdue complaints and create escalation events.
 * Run periodically via cron or manual trigger.
 */
export async function runEscalationCheck(): Promise<void> {
  try {
    const db = getDb();
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    // Mark overdue complaints
    await db.prepare(`
      UPDATE complaints 
      SET is_overdue = 1, updated_at = ?
      WHERE target_resolution_date IS NOT NULL
        AND target_resolution_date < ?
        AND status NOT IN ('resolved', 'closed')
        AND is_overdue = 0
    `).run(now, now);

    // Get newly overdue complaints that haven't been escalated at this level
    const overdueComplaints = await db.prepare(`
      SELECT c.*, d.head_user_id as dept_head_id
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.is_overdue = 1
        AND c.status NOT IN ('resolved', 'closed')
        AND c.id NOT IN (
          SELECT complaint_id FROM escalation_events 
          WHERE escalation_level = 1
        )
    `).all() as any[];

    for (const complaint of overdueComplaints) {
      const escalateToUser = complaint.dept_head_id || complaint.assigned_officer_id;
      
      if (!escalateToUser) continue;

      const hoursOverdue = complaint.target_resolution_date
        ? Math.round(
            (new Date(now).getTime() - new Date(complaint.target_resolution_date).getTime()) /
              (1000 * 60 * 60)
          )
        : 0;

      await db.prepare(`
        INSERT INTO escalation_events 
        (complaint_id, escalation_level, escalated_to_user_id, reason, threshold_hours, created_at)
        VALUES (?, 1, ?, ?, ?, ?)
      `).run(
        complaint.id,
        escalateToUser,
        `Complaint has exceeded SLA target resolution time by ${hoursOverdue} hours`,
        hoursOverdue,
        now
      );

      // Notify the escalation target
      await db.prepare(`
        INSERT INTO notifications 
        (user_id, title, message, type, related_complaint_id, created_at)
        VALUES (?, 'SLA Escalation', ?, 'warning', ?, ?)
      `).run(
        escalateToUser,
        `Complaint "${complaint.title}" (${complaint.grievance_id}) has breached SLA`,
        complaint.id,
        now
      );
    }

    // Level 2 escalation: complaints overdue for more than 2x the target
    const severelyOverdue = await db.prepare(`
      SELECT c.*, d.head_user_id as dept_head_id
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN sla_policies sp ON c.category = sp.category AND c.priority = sp.priority
      WHERE c.is_overdue = 1
        AND c.status NOT IN ('resolved', 'closed')
        AND c.target_resolution_date IS NOT NULL
        AND (julianday(?) - julianday(c.target_resolution_date)) * 24 > COALESCE(sp.target_hours, 72)
        AND c.id NOT IN (
          SELECT complaint_id FROM escalation_events 
          WHERE escalation_level = 2
        )
        AND c.id IN (
          SELECT complaint_id FROM escalation_events 
          WHERE escalation_level = 1
        )
    `).all(now) as any[];

    for (const complaint of severelyOverdue) {
      // Escalate to admin (user id 1 as fallback)
      const adminUser = await db.prepare(`
        SELECT id FROM users WHERE role = 'admin' AND is_active = 1 LIMIT 1
      `).get() as { id: number } | undefined;

      const escalateToUser = adminUser?.id || 1;

      await db.prepare(`
        INSERT INTO escalation_events 
        (complaint_id, escalation_level, escalated_to_user_id, reason, threshold_hours, created_at)
        VALUES (?, 2, ?, ?, ?, ?)
      `).run(
        complaint.id,
        escalateToUser,
        'Complaint severely overdue — exceeded 2x SLA target',
        0,
        now
      );

      await db.prepare(`
        INSERT INTO notifications 
        (user_id, title, message, type, related_complaint_id, created_at)
        VALUES (?, 'Critical SLA Breach', ?, 'error', ?, ?)
      `).run(
        escalateToUser,
        `CRITICAL: Complaint "${complaint.title}" (${complaint.grievance_id}) severely overdue`,
        complaint.id,
        now
      );
    }

    console.log(`[Escalation] Check completed at ${now}`);
  } catch (err) {
    console.error('[Escalation] Error:', err);
  }
}
