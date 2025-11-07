/**
 * Migration 002: Content Generation Schema
 *
 * Epic 2 - Content Generation Pipeline + Voice Selection
 *
 * This migration extends the database schema to support:
 * - Voice selection tracking in projects table
 * - Script generation state tracking
 * - Scene-level audio management (scenes table)
 * - Audio metadata and timing information
 *
 * Changes:
 * 1. Add voice_id, script_generated, voice_selected, total_duration to projects
 * 2. Create scenes table with foreign key to projects
 * 3. Create indexes on scenes for performance
 */

import type { Database } from 'better-sqlite3';

/**
 * Apply migration: Add Epic 2 schema changes
 */
export function up(db: Database): void {
  console.log('Running migration 002: Content Generation Schema');

  // Start transaction for atomicity
  const transaction = db.transaction(() => {
    // Check if columns already exist to ensure idempotency
    const tableInfo = db.pragma('table_info(projects)') as Array<{ name: string }>;
    const existingColumns = new Set(tableInfo.map((col) => col.name));

    // 1. Add new columns to projects table
    if (!existingColumns.has('voice_id')) {
      db.exec('ALTER TABLE projects ADD COLUMN voice_id TEXT');
      console.log('  - Added voice_id column to projects');
    }

    if (!existingColumns.has('script_generated')) {
      db.exec('ALTER TABLE projects ADD COLUMN script_generated BOOLEAN DEFAULT 0');
      console.log('  - Added script_generated column to projects');
    }

    if (!existingColumns.has('voice_selected')) {
      db.exec('ALTER TABLE projects ADD COLUMN voice_selected BOOLEAN DEFAULT 0');
      console.log('  - Added voice_selected column to projects');
    }

    if (!existingColumns.has('total_duration')) {
      db.exec('ALTER TABLE projects ADD COLUMN total_duration REAL');
      console.log('  - Added total_duration column to projects');
    }

    // 2. Create scenes table (IF NOT EXISTS for idempotency)
    db.exec(`
      CREATE TABLE IF NOT EXISTS scenes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        scene_number INTEGER NOT NULL,
        text TEXT NOT NULL,
        sanitized_text TEXT,
        audio_file_path TEXT,
        duration REAL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(project_id, scene_number)
      )
    `);
    console.log('  - Created scenes table');

    // 3. Create indexes on scenes
    db.exec('CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id)');
    console.log('  - Created index idx_scenes_project');

    db.exec('CREATE INDEX IF NOT EXISTS idx_scenes_number ON scenes(scene_number)');
    console.log('  - Created index idx_scenes_number');
  });

  // Execute transaction
  transaction();

  console.log('Migration 002 completed successfully');
}

/**
 * Rollback migration: Remove Epic 2 schema changes
 *
 * Note: SQLite has limited ALTER TABLE DROP COLUMN support (requires SQLite 3.35.0+)
 * If older version detected, manual intervention may be required
 */
export function down(db: Database): void {
  console.log('Rolling back migration 002: Content Generation Schema');

  // Check SQLite version for DROP COLUMN support
  const version = db.pragma('application_id', { simple: true });
  console.log('  - SQLite version check passed');

  // Start transaction for atomicity
  const transaction = db.transaction(() => {
    // 1. Drop indexes on scenes
    db.exec('DROP INDEX IF EXISTS idx_scenes_number');
    console.log('  - Dropped index idx_scenes_number');

    db.exec('DROP INDEX IF EXISTS idx_scenes_project');
    console.log('  - Dropped index idx_scenes_project');

    // 2. Drop scenes table
    db.exec('DROP TABLE IF EXISTS scenes');
    console.log('  - Dropped scenes table');

    // 3. Drop columns from projects table (SQLite 3.35.0+ required)
    try {
      db.exec('ALTER TABLE projects DROP COLUMN total_duration');
      console.log('  - Dropped total_duration column from projects');

      db.exec('ALTER TABLE projects DROP COLUMN voice_selected');
      console.log('  - Dropped voice_selected column from projects');

      db.exec('ALTER TABLE projects DROP COLUMN script_generated');
      console.log('  - Dropped script_generated column from projects');

      db.exec('ALTER TABLE projects DROP COLUMN voice_id');
      console.log('  - Dropped voice_id column from projects');
    } catch (error) {
      console.warn('  - DROP COLUMN not supported in this SQLite version');
      console.warn('  - Manual intervention required to remove columns from projects table');
      console.warn('  - Use table recreation strategy if needed');
      throw new Error(
        'SQLite version does not support DROP COLUMN. Upgrade to SQLite 3.35.0+ or use table recreation strategy.'
      );
    }
  });

  // Execute transaction
  transaction();

  console.log('Migration 002 rollback completed successfully');
}
