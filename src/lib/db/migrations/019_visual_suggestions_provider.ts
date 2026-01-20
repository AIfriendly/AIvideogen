/**
 * Migration 019: Visual Suggestions Provider Column
 *
 * Story 6.11: NASA Web Scraping MCP Server
 * AC-6.11.3: Pipeline Integration - Provider Tracking
 *
 * This migration adds a `provider` column to the visual_suggestions table
 * to track which MCP provider (DVIDS, NASA, YouTube) sourced each video.
 *
 * Changes:
 * 1. Add `provider` column to visual_suggestions table
 * 2. Create index on provider for performance
 * 3. Update existing rows to default to 'youtube'
 *
 * (HIGH PRIORITY H2: Database migration for provider tracking)
 */

import type { Database } from 'better-sqlite3';

/**
 * Apply migration: Add provider column to visual_suggestions
 */
export function up(db: Database): void {
  console.log('Running migration 019: Visual Suggestions Provider Column');

  // Start transaction for atomicity
  const transaction = db.transaction(() => {
    // Check if column already exists to ensure idempotency
    const tableInfo = db.pragma('table_info(visual_suggestions)') as Array<{ name: string }>;
    const existingColumns = new Set(tableInfo.map((col) => col.name));

    // 1. Add provider column to visual_suggestions table
    if (!existingColumns.has('provider')) {
      db.exec(`ALTER TABLE visual_suggestions ADD COLUMN provider TEXT DEFAULT 'youtube'`);
      console.log(`  - Added provider column to visual_suggestions with default 'youtube'`);
    }

    // 2. Update existing rows to have provider='youtube' if null
    db.exec(`UPDATE visual_suggestions SET provider = 'youtube' WHERE provider IS NULL`);
    console.log(`  - Updated existing rows to provider='youtube'`);

    // 3. Create index on provider for performance
    db.exec('CREATE INDEX IF NOT EXISTS idx_visual_suggestions_provider ON visual_suggestions(provider)');
    console.log('  - Created index idx_visual_suggestions_provider');
  });

  // Execute transaction
  transaction();

  console.log('Migration 019 completed successfully');
}

/**
 * Rollback migration: Remove provider column
 */
export function down(db: Database): void {
  console.log('Rolling back migration 019: Visual Suggestions Provider Column');

  // Start transaction for atomicity
  const transaction = db.transaction(() => {
    // 1. Drop index on provider
    db.exec('DROP INDEX IF EXISTS idx_visual_suggestions_provider');
    console.log('  - Dropped index idx_visual_suggestions_provider');

    // 2. Drop provider column from visual_suggestions table (SQLite 3.35.0+ required)
    try {
      db.exec('ALTER TABLE visual_suggestions DROP COLUMN provider');
      console.log('  - Dropped provider column from visual_suggestions');
    } catch (error) {
      console.warn('  - DROP COLUMN not supported in this SQLite version');
      console.warn('  - Manual intervention required to remove provider column');
      throw new Error(
        'SQLite version does not support DROP COLUMN. Upgrade to SQLite 3.35.0+ or use table recreation strategy.'
      );
    }
  });

  // Execute transaction
  transaction();

  console.log('Migration 019 rollback completed successfully');
}
