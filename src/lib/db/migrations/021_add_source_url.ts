/**
 * Migration 021: Add source_url to visual_suggestions
 *
 * Story 6.12: MCP Video Assembly Integration
 * AC-6.12.1: Database Schema Update
 *
 * This migration adds a `source_url` column to the visual_suggestions table
 * to store the actual download URL for MCP provider videos (DVIDS, NASA).
 *
 * The `provider` column was added in Migration 019.
 * This migration completes the provider tracking by adding the download URL.
 *
 * Changes:
 * 1. Add `source_url` column to visual_suggestions table
 * 2. Update existing rows with source_url based on video_id and provider
 *
 * Note: YouTube videos use yt-dlp which generates URLs from video_id,
 * so source_url will be null for YouTube videos (download URL is derived).
 */

import type { Database } from 'better-sqlite3';

/**
 * Apply migration: Add source_url column to visual_suggestions
 */
export function up(db: Database): void {
  console.log('Running migration 021: Add source_url to visual_suggestions');

  // Start transaction for atomicity
  const transaction = db.transaction(() => {
    // Check if column already exists to ensure idempotency
    const tableInfo = db.pragma('table_info(visual_suggestions)') as Array<{ name: string }>;
    const existingColumns = new Set(tableInfo.map((col) => col.name));

    // 1. Add source_url column to visual_suggestions table
    if (!existingColumns.has('source_url')) {
      db.exec('ALTER TABLE visual_suggestions ADD COLUMN source_url TEXT');
      console.log('  - Added source_url column to visual_suggestions');
    }

    // Note: We don't backfill source_url for existing records because:
    // - YouTube videos derive URLs from video_id (no source_url needed)
    // - MCP provider videos should have source_url set when they're created
    // - Old YouTube records will have null source_url (expected)

    console.log('  - Existing YouTube records will have null source_url (expected behavior)');
  });

  // Execute transaction
  transaction();

  console.log('Migration 021 completed successfully');
}

/**
 * Rollback migration: Remove source_url column
 */
export function down(db: Database): void {
  console.log('Rolling back migration 021: Remove source_url from visual_suggestions');

  // Start transaction for atomicity
  const transaction = db.transaction(() => {
    // Drop source_url column from visual_suggestions table (SQLite 3.35.0+ required)
    try {
      db.exec('ALTER TABLE visual_suggestions DROP COLUMN source_url');
      console.log('  - Dropped source_url column from visual_suggestions');
    } catch (error) {
      console.warn('  - DROP COLUMN not supported in this SQLite version');
      console.warn('  - Manual intervention required to remove source_url column');
      throw new Error(
        'SQLite version does not support DROP COLUMN. Upgrade to SQLite 3.35.0+ or use table recreation strategy.'
      );
    }
  });

  // Execute transaction
  transaction();

  console.log('Migration 021 rollback completed successfully');
}
