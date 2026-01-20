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
import { createTestProject, createMockScriptResult } from '../factories/project.factory';

// Mock the script generator to avoid actual LLM calls in tests
vi.mock('@/lib/llm/script-generator', async () => {
  const actual = await vi.importActual('@/lib/llm/script-generator');
  return {
    ...actual,
    generateScriptWithRetry: vi.fn(),
  };
});

describe('[P1] POST /api/projects/[id]/generate-script', () => {
  // Use factory to generate unique test project ID for each test run
  let testProjectId: string;
  let mockScriptResult: ReturnType<typeof createMockScriptResult>;

  beforeEach(() => {
    // Clear database
    db.exec('DELETE FROM scenes');
    db.exec('DELETE FROM messages');
    db.exec('DELETE FROM projects');

    // Generate unique test data for this test run (prevents parallel test collisions)
    const testProject = createTestProject();
    testProjectId = testProject.id;
    mockScriptResult = createMockScriptResult({ sceneCount: 3 });

    // Reset mock
    vi.clearAllMocks();

    // Default mock behavior: successful generation
    vi.mocked(scriptGenerator.generateScriptWithRetry).mockResolvedValue(mockScriptResult);
  });

  describe('[P1] AC1: Valid Requests with ProjectId', () => {
    beforeEach(() => {
      // Create test project with confirmed topic using factory
      const project = createTestProject({
        id: testProjectId,
        topic: 'Why octopuses are intelligent',
        current_step: 'script-generation',
        status: 'draft',
        script_generated: false,
      });

      db.prepare(`
        INSERT INTO projects (id, name, topic, current_step, status, script_generated)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(project.id, project.name, project.topic, project.current_step, project.status, project.script_generated ? 1 : 0);
    });

    it('[2.4-INT-001] should accept projectId and generate script successfully', async () => {
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

    it('[2.4-INT-002] should call script generator with sanitized topic', async () => {
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

  describe('[P1] AC2 & AC3: Scene Structure Validation', () => {
    beforeEach(() => {
      // Use factory for consistent test data
      const project = createTestProject({
        id: testProjectId,
        topic: 'Test topic',
        current_step: 'script-generation',
        status: 'draft',
      });

      db.prepare(`
        INSERT INTO projects (id, name, topic, current_step, status, script_generated)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(project.id, project.name, project.topic, project.current_step, project.status, project.script_generated ? 1 : 0);
    });

    it('[2.4-INT-003] should generate 3-5 scenes', async () => {
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

    it('[2.4-INT-004] should return scenes with sequential scene_number', async () => {
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

    it('[2.4-INT-005] should return scenes with text field', async () => {
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

  describe('[P1] AC11: Database Storage', () => {
    beforeEach(() => {
      // Use factory for consistent test data
      const project = createTestProject({
        id: testProjectId,
        topic: 'Test topic',
        current_step: 'script-generation',
        status: 'draft',
      });

      db.prepare(`
        INSERT INTO projects (id, name, topic, current_step, status, script_generated)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(project.id, project.name, project.topic, project.current_step, project.status, project.script_generated ? 1 : 0);
    });

    it('[2.4-INT-006] should save scenes to database in correct order', async () => {
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

    it('[2.4-INT-007] should save scenes with correct project_id', async () => {
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

    it('[2.4-INT-008] should transform camelCase to snake_case', async () => {
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

  describe('[P1] AC15 & AC16: Project Status Updates', () => {
    beforeEach(() => {
      const project = createTestProject({
        id: testProjectId,
        topic: 'Test topic',
        current_step: 'script-generation',
        status: 'draft',
        script_generated: false,
      });

      db.prepare(`
        INSERT INTO projects (id, name, topic, current_step, status, script_generated)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(project.id, project.name, project.topic, project.current_step, project.status, project.script_generated ? 1 : 0);
    });

    it('[2.4-INT-009] should set script_generated flag to true', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/generate-script`,
        { method: 'POST' }
      );

      await generateScriptHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Verify flag was updated (SQLite returns INTEGER for BOOLEAN)
      const project = getProject(testProjectId);
      expect(project?.script_generated).toBeTruthy();
    });

    it('[2.4-INT-010] should update current_step to "voiceover"', async () => {
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

  describe('[P1] Error Handling', () => {
    it('[2.4-INT-011] should return 404 when project not found', async () => {
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

it('[2.4-INT-012] should return 400 when topic is missing', async () => {      // Create project without topic
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

it('[2.4-INT-013] should return 500 when script generation fails', async () => {      // Mock script generator to fail
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
      `).run(testProjectId, 'Test Project', 'Test topic', 'script-generation', 'draft');

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

    it('[2.4-INT-014] should return 400 when project ID is missing', async () => {
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

  describe('[P2] Response Format', () => {
    beforeEach(() => {
      // Use factory for consistent test data
      const project = createTestProject({
        id: testProjectId,
        topic: 'Test topic',
        current_step: 'script-generation',
        status: 'draft',
      });

      db.prepare(`
        INSERT INTO projects (id, name, topic, current_step, status, script_generated)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(project.id, project.name, project.topic, project.current_step, project.status, project.script_generated ? 1 : 0);
    });

    it('[2.4-INT-015] should return standard success response format', async () => {
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

    it('[2.4-INT-016] should include all scene fields in response', async () => {
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
