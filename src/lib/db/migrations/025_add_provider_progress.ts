/**
 * Migration 025: Add Provider Progress Columns to Projects Table
 *
 * Story 6.11: NASA Web Scraping MCP Server & Pipeline Integration
 * AC-6.11.3: Pipeline Integration - Real-time Progress UI
 *
 * This migration adds provider progress tracking columns to the projects table
 * to support displaying real-time progress during visual generation with MCP providers.
 *
 * Changes:
 * 1. Add `visuals_provider` column to projects table (stores: 'youtube', 'nasa', 'dvids')
 * 2. Add `visuals_download_progress` column to projects table (0-100 percentage)
 *
 * These fields enable the Quick Production Progress UI to display:
 * - "Searching DVIDS..." / "Searching NASA..." / "Searching YouTube..."
 * - "Downloading video (45%)..." progress indicators
 */

import type Database from 'better-sqlite3';

export const id = 25;
export const name = 'add_provider_progress';

export function up(db: Database.Database): void {
  console.log('Running migration 025: Add provider progress columns to projects');

  // Start transaction for atomicity
  const transaction = db.transaction(() => {
    // Check if columns already exist to ensure idempotency
    const tableInfo = db.pragma('table_info(projects)') as Array<{ name: string }>;
    const existingColumns = new Set(tableInfo.map((col) => col.name));

    // 1. Add visuals_provider column if it doesn't exist
    if (!existingColumns.has('visuals_provider')) {
      db.exec(`ALTER TABLE projects ADD COLUMN visuals_provider TEXT`);
      console.log(`  - Added visuals_provider column to projects table`);
    } else {
      console.log(`  - visuals_provider column already exists, skipping`);
    }

    // 2. Add visuals_download_progress column if it doesn't exist
    if (!existingColumns.has('visuals_download_progress')) {
      db.exec(`ALTER TABLE projects ADD COLUMN visuals_download_progress INTEGER DEFAULT 0`);
      console.log(`  - Added visuals_download_progress column to projects table with default 0`);
    } else {
      console.log(`  - visuals_download_progress column already exists, skipping`);
    }
  });

  // Execute transaction
  transaction();

  console.log('Migration 025 completed successfully');
}

export function down(db: Database.Database): void {
  console.log('Rolling back migration 025: Add provider progress columns');

  // Note: SQLite doesn't support DROP COLUMN directly in older versions
  // For rollback, we would need to recreate the table without the columns
  try {
    db.exec('ALTER TABLE projects DROP COLUMN visuals_provider');
    console.log('  - Dropped visuals_provider column from projects');
  } catch (error) {
    console.warn('  - DROP COLUMN for visuals_provider not supported in this SQLite version');
    console.warn('  - Manual intervention required to remove visuals_provider column');
  }

  try {
    db.exec('ALTER TABLE projects DROP COLUMN visuals_download_progress');
    console.log('  - Dropped visuals_download_progress column from projects');
  } catch (error) {
    console.warn('  - DROP COLUMN for visuals_download_progress not supported in this SQLite version');
    console.warn('  - Manual intervention required to remove visuals_download_progress column');
  }

  console.log('Migration 025 rollback completed');
}
