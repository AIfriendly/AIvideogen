/**
 * Migration 003: Visual Suggestions Schema
 *
 * Epic 3 - Visual Content Sourcing (YouTube API)
 *
 * This migration extends the database schema to support:
 * - Visual suggestions generation tracking in projects table
 * - YouTube video suggestions storage (visual_suggestions table)
 * - Scene-to-video mapping with ranking
 *
 * Changes:
 * 1. Add visuals_generated to projects table
 * 2. Create visual_suggestions table with foreign key to scenes
 * 3. Create index on scene_id for performance
 */

import type { Database } from 'better-sqlite3';

/**
 * Apply migration: Add Epic 3 schema changes
 */
export function up(db: Database): void {
  console.log('Running migration 003: Visual Suggestions Schema');

  // Start transaction for atomicity
  const transaction = db.transaction(() => {
    // Check if column already exists to ensure idempotency
    const tableInfo = db.pragma('table_info(projects)') as Array<{ name: string }>;
    const existingColumns = new Set(tableInfo.map((col) => col.name));

    // 1. Add visuals_generated column to projects table
    if (!existingColumns.has('visuals_generated')) {
      db.exec('ALTER TABLE projects ADD COLUMN visuals_generated BOOLEAN DEFAULT 0');
      console.log('  - Added visuals_generated column to projects');
    }

    // 2. Create visual_suggestions table (IF NOT EXISTS for idempotency)
    db.exec(`
      CREATE TABLE IF NOT EXISTS visual_suggestions (
        id TEXT PRIMARY KEY,
        scene_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        thumbnail_url TEXT,
        channel_title TEXT,
        embed_url TEXT NOT NULL,
        rank INTEGER NOT NULL,
        duration INTEGER,
        default_segment_path TEXT,
        download_status TEXT DEFAULT 'pending' CHECK(download_status IN ('pending', 'downloading', 'complete', 'error')),
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
        UNIQUE(scene_id, video_id)
      )
    `);
    console.log('  - Created visual_suggestions table with CHECK constraint and UNIQUE constraint');

    // 3. Create index on scene_id
    db.exec('CREATE INDEX IF NOT EXISTS idx_visual_suggestions_scene ON visual_suggestions(scene_id)');
    console.log('  - Created index idx_visual_suggestions_scene');
  });

  // Execute transaction
  transaction();

  console.log('Migration 003 completed successfully');
}

/**
 * Rollback migration: Remove Epic 3 schema changes
 */
export function down(db: Database): void {
  console.log('Rolling back migration 003: Visual Suggestions Schema');

  // Start transaction for atomicity
  const transaction = db.transaction(() => {
    // 1. Drop index on visual_suggestions
    db.exec('DROP INDEX IF EXISTS idx_visual_suggestions_scene');
    console.log('  - Dropped index idx_visual_suggestions_scene');

    // 2. Drop visual_suggestions table
    db.exec('DROP TABLE IF EXISTS visual_suggestions');
    console.log('  - Dropped visual_suggestions table');

    // 3. Drop visuals_generated column from projects table (SQLite 3.35.0+ required)
    try {
      db.exec('ALTER TABLE projects DROP COLUMN visuals_generated');
      console.log('  - Dropped visuals_generated column from projects');
    } catch (error) {
      console.warn('  - DROP COLUMN not supported in this SQLite version');
      console.warn('  - Manual intervention required to remove visuals_generated column');
      throw new Error(
        'SQLite version does not support DROP COLUMN. Upgrade to SQLite 3.35.0+ or use table recreation strategy.'
      );
    }
  });

  // Execute transaction
  transaction();

  console.log('Migration 003 rollback completed successfully');
}
