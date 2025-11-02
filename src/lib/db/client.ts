/**
 * Database Client
 *
 * Initializes and exports the SQLite database connection
 * using better-sqlite3 with foreign key constraints enabled.
 */

import Database from 'better-sqlite3';
import path from 'path';

// Database file path at project root
const dbPath = path.join(process.cwd(), 'ai-video-generator.db');

// Create database instance
const db = new Database(dbPath);

// Enable foreign key constraints (critical for referential integrity)
db.pragma('foreign_keys = ON');

// Export database instance for use in queries
export default db;
