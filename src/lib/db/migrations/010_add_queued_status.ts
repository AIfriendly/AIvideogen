/**
 * Migration 010: Add 'queued' to download_status CHECK constraint
 *
 * Story 3.7b - CV Pipeline Integration
 *
 * The download queue uses 'queued' status to track jobs waiting to be processed,
 * but the CHECK constraint only allowed: 'pending', 'downloading', 'complete', 'error'.
 *
 * This migration recreates the visual_suggestions table with the updated CHECK constraint
 * to include 'queued' as a valid download_status value.
 *
 * Valid download_status values after migration:
 * - 'pending'     - Initial state, not yet queued
 * - 'queued'      - Added to download queue, waiting for processing
 * - 'downloading' - Currently being downloaded
 * - 'complete'    - Download finished successfully
 * - 'error'       - Download failed
 */

import type { Database } from 'better-sqlite3';

/**
 * Apply migration: Add 'queued' to download_status CHECK constraint
 */
export function up(db: Database): void {
  console.log('Running migration 010: Add queued status to download_status CHECK');

  // SQLite doesn't support ALTER TABLE to modify CHECK constraints.
  // We need to recreate the table with the new constraint.
  const transaction = db.transaction(() => {
    // 1. Create new table with updated CHECK constraint
    db.exec(`
      CREATE TABLE IF NOT EXISTS visual_suggestions_new (
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
        download_status TEXT DEFAULT 'pending' CHECK(download_status IN ('pending', 'queued', 'downloading', 'complete', 'error')),
        created_at TEXT DEFAULT (datetime('now')),
        cv_score REAL,
        FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
        UNIQUE(scene_id, video_id)
      )
    `);
    console.log('  - Created visual_suggestions_new table with updated CHECK constraint');

    // 2. Copy data from old table to new table
    db.exec(`
      INSERT INTO visual_suggestions_new (
        id, scene_id, video_id, title, thumbnail_url, channel_title,
        embed_url, rank, duration, default_segment_path, download_status,
        created_at, cv_score
      )
      SELECT
        id, scene_id, video_id, title, thumbnail_url, channel_title,
        embed_url, rank, duration, default_segment_path, download_status,
        created_at, cv_score
      FROM visual_suggestions
    `);
    console.log('  - Copied data to new table');

    // 3. Drop old table
    db.exec('DROP TABLE visual_suggestions');
    console.log('  - Dropped old visual_suggestions table');

    // 4. Rename new table to original name
    db.exec('ALTER TABLE visual_suggestions_new RENAME TO visual_suggestions');
    console.log('  - Renamed new table to visual_suggestions');

    // 5. Recreate indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_visual_suggestions_scene ON visual_suggestions(scene_id)');
    console.log('  - Recreated index idx_visual_suggestions_scene');
  });

  // Execute transaction
  transaction();

  console.log('Migration 010 completed successfully');
}

/**
 * Rollback migration: Remove 'queued' from download_status CHECK constraint
 */
export function down(db: Database): void {
  console.log('Rolling back migration 010: Remove queued status from download_status CHECK');

  const transaction = db.transaction(() => {
    // 1. Update any 'queued' statuses to 'pending' before constraint change
    db.exec(`UPDATE visual_suggestions SET download_status = 'pending' WHERE download_status = 'queued'`);
    console.log('  - Updated queued statuses to pending');

    // 2. Create new table with original CHECK constraint
    db.exec(`
      CREATE TABLE IF NOT EXISTS visual_suggestions_new (
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
        cv_score REAL,
        FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
        UNIQUE(scene_id, video_id)
      )
    `);

    // 3. Copy data from old table to new table
    db.exec(`
      INSERT INTO visual_suggestions_new (
        id, scene_id, video_id, title, thumbnail_url, channel_title,
        embed_url, rank, duration, default_segment_path, download_status,
        created_at, cv_score
      )
      SELECT
        id, scene_id, video_id, title, thumbnail_url, channel_title,
        embed_url, rank, duration, default_segment_path, download_status,
        created_at, cv_score
      FROM visual_suggestions
    `);

    // 4. Drop old table
    db.exec('DROP TABLE visual_suggestions');

    // 5. Rename new table to original name
    db.exec('ALTER TABLE visual_suggestions_new RENAME TO visual_suggestions');

    // 6. Recreate indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_visual_suggestions_scene ON visual_suggestions(scene_id)');
  });

  // Execute transaction
  transaction();

  console.log('Migration 010 rollback completed successfully');
}
