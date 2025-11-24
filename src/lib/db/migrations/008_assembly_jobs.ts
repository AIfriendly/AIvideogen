/**
 * Migration 008: Assembly Jobs Schema - Story 5.1
 *
 * Creates the assembly_jobs table for tracking video assembly operations
 * and adds video output columns to the projects table.
 */

import db from '../client';

export function migrate008AssemblyJobs(): void {
  console.log('[Migration 008] Creating assembly_jobs table...');

  // Create assembly_jobs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS assembly_jobs (
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for efficient querying
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_assembly_jobs_project ON assembly_jobs(project_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_assembly_jobs_status ON assembly_jobs(status);
  `);

  console.log('[Migration 008] Adding video output columns to projects table...');

  // Add video output columns to projects table
  // Using try-catch for each column as SQLite doesn't support IF NOT EXISTS for ALTER TABLE
  const columns = [
    { name: 'video_path', type: 'TEXT' },
    { name: 'thumbnail_path', type: 'TEXT' },
    { name: 'video_total_duration', type: 'REAL' },
    { name: 'video_file_size', type: 'INTEGER' },
  ];

  for (const column of columns) {
    try {
      db.exec(`ALTER TABLE projects ADD COLUMN ${column.name} ${column.type}`);
      console.log(`[Migration 008] Added column ${column.name}`);
    } catch (error) {
      // Column likely already exists, which is fine
      if (error instanceof Error && error.message.includes('duplicate column name')) {
        console.log(`[Migration 008] Column ${column.name} already exists`);
      } else {
        throw error;
      }
    }
  }

  console.log('[Migration 008] Assembly jobs migration complete');
}

// Export SQL for reference
export const ASSEMBLY_JOBS_SCHEMA = `
-- Assembly Jobs table
CREATE TABLE IF NOT EXISTS assembly_jobs (
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assembly_jobs_project ON assembly_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_assembly_jobs_status ON assembly_jobs(status);

-- Project columns for video output
ALTER TABLE projects ADD COLUMN video_path TEXT;
ALTER TABLE projects ADD COLUMN thumbnail_path TEXT;
ALTER TABLE projects ADD COLUMN video_total_duration REAL;
ALTER TABLE projects ADD COLUMN video_file_size INTEGER;
`;
