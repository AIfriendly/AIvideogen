/**
 * Migration 006: Add selected_clip_id to scenes table
 *
 * Epic 4, Story 4.4 - Clip Selection Mechanism & State Management
 *
 * Adds a column to track the user's selected visual suggestion for each scene.
 * The selected_clip_id references visual_suggestions.id but SQLite doesn't support
 * adding foreign key constraints via ALTER TABLE, so this is enforced at the
 * application level in the API endpoint.
 */

import type { Database } from 'better-sqlite3';

/**
 * Apply migration: Add selected_clip_id column to scenes table
 */
export function up(db: Database): void {
  console.log('Running migration 006: Add selected_clip_id to scenes');

  // Start transaction for atomicity
  const transaction = db.transaction(() => {
    // Check if column already exists to ensure idempotency
    const tableInfo = db.pragma('table_info(scenes)') as Array<{ name: string }>;
    const existingColumns = new Set(tableInfo.map((col) => col.name));

    // 1. Add selected_clip_id column to scenes table
    if (!existingColumns.has('selected_clip_id')) {
      db.exec('ALTER TABLE scenes ADD COLUMN selected_clip_id TEXT');
      console.log('  - Added selected_clip_id column to scenes');
    } else {
      console.log('  - selected_clip_id column already exists, skipping');
    }

    // 2. Create index on selected_clip_id for performance
    db.exec('CREATE INDEX IF NOT EXISTS idx_scenes_selected_clip ON scenes(selected_clip_id)');
    console.log('  - Created index idx_scenes_selected_clip');
  });

  // Execute transaction
  transaction();

  console.log('Migration 006 completed successfully');
}

/**
 * Rollback migration: Remove selected_clip_id column
 * Note: SQLite doesn't support DROP COLUMN directly before 3.35.0
 * This would require table recreation for older versions
 */
export function down(db: Database): void {
  console.log('Rolling back migration 006: Remove selected_clip_id from scenes');

  const transaction = db.transaction(() => {
    // Drop the index
    db.exec('DROP INDEX IF EXISTS idx_scenes_selected_clip');
    console.log('  - Dropped index idx_scenes_selected_clip');

    // Note: For full rollback, would need to recreate table without the column
    // This is a simplified version that just removes the index
    console.log('  - Note: Column removal requires table recreation in older SQLite versions');
  });

  transaction();

  console.log('Migration 006 rollback completed');
}
