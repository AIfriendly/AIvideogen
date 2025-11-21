/**
 * API Tests for Select Clip Endpoint
 *
 * Story 4.4: Clip Selection Mechanism & State Management
 *
 * Test Coverage:
 * 1. POST returns 200 with valid sceneId and suggestionId
 * 2. POST returns 400 for missing sceneId
 * 3. POST returns 400 for missing suggestionId
 * 4. POST returns 400 for invalid sceneId (not in project)
 * 5. POST returns 404 for non-existent project
 * 6. POST returns 409 for suggestionId not belonging to scene
 * 7. Database is updated with selected_clip_id
 * 8. Response format matches specification
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock database functions
const mockGetProject = vi.fn();
const mockUpdateSceneSelectedClip = vi.fn();
const mockDbPrepare = vi.fn();
const mockDbGet = vi.fn();

// Mock db client
vi.mock('@/lib/db/client', () => ({
  default: {
    prepare: (sql: string) => ({
      get: (...args: any[]) => mockDbGet(sql, ...args),
    }),
  },
}));

// Mock queries
vi.mock('@/lib/db/queries', () => ({
  getProject: (id: string) => mockGetProject(id),
  updateSceneSelectedClip: (sceneId: string, suggestionId: string) =>
    mockUpdateSceneSelectedClip(sceneId, suggestionId),
}));

// Mock init
vi.mock('@/lib/db/init', () => ({
  initializeDatabase: vi.fn(),
}));

// Import after mocks are set up
import { POST } from '../route';

describe('POST /api/projects/[id]/select-clip', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful mocks
    mockGetProject.mockReturnValue({
      id: 'project-1',
      name: 'Test Project',
    });

    mockDbGet.mockImplementation((sql: string, ...args: any[]) => {
      if (sql.includes('FROM scenes')) {
        return { id: args[0] };
      }
      if (sql.includes('FROM visual_suggestions')) {
        return { id: args[0] };
      }
      return null;
    });

    mockUpdateSceneSelectedClip.mockReturnValue({
      id: 'scene-1',
      selected_clip_id: 'suggestion-1',
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  it('[4.4-API-001] should return 200 with valid sceneId and suggestionId (AC4)', async () => {
    const request = new NextRequest('http://localhost/api/projects/project-1/select-clip', {
      method: 'POST',
      body: JSON.stringify({
        sceneId: 'scene-1',
        suggestionId: 'suggestion-1',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sceneId).toBe('scene-1');
    expect(data.selectedClipId).toBe('suggestion-1');
  });

  it('[4.4-API-002] should update database with selected_clip_id (AC4)', async () => {
    const request = new NextRequest('http://localhost/api/projects/project-1/select-clip', {
      method: 'POST',
      body: JSON.stringify({
        sceneId: 'scene-1',
        suggestionId: 'suggestion-1',
      }),
    });

    await POST(request, { params: Promise.resolve({ id: 'project-1' }) });

    expect(mockUpdateSceneSelectedClip).toHaveBeenCalledWith('scene-1', 'suggestion-1');
  });

  it('[4.4-API-003] should return correct response format', async () => {
    const request = new NextRequest('http://localhost/api/projects/project-1/select-clip', {
      method: 'POST',
      body: JSON.stringify({
        sceneId: 'scene-123',
        suggestionId: 'suggestion-456',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) });
    const data = await response.json();

    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('sceneId', 'scene-123');
    expect(data).toHaveProperty('selectedClipId', 'suggestion-456');
  });

  // ============================================================================
  // Validation Error Cases
  // ============================================================================

  it('[4.4-API-004] should return 400 for missing sceneId', async () => {
    const request = new NextRequest('http://localhost/api/projects/project-1/select-clip', {
      method: 'POST',
      body: JSON.stringify({
        suggestionId: 'suggestion-1',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('sceneId');
  });

  it('[4.4-API-005] should return 400 for missing suggestionId', async () => {
    const request = new NextRequest('http://localhost/api/projects/project-1/select-clip', {
      method: 'POST',
      body: JSON.stringify({
        sceneId: 'scene-1',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('suggestionId');
  });

  it('[4.4-API-006] should return 400 for invalid JSON body', async () => {
    const request = new NextRequest('http://localhost/api/projects/project-1/select-clip', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.code).toBe('INVALID_REQUEST');
  });

  // ============================================================================
  // Not Found Cases
  // ============================================================================

  it('[4.4-API-007] should return 404 for non-existent project', async () => {
    mockGetProject.mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/projects/non-existent/select-clip', {
      method: 'POST',
      body: JSON.stringify({
        sceneId: 'scene-1',
        suggestionId: 'suggestion-1',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'non-existent' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('[4.4-API-008] should return 400 for scene not in project', async () => {
    mockDbGet.mockImplementation((sql: string) => {
      if (sql.includes('FROM scenes')) {
        return null; // Scene not found
      }
      return { id: 'test' };
    });

    const request = new NextRequest('http://localhost/api/projects/project-1/select-clip', {
      method: 'POST',
      body: JSON.stringify({
        sceneId: 'scene-from-other-project',
        suggestionId: 'suggestion-1',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Scene not found');
  });

  // ============================================================================
  // Conflict Cases
  // ============================================================================

  it('[4.4-API-009] should return 409 for suggestion not belonging to scene', async () => {
    mockDbGet.mockImplementation((sql: string) => {
      if (sql.includes('FROM scenes')) {
        return { id: 'scene-1' }; // Scene exists
      }
      if (sql.includes('FROM visual_suggestions')) {
        return null; // Suggestion not found for this scene
      }
      return null;
    });

    const request = new NextRequest('http://localhost/api/projects/project-1/select-clip', {
      method: 'POST',
      body: JSON.stringify({
        sceneId: 'scene-1',
        suggestionId: 'suggestion-from-other-scene',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.success).toBe(false);
    expect(data.code).toBe('CONFLICT');
    expect(data.error).toContain('Suggestion does not belong');
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  it('[4.4-API-010] should handle empty string sceneId as missing', async () => {
    const request = new NextRequest('http://localhost/api/projects/project-1/select-clip', {
      method: 'POST',
      body: JSON.stringify({
        sceneId: '',
        suggestionId: 'suggestion-1',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) });
    const data = await response.json();

    // Empty string is falsy, should be treated as missing
    expect(response.status).toBe(400);
  });

  it('[4.4-API-011] should handle empty string suggestionId as missing', async () => {
    const request = new NextRequest('http://localhost/api/projects/project-1/select-clip', {
      method: 'POST',
      body: JSON.stringify({
        sceneId: 'scene-1',
        suggestionId: '',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  // ============================================================================
  // Database Error Cases
  // ============================================================================

  it('[4.4-API-012] should return 500 for database errors', async () => {
    mockUpdateSceneSelectedClip.mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const request = new NextRequest('http://localhost/api/projects/project-1/select-clip', {
      method: 'POST',
      body: JSON.stringify({
        sceneId: 'scene-1',
        suggestionId: 'suggestion-1',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.code).toBe('DATABASE_ERROR');
  });
});
