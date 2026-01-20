/**
 * Migration 020: User Preferences Default Provider
 *
 * Story 6.11: NASA Web Scraping MCP Server
 * AC-6.11.3: Pipeline Integration - Provider Preference
 *
 * This migration adds a `default_video_provider` column to the user_preferences table
 * to allow users to set their preferred MCP video provider.
 *
 * Changes:
 * 1. Add `default_video_provider` column to user_preferences table
 * 2. Set default value to 'youtube' (backwards compatible)
 * 3. Add CHECK constraint to validate provider values
 *
 * (HIGH PRIORITY H2: Database migration for user provider preference)
 */

import type { Database } from 'better-sqlite3';

/**
 * Apply migration: Add default_video_provider column to user_preferences
 */
export function up(db: Database): void {
  console.log('Running migration 020: User Preferences Default Provider');

  // Start transaction for atomicity
  const transaction = db.transaction(() => {
    // Check if column already exists to ensure idempotency
    const tableInfo = db.pragma('table_info(user_preferences)') as Array<{ name: string }>;
    const existingColumns = new Set(tableInfo.map((col) => col.name));

    // 1. Add default_video_provider column to user_preferences table
    if (!existingColumns.has('default_video_provider')) {
      db.exec(`ALTER TABLE user_preferences ADD COLUMN default_video_provider TEXT DEFAULT 'youtube'`);
      console.log(`  - Added default_video_provider column to user_preferences with default 'youtube'`);
    }

    // 2. Update existing rows to have provider='youtube' if null
    db.exec(`UPDATE user_preferences SET default_video_provider = 'youtube' WHERE default_video_provider IS NULL`);
    console.log(`  - Updated existing rows to default_video_provider='youtube'`);

    // Note: SQLite doesn't support adding CHECK constraints to existing tables
    // The validation will be done at application level
  });

  // Execute transaction
  transaction();

  console.log('Migration 020 completed successfully');
}

/**
 * Rollback migration: Remove default_video_provider column
 */
export function down(db: Database): void {
  console.log('Rolling back migration 020: User Preferences Default Provider');

  // Start transaction for atomicity
  const transaction = db.transaction(() => {
    // Drop default_video_provider column from user_preferences table (SQLite 3.35.0+ required)
    try {
      db.exec('ALTER TABLE user_preferences DROP COLUMN default_video_provider');
      console.log('  - Dropped default_video_provider column from user_preferences');
    } catch (error) {
      console.warn('  - DROP COLUMN not supported in this SQLite version');
      console.warn('  - Manual intervention required to remove default_video_provider column');
      throw new Error(
        'SQLite version does not support DROP COLUMN. Upgrade to SQLite 3.35.0+ or use table recreation strategy.'
      );
    }
  });

  // Execute transaction
  transaction();

  console.log('Migration 020 rollback completed successfully');
}
