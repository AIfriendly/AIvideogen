/**
 * Database Initialization
 *
 * Reads and executes the schema.sql file to create all tables
 * and indexes, then runs any pending migrations. Safe to call multiple times (idempotent).
 */

import { readFileSync } from 'fs';
import path from 'path';
import db from './client';

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
 * Migration definitions - add new migrations here
 */
const MIGRATIONS = [
  { name: '002_content_generation_schema', path: './migrations/002_content_generation_schema' },
  { name: '003_visual_suggestions_schema', path: './migrations/003_visual_suggestions_schema' },
  { name: '004_add_current_step_constraint', path: './migrations/004_add_current_step_constraint' },
  { name: '005_fix_current_step_constraint', path: './migrations/005_fix_current_step_constraint' },
  { name: '006_add_selected_clip_id', path: './migrations/006_add_selected_clip_id' },
  { name: '007_add_cv_score', path: './migrations/007_add_cv_score' },
  { name: '008_assembly_jobs', path: './migrations/008_assembly_jobs' },
  { name: '009_add_downloading_stage', path: './migrations/009_add_downloading_stage' },
  { name: '010_add_queued_status', path: './migrations/010_add_queued_status' },
  { name: '011_add_visual_keywords', path: './migrations/011_add_visual_keywords' },
  { name: '012_seed_preset_personas', path: './migrations/012_seed_preset_personas' },
  { name: '013_rag_infrastructure', path: './migrations/013_rag_infrastructure' },
];

/**
 * Run database migrations
 * Only logs when migrations are actually applied (not when skipped)
 */
async function runMigrations(): Promise<void> {
  ensureMigrationsTable();

  let appliedCount = 0;

  for (const migration of MIGRATIONS) {
    if (!isMigrationApplied(migration.name)) {
      console.log(`[DB] Applying migration: ${migration.name}`);
      try {
        const { up } = await import(migration.path);
        up(db);
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
      await runMigrations();

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
