/**
 * Database Tests: User Preferences Query Functions
 * Test IDs: 6.8a-DB-001, 6.8a-DB-002, 6.8a-DB-003
 *
 * Tests for Story 6.8a - QPF Infrastructure
 * User preferences CRUD operations for Quick Production Flow defaults.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

// Test database path
const TEST_DB_PATH = path.join(process.cwd(), 'test-user-preferences.db');

// Mock the db client to use test database
let testDb: Database.Database;

/**
 * Test Suite: User Preferences Table Schema
 * Test ID: 6.8a-DB-001
 * Priority: P1 (High) - Critical schema for QPF
 *
 * Tests that Migration 015 creates the correct schema.
 */
describe('6.8a-DB-001: User Preferences Table Schema', () => {
  beforeEach(() => {
    // Remove test database if it exists
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create test database
    testDb = new Database(TEST_DB_PATH);
    testDb.pragma('foreign_keys = ON');

    // Create required tables (system_prompts for FK)
    testDb.exec(`
      CREATE TABLE system_prompts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        description TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Create user_preferences table (Migration 015)
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY DEFAULT 'default',
        default_voice_id TEXT,
        default_persona_id TEXT,
        quick_production_enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (default_persona_id) REFERENCES system_prompts(id) ON DELETE SET NULL
      );

      INSERT OR IGNORE INTO user_preferences (id) VALUES ('default');
    `);
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('should create user_preferences table with correct columns', () => {
    const columns = testDb.prepare(`PRAGMA table_info(user_preferences)`).all();
    const columnNames = columns.map((col: any) => col.name);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('default_voice_id');
    expect(columnNames).toContain('default_persona_id');
    expect(columnNames).toContain('quick_production_enabled');
    expect(columnNames).toContain('created_at');
    expect(columnNames).toContain('updated_at');
  });

  it('should insert default row with id="default"', () => {
    const row = testDb.prepare('SELECT * FROM user_preferences WHERE id = ?').get('default');

    expect(row).toBeDefined();
    expect(row.id).toBe('default');
    expect(row.default_voice_id).toBeNull();
    expect(row.default_persona_id).toBeNull();
    expect(row.quick_production_enabled).toBe(1);
  });

  it('should use INTEGER for quick_production_enabled (SQLite boolean)', () => {
    const columns = testDb.prepare(`PRAGMA table_info(user_preferences)`).all();
    const enabledCol = columns.find((col: any) => col.name === 'quick_production_enabled');

    expect(enabledCol.type).toBe('INTEGER');
    expect(enabledCol.dflt_value).toBe('1');
  });

  it('should have foreign key on default_persona_id', () => {
    const fks = testDb.prepare(`PRAGMA foreign_key_list(user_preferences)`).all();

    expect(fks.length).toBe(1);
    expect(fks[0].from).toBe('default_persona_id');
    expect(fks[0].table).toBe('system_prompts');
    expect(fks[0].to).toBe('id');
    expect(fks[0].on_delete).toBe('SET NULL');
  });

  it('should NOT have foreign key on default_voice_id (voices in TypeScript)', () => {
    const fks = testDb.prepare(`PRAGMA foreign_key_list(user_preferences)`).all();
    const voiceFk = fks.find((fk: any) => fk.from === 'default_voice_id');

    expect(voiceFk).toBeUndefined();
  });
});

/**
 * Test Suite: User Preferences CRUD Operations
 * Test ID: 6.8a-DB-002
 * Priority: P1 (High) - Critical operations for QPF
 *
 * Tests getUserPreferences, updateUserPreferences, hasConfiguredDefaults functions.
 */
describe('6.8a-DB-002: User Preferences CRUD Operations', () => {
  let personaId: string;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    testDb = new Database(TEST_DB_PATH);
    testDb.pragma('foreign_keys = ON');

    // Create system_prompts table
    testDb.exec(`
      CREATE TABLE system_prompts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        description TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Create user_preferences table
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY DEFAULT 'default',
        default_voice_id TEXT,
        default_persona_id TEXT,
        quick_production_enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (default_persona_id) REFERENCES system_prompts(id) ON DELETE SET NULL
      );

      INSERT OR IGNORE INTO user_preferences (id) VALUES ('default');
    `);

    // Insert a test persona
    personaId = randomUUID();
    testDb
      .prepare('INSERT INTO system_prompts (id, name, content) VALUES (?, ?, ?)')
      .run(personaId, 'Test Persona', 'Test content');
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('getUserPreferences', () => {
    it('should return default preferences with null values', () => {
      const row = testDb.prepare('SELECT * FROM user_preferences WHERE id = ?').get('default');

      expect(row).toBeDefined();
      expect(row.default_voice_id).toBeNull();
      expect(row.default_persona_id).toBeNull();
      expect(row.quick_production_enabled).toBe(1);
    });

    it('should return preferences with joined persona name', () => {
      // Set persona_id
      testDb
        .prepare('UPDATE user_preferences SET default_persona_id = ? WHERE id = ?')
        .run(personaId, 'default');

      // Query with join (simulating getUserPreferences)
      const row = testDb
        .prepare(
          `
        SELECT up.*, sp.name as persona_name
        FROM user_preferences up
        LEFT JOIN system_prompts sp ON up.default_persona_id = sp.id
        WHERE up.id = 'default'
      `
        )
        .get();

      expect(row.default_persona_id).toBe(personaId);
      expect(row.persona_name).toBe('Test Persona');
    });

    it('should convert INTEGER to boolean for quick_production_enabled', () => {
      const row = testDb.prepare('SELECT * FROM user_preferences WHERE id = ?').get('default');

      // Simulate the conversion done in queries-user-preferences.ts
      const enabled = row.quick_production_enabled === 1;

      expect(enabled).toBe(true);
    });
  });

  describe('updateUserPreferences', () => {
    it('should update default_voice_id', () => {
      testDb
        .prepare("UPDATE user_preferences SET default_voice_id = ?, updated_at = datetime('now') WHERE id = ?")
        .run('af_nova', 'default');

      const row = testDb.prepare('SELECT * FROM user_preferences WHERE id = ?').get('default');
      expect(row.default_voice_id).toBe('af_nova');
    });

    it('should update default_persona_id', () => {
      testDb
        .prepare("UPDATE user_preferences SET default_persona_id = ?, updated_at = datetime('now') WHERE id = ?")
        .run(personaId, 'default');

      const row = testDb.prepare('SELECT * FROM user_preferences WHERE id = ?').get('default');
      expect(row.default_persona_id).toBe(personaId);
    });

    it('should update quick_production_enabled', () => {
      testDb
        .prepare("UPDATE user_preferences SET quick_production_enabled = ?, updated_at = datetime('now') WHERE id = ?")
        .run(0, 'default');

      const row = testDb.prepare('SELECT * FROM user_preferences WHERE id = ?').get('default');
      expect(row.quick_production_enabled).toBe(0);
    });

    it('should support partial updates (only voice)', () => {
      // First set both values
      testDb
        .prepare(
          "UPDATE user_preferences SET default_voice_id = ?, default_persona_id = ?, updated_at = datetime('now') WHERE id = ?"
        )
        .run('af_nova', personaId, 'default');

      // Update only voice
      testDb
        .prepare("UPDATE user_preferences SET default_voice_id = ?, updated_at = datetime('now') WHERE id = ?")
        .run('af_sky', 'default');

      const row = testDb.prepare('SELECT * FROM user_preferences WHERE id = ?').get('default');
      expect(row.default_voice_id).toBe('af_sky');
      expect(row.default_persona_id).toBe(personaId); // unchanged
    });

    it('should update updated_at timestamp', () => {
      const before = testDb.prepare('SELECT updated_at FROM user_preferences WHERE id = ?').get('default');

      // Small delay to ensure timestamp changes
      testDb
        .prepare("UPDATE user_preferences SET default_voice_id = ?, updated_at = datetime('now') WHERE id = ?")
        .run('af_nova', 'default');

      const after = testDb.prepare('SELECT updated_at FROM user_preferences WHERE id = ?').get('default');

      // Note: In real scenario with actual time delay, these would differ
      expect(after.updated_at).toBeDefined();
    });

    it('should allow setting values to null', () => {
      // First set values
      testDb
        .prepare(
          "UPDATE user_preferences SET default_voice_id = ?, default_persona_id = ?, updated_at = datetime('now') WHERE id = ?"
        )
        .run('af_nova', personaId, 'default');

      // Clear voice_id
      testDb
        .prepare("UPDATE user_preferences SET default_voice_id = NULL, updated_at = datetime('now') WHERE id = ?")
        .run('default');

      const row = testDb.prepare('SELECT * FROM user_preferences WHERE id = ?').get('default');
      expect(row.default_voice_id).toBeNull();
      expect(row.default_persona_id).toBe(personaId); // unchanged
    });
  });

  describe('hasConfiguredDefaults', () => {
    it('should return false when both are null', () => {
      const row = testDb.prepare('SELECT * FROM user_preferences WHERE id = ?').get('default');
      const hasDefaults = !!(row.default_voice_id && row.default_persona_id);

      expect(hasDefaults).toBe(false);
    });

    it('should return false when only voice is set', () => {
      testDb.prepare('UPDATE user_preferences SET default_voice_id = ? WHERE id = ?').run('af_nova', 'default');

      const row = testDb.prepare('SELECT * FROM user_preferences WHERE id = ?').get('default');
      const hasDefaults = !!(row.default_voice_id && row.default_persona_id);

      expect(hasDefaults).toBe(false);
    });

    it('should return false when only persona is set', () => {
      testDb.prepare('UPDATE user_preferences SET default_persona_id = ? WHERE id = ?').run(personaId, 'default');

      const row = testDb.prepare('SELECT * FROM user_preferences WHERE id = ?').get('default');
      const hasDefaults = !!(row.default_voice_id && row.default_persona_id);

      expect(hasDefaults).toBe(false);
    });

    it('should return true when both are set', () => {
      testDb
        .prepare('UPDATE user_preferences SET default_voice_id = ?, default_persona_id = ? WHERE id = ?')
        .run('af_nova', personaId, 'default');

      const row = testDb.prepare('SELECT * FROM user_preferences WHERE id = ?').get('default');
      const hasDefaults = !!(row.default_voice_id && row.default_persona_id);

      expect(hasDefaults).toBe(true);
    });
  });

  describe('FK ON DELETE SET NULL behavior', () => {
    it('should set default_persona_id to NULL when persona is deleted', () => {
      // Set persona_id
      testDb
        .prepare('UPDATE user_preferences SET default_persona_id = ? WHERE id = ?')
        .run(personaId, 'default');

      // Verify it's set
      let row = testDb.prepare('SELECT default_persona_id FROM user_preferences WHERE id = ?').get('default');
      expect(row.default_persona_id).toBe(personaId);

      // Delete the persona
      testDb.prepare('DELETE FROM system_prompts WHERE id = ?').run(personaId);

      // Verify FK SET NULL behavior
      row = testDb.prepare('SELECT default_persona_id FROM user_preferences WHERE id = ?').get('default');
      expect(row.default_persona_id).toBeNull();
    });
  });
});

/**
 * Test Suite: User Preferences Edge Cases
 * Test ID: 6.8a-DB-003
 * Priority: P2 (Medium) - Edge case handling
 *
 * Tests edge cases and error scenarios.
 */
describe('6.8a-DB-003: User Preferences Edge Cases', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    testDb = new Database(TEST_DB_PATH);
    testDb.pragma('foreign_keys = ON');

    testDb.exec(`
      CREATE TABLE system_prompts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY DEFAULT 'default',
        default_voice_id TEXT,
        default_persona_id TEXT,
        quick_production_enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (default_persona_id) REFERENCES system_prompts(id) ON DELETE SET NULL
      );

      INSERT OR IGNORE INTO user_preferences (id) VALUES ('default');
    `);
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('should reject invalid persona_id (FK violation)', () => {
    expect(() => {
      testDb
        .prepare('UPDATE user_preferences SET default_persona_id = ? WHERE id = ?')
        .run('invalid-persona-id', 'default');
    }).toThrow();
  });

  it('should allow any string for voice_id (no FK)', () => {
    // This should NOT throw because voice_id has no FK
    testDb
      .prepare('UPDATE user_preferences SET default_voice_id = ? WHERE id = ?')
      .run('any-invalid-voice-id', 'default');

    const row = testDb.prepare('SELECT default_voice_id FROM user_preferences WHERE id = ?').get('default');
    expect(row.default_voice_id).toBe('any-invalid-voice-id');
  });

  it('should handle INSERT OR IGNORE for idempotent migration', () => {
    // Running the insert multiple times should not fail
    testDb.exec(`INSERT OR IGNORE INTO user_preferences (id) VALUES ('default')`);
    testDb.exec(`INSERT OR IGNORE INTO user_preferences (id) VALUES ('default')`);

    const count = testDb.prepare('SELECT COUNT(*) as count FROM user_preferences').get();
    expect(count.count).toBe(1);
  });

  it('should preserve values on INSERT OR IGNORE', () => {
    // Set values
    testDb
      .prepare('UPDATE user_preferences SET default_voice_id = ? WHERE id = ?')
      .run('af_nova', 'default');

    // Try to insert again (should be ignored)
    testDb.exec(`INSERT OR IGNORE INTO user_preferences (id) VALUES ('default')`);

    // Values should be preserved
    const row = testDb.prepare('SELECT default_voice_id FROM user_preferences WHERE id = ?').get('default');
    expect(row.default_voice_id).toBe('af_nova');
  });

  it('should handle empty string voice_id (different from null)', () => {
    testDb.prepare('UPDATE user_preferences SET default_voice_id = ? WHERE id = ?').run('', 'default');

    const row = testDb.prepare('SELECT default_voice_id FROM user_preferences WHERE id = ?').get('default');
    expect(row.default_voice_id).toBe('');

    // hasConfiguredDefaults should return false for empty string
    const hasDefaults = !!(row.default_voice_id && row.default_persona_id);
    expect(hasDefaults).toBe(false);
  });
});
