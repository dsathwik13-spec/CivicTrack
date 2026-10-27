import { getDb, closeDb, getDbPath } from './connection';
import { SCHEMA_SQL } from './schema';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function reset() {
  console.log('⚠️  Resetting CivicTrack database...');
  
  closeDb();
  
  const dbPath = getDbPath();
  
  // Remove existing database files
  for (const suffix of ['', '-wal', '-shm']) {
    const file = dbPath + suffix;
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`  Removed: ${file}`);
    }
  }
  
  console.log('✅ Database cleared. Run "npm run db:init" and "npm run db:seed" to recreate.');
}

reset();
