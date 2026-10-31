import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../index';
import { initDb, closeDb } from '../database/connection';
import { SCHEMA_SQL } from '../database/schema';

describe('Role-Based Authentication & Access Control Verification', () => {
  const testDbFile = path.resolve(__dirname, '../../data/civictrack_role_test.db');
  const mainDbFile = path.resolve(__dirname, '../../data/civictrack.db');

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_PATH = './data/civictrack_role_test.db';
    closeDb();

    if (fs.existsSync(mainDbFile)) {
      fs.copyFileSync(mainDbFile, testDbFile);
    }

    await initDb();
  });

  afterAll(async () => {
    closeDb();
    try {
      if (fs.existsSync(testDbFile)) {
        fs.unlinkSync(testDbFile);
      }
    } catch {
      // ignore
    }
  });

  describe('1. Authentication & Session Verification for All 4 Roles', () => {
    it('should authenticate Citizen and establish session with citizen role', async () => {
      const agent = request.agent(app);
      const res = await agent.post('/api/auth/login').send({
        email: 'citizen1@civictrack.demo',
        password: 'Citizen@CivicTrack2024',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('citizen');
      expect(res.body.data.user.email).toBe('citizen1@civictrack.demo');

      // Verify session persistence
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.role).toBe('citizen');
    });

    it('should authenticate Field Officer and establish session with officer role', async () => {
      const agent = request.agent(app);
      const res = await agent.post('/api/auth/login').send({
        email: 'officer.roads@civictrack.demo',
        password: 'Officer@CivicTrack2024',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('officer');
      expect(res.body.data.user.department_id).toBe(1);

      // Verify session persistence
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.role).toBe('officer');
    });

    it('should authenticate Department Manager and establish session with manager role', async () => {
      const agent = request.agent(app);
      const res = await agent.post('/api/auth/login').send({
        email: 'roads.manager@civictrack.demo',
        password: 'Manager@CivicTrack2024',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('manager');
      expect(res.body.data.user.department_id).toBe(1);

      // Verify session persistence
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.role).toBe('manager');
    });

    it('should authenticate System Administrator and establish session with admin role', async () => {
      const agent = request.agent(app);
      const res = await agent.post('/api/auth/login').send({
        email: 'admin@civictrack.demo',
        password: 'Admin@CivicTrack2024',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('admin');

      // Verify session persistence
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.role).toBe('admin');
    });

    it('should reject invalid credentials and prevent session establishment', async () => {
      const agent = request.agent(app);
      const res = await agent.post('/api/auth/login').send({
        email: 'admin@civictrack.demo',
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);

      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(401);
    });
  });

  describe('2. Strict Role-Based API Authorization & Unauthorized Rejections', () => {
    it('should reject unauthenticated requests to protected endpoints (401)', async () => {
      const unauth = request(app);

      const res1 = await unauth.get('/api/admin/users');
      expect(res1.status).toBe(401);

      const res2 = await unauth.get('/api/complaints/my');
      expect(res2.status).toBe(401);
    });

    it('should reject Citizen accessing admin endpoints with 403 Forbidden', async () => {
      const citizen = request.agent(app);
      await citizen.post('/api/auth/login').send({
        email: 'citizen1@civictrack.demo',
        password: 'Citizen@CivicTrack2024',
      });

      const resUsers = await citizen.get('/api/admin/users');
      expect(resUsers.status).toBe(403);
      expect(resUsers.body.error).toBe('Insufficient permissions');

      const resCreateDept = await citizen.post('/api/admin/departments').send({ name: 'Unauthorized Dept' });
      expect(resCreateDept.status).toBe(403);
      expect(resCreateDept.body.error).toBe('Insufficient permissions');

      const resAudit = await citizen.get('/api/admin/audit-logs');
      expect(resAudit.status).toBe(403);
      expect(resAudit.body.error).toBe('Insufficient permissions');
    });

    it('should reject Field Officer accessing admin endpoints with 403 Forbidden', async () => {
      const officer = request.agent(app);
      await officer.post('/api/auth/login').send({
        email: 'officer.roads@civictrack.demo',
        password: 'Officer@CivicTrack2024',
      });

      const resUsers = await officer.get('/api/admin/users');
      expect(resUsers.status).toBe(403);
      expect(resUsers.body.error).toBe('Insufficient permissions');
    });

    it('should allow System Admin to access admin endpoints (200)', async () => {
      const admin = request.agent(app);
      await admin.post('/api/auth/login').send({
        email: 'admin@civictrack.demo',
        password: 'Admin@CivicTrack2024',
      });

      const resUsers = await admin.get('/api/admin/users');
      expect(resUsers.status).toBe(200);
      expect(resUsers.body.success).toBe(true);
      expect(Array.isArray(resUsers.body.data.items)).toBe(true);

      const resDepts = await admin.get('/api/admin/departments');
      expect(resDepts.status).toBe(200);
      expect(resDepts.body.success).toBe(true);
    });
  });

  describe('3. Session Termination (Logout)', () => {
    it('should clear session upon logout and revoke access to protected endpoints', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/login').send({
        email: 'admin@civictrack.demo',
        password: 'Admin@CivicTrack2024',
      });

      const meBefore = await agent.get('/api/auth/me');
      expect(meBefore.status).toBe(200);

      const logoutRes = await agent.post('/api/auth/logout');
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      const meAfter = await agent.get('/api/auth/me');
      expect(meAfter.status).toBe(401);
    });
  });
});
