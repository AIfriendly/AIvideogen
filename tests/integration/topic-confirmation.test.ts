/**
 * Integration Tests for Topic Confirmation Workflow - Story 1.7
 *
 * Tests the complete topic confirmation flow:
 * - Chat API detects video creation intent
 * - Topic extracted from conversation
 * - Database updated on confirmation
 * - API endpoints work together
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import db from '@/lib/db/client';
import { POST as chatHandler } from '@/app/api/chat/route';
import { PUT as projectPutHandler } from '@/app/api/projects/[id]/route';

// Mock LLM provider
vi.mock('@/lib/llm/factory', () => ({
  createLLMProvider: () => ({
    chat: vi.fn().mockResolvedValue(
      'Great! I can help you create a video about that topic. Let me confirm: you want to make a video about Mars colonization, correct?'
    ),
  }),
}));

describe('1.7-INT: Topic Confirmation Workflow - Integration Tests', () => {
  const testProjectId = 'test-project-123';

  beforeEach(() => {
    // Clear database and create test project
    db.exec('DELETE FROM messages');
    db.exec('DELETE FROM projects');

    db.prepare(`
      INSERT INTO projects (id, name, current_step, status)
      VALUES (?, ?, ?, ?)
    `).run(testProjectId, 'New Project', 'topic', 'draft');
  });

  describe('[P0] AC1 & AC2: Topic Detection and Dialog Display', () => {
    it('1.7-INT-001 [P0]: should detect topic and trigger dialog when video creation command issued', async () => {
      const requestBody = {
        projectId: testProjectId,
        message: 'Make a video about Mars colonization',
      };

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await chatHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.topicDetected).toBe(true);
      expect(data.data.extractedTopic).toBe('Mars colonization');
    });

    it('1.7-INT-002 [P0]: should not detect topic for non-video-creation messages', async () => {
      const requestBody = {
        projectId: testProjectId,
        message: 'Hello, how are you?',
      };

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await chatHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.topicDetected).toBeUndefined();
      expect(data.data.extractedTopic).toBeUndefined();
    });

    it('1.7-INT-003 [P0]: should extract topic from conversation context', async () => {
      // Add some conversation history
      db.prepare(`
        INSERT INTO messages (id, project_id, role, content, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).run('msg-1', testProjectId, 'user', 'I want to make a video about renewable energy', new Date().toISOString());

      db.prepare(`
        INSERT INTO messages (id, project_id, role, content, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).run('msg-2', testProjectId, 'assistant', 'That sounds great!', new Date().toISOString());

      const requestBody = {
        projectId: testProjectId,
        message: 'Yes, create the video now',
      };

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await chatHandler(request);
      const data = await response.json();

      expect(data.data.topicDetected).toBe(true);
      expect(data.data.extractedTopic).toBe('renewable energy');
    });
  });

  describe('[P0] AC3: Confirm Topic', () => {
    it('1.7-INT-004 [P0]: should update database when topic confirmed via PUT endpoint', async () => {
      const updateBody = {
        topic: 'Mars colonization',
        name: 'Mars colonization',
        currentStep: 'voice',
      };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateBody),
        }
      );

      const response = await projectPutHandler(
        request,
        { params: Promise.resolve({ id: testProjectId }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.project.topic).toBe('Mars colonization');
      expect(data.data.project.name).toBe('Mars colonization');
      expect(data.data.project.currentStep).toBe('voice');

      // Verify database updated
      const project = db
        .prepare('SELECT * FROM projects WHERE id = ?')
        .get(testProjectId) as any;

      expect(project.topic).toBe('Mars colonization');
      expect(project.name).toBe('Mars colonization');
      expect(project.current_step).toBe('voice');
    });

    it('1.7-INT-005 [P2]: should truncate long topic for project name', async () => {
      const longTopic = 'A very long topic about space exploration and the future of humanity in the cosmos that exceeds fifty characters';
      const expectedName = longTopic.substring(0, 50).replace(/\s+\S*$/, ''); // Truncate to last word

      const updateBody = {
        topic: longTopic,
        name: expectedName,
        currentStep: 'voice',
      };

      const request = new Request(
        `http://localhost:3000/api/projects/${testProjectId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateBody),
        }
      );

      const response = await projectPutHandler(
        request,
        { params: Promise.resolve({ id: testProjectId }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.project.topic).toBe(longTopic);
      expect(data.data.project.name.length).toBeLessThanOrEqual(50);
    });
  });

  describe('[P0] TopicConfirmation Component Integration', () => {
    it('1.7-INT-006 [P0]: should handle confirmation workflow through API', async () => {
      // Simulate user confirming a topic through API calls
      // 1. Chat detects topic
      const chatRequest = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: testProjectId,
          message: 'Make a video about Mars colonization',
        }),
      });

      const chatResponse = await chatHandler(chatRequest);
      const chatData = await chatResponse.json();

      expect(chatData.data.topicDetected).toBe(true);
      expect(chatData.data.extractedTopic).toBe('Mars colonization');

      // 2. User confirms - update project
      const updateRequest = new Request(
        `http://localhost:3000/api/projects/${testProjectId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: chatData.data.extractedTopic,
            name: chatData.data.extractedTopic,
            currentStep: 'voice',
          }),
        }
      );

      const updateResponse = await projectPutHandler(
        updateRequest,
        { params: Promise.resolve({ id: testProjectId }) }
      );
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.data.project.topic).toBe('Mars colonization');
      expect(updateData.data.project.currentStep).toBe('voice');

      // 3. Verify database state
      const project = db
        .prepare('SELECT * FROM projects WHERE id = ?')
        .get(testProjectId) as any;

      expect(project.topic).toBe('Mars colonization');
      expect(project.current_step).toBe('voice');
    });
  });

  describe('[P1] AC4: Edit Workflow', () => {
    it('1.7-INT-007 [P1]: should not update database topic when user chooses to edit', async () => {
      // Simulate topic detection
      const chatRequest = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: testProjectId,
          message: 'Make a video about Mars colonization',
        }),
      });

      await chatHandler(chatRequest);

      // User chooses to edit (doesn't call PUT endpoint)
      // Verify database - topic and current_step should be unchanged
      const project = db
        .prepare('SELECT * FROM projects WHERE id = ?')
        .get(testProjectId) as any;

      expect(project.topic).toBeNull(); // Topic not confirmed yet
      expect(project.current_step).toBe('topic'); // Still in topic step
      // Note: name gets auto-generated from first message, which is expected
    });
  });

  describe('[P1] Error Handling', () => {
    it('1.7-INT-008 [P1]: should handle API errors during confirmation gracefully', async () => {
      // Create request with invalid project ID
      const updateBody = {
        topic: 'Test Topic',
        name: 'Test Topic',
        currentStep: 'voice',
      };

      const request = new Request(
        'http://localhost:3000/api/projects/invalid-id',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateBody),
        }
      );

      const response = await projectPutHandler(
        request,
        { params: Promise.resolve({ id: 'invalid-id' }) }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('[P2] Multiple Refinement Cycles', () => {
    it('1.7-INT-009 [P2]: should allow edit -> refine -> new command -> confirm workflow', async () => {
      // First message
      let requestBody = {
        projectId: testProjectId,
        message: 'Make a video about dogs',
      };

      let request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      let response = await chatHandler(request);
      let data = await response.json();

      expect(data.data.extractedTopic).toBe('dogs');

      // User edits (simulated by not confirming and sending new message)
      requestBody = {
        projectId: testProjectId,
        message: 'Actually, make a video about cats instead',
      };

      request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      response = await chatHandler(request);
      data = await response.json();

      expect(data.data.extractedTopic).toBe('cats instead');

      // Verify project still at topic step
      const project = db
        .prepare('SELECT * FROM projects WHERE id = ?')
        .get(testProjectId) as any;
      expect(project.current_step).toBe('topic');
      expect(project.topic).toBeNull();
    });
  });
});
