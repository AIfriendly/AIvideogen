/**
 * Database Test Fixtures for Story 3.3
 * Following TEA fixture-architecture.md best practices
 *
 * Pattern: Pure function → Fixture → mergeTests
 * Provides isolated, auto-cleanup database state for tests
 */

import { test as base, expect } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createTestProject, createTestScene } from '../factories/visual-suggestions.factory';
import type { TestProject, TestScene } from '../factories/visual-suggestions.factory';

/**
 * Pure function: Create clean in-memory database
 * Returns isolated database instance with schema applied
 */
export function createCleanDatabase(): Database.Database {
  // Create in-memory database for test isolation
  const db = new Database(':memory:');

  // Apply schema from migrations
  applyTestSchema(db);

  return db;
}

/**
 * Apply database schema for testing
 * Includes all tables needed for Story 3.3 tests
 */
function applyTestSchema(db: Database.Database): void {
  // Projects table (from Epic 1)
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
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
      last_active TEXT DEFAULT (datetime('now'))
    )
  `);

  // Scenes table (from Epic 2)
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scene_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      duration INTEGER, -- Voiceover duration in seconds
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, scene_number)
    )
  `);

  // Visual suggestions table (Story 3.3)
  db.exec(`
    CREATE TABLE IF NOT EXISTS visual_suggestions (
      id TEXT PRIMARY KEY,
      scene_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      title TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      channel_title TEXT NOT NULL,
      embed_url TEXT NOT NULL,
      rank INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      default_segment_path TEXT,
      download_status TEXT DEFAULT 'pending' CHECK(download_status IN ('pending', 'downloading', 'complete', 'error')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
      UNIQUE(scene_id, video_id)
    )
  `);

  // Index for performance (Story 3.3 schema requirement)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_visual_suggestions_scene
    ON visual_suggestions(scene_id)
  `);

  // Index for scene lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_scenes_project
    ON scenes(project_id, scene_number)
  `);
}

/**
 * Pure function: Cleanup database
 * Removes all data while preserving schema
 */
export function cleanupDatabase(db: Database.Database): void {
  // Delete in reverse order of dependencies
  db.prepare('DELETE FROM visual_suggestions').run();
  db.prepare('DELETE FROM scenes').run();
  db.prepare('DELETE FROM projects').run();
}

/**
 * Pure function: Insert test project
 */
export function insertTestProject(db: Database.Database, project: TestProject): TestProject {
  const stmt = db.prepare(`
    INSERT INTO projects (id, name, topic, current_step, visuals_generated)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(
    project.id,
    project.name,
    project.topic,
    project.current_step,
    project.visuals_generated ? 1 : 0
  );

  return project;
}

/**
 * Pure function: Insert test scene
 */
export function insertTestScene(db: Database.Database, scene: TestScene): TestScene {
  const stmt = db.prepare(`
    INSERT INTO scenes (id, project_id, scene_number, text, duration)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(
    scene.id,
    scene.project_id,
    scene.scene_number,
    scene.text,
    scene.duration
  );

  return scene;
}

/**
 * Fixture: Clean database instance
 * Auto-cleanup after each test
 */
export const test = base.extend<{
  cleanDb: Database.Database;
  testProject: TestProject;
  testScene: TestScene;
  testScenes: TestScene[];
}>({
  // Fixture 1: Clean database (foundational)
  cleanDb: async ({}, use) => {
    const db = createCleanDatabase();

    // Provide database to test
    await use(db);

    // Auto-cleanup: Close database
    db.close();
  },

  // Fixture 2: Test project (depends on cleanDb)
  testProject: async ({ cleanDb }, use) => {
    // Create and insert test project
    const project = createTestProject({
      current_step: 'visual-sourcing',
      visuals_generated: false
    });

    insertTestProject(cleanDb, project);

    // Provide project to test
    await use(project);

    // Auto-cleanup: Handled by cleanDb closure
  },

  // Fixture 3: Single test scene (depends on testProject)
  testScene: async ({ cleanDb, testProject }, use) => {
    // Create and insert test scene
    const scene = createTestScene({
      project_id: testProject.id,
      scene_number: 1,
      text: 'A majestic lion roams the African savanna at sunset',
      duration: 45 // 45 seconds voiceover
    });

    insertTestScene(cleanDb, scene);

    // Provide scene to test
    await use(scene);

    // Auto-cleanup: Cascade delete via foreign key when project deleted
  },

  // Fixture 4: Multiple test scenes (depends on testProject)
  testScenes: async ({ cleanDb, testProject }, use) => {
    // Create and insert 5 test scenes
    const scenes: TestScene[] = [];

    for (let i = 1; i <= 5; i++) {
      const scene = createTestScene({
        project_id: testProject.id,
        scene_number: i,
        text: `Scene ${i}: ${['Wildlife documentary', 'Gaming footage', 'Tutorial content', 'Nature B-roll', 'Educational video'][i - 1]}`,
        duration: 30 + (i * 10) // 40s, 50s, 60s, 70s, 80s
      });

      insertTestScene(cleanDb, scene);
      scenes.push(scene);
    }

    // Provide scenes to test
    await use(scenes);

    // Auto-cleanup: Cascade delete via foreign key
  }
});

/**
 * Helper: Verify database schema
 * Used in schema validation tests (3.3-DB-001)
 */
export function getTableSchema(db: Database.Database, tableName: string): Array<{
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}> {
  return db.prepare(`PRAGMA table_info(${tableName})`).all() as any;
}

/**
 * Helper: Verify index exists
 * Used in index validation tests (3.3-DB-007)
 */
export function getIndexes(db: Database.Database, tableName: string): Array<{
  seq: number;
  name: string;
  unique: number;
  origin: string;
  partial: number;
}> {
  return db.prepare(`PRAGMA index_list(${tableName})`).all() as any;
}

/**
 * Helper: Get foreign keys
 * Used in cascade delete tests (3.3-DB-003)
 */
export function getForeignKeys(db: Database.Database, tableName: string): Array<{
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
  match: string;
}> {
  return db.prepare(`PRAGMA foreign_key_list(${tableName})`).all() as any;
}

/**
 * Export expect for convenience
 */
export { expect };
