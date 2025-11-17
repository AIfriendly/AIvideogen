/**
 * Migration 004: Add CHECK Constraint for current_step Column
 *
 * Story 3.5 - Visual Suggestions Database & Workflow Integration (Subtask 8.2)
 *
 * This migration adds a CHECK constraint to the projects.current_step column
 * to enforce valid workflow state values at the database level.
 *
 * Valid values: 'topic', 'script', 'voice', 'voiceover', 'visual-sourcing', 'visual-curation', 'editing', 'export'
 *
 * Changes:
 * 1. Add CHECK constraint for current_step enum validation
 *
 * Note: SQLite does not support adding CHECK constraints to existing columns via ALTER TABLE.
 * We must recreate the table with the constraint.
 */

import type { Database } from 'better-sqlite3';

/**
 * Apply migration: Add CHECK constraint to current_step
 */
export function up(db: Database): void {
  console.log('Running migration 004: Add CHECK Constraint for current_step');

  // Track FK state for cleanup in finally block (defense in depth)
  let foreignKeysDisabled = false;

  try {
    // CRITICAL: Disable foreign keys during table recreation to prevent FK references to renamed tables
    // This is required for SQLite table recreation pattern (no ALTER TABLE ADD CONSTRAINT support)
    db.pragma('foreign_keys = OFF');
    foreignKeysDisabled = true;
    console.log('  - Foreign keys disabled for migration');

    // Start transaction for atomicity
    const transaction = db.transaction(() => {
      // Check if the constraint already exists by attempting to insert an invalid value
      // If it fails, the constraint is already in place
      try {
        const testStmt = db.prepare(`
          INSERT INTO projects (id, name, current_step, created_at, last_active)
          VALUES ('test-constraint-check', 'Test', 'invalid-step', datetime('now'), datetime('now'))
        `);
        testStmt.run();

        // If we got here, no constraint exists - clean up test record
        db.prepare('DELETE FROM projects WHERE id = ?').run('test-constraint-check');
        console.log('  - No existing constraint detected, proceeding with migration');
      } catch (error) {
        // Constraint already exists or other error
        console.log('  - CHECK constraint may already exist, skipping migration');
        // No need to re-enable here - finally block handles it
        return;
      }

      // Step 1: Rename existing table
      db.exec('ALTER TABLE projects RENAME TO projects_old');
      console.log('  - Renamed projects to projects_old');

      // Step 2: Create new table with CHECK constraint
      db.exec(`
        CREATE TABLE projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          topic TEXT,
          current_step TEXT DEFAULT 'topic' CHECK(current_step IN (
            'topic',
            'script',
            'voice',
            'voiceover',
            'visual-sourcing',
            'visual-curation',
            'editing',
            'export'
          )),
          status TEXT DEFAULT 'draft',
          config_json TEXT,
          system_prompt_id TEXT,
          voice_id TEXT,
          script_generated BOOLEAN DEFAULT 0,
          voice_selected BOOLEAN DEFAULT 0,
          total_duration REAL,
          visuals_generated BOOLEAN DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          last_active TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (system_prompt_id) REFERENCES system_prompts(id) ON DELETE SET NULL
        )
      `);
      console.log('  - Created new projects table with CHECK constraint on current_step');

      // Step 3: Copy data from old table to new table
      db.exec(`
        INSERT INTO projects (
          id, name, topic, current_step, status, config_json, system_prompt_id,
          voice_id, script_generated, voice_selected, total_duration,
          visuals_generated, created_at, last_active
        )
        SELECT
          id, name, topic, current_step, status, config_json, system_prompt_id,
          voice_id, script_generated, voice_selected, total_duration,
          visuals_generated, created_at, last_active
        FROM projects_old
      `);
      console.log('  - Copied data from projects_old to projects');

      // Step 4: Drop old table
      db.exec('DROP TABLE projects_old');
      console.log('  - Dropped projects_old table');

      // Step 5: Recreate indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_projects_last_active ON projects(last_active)');
      console.log('  - Recreated index idx_projects_last_active');
    });

    // Execute transaction
    transaction();

    console.log('Migration 004 completed successfully');

  } finally {
    // CRITICAL: Always re-enable foreign keys, even if migration fails
    // This ensures database integrity is maintained in all code paths
    if (foreignKeysDisabled) {
      db.pragma('foreign_keys = ON');
      console.log('  - Foreign keys re-enabled (finally block)');
    }
  }
}

/**
 * Rollback migration: Remove CHECK constraint from current_step
 */
export function down(db: Database): void {
  console.log('Rolling back migration 004: Remove CHECK Constraint from current_step');

  // Track FK state for cleanup in finally block (defense in depth)
  let foreignKeysDisabled = false;

  try {
    // CRITICAL: Disable foreign keys during table recreation to prevent FK references to renamed tables
    // This is required for SQLite table recreation pattern (no ALTER TABLE DROP CONSTRAINT support)
    db.pragma('foreign_keys = OFF');
    foreignKeysDisabled = true;
    console.log('  - Foreign keys disabled for rollback');

    // Start transaction for atomicity
    const transaction = db.transaction(() => {
      // Step 1: Rename existing table
      db.exec('ALTER TABLE projects RENAME TO projects_old');
      console.log('  - Renamed projects to projects_old');

      // Step 2: Create new table WITHOUT CHECK constraint
      db.exec(`
        CREATE TABLE projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          topic TEXT,
          current_step TEXT DEFAULT 'topic',
          status TEXT DEFAULT 'draft',
          config_json TEXT,
          system_prompt_id TEXT,
          voice_id TEXT,
          script_generated BOOLEAN DEFAULT 0,
          voice_selected BOOLEAN DEFAULT 0,
          total_duration REAL,
          visuals_generated BOOLEAN DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          last_active TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (system_prompt_id) REFERENCES system_prompts(id) ON DELETE SET NULL
        )
      `);
      console.log('  - Created new projects table without CHECK constraint');

      // Step 3: Copy data from old table to new table
      db.exec(`
        INSERT INTO projects (
          id, name, topic, current_step, status, config_json, system_prompt_id,
          voice_id, script_generated, voice_selected, total_duration,
          visuals_generated, created_at, last_active
        )
        SELECT
          id, name, topic, current_step, status, config_json, system_prompt_id,
          voice_id, script_generated, voice_selected, total_duration,
          visuals_generated, created_at, last_active
        FROM projects_old
      `);
      console.log('  - Copied data from projects_old to projects');

      // Step 4: Drop old table
      db.exec('DROP TABLE projects_old');
      console.log('  - Dropped projects_old table');

      // Step 5: Recreate indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_projects_last_active ON projects(last_active)');
      console.log('  - Recreated index idx_projects_last_active');
    });

    // Execute transaction
    transaction();

    console.log('Migration 004 rollback completed successfully');

  } finally {
    // CRITICAL: Always re-enable foreign keys, even if rollback fails
    // This ensures database integrity is maintained in all code paths
    if (foreignKeysDisabled) {
      db.pragma('foreign_keys = ON');
      console.log('  - Foreign keys re-enabled (finally block)');
    }
  }
}
