import initSqlJs from 'sql.js';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PG_SCHEMA_SQL } from './pgSchema';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const sqlitePath = path.resolve(__dirname, '../../data/civictrack.db');
const backupPath = path.resolve(__dirname, '../../data/civictrack.db.pre_migration_backup');

async function migrate() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🏛️  CivicTrack — Idempotent SQLite to Supabase Migration');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Pre-flight checks
  if (!fs.existsSync(sqlitePath)) {
    console.error(`❌ Source SQLite database not found at: ${sqlitePath}`);
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is missing.');
    console.error('\nUsage:');
    console.error('  DATABASE_URL="postgresql://postgres.[ref]:[pass]@...:6543/postgres?pgbouncer=true" npm run db:migrate-pg\n');
    process.exit(1);
  }

  // 2. Safety Backup Verification
  console.log('🔒 Step 1: Safety Backup Verification...');
  if (!fs.existsSync(backupPath)) {
    console.log(`   Creating safety backup: ${backupPath}`);
    fs.copyFileSync(sqlitePath, backupPath);
  }
  const sourceStats = fs.statSync(sqlitePath);
  const backupStats = fs.statSync(backupPath);
  console.log(`   ✓ Source database: ${sqlitePath} (${sourceStats.size} bytes)`);
  console.log(`   ✓ Verified backup: ${backupPath} (${backupStats.size} bytes)\n`);

  // 3. Read SQLite Source Database in Memory (Read-Only)
  console.log('📖 Step 2: Reading local SQLite records (Read-Only)...');
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(sqlitePath);
  const sqliteDb = new SQL.Database(fileBuffer);

  const tables = [
    'departments', 'users', 'complaints', 'status_history',
    'assignment_history', 'public_updates', 'internal_notes',
    'attachments', 'sla_policies', 'escalation_events',
    'notifications', 'audit_logs', '_migrations'
  ];

  const sqliteCounts: Record<string, number> = {};
  for (const t of tables) {
    try {
      const res = sqliteDb.exec(`SELECT count(*) FROM "${t}"`);
      sqliteCounts[t] = (res[0]?.values[0]?.[0] as number) ?? 0;
      console.log(`   • ${t.padEnd(20)}: ${sqliteCounts[t]} records`);
    } catch {
      sqliteCounts[t] = 0;
    }
  }

  // Verify critical grievance exists in SQLite
  const stmtTarget = sqliteDb.prepare("SELECT id, grievance_id, title, citizen_id, status FROM complaints WHERE grievance_id = 'CT-QSJMFJTAH7'");
  let targetGrievanceExists = false;
  if (stmtTarget.step()) {
    const row = stmtTarget.getAsObject();
    console.log(`\n   ✓ Verified CT-QSJMFJTAH7 in SQLite: "${row.title}" (Status: ${row.status}, Citizen ID: ${row.citizen_id})`);
    targetGrievanceExists = true;
  }
  stmtTarget.free();

  if (!targetGrievanceExists) {
    console.warn('   ⚠️ Warning: CT-QSJMFJTAH7 was not found in source SQLite database.');
  }

  // 4. Connect to Supabase PostgreSQL
  console.log('\n🌐 Step 3: Connecting to Supabase PostgreSQL...');
  const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 2,
    connectionTimeoutMillis: 15000,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  console.log('   ✓ Connected to PostgreSQL successfully.\n');

  try {
    console.log('🚀 Step 4: Applying Schema & Migrating Data within an Atomic Transaction...');
    await client.query('BEGIN');

    // Apply PostgreSQL schema
    await client.query(PG_SCHEMA_SQL);
    console.log('   ✓ PostgreSQL DDL schema & compatibility functions applied.');

    // Helper to extract rows from SQLite
    const getSqliteRows = (tableName: string): any[] => {
      const stmt = sqliteDb.prepare(`SELECT * FROM "${tableName}" ORDER BY id ASC`);
      const rows: any[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    };

    // Helper for parameterized bulk insert with ON CONFLICT DO NOTHING
    const insertRows = async (tableName: string, rows: any[]) => {
      if (rows.length === 0) return;
      const columns = Object.keys(rows[0]);
      const colList = columns.map(c => `"${c}"`).join(', ');

      for (const row of rows) {
        const values = columns.map(c => row[c] !== null && row[c] !== undefined ? row[c] : null);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const query = `
          INSERT INTO "${tableName}" (${colList})
          VALUES (${placeholders})
          ON CONFLICT (id) DO NOTHING;
        `;
        await client.query(query, values);
      }
    };

    // 1. Departments (head_user_id temporarily set to null to avoid circular FK violation before users exist)
    const deptRows = getSqliteRows('departments');
    const deptRowsWithoutHead = deptRows.map(d => ({ ...d, head_user_id: null }));
    await insertRows('departments', deptRowsWithoutHead);

    // 2. Users (now users can be inserted safely, referencing existing departments)
    const userRows = getSqliteRows('users');
    await insertRows('users', userRows);

    // Update departments head_user_id to restore original department head relationships
    for (const d of deptRows) {
      if (d.head_user_id) {
        await client.query('UPDATE departments SET head_user_id = $1 WHERE id = $2', [d.head_user_id, d.id]);
      }
    }

    // 3. Complaints
    const complaintRows = getSqliteRows('complaints');
    await insertRows('complaints', complaintRows);

    // 4. Status History
    const statusRows = getSqliteRows('status_history');
    await insertRows('status_history', statusRows);

    // 5. Assignment History
    const assignRows = getSqliteRows('assignment_history');
    await insertRows('assignment_history', assignRows);

    // 6. Public Updates
    const updateRows = getSqliteRows('public_updates');
    await insertRows('public_updates', updateRows);

    // 7. Internal Notes
    const noteRows = getSqliteRows('internal_notes');
    await insertRows('internal_notes', noteRows);

    // 8. Attachments
    const attachRows = getSqliteRows('attachments');
    await insertRows('attachments', attachRows);

    // 9. SLA Policies
    const slaRows = getSqliteRows('sla_policies');
    await insertRows('sla_policies', slaRows);

    // 10. Escalation Events
    const escRows = getSqliteRows('escalation_events');
    await insertRows('escalation_events', escRows);

    // 11. Notifications
    const notifRows = getSqliteRows('notifications');
    await insertRows('notifications', notifRows);

    // 12. Audit Logs
    const auditRows = getSqliteRows('audit_logs');
    await insertRows('audit_logs', auditRows);

    // 13. Migrations
    const migRows = getSqliteRows('_migrations');
    await insertRows('_migrations', migRows);

    console.log('   ✓ All rows inserted successfully.');

    // 5. Sequence Reset
    console.log('\n🔢 Step 5: Synchronizing PostgreSQL serial sequences...');
    for (const t of tables) {
      try {
        await client.query(`
          SELECT setval(
            pg_get_serial_sequence('${t}', 'id'),
            COALESCE((SELECT MAX(id) FROM "${t}"), 1),
            (SELECT MAX(id) FROM "${t}") IS NOT NULL
          );
        `);
      } catch {
        // ignore tables without serial sequence
      }
    }
    console.log('   ✓ Serial sequences synchronized.');

    // 6. Post-Flight Verification
    console.log('\n🔍 Step 6: Post-Migration Count Verification...');
    let allMatched = true;
    for (const t of tables) {
      const res = await client.query(`SELECT count(*)::int as c FROM "${t}"`);
      const pgCount = res.rows[0].c;
      const expected = sqliteCounts[t];
      const match = pgCount === expected;
      if (!match) allMatched = false;
      console.log(`   • ${t.padEnd(20)}: SQLite=${expected} | Postgres=${pgCount} [${match ? 'MATCH ✓' : 'MISMATCH ❌'}]`);
    }

    // Verify CT-QSJMFJTAH7 in PostgreSQL
    const pgTarget = await client.query(
      "SELECT id, grievance_id, title, citizen_id, status FROM complaints WHERE grievance_id = 'CT-QSJMFJTAH7'"
    );
    if (pgTarget.rows.length > 0) {
      const row = pgTarget.rows[0];
      console.log(`\n   ✓ Verified CT-QSJMFJTAH7 in Supabase PostgreSQL:`);
      console.log(`     ID: ${row.id} | Title: "${row.title}" | Status: ${row.status} | Citizen ID: ${row.citizen_id}`);
    } else {
      console.error('\n   ❌ Verification Failed: CT-QSJMFJTAH7 not found in PostgreSQL!');
      allMatched = false;
    }

    if (!allMatched) {
      throw new Error('Data verification failed: Record counts or critical grievance do not match.');
    }

    await client.query('COMMIT');
    console.log('\n🎉 Step 7: Transaction COMMITTED successfully! Migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during migration. Transaction ROLLED BACK safely. No changes persisted.');
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    sqliteDb.close();
  }
}

migrate().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});

