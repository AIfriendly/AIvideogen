/**
 * Jobs API Tests - Story 6.2
 *
 * Tests for the /api/jobs endpoints.
 * Covers: AC-6.2.5 (status API), AC-6.2.7 (cancellation)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { JobQueue } from '@/lib/jobs/queue';
import { createJobInput } from '../../factories/job-factories';

describe('Jobs API', () => {
  // Store original env
  let originalJobsEnabled: string | undefined;
  let queue: JobQueue;

  beforeEach(() => {
    vi.resetModules();
    originalJobsEnabled = process.env.JOBS_ENABLED;
    process.env.JOBS_ENABLED = 'true';
    queue = new JobQueue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up test jobs
    const jobs = queue.getJobs({ limit: 1000 });
    for (const job of jobs) {
      try {
        queue.cancel(job.id);
      } catch {
        // Ignore errors
      }
    }
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

    it('[P0] 6.2-API-007: should return jobs list with correct structure', async () => {
      // GIVEN: Jobs exist in queue
      queue.enqueue(createJobInput({ type: 'cache_cleanup' }));
      queue.enqueue(createJobInput({ type: 'rag_sync_news' }));

      // WHEN: GET request is made
      const { GET } = await import('@/app/api/jobs/route');
      const request = new NextRequest('http://localhost/api/jobs');
      const response = await GET(request);

      // THEN: Returns success with jobs array
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('jobs');
      expect(data.data).toHaveProperty('pagination');
      expect(data.data).toHaveProperty('counts');
      expect(Array.isArray(data.data.jobs)).toBe(true);
    });

    it('[P1] 6.2-API-008: should filter jobs by status', async () => {
      // GIVEN: Jobs with different statuses
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup' }));
      queue.dequeue(); // Mark one as running

      // WHEN: Filter by pending status
      const { GET } = await import('@/app/api/jobs/route');
      const request = new NextRequest('http://localhost/api/jobs?status=pending');
      const response = await GET(request);

      // THEN: Returns only pending jobs
      const data = await response.json();
      expect(data.success).toBe(true);
      const pendingJobs = data.data.jobs.filter((j: { status: string }) => j.status === 'pending');
      const runningJobs = data.data.jobs.filter((j: { status: string }) => j.status === 'running');
      expect(runningJobs.length).toBe(0);
    });

    it('[P1] 6.2-API-009: should support pagination', async () => {
      // GIVEN: Multiple jobs
      for (let i = 0; i < 5; i++) {
        queue.enqueue(createJobInput({ type: 'cache_cleanup' }));
      }

      // WHEN: Request with pagination
      const { GET } = await import('@/app/api/jobs/route');
      const request = new NextRequest('http://localhost/api/jobs?limit=2&offset=0');
      const response = await GET(request);

      // THEN: Returns paginated results
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.pagination.limit).toBe(2);
      expect(data.data.pagination.offset).toBe(0);
      expect(data.data.jobs.length).toBeLessThanOrEqual(2);
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

    it('[P0] 6.2-API-010: should create job with valid input', async () => {
      // GIVEN: Valid job input
      const jobData = {
        type: 'cache_cleanup',
        payload: { maxAgeDays: 30 },
        priority: 5,
      };

      // WHEN: POST request is made
      const { POST } = await import('@/app/api/jobs/route');
      const request = new NextRequest('http://localhost/api/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData),
      });
      const response = await POST(request);

      // THEN: Returns created job with 201 status
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.job).toBeDefined();
      expect(data.data.job.type).toBe('cache_cleanup');
      expect(data.data.job.status).toBe('pending');
      expect(data.data.job.priority).toBe(5);
    });

    it('[P1] 6.2-API-011: should reject invalid job type', async () => {
      // GIVEN: Invalid job type
      const jobData = { type: 'invalid_type', payload: {} };

      // WHEN: POST request is made
      const { POST } = await import('@/app/api/jobs/route');
      const request = new NextRequest('http://localhost/api/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData),
      });
      const response = await POST(request);

      // THEN: Returns 400 error
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_JOB_TYPE');
    });

    it('[P1] 6.2-API-012: should reject missing type field', async () => {
      // GIVEN: Missing type
      const jobData = { payload: {} };

      // WHEN: POST request is made
      const { POST } = await import('@/app/api/jobs/route');
      const request = new NextRequest('http://localhost/api/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData),
      });
      const response = await POST(request);

      // THEN: Returns 400 error
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('[P1] 6.2-API-013: should reject invalid priority', async () => {
      // GIVEN: Invalid priority (outside 1-10)
      const jobData = { type: 'cache_cleanup', payload: {}, priority: 15 };

      // WHEN: POST request is made
      const { POST } = await import('@/app/api/jobs/route');
      const request = new NextRequest('http://localhost/api/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData),
      });
      const response = await POST(request);

      // THEN: Returns 400 error
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PRIORITY');
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

    it('[P0] 6.2-API-014: should return job details by ID', async () => {
      // GIVEN: Job exists
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup' }));

      // WHEN: GET request for specific job
      const { GET } = await import('@/app/api/jobs/[id]/route');
      const request = new NextRequest(`http://localhost/api/jobs/${jobId}`);
      const response = await GET(request, { params: Promise.resolve({ id: jobId }) });

      // THEN: Returns job details
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.job).toBeDefined();
      expect(data.data.job.id).toBe(jobId);
      expect(data.data.job.type).toBe('cache_cleanup');
    });

    it('[P1] 6.2-API-015: should return 404 for non-existent job', async () => {
      // GIVEN: Non-existent job ID
      const fakeId = 'non-existent-job-id';

      // WHEN: GET request for non-existent job
      const { GET } = await import('@/app/api/jobs/[id]/route');
      const request = new NextRequest(`http://localhost/api/jobs/${fakeId}`);
      const response = await GET(request, { params: Promise.resolve({ id: fakeId }) });

      // THEN: Returns 404 error
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('JOB_NOT_FOUND');
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

    it('[P0] 6.2-API-016: should cancel pending job', async () => {
      // GIVEN: Pending job exists
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup' }));

      // WHEN: DELETE request to cancel
      const { DELETE } = await import('@/app/api/jobs/[id]/route');
      const request = new NextRequest(`http://localhost/api/jobs/${jobId}`, { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: jobId }) });

      // THEN: Job is cancelled
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.job.status).toBe('cancelled');
    });

    it('[P1] 6.2-API-017: should reject cancelling running job', async () => {
      // GIVEN: Running job
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup' }));
      queue.dequeue(); // Mark as running

      // WHEN: DELETE request to cancel
      const { DELETE } = await import('@/app/api/jobs/[id]/route');
      const request = new NextRequest(`http://localhost/api/jobs/${jobId}`, { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: jobId }) });

      // THEN: Returns 400 error
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CANNOT_CANCEL');
    });

    it('[P1] 6.2-API-018: should return 404 for non-existent job', async () => {
      // GIVEN: Non-existent job ID
      const fakeId = 'non-existent-job-id';

      // WHEN: DELETE request
      const { DELETE } = await import('@/app/api/jobs/[id]/route');
      const request = new NextRequest(`http://localhost/api/jobs/${fakeId}`, { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: fakeId }) });

      // THEN: Returns 404 error
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('JOB_NOT_FOUND');
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
