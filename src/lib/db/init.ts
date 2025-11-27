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
 * Global singleton flag to ensure initialization runs only once
 * Prevents duplicate migrations on module re-imports
 */
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

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
 * Run database migrations
 */
async function runMigrations(): Promise<void> {
  console.log('Running database migrations...');

  ensureMigrationsTable();

  // Migration 002: Content Generation Schema (Epic 2)
  const migration002Name = '002_content_generation_schema';
  if (!isMigrationApplied(migration002Name)) {
    console.log(`Applying migration: ${migration002Name}`);
    try {
      const { up } = await import('./migrations/002_content_generation_schema');
      up(db);
      markMigrationApplied(migration002Name);
      console.log(`Migration ${migration002Name} applied successfully`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration002Name}:`, error);
      throw error;
    }
  } else {
    console.log(`Migration ${migration002Name} already applied, skipping`);
  }

  // Migration 003: Visual Suggestions Schema (Epic 3)
  const migration003Name = '003_visual_suggestions_schema';
  if (!isMigrationApplied(migration003Name)) {
    console.log(`Applying migration: ${migration003Name}`);
    try {
      const { up } = await import('./migrations/003_visual_suggestions_schema');
      up(db);
      markMigrationApplied(migration003Name);
      console.log(`Migration ${migration003Name} applied successfully`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration003Name}:`, error);
      throw error;
    }
  } else {
    console.log(`Migration ${migration003Name} already applied, skipping`);
  }

  // Migration 004: Add CHECK Constraint for current_step (Story 3.5 - Subtask 8.2)
  const migration004Name = '004_add_current_step_constraint';
  if (!isMigrationApplied(migration004Name)) {
    console.log(`Applying migration: ${migration004Name}`);
    try {
      const { up } = await import('./migrations/004_add_current_step_constraint');
      up(db);
      markMigrationApplied(migration004Name);
      console.log(`Migration ${migration004Name} applied successfully`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration004Name}:`, error);
      throw error;
    }
  } else {
    console.log(`Migration ${migration004Name} already applied, skipping`);
  }

  // Migration 005: Fix CHECK Constraint for current_step (Bug Fix)
  const migration005Name = '005_fix_current_step_constraint';
  if (!isMigrationApplied(migration005Name)) {
    console.log(`Applying migration: ${migration005Name}`);
    try {
      const { up } = await import('./migrations/005_fix_current_step_constraint');
      up(db);
      markMigrationApplied(migration005Name);
      console.log(`Migration ${migration005Name} applied successfully`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration005Name}:`, error);
      throw error;
    }
  } else {
    console.log(`Migration ${migration005Name} already applied, skipping`);
  }

  // Migration 006: Add selected_clip_id to scenes table (Epic 4, Story 4.4)
  const migration006Name = '006_add_selected_clip_id';
  if (!isMigrationApplied(migration006Name)) {
    console.log(`Applying migration: ${migration006Name}`);
    try {
      const { up } = await import('./migrations/006_add_selected_clip_id');
      up(db);
      markMigrationApplied(migration006Name);
      console.log(`Migration ${migration006Name} applied successfully`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration006Name}:`, error);
      throw error;
    }
  } else {
    console.log(`Migration ${migration006Name} already applied, skipping`);
  }

  // Migration 007: Add cv_score to visual_suggestions (Epic 3, Story 3.7)
  const migration007Name = '007_add_cv_score';
  if (!isMigrationApplied(migration007Name)) {
    console.log(`Applying migration: ${migration007Name}`);
    try {
      const { up } = await import('./migrations/007_add_cv_score');
      up(db);
      markMigrationApplied(migration007Name);
      console.log(`Migration ${migration007Name} applied successfully`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration007Name}:`, error);
      throw error;
    }
  } else {
    console.log(`Migration ${migration007Name} already applied, skipping`);
  }

  // Migration 008: Create assembly_jobs table (Epic 5)
  const migration008Name = '008_assembly_jobs';
  if (!isMigrationApplied(migration008Name)) {
    console.log(`Applying migration: ${migration008Name}`);
    try {
      const { up } = await import('./migrations/008_assembly_jobs');
      up(db);
      markMigrationApplied(migration008Name);
      console.log(`Migration ${migration008Name} applied successfully`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration008Name}:`, error);
      throw error;
    }
  } else {
    console.log(`Migration ${migration008Name} already applied, skipping`);
  }

  // Migration 009: Add downloading stage to assembly_jobs
  const migration009Name = '009_add_downloading_stage';
  if (!isMigrationApplied(migration009Name)) {
    console.log(`Applying migration: ${migration009Name}`);
    try {
      const { up } = await import('./migrations/009_add_downloading_stage');
      up(db);
      markMigrationApplied(migration009Name);
      console.log(`Migration ${migration009Name} applied successfully`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration009Name}:`, error);
      throw error;
    }
  } else {
    console.log(`Migration ${migration009Name} already applied, skipping`);
  }

  // Migration 010: Add 'queued' to download_status CHECK constraint (Story 3.7b)
  const migration010Name = '010_add_queued_status';
  if (!isMigrationApplied(migration010Name)) {
    console.log(`Applying migration: ${migration010Name}`);
    try {
      const { up } = await import('./migrations/010_add_queued_status');
      up(db);
      markMigrationApplied(migration010Name);
      console.log(`Migration ${migration010Name} applied successfully`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration010Name}:`, error);
      throw error;
    }
  } else {
    console.log(`Migration ${migration010Name} already applied, skipping`);
  }

  // Migration 011: Add visual_keywords column to scenes table (Story 3.7b)
  const migration011Name = '011_add_visual_keywords';
  if (!isMigrationApplied(migration011Name)) {
    console.log(`Applying migration: ${migration011Name}`);
    try {
      const { up } = await import('./migrations/011_add_visual_keywords');
      up(db);
      markMigrationApplied(migration011Name);
      console.log(`Migration ${migration011Name} applied successfully`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration011Name}:`, error);
      throw error;
    }
  } else {
    console.log(`Migration ${migration011Name} already applied, skipping`);
  }

  console.log('All migrations completed');
}

/**
 * Initialize the database schema by executing schema.sql
 * and running any pending migrations.
 * This function is idempotent - safe to call multiple times.
 * Uses singleton pattern to ensure initialization runs only once globally.
 */
export async function initializeDatabase(): Promise<void> {
  // Return immediately if already initialized
  if (isInitialized) {
    return;
  }

  // If initialization is in progress, wait for it to complete
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization and store the promise
  initializationPromise = (async () => {
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

      console.log('Database schema initialized successfully');

      // Run migrations
      await runMigrations();

      console.log('Database initialization completed successfully');

      // Mark as initialized
      isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // Reset on error so retry is possible
      initializationPromise = null;
      throw new Error(
        `Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  })();

  return initializationPromise;
}
