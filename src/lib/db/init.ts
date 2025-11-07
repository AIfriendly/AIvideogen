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

  console.log('All migrations completed');
}

/**
 * Initialize the database schema by executing schema.sql
 * and running any pending migrations.
 * This function is idempotent - safe to call multiple times
 */
export async function initializeDatabase(): Promise<void> {
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
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(
      `Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
