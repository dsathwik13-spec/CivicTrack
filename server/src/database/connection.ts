import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_PATH = process.env.DB_PATH || './data/civictrack.db';

export function getDbPath(): string {
  const resolved = path.resolve(__dirname, '../..', DB_PATH);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return resolved;
}

export interface StatementWrapper {
  run(...args: any[]): { changes: number; lastInsertRowid: number };
  get(...args: any[]): any;
  all(...args: any[]): any[];
}

export interface DatabaseWrapper {
  prepare(sql: string): StatementWrapper;
  exec(sql: string): void;
  run(sql: string, ...params: any[]): { changes: number; lastInsertRowid: number };
  transaction<T extends (...args: any[]) => any>(fn: T): T;
  close(): void;
  raw: SqlJsDatabase;
}

let rawDbInstance: SqlJsDatabase | null = null;
let wrappedDbInstance: DatabaseWrapper | null = null;
let saveInterval: NodeJS.Timeout | null = null;
let initPromise: Promise<DatabaseWrapper> | null = null;

function normArgs(args: any[]): any {
  if (args.length === 0) return [];
  if (args.length === 1) {
    if (Array.isArray(args[0])) return args[0];
    if (typeof args[0] === 'object' && args[0] !== null) return args[0];
    return [args[0]];
  }
  return args;
}

let inTransaction = false;

export function saveDb(): void {
  if (!rawDbInstance || inTransaction) return;
  try {
    const data = rawDbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(getDbPath(), buffer);
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

export async function initDb(): Promise<DatabaseWrapper> {
  if (wrappedDbInstance) return wrappedDbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
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

export function closeDb(): void {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
  if (rawDbInstance) {
    saveDb();
    rawDbInstance.close();
    rawDbInstance = null;
    wrappedDbInstance = null;
    initPromise = null;
  }
}
