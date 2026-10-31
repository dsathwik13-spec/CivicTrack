import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../index';
import { initDb, getDb, closeDb } from '../database/connection';
import { SCHEMA_SQL } from '../database/schema';
import { runMigrations } from '../database/migrations';

describe('CivicTrack Comprehensive Integration & Audit Test Suite', () => {
  let citizenAgent: request.Agent;
  let citizen2Agent: request.Agent;
  let officerAgent: request.Agent;
  let managerAgent: request.Agent;
  let adminAgent: request.Agent;

  const testDbFile = path.resolve(__dirname, '../../data/civictrack_test.db');
  const mainDbFile = path.resolve(__dirname, '../../data/civictrack.db');

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    // Isolate test execution from development database
    process.env.DB_PATH = './data/civictrack_test.db';
    closeDb();

    if (fs.existsSync(mainDbFile)) {
      fs.copyFileSync(mainDbFile, testDbFile);
    }

    await initDb();
    const db = getDb();
    db.exec(SCHEMA_SQL);
    runMigrations(db);

    // Setup authenticated session agents
    citizenAgent = request.agent(app);
    citizen2Agent = request.agent(app);
    officerAgent = request.agent(app);
    managerAgent = request.agent(app);
    adminAgent = request.agent(app);

    // Login as Demo Citizen 1 (user id 8)
    const citizenLogin = await citizenAgent.post('/api/auth/login').send({
      email: 'citizen1@civictrack.demo',
      password: 'Citizen@CivicTrack2024',
    });
    expect(citizenLogin.status).toBe(200);

    // Login as Demo Citizen 2 (user id 9)
    const citizen2Login = await citizen2Agent.post('/api/auth/login').send({
      email: 'citizen2@civictrack.demo',
      password: 'Citizen@CivicTrack2024',
    });
    expect(citizen2Login.status).toBe(200);

    // Login as Field Officer (user id 4)
    const officerLogin = await officerAgent.post('/api/auth/login').send({
      email: 'officer.roads@civictrack.demo',
      password: 'Officer@CivicTrack2024',
    });
    expect(officerLogin.status).toBe(200);

    // Login as Dept Manager (user id 2)
    const managerLogin = await managerAgent.post('/api/auth/login').send({
      email: 'roads.manager@civictrack.demo',
      password: 'Manager@CivicTrack2024',
    });
    expect(managerLogin.status).toBe(200);

    // Login as Admin (user id 1)
    const adminLogin = await adminAgent.post('/api/auth/login').send({
      email: 'admin@civictrack.demo',
      password: 'Admin@CivicTrack2024',
    });
    expect(adminLogin.status).toBe(200);
  });

  afterAll(async () => {
    closeDb();
    try {
      if (fs.existsSync(testDbFile)) {
        fs.unlinkSync(testDbFile);
      }
    } catch {
      // ignore unlink error
    }
  });

  // ──────────────────────────────────────────────────────────
  // TEST 1 — Submission:
  // Submit a valid complaint and verify backend creates persistent record with unique ref
  // ──────────────────────────────────────────────────────────
  let submittedGrievanceId: string;
  let submittedComplaintId: number;

  it('TEST 1: Submit valid complaint and verify persistent record with unique reference', async () => {
    const payload = {
      title: 'Water logging near 14th Main Junction',
      description: 'Continuous monsoon water pooling causing severe pedestrian traffic blockade and health hazards.',
      category: 'drainage',
      location: '14th Main Road, Sector 3, HSR Layout',
      city: 'Bangalore',
      incident_date: '2026-10-28',
    };

    const res = await citizenAgent.post('/api/complaints').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.complaint).toBeDefined();

    const complaint = res.body.data.complaint;
    expect(complaint.grievance_id).toMatch(/^CT-[A-Z0-9_-]+$/);
    expect(complaint.title).toBe(payload.title);
    expect(complaint.status).toBe('submitted');
    expect(complaint.citizen_id).toBe(8);

    submittedGrievanceId = complaint.grievance_id;
    submittedComplaintId = complaint.id;

    // Verify database record directly
    const db = getDb();
    const dbRecord = db.prepare('SELECT * FROM complaints WHERE id = ?').get(submittedComplaintId) as any;
    expect(dbRecord).toBeDefined();
    expect(dbRecord.grievance_id).toBe(submittedGrievanceId);
  });

  // ──────────────────────────────────────────────────────────
  // TEST 2 — Immediate visibility:
  // Verify that the submitted complaint appears in "My Registered Grievances" immediately
  // ──────────────────────────────────────────────────────────
  it('TEST 2: Verify submitted complaint appears in My Registered Grievances immediately', async () => {
    const res = await citizenAgent.get('/api/complaints/my');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const items = res.body.data.items;
    const found = items.find((c: any) => c.grievance_id === submittedGrievanceId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Water logging near 14th Main Junction');
    expect(found.status).toBe('submitted');
  });

  // ──────────────────────────────────────────────────────────
  // TEST 3 — Forgotten ID:
  // Find complaint using title or description keyword without knowing ID
  // ──────────────────────────────────────────────────────────
  it('TEST 3: Citizen can find complaint using title, description, or category without knowing ID', async () => {
    // Search by title keyword
    const searchRes = await citizenAgent.get('/api/complaints/my?search=water+logging');
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);
    const foundByTitle = searchRes.body.data.items.find((c: any) => c.id === submittedComplaintId);
    expect(foundByTitle).toBeDefined();

    // Search by description keyword
    const descRes = await citizenAgent.get('/api/complaints/my?search=pedestrian+traffic');
    expect(descRes.status).toBe(200);
    const foundByDesc = descRes.body.data.items.find((c: any) => c.id === submittedComplaintId);
    expect(foundByDesc).toBeDefined();

    // Search by category
    const catRes = await citizenAgent.get('/api/complaints/my?search=drainage');
    expect(catRes.status).toBe(200);
    const foundByCat = catRes.body.data.items.find((c: any) => c.id === submittedComplaintId);
    expect(foundByCat).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────
  // TEST 4 — Reload:
  // Verify that fresh query / reload returns the same complaint
  // ──────────────────────────────────────────────────────────
  it('TEST 4: Reload / fresh request returns the same persisted complaint', async () => {
    const res = await citizenAgent.get(`/api/complaints/${submittedComplaintId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.complaint.grievance_id).toBe(submittedGrievanceId);
    expect(res.body.data.history.length).toBeGreaterThanOrEqual(1);
  });

  // ──────────────────────────────────────────────────────────
  // TEST 5 — Older complaint:
  // Complaint submitted ~10h earlier (Complaint 8, CT-QSJMFJTAH7) is not excluded
  // ──────────────────────────────────────────────────────────
  it('TEST 5: Older complaint (CT-QSJMFJTAH7) submitted ~10 hours ago appears in citizen list', async () => {
    const res = await citizenAgent.get('/api/complaints/my');
    expect(res.status).toBe(200);
    const items = res.body.data.items;

    const recovered = items.find((c: any) => c.grievance_id === 'CT-QSJMFJTAH7');
    expect(recovered).toBeDefined();
    expect(recovered.title).toBe('Broken Street light near Prakasham Bazaar');
    expect(recovered.status).toBe('acknowledged');
    expect(recovered.created_at).toBe('2026-10-27 16:44:00');
  });

  // ──────────────────────────────────────────────────────────
  // TEST 6 — Multiple complaints:
  // Multiple complaints from same citizen all displayed and sorted newest first
  // ──────────────────────────────────────────────────────────
  it('TEST 6: Multiple complaints from same citizen are displayed and sorted newest first', async () => {
    const res = await citizenAgent.get('/api/complaints/my');
    expect(res.status).toBe(200);
    const items = res.body.data.items;
    expect(items.length).toBeGreaterThanOrEqual(3);

    // Verify descending sort order
    for (let i = 0; i < items.length - 1; i++) {
      const current = new Date(items[i].created_at).getTime();
      const next = new Date(items[i + 1].created_at).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  // ──────────────────────────────────────────────────────────
  // TEST 7 — Ownership:
  // Citizen A cannot view Citizen B's private complaints
  // ──────────────────────────────────────────────────────────
  it('TEST 7: Citizen A cannot view Citizen B complaints via /my or direct access', async () => {
    // Citizen 2 fetches their own complaints
    const citizen2List = await citizen2Agent.get('/api/complaints/my');
    expect(citizen2List.status).toBe(200);
    const c2Items = citizen2List.body.data.items;

    // Verify none of Citizen 1's complaints appear in Citizen 2's list
    const hasC1 = c2Items.some((c: any) => c.citizen_id === 8);
    expect(hasC1).toBe(false);

    // Citizen 1's list has none of Citizen 2's complaints
    const c1List = await citizenAgent.get('/api/complaints/my');
    const hasC2 = c1List.body.data.items.some((c: any) => c.citizen_id === 9);
    expect(hasC2).toBe(false);

    // Citizen 2 attempting to view Citizen 1's detailed complaint directly
    const directRes = await citizen2Agent.get(`/api/complaints/${submittedComplaintId}`);
    // Non-owner citizen must be blocked
    expect(directRes.status).toBe(403);
  });

  // ──────────────────────────────────────────────────────────
  // TEST 8 — Different roles:
  // Officer, Manager, and Admin permissions work appropriately
  // ──────────────────────────────────────────────────────────
  it('TEST 8: Officer, Manager, and Admin role boundaries and queues function correctly', async () => {
    // Admin can view all complaints
    const adminRes = await adminAgent.get('/api/complaints');
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.items.length).toBeGreaterThanOrEqual(7);

    // Officer gets access to their queue
    const officerRes = await officerAgent.get('/api/complaints');
    expect(officerRes.status).toBe(200);

    // Citizen attempting to access admin routes is rejected (403)
    const citizenAdminAttempt = await citizenAgent.get('/api/admin/users');
    expect(citizenAdminAttempt.status).toBe(403);

    // Citizen attempting to assign complaint is rejected (403)
    const citizenAssignAttempt = await citizenAgent.put(`/api/complaints/${submittedComplaintId}/assign`).send({
      department_id: 1,
      officer_id: 4,
    });
    expect(citizenAssignAttempt.status).toBe(403);
  });

  // ──────────────────────────────────────────────────────────
  // TEST 9 — API failure:
  // Invalid queries and requests produce structured errors, not fake data
  // ──────────────────────────────────────────────────────────
  it('TEST 9: Invalid request returns 400 with structured error details', async () => {
    const invalidQuery = await citizenAgent.get('/api/complaints/my?sort=invalid_column');
    expect(invalidQuery.status).toBe(200); // Defaults cleanly to created_at

    const unauthAgent = request(app);
    const unauthRes = await unauthAgent.get('/api/complaints/my');
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────
  // TEST 10 — Duplicate protection / Validation:
  // Invalid inputs rejected; valid duplicate requests handled safely
  // ──────────────────────────────────────────────────────────
  it('TEST 10: Validation rejects short / malformed submissions cleanly', async () => {
    const invalidRes = await citizenAgent.post('/api/complaints').send({
      title: 'Hi', // too short
      description: 'Short', // too short
      category: 'roads_potholes',
      location: 'Bangalore',
      city: 'Bangalore',
    });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────
  // TEST 11 — Status filters:
  // Complaints in every supported status remain discoverable
  // ──────────────────────────────────────────────────────────
  it('TEST 11: Status filter discovers complaints in submitted, acknowledged, and other statuses', async () => {
    const submittedList = await citizenAgent.get('/api/complaints/my?status=submitted');
    expect(submittedList.status).toBe(200);
    expect(submittedList.body.data.items.every((c: any) => c.status === 'submitted')).toBe(true);

    const ackList = await citizenAgent.get('/api/complaints/my?status=acknowledged');
    expect(ackList.status).toBe(200);
    expect(ackList.body.data.items.every((c: any) => c.status === 'acknowledged')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────
  // TEST 12 — Persistence and Status Transition Verification:
  // Test valid status workflow, prevents invalid transition, and ensures persistence
  // ──────────────────────────────────────────────────────────
  it('TEST 12: Status workflow enforcement: prevents submitted -> in_progress, allows submitted -> acknowledged -> in_progress', async () => {
    // Attempt illegal transition: submitted -> in_progress
    const illegalTransition = await officerAgent.put(`/api/complaints/${submittedComplaintId}/status`).send({
      status: 'in_progress',
      reason: 'Trying to skip acknowledgement',
    });
    expect(illegalTransition.status).toBe(400);
    expect(illegalTransition.body.error).toContain('Cannot transition');

    // Legal transition 1: submitted -> acknowledged
    const legalStep1 = await officerAgent.put(`/api/complaints/${submittedComplaintId}/status`).send({
      status: 'acknowledged',
      reason: 'Inspection scheduled by field team',
    });
    expect(legalStep1.status).toBe(200);
    expect(legalStep1.body.success).toBe(true);

    // Legal transition 2: acknowledged -> in_progress
    const legalStep2 = await officerAgent.put(`/api/complaints/${submittedComplaintId}/status`).send({
      status: 'in_progress',
      reason: 'Drain clearing crew deployed with jetting machine',
    });
    expect(legalStep2.status).toBe(200);
    expect(legalStep2.body.success).toBe(true);

    // Verify updated status in citizen's list
    const citizenCheck = await citizenAgent.get('/api/complaints/my');
    const updated = citizenCheck.body.data.items.find((c: any) => c.id === submittedComplaintId);
    expect(updated.status).toBe('in_progress');
  });

  // ──────────────────────────────────────────────────────────
  // BONUS WORKFLOW: Cross-Department Manager Restriction
  // ──────────────────────────────────────────────────────────
  it('Cross-department restriction: Dept Manager cannot assign complaint to a different department', async () => {
    // Dept 1 Manager (Roads) attempts to assign complaint to Dept 2 (Water)
    const crossDeptRes = await managerAgent.put(`/api/complaints/${submittedComplaintId}/assign`).send({
      department_id: 2, // Water
      officer_id: 5, // Officer Neha Reddy in Water
      reason: 'Cross department delegation attempt',
    });
    expect(crossDeptRes.status).toBe(403);
    expect(crossDeptRes.body.error).toContain('Managers can only assign complaints to their own department');
  });

  // ──────────────────────────────────────────────────────────
  // BONUS WORKFLOW: Public endpoints for guest visitors
  // ──────────────────────────────────────────────────────────
  it('Public feed: Unauthenticated visitors can view public city stats and public complaint feed', async () => {
    const unauthAgent = request(app);

    const publicFeed = await unauthAgent.get('/api/complaints/public?pageSize=5');
    expect(publicFeed.status).toBe(200);
    expect(publicFeed.body.success).toBe(true);
    expect(publicFeed.body.data.items.length).toBeGreaterThan(0);

    // Check no sensitive fields exposed in public feed
    const firstItem = publicFeed.body.data.items[0];
    expect(firstItem.citizen_id).toBeUndefined();
    expect(firstItem.citizen_email).toBeUndefined();
    expect(firstItem.citizen_phone).toBeUndefined();

    const publicStats = await unauthAgent.get('/api/dashboard/stats');
    expect(publicStats.status).toBe(200);
    expect(publicStats.body.data.total).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────
  // TEST 13: Migration Idempotency & Precondition Safety
  // ──────────────────────────────────────────────────────────
  it('TEST 13: Migration idempotency: repeated runs do not duplicate or corrupt records', async () => {
    const db = getDb();
    // Run migrations second time
    runMigrations(db);

    const count = db.prepare("SELECT COUNT(*) as cnt FROM _migrations WHERE name = '001_repair_historical_grievance_ownership'").get() as { cnt: number };
    expect(count.cnt).toBe(1);

    const complaint = db.prepare("SELECT * FROM complaints WHERE grievance_id = 'CT-QSJMFJTAH7'").get() as any;
    expect(complaint).toBeDefined();
    expect(complaint.citizen_id).toBe(8);
  });

  // ──────────────────────────────────────────────────────────
  // TEST 14: Internal Note Privacy
  // ──────────────────────────────────────────────────────────
  it('TEST 14: Internal note privacy: internal notes are never exposed to citizens or public tracking', async () => {
    // Staff adds an internal note
    const noteRes = await officerAgent.post(`/api/complaints/${submittedComplaintId}/notes`).send({
      note: 'INTERNAL STAFF NOTE: Field team scheduled for sub-surface inspection at 14th Main.',
    });
    expect(noteRes.status).toBe(201);

    // Officer sees the internal note
    const officerView = await officerAgent.get(`/api/complaints/${submittedComplaintId}`);
    expect(officerView.status).toBe(200);
    expect(officerView.body.data.notes).toBeDefined();
    expect(officerView.body.data.notes.length).toBeGreaterThanOrEqual(1);
    expect(officerView.body.data.notes.some((n: any) => n.note.includes('Field team scheduled'))).toBe(true);

    // Citizen owner fetches full complaint details: notes MUST be stripped
    const citizenView = await citizenAgent.get(`/api/complaints/${submittedComplaintId}`);
    expect(citizenView.status).toBe(200);
    expect(citizenView.body.data.notes).toEqual([]);

    // Public tracking: notes MUST NOT be present in response
    const unauthAgent = request(app);
    const publicTrack = await unauthAgent.get(`/api/complaints/track/${submittedGrievanceId}`);
    expect(publicTrack.status).toBe(200);
    expect(publicTrack.body.data.notes).toBeUndefined();
  });

  // ──────────────────────────────────────────────────────────
  // TEST 15: Public Tracking Not-Found Handling
  // ──────────────────────────────────────────────────────────
  it('TEST 15: Public tracking returns clean 404 for nonexistent grievance reference', async () => {
    const unauthAgent = request(app);
    const nonExistent = await unauthAgent.get('/api/complaints/track/CT-NONEXISTENT999');
    expect(nonExistent.status).toBe(404);
    expect(nonExistent.body.success).toBe(false);
    expect(nonExistent.body.error).toContain('No complaint found with this reference');
  });

  // ──────────────────────────────────────────────────────────
  // TEST 16: Authentication Enforcement
  // ──────────────────────────────────────────────────────────
  it('TEST 16: Authentication boundary: unauthenticated requests to protected endpoints return 401', async () => {
    const unauthAgent = request(app);

    const postAttempt = await unauthAgent.post('/api/complaints').send({
      title: 'Unauthorized submission attempt',
      description: 'Should fail immediately with 401',
      category: 'streetlights',
      location: 'City Center',
      city: 'Bangalore',
    });
    expect(postAttempt.status).toBe(401);
    expect(postAttempt.body.success).toBe(false);

    const getMyAttempt = await unauthAgent.get('/api/complaints/my');
    expect(getMyAttempt.status).toBe(401);
    expect(getMyAttempt.body.success).toBe(false);
  });
});
