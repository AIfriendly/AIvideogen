/**
 * Database Schema Tests for Visual Suggestions (Story 3.3)
 * Test ID Prefix: 3.3-DB-xxx
 * Priority: P0 (Critical) - R-001 (Score 9) - Database schema mismatch
 *
 * Following TEA test-quality.md best practices:
 * - BDD format (Given-When-Then)
 * - Test IDs for traceability
 * - Isolated (fixtures with auto-cleanup)
 * - Deterministic (no race conditions)
 */

import { describe, test, expect } from 'vitest';
import {
  test as fixtureTest,
  createCleanDatabase,
  insertTestScene,
  getTableSchema,
  getIndexes,
  getForeignKeys
} from '../fixtures/database.fixture';
import {
  createVisualSuggestion,
  createTestScene
} from '../factories/visual-suggestions.factory';

describe('Story 3.3: Visual Suggestions Schema Validation', () => {
  describe('P0 (Critical) - Database Schema Validation', () => {
    /**
     * 3.3-DB-001: Schema Validation Test
     * Priority: P0 (HIGHEST - R-001 Score 9)
     * Acceptance Criteria: AC4 (Database Persistence)
     */
    test('3.3-DB-001: visual_suggestions table should have correct schema', () => {
      // Given: Clean database with schema applied
      const db = createCleanDatabase();

      try {
        // When: Querying table schema
        const schema = getTableSchema(db, 'visual_suggestions');
        const fieldNames = schema.map(col => col.name);
        const fieldTypes = new Map(schema.map(col => [col.name, col.type]));

        // Then: All required fields must exist
        expect(fieldNames).toContain('id');
        expect(fieldNames).toContain('scene_id');
        expect(fieldNames).toContain('video_id');
        expect(fieldNames).toContain('title');
        expect(fieldNames).toContain('thumbnail_url');
        expect(fieldNames).toContain('channel_title');
        expect(fieldNames).toContain('embed_url');
        expect(fieldNames).toContain('rank');
        expect(fieldNames).toContain('duration');
        expect(fieldNames).toContain('default_segment_path');
        expect(fieldNames).toContain('download_status');
        expect(fieldNames).toContain('created_at');

        // And: Removed fields should NOT exist (normalized design from tech spec)
        expect(fieldNames).not.toContain('project_id'); // Normalized via scene_id
        expect(fieldNames).not.toContain('description'); // Removed in tech spec
        expect(fieldNames).not.toContain('relevance_score'); // Removed in tech spec
        expect(fieldNames).not.toContain('view_count'); // Removed in tech spec
        expect(fieldNames).not.toContain('published_at'); // Removed in tech spec

        // And: SQLite-compatible types must be used (not PostgreSQL types)
        expect(fieldTypes.get('id')).toBe('TEXT'); // NOT UUID type
        expect(fieldTypes.get('scene_id')).toBe('TEXT');
        expect(fieldTypes.get('rank')).toBe('INTEGER'); // NOT INT
        expect(fieldTypes.get('duration')).toBe('INTEGER'); // Duration in seconds as INTEGER
        expect(fieldTypes.get('created_at')).toBe('TEXT'); // NOT TIMESTAMP

        // And: Primary key should be 'id'
        const idField = schema.find(col => col.name === 'id');
        expect(idField?.pk).toBe(1); // Primary key flag
      } finally {
        db.close();
      }
    });

    /**
     * 3.3-DB-005: Removed Fields Validation
     * Priority: P2
     * Acceptance Criteria: AC4 (Database schema - normalized design)
     */
    test('3.3-DB-005: schema should NOT include removed fields (project_id, description)', () => {
      // Given: Clean database with schema
      const db = createCleanDatabase();

      try {
        // When: Querying schema
        const schema = getTableSchema(db, 'visual_suggestions');
        const fieldNames = schema.map(col => col.name);

        // Then: Normalized design should not have project_id (use scene_id → scenes → project_id)
        expect(fieldNames).not.toContain('project_id');

        // And: Tech spec removed these fields
        expect(fieldNames).not.toContain('description');
        expect(fieldNames).not.toContain('relevance_score');
        expect(fieldNames).not.toContain('published_at');
        expect(fieldNames).not.toContain('view_count');
        expect(fieldNames).not.toContain('like_count');
      } finally {
        db.close();
      }
    });

    /**
     * 3.3-DB-006: Duration Field Type Validation
     * Priority: P2 (R-004 Score 6)
     * Acceptance Criteria: AC1 (searchVideos returns duration in seconds)
     */
    fixtureTest('3.3-DB-006: duration field should store integer seconds, not string', async ({ cleanDb, testScene }) => {
      // Given: Visual suggestion with duration as integer
      const suggestion = createVisualSuggestion({
        scene_id: testScene.id,
        duration: 253 // "PT4M13S" → 253 seconds
      });

      // When: Inserting suggestion
      cleanDb.prepare(`
        INSERT INTO visual_suggestions (
          id, scene_id, video_id, title, thumbnail_url,
          channel_title, embed_url, rank, duration,
          default_segment_path, download_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        suggestion.id,
        suggestion.scene_id,
        suggestion.video_id,
        suggestion.title,
        suggestion.thumbnail_url,
        suggestion.channel_title,
        suggestion.embed_url,
        suggestion.rank,
        suggestion.duration,
        suggestion.default_segment_path,
        suggestion.download_status,
        suggestion.created_at
      );

      // Then: Retrieving should return INTEGER type
      const result = cleanDb.prepare(
        'SELECT duration FROM visual_suggestions WHERE id = ?'
      ).get(suggestion.id) as { duration: number };

      expect(result.duration).toBe(253);
      expect(typeof result.duration).toBe('number'); // Not string "253"

      // And: Schema should define duration as INTEGER
      const schema = getTableSchema(cleanDb, 'visual_suggestions');
      const durationField = schema.find(col => col.name === 'duration');
      expect(durationField?.type).toBe('INTEGER');
    });

    /**
     * 3.3-DB-007: Index on scene_id for Performance
     * Priority: P2 (R-011 Score 2)
     * Acceptance Criteria: AC4 (Database schema - performance optimization)
     */
    test('3.3-DB-007: should create index on scene_id for query performance', () => {
      // Given: Clean database with schema
      const db = createCleanDatabase();

      try {
        // When: Querying indexes
        const indexes = getIndexes(db, 'visual_suggestions');
        const indexNames = indexes.map(idx => idx.name);

        // Then: Index on scene_id should exist
        expect(indexNames).toContain('idx_visual_suggestions_scene');

        // And: Foreign key should reference scenes table
        const foreignKeys = getForeignKeys(db, 'visual_suggestions');
        const sceneFK = foreignKeys.find(fk => fk.from === 'scene_id');

        expect(sceneFK).toBeDefined();
        expect(sceneFK?.table).toBe('scenes');
        expect(sceneFK?.on_delete).toBe('CASCADE'); // Cascade delete configured
      } finally {
        db.close();
      }
    });
  });
});
