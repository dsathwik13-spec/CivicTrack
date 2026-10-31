import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { Pool, PoolClient } from 'pg';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { convertSqliteToPostgres } from './queryConverter';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export function isPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDbPath(): string {
  const dbPath = process.env.DB_PATH || './data/civictrack.db';
  const resolved = path.resolve(__dirname, '../..', dbPath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return resolved;
}

export interface StatementWrapper {
  run(...args: any[]): Promise<{ changes: number; lastInsertRowid: number }> | { changes: number; lastInsertRowid: number };
  get(...args: any[]): Promise<any> | any;
  all(...args: any[]): Promise<any[]> | any[];
}

export interface DatabaseWrapper {
  prepare(sql: string): StatementWrapper;
  exec(sql: string): Promise<void> | void;
  run(sql: string, ...params: any[]): Promise<{ changes: number; lastInsertRowid: number }> | { changes: number; lastInsertRowid: number };
  transaction<T extends (...args: any[]) => any>(fn: T): T;
  close(): Promise<void> | void;
  raw?: SqlJsDatabase;
  isPostgres: boolean;
}

let rawDbInstance: SqlJsDatabase | null = null;
let wrappedDbInstance: DatabaseWrapper | null = null;
let pgPoolInstance: Pool | null = null;
let saveInterval: NodeJS.Timeout | null = null;
let initPromise: Promise<DatabaseWrapper> | null = null;
let inTransaction = false;

function normArgs(args: any[]): any[] {
  if (args.length === 0) return [];
  if (args.length === 1) {
    if (Array.isArray(args[0])) return args[0];
    return [args[0]];
  }
  return args;
}

export function saveDb(): void {
  if (isPostgres()) return; // PostgreSQL persists directly over network
  if (!rawDbInstance || inTransaction) return;
  try {
    const data = rawDbInstance.export();
    const buffer = Buffer.from(data);
    const dbPath = getDbPath();
    const tempPath = `${dbPath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, buffer);
    try {
      fs.renameSync(tempPath, dbPath);
    } catch {
      fs.copyFileSync(tempPath, dbPath);
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore temporary unlink failures
      }
    }
  } catch (err) {
    console.error('Failed to save SQLite database:', err);
  }
}

/**
 * Creates a DatabaseWrapper for a PostgreSQL client or pool
 */
function createPgWrapper(target: Pool | PoolClient): DatabaseWrapper {
  return {
    isPostgres: true,
    prepare(sql: string): StatementWrapper {
      const pgSql = convertSqliteToPostgres(sql);
      return {
        async run(...args: any[]) {
          let runSql = pgSql;
          if (/^\s*INSERT\s+INTO\b/i.test(runSql) && !/\bRETURNING\b/i.test(runSql)) {
            runSql += ' RETURNING id';
          }
          const res = await target.query(runSql, normArgs(args));
          const lastInsertRowid = res.rows[0]?.id ?? 0;
          return { changes: res.rowCount ?? 0, lastInsertRowid };
        },
        async get(...args: any[]) {
          const res = await target.query(pgSql, normArgs(args));
          return res.rows[0];
        },
        async all(...args: any[]) {
          const res = await target.query(pgSql, normArgs(args));
          return res.rows;
        },
      };
    },
    async exec(sql: string) {
      await target.query(sql);
    },
    async run(sql: string, ...params: any[]) {
      let runSql = convertSqliteToPostgres(sql);
      if (/^\s*INSERT\s+INTO\b/i.test(runSql) && !/\bRETURNING\b/i.test(runSql)) {
        runSql += ' RETURNING id';
      }
      const res = await target.query(runSql, normArgs(params));
      const lastInsertRowid = res.rows[0]?.id ?? 0;
      return { changes: res.rowCount ?? 0, lastInsertRowid };
    },
    transaction<T extends (...args: any[]) => any>(fn: T): T {
      return (async (...args: any[]) => {
        if ('connect' in target) {
          const client = await (target as Pool).connect();
          try {
            await client.query('BEGIN');
            const clientWrapper = createPgWrapper(client);
            const prev = wrappedDbInstance;
            wrappedDbInstance = clientWrapper;
            const res = await fn(...args);
            await client.query('COMMIT');
            wrappedDbInstance = prev;
            return res;
          } catch (err) {
            await client.query('ROLLBACK');
            throw err;
          } finally {
            client.release();
          }
        } else {
          // Already inside a transaction client
          return await fn(...args);
        }
      }) as T;
    },
    async close() {
      if ('end' in target && typeof (target as Pool).end === 'function') {
        await (target as Pool).end();
      }
    },
  };
}

export function getPool(): Pool | null {
  return pgPoolInstance;
}

export async function initDb(): Promise<DatabaseWrapper> {
  if (wrappedDbInstance) return wrappedDbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // ─── PostgreSQL / Supabase Driver ───
    if (isPostgres()) {
      const connectionString = process.env.DATABASE_URL!;
      const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

      pgPoolInstance = new Pool({
        connectionString,
        max: process.env.VERCEL ? 1 : 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
      });

      // Verify connection
      const client = await pgPoolInstance.connect();
      client.release();

      wrappedDbInstance = createPgWrapper(pgPoolInstance);
      return wrappedDbInstance;
    }

    // ─── SQLite / sql.js Fallback Driver ───
    const SQL = await initSqlJs();
    const dbPath = getDbPath();

    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      rawDbInstance = new SQL.Database(buffer);
    } else {
      rawDbInstance = new SQL.Database();
    }

    rawDbInstance.run('PRAGMA foreign_keys = ON');

    const wrapper: DatabaseWrapper = {
      isPostgres: false,
      prepare(sql: string): StatementWrapper {
        return {
          run(...args: any[]) {
            const stmt = rawDbInstance!.prepare(sql);
            stmt.run(normArgs(args));
            stmt.free();
            saveDb();
            const res = rawDbInstance!.exec('SELECT changes() as ch, last_insert_rowid() as id');
            const changes = (res[0]?.values[0]?.[0] as number) ?? 0;
            const lastInsertRowid = (res[0]?.values[0]?.[1] as number) ?? 0;
            return { changes, lastInsertRowid };
          },
          get(...args: any[]) {
            const stmt = rawDbInstance!.prepare(sql);
            stmt.bind(normArgs(args));
            const row = stmt.step() ? stmt.getAsObject() : undefined;
            stmt.free();
            return row;
          },
          all(...args: any[]) {
            const stmt = rawDbInstance!.prepare(sql);
            stmt.bind(normArgs(args));
            const rows: any[] = [];
            while (stmt.step()) {
              rows.push(stmt.getAsObject());
            }
            stmt.free();
            return rows;
          },
        };
      },
      exec(sql: string) {
        rawDbInstance!.exec(sql);
        saveDb();
      },
      run(sql: string, ...params: any[]) {
        const stmt = rawDbInstance!.prepare(sql);
        stmt.run(normArgs(params));
        stmt.free();
        saveDb();
        const res = rawDbInstance!.exec('SELECT changes() as ch, last_insert_rowid() as id');
        const changes = (res[0]?.values[0]?.[0] as number) ?? 0;
        const lastInsertRowid = (res[0]?.values[0]?.[1] as number) ?? 0;
        return { changes, lastInsertRowid };
      },
      transaction<T extends (...args: any[]) => any>(fn: T): T {
        return ((...args: any[]) => {
          inTransaction = true;
          rawDbInstance!.run('BEGIN TRANSACTION');
          try {
            const result = fn(...args);
            rawDbInstance!.run('COMMIT');
            inTransaction = false;
            saveDb();
            return result;
          } catch (err) {
            rawDbInstance!.run('ROLLBACK');
            inTransaction = false;
            throw err;
          }
        }) as T;
      },
      close() {
        closeDb();
      },
      get raw() {
        return rawDbInstance!;
      },
    };

    wrappedDbInstance = wrapper;

    if (!saveInterval) {
      saveInterval = setInterval(() => {
        saveDb();
      }, 5000);
    }

    return wrapper;
  })();

  return initPromise;
}

export function getDb(): DatabaseWrapper {
  if (!wrappedDbInstance) {
    throw new Error('Database not initialized. Await initDb() first before using getDb().');
  }
  return wrappedDbInstance;
}

export async function closeDb(): Promise<void> {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
  if (pgPoolInstance) {
    await pgPoolInstance.end();
    pgPoolInstance = null;
  }
  if (rawDbInstance) {
    saveDb();
    rawDbInstance.close();
    rawDbInstance = null;
  }
  wrappedDbInstance = null;
  initPromise = null;
}

// Graceful exit listeners
if (process.env.NODE_ENV !== 'test') {
  process.on('beforeExit', () => {
    saveDb();
  });
  process.on('SIGINT', async () => {
    await closeDb();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await closeDb();
    process.exit(0);
  });
}
