/**
 * Database Initialization
 *
 * Reads and executes the schema.sql file to create all tables
 * and indexes, then runs any pending migrations. Safe to call multiple times (idempotent).
 */

import { readFileSync } from 'fs';
import path from 'path';
import db from './client';

// Static imports for all migrations (required for Next.js Turbopack)
import * as migration_002 from './migrations/002_content_generation_schema';
import * as migration_003 from './migrations/003_visual_suggestions_schema';
import * as migration_004 from './migrations/004_add_current_step_constraint';
import * as migration_005 from './migrations/005_fix_current_step_constraint';
import * as migration_006 from './migrations/006_add_selected_clip_id';
import * as migration_007 from './migrations/007_add_cv_score';
import * as migration_008 from './migrations/008_assembly_jobs';
import * as migration_009 from './migrations/009_add_downloading_stage';
import * as migration_010 from './migrations/010_add_queued_status';
import * as migration_011 from './migrations/011_add_visual_keywords';
import * as migration_012 from './migrations/012_seed_preset_personas';
import * as migration_013 from './migrations/013_rag_infrastructure';
import * as migration_014 from './migrations/014_news_embedding_status';
import * as migration_015 from './migrations/015_user_preferences';
import * as migration_016 from './migrations/016_user_preferences_duration';
import * as migration_017 from './migrations/017_fix_duplicate_user_channels';
import * as migration_018 from './migrations/018_add_video_embedding_status_values';
import * as migration_019 from './migrations/019_visual_suggestions_provider';
import * as migration_020 from './migrations/020_user_preferences_default_provider';
import * as migration_021 from './migrations/021_add_source_url';
import * as migration_022 from './migrations/022_add_rag_enabled';
import * as migration_023 from './migrations/023_add_target_duration';
import * as migration_024 from './migrations/024_add_default_llm_provider';
import * as migration_025 from './migrations/025_add_provider_progress';
import type Database from 'better-sqlite3';

/**
 * Global singleton flag to ensure initialization runs only once.
 * Uses globalThis to persist across module reloads in Next.js dev mode.
 * Without this, hot reloading causes repeated initialization.
 */
declare global {
  // eslint-disable-next-line no-var
  var __dbInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __dbInitPromise: Promise<void> | undefined;
}

// Use globalThis to survive module reloads in Next.js development
const isInitialized = (): boolean => globalThis.__dbInitialized === true;
const setInitialized = (value: boolean): void => { globalThis.__dbInitialized = value; };
const getInitPromise = (): Promise<void> | undefined => globalThis.__dbInitPromise;
const setInitPromise = (promise: Promise<void> | undefined): void => { globalThis.__dbInitPromise = promise; };

/**
 * Migration tracking table
 * Stores which migrations have been applied
 */
function ensureMigrationsTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

/**
 * Check if a migration has been applied
 */
function isMigrationApplied(name: string): boolean {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM migrations WHERE name = ?');
  const result = stmt.get(name) as { count: number };
  return result.count > 0;
}

/**
 * Mark a migration as applied
 */
function markMigrationApplied(name: string): void {
  const stmt = db.prepare('INSERT INTO migrations (name) VALUES (?)');
  stmt.run(name);
}

/**
 * Migration definitions - uses static imports for Next.js Turbopack compatibility
 */
const MIGRATIONS = [
  { name: '002_content_generation_schema', module: migration_002 },
  { name: '003_visual_suggestions_schema', module: migration_003 },
  { name: '004_add_current_step_constraint', module: migration_004 },
  { name: '005_fix_current_step_constraint', module: migration_005 },
  { name: '006_add_selected_clip_id', module: migration_006 },
  { name: '007_add_cv_score', module: migration_007 },
  { name: '008_assembly_jobs', module: migration_008 },
  { name: '009_add_downloading_stage', module: migration_009 },
  { name: '010_add_queued_status', module: migration_010 },
  { name: '011_add_visual_keywords', module: migration_011 },
  { name: '012_seed_preset_personas', module: migration_012 },
  { name: '013_rag_infrastructure', module: migration_013 },
  { name: '014_news_embedding_status', module: migration_014 },
  { name: '015_user_preferences', module: migration_015 },
  { name: '016_user_preferences_duration', module: migration_016 },
  { name: '017_fix_duplicate_user_channels', module: migration_017 },
  { name: '018_add_video_embedding_status_values', module: migration_018 },
  { name: '019_visual_suggestions_provider', module: migration_019 },
  { name: '020_user_preferences_default_provider', module: migration_020 },
  { name: '021_add_source_url', module: migration_021 },
  { name: '022_add_rag_enabled', module: migration_022 },
  { name: '023_add_target_duration', module: migration_023 },
  { name: '024_add_default_llm_provider', module: migration_024 },
  { name: '025_add_provider_progress', module: migration_025 },
];

/**
 * Run database migrations
 * Only logs when migrations are actually applied (not when skipped)
 */
function runMigrations(): void {
  ensureMigrationsTable();

  let appliedCount = 0;

  for (const migration of MIGRATIONS) {
    if (!isMigrationApplied(migration.name)) {
      console.log(`[DB] Applying migration: ${migration.name}`);
      try {
        // Use statically imported module directly (Turbopack compatible)
        migration.module.up(db);
        markMigrationApplied(migration.name);
        appliedCount++;
        console.log(`[DB] Migration ${migration.name} applied successfully`);
      } catch (error) {
        console.error(`[DB] Failed to apply migration ${migration.name}:`, error);
        throw error;
      }
    }
    // Don't log skipped migrations - reduces noise significantly
  }

  if (appliedCount > 0) {
    console.log(`[DB] ${appliedCount} migration(s) applied`);
  }
  // Only log "up to date" on first init, not every request
}

/**
 * Initialize the database schema by executing schema.sql
 * and running any pending migrations.
 * This function is idempotent - safe to call multiple times.
 * Uses globalThis singleton pattern to survive Next.js module reloads.
 */
export async function initializeDatabase(): Promise<void> {
  // Return immediately if already initialized (persists across module reloads)
  if (isInitialized()) {
    return;
  }

  // If initialization is in progress, wait for it to complete
  const existingPromise = getInitPromise();
  if (existingPromise) {
    return existingPromise;
  }

  // Start initialization and store the promise in globalThis
  const initPromise = (async () => {
    try {
      // Read schema.sql file - try multiple paths for different build environments
      let schema: string;
      let schemaPath: string;

      // Try path relative to source directory first (development)
      try {
        schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
        schema = readFileSync(schemaPath, 'utf-8');
      } catch {
        // Try path relative to __dirname (production build)
        schemaPath = path.join(__dirname, 'schema.sql');
        schema = readFileSync(schemaPath, 'utf-8');
      }

      // Execute the schema SQL to create tables and indexes
      db.exec(schema);

      // Run migrations (only logs when changes occur)
      runMigrations();

      console.log('[DB] Database ready');

      // Mark as initialized in globalThis (survives module reloads)
      setInitialized(true);
    } catch (error) {
      console.error('[DB] Failed to initialize database:', error);
      // Reset on error so retry is possible
      setInitPromise(undefined);
      throw new Error(
        `Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  })();

  setInitPromise(initPromise);
  return initPromise;
}
