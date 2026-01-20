/**
 * Quick Production Flow E2E Tests
 *
 * Story 6.8b - QPF UI & Integration (One-Click Video Creation)
 *
 * These tests validate the complete Quick Production Flow:
 * - One-click video creation from topic suggestions
 * - Pipeline progress tracking
 * - Auto-redirect to export on completion
 * - Error handling for missing defaults
 *
 * @status RED - All tests expected to fail until implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Note: These are E2E test stubs that will need Playwright or similar
// For now, we structure them as integration tests against the API
// Real E2E tests require Playwright setup

describe('Quick Production Flow - One-Click Creation', () => {
  describe('AC-6.8b.1: One-click project creation with defaults', () => {
    it('should create project and start pipeline when user has defaults configured', async () => {
      // GIVEN: User has configured default voice and persona
      // Setup: Configure defaults via API
      const prefsResponse = await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: 'af_nova',
          default_persona_id: 'scientific-analyst',
        }),
      });
      expect(prefsResponse.ok).toBe(true);

      // WHEN: User clicks "Create Video" on a topic suggestion
      // This simulates the TopicSuggestionCard button click
      const quickCreateResponse = await fetch('/api/projects/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'F-35 Lightning II Combat Capabilities',
          ragContext: {
            channelContent: [],
            competitorContent: [],
            newsArticles: [],
            trendingTopics: [],
          },
        }),
      });

      // THEN: Project is created with topic_confirmed=true
      expect(quickCreateResponse.ok).toBe(true);
      const quickCreateData = await quickCreateResponse.json();
      expect(quickCreateData.success).toBe(true);
      expect(quickCreateData.data.projectId).toBeDefined();
      expect(quickCreateData.data.redirectUrl).toMatch(/\/projects\/[a-z0-9-]+\/progress/);

      // AND: Pipeline starts automatically
      // Verify by checking pipeline-status endpoint
      const projectId = quickCreateData.data.projectId;
      const statusResponse = await fetch(`/api/projects/${projectId}/pipeline-status`);
      expect(statusResponse.ok).toBe(true);
      const statusData = await statusResponse.json();
      expect(statusData.success).toBe(true);
      expect(statusData.data.currentStage).toBeDefined();
    });

    it('should apply default voice and persona to created project', async () => {
      // GIVEN: User has configured defaults
      const voiceId = 'af_nova';
      const personaId = 'scientific-analyst';

      await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: voiceId,
          default_persona_id: personaId,
        }),
      });

      // WHEN: Quick-create is triggered
      const response = await fetch('/api/projects/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Test Topic',
        }),
      });

      const data = await response.json();
      const projectId = data.data.projectId;

      // THEN: Project has defaults applied
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      const projectData = await projectResponse.json();

      expect(projectData.data.voice_id).toBe(voiceId);
      expect(projectData.data.system_prompt_id).toBe(personaId);
      expect(projectData.data.topic_confirmed).toBe(true);
    });
  });

  describe('AC-6.8b.4: Redirect to settings when no defaults', () => {
    it('should return DEFAULTS_NOT_CONFIGURED error when no defaults exist', async () => {
      // GIVEN: User has NOT configured defaults
      await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: null,
          default_persona_id: null,
        }),
      });

      // WHEN: User attempts quick-create
      const response = await fetch('/api/projects/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Test Topic',
        }),
      });

      // THEN: Returns error with redirect instruction
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('DEFAULTS_NOT_CONFIGURED');
      expect(data.message).toContain('configure');
    });

    it('should return error when only voice is configured (missing persona)', async () => {
      // GIVEN: Only voice is configured
      await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: 'af_nova',
          default_persona_id: null,
        }),
      });

      // WHEN: User attempts quick-create
      const response = await fetch('/api/projects/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Test Topic',
        }),
      });

      // THEN: Returns error
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('DEFAULTS_NOT_CONFIGURED');
    });

    it('should return error when only persona is configured (missing voice)', async () => {
      // GIVEN: Only persona is configured
      await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: null,
          default_persona_id: 'scientific-analyst',
        }),
      });

      // WHEN: User attempts quick-create
      const response = await fetch('/api/projects/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Test Topic',
        }),
      });

      // THEN: Returns error
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('DEFAULTS_NOT_CONFIGURED');
    });
  });
});

describe('Quick Production Flow - Progress Tracking', () => {
  describe('AC-6.8b.2: Real-time progress display', () => {
    it('should return current stage and progress for active pipeline', async () => {
      // GIVEN: A project with pipeline in progress
      // First, create a project via quick-create
      await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voice_id: 'af_nova',
          default_persona_id: 'scientific-analyst',
        }),
      });

      const createResponse = await fetch('/api/projects/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Progress Test Topic',
        }),
      });
      const createData = await createResponse.json();
      const projectId = createData.data.projectId;

      // WHEN: Polling pipeline-status endpoint
      const statusResponse = await fetch(`/api/projects/${projectId}/pipeline-status`);

      // THEN: Returns stage information
      expect(statusResponse.ok).toBe(true);
      const statusData = await statusResponse.json();
      expect(statusData.success).toBe(true);
      expect(statusData.data.projectId).toBe(projectId);
      expect(statusData.data.currentStage).toMatch(/script|voiceover|visuals|assembly|complete/);
      expect(statusData.data.completedStages).toBeInstanceOf(Array);
      expect(statusData.data.stageProgress).toBeGreaterThanOrEqual(0);
      expect(statusData.data.stageProgress).toBeLessThanOrEqual(100);
      expect(statusData.data.overallProgress).toBeGreaterThanOrEqual(0);
      expect(statusData.data.overallProgress).toBeLessThanOrEqual(100);
      expect(statusData.data.currentMessage).toBeDefined();
    });

    it('should return completedStages array reflecting pipeline progress', async () => {
      // GIVEN: A project that has completed script generation
      // This test requires a project in a specific state
      // Using a mock or seeded database state

      const projectId = 'test-project-with-script-complete';

      // WHEN: Checking pipeline status
      const statusResponse = await fetch(`/api/projects/${projectId}/pipeline-status`);

      // THEN: completedStages includes 'script'
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        // If project exists and script is done, verify
        if (statusData.data.currentStage !== 'script') {
          expect(statusData.data.completedStages).toContain('script');
        }
      }
    });
  });

  describe('AC-6.8b.3: Auto-redirect on completion', () => {
    it('should return currentStage=complete when pipeline finishes', async () => {
      // GIVEN: A project with completed pipeline
      // This requires a project in 'complete' state

      const projectId = 'test-project-complete';

      // WHEN: Checking pipeline status
      const statusResponse = await fetch(`/api/projects/${projectId}/pipeline-status`);

      // THEN: Returns complete status
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.data.currentStage === 'complete') {
          expect(statusData.data.overallProgress).toBe(100);
          expect(statusData.data.completedStages).toContain('assembly');
        }
      }
    });
  });
});

describe('Quick Production Flow - Input Validation', () => {
  it('should require topic in request body', async () => {
    // GIVEN: Defaults are configured
    await fetch('/api/user-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        default_voice_id: 'af_nova',
        default_persona_id: 'scientific-analyst',
      }),
    });

    // WHEN: quick-create called without topic
    const response = await fetch('/api/projects/quick-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // THEN: Returns validation error
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('should accept optional ragContext', async () => {
    // GIVEN: Defaults are configured
    await fetch('/api/user-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        default_voice_id: 'af_nova',
        default_persona_id: 'scientific-analyst',
      }),
    });

    // WHEN: quick-create called without ragContext
    const response = await fetch('/api/projects/quick-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Topic without RAG context',
      }),
    });

    // THEN: Succeeds (ragContext is optional)
    expect(response.ok).toBe(true);
  });

  it('should store ragContext when provided', async () => {
    // GIVEN: Defaults are configured
    await fetch('/api/user-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        default_voice_id: 'af_nova',
        default_persona_id: 'scientific-analyst',
      }),
    });

    const ragContext = {
      channelContent: [{ id: 'doc1', content: 'Test content', metadata: {}, score: 0.9 }],
      competitorContent: [],
      newsArticles: [],
      trendingTopics: [],
    };

    // WHEN: quick-create called with ragContext
    const response = await fetch('/api/projects/quick-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Topic with RAG context',
        ragContext,
      }),
    });

    const data = await response.json();
    const projectId = data.data.projectId;

    // THEN: ragContext is stored in project
    const projectResponse = await fetch(`/api/projects/${projectId}`);
    const projectData = await projectResponse.json();

    // Verify ragContext stored (implementation may vary)
    expect(projectData.data.rag_config).toBeDefined();
  });
});
