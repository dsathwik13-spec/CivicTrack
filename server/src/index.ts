import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import { CronJob } from 'cron';

import { initDb, getDb } from './database/connection';
import { SCHEMA_SQL } from './database/schema';
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

// Database is initialized in async start() function below

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
app.use(session({
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
}));

// ─── API Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Health Check ───
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CivicTrack API is running', timestamp: new Date().toISOString() });
});

// ─── Serve uploaded files (with auth check) ───
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ─── In production, serve frontend build ───
if (!isDev) {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Error Handler ───
app.use(errorHandler);

// ─── Start Server ───
async function start() {
  await initDb();
  const db = getDb();
  db.exec(SCHEMA_SQL);
  runMigrations(db);

  app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║       🏛️  CivicTrack Server Running       ║
  ║                                           ║
  ║  API:  http://localhost:${PORT}              ║
  ║  ENV:  ${isDev ? 'development' : 'production'}                     ║
  ╚═══════════════════════════════════════════╝
    `);
  });

  // ─── Escalation Cron Job (every 30 minutes) ───
  const escalationJob = new CronJob('*/30 * * * *', () => {
    runEscalationCheck();
  });
  escalationJob.start();

  // Run initial check on startup
  setTimeout(() => runEscalationCheck(), 5000);
}

if (process.env.NODE_ENV !== 'test') {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { app, start };
export default app;
