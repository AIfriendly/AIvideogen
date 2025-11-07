/**
 * Integration Tests for Voice Selection Workflow - Story 2.3
 *
 * Tests the complete voice selection flow:
 * - Voice selection UI displays after topic confirmation
 * - Voice profiles loaded from API
 * - Voice selection persisted to database
 * - Navigation to script generation
 * - Workflow state guards
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { POST as selectVoiceHandler } from '@/app/api/projects/[id]/select-voice/route';
import { GET as voiceListHandler } from '@/app/api/voice/list/route';
import { getProject } from '@/lib/db/queries';
import { setupProjectFixture } from '../fixtures/db-fixtures';

describe('[P1] Voice Selection Workflow - Integration Tests', () => {
  let testProject: ReturnType<typeof setupProjectFixture>;

  beforeEach(() => {
    // Use fixture for database setup - explicit, reusable, composable
    testProject = setupProjectFixture({
      name: 'Voice Test Project',
      topic: 'Mars colonization',
      current_step: 'voice',
      status: 'draft',
    });
  });

  describe('[P1] AC1: Voice List API Integration', () => {
    it('[2.3-INT-001] should fetch voice profiles from GET /api/voice/list', async () => {
      const request = new Request('http://localhost:3000/api/voice/list', {
        method: 'GET',
      });

      const response = await voiceListHandler();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.voices).toBeDefined();
      expect(Array.isArray(data.data.voices)).toBe(true);
      expect(data.data.voices.length).toBeGreaterThanOrEqual(5); // MVP voices
    });

    it('[2.3-INT-002] should return voice metadata in correct format', async () => {
      const response = await voiceListHandler();
      const data = await response.json();

      const voice = data.data.voices[0];
      expect(voice).toHaveProperty('id');
      expect(voice).toHaveProperty('name');
      expect(voice).toHaveProperty('gender');
      expect(voice).toHaveProperty('accent');
      expect(voice).toHaveProperty('tone');
      expect(voice).toHaveProperty('previewUrl');
      expect(voice.gender).toMatch(/^(male|female)$/);
    });
  });

  describe('[P0] AC5: Voice Selection Persistence', () => {
    it('[2.3-INT-003] should save selected voice to database', async () => {
      const requestBody = {
        voiceId: 'sarah',
      };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProject.id}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProject.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.voiceId).toBe('sarah');
      expect(data.data.voiceSelected).toBe(true);
      expect(data.data.currentStep).toBe('script-generation');

      // Verify database updated
      const project = getProject(testProject.id);
      expect(project).toBeDefined();
      expect(project?.voice_id).toBe('sarah');
      expect(project?.voice_selected).toBe(1); // SQLite stores boolean as 0/1
      expect(project?.current_step).toBe('script-generation');
    });

    it('[2.3-INT-004] should update last_active timestamp when voice selected', async () => {
      const project = getProject(testProject.id);
      const originalLastActive = project?.last_active;

      // Wait a moment to ensure timestamp difference (1 second for SQLite datetime precision)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const requestBody = {
        voiceId: 'james',
      };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProject.id}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProject.id }),
      });

      const updatedProject = getProject(testProject.id);
      expect(updatedProject?.last_active).not.toBe(originalLastActive);
    });
  });

  describe('[P0] AC7: Error Handling', () => {
    it('[2.3-INT-005] should return VOICE_NOT_FOUND error for invalid voiceId', async () => {
      const requestBody = {
        voiceId: 'invalid-voice-id',
      };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProject.id}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProject.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VOICE_NOT_FOUND');
    });

    it('[2.3-INT-006] should return PROJECT_NOT_FOUND error for invalid projectId', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-999999999999';
      const requestBody = {
        voiceId: 'sarah',
      };

      const request = new Request(
        `http://localhost:3000/api/projects/${nonExistentUuid}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: nonExistentUuid }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('[2.3-INT-007] should validate request body format', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProject.id}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invalidField: 'value' }),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProject.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_VOICE_ID');
    });
  });

  describe('[P1] Workflow State Guards', () => {
    it('[2.3-INT-008] should allow voice selection when topic is confirmed', async () => {
      const requestBody = {
        voiceId: 'emma',
      };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProject.id}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProject.id }),
      });

      expect(response.status).toBe(200);
    });

    it('[2.3-INT-009] should update current_step to script-generation after voice selection', async () => {
      const requestBody = {
        voiceId: 'michael',
      };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProject.id}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProject.id }),
      });

      const project = getProject(testProject.id);
      expect(project?.current_step).toBe('script-generation');
    });
  });

  describe('[P2] Voice Selection Response Format', () => {
    it('[2.3-INT-010] should return standard success response format', async () => {
      const requestBody = {
        voiceId: 'olivia',
      };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProject.id}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProject.id }),
      });
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('projectId');
      expect(data.data.projectId).toBe(testProject.id);
      expect(data.data).toHaveProperty('voiceId');
      expect(data.data).toHaveProperty('voiceSelected');
      expect(data.data).toHaveProperty('currentStep');
    });

    it('[2.3-INT-011] should return standard error response format', async () => {
      const requestBody = {
        voiceId: 'invalid',
      };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProject.id}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProject.id }),
      });
      const data = await response.json();

      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('message');
      expect(data.error).toHaveProperty('code');
    });
  });
});
