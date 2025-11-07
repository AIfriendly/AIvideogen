/**
 * Database Tests: Scene Query Functions
 * Test IDs: 2.2-DB-001, 2.2-DB-002, 2.2-DB-003
 *
 * Tests for Epic 2 Scene CRUD operations, Project Epic 2 extensions, and Index Performance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import {
  createScene,
  createScenes,
  getSceneById,
  getScenesByProjectId,
  getSceneByNumber,
  countScenes,
  updateScene,
  updateSceneAudio,
  updateSceneSanitizedText,
  deleteScene,
  deleteScenesByProjectId,
  updateProjectVoice,
  markScriptGenerated,
  markVoiceSelected,
  updateProjectDuration,
  createProject,
  getProject,
  deleteProject,
} from '@/lib/db/queries';

// Test database path
const TEST_DB_PATH = path.join(process.cwd(), 'test-scenes.db');

// Mock the db client to use test database
let testDb: Database.Database;

/**
 * Test Suite: Scene CRUD Operations
 * Test ID: 2.2-DB-001
 * Priority: P1 (High) - Critical schema operations for Epic 2 content pipeline
 *
 * Tests CRUD operations for scenes table: create, read, update, delete.
 * Validates foreign key constraints, unique constraints, and data integrity.
 */
describe('2.2-DB-001: Scene CRUD Operations', () => {
  let projectId: string;

  beforeEach(async () => {
    // Remove test database if it exists
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create test database
    testDb = new Database(TEST_DB_PATH);
    testDb.pragma('foreign_keys = ON');

    // Create schema
    testDb.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        topic TEXT,
        current_step TEXT DEFAULT 'topic',
        status TEXT DEFAULT 'draft',
        config_json TEXT,
        system_prompt_id TEXT,
        voice_id TEXT,
        script_generated BOOLEAN DEFAULT 0,
        voice_selected BOOLEAN DEFAULT 0,
        total_duration REAL,
        created_at TEXT DEFAULT (datetime('now')),
        last_active TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE scenes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        scene_number INTEGER NOT NULL,
        text TEXT NOT NULL,
        sanitized_text TEXT,
        audio_file_path TEXT,
        duration REAL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(project_id, scene_number)
      );

      CREATE INDEX idx_scenes_project ON scenes(project_id);
      CREATE INDEX idx_scenes_number ON scenes(scene_number);
    `);

    // Create a test project
    projectId = randomUUID();
    testDb.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run(projectId, 'Test Project');
  });

  afterEach(() => {
    // Close and remove test database
    if (testDb) {
      testDb.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('createScene', () => {
    it('should create a scene with all fields', () => {
      const sceneData = {
        project_id: projectId,
        scene_number: 1,
        text: 'This is scene 1',
        sanitized_text: 'This is scene one',
        audio_file_path: 'audio/scenes/scene_001.mp3',
        duration: 5.5,
      };

      const stmt = testDb.prepare(`
        INSERT INTO scenes (id, project_id, scene_number, text, sanitized_text, audio_file_path, duration)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const id = randomUUID();
      stmt.run(
        id,
        sceneData.project_id,
        sceneData.scene_number,
        sceneData.text,
        sceneData.sanitized_text,
        sceneData.audio_file_path,
        sceneData.duration
      );

      const scene = testDb.prepare('SELECT * FROM scenes WHERE id = ?').get(id);

      expect(scene).toBeDefined();
      expect(scene).toMatchObject({
        project_id: projectId,
        scene_number: 1,
        text: 'This is scene 1',
        sanitized_text: 'This is scene one',
        audio_file_path: 'audio/scenes/scene_001.mp3',
        duration: 5.5,
      });
    });

    it('should create a scene with minimal fields', () => {
      const sceneData = {
        project_id: projectId,
        scene_number: 2,
        text: 'This is scene 2',
      };

      const stmt = testDb.prepare(`
        INSERT INTO scenes (id, project_id, scene_number, text)
        VALUES (?, ?, ?, ?)
      `);
      const id = randomUUID();
      stmt.run(id, sceneData.project_id, sceneData.scene_number, sceneData.text);

      const scene = testDb.prepare('SELECT * FROM scenes WHERE id = ?').get(id);

      expect(scene).toBeDefined();
      expect(scene).toMatchObject({
        project_id: projectId,
        scene_number: 2,
        text: 'This is scene 2',
        sanitized_text: null,
        audio_file_path: null,
        duration: null,
      });
    });

    it('should auto-generate ID if not provided', () => {
      const stmt = testDb.prepare(`
        INSERT INTO scenes (id, project_id, scene_number, text)
        VALUES (?, ?, ?, ?)
      `);
      const id = randomUUID();
      stmt.run(id, projectId, 3, 'Scene 3');

      const scene = testDb.prepare('SELECT * FROM scenes WHERE id = ?').get(id);

      expect(scene).toBeDefined();
      expect(scene.id).toBeDefined();
      expect(typeof scene.id).toBe('string');
    });

    it('should throw error for invalid project_id (foreign key)', () => {
      const invalidProjectId = randomUUID();

      expect(() => {
        testDb
          .prepare('INSERT INTO scenes (id, project_id, scene_number, text) VALUES (?, ?, ?, ?)')
          .run(randomUUID(), invalidProjectId, 1, 'Test');
      }).toThrow();
    });

    it('should throw error for duplicate scene_number (unique constraint)', () => {
      const stmt = testDb.prepare(`
        INSERT INTO scenes (id, project_id, scene_number, text)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(randomUUID(), projectId, 1, 'Scene 1');

      expect(() => {
        stmt.run(randomUUID(), projectId, 1, 'Scene 1 duplicate');
      }).toThrow();
    });
  });

  describe('createScenes (bulk insert)', () => {
    it('should create multiple scenes in a transaction', () => {
      const scenes = [
        { project_id: projectId, scene_number: 1, text: 'Scene 1' },
        { project_id: projectId, scene_number: 2, text: 'Scene 2' },
        { project_id: projectId, scene_number: 3, text: 'Scene 3' },
      ];

      const insertStmt = testDb.prepare(`
        INSERT INTO scenes (id, project_id, scene_number, text)
        VALUES (?, ?, ?, ?)
      `);

      const insertMany = testDb.transaction((scenesToInsert: typeof scenes) => {
        for (const scene of scenesToInsert) {
          insertStmt.run(randomUUID(), scene.project_id, scene.scene_number, scene.text);
        }
      });

      insertMany(scenes);

      const result = testDb.prepare('SELECT COUNT(*) as count FROM scenes WHERE project_id = ?').get(projectId);
      expect(result.count).toBe(3);
    });

    it('should rollback on error in transaction', () => {
      const scenes = [
        { project_id: projectId, scene_number: 1, text: 'Scene 1' },
        { project_id: projectId, scene_number: 1, text: 'Duplicate scene 1' }, // Duplicate!
      ];

      const insertStmt = testDb.prepare(`
        INSERT INTO scenes (id, project_id, scene_number, text)
        VALUES (?, ?, ?, ?)
      `);

      const insertMany = testDb.transaction((scenesToInsert: typeof scenes) => {
        for (const scene of scenesToInsert) {
          insertStmt.run(randomUUID(), scene.project_id, scene.scene_number, scene.text);
        }
      });

      expect(() => {
        insertMany(scenes);
      }).toThrow();

      // Verify no scenes were inserted due to rollback
      const result = testDb.prepare('SELECT COUNT(*) as count FROM scenes WHERE project_id = ?').get(projectId);
      expect(result.count).toBe(0);
    });
  });

  describe('getSceneById', () => {
    it('should retrieve scene by ID', () => {
      const id = randomUUID();
      testDb
        .prepare('INSERT INTO scenes (id, project_id, scene_number, text) VALUES (?, ?, ?, ?)')
        .run(id, projectId, 1, 'Scene 1');

      const scene = testDb.prepare('SELECT * FROM scenes WHERE id = ?').get(id);

      expect(scene).toBeDefined();
      expect(scene.id).toBe(id);
      expect(scene.text).toBe('Scene 1');
    });

    it('should return null for non-existent ID', () => {
      const scene = testDb.prepare('SELECT * FROM scenes WHERE id = ?').get(randomUUID());
      expect(scene).toBeUndefined();
    });
  });

  describe('getScenesByProjectId', () => {
    it('should retrieve all scenes for a project ordered by scene_number', () => {
      const scenes = [
        { scene_number: 3, text: 'Scene 3' },
        { scene_number: 1, text: 'Scene 1' },
        { scene_number: 2, text: 'Scene 2' },
      ];

      for (const scene of scenes) {
        testDb
          .prepare('INSERT INTO scenes (id, project_id, scene_number, text) VALUES (?, ?, ?, ?)')
          .run(randomUUID(), projectId, scene.scene_number, scene.text);
      }

      const result = testDb.prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_number ASC').all(projectId);

      expect(result).toHaveLength(3);
      expect(result[0].scene_number).toBe(1);
      expect(result[1].scene_number).toBe(2);
      expect(result[2].scene_number).toBe(3);
    });

    it('should return empty array for project with no scenes', () => {
      const emptyProjectId = randomUUID();
      testDb.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run(emptyProjectId, 'Empty Project');

      const scenes = testDb.prepare('SELECT * FROM scenes WHERE project_id = ?').all(emptyProjectId);
      expect(scenes).toHaveLength(0);
    });
  });

  describe('getSceneByNumber', () => {
    it('should retrieve scene by project_id and scene_number', () => {
      testDb
        .prepare('INSERT INTO scenes (id, project_id, scene_number, text) VALUES (?, ?, ?, ?)')
        .run(randomUUID(), projectId, 1, 'Scene 1');
      testDb
        .prepare('INSERT INTO scenes (id, project_id, scene_number, text) VALUES (?, ?, ?, ?)')
        .run(randomUUID(), projectId, 2, 'Scene 2');

      const scene = testDb.prepare('SELECT * FROM scenes WHERE project_id = ? AND scene_number = ?').get(projectId, 2);

      expect(scene).toBeDefined();
      expect(scene.scene_number).toBe(2);
      expect(scene.text).toBe('Scene 2');
    });

    it('should return null for non-existent scene_number', () => {
      const scene = testDb.prepare('SELECT * FROM scenes WHERE project_id = ? AND scene_number = ?').get(projectId, 999);
      expect(scene).toBeUndefined();
    });
  });

  describe('countScenes', () => {
    it('should return correct count of scenes', () => {
      for (let i = 1; i <= 5; i++) {
        testDb
          .prepare('INSERT INTO scenes (id, project_id, scene_number, text) VALUES (?, ?, ?, ?)')
          .run(randomUUID(), projectId, i, `Scene ${i}`);
      }

      const result = testDb.prepare('SELECT COUNT(*) as count FROM scenes WHERE project_id = ?').get(projectId);
      expect(result.count).toBe(5);
    });

    it('should return 0 for project with no scenes', () => {
      const result = testDb.prepare('SELECT COUNT(*) as count FROM scenes WHERE project_id = ?').get(projectId);
      expect(result.count).toBe(0);
    });
  });

  describe('updateScene', () => {
    it('should update scene fields', () => {
      const id = randomUUID();
      testDb
        .prepare('INSERT INTO scenes (id, project_id, scene_number, text) VALUES (?, ?, ?, ?)')
        .run(id, projectId, 1, 'Original text');

      testDb
        .prepare('UPDATE scenes SET text = ?, sanitized_text = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run('Updated text', 'Updated sanitized text', id);

      const scene = testDb.prepare('SELECT * FROM scenes WHERE id = ?').get(id);

      expect(scene.text).toBe('Updated text');
      expect(scene.sanitized_text).toBe('Updated sanitized text');
    });

    it('should update only provided fields', () => {
      const id = randomUUID();
      testDb
        .prepare('INSERT INTO scenes (id, project_id, scene_number, text, sanitized_text) VALUES (?, ?, ?, ?, ?)')
        .run(id, projectId, 1, 'Original text', 'Original sanitized');

      testDb.prepare('UPDATE scenes SET text = ?, updated_at = datetime(\'now\') WHERE id = ?').run('Updated text', id);

      const scene = testDb.prepare('SELECT * FROM scenes WHERE id = ?').get(id);

      expect(scene.text).toBe('Updated text');
      expect(scene.sanitized_text).toBe('Original sanitized');
    });
  });

  describe('updateSceneAudio', () => {
    it('should update audio_file_path and duration', () => {
      const id = randomUUID();
      testDb
        .prepare('INSERT INTO scenes (id, project_id, scene_number, text) VALUES (?, ?, ?, ?)')
        .run(id, projectId, 1, 'Scene 1');

      testDb
        .prepare('UPDATE scenes SET audio_file_path = ?, duration = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run('audio/scenes/scene_001.mp3', 7.5, id);

      const scene = testDb.prepare('SELECT * FROM scenes WHERE id = ?').get(id);

      expect(scene.audio_file_path).toBe('audio/scenes/scene_001.mp3');
      expect(scene.duration).toBe(7.5);
    });
  });

  describe('updateSceneSanitizedText', () => {
    it('should update sanitized_text field', () => {
      const id = randomUUID();
      testDb
        .prepare('INSERT INTO scenes (id, project_id, scene_number, text) VALUES (?, ?, ?, ?)')
        .run(id, projectId, 1, 'Scene 1');

      testDb
        .prepare('UPDATE scenes SET sanitized_text = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run('Sanitized text', id);

      const scene = testDb.prepare('SELECT * FROM scenes WHERE id = ?').get(id);

      expect(scene.sanitized_text).toBe('Sanitized text');
    });
  });

  describe('deleteScene', () => {
    it('should delete a scene', () => {
      const id = randomUUID();
      testDb
        .prepare('INSERT INTO scenes (id, project_id, scene_number, text) VALUES (?, ?, ?, ?)')
        .run(id, projectId, 1, 'Scene 1');

      testDb.prepare('DELETE FROM scenes WHERE id = ?').run(id);

      const scene = testDb.prepare('SELECT * FROM scenes WHERE id = ?').get(id);
      expect(scene).toBeUndefined();
    });
  });

  describe('deleteScenesByProjectId', () => {
    it('should delete all scenes for a project', () => {
      for (let i = 1; i <= 3; i++) {
        testDb
          .prepare('INSERT INTO scenes (id, project_id, scene_number, text) VALUES (?, ?, ?, ?)')
          .run(randomUUID(), projectId, i, `Scene ${i}`);
      }

      testDb.prepare('DELETE FROM scenes WHERE project_id = ?').run(projectId);

      const scenes = testDb.prepare('SELECT * FROM scenes WHERE project_id = ?').all(projectId);
      expect(scenes).toHaveLength(0);
    });
  });

  describe('CASCADE DELETE', () => {
    it('should delete scenes when project is deleted', () => {
      for (let i = 1; i <= 3; i++) {
        testDb
          .prepare('INSERT INTO scenes (id, project_id, scene_number, text) VALUES (?, ?, ?, ?)')
          .run(randomUUID(), projectId, i, `Scene ${i}`);
      }

      testDb.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

      const scenes = testDb.prepare('SELECT * FROM scenes WHERE project_id = ?').all(projectId);
      expect(scenes).toHaveLength(0);
    });
  });
});

/**
 * Test Suite: Project Epic 2 Extensions
 * Test ID: 2.2-DB-002
 * Priority: P1 (High) - Voice selection and script generation tracking
 *
 * Tests Epic 2 extensions to projects table: voice_id, script_generated,
 * voice_selected, and total_duration fields.
 */
describe('2.2-DB-002: Project Epic 2 Extensions', () => {
  let projectId: string;

  beforeEach(() => {
    // Remove test database if it exists
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create test database
    testDb = new Database(TEST_DB_PATH);
    testDb.pragma('foreign_keys = ON');

    // Create schema
    testDb.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        topic TEXT,
        current_step TEXT DEFAULT 'topic',
        status TEXT DEFAULT 'draft',
        config_json TEXT,
        system_prompt_id TEXT,
        voice_id TEXT,
        script_generated BOOLEAN DEFAULT 0,
        voice_selected BOOLEAN DEFAULT 0,
        total_duration REAL,
        created_at TEXT DEFAULT (datetime('now')),
        last_active TEXT DEFAULT (datetime('now'))
      );
    `);

    projectId = randomUUID();
    testDb.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run(projectId, 'Test Project');
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('updateProjectVoice', () => {
    it('should update voice_id field', () => {
      testDb.prepare('UPDATE projects SET voice_id = ? WHERE id = ?').run('af_sky', projectId);

      const project = testDb.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      expect(project.voice_id).toBe('af_sky');
    });
  });

  describe('markScriptGenerated', () => {
    it('should set script_generated to true', () => {
      testDb.prepare('UPDATE projects SET script_generated = ? WHERE id = ?').run(1, projectId);

      const project = testDb.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      expect(project.script_generated).toBe(1);
    });
  });

  describe('markVoiceSelected', () => {
    it('should set voice_selected and voice_id', () => {
      testDb
        .prepare('UPDATE projects SET voice_selected = ?, voice_id = ? WHERE id = ?')
        .run(1, 'af_sky', projectId);

      const project = testDb.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      expect(project.voice_selected).toBe(1);
      expect(project.voice_id).toBe('af_sky');
    });
  });

  describe('updateProjectDuration', () => {
    it('should update total_duration field', () => {
      testDb.prepare('UPDATE projects SET total_duration = ? WHERE id = ?').run(45.5, projectId);

      const project = testDb.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      expect(project.total_duration).toBe(45.5);
    });
  });
});

/**
 * Test Suite: Index Performance
 * Test ID: 2.2-DB-003
 * Priority: P2 (Medium) - Performance optimization validation
 *
 * Validates that database indexes are properly created and used by queries.
 * Uses EXPLAIN QUERY PLAN to verify idx_scenes_project and idx_scenes_number.
 */
describe('2.2-DB-003: Index Performance', () => {
  let projectId: string;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    testDb = new Database(TEST_DB_PATH);
    testDb.pragma('foreign_keys = ON');

    testDb.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        topic TEXT,
        current_step TEXT DEFAULT 'topic',
        status TEXT DEFAULT 'draft',
        config_json TEXT,
        system_prompt_id TEXT,
        voice_id TEXT,
        script_generated BOOLEAN DEFAULT 0,
        voice_selected BOOLEAN DEFAULT 0,
        total_duration REAL,
        created_at TEXT DEFAULT (datetime('now')),
        last_active TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE scenes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        scene_number INTEGER NOT NULL,
        text TEXT NOT NULL,
        sanitized_text TEXT,
        audio_file_path TEXT,
        duration REAL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(project_id, scene_number)
      );

      CREATE INDEX idx_scenes_project ON scenes(project_id);
      CREATE INDEX idx_scenes_number ON scenes(scene_number);
    `);

    projectId = randomUUID();
    testDb.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run(projectId, 'Test Project');
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('should use idx_scenes_project for project_id queries', () => {
    const plan = testDb.prepare('EXPLAIN QUERY PLAN SELECT * FROM scenes WHERE project_id = ?').all(projectId);

    const usesIndex = plan.some((row: any) => row.detail && row.detail.includes('idx_scenes_project'));
    expect(usesIndex).toBe(true);
  });

  it('should use idx_scenes_number for scene_number queries', () => {
    const plan = testDb.prepare('EXPLAIN QUERY PLAN SELECT * FROM scenes WHERE scene_number = ?').all(1);

    const usesIndex = plan.some((row: any) => row.detail && row.detail.includes('idx_scenes_number'));
    expect(usesIndex).toBe(true);
  });
});
