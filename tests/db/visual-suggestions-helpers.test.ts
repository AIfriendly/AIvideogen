/**
 * Database Helper Function Tests for Visual Suggestions (Story 3.3)
 * Test ID Prefix: 3.3-DB-xxx
 * Priority: P2
 *
 * Following TEA test-quality.md best practices:
 * - BDD format (Given-When-Then)
 * - Test IDs for traceability
 * - Isolated (fixtures with auto-cleanup)
 * - Deterministic (no race conditions)
 */

import { describe, expect } from 'vitest';
import {
  test as fixtureTest,
  insertTestScene
} from '../fixtures/database.fixture';
import {
  createVisualSuggestions,
  createTestScene
} from '../factories/visual-suggestions.factory';

describe('Story 3.3: Visual Suggestions Helper Functions', () => {
  describe('P2 (Medium) - Helper Functions', () => {
    /**
     * 3.3-DB-009: getScenesCount Query Logic
     * Priority: P2 (R-011 Score 2)
     * Acceptance Criteria: AC8 (Helper functions - getScenesCount)
     */
    fixtureTest('3.3-DB-009: should count total scenes in project accurately', async ({ cleanDb, testProject }) => {
      // Given: Project with 5 scenes
      const scenes = Array.from({ length: 5 }, (_, i) =>
        createTestScene({ project_id: testProject.id, scene_number: i + 1 })
      );

      scenes.forEach(scene => insertTestScene(cleanDb, scene));

      // When: Counting scenes using query (same logic as getScenesCount helper)
      const stmt = cleanDb.prepare('SELECT COUNT(*) as count FROM scenes WHERE project_id = ?');
      const result = stmt.get(testProject.id) as { count: number };

      // Then: Should return 5
      expect(result.count).toBe(5);
      expect(typeof result.count).toBe('number');
    });

    /**
     * 3.3-DB-010: getScenesWithSuggestionsCount Query Logic
     * Priority: P2 (R-011 Score 2)
     * Acceptance Criteria: AC8 (Helper functions - getScenesWithSuggestionsCount)
     */
    fixtureTest('3.3-DB-010: should count scenes with suggestions using JOIN query', async ({ cleanDb, testProject }) => {
      // Given: Project with 5 scenes, only 3 have visual suggestions
      const scenes = Array.from({ length: 5 }, (_, i) =>
        createTestScene({ project_id: testProject.id, scene_number: i + 1 })
      );

      scenes.forEach(scene => insertTestScene(cleanDb, scene));

      // And: Add suggestions to scenes 1, 2, and 3 only
      [scenes[0], scenes[1], scenes[2]].forEach(scene => {
        const suggestions = createVisualSuggestions(2, scene.id);
        const stmt = cleanDb.prepare(`
          INSERT INTO visual_suggestions (
            id, scene_id, video_id, title, thumbnail_url,
            channel_title, embed_url, rank, duration,
            default_segment_path, download_status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        suggestions.forEach(suggestion => {
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
        });
      });

      // When: Counting scenes with suggestions using query (same logic as helper)
      const stmt = cleanDb.prepare(`
        SELECT COUNT(DISTINCT s.id) as count
        FROM scenes s
        INNER JOIN visual_suggestions vs ON s.id = vs.scene_id
        WHERE s.project_id = ?
      `);
      const result = stmt.get(testProject.id) as { count: number };

      // Then: Should return 3 (not 5)
      expect(result.count).toBe(3);
      expect(typeof result.count).toBe('number');
    });

    /**
     * 3.3-DB-011: getScenesWithVisualSuggestions Query Logic
     * Priority: P2 (R-011 Score 2)
     * Acceptance Criteria: AC8 (Helper functions - getScenesWithVisualSuggestions)
     */
    fixtureTest('3.3-DB-011: should return scene IDs that have visual suggestions', async ({ cleanDb, testProject }) => {
      // Given: Project with 4 scenes, only scenes 1 and 3 have suggestions
      const scenes = Array.from({ length: 4 }, (_, i) =>
        createTestScene({ project_id: testProject.id, scene_number: i + 1 })
      );

      scenes.forEach(scene => insertTestScene(cleanDb, scene));

      // And: Add suggestions to scenes 1 and 3 only
      [scenes[0], scenes[2]].forEach(scene => {
        const suggestions = createVisualSuggestions(1, scene.id);
        cleanDb.prepare(`
          INSERT INTO visual_suggestions (
            id, scene_id, video_id, title, thumbnail_url,
            channel_title, embed_url, rank, duration,
            default_segment_path, download_status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          suggestions[0].id,
          suggestions[0].scene_id,
          suggestions[0].video_id,
          suggestions[0].title,
          suggestions[0].thumbnail_url,
          suggestions[0].channel_title,
          suggestions[0].embed_url,
          suggestions[0].rank,
          suggestions[0].duration,
          suggestions[0].default_segment_path,
          suggestions[0].download_status,
          suggestions[0].created_at
        );
      });

      // When: Getting scene IDs with suggestions using query (same logic as helper)
      const stmt = cleanDb.prepare(`
        SELECT DISTINCT s.id
        FROM scenes s
        INNER JOIN visual_suggestions vs ON s.id = vs.scene_id
        WHERE s.project_id = ?
      `);
      const results = stmt.all(testProject.id) as Array<{ id: string }>;
      const sceneIds = results.map(r => r.id);

      // Then: Should return array with 2 scene IDs
      expect(Array.isArray(sceneIds)).toBe(true);
      expect(sceneIds).toHaveLength(2);
      expect(sceneIds).toContain(scenes[0].id); // Scene 1
      expect(sceneIds).toContain(scenes[2].id); // Scene 3
      expect(sceneIds).not.toContain(scenes[1].id); // Scene 2 (no suggestions)
      expect(sceneIds).not.toContain(scenes[3].id); // Scene 4 (no suggestions)
    });
  });
});
