/**
 * API Integration Tests for POST /api/projects/[id]/generate-visuals
 * Test ID Prefix: 3.3-API-xxx (for Story 3.3 tests)
 * Priority: P0/P1/P2 (Based on risk assessment)
 *
 * Following TEA test-quality.md best practices:
 * - BDD format (Given-When-Then)
 * - Test IDs for traceability
 * - Proper mocking with vi.spyOn (no try-catch scaffolding)
 * - Isolated tests with fixtures and auto-cleanup
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/projects/[id]/generate-visuals/route';
import { NextRequest } from 'next/server';
import * as queries from '@/lib/db/queries';
import * as youtubeClient from '@/lib/youtube/client';
import * as sceneAnalysis from '@/lib/llm/scene-analysis';
import {
  createTestProject,
  createTestScene,
  createTestScenes,
  createVideoResult,
  createSceneAnalysis,
  createYouTubeErrorResponse
} from '../factories/visual-suggestions.factory';

describe('POST /api/projects/[id]/generate-visuals - Story 3.3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('P0 (Critical) - Core Workflow and Error Handling', () => {
    /**
     * 3.3-API-001: Full Workflow Integration
     * Priority: P0 (R-001 Score 9, R-009 Score 3)
     * Acceptance Criteria: AC3 (POST endpoint orchestrates full pipeline)
     */
    test('3.3-API-001: should complete full visual generation workflow', async () => {
      // Given: Project with 3 scenes
      const projectId = 'test-project-123';
      const mockProject = createTestProject({ id: projectId });
      const mockScenes = createTestScenes(3, projectId);
      const mockAnalysis = createSceneAnalysis();
      const mockVideoResults = [
        createVideoResult({ duration: '180' }),
        createVideoResult({ duration: '240' }),
        createVideoResult({ duration: '150' })
      ];

      vi.spyOn(queries, 'getProject').mockReturnValue(mockProject);
      vi.spyOn(queries, 'getScenesByProject').mockReturnValue(mockScenes);
      vi.spyOn(sceneAnalysis, 'analyzeScene').mockResolvedValue(mockAnalysis);
      vi.spyOn(youtubeClient, 'searchVideos').mockResolvedValue(mockVideoResults);
      vi.spyOn(queries, 'saveVisualSuggestions').mockResolvedValue(undefined);
      vi.spyOn(queries, 'updateProject').mockReturnValue(mockProject);

      // Mock request
      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/generate-visuals`,
        { method: 'POST' }
      );

      // When: Calling POST endpoint
      const response = await POST(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Should return success response
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.scenesProcessed).toBe(3);
      expect(result.suggestionsGenerated).toBeGreaterThan(0);

      // And: Should call dependencies in correct order
      expect(queries.getProject).toHaveBeenCalledWith(projectId);
      expect(queries.getScenesByProject).toHaveBeenCalledWith(projectId);
      expect(sceneAnalysis.analyzeScene).toHaveBeenCalledTimes(3);
      expect(youtubeClient.searchVideos).toHaveBeenCalled();
    });

    /**
     * 3.3-API-002: Quota Exceeded Error Handling
     * Priority: P0 (R-003 Score 6 - CRITICAL)
     * Acceptance Criteria: AC6 (Error handling - quota exceeded)
     */
    test('3.3-API-002: should handle YouTube API quota exceeded gracefully', async () => {
      // Given: Project that will trigger quota exceeded error
      const projectId = 'test-project-quota';
      const mockProject = createTestProject({ id: projectId });
      const mockScenes = createTestScenes(1, projectId);
      const mockAnalysis = createSceneAnalysis();
      const quotaError = createYouTubeErrorResponse(403, 'quotaExceeded');

      vi.spyOn(queries, 'getProject').mockReturnValue(mockProject);
      vi.spyOn(queries, 'getScenesByProject').mockReturnValue(mockScenes);
      vi.spyOn(sceneAnalysis, 'analyzeScene').mockResolvedValue(mockAnalysis);
      vi.spyOn(youtubeClient, 'searchVideos').mockRejectedValue(
        new Error(`YouTube API quota exceeded: ${JSON.stringify(quotaError)}`)
      );

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/generate-visuals`,
        { method: 'POST' }
      );

      // When: YouTube quota is exceeded
      const response = await POST(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Should return 503 Service Unavailable (not 500 crash)
      expect(response.status).toBe(503);
      expect(result.error).toContain('quota');
      expect(result.error).toMatch(/try again|tomorrow/i); // Actionable guidance
    });

    /**
     * 3.3-API-003: Zero Results Handling
     * Priority: P0 (R-005 Score 6 - CRITICAL)
     * Acceptance Criteria: AC7 (Zero results scenario)
     */
    test('3.3-API-003: should handle zero results without error', async () => {
      // Given: Project with scene that will return zero YouTube results
      const projectId = 'test-project-zero-results';
      const mockProject = createTestProject({ id: projectId });
      const mockScenes = createTestScenes(1, projectId);
      const mockAnalysis = createSceneAnalysis();

      vi.spyOn(queries, 'getProject').mockReturnValue(mockProject);
      vi.spyOn(queries, 'getScenesByProject').mockReturnValue(mockScenes);
      vi.spyOn(sceneAnalysis, 'analyzeScene').mockResolvedValue(mockAnalysis);
      vi.spyOn(youtubeClient, 'searchVideos').mockResolvedValue([]); // Zero results
      vi.spyOn(queries, 'saveVisualSuggestions').mockResolvedValue(undefined);
      vi.spyOn(queries, 'updateProject').mockReturnValue(mockProject);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/generate-visuals`,
        { method: 'POST' }
      );

      // When: Generating visuals (returns 0 results)
      const response = await POST(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Should succeed with 0 suggestions (NOT an error)
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.scenesProcessed).toBe(1);
      expect(result.suggestionsGenerated).toBe(0);
      expect(result.errors).toBeUndefined(); // Zero results is valid, not error
    });
  });

  describe('P1 (High) - Response Structure and State Management', () => {
    /**
     * 3.3-API-004: Response Contains Correct Counts
     * Priority: P1 (R-006 Score 4)
     * Acceptance Criteria: AC3 (Response structure)
     */
    test('3.3-API-004: should return scenesProcessed and suggestionsGenerated counts', async () => {
      // Given: Project with 3 scenes
      const projectId = 'test-project-counts';
      const mockProject = createTestProject({ id: projectId });
      const mockScenes = createTestScenes(3, projectId);
      const mockAnalysis = createSceneAnalysis();
      const mockVideoResults = [
        createVideoResult({ duration: '180' }),
        createVideoResult({ duration: '240' })
      ];

      vi.spyOn(queries, 'getProject').mockReturnValue(mockProject);
      vi.spyOn(queries, 'getScenesByProject').mockReturnValue(mockScenes);
      vi.spyOn(sceneAnalysis, 'analyzeScene').mockResolvedValue(mockAnalysis);
      vi.spyOn(youtubeClient, 'searchVideos').mockResolvedValue(mockVideoResults);
      vi.spyOn(queries, 'saveVisualSuggestions').mockResolvedValue(undefined);
      vi.spyOn(queries, 'updateProject').mockReturnValue(mockProject);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/generate-visuals`,
        { method: 'POST' }
      );

      // When: Generating visuals
      const response = await POST(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Response should have required fields
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('scenesProcessed');
      expect(result).toHaveProperty('suggestionsGenerated');

      // And: Counts should be numbers
      expect(typeof result.scenesProcessed).toBe('number');
      expect(typeof result.suggestionsGenerated).toBe('number');
      expect(result.scenesProcessed).toBe(3);
    });

    /**
     * 3.3-API-005: Updates visuals_generated Flag
     * Priority: P1 (R-001 Score 9 - database state)
     * Acceptance Criteria: AC3 (Database state update)
     */
    test('3.3-API-005: should update project.visuals_generated = true on success', async () => {
      // Given: Project that will successfully generate visuals
      const projectId = 'test-project-flag';
      const mockProject = createTestProject({ id: projectId, visuals_generated: false });
      const mockScenes = createTestScenes(2, projectId);
      const mockAnalysis = createSceneAnalysis();
      const mockVideoResults = [createVideoResult({ duration: '180' })];

      vi.spyOn(queries, 'getProject').mockReturnValue(mockProject);
      vi.spyOn(queries, 'getScenesByProject').mockReturnValue(mockScenes);
      vi.spyOn(sceneAnalysis, 'analyzeScene').mockResolvedValue(mockAnalysis);
      vi.spyOn(youtubeClient, 'searchVideos').mockResolvedValue(mockVideoResults);
      vi.spyOn(queries, 'saveVisualSuggestions').mockResolvedValue(undefined);

      const updateSpy = vi.spyOn(queries, 'updateProject').mockReturnValue({
        ...mockProject,
        visuals_generated: true
      });

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/generate-visuals`,
        { method: 'POST' }
      );

      // When: Generating visuals successfully
      const response = await POST(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Should update database flag
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(projectId, { visualsGenerated: true });
    });

    /**
     * 3.3-API-006: Partial Failure Processing
     * Priority: P1 (R-006 Score 4)
     * Acceptance Criteria: AC6 (Error handling - partial failures)
     */
    test('3.3-API-006: should process all scenes even if some fail', async () => {
      // Given: Project with 5 scenes, where scene 2 and 4 will fail
      const projectId = 'test-project-partial';
      const mockProject = createTestProject({ id: projectId });
      const mockScenes = createTestScenes(5, projectId);
      const mockAnalysis = createSceneAnalysis();
      const mockVideoResults = [createVideoResult({ duration: '180' })];

      vi.spyOn(queries, 'getProject').mockReturnValue(mockProject);
      vi.spyOn(queries, 'getScenesByProject').mockReturnValue(mockScenes);

      // Mock analyzeScene to fail for scenes 2 and 4
      let callCount = 0;
      vi.spyOn(sceneAnalysis, 'analyzeScene').mockImplementation(async () => {
        callCount++;
        if (callCount === 2 || callCount === 4) {
          throw new Error('Analysis failed for scene');
        }
        return mockAnalysis;
      });

      vi.spyOn(youtubeClient, 'searchVideos').mockResolvedValue(mockVideoResults);
      vi.spyOn(queries, 'saveVisualSuggestions').mockResolvedValue(undefined);
      vi.spyOn(queries, 'updateProject').mockReturnValue(mockProject);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/generate-visuals`,
        { method: 'POST' }
      );

      // When: Processing with some scene failures
      const response = await POST(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Should continue processing other scenes
      expect(result.success).toBe(true); // Overall success (partial completion allowed)
      expect(result.scenesProcessed).toBe(3); // 3 of 5 succeeded

      // And: Should collect errors for failed scenes
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors).toHaveLength(2); // Scenes 2 and 4 failed
    });
  });

  describe('P2 (Medium) - Error Scenarios', () => {
    /**
     * 3.3-API-009: Network Error Retry Logic
     * Priority: P2 (R-007 Score 4)
     * Acceptance Criteria: AC6 (Error handling - network errors)
     */
    test('3.3-API-009: should handle network errors gracefully', async () => {
      // Given: Project that will experience network errors
      const projectId = 'test-project-network';
      const mockProject = createTestProject({ id: projectId });
      const mockScenes = createTestScenes(1, projectId);
      const mockAnalysis = createSceneAnalysis();

      vi.spyOn(queries, 'getProject').mockReturnValue(mockProject);
      vi.spyOn(queries, 'getScenesByProject').mockReturnValue(mockScenes);
      vi.spyOn(sceneAnalysis, 'analyzeScene').mockResolvedValue(mockAnalysis);
      vi.spyOn(youtubeClient, 'searchVideos').mockRejectedValue(
        new Error('Network error: ECONNREFUSED')
      );

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/generate-visuals`,
        { method: 'POST' }
      );

      // When: Network error occurs
      const response = await POST(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Should fail gracefully with error message
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    /**
     * 3.3-API-010: Invalid Query Handling
     * Priority: P2 (R-012 Score 1)
     * Acceptance Criteria: AC6 (Error handling - invalid input)
     */
    test('3.3-API-010: should handle scenes with invalid text gracefully', async () => {
      // Given: Scene with text that generates invalid search query
      const projectId = 'test-project-invalid-query';
      const mockProject = createTestProject({ id: projectId });
      const mockScenes = [createTestScene({
        project_id: projectId,
        text: '' // Empty text
      })];
      const mockAnalysis = createSceneAnalysis({ primaryQuery: '' }); // Invalid query

      vi.spyOn(queries, 'getProject').mockReturnValue(mockProject);
      vi.spyOn(queries, 'getScenesByProject').mockReturnValue(mockScenes);
      vi.spyOn(sceneAnalysis, 'analyzeScene').mockResolvedValue(mockAnalysis);
      vi.spyOn(youtubeClient, 'searchVideos').mockResolvedValue([]);
      vi.spyOn(queries, 'saveVisualSuggestions').mockResolvedValue(undefined);
      vi.spyOn(queries, 'updateProject').mockReturnValue(mockProject);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/generate-visuals`,
        { method: 'POST' }
      );

      // When: Processing invalid query
      const response = await POST(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Should skip invalid query and continue (not crash)
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.scenesProcessed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('P3 (Low) - Edge Cases', () => {
    /**
     * 3.3-API-012: Database Error Handling
     * Priority: P3
     * Acceptance Criteria: AC6 (Error handling - database errors)
     */
    test('3.3-API-012: should handle database errors with proper error response', async () => {
      // Given: Scenario that causes database error during save
      const projectId = 'test-project-db-error';
      const mockProject = createTestProject({ id: projectId });
      const mockScenes = createTestScenes(1, projectId);
      const mockAnalysis = createSceneAnalysis();
      const mockVideoResults = [createVideoResult({ duration: '180' })];

      vi.spyOn(queries, 'getProject').mockReturnValue(mockProject);
      vi.spyOn(queries, 'getScenesByProject').mockReturnValue(mockScenes);
      vi.spyOn(sceneAnalysis, 'analyzeScene').mockResolvedValue(mockAnalysis);
      vi.spyOn(youtubeClient, 'searchVideos').mockResolvedValue(mockVideoResults);
      vi.spyOn(queries, 'saveVisualSuggestions').mockRejectedValue(
        new Error('Database constraint violation')
      );

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}/generate-visuals`,
        { method: 'POST' }
      );

      // When: Database error occurs during insert
      const response = await POST(request, { params: Promise.resolve({ id: projectId }) });
      const result = await response.json();

      // Then: Should return error response
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(result.error).toBeDefined();
      expect(result.success).toBe(false);
    });
  });
});
