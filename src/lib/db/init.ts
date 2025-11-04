/**
 * Database Initialization
 *
 * Reads and executes the schema.sql file to create all tables
 * and indexes. Safe to call multiple times (idempotent).
 */

import { readFileSync } from 'fs';
import path from 'path';
import db from './client';

/**
 * Initialize the database schema by executing schema.sql
 * This function is idempotent - safe to call multiple times
 */
export function initializeDatabase(): void {
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

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(
      `Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
