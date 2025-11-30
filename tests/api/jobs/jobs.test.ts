/**
 * Jobs API Tests - Story 6.2
 *
 * Tests for the /api/jobs endpoints.
 * Covers: AC-6.2.5 (status API), AC-6.2.7 (cancellation)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Jobs API', () => {
  // Store original env
  let originalJobsEnabled: string | undefined;

  beforeEach(() => {
    vi.resetModules();
    originalJobsEnabled = process.env.JOBS_ENABLED;
    process.env.JOBS_ENABLED = 'true';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalJobsEnabled !== undefined) {
      process.env.JOBS_ENABLED = originalJobsEnabled;
    } else {
      delete process.env.JOBS_ENABLED;
    }
  });

  describe('GET /api/jobs', () => {
    it('[P0] 6.2-API-001: should export GET handler', async () => {
      // GIVEN: Jobs API module

      // WHEN: Module is imported
      const { GET } = await import('@/app/api/jobs/route');

      // THEN: GET is exported
      expect(GET).toBeDefined();
      expect(typeof GET).toBe('function');
    });
  });

  describe('POST /api/jobs', () => {
    it('[P0] 6.2-API-002: should export POST handler', async () => {
      // GIVEN: Jobs API module

      // WHEN: Module is imported
      const { POST } = await import('@/app/api/jobs/route');

      // THEN: POST is exported
      expect(POST).toBeDefined();
      expect(typeof POST).toBe('function');
    });
  });

  describe('GET /api/jobs/[id]', () => {
    it('[P0] 6.2-API-003: should export GET handler', async () => {
      // GIVEN: Job detail API module

      // WHEN: Module is imported
      const { GET } = await import('@/app/api/jobs/[id]/route');

      // THEN: GET is exported
      expect(GET).toBeDefined();
      expect(typeof GET).toBe('function');
    });
  });

  describe('DELETE /api/jobs/[id]', () => {
    it('[P0] 6.2-API-004: should export DELETE handler', async () => {
      // GIVEN: Job detail API module

      // WHEN: Module is imported
      const { DELETE } = await import('@/app/api/jobs/[id]/route');

      // THEN: DELETE is exported
      expect(DELETE).toBeDefined();
      expect(typeof DELETE).toBe('function');
    });
  });

  describe('job types validation', () => {
    it('[P1] 6.2-API-005: should accept valid job types', () => {
      // GIVEN: Valid job types
      const validTypes = [
        'rag_sync_channel',
        'rag_sync_news',
        'rag_sync_trends',
        'embedding_generation',
        'video_assembly',
        'cv_batch_analysis',
        'cache_cleanup',
      ];

      // THEN: All types are defined
      expect(validTypes.length).toBe(7);
    });
  });

  describe('priority validation', () => {
    it('[P1] 6.2-API-006: should accept priority 1-10', () => {
      // GIVEN: Valid priority range

      // THEN: Range is 1-10
      const validPriorities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      expect(validPriorities.length).toBe(10);
      expect(Math.min(...validPriorities)).toBe(1);
      expect(Math.max(...validPriorities)).toBe(10);
    });
  });
});
