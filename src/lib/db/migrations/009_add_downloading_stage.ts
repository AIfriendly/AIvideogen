/**
 * Migration 009: Add 'downloading' stage to assembly_jobs
 *
 * Updates the CHECK constraint on current_stage column to include 'downloading'
 * stage for YouTube video downloads before trimming.
 */

import { Database } from 'better-sqlite3';

/**
 * Apply migration
 */
export function up(db: Database): void {
  console.log('Running migration 009: Add downloading stage to assembly_jobs');

  // SQLite doesn't support ALTER TABLE to modify constraints directly
  // We need to recreate the table with the new constraint

  // 1. Create temporary table with new constraint
  db.exec(`
    CREATE TABLE assembly_jobs_new (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'complete', 'error')),
      progress INTEGER DEFAULT 0,
      current_stage TEXT CHECK(current_stage IN ('initializing', 'downloading', 'trimming', 'concatenating', 'audio_overlay', 'thumbnail', 'finalizing')),
      current_scene INTEGER,
      total_scenes INTEGER NOT NULL,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // 2. Copy data from old table
  db.exec(`
    INSERT INTO assembly_jobs_new
    SELECT * FROM assembly_jobs
  `);

  // 3. Drop old table
  db.exec(`DROP TABLE assembly_jobs`);

  // 4. Rename new table
  db.exec(`ALTER TABLE assembly_jobs_new RENAME TO assembly_jobs`);

  console.log('Migration 009 completed: downloading stage added');
}

/**
 * Rollback migration
 */
export function down(db: Database): void {
  console.log('Rolling back migration 009');

  // Recreate table with original constraint
  db.exec(`
    CREATE TABLE assembly_jobs_new (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'complete', 'error')),
      progress INTEGER DEFAULT 0,
      current_stage TEXT CHECK(current_stage IN ('initializing', 'trimming', 'concatenating', 'audio_overlay', 'thumbnail', 'finalizing')),
      current_scene INTEGER,
      total_scenes INTEGER NOT NULL,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Copy data, excluding any with 'downloading' stage
  db.exec(`
    INSERT INTO assembly_jobs_new
    SELECT * FROM assembly_jobs
    WHERE current_stage IS NULL OR current_stage != 'downloading'
  `);

  db.exec(`DROP TABLE assembly_jobs`);
  db.exec(`ALTER TABLE assembly_jobs_new RENAME TO assembly_jobs`);

  console.log('Migration 009 rolled back');
}