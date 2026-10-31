/**
 * PostgreSQL Schema & Compatibility DDL for Supabase
 */
export const PG_SCHEMA_SQL = `
-- Compatibility Functions for SQLite Date Functions
CREATE OR REPLACE FUNCTION julianday(t text) RETURNS double precision AS $$
BEGIN
  IF t IS NULL OR t = '' THEN RETURN NULL; END IF;
  RETURN EXTRACT(EPOCH FROM t::timestamp) / 86400.0 + 2440587.5;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION julianday(t timestamp with time zone) RETURNS double precision AS $$
BEGIN
  IF t IS NULL THEN RETURN NULL; END IF;
  RETURN EXTRACT(EPOCH FROM t) / 86400.0 + 2440587.5;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION date(t text) RETURNS text AS $$
BEGIN
  IF t IS NULL OR t = '' THEN RETURN NULL; END IF;
  RETURN to_char(t::timestamp, 'YYYY-MM-DD');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION date(t text, modifier text) RETURNS text AS $$
DECLARE
  days_count integer;
BEGIN
  IF modifier LIKE '-% days' THEN
    days_count := (SUBSTRING(modifier FROM '-([0-9]+) days'))::integer;
    RETURN to_char(CURRENT_TIMESTAMP - (days_count * INTERVAL '1 day'), 'YYYY-MM-DD');
  ELSIF modifier LIKE '+% days' THEN
    days_count := (SUBSTRING(modifier FROM '\\+([0-9]+) days'))::integer;
    RETURN to_char(CURRENT_TIMESTAMP + (days_count * INTERVAL '1 day'), 'YYYY-MM-DD');
  END IF;
  RETURN to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1. Departments
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  head_user_id INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK(role IN ('citizen', 'officer', 'manager', 'admin')),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'),
  updated_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);

-- Add circular foreign key for departments.head_user_id if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_departments_head_user'
  ) THEN
    ALTER TABLE departments ADD CONSTRAINT fk_departments_head_user
      FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Complaints
CREATE TABLE IF NOT EXISTS complaints (
  id SERIAL PRIMARY KEY,
  grievance_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN (
    'roads_potholes', 'water_supply', 'sanitation_waste',
    'streetlights', 'drainage', 'public_infrastructure', 'other'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN (
    'submitted', 'acknowledged', 'assigned', 'in_progress',
    'awaiting_information', 'resolved', 'closed', 'reopened'
  )),
  citizen_id INTEGER NOT NULL REFERENCES users(id),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  assigned_officer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  incident_date TEXT,
  target_resolution_date TEXT,
  resolved_at TEXT,
  closed_at TEXT,
  resolution_notes TEXT,
  is_overdue INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'),
  updated_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_complaints_grievance_id ON complaints(grievance_id);
CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_department ON complaints(department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_officer ON complaints(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_overdue ON complaints(is_overdue);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at);

-- 4. Status History
CREATE TABLE IF NOT EXISTS status_history (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_user_id INTEGER NOT NULL REFERENCES users(id),
  reason TEXT,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_status_history_complaint ON status_history(complaint_id);

-- 5. Assignment History
CREATE TABLE IF NOT EXISTS assignment_history (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  previous_officer_id INTEGER REFERENCES users(id),
  new_officer_id INTEGER NOT NULL REFERENCES users(id),
  previous_department_id INTEGER REFERENCES departments(id),
  new_department_id INTEGER NOT NULL REFERENCES departments(id),
  assigned_by_user_id INTEGER NOT NULL REFERENCES users(id),
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_assignment_history_complaint ON assignment_history(complaint_id);

-- 6. Public Updates
CREATE TABLE IF NOT EXISTS public_updates (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_public_updates_complaint ON public_updates(complaint_id);

-- 7. Internal Notes
CREATE TABLE IF NOT EXISTS internal_notes (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_internal_notes_complaint ON internal_notes(complaint_id);

-- 8. Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  uploaded_by_user_id INTEGER NOT NULL REFERENCES users(id),
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_attachments_complaint ON attachments(complaint_id);

-- 9. SLA Policies
CREATE TABLE IF NOT EXISTS sla_policies (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  priority TEXT NOT NULL DEFAULT 'medium',
  target_hours INTEGER NOT NULL DEFAULT 72,
  escalation_hours INTEGER NOT NULL DEFAULT 48,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'),
  updated_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_sla_category ON sla_policies(category);
CREATE INDEX IF NOT EXISTS idx_sla_priority ON sla_policies(priority);

-- 10. Escalation Events
CREATE TABLE IF NOT EXISTS escalation_events (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  escalation_level INTEGER NOT NULL DEFAULT 1,
  escalated_to_user_id INTEGER REFERENCES users(id),
  reason TEXT NOT NULL,
  threshold_hours INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_escalation_complaint ON escalation_events(complaint_id);

-- 11. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info', 'warning', 'success', 'error')),
  related_complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- 12. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- 13. Migrations Tracking
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
);

-- 14. Session Store for connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
`;

