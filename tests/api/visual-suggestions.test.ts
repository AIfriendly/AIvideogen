/**
 * API Integration Tests for GET /api/projects/[id]/visual-suggestions
 * Test ID Prefix: 3.3-API-xxx (Story 3.3)
 * Priority: P1/P2
 *
 * Following TEA test-quality.md best practices:
 * - BDD format (Given-When-Then)
 * - Test IDs for traceability
 * - Proper mocking with vi.spyOn (no try-catch scaffolding)
 * - Explicit assertions (no placeholders)
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/projects/[id]/visual-suggestions/route';
import { NextRequest } from 'next/server';
import * as queries from '@/lib/db/queries';
import { createVisualSuggestion, createTestProject } from '../factories/visual-suggestions.factory';

describe('GET /api/projects/[id]/visual-suggestions - Story 3.3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('P1 (High) - Response Structure and Ordering', () => {
    /**
     * 3.3-API-007: Response Format with Metadata
     * Priority: P1 (R-010 Score 2)
     * Acceptance Criteria: AC5 (GET endpoint response structure)
     */
    test('3.3-API-007: should return response with suggestions array and metadata', async () => {
      // Given: Project with visual suggestions
      const projectId = 'test-project-get';
      const mockProject = createTestProject({ id: projectId });
      const mockSuggestions = [
        createVisualSuggestion({ scene_id: 'scene-1', rank: 1 }),
        createVisualSuggestion({ scene_id: 'scene-1', rank: 2 }),
        createVisualSuggestion({ scene_id: 'scene-2', rank: 1 })
      ];

      vi.spyOn(queries, 'getProject').mockReturnValue(mockProject);
      vi.spyOn(queries, 'getVisualSuggestionsByProject').mockReturnValue(mockSuggestions);
      vi.spyOn(queries, 'getScenesCount').mockReturnValue(2);
      vi.spyOn(queries, 'getScenesWithSuggestionsCount').mockReturnValue(2);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/visual-suggestions`,
        { method: 'GET' }
      );

      // When: Fetching visual suggestions
      const response = await GET(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Should return structure with suggestions and metadata
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('suggestions');
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions).toHaveLength(3);

      // And: Should include metadata for UI statistics display
      expect(result).toHaveProperty('totalScenes');
      expect(result).toHaveProperty('scenesWithSuggestions');
      expect(result.totalScenes).toBe(2);
      expect(result.scenesWithSuggestions).toBe(2);

      // And: Mock functions should be called with correct arguments
      expect(queries.getProject).toHaveBeenCalledWith(projectId);
      expect(queries.getVisualSuggestionsByProject).toHaveBeenCalledWith(projectId);
    });

    /**
     * 3.3-API-008: Ordering by Scene then Rank
     * Priority: P1 (R-008 Score 3)
     * Acceptance Criteria: AC5 (Ordering: scene_number ASC, rank ASC)
     */
    test('3.3-API-008: should return results ordered by rank ASC', async () => {
      // Given: Project with multiple scenes and suggestions in mixed order
      const projectId = 'test-project-ordering';
      const mockProject = createTestProject({ id: projectId });

      // Mock suggestions already ordered by scene and rank (simulating query ORDER BY)
      const mockSuggestions = [
        createVisualSuggestion({ scene_id: 'scene-1', rank: 1 }),
        createVisualSuggestion({ scene_id: 'scene-1', rank: 2 }),
        createVisualSuggestion({ scene_id: 'scene-2', rank: 1 }),
        createVisualSuggestion({ scene_id: 'scene-2', rank: 2 })
      ];

      vi.spyOn(queries, 'getProject').mockReturnValue(mockProject);
      vi.spyOn(queries, 'getVisualSuggestionsByProject').mockReturnValue(mockSuggestions);
      vi.spyOn(queries, 'getScenesCount').mockReturnValue(2);
      vi.spyOn(queries, 'getScenesWithSuggestionsCount').mockReturnValue(2);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/visual-suggestions`,
        { method: 'GET' }
      );

      // When: Fetching suggestions
      const response = await GET(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Results should be ordered properly
      expect(result.suggestions).toHaveLength(4);
      expect(result.suggestions[0].rank).toBe(1); // Scene 1, rank 1
      expect(result.suggestions[1].rank).toBe(2); // Scene 1, rank 2
      expect(result.suggestions[2].rank).toBe(1); // Scene 2, rank 1
      expect(result.suggestions[3].rank).toBe(2); // Scene 2, rank 2
    });
  });

  describe('P2 (Medium) - Empty States', () => {
    /**
     * 3.3-API-011: Empty Array for No Suggestions
     * Priority: P2 (R-005 Score 6)
     * Acceptance Criteria: AC5 (Empty state handling)
     */
    test('3.3-API-011: should return empty array when no suggestions exist', async () => {
      // Given: Project with no visual suggestions
      const projectId = 'test-project-empty';
      const mockProject = createTestProject({ id: projectId });

      vi.spyOn(queries, 'getProject').mockReturnValue(mockProject);
      vi.spyOn(queries, 'getVisualSuggestionsByProject').mockReturnValue([]);
      vi.spyOn(queries, 'getScenesCount').mockReturnValue(3);
      vi.spyOn(queries, 'getScenesWithSuggestionsCount').mockReturnValue(0);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/visual-suggestions`,
        { method: 'GET' }
      );

      // When: Fetching suggestions
      const response = await GET(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Should return empty array (not error, not null)
      expect(response.status).toBe(200); // Success with empty data
      expect(result.suggestions).toEqual([]);
      expect(result.totalScenes).toBe(3);
      expect(result.scenesWithSuggestions).toBe(0);
    });
  });
});
