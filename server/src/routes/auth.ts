import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../database/connection';
import { requireAuth } from '../middleware/auth';
import { registerSchema, loginSchema } from '../validation/schemas';
import { User, UserPublic } from '../types';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password, first_name, last_name, phone } = parsed.data;
    const db = getDb();

    // Check if email exists
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ success: false, error: 'An account with this email already exists' });
      return;
    }

    const password_hash = bcrypt.hashSync(password, 12);

    const result = await db.prepare(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
      VALUES (?, ?, ?, ?, ?, 'citizen')
    `).run(email, password_hash, first_name, last_name, phone || null);

    // Auto-login after registration
    req.session.userId = result.lastInsertRowid as number;
    req.session.userRole = 'citizen';

    const user = await db.prepare(`
      SELECT id, email, first_name, last_name, phone, role, department_id, is_active, created_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid) as UserPublic;

    res.status(201).json({
      success: true,
      data: { user },
      message: 'Account created successfully',
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const { email, password } = parsed.data;
    const db = getDb();

    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ success: false, error: 'Account has been deactivated' });
      return;
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;

    const { password_hash, ...userPublic } = user;

    res.json({
      success: true,
      data: { user: userPublic },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ success: false, error: 'Logout failed' });
      return;
    }
    res.clearCookie('civictrack.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const user = await db.prepare(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, 
             u.department_id, u.is_active, u.created_at,
             d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `).get(req.userId) as UserPublic | undefined;

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: { user } });
  } catch (err) {
    console.error('Auth /me error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
});

export default router;
