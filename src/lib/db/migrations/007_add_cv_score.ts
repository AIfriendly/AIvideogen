/**
 * Migration 007: Add CV Score Column
 *
 * Epic 3, Story 3.7 - Computer Vision Content Filtering
 *
 * This migration adds the cv_score column to visual_suggestions table
 * for storing Vision API analysis results.
 *
 * Changes:
 * 1. Add cv_score REAL column to visual_suggestions (nullable, defaults to NULL)
 */

import type { Database } from 'better-sqlite3';

/**
 * Apply migration: Add cv_score column
 */
export function up(db: Database): void {
  console.log('Running migration 007: Add CV Score Column');

  // Start transaction for atomicity
  const transaction = db.transaction(() => {
    // Check if column already exists to ensure idempotency
    const tableInfo = db.pragma('table_info(visual_suggestions)') as Array<{ name: string }>;
    const existingColumns = new Set(tableInfo.map((col) => col.name));

    // 1. Add cv_score column to visual_suggestions table
    if (!existingColumns.has('cv_score')) {
      db.exec('ALTER TABLE visual_suggestions ADD COLUMN cv_score REAL DEFAULT NULL');
      console.log('  - Added cv_score column to visual_suggestions');
    } else {
      console.log('  - cv_score column already exists, skipping');
    }
  });

  // Execute transaction
  transaction();

  console.log('Migration 007 completed successfully');
}

/**
 * Rollback migration: Remove cv_score column
 */
export function down(db: Database): void {
  console.log('Rolling back migration 007: Add CV Score Column');

  // Start transaction for atomicity
  const transaction = db.transaction(() => {
    // Drop cv_score column from visual_suggestions table (SQLite 3.35.0+ required)
    try {
      db.exec('ALTER TABLE visual_suggestions DROP COLUMN cv_score');
      console.log('  - Dropped cv_score column from visual_suggestions');
    } catch (error) {
      console.warn('  - DROP COLUMN not supported in this SQLite version');
      console.warn('  - Manual intervention required to remove cv_score column');
      throw new Error(
        'SQLite version does not support DROP COLUMN. Upgrade to SQLite 3.35.0+ or use table recreation strategy.'
      );
    }
  });

  // Execute transaction
  transaction();

  console.log('Migration 007 rollback completed successfully');
}
