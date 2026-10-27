import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { initDb, getDb, closeDb } from './connection';
import { SCHEMA_SQL } from './schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seed() {
  console.log('🌱 Seeding CivicTrack database...');
  await initDb();
  const db = getDb();
  
  try {
    // Ensure schema exists
    db.exec(SCHEMA_SQL);
    
    const adminPass = process.env.SEED_ADMIN_PASSWORD || 'Admin@CivicTrack2024';
    const officerPass = process.env.SEED_OFFICER_PASSWORD || 'Officer@CivicTrack2024';
    const managerPass = process.env.SEED_MANAGER_PASSWORD || 'Manager@CivicTrack2024';
    const citizenPass = process.env.SEED_CITIZEN_PASSWORD || 'Citizen@CivicTrack2024';
    
    const adminHash = bcrypt.hashSync(adminPass, 12);
    const officerHash = bcrypt.hashSync(officerPass, 12);
    const managerHash = bcrypt.hashSync(managerPass, 12);
    const citizenHash = bcrypt.hashSync(citizenPass, 12);
    
    const tx = db.transaction(() => {
      // ─── Departments ───
      const deptInsert = db.prepare(`
        INSERT OR IGNORE INTO departments (name, description)
        VALUES (?, ?)
      `);
      
      deptInsert.run('Roads & Infrastructure', 'Handles road maintenance, potholes, and infrastructure projects');
      deptInsert.run('Water & Sanitation', 'Manages water supply, drainage, and sanitation services');
      deptInsert.run('Electrical Services', 'Handles streetlights, power supply, and electrical infrastructure');
      deptInsert.run('Public Works', 'General public infrastructure and community services');
      deptInsert.run('Waste Management', 'Waste collection, disposal, and recycling services');
      
      // ─── Users ───
      const userInsert = db.prepare(`
        INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, phone, role, department_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Admin
      userInsert.run('admin@civictrack.demo', adminHash, 'Rajesh', 'Kumar', '+91-9876543210', 'admin', null);
      
      // Managers
      userInsert.run('roads.manager@civictrack.demo', managerHash, 'Priya', 'Sharma', '+91-9876543211', 'manager', 1);
      userInsert.run('water.manager@civictrack.demo', managerHash, 'Suresh', 'Patel', '+91-9876543212', 'manager', 2);
      
      // Officers
      userInsert.run('officer.roads@civictrack.demo', officerHash, 'Amit', 'Singh', '+91-9876543213', 'officer', 1);
      userInsert.run('officer.water@civictrack.demo', officerHash, 'Neha', 'Reddy', '+91-9876543214', 'officer', 2);
      userInsert.run('officer.electrical@civictrack.demo', officerHash, 'Vikram', 'Desai', '+91-9876543215', 'officer', 3);
      userInsert.run('officer.public@civictrack.demo', officerHash, 'Kavita', 'Nair', '+91-9876543216', 'officer', 4);
      
      // Citizens
      userInsert.run('citizen1@civictrack.demo', citizenHash, 'Ananya', 'Mehta', '+91-9876543217', 'citizen', null);
      userInsert.run('citizen2@civictrack.demo', citizenHash, 'Rohan', 'Gupta', '+91-9876543218', 'citizen', null);
      userInsert.run('citizen3@civictrack.demo', citizenHash, 'Deepika', 'Joshi', '+91-9876543219', 'citizen', null);
      
      // Set department heads
      db.prepare('UPDATE departments SET head_user_id = 2 WHERE id = 1').run();
      db.prepare('UPDATE departments SET head_user_id = 3 WHERE id = 2').run();
      
      // ─── Demo Complaints ───
      const now = new Date();
      const daysAgo = (d: number) => {
        const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
        return date.toISOString().replace('T', ' ').split('.')[0];
      };
      const hoursFromNow = (h: number) => {
        const date = new Date(now.getTime() + h * 60 * 60 * 1000);
        return date.toISOString().replace('T', ' ').split('.')[0];
      };
      
      const complaintInsert = db.prepare(`
        INSERT OR IGNORE INTO complaints 
        (grievance_id, title, description, category, priority, status, citizen_id,
         department_id, assigned_officer_id, location, city, incident_date,
         target_resolution_date, resolved_at, resolution_notes, is_overdue, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // 1. Damaged road — In Progress
      complaintInsert.run(
        'CT-' + nanoid(10).toUpperCase(),
        'Large pothole on MG Road causing accidents',
        'There is a dangerous pothole approximately 2 feet wide on MG Road near the central market junction. Multiple vehicles have been damaged and two-wheelers are at serious risk. This needs immediate attention as the monsoon season is making it worse.',
        'roads_potholes', 'high', 'in_progress', 8,
        1, 4, 'MG Road, Near Central Market Junction', 'Bangalore',
        daysAgo(5), hoursFromNow(24), null, null, 0, daysAgo(5), daysAgo(1)
      );
      
      // 2. Streetlight outage — Assigned
      complaintInsert.run(
        'CT-' + nanoid(10).toUpperCase(),
        'Multiple streetlights not working on 5th Cross',
        'At least 6 streetlights on 5th Cross Road in Jayanagar have been non-functional for over a week. The area is very dark at night and residents feel unsafe, especially women and elderly people returning from work.',
        'streetlights', 'medium', 'assigned', 9,
        3, 6, '5th Cross Road, Jayanagar', 'Bangalore',
        daysAgo(8), hoursFromNow(48), null, null, 0, daysAgo(3), daysAgo(1)
      );
      
      // 3. Water supply issue — Overdue
      complaintInsert.run(
        'CT-' + nanoid(10).toUpperCase(),
        'No water supply for 3 days in Koramangala',
        'Our entire block in Koramangala 4th Block has had no water supply for the past 3 days. We have been forced to buy water from tankers at exorbitant rates. Multiple families including elderly residents are severely affected.',
        'water_supply', 'critical', 'in_progress', 8,
        2, 5, 'Koramangala 4th Block', 'Bangalore',
        daysAgo(10), daysAgo(2), null, null, 1, daysAgo(7), daysAgo(1)
      );
      
      // 4. Waste collection — Resolved
      complaintInsert.run(
        'CT-' + nanoid(10).toUpperCase(),
        'Waste not collected for a week in HSR Layout',
        'Garbage has not been collected from our street in HSR Layout Sector 2 for over a week. The waste bins are overflowing and the stench is unbearable. Stray animals are scattering garbage everywhere.',
        'sanitation_waste', 'medium', 'resolved', 10,
        5, 7, 'HSR Layout Sector 2', 'Bangalore',
        daysAgo(14), daysAgo(5), daysAgo(2),
        'Waste collection service has been restored. Additional collection rounds scheduled for the area. Apologies for the inconvenience caused by the delay.',
        0, daysAgo(10), daysAgo(2)
      );
      
      // 5. Drainage — Awaiting Information
      complaintInsert.run(
        'CT-' + nanoid(10).toUpperCase(),
        'Blocked drain causing waterlogging on Church Street',
        'The main drain on Church Street near Brigade Road gets blocked every time it rains, causing severe waterlogging. Water enters nearby shops and homes. This is a recurring problem that has not been permanently fixed.',
        'drainage', 'high', 'awaiting_information', 9,
        2, 5, 'Church Street, Near Brigade Road', 'Bangalore',
        daysAgo(4), hoursFromNow(12), null, null, 0, daysAgo(4), daysAgo(1)
      );
      
      // 6. Recently submitted — Submitted
      complaintInsert.run(
        'CT-' + nanoid(10).toUpperCase(),
        'Broken park bench and damaged playground equipment',
        'The children\'s playground in Cubbon Park has several broken benches and damaged swing sets. The slide has a crack in it which could be dangerous for small children. The area needs maintenance urgently.',
        'public_infrastructure', 'low', 'submitted', 10,
        null, null, 'Cubbon Park, Central Area', 'Bangalore',
        daysAgo(1), null, null, null, 0, daysAgo(0), daysAgo(0)
      );
      
      // ─── Status History ───
      const historyInsert = db.prepare(`
        INSERT INTO status_history (complaint_id, previous_status, new_status, changed_by_user_id, reason, is_public, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Complaint 1: submitted → acknowledged → assigned → in_progress
      historyInsert.run(1, null, 'submitted', 8, 'Complaint registered by citizen', 1, daysAgo(5));
      historyInsert.run(1, 'submitted', 'acknowledged', 1, 'Complaint acknowledged by administration', 1, daysAgo(4));
      historyInsert.run(1, 'acknowledged', 'assigned', 2, 'Assigned to Roads department', 1, daysAgo(3));
      historyInsert.run(1, 'assigned', 'in_progress', 4, 'Repair work has been initiated', 1, daysAgo(1));
      
      // Complaint 2: submitted → acknowledged → assigned
      historyInsert.run(2, null, 'submitted', 9, 'Complaint registered by citizen', 1, daysAgo(3));
      historyInsert.run(2, 'submitted', 'acknowledged', 1, 'Complaint acknowledged', 1, daysAgo(2));
      historyInsert.run(2, 'acknowledged', 'assigned', 1, 'Assigned to Electrical Services', 1, daysAgo(1));
      
      // Complaint 3: submitted → acknowledged → assigned → in_progress (overdue)
      historyInsert.run(3, null, 'submitted', 8, 'Complaint registered by citizen', 1, daysAgo(7));
      historyInsert.run(3, 'submitted', 'acknowledged', 3, 'Urgent complaint acknowledged', 1, daysAgo(6));
      historyInsert.run(3, 'acknowledged', 'assigned', 3, 'Assigned to Water department', 1, daysAgo(5));
      historyInsert.run(3, 'assigned', 'in_progress', 5, 'Investigation started', 1, daysAgo(4));
      
      // Complaint 4: full lifecycle
      historyInsert.run(4, null, 'submitted', 10, 'Complaint registered by citizen', 1, daysAgo(10));
      historyInsert.run(4, 'submitted', 'acknowledged', 1, 'Complaint acknowledged', 1, daysAgo(9));
      historyInsert.run(4, 'acknowledged', 'assigned', 1, 'Assigned to Waste Management', 1, daysAgo(8));
      historyInsert.run(4, 'assigned', 'in_progress', 7, 'Cleanup team dispatched', 1, daysAgo(6));
      historyInsert.run(4, 'in_progress', 'resolved', 7, 'Waste collection service restored', 1, daysAgo(2));
      
      // Complaint 5: submitted → acknowledged → assigned → in_progress → awaiting_information
      historyInsert.run(5, null, 'submitted', 9, 'Complaint registered by citizen', 1, daysAgo(4));
      historyInsert.run(5, 'submitted', 'acknowledged', 3, 'Complaint acknowledged', 1, daysAgo(3));
      historyInsert.run(5, 'acknowledged', 'assigned', 3, 'Assigned to Water & Sanitation', 1, daysAgo(3));
      historyInsert.run(5, 'assigned', 'in_progress', 5, 'Site inspection initiated', 1, daysAgo(2));
      historyInsert.run(5, 'in_progress', 'awaiting_information', 5, 'Need exact location photos of the blocked drain', 1, daysAgo(1));
      
      // Complaint 6: just submitted
      historyInsert.run(6, null, 'submitted', 10, 'Complaint registered by citizen', 1, daysAgo(0));
      
      // ─── Public Updates ───
      const updateInsert = db.prepare(`
        INSERT INTO public_updates (complaint_id, user_id, message, created_at)
        VALUES (?, ?, ?, ?)
      `);
      
      updateInsert.run(1, 4, 'Road repair team has been dispatched. Temporary barricades placed for safety.', daysAgo(1));
      updateInsert.run(3, 5, 'Our team is working on restoring the main water pipeline. Temporary tanker service arranged.', daysAgo(3));
      updateInsert.run(4, 7, 'Waste collection has been completed. Regular service schedule has been restored.', daysAgo(2));
      updateInsert.run(5, 5, 'We need photographs of the exact drain blockage location to proceed with repairs.', daysAgo(1));
      
      // ─── Internal Notes ───
      const noteInsert = db.prepare(`
        INSERT INTO internal_notes (complaint_id, user_id, note, created_at)
        VALUES (?, ?, ?, ?)
      `);
      
      noteInsert.run(1, 4, 'Pothole is larger than reported. Will need full road resurfacing in this section.', daysAgo(2));
      noteInsert.run(3, 5, 'Main pipeline has corroded. Need budget approval for replacement.', daysAgo(3));
      noteInsert.run(3, 3, 'Escalated to head office. Budget approved for emergency repair.', daysAgo(2));
      
      // ─── Escalation Events ───
      const escalationInsert = db.prepare(`
        INSERT INTO escalation_events (complaint_id, escalation_level, escalated_to_user_id, reason, threshold_hours, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      escalationInsert.run(3, 1, 3, 'Complaint exceeded SLA target resolution time', 12, daysAgo(2));
      
      // ─── Notifications ───
      const notifInsert = db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, related_complaint_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      notifInsert.run(8, 'Complaint Update', 'Your complaint about pothole on MG Road is now in progress', 'info', 1, 0, daysAgo(1));
      notifInsert.run(8, 'Water Supply Update', 'Temporary tanker service arranged for your area', 'info', 3, 0, daysAgo(3));
      notifInsert.run(5, 'SLA Warning', 'Complaint CT-XXXX has exceeded target resolution time', 'warning', 3, 0, daysAgo(2));
    });
    
    tx();
    console.log('✅ Demo data seeded successfully.');
    console.log('');
    console.log('📋 Demo Accounts:');
    console.log('  Admin:    admin@civictrack.demo / ' + adminPass);
    console.log('  Manager:  roads.manager@civictrack.demo / ' + managerPass);
    console.log('  Officer:  officer.roads@civictrack.demo / ' + officerPass);
    console.log('  Citizen:  citizen1@civictrack.demo / ' + citizenPass);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    closeDb();
  }
}

seed();
