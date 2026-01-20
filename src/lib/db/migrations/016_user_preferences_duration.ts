/**
 * Migration 016: Add default_duration to user_preferences
 *
 * Adds default video duration setting for Quick Production Flow.
 * Users can set their preferred default video length (in minutes).
 */

import type Database from 'better-sqlite3';

export const id = 16;
export const name = 'user_preferences_duration';

export function up(db: Database.Database): void {
  // Add default_duration column (in minutes, default 2)
  db.exec(`
    ALTER TABLE user_preferences
    ADD COLUMN default_duration INTEGER DEFAULT 2
  `);

  console.log('Added default_duration column to user_preferences');
  console.log('Migration 016 (User Preferences Duration) completed successfully');
}

export function down(db: Database.Database): void {
  // SQLite doesn't support DROP COLUMN directly
  // The column will remain but be unused if rolled back
  console.log('Migration 016 rollback: Column remains (SQLite limitation)');
}
