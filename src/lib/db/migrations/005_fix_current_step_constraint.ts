/**
 * Migration 005: Fix CHECK Constraint for current_step Column
 *
 * Bug Fix: Align current_step values with actual route names
 *
 * The migration 004 incorrectly used 'script' but the application uses 'script-generation'.
 * This migration updates the CHECK constraint to match the actual route names.
 *
 * Changed values:
 * - 'script' → 'script-generation'
 *
 * Valid values: 'topic', 'voice', 'script-generation', 'voiceover', 'visual-sourcing', 'visual-curation', 'editing', 'export'
 *
 * Note: SQLite does not support modifying CHECK constraints via ALTER TABLE.
 * We must recreate the table with the corrected constraint.
 */

import type { Database } from 'better-sqlite3';

/**
 * Apply migration: Fix CHECK constraint values for current_step
 */
export function up(db: Database): void {
  console.log('Running migration 005: Fix CHECK Constraint for current_step');

  // Track FK state for cleanup in finally block (defense in depth)
  let foreignKeysDisabled = false;

  try {
    // CRITICAL: Disable foreign keys during table recreation to prevent FK references to renamed tables
    // This is required for SQLite table recreation pattern (no ALTER TABLE MODIFY CONSTRAINT support)
    db.pragma('foreign_keys = OFF');
    foreignKeysDisabled = true;
    console.log('  - Foreign keys disabled for migration');

    // Start transaction for atomicity
    const transaction = db.transaction(() => {
      // Step 1: Create new table with temporary name and CORRECTED CHECK constraint
      db.exec(`
        CREATE TABLE projects_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          topic TEXT,
          current_step TEXT DEFAULT 'topic' CHECK(current_step IN (
            'topic',
            'voice',
            'script-generation',
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
      console.log('  - Created projects_new table with corrected CHECK constraint on current_step');

      // Step 2: Copy data from old table to new table
      db.exec(`
        INSERT INTO projects_new (
          id, name, topic, current_step, status, config_json, system_prompt_id,
          voice_id, script_generated, voice_selected, total_duration,
          visuals_generated, created_at, last_active
        )
        SELECT
          id, name, topic, current_step, status, config_json, system_prompt_id,
          voice_id, script_generated, voice_selected, total_duration,
          visuals_generated, created_at, last_active
        FROM projects
      `);
      console.log('  - Copied data from projects to projects_new');

      // Step 3: Drop old table
      db.exec('DROP TABLE projects');
      console.log('  - Dropped old projects table');

      // Step 4: Rename new table to final name
      db.exec('ALTER TABLE projects_new RENAME TO projects');
      console.log('  - Renamed projects_new to projects');

      // Step 5: Recreate indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_projects_last_active ON projects(last_active)');
      console.log('  - Recreated index idx_projects_last_active');
    });

    // Execute transaction
    transaction();

    console.log('Migration 005 completed successfully');

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
 * Rollback migration: Revert CHECK constraint to migration 004 state
 */
export function down(db: Database): void {
  console.log('Rolling back migration 005: Revert CHECK Constraint to migration 004 state');

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

      // Step 2: Create new table with OLD CHECK constraint (migration 004 state)
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
      console.log('  - Created new projects table with old CHECK constraint');

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

    console.log('Migration 005 rollback completed successfully');

  } finally {
    // CRITICAL: Always re-enable foreign keys, even if rollback fails
    // This ensures database integrity is maintained in all code paths
    if (foreignKeysDisabled) {
      db.pragma('foreign_keys = ON');
      console.log('  - Foreign keys re-enabled (finally block)');
    }
  }
}
