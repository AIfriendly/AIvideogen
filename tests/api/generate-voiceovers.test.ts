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

describe('Voiceover Generation API Tests', () => {
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

  describe('POST /api/projects/[id]/generate-voiceovers', () => {
    it('should return 200 with success response when generation succeeds', async () => {
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

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

    it('should return 404 when project not found', async () => {
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: 'nonexistent-id' }),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
      expect(data.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 400 when script not generated', async () => {
      updateProject(testProjectId, { script_generated: false });

      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Script must be generated');
      expect(data.code).toBe('SCRIPT_NOT_GENERATED');
    });

    it('should return 400 when voice not selected', async () => {
      updateProject(testProjectId, { voice_id: null });

      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Voice must be selected');
      expect(data.code).toBe('VOICE_NOT_SELECTED');
    });

    it('should return 400 when no scenes exist', async () => {
      const emptyProjectId = createProject('Empty Project').id;
      updateProject(emptyProjectId, {
        voice_id: 'sarah',
        script_generated: true,
      });

      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: emptyProjectId }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('No scenes');
      expect(data.code).toBe('NO_SCENES_FOUND');
    });

    it('should update database with audio paths and durations', async () => {
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      await POST(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      const scenes = getScenesByProjectId(testProjectId);
      expect(scenes[0].audio_file_path).toBeTruthy();
      expect(scenes[0].duration).toBeGreaterThan(0);
      expect(scenes[1].audio_file_path).toBeTruthy();
      expect(scenes[1].duration).toBeGreaterThan(0);
    });

    it('should update project workflow step', async () => {
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      await POST(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      const project = getProject(testProjectId);
      expect(project!.current_step).toBe('visual-sourcing');
    });

    it('should include generation summary in response', async () => {
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      const data = await response.json();
      expect(data.data.summary).toBeDefined();
      expect(data.data.summary).toHaveProperty('completed');
      expect(data.data.summary).toHaveProperty('skipped');
      expect(data.data.summary).toHaveProperty('failed');
    });
  });

  describe('GET /api/projects/[id]/voiceover-progress', () => {
    it('should return idle status when no generation in progress', async () => {
      const request = new Request('http://localhost/api/projects/test/voiceover-progress');

      const response = await GET(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('idle');
      expect(data.data.progress).toBe(0);
    });

    it('should return progress data structure', async () => {
      const request = new Request('http://localhost/api/projects/test/voiceover-progress');

      const response = await GET(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      const data = await response.json();
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('currentScene');
      expect(data.data).toHaveProperty('totalScenes');
      expect(data.data).toHaveProperty('progress');
    });
  });

  describe('Response Format Validation', () => {
    it('should return audio files with correct structure', async () => {
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      const data = await response.json();
      const audioFile = data.data.audioFiles[0];

      expect(audioFile).toHaveProperty('sceneNumber');
      expect(audioFile).toHaveProperty('audioPath');
      expect(audioFile).toHaveProperty('duration');
      expect(typeof audioFile.sceneNumber).toBe('number');
      expect(typeof audioFile.audioPath).toBe('string');
      expect(typeof audioFile.duration).toBe('number');
    });

    it('should return standard error format on failure', async () => {
      const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: 'invalid-id' }),
      });

      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      expect(data.success).toBe(false);
      expect(typeof data.error).toBe('string');
      expect(typeof data.code).toBe('string');
    });
  });

  describe('Error Code Coverage', () => {
    it('should return correct error codes for each error type', async () => {
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
        // Reset project
        updateProject(testProjectId, {
          script_generated: true,
          voice_id: 'sarah',
        });

        // Apply setup
        scenario.setup();

        const request = new Request('http://localhost/api/projects/test/generate-voiceovers', {
          method: 'POST',
        });

        const response = await POST(request, {
          params: Promise.resolve({ id: testProjectId }),
        });

        const data = await response.json();
        expect(data.code).toBe(scenario.expectedCode);
      }
    });
  });
});
