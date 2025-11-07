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
import db from '@/lib/db/client';
import { POST as selectVoiceHandler } from '@/app/api/projects/[id]/select-voice/route';
import { getProject } from '@/lib/db/queries';

describe('POST /api/projects/[id]/select-voice', () => {
  const testProjectId = '00000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    // Clear database and create test project
    db.exec('DELETE FROM messages');
    db.exec('DELETE FROM projects');

    db.prepare(`
      INSERT INTO projects (id, name, topic, current_step, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(testProjectId, 'API Test Project', 'Space exploration', 'voice', 'draft');
  });

  describe('Valid Requests', () => {
    it('should accept valid voiceId and return success', async () => {
      const requestBody = {
        voiceId: 'sarah',
      };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.voiceId).toBe('sarah');
    });

    it('should accept all MVP voice IDs', async () => {
      const mvpVoices = ['sarah', 'james', 'emma', 'michael', 'olivia'];

      for (const voiceId of mvpVoices) {
        // Ensure project exists and reset it for each voice test
        db.exec('DELETE FROM projects');
        db.prepare(`
          INSERT INTO projects (id, name, topic, current_step, status)
          VALUES (?, ?, ?, ?, ?)
        `).run(testProjectId, 'API Test Project', 'Space exploration', 'voice', 'draft');

        const requestBody = { voiceId };

        const request = new Request(
          `http://localhost:3000/api/projects/${testProjectId}/select-voice`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }
        );

        const response = await selectVoiceHandler(request, {
          params: Promise.resolve({ id: testProjectId }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.voiceId).toBe(voiceId);
      }
    });
  });

  describe('Database Updates', () => {
    it('should update projects.voice_id', async () => {
      const requestBody = { voiceId: 'james' };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      const project = getProject(testProjectId);
      expect(project?.voice_id).toBe('james');
    });

    it('should set projects.voice_selected to true', async () => {
      const requestBody = { voiceId: 'emma' };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      const project = getProject(testProjectId);
      expect(project?.voice_selected).toBe(1); // SQLite stores boolean as 0/1
    });

    it('should update projects.current_step to script-generation', async () => {
      const requestBody = { voiceId: 'michael' };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      const project = getProject(testProjectId);
      expect(project?.current_step).toBe('script-generation');
    });

    it('should update projects.last_active timestamp', async () => {
      const project = getProject(testProjectId);
      const originalLastActive = project?.last_active;

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const requestBody = { voiceId: 'olivia' };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });

      const updatedProject = getProject(testProjectId);
      expect(updatedProject?.last_active).not.toBe(originalLastActive);
    });
  });

  describe('Response Format', () => {
    it('should return SelectVoiceResponse interface', async () => {
      const requestBody = { voiceId: 'sarah' };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });
      const data = await response.json();

      expect(data).toMatchObject({
        success: true,
        data: {
          projectId: testProjectId,
          voiceId: 'sarah',
          voiceSelected: true,
          currentStep: 'script-generation',
        },
      });
    });
  });

  describe('Error Handling - Invalid VoiceId', () => {
    it('should reject non-MVP voiceId', async () => {
      const requestBody = { voiceId: 'non-existent-voice' };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VOICE_NOT_FOUND');
    });

    it('should reject missing voiceId', async () => {
      const requestBody = {};

      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_VOICE_ID');
    });

    it('should reject non-string voiceId', async () => {
      const requestBody = { voiceId: 123 };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_VOICE_ID');
    });
  });

  describe('Error Handling - Invalid ProjectId', () => {
    it('should reject non-existent projectId', async () => {
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

    it('should reject invalid UUID format', async () => {
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

  describe('Error Handling - Invalid Request', () => {
    it('should reject invalid JSON', async () => {
      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });
  });

  describe('Error Response Format', () => {
    it('should return standard error format', async () => {
      const requestBody = { voiceId: 'invalid' };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}/select-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await selectVoiceHandler(request, {
        params: Promise.resolve({ id: testProjectId }),
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
