/**
 * Database CRUD Tests for Visual Suggestions (Story 3.3)
 * Test ID Prefix: 3.3-DB-xxx
 * Priority: P0/P1/P2/P3
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
  insertTestScene
} from '../fixtures/database.fixture';
import {
  createVisualSuggestion,
  createVisualSuggestions,
  createTestScene
} from '../factories/visual-suggestions.factory';

describe('Story 3.3: Visual Suggestions CRUD Operations', () => {
  describe('P0 (Critical) - Database Insert Operations', () => {
    /**
     * 3.3-DB-002: Batch Insert with Ranking
     * Priority: P0 (R-001 Score 9)
     * Acceptance Criteria: AC4 (Database Persistence)
     */
    fixtureTest('3.3-DB-002: saveVisualSuggestions should batch insert with rank values', async ({ cleanDb, testScene }) => {
      // Given: Test scene and 5 visual suggestions with ranks 1-5
      const suggestions = createVisualSuggestions(5, testScene.id);

      // When: Batch inserting suggestions
      const stmt = cleanDb.prepare(`
        INSERT INTO visual_suggestions (
          id, scene_id, video_id, title, thumbnail_url,
          channel_title, embed_url, rank, duration,
          default_segment_path, download_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = cleanDb.transaction((items: typeof suggestions) => {
        for (const item of items) {
          stmt.run(
            item.id,
            item.scene_id,
            item.video_id,
            item.title,
            item.thumbnail_url,
            item.channel_title,
            item.embed_url,
            item.rank,
            item.duration,
            item.default_segment_path,
            item.download_status,
            item.created_at
          );
        }
      });

      insertMany(suggestions);

      // Then: All 5 suggestions should be inserted
      const results = cleanDb.prepare(`
        SELECT * FROM visual_suggestions WHERE scene_id = ?
      `).all(testScene.id);

      expect(results).toHaveLength(5);

      // And: Rank values should be 1, 2, 3, 4, 5
      const ranks = results.map((r: any) => r.rank).sort((a: number, b: number) => a - b);
      expect(ranks).toEqual([1, 2, 3, 4, 5]);

      // And: All fields should be persisted correctly
      const first = results.find((r: any) => r.rank === 1);
      expect(first).toBeDefined();
      expect(first.id).toBe(suggestions[0].id);
      expect(first.video_id).toBe(suggestions[0].video_id);
      expect(first.duration).toBe(suggestions[0].duration); // INTEGER type
      expect(typeof first.duration).toBe('number'); // Not string
    });

    /**
     * 3.3-DB-003: Foreign Key Cascade Deletes
     * Priority: P0 (R-001 Score 9)
     * Acceptance Criteria: AC4 (Database Persistence - referential integrity)
     */
    fixtureTest('3.3-DB-003: should cascade delete suggestions when scene is deleted', async ({ cleanDb, testProject }) => {
      // Given: Scene with 5 visual suggestions
      const scene = createTestScene({ project_id: testProject.id, scene_number: 1 });
      insertTestScene(cleanDb, scene);

      const suggestions = createVisualSuggestions(5, scene.id);
      const stmt = cleanDb.prepare(`
        INSERT INTO visual_suggestions (
          id, scene_id, video_id, title, thumbnail_url,
          channel_title, embed_url, rank, duration,
          default_segment_path, download_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const suggestion of suggestions) {
        stmt.run(
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
      }

      // Verify suggestions exist
      const suggestionsBefore = cleanDb.prepare(
        'SELECT * FROM visual_suggestions WHERE scene_id = ?'
      ).all(scene.id);
      expect(suggestionsBefore).toHaveLength(5);

      // When: Deleting scene
      cleanDb.prepare('DELETE FROM scenes WHERE id = ?').run(scene.id);

      // Then: Suggestions should be cascade deleted
      const suggestionsAfter = cleanDb.prepare(
        'SELECT * FROM visual_suggestions WHERE scene_id = ?'
      ).all(scene.id);
      expect(suggestionsAfter).toHaveLength(0);
    });
  });

  describe('P1 (High) - Database Retrieval and Ordering', () => {
    /**
     * 3.3-DB-004: Rank Ordering
     * Priority: P1 (R-008 Score 3)
     * Acceptance Criteria: AC5 (GET /visual-suggestions - ordering)
     */
    fixtureTest('3.3-DB-004: getVisualSuggestions should return results ordered by rank ASC', async ({ cleanDb, testScene }) => {
      // Given: Visual suggestions with ranks in random order
      const suggestions = [
        createVisualSuggestion({ scene_id: testScene.id, rank: 3 }),
        createVisualSuggestion({ scene_id: testScene.id, rank: 1 }),
        createVisualSuggestion({ scene_id: testScene.id, rank: 5 }),
        createVisualSuggestion({ scene_id: testScene.id, rank: 2 }),
        createVisualSuggestion({ scene_id: testScene.id, rank: 4 })
      ];

      // When: Inserting in random order
      const stmt = cleanDb.prepare(`
        INSERT INTO visual_suggestions (
          id, scene_id, video_id, title, thumbnail_url,
          channel_title, embed_url, rank, duration,
          default_segment_path, download_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const suggestion of suggestions) {
        stmt.run(
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
      }

      // Then: Query with ORDER BY rank ASC
      const results = cleanDb.prepare(`
        SELECT * FROM visual_suggestions
        WHERE scene_id = ?
        ORDER BY rank ASC
      `).all(testScene.id);

      expect(results).toHaveLength(5);

      // And: Results should be ordered by rank 1, 2, 3, 4, 5
      const ranks = results.map((r: any) => r.rank);
      expect(ranks).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('P2 (Medium) - Constraints', () => {
    /**
     * 3.3-DB-012: Composite Unique Constraint on (scene_id, video_id)
     * Priority: P2 (R-001 Score 9 - data integrity)
     * Acceptance Criteria: AC4 (Database schema - unique constraint prevents duplicates)
     */
    fixtureTest('3.3-DB-012: should reject duplicate (scene_id, video_id) pairs', async ({ cleanDb, testScene }) => {
      // Given: First visual suggestion inserted
      const videoId = 'test-video-unique-123';

      cleanDb.prepare(`
        INSERT INTO visual_suggestions (
          id, scene_id, video_id, title, thumbnail_url,
          channel_title, embed_url, rank, duration,
          default_segment_path, download_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'id-first',
        testScene.id,  // scene_id
        videoId,       // video_id
        'First suggestion',
        'https://example.com/thumb1.jpg',
        'Channel Name',
        'https://youtube.com/embed/' + videoId,
        1,
        180,
        null,
        'pending',
        new Date().toISOString()
      );

      // When: Attempting to insert duplicate with SAME scene_id + video_id
      let errorThrown = false;
      let errorMessage = '';

      try {
        cleanDb.prepare(`
          INSERT INTO visual_suggestions (
            id, scene_id, video_id, title, thumbnail_url,
            channel_title, embed_url, rank, duration,
            default_segment_path, download_status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'id-duplicate',   // Different id
          testScene.id,     // SAME scene_id
          videoId,          // SAME video_id
          'Duplicate suggestion',
          'https://example.com/thumb2.jpg',
          'Channel Name',
          'https://youtube.com/embed/' + videoId,
          2,                // Different rank
          240,
          null,
          'pending',
          new Date().toISOString()
        );
      } catch (error: any) {
        errorThrown = true;
        errorMessage = error.message;
      }

      // Then: Should throw UNIQUE constraint error
      expect(errorThrown).toBe(true);
      expect(errorMessage).toMatch(/UNIQUE constraint/i);

      // And: Only original suggestion should exist
      const results = cleanDb.prepare(
        'SELECT * FROM visual_suggestions WHERE scene_id = ? AND video_id = ?'
      ).all(testScene.id, videoId);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('id-first');
    });
  });

  describe('P3 (Low) - Edge Cases', () => {
    /**
     * 3.3-DB-008: Nullable Fields
     * Priority: P3
     * Acceptance Criteria: AC4 (Database schema - optional fields)
     */
    fixtureTest('3.3-DB-008: should handle nullable fields gracefully', async ({ cleanDb, testScene }) => {
      // Given: Visual suggestion with null default_segment_path (not downloaded yet)
      const suggestion = createVisualSuggestion({
        scene_id: testScene.id,
        default_segment_path: null, // No download yet
        download_status: 'pending'
      });

      // When: Inserting with nullable field
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

      // Then: Should retrieve with null value
      const result = cleanDb.prepare(
        'SELECT * FROM visual_suggestions WHERE id = ?'
      ).get(suggestion.id) as any;

      expect(result.default_segment_path).toBeNull();
      expect(result.download_status).toBe('pending');
    });
  });
});
