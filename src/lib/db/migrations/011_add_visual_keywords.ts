/**
 * Migration 011: Add visual_keywords column to scenes table
 *
 * Story 3.7b - CV Pipeline Integration
 *
 * The visual_keywords column stores JSON array of keywords extracted during
 * scene analysis (Story 3.2). These keywords are used by CV analysis to
 * verify that downloaded video segments match the expected content.
 *
 * Example: ["lion", "savanna", "wildlife", "sunset"]
 */

import type { Database } from 'better-sqlite3';

/**
 * Apply migration: Add visual_keywords column to scenes table
 */
export function up(db: Database): void {
  console.log('Running migration 011: Add visual_keywords column to scenes table');

  // SQLite supports ALTER TABLE ADD COLUMN
  db.exec(`
    ALTER TABLE scenes ADD COLUMN visual_keywords TEXT
  `);

  console.log('  - Added visual_keywords column to scenes table');
  console.log('Migration 011 completed successfully');
}

/**
 * Rollback migration: Remove visual_keywords column from scenes table
 * Note: SQLite doesn't support DROP COLUMN directly, would need table recreation
 */
export function down(db: Database): void {
  console.log('Rolling back migration 011: Remove visual_keywords column');

  // SQLite doesn't support ALTER TABLE DROP COLUMN in older versions
  // For rollback, we'd need to recreate the table without the column
  // This is a simplified version that just logs a warning
  console.warn('  - WARNING: SQLite does not support DROP COLUMN. Manual table recreation required.');
  console.log('Migration 011 rollback completed (column not removed)');
}
