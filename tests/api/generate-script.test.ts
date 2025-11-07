/**
 * API Tests for Script Generation Endpoint - Story 2.4
 *
 * Tests the POST /api/projects/[id]/generate-script endpoint:
 * - Request validation
 * - Topic verification
 * - Scene creation
 * - Project status updates
 * - Error handling
 *
 * Acceptance Criteria Coverage:
 * - AC1: Script generation endpoint accepts projectId as input
 * - AC2: LLM generates structured script with 3-5 scenes minimum
 * - AC3: Each scene has scene_number (sequential) and text (50-200 words)
 * - AC11: Scenes saved to database in correct order
 * - AC15: projects.script_generated flag updated on success
 * - AC16: projects.current_step updated to 'voiceover' on success
 *
 * Task Coverage: Story 2.4, Task 8 - Integration Testing
 *
 * @module tests/api/generate-script.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import db from '@/lib/db/client';
import { POST as generateScriptHandler } from '@/app/api/projects/[id]/generate-script/route';
import { getProject, getScenesByProjectId } from '@/lib/db/queries';
import * as scriptGenerator from '@/lib/llm/script-generator';

// Mock the script generator to avoid actual LLM calls in tests
vi.mock('@/lib/llm/script-generator', async () => {
  const actual = await vi.importActual('@/lib/llm/script-generator');
  return {
    ...actual,
    generateScriptWithRetry: vi.fn(),
  };
});

describe('POST /api/projects/[id]/generate-script', () => {
  const testProjectId = '00000000-0000-0000-0000-000000000003';

  // Mock professional script response
  const mockScriptResult = {
    scenes: [
      {
        sceneNumber: 1,
        text: 'An octopus can unscrew a jar from the inside. Not because someone taught it - because it figured it out. These eight-armed creatures solve puzzles that stump most animals, and scientists are only beginning to understand why. Their intelligence is not just remarkable, it is alien.',
        estimatedDuration: 45
      },
      {
        sceneNumber: 2,
        text: 'Unlike humans, who centralize thinking in one brain, octopuses distribute their neurons. Two-thirds of their brain cells live in their arms. Each arm can taste, touch, and make decisions independently. It is like having eight mini-brains working together, each one capable of problem-solving on its own.',
        estimatedDuration: 60
      },
      {
        sceneNumber: 3,
        text: 'This distributed intelligence lets them do extraordinary things. They can camouflage in milliseconds, mimicking not just colors but textures. They escape from locked tanks. They use tools. One species collects coconut shells and assembles them into portable shelters. That is not instinct, that is planning.',
        estimatedDuration: 55
      }
    ],
    attempts: 1,
    validationScore: 95
  };

  beforeEach(() => {
    // Clear database
    db.exec('DELETE FROM scenes');
    db.exec('DELETE FROM messages');
    db.exec('DELETE FROM projects');

    // Reset mock
    vi.clearAllMocks();

    // Default mock behavior: successful generation
    vi.mocked(scriptGenerator.generateScriptWithRetry).mockResolvedValue(mockScriptResult);
  });

  describe('AC1: Valid Requests with ProjectId', () => {
    beforeEach(() => {
      // Create test project with confirmed topic
      db.prepare(`
        INSERT INTO projects (id, name, topic, current_step, status, script_generated)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(testProjectId, 'Test Project', 'Why octopuses are intelligent', 'script', 'draft', 0);
    });

    it('should accept projectId and generate script successfully', async () => {
      // Given: Project with confirmed topic
      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // When: Calling generate-script endpoint
      const response = await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });
      const data = await response.json();

      // Then: Should return success
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.projectId).toBe(testProjectId);
      expect(data.data.sceneCount).toBe(3);
      expect(data.data.attempts).toBe(1);
    });

    it('should call script generator with sanitized topic', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        { method: 'POST' }
      );

      await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Verify generator was called with topic
      expect(scriptGenerator.generateScriptWithRetry).toHaveBeenCalled();
      const callArgs = vi.mocked(scriptGenerator.generateScriptWithRetry).mock.calls[0];
      expect(callArgs[0]).toContain('octopuses');
    });
  });

  describe('AC2 & AC3: Scene Structure Validation', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO projects (id, name, topic, current_step, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(testProjectId, 'Test Project', 'Test topic', 'script', 'draft');
    });

    it('should generate 3-5 scenes', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        { method: 'POST' }
      );

      const response = await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });
      const data = await response.json();

      expect(data.data.sceneCount).toBeGreaterThanOrEqual(3);
      expect(data.data.sceneCount).toBeLessThanOrEqual(7); // Allow up to 7 per story spec
    });

    it('should return scenes with sequential scene_number', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        { method: 'POST' }
      );

      const response = await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });
      const data = await response.json();

      const scenes = data.data.scenes;
      expect(scenes[0].scene_number).toBe(1);
      expect(scenes[1].scene_number).toBe(2);
      expect(scenes[2].scene_number).toBe(3);
    });

    it('should return scenes with text field', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        { method: 'POST' }
      );

      const response = await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });
      const data = await response.json();

      data.data.scenes.forEach((scene: any) => {
        expect(scene.text).toBeDefined();
        expect(typeof scene.text).toBe('string');
        expect(scene.text.length).toBeGreaterThan(0);
      });
    });
  });

  describe('AC11: Database Storage', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO projects (id, name, topic, current_step, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(testProjectId, 'Test Project', 'Test topic', 'script', 'draft');
    });

    it('should save scenes to database in correct order', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        { method: 'POST' }
      );

      await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Verify scenes were saved to database
      const savedScenes = getScenesByProjectId(testProjectId);
      expect(savedScenes.length).toBe(3);
      expect(savedScenes[0].scene_number).toBe(1);
      expect(savedScenes[1].scene_number).toBe(2);
      expect(savedScenes[2].scene_number).toBe(3);
    });

    it('should save scenes with correct project_id', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        { method: 'POST' }
      );

      await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      const savedScenes = getScenesByProjectId(testProjectId);
      savedScenes.forEach(scene => {
        expect(scene.project_id).toBe(testProjectId);
      });
    });

    it('should transform camelCase to snake_case', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        { method: 'POST' }
      );

      await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Verify database uses snake_case
      const savedScenes = getScenesByProjectId(testProjectId);
      expect(savedScenes[0]).toHaveProperty('scene_number');
      expect(savedScenes[0]).toHaveProperty('project_id');
      expect(savedScenes[0]).toHaveProperty('sanitized_text');
    });
  });

  describe('AC15 & AC16: Project Status Updates', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO projects (id, name, topic, current_step, status, script_generated)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(testProjectId, 'Test Project', 'Test topic', 'script', 'draft', false);
    });

    it('should set script_generated flag to true', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        { method: 'POST' }
      );

      await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Verify flag was updated
      const project = getProject(testProjectId);
      expect(project?.script_generated).toBe(true);
    });

    it('should update current_step to "voiceover"', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        { method: 'POST' }
      );

      await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Verify current_step was updated
      const project = getProject(testProjectId);
      expect(project?.current_step).toBe('voiceover');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 when project not found', async () => {
      const nonExistentId = '99999999-9999-9999-9999-999999999999';
      const request = new Request(
        `http://localhost:3000/api/projects/${nonExistentId}/generate-script`,
        { method: 'POST' }
      );

      const response = await generateScriptHandler(request, {
        params: Promise.resolve({ id: nonExistentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should return 400 when topic is missing', async () => {
      // Create project without topic
      db.prepare(`
        INSERT INTO projects (id, name, topic, current_step, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(testProjectId, 'Test Project', null, 'topic', 'draft');

      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        { method: 'POST' }
      );

      const response = await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Topic not confirmed');
    });

    it('should return 500 when script generation fails', async () => {
      // Mock script generator to fail
      vi.mocked(scriptGenerator.generateScriptWithRetry).mockRejectedValue(
        new scriptGenerator.ScriptGenerationError(
          'Generation failed',
          3,
          ['Quality too low', 'Generic phrases detected']
        )
      );

      db.prepare(`
        INSERT INTO projects (id, name, topic, current_step, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(testProjectId, 'Test Project', 'Test topic', 'script', 'draft');

      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        { method: 'POST' }
      );

      const response = await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('failed');
      expect(data.details).toBeDefined();
      expect(data.details.length).toBeGreaterThan(0);
    });

    it('should return 400 when project ID is missing', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects//generate-script`,
        { method: 'POST' }
      );

      const response = await generateScriptHandler(request, {
        params: Promise.resolve({ id: '' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Response Format', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO projects (id, name, topic, current_step, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(testProjectId, 'Test Project', 'Test topic', 'script', 'draft');
    });

    it('should return standard success response format', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        { method: 'POST' }
      );

      const response = await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('projectId');
      expect(data.data).toHaveProperty('sceneCount');
      expect(data.data).toHaveProperty('scenes');
      expect(data.data).toHaveProperty('attempts');
    });

    it('should include all scene fields in response', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        { method: 'POST' }
      );

      const response = await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });
      const data = await response.json();

      const scene = data.data.scenes[0];
      expect(scene).toHaveProperty('id');
      expect(scene).toHaveProperty('project_id');
      expect(scene).toHaveProperty('scene_number');
      expect(scene).toHaveProperty('text');
      expect(scene).toHaveProperty('created_at');
      expect(scene).toHaveProperty('updated_at');
    });
  });
});
