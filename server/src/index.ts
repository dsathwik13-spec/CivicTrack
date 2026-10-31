import express from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import { CronJob } from 'cron';

import { initDb, getDb, isPostgres, getPool } from './database/connection';
import { SCHEMA_SQL } from './database/schema';
import { PG_SCHEMA_SQL } from './database/pgSchema';
import { runMigrations } from './database/migrations';
import { errorHandler } from './middleware/errorHandler';
import { runEscalationCheck } from './jobs/escalation';

import authRoutes from './routes/auth';
import complaintRoutes from './routes/complaints';
import dashboardRoutes from './routes/dashboard';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '3001');
const isDev = process.env.NODE_ENV !== 'production';

// ─── Security ───
app.use(helmet({
  contentSecurityPolicy: false, // Frontend handles CSP
}));

// ─── CORS ───
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// ─── Rate Limiting ───
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many authentication attempts' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── Body Parsing ───
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ─── Sessions ───
const PgStore = pgSession(session);

const sessionOptions: session.SessionOptions = {
  name: 'civictrack.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production-immediately',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: !isDev,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// If PostgreSQL is configured, persist sessions in Supabase PostgreSQL
if (isPostgres()) {
  const pool = getPool();
  if (pool) {
    sessionOptions.store = new PgStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    });
  } else if (process.env.DATABASE_URL) {
    sessionOptions.store = new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: 'session',
      createTableIfMissing: true,
    });
  }
}

app.use(session(sessionOptions));

// ─── API Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Escalation Trigger (for Vercel Cron or manual admin check) ───
app.get('/api/jobs/escalation', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid CRON_SECRET' });
    return;
  }
  try {
    await runEscalationCheck();
    res.json({
      success: true,
      message: 'Escalation check completed',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Escalation check failed' });
  }
});

// ─── Health Check ───
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'CivicTrack API is running',
    engine: isPostgres() ? 'postgresql' : 'sqlite',
    timestamp: new Date().toISOString()
  });
});

// ─── Serve uploaded files ───
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ─── In standard production (non-Vercel), serve frontend build ───
if (!isDev && !process.env.VERCEL) {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Error Handler ───
app.use(errorHandler);

let readyPromise: Promise<void> | null = null;

/**
 * Ensure database is connected and initialized before processing serverless requests
 */
export async function ensureReady(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    await initDb();
    const db = getDb();
    if (isPostgres()) {
      await db.exec(PG_SCHEMA_SQL);
    } else {
      db.exec(SCHEMA_SQL);
      runMigrations(db);
    }
  })();
  return readyPromise;
}

// ─── Start Server (for local development and non-serverless deployment) ───
async function start() {
  await ensureReady();

  app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║       🏛️  CivicTrack Server Running       ║
  ║                                           ║
  ║  API:  http://localhost:${PORT}              ║
  ║  ENV:  ${isDev ? 'development' : 'production'}                     ║
  ║  DB:   ${isPostgres() ? 'Supabase PostgreSQL' : 'SQLite (sql.js)'}            ║
  ╚═══════════════════════════════════════════╝
    `);
  });

  // Only run in-memory cron if NOT in serverless environment
  if (!process.env.VERCEL) {
    const escalationJob = new CronJob('*/30 * * * *', () => {
      runEscalationCheck();
    });
    escalationJob.start();

    // Run initial check on startup
    setTimeout(() => runEscalationCheck(), 5000);
  }
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { app, start };
export default app;
