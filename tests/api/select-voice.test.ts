/**
 * API Tests for Voice Selection Endpoint - Story 2.3
 *
 * Tests the POST /api/projects/[id]/select-voice endpoint:
 * - Request validation
 * - Database updates
 * - Response format
 * - Error handling
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { POST as selectVoiceHandler } from '@/app/api/projects/[id]/select-voice/route';
import { getProject } from '@/lib/db/queries';
import { setupProjectFixture } from '../fixtures/db-fixtures';

describe('[P0] POST /api/projects/[id]/select-voice', () => {
  let testProject: ReturnType<typeof setupProjectFixture>;

  beforeEach(() => {
    // Use fixture for database setup - explicit, reusable, composable
    testProject = setupProjectFixture({
      name: 'API Test Project',
      topic: 'Space exploration',
      current_step: 'voice',
      status: 'draft',
    });
  });

  describe('[P0] Valid Requests', () => {
    it('[2.3-API-001] should accept valid voiceId and return success', async () => {
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
    });

    it('[2.3-API-002] should accept all MVP voice IDs', async () => {
      const mvpVoices = ['sarah', 'james', 'emma', 'michael', 'olivia'];

      for (const voiceId of mvpVoices) {
        // Reset project for each voice test using fixture
        testProject = setupProjectFixture({
          name: 'API Test Project',
          topic: 'Space exploration',
          current_step: 'voice',
          status: 'draft',
        });

        const requestBody = { voiceId };

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
        expect(data.data.voiceId).toBe(voiceId);
      }
    });
  });

  describe('[P0] Database Updates', () => {
    it('[2.3-API-003] should update projects.voice_id', async () => {
      const requestBody = { voiceId: 'james' };

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
      expect(project?.voice_id).toBe('james');
    });

    it('[2.3-API-004] should set projects.voice_selected to true', async () => {
      const requestBody = { voiceId: 'emma' };

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
      expect(project?.voice_selected).toBe(1); // SQLite stores boolean as 0/1
    });

    it('[2.3-API-005] should update projects.current_step to script-generation', async () => {
      const requestBody = { voiceId: 'michael' };

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

    it('[2.3-API-006] should update projects.last_active timestamp', async () => {
      const project = getProject(testProject.id);
      const originalLastActive = project?.last_active;

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const requestBody = { voiceId: 'olivia' };

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

  describe('[P2] Response Format', () => {
    it('[2.3-API-007] should return SelectVoiceResponse interface', async () => {
      const requestBody = { voiceId: 'sarah' };

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

      expect(data).toMatchObject({
        success: true,
        data: {
          projectId: testProject.id,
          voiceId: 'sarah',
          voiceSelected: true,
          currentStep: 'script-generation',
        },
      });
    });
  });

  describe('[P0] Error Handling - Invalid VoiceId', () => {
    it('[2.3-API-008] should reject non-MVP voiceId', async () => {
      const requestBody = { voiceId: 'non-existent-voice' };

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

    it('[2.3-API-009] should reject missing voiceId', async () => {
      const requestBody = {};

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
      expect(data.error.code).toBe('INVALID_VOICE_ID');
    });

    it('[2.3-API-010] should reject non-string voiceId', async () => {
      const requestBody = { voiceId: 123 };

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
      expect(data.error.code).toBe('INVALID_VOICE_ID');
    });
  });

  describe('[P0] Error Handling - Invalid ProjectId', () => {
    it('[2.3-API-011] should reject non-existent projectId', async () => {
      const requestBody = { voiceId: 'sarah' };

      const request = new Request(
        'http://localhost:3000/api/projects/00000000-0000-0000-0000-000000000000/select-voice',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('[2.3-API-012] should reject invalid UUID format', async () => {
      const requestBody = { voiceId: 'sarah' };

      const request = new Request(
        'http://localhost:3000/api/projects/invalid-uuid/select-voice',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: 'invalid-uuid' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PROJECT_ID');
    });
  });

  describe('[P1] Error Handling - Invalid Request', () => {
    it('[2.3-API-013] should reject invalid JSON', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProject.id}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProject.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });
  });

  describe('[P2] Error Response Format', () => {
    it('[2.3-API-014] should return standard error format', async () => {
      const requestBody = { voiceId: 'invalid' };

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

      expect(data).toMatchObject({
        success: false,
        error: {
          message: expect.any(String),
          code: expect.any(String),
        },
      });
    });
  });
});
