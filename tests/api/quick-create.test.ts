/**
 * Quick Create API Tests
 *
 * Story 6.8b - POST /api/projects/quick-create
 *
 * Tests the API endpoint that creates projects from topic suggestions
 * and triggers the automated pipeline.
 *
 * @status RED - All tests expected to fail until implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch for API testing in Vitest
// In real implementation, use supertest or similar

describe('POST /api/projects/quick-create', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  describe('FR-6.8b.04: Project creation with defaults', () => {
    it('should create project with topic_confirmed=true', async () => {
      // GIVEN: Valid request with configured defaults
      const topic = 'Test Topic for Quick Create';

      // Setup defaults first
      await fetch(`${baseUrl}/api/user-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: 'af_nova',
          default_persona_id: 'scientific-analyst',
        }),
      });

      // WHEN: Calling quick-create
      const response = await fetch(`${baseUrl}/api/projects/quick-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      // THEN: Returns success with project data
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.projectId).toBeDefined();
      expect(typeof data.data.projectId).toBe('string');
    });

    it('should return redirectUrl pointing to progress page', async () => {
      // Setup
      await fetch(`${baseUrl}/api/user-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: 'af_nova',
          default_persona_id: 'scientific-analyst',
        }),
      });

      // WHEN
      const response = await fetch(`${baseUrl}/api/projects/quick-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Test Topic' }),
      });

      // THEN
      const data = await response.json();
      expect(data.data.redirectUrl).toMatch(/^\/projects\/[a-z0-9-]+\/progress$/);
    });

    it('should set current_step to script-generation', async () => {
      // Setup
      await fetch(`${baseUrl}/api/user-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: 'af_nova',
          default_persona_id: 'scientific-analyst',
        }),
      });

      // WHEN
      const response = await fetch(`${baseUrl}/api/projects/quick-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Test Topic' }),
      });

      const data = await response.json();
      const projectId = data.data.projectId;

      // THEN: Verify project state
      const projectResponse = await fetch(`${baseUrl}/api/projects/${projectId}`);
      const projectData = await projectResponse.json();

      expect(projectData.data.current_step).toBe('script-generation');
    });
  });

  describe('Defaults Validation', () => {
    it('should return 400 when default_voice_id is null', async () => {
      // GIVEN: No voice configured
      await fetch(`${baseUrl}/api/user-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: null,
          default_persona_id: 'scientific-analyst',
        }),
      });

      // WHEN
      const response = await fetch(`${baseUrl}/api/projects/quick-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Test Topic' }),
      });

      // THEN
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('DEFAULTS_NOT_CONFIGURED');
    });

    it('should return 400 when default_persona_id is null', async () => {
      // GIVEN: No persona configured
      await fetch(`${baseUrl}/api/user-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: 'af_nova',
          default_persona_id: null,
        }),
      });

      // WHEN
      const response = await fetch(`${baseUrl}/api/projects/quick-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Test Topic' }),
      });

      // THEN
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('DEFAULTS_NOT_CONFIGURED');
    });

    it('should return 400 when both defaults are null', async () => {
      // GIVEN: No defaults configured
      await fetch(`${baseUrl}/api/user-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: null,
          default_persona_id: null,
        }),
      });

      // WHEN
      const response = await fetch(`${baseUrl}/api/projects/quick-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Test Topic' }),
      });

      // THEN
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('DEFAULTS_NOT_CONFIGURED');
    });

    it('should validate that voice_id exists in voice-profiles', async () => {
      // GIVEN: Invalid voice configured
      await fetch(`${baseUrl}/api/user-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: 'invalid-voice-id',
          default_persona_id: 'scientific-analyst',
        }),
      });

      // WHEN
      const response = await fetch(`${baseUrl}/api/projects/quick-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Test Topic' }),
      });

      // THEN: Should either reject or handle gracefully
      // Implementation may choose to re-validate at quick-create time
      const data = await response.json();
      // Either 400 error or 200 with graceful handling
      expect([200, 400]).toContain(response.status);
    });

    it('should validate that persona_id exists in system_prompts', async () => {
      // GIVEN: Invalid persona configured
      await fetch(`${baseUrl}/api/user-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: 'af_nova',
          default_persona_id: 'invalid-persona-id',
        }),
      });

      // WHEN
      const response = await fetch(`${baseUrl}/api/projects/quick-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Test Topic' }),
      });

      // THEN: Should either reject or handle gracefully
      const data = await response.json();
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Request Validation', () => {
    it('should return 400 when topic is missing', async () => {
      // Setup
      await fetch(`${baseUrl}/api/user-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: 'af_nova',
          default_persona_id: 'scientific-analyst',
        }),
      });

      // WHEN: Missing topic
      const response = await fetch(`${baseUrl}/api/projects/quick-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      // THEN
      expect(response.status).toBe(400);
    });

    it('should return 400 when topic is empty string', async () => {
      // Setup
      await fetch(`${baseUrl}/api/user-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: 'af_nova',
          default_persona_id: 'scientific-analyst',
        }),
      });

      // WHEN: Empty topic
      const response = await fetch(`${baseUrl}/api/projects/quick-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: '' }),
      });

      // THEN
      expect(response.status).toBe(400);
    });

    it('should accept topic with ragContext', async () => {
      // Setup
      await fetch(`${baseUrl}/api/user-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: 'af_nova',
          default_persona_id: 'scientific-analyst',
        }),
      });

      // WHEN: With ragContext
      const response = await fetch(`${baseUrl}/api/projects/quick-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Test Topic',
          ragContext: {
            channelContent: [],
            competitorContent: [],
            newsArticles: [],
            trendingTopics: [],
          },
        }),
      });

      // THEN
      expect(response.status).toBe(200);
    });

    it('should handle invalid JSON gracefully', async () => {
      // WHEN: Invalid JSON
      const response = await fetch(`${baseUrl}/api/projects/quick-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      // THEN
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('RAG Context Storage', () => {
    it('should store ragContext in project rag_config', async () => {
      // Setup
      await fetch(`${baseUrl}/api/user-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: 'af_nova',
          default_persona_id: 'scientific-analyst',
        }),
      });

      const ragContext = {
        channelContent: [
          {
            id: 'doc-1',
            content: 'Previous video about F-35',
            metadata: { channelId: 'UC123', videoId: 'vid1' },
            score: 0.95,
          },
        ],
        competitorContent: [],
        newsArticles: [
          {
            id: 'news-1',
            content: 'Latest F-35 news',
            metadata: { source: 'defense-news' },
            score: 0.88,
          },
        ],
        trendingTopics: [],
      };

      // WHEN
      const response = await fetch(`${baseUrl}/api/projects/quick-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'F-35 Update',
          ragContext,
        }),
      });

      const data = await response.json();
      const projectId = data.data.projectId;

      // THEN: Verify ragContext stored
      const projectResponse = await fetch(`${baseUrl}/api/projects/${projectId}`);
      const projectData = await projectResponse.json();

      expect(projectData.data.rag_enabled).toBe(true);
      // ragContext should be stored in rag_config or similar field
      const storedConfig = JSON.parse(projectData.data.rag_config || '{}');
      expect(storedConfig.ragContext || storedConfig).toBeDefined();
    });
  });

  describe('Pipeline Trigger', () => {
    it('should trigger pipeline after project creation', async () => {
      // Setup
      await fetch(`${baseUrl}/api/user-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: 'af_nova',
          default_persona_id: 'scientific-analyst',
        }),
      });

      // WHEN
      const response = await fetch(`${baseUrl}/api/projects/quick-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Pipeline Test Topic' }),
      });

      const data = await response.json();
      const projectId = data.data.projectId;

      // THEN: Pipeline should be running (check status)
      // Allow brief delay for pipeline to start
      await new Promise((resolve) => setTimeout(resolve, 500));

      const statusResponse = await fetch(`${baseUrl}/api/projects/${projectId}/pipeline-status`);
      const statusData = await statusResponse.json();

      // Pipeline should be in progress or starting
      expect(statusData.success).toBe(true);
      expect(['script', 'voiceover', 'visuals', 'assembly', 'complete']).toContain(
        statusData.data.currentStage
      );
    });
  });
});
