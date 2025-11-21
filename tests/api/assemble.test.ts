/**
 * Assembly Trigger API Endpoint Tests - Epic 4, Story 4.5
 * Test ID Prefix: 4.5-API-xxx
 * Priority: P1/P2
 *
 * Tests for POST /api/projects/[id]/assemble endpoint.
 * Validates assembly trigger, selection validation, and error handling.
 *
 * Following TEA test-quality.md best practices:
 * - BDD format (Given-When-Then)
 * - Test IDs for traceability
 * - Priority markers for triage
 * - Explicit assertions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { faker } from '@faker-js/faker';

// Mock dependencies before importing the route
vi.mock('@/lib/db/client', () => ({
  default: {
    prepare: vi.fn(),
  },
}));

vi.mock('@/lib/db/queries', () => ({
  getProject: vi.fn(),
}));

vi.mock('@/lib/db/init', () => ({
  initializeDatabase: vi.fn(),
}));

// Import after mocks
import { POST } from '@/app/api/projects/[id]/assemble/route';
import db from '@/lib/db/client';
import { getProject } from '@/lib/db/queries';

const mockDb = vi.mocked(db);
const mockGetProject = vi.mocked(getProject);

describe('[4.5-API] Assembly Trigger Endpoint Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper to create a mock request
   */
  function createRequest(): NextRequest {
    return new NextRequest('http://localhost:3000/api/projects/test-id/assemble', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Helper to create params promise
   */
  function createParams(projectId: string): Promise<{ id: string }> {
    return Promise.resolve({ id: projectId });
  }

  describe('[4.5-API-001] [P1] Successful Assembly Trigger', () => {
    it('should return 200 with job ID when all scenes have selections', async () => {
      // Given: Valid project with all scenes having selections
      const projectId = faker.string.uuid();
      mockGetProject.mockReturnValue({
        id: projectId,
        name: 'Test Project',
        current_step: 'visual_curation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      // Mock total scenes count
      const mockCountStmt = {
        get: vi.fn().mockReturnValue({ count: 3 }),
      };

      // Mock scenes with selections
      const mockScenesStmt = {
        all: vi.fn().mockReturnValue([
          { sceneId: 's1', sceneNumber: 1, scriptText: 'Text 1', audioFilePath: 'audio1.mp3', selectedClipId: 'clip1', videoId: 'vid1', clipDuration: 30 },
          { sceneId: 's2', sceneNumber: 2, scriptText: 'Text 2', audioFilePath: 'audio2.mp3', selectedClipId: 'clip2', videoId: 'vid2', clipDuration: 25 },
          { sceneId: 's3', sceneNumber: 3, scriptText: 'Text 3', audioFilePath: 'audio3.mp3', selectedClipId: 'clip3', videoId: 'vid3', clipDuration: 35 },
        ]),
      };

      // Mock update statement
      const mockUpdateStmt = {
        run: vi.fn(),
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) return mockCountStmt;
        if (sql.includes('SELECT') && sql.includes('FROM scenes')) return mockScenesStmt;
        if (sql.includes('UPDATE projects')) return mockUpdateStmt;
        return { get: vi.fn(), all: vi.fn(), run: vi.fn() };
      });

      // When: Call the endpoint
      const request = createRequest();
      const response = await POST(request, { params: createParams(projectId) });
      const data = await response.json();

      // Then: Returns 200 with job ID and scene count
      expect(response.status).toBe(200);
      expect(data.assemblyJobId).toBeDefined();
      expect(data.assemblyJobId).toMatch(/^job-\d+-[a-z0-9]+$/);
      expect(data.status).toBe('queued');
      expect(data.message).toBe('Video assembly started');
      expect(data.sceneCount).toBe(3);
    });

    it('should update project current_step to editing', async () => {
      // Given: Valid project with all selections
      const projectId = faker.string.uuid();
      mockGetProject.mockReturnValue({
        id: projectId,
        name: 'Test Project',
        current_step: 'visual_curation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      const mockCountStmt = {
        get: vi.fn().mockReturnValue({ count: 1 }),
      };

      const mockScenesStmt = {
        all: vi.fn().mockReturnValue([
          { sceneId: 's1', sceneNumber: 1, scriptText: 'Text', audioFilePath: 'audio.mp3', selectedClipId: 'clip', videoId: 'vid', clipDuration: 30 },
        ]),
      };

      const mockUpdateStmt = {
        run: vi.fn(),
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) return mockCountStmt;
        if (sql.includes('SELECT') && sql.includes('FROM scenes')) return mockScenesStmt;
        if (sql.includes('UPDATE projects')) return mockUpdateStmt;
        return { get: vi.fn(), all: vi.fn(), run: vi.fn() };
      });

      // When: Call the endpoint
      const request = createRequest();
      await POST(request, { params: createParams(projectId) });

      // Then: Project status is updated to 'editing'
      expect(mockUpdateStmt.run).toHaveBeenCalledWith(projectId);
    });
  });

  describe('[4.5-API-002] [P1] Validation Errors', () => {
    it('should return 400 when not all scenes have selections', async () => {
      // Given: Project with 5 scenes but only 3 have selections
      const projectId = faker.string.uuid();
      mockGetProject.mockReturnValue({
        id: projectId,
        name: 'Test Project',
        current_step: 'visual_curation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      // Total of 5 scenes
      const mockCountStmt = {
        get: vi.fn().mockReturnValue({ count: 5 }),
      };

      // Only 3 have selections
      const mockScenesStmt = {
        all: vi.fn().mockReturnValue([
          { sceneId: 's1', sceneNumber: 1, scriptText: 'Text 1', audioFilePath: 'audio1.mp3', selectedClipId: 'clip1', videoId: 'vid1', clipDuration: 30 },
          { sceneId: 's2', sceneNumber: 2, scriptText: 'Text 2', audioFilePath: 'audio2.mp3', selectedClipId: 'clip2', videoId: 'vid2', clipDuration: 25 },
          { sceneId: 's3', sceneNumber: 3, scriptText: 'Text 3', audioFilePath: 'audio3.mp3', selectedClipId: 'clip3', videoId: 'vid3', clipDuration: 35 },
        ]),
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) return mockCountStmt;
        if (sql.includes('SELECT') && sql.includes('FROM scenes')) return mockScenesStmt;
        return { get: vi.fn(), all: vi.fn(), run: vi.fn() };
      });

      // When: Call the endpoint
      const request = createRequest();
      const response = await POST(request, { params: createParams(projectId) });
      const data = await response.json();

      // Then: Returns 400 with error details
      expect(response.status).toBe(400);
      expect(data.error).toBe('Not all scenes have clip selections');
      expect(data.selectedCount).toBe(3);
      expect(data.totalCount).toBe(5);
    });

    it('should return 400 when no scenes exist', async () => {
      // Given: Project with no scenes
      const projectId = faker.string.uuid();
      mockGetProject.mockReturnValue({
        id: projectId,
        name: 'Test Project',
        current_step: 'visual_curation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      const mockCountStmt = {
        get: vi.fn().mockReturnValue({ count: 0 }),
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) return mockCountStmt;
        return { get: vi.fn(), all: vi.fn(), run: vi.fn() };
      });

      // When: Call the endpoint
      const request = createRequest();
      const response = await POST(request, { params: createParams(projectId) });
      const data = await response.json();

      // Then: Returns 400
      expect(response.status).toBe(400);
      expect(data.error).toBe('No scenes found for this project');
    });
  });

  describe('[4.5-API-003] [P1] Project Not Found', () => {
    it('should return 404 when project does not exist', async () => {
      // Given: Non-existent project
      const projectId = faker.string.uuid();
      mockGetProject.mockReturnValue(null);

      // When: Call the endpoint
      const request = createRequest();
      const response = await POST(request, { params: createParams(projectId) });
      const data = await response.json();

      // Then: Returns 404
      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
      expect(data.code).toBe('NOT_FOUND');
    });
  });

  describe('[4.5-API-004] [P2] Error Handling', () => {
    it('should return 500 on database error', async () => {
      // Given: Project exists but database throws error
      const projectId = faker.string.uuid();
      mockGetProject.mockReturnValue({
        id: projectId,
        name: 'Test Project',
        current_step: 'visual_curation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      // Database throws error
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // When: Call the endpoint
      const request = createRequest();
      const response = await POST(request, { params: createParams(projectId) });
      const data = await response.json();

      // Then: Returns 500
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to trigger assembly');
      expect(data.code).toBe('DATABASE_ERROR');
    });
  });

  describe('[4.5-API-005] [P2] Job ID Generation', () => {
    it('should generate unique job IDs', async () => {
      // Given: Valid project with selections
      const projectId = faker.string.uuid();
      mockGetProject.mockReturnValue({
        id: projectId,
        name: 'Test Project',
        current_step: 'visual_curation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      const mockCountStmt = {
        get: vi.fn().mockReturnValue({ count: 1 }),
      };

      const mockScenesStmt = {
        all: vi.fn().mockReturnValue([
          { sceneId: 's1', sceneNumber: 1, scriptText: 'Text', audioFilePath: 'audio.mp3', selectedClipId: 'clip', videoId: 'vid', clipDuration: 30 },
        ]),
      };

      const mockUpdateStmt = {
        run: vi.fn(),
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) return mockCountStmt;
        if (sql.includes('SELECT') && sql.includes('FROM scenes')) return mockScenesStmt;
        if (sql.includes('UPDATE projects')) return mockUpdateStmt;
        return { get: vi.fn(), all: vi.fn(), run: vi.fn() };
      });

      // When: Call the endpoint twice
      const request1 = createRequest();
      const response1 = await POST(request1, { params: createParams(projectId) });
      const data1 = await response1.json();

      const request2 = createRequest();
      const response2 = await POST(request2, { params: createParams(projectId) });
      const data2 = await response2.json();

      // Then: Job IDs are different
      expect(data1.assemblyJobId).not.toBe(data2.assemblyJobId);
    });

    it('should follow job ID format: job-{timestamp}-{random}', async () => {
      // Given: Valid project with selections
      const projectId = faker.string.uuid();
      mockGetProject.mockReturnValue({
        id: projectId,
        name: 'Test Project',
        current_step: 'visual_curation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      const mockCountStmt = {
        get: vi.fn().mockReturnValue({ count: 1 }),
      };

      const mockScenesStmt = {
        all: vi.fn().mockReturnValue([
          { sceneId: 's1', sceneNumber: 1, scriptText: 'Text', audioFilePath: 'audio.mp3', selectedClipId: 'clip', videoId: 'vid', clipDuration: 30 },
        ]),
      };

      const mockUpdateStmt = {
        run: vi.fn(),
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) return mockCountStmt;
        if (sql.includes('SELECT') && sql.includes('FROM scenes')) return mockScenesStmt;
        if (sql.includes('UPDATE projects')) return mockUpdateStmt;
        return { get: vi.fn(), all: vi.fn(), run: vi.fn() };
      });

      // When: Call the endpoint
      const request = createRequest();
      const response = await POST(request, { params: createParams(projectId) });
      const data = await response.json();

      // Then: Job ID matches expected format
      const jobIdPattern = /^job-\d{13,}-[a-z0-9]{9}$/;
      expect(data.assemblyJobId).toMatch(jobIdPattern);
    });
  });
});
