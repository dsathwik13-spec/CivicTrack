import { DatabaseWrapper } from './connection';

export interface Migration {
  name: string;
  run(db: DatabaseWrapper): void;
}

export const migrations: Migration[] = [
  {
    name: '001_repair_historical_grievance_ownership',
    run(db: DatabaseWrapper) {
      // Precondition 1: Verify the target complaint exists
      const complaint = db.prepare(
        "SELECT id, grievance_id, citizen_id, status FROM complaints WHERE grievance_id = 'CT-QSJMFJTAH7'"
      ).get() as { id: number; grievance_id: string; citizen_id: number; status: string } | undefined;

      if (!complaint) {
        console.log('[Migration 001] Complaint CT-QSJMFJTAH7 not found in this database. Skipping.');
        return;
      }

      // Precondition 2: Verify legitimate citizen exists
      const citizenUser = db.prepare(
        "SELECT id, email, role FROM users WHERE email = 'citizen1@civictrack.demo' AND role = 'citizen'"
      ).get() as { id: number; email: string; role: string } | undefined;

      if (!citizenUser) {
        console.warn('[Migration 001] Legitimate citizen citizen1@civictrack.demo not found. Preserving complaint without guessing.');
        return;
      }

      // Precondition 3: Only repair if currently owned by an admin/wrong account
      if (complaint.citizen_id === citizenUser.id) {
        console.log(`[Migration 001] Complaint CT-QSJMFJTAH7 already correctly owned by citizen ${citizenUser.id} (${citizenUser.email}).`);
        return;
      }

      console.log(`[Migration 001] Reassigning CT-QSJMFJTAH7 from user ${complaint.citizen_id} to verified citizen ${citizenUser.id} (${citizenUser.email})...`);
      
      db.prepare("UPDATE complaints SET citizen_id = ? WHERE id = ?").run(citizenUser.id, complaint.id);
      db.prepare("UPDATE audit_logs SET user_id = ? WHERE entity_id = ? AND action = 'create'").run(citizenUser.id, complaint.id);
      db.prepare("UPDATE status_history SET changed_by_user_id = ? WHERE complaint_id = ? AND previous_status IS NULL").run(citizenUser.id, complaint.id);
    }
  }
];

export function runMigrations(db: DatabaseWrapper): void {
  // Ensure _migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedRows = db.prepare("SELECT name FROM _migrations").all() as { name: string }[];
  const appliedSet = new Set(appliedRows.map((r) => r.name));

  for (const migration of migrations) {
    if (!appliedSet.has(migration.name)) {
      console.log(`[Migration] Applying ${migration.name}...`);
      const tx = db.transaction(() => {
        migration.run(db);
        db.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, datetime('now'))").run(migration.name);
      });
      tx();
      console.log(`[Migration] Successfully applied ${migration.name}.`);
    }
  }
}
