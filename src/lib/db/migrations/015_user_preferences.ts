/**
 * Migration 015: User Preferences for Quick Production Flow
 *
 * Story 6.8a - QPF Infrastructure
 *
 * Creates the user_preferences table for storing default voice and persona
 * settings for one-click video creation (Quick Production Flow).
 *
 * Note: voice_id is stored as TEXT without foreign key since voices are
 * defined in TypeScript code (voice-profiles.ts) not in the database.
 */

import type Database from 'better-sqlite3';

export const id = 15;
export const name = 'user_preferences';

export function up(db: Database.Database): void {
  // Create user_preferences table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY DEFAULT 'default',
      default_voice_id TEXT,
      default_persona_id TEXT,
      quick_production_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (default_persona_id) REFERENCES system_prompts(id) ON DELETE SET NULL
    )
  `);

  console.log('Created user_preferences table');

  // Create index for quick lookup
  db.exec(`CREATE INDEX IF NOT EXISTS idx_user_preferences_id ON user_preferences(id)`);

  // Insert default row (single-user app)
  db.exec(`INSERT OR IGNORE INTO user_preferences (id) VALUES ('default')`);

  console.log('Inserted default user_preferences row');
  console.log('Migration 015 (User Preferences) completed successfully');
}

export function down(db: Database.Database): void {
  db.exec(`DROP INDEX IF EXISTS idx_user_preferences_id`);
  db.exec(`DROP TABLE IF EXISTS user_preferences`);
  console.log('Migration 015 (User Preferences) rolled back');
}
