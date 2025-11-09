/**
 * Voiceover Generation API Tests
 *
 * Tests the POST /api/projects/[id]/generate-voiceovers endpoint
 *
 * Story 2.5: Voiceover Generation for Scenes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/projects/[id]/generate-voiceovers/route';
import { GET } from '@/app/api/projects/[id]/voiceover-progress/route';
import {
  createProject,
  updateProject,
  createScene,
  getProject,
  getScenesByProjectId,
} from '@/lib/db/queries';
import { initializeDatabase } from '@/lib/db/init';
import { existsSync, rmSync } from 'fs';
import path from 'path';

// Initialize database before tests
initializeDatabase();

describe('2.5-API Voiceover Generation API Tests', () => {
  let testProjectId: string;
  const testCacheDir = path.join(process.cwd(), '.cache', 'audio', 'projects');

  beforeEach(() => {
    // Create test project
    const project = createProject('API Test Project');
    testProjectId = project.id;

    // Set up project with prerequisites
    updateProject(testProjectId, {
      topic: 'Test Topic',
      voice_id: 'sarah',
      script_generated: true,
      voice_selected: true,
      current_step: 'voiceover',
    });

    // Create test scenes
    createScene({
      project_id: testProjectId,
      scene_number: 1,
      text: 'This is test scene one.',
    });

    createScene({
      project_id: testProjectId,
      scene_number: 2,
      text: 'This is test scene two.',
    });
  });

  afterEach(() => {
    // Clean up test audio files
    const projectDir = path.join(testCacheDir, testProjectId);
    if (existsSync(projectDir)) {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  describe('POST /api/projects/[id]/generate-voiceovers [P0]', () => {
    it('[2.5-API-001] [P0] should return 200 with success response when generation succeeds', async () => {
      // Given: Project with script and voice selected (setup in beforeEach)

      // When: POST /api/projects/[id]/generate-voiceovers
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Then: Should return 200 with success response and generation summary
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('projectId');
      expect(data.data).toHaveProperty('sceneCount');
      expect(data.data).toHaveProperty('totalDuration');
      expect(data.data).toHaveProperty('audioFiles');
      expect(data.data.projectId).toBe(testProjectId);
      expect(data.data.sceneCount).toBe(2);
      expect(data.data.totalDuration).toBeGreaterThan(0);
      expect(data.data.audioFiles.length).toBe(2);
    });

    it('[2.5-API-002] [P0] should return 404 when project not found', async () => {
      // Given: Non-existent project ID

      // When: POST /api/projects/[id]/generate-voiceovers with invalid ID
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: 'nonexistent-id' }),
      });

      // Then: Should return 404 with PROJECT_NOT_FOUND error
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
      expect(data.code).toBe('PROJECT_NOT_FOUND');
    });

    it('[2.5-API-003] [P0] should return 400 when script not generated', async () => {
      // Given: Project with script_generated=false
      updateProject(testProjectId, { script_generated: false });

      // When: POST /api/projects/[id]/generate-voiceovers
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Then: Should return 400 with SCRIPT_NOT_GENERATED error
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Script must be generated');
      expect(data.code).toBe('SCRIPT_NOT_GENERATED');
    });

    it('[2.5-API-004] [P0] should return 400 when voice not selected', async () => {
      // Given: Project with voice_id=null
      updateProject(testProjectId, { voice_id: null });

      // When: POST /api/projects/[id]/generate-voiceovers
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Then: Should return 400 with VOICE_NOT_SELECTED error
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Voice must be selected');
      expect(data.code).toBe('VOICE_NOT_SELECTED');
    });

    it('[2.5-API-005] [P1] should return 400 when no scenes exist', async () => {
      // Given: Project with no scenes
      const emptyProjectId = createProject('Empty Project').id;
      updateProject(emptyProjectId, {
        voice_id: 'sarah',
        script_generated: true,
      });

      // When: POST /api/projects/[id]/generate-voiceovers
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: emptyProjectId }),
      });

      // Then: Should return 400 with NO_SCENES_FOUND error
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('No scenes');
      expect(data.code).toBe('NO_SCENES_FOUND');
    });

    it('[2.5-API-006] [P0] should update database with audio paths and durations', async () => {
      // Given: Project with 2 scenes (setup in beforeEach)

      // When: POST /api/projects/[id]/generate-voiceovers
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      await POST(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Then: All scenes should be updated with audio_file_path and duration
      const scenes = getScenesByProjectId(testProjectId);
      expect(scenes[0].audio_file_path).toBeTruthy();
      expect(scenes[0].duration).toBeGreaterThan(0);
      expect(scenes[1].audio_file_path).toBeTruthy();
      expect(scenes[1].duration).toBeGreaterThan(0);
    });

    it('[2.5-API-007] [P0] should update project workflow step', async () => {
      // Given: Project with current_step='voiceover'

      // When: POST /api/projects/[id]/generate-voiceovers completes
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      await POST(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Then: Project workflow should advance to 'visual-sourcing'
      const project = getProject(testProjectId);
      expect(project!.current_step).toBe('visual-sourcing');
    });

    it('[2.5-API-008] [P1] should include generation summary in response', async () => {
      // Given: Project with 2 scenes

      // When: POST /api/projects/[id]/generate-voiceovers
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Then: Response should include generation summary with counts
      const data = await response.json();
      expect(data.data.summary).toBeDefined();
      expect(data.data.summary).toHaveProperty('completed');
      expect(data.data.summary).toHaveProperty('skipped');
      expect(data.data.summary).toHaveProperty('failed');
    });
  });

  describe('GET /api/projects/[id]/voiceover-progress [P1]', () => {
    it('[2.5-API-009] [P2] should return idle status when no generation in progress', async () => {
      // Given: Project with no active voiceover generation

      // When: GET /api/projects/[id]/voiceover-progress
      const request = new Request('http://localhost/api/projects/test/voiceover-progress');

      const response = await GET(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Then: Should return 200 with idle status
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('idle');
      expect(data.data.progress).toBe(0);
    });

    it('[2.5-API-010] [P2] should return progress data structure', async () => {
      // Given: Project with no active generation

      // When: GET /api/projects/[id]/voiceover-progress
      const request = new Request('http://localhost/api/projects/test/voiceover-progress');

      const response = await GET(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Then: Response should have correct data structure
      const data = await response.json();
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('currentScene');
      expect(data.data).toHaveProperty('totalScenes');
      expect(data.data).toHaveProperty('progress');
    });
  });

  describe('Response Format Validation [P1]', () => {
    it('[2.5-API-011] [P1] should return audio files with correct structure', async () => {
      // Given: Project with 2 scenes

      // When: POST /api/projects/[id]/generate-voiceovers
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      // Then: Audio files should have correct structure
      const data = await response.json();
      const audioFile = data.data.audioFiles[0];

      expect(audioFile).toHaveProperty('sceneNumber');
      expect(audioFile).toHaveProperty('audioPath');
      expect(audioFile).toHaveProperty('duration');
      expect(typeof audioFile.sceneNumber).toBe('number');
      expect(typeof audioFile.audioPath).toBe('string');
      expect(typeof audioFile.duration).toBe('number');
    });

    it('[2.5-API-012] [P1] should return standard error format on failure', async () => {
      // Given: Invalid project ID

      // When: POST /api/projects/[id]/generate-voiceovers with invalid ID
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: 'invalid-id' }),
      });

      // Then: Should return standard error format
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      expect(data.success).toBe(false);
      expect(typeof data.error).toBe('string');
      expect(typeof data.code).toBe('string');
    });
  });

  describe('Error Code Coverage [P2]', () => {
    it('[2.5-API-013] [P2] should return correct error codes for each error type', async () => {
      // Given: Multiple error scenarios to test

      // When/Then: Each error scenario should return correct error code
      const errorScenarios = [
        {
          setup: () => updateProject(testProjectId, { script_generated: false }),
          expectedCode: 'SCRIPT_NOT_GENERATED',
        },
        {
          setup: () => updateProject(testProjectId, { voice_id: null }),
          expectedCode: 'VOICE_NOT_SELECTED',
        },
      ];

      for (const scenario of errorScenarios) {
        // Reset project to valid state
        updateProject(testProjectId, {
          script_generated: true,
          voice_id: 'sarah',
        });

        // Apply error scenario setup
        scenario.setup();

        // POST request
        const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
          method: 'POST',
        });

        const response = await POST(request, {
          params: Promise.resolve({ id: testProjectId }),
        });

        // Verify correct error code returned
        const data = await response.json();
        expect(data.code).toBe(scenario.expectedCode);
      }
    });
  });
});
