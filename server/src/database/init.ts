import { initDb, getDb, closeDb } from './connection';
import { SCHEMA_SQL } from './schema';

async function init() {
  console.log('🔧 Initializing CivicTrack database...');
  await initDb();
  const db = getDb();
  
  try {
    db.exec(SCHEMA_SQL);
    console.log('✅ Database schema created successfully.');
    
    // Insert default SLA policies if none exist
    const count = db.prepare('SELECT COUNT(*) as count FROM sla_policies').get() as { count: number };
    if (count.count === 0) {
      const insertSLA = db.prepare(`
        INSERT INTO sla_policies (category, priority, target_hours, escalation_hours)
        VALUES (?, ?, ?, ?)
      `);
      
      const policies = [
        // Low priority
        ['roads_potholes', 'low', 168, 120],
        ['water_supply', 'low', 120, 96],
        ['sanitation_waste', 'low', 120, 96],
        ['streetlights', 'low', 168, 120],
        ['drainage', 'low', 168, 120],
        ['public_infrastructure', 'low', 168, 120],
        ['other', 'low', 168, 120],
        // Medium priority
        ['roads_potholes', 'medium', 72, 48],
        ['water_supply', 'medium', 48, 36],
        ['sanitation_waste', 'medium', 48, 36],
        ['streetlights', 'medium', 72, 48],
        ['drainage', 'medium', 72, 48],
        ['public_infrastructure', 'medium', 72, 48],
        ['other', 'medium', 72, 48],
        // High priority
        ['roads_potholes', 'high', 48, 24],
        ['water_supply', 'high', 24, 12],
        ['sanitation_waste', 'high', 24, 12],
        ['streetlights', 'high', 48, 24],
        ['drainage', 'high', 48, 24],
        ['public_infrastructure', 'high', 48, 24],
        ['other', 'high', 48, 24],
        // Critical priority
        ['roads_potholes', 'critical', 24, 8],
        ['water_supply', 'critical', 12, 4],
        ['sanitation_waste', 'critical', 12, 4],
        ['streetlights', 'critical', 24, 8],
        ['drainage', 'critical', 24, 8],
        ['public_infrastructure', 'critical', 24, 8],
        ['other', 'critical', 24, 8],
      ];
      
      const tx = db.transaction(() => {
        for (const p of policies) {
          insertSLA.run(...p);
        }
      });
      tx();
      console.log('✅ Default SLA policies created.');
    }
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  } finally {
    closeDb();
  }
}

init();
