/**
 * Job Queue Unit Tests - Story 6.2
 *
 * Tests for the SQLite-backed job queue.
 * Covers: AC-6.2.1 (persistence), AC-6.2.2 (retry), AC-6.2.5 (status API)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JobQueue } from '@/lib/jobs/queue';
import { createJobInput, createRagSyncJobInput, JOB_TYPES, JOB_STATUSES } from '../../factories/job-factories';

describe('JobQueue', () => {
  let queue: JobQueue;

  beforeEach(() => {
    queue = new JobQueue();
  });

  afterEach(() => {
    // Clean up test jobs
    const jobs = queue.getJobs({ limit: 1000 });
    for (const job of jobs) {
      try {
        queue.cancel(job.id);
      } catch {
        // Ignore errors
      }
    }
  });

  describe('enqueue', () => {
    it('[P0] 6.2-UNIT-001: should create a job and return ID', () => {
      // GIVEN: Valid job input
      const input = createJobInput({ type: 'cache_cleanup' });

      // WHEN: Job is enqueued
      const jobId = queue.enqueue(input);

      // THEN: Job ID is returned
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(jobId.length).toBeGreaterThan(0);
    });

    it('[P0] 6.2-UNIT-002: should persist job with correct fields', () => {
      // GIVEN: Job input with all fields
      const input = createJobInput({
        type: 'rag_sync_channel',
        payload: { channelId: 'test-channel' },
        priority: 3,
        maxAttempts: 5,
      });

      // WHEN: Job is enqueued
      const jobId = queue.enqueue(input);

      // THEN: Job has correct fields
      const job = queue.getJob(jobId);
      expect(job).toBeDefined();
      expect(job?.type).toBe('rag_sync_channel');
      expect(job?.status).toBe('pending');
      expect(job?.priority).toBe(3);
      expect(job?.payload).toEqual({ channelId: 'test-channel' });
      expect(job?.progress).toBe(0);
      expect(job?.attempt).toBe(0);
      expect(job?.maxAttempts).toBe(5);
    });

    it('[P1] 6.2-UNIT-003: should use default values when not provided', () => {
      // GIVEN: Minimal job input
      const input = { type: 'cache_cleanup' as const, payload: {} };

      // WHEN: Job is enqueued
      const jobId = queue.enqueue(input);

      // THEN: Defaults are applied
      const job = queue.getJob(jobId);
      expect(job?.priority).toBe(5);
      expect(job?.maxAttempts).toBe(3);
    });

    it('[P1] 6.2-UNIT-004: should support scheduled jobs', () => {
      // GIVEN: Job with scheduled time
      const futureTime = new Date(Date.now() + 60000).toISOString();
      const input = createJobInput({
        type: 'cache_cleanup',
        scheduledFor: futureTime,
      });

      // WHEN: Job is enqueued
      const jobId = queue.enqueue(input);

      // THEN: Scheduled time is preserved
      const job = queue.getJob(jobId);
      expect(job?.scheduledFor).toBe(futureTime);
    });
  });

  describe('dequeue', () => {
    it('[P0] 6.2-UNIT-005: should return next pending job', () => {
      // GIVEN: Pending job exists
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup' }));

      // WHEN: Dequeue is called
      const job = queue.dequeue();

      // THEN: Job is returned and marked running
      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.status).toBe('running');
    });

    it('[P0] 6.2-UNIT-006: should return null when queue is empty', () => {
      // GIVEN: No pending jobs (cancel all)
      const jobs = queue.getJobs({ status: 'pending' });
      for (const job of jobs) {
        queue.cancel(job.id);
      }

      // WHEN: Dequeue is called
      const job = queue.dequeue();

      // THEN: Null is returned
      expect(job).toBeNull();
    });

    it('[P1] 6.2-UNIT-007: should respect priority ordering', () => {
      // GIVEN: Jobs with different priorities
      queue.enqueue(createJobInput({ type: 'cache_cleanup', priority: 5 }));
      const highPriorityId = queue.enqueue(createJobInput({ type: 'rag_sync_channel', priority: 1 }));
      queue.enqueue(createJobInput({ type: 'rag_sync_news', priority: 3 }));

      // WHEN: Dequeue is called
      const job = queue.dequeue();

      // THEN: Highest priority job returned first
      expect(job?.id).toBe(highPriorityId);
      expect(job?.priority).toBe(1);
    });

    it('[P1] 6.2-UNIT-008: should not return scheduled future jobs', () => {
      // GIVEN: Job scheduled for future
      const futureTime = new Date(Date.now() + 60000).toISOString();
      queue.enqueue(createJobInput({
        type: 'cache_cleanup',
        scheduledFor: futureTime,
      }));

      // WHEN: Dequeue is called
      const job = queue.dequeue();

      // THEN: Null is returned (future job not ready)
      expect(job).toBeNull();
    });

    it('[P1] 6.2-UNIT-009: should increment attempt on dequeue', () => {
      // GIVEN: Pending job
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup' }));

      // WHEN: Dequeue is called
      const job = queue.dequeue();

      // THEN: Attempt is incremented
      expect(job?.attempt).toBe(1);
    });
  });

  describe('complete', () => {
    it('[P0] 6.2-UNIT-010: should mark job as completed', () => {
      // GIVEN: Running job
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup' }));
      queue.dequeue(); // Mark as running

      // WHEN: Complete is called
      queue.complete(jobId, { success: true });

      // THEN: Job is completed
      const job = queue.getJob(jobId);
      expect(job?.status).toBe('completed');
      expect(job?.progress).toBe(100);
      expect(job?.completedAt).toBeDefined();
    });

    it('[P1] 6.2-UNIT-011: should store result', () => {
      // GIVEN: Running job
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup' }));
      queue.dequeue();

      // WHEN: Complete is called with result
      const result = { success: true, count: 42 };
      queue.complete(jobId, result);

      // THEN: Result is stored
      const job = queue.getJob(jobId);
      expect(job?.result).toEqual(result);
    });
  });

  describe('fail', () => {
    it('[P0] 6.2-UNIT-012: should schedule retry on first failure', () => {
      // GIVEN: Running job (attempt 1)
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup', maxAttempts: 3 }));
      queue.dequeue();

      // WHEN: Fail is called
      const willRetry = queue.fail(jobId, new Error('Test error'));

      // THEN: Job is rescheduled for retry
      expect(willRetry).toBe(true);
      const job = queue.getJob(jobId);
      expect(job?.status).toBe('pending');
      expect(job?.scheduledFor).toBeDefined();
    });

    it('[P0] 6.2-UNIT-013: should mark as failed after max attempts', () => {
      // GIVEN: Job that has exhausted attempts
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup', maxAttempts: 1 }));
      queue.dequeue(); // attempt 1

      // WHEN: Fail is called
      const willRetry = queue.fail(jobId, new Error('Test error'));

      // THEN: Job is permanently failed
      expect(willRetry).toBe(false);
      const job = queue.getJob(jobId);
      expect(job?.status).toBe('failed');
      expect(job?.completedAt).toBeDefined();
    });

    it('[P0] 6.2-UNIT-014: should store error in result', () => {
      // GIVEN: Running job
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup' }));
      queue.dequeue();

      // WHEN: Fail is called
      const error = new Error('Test error message');
      queue.fail(jobId, error);

      // THEN: Error is stored
      const job = queue.getJob(jobId);
      expect(job?.result).toBeDefined();
      expect((job?.result as { error: string })?.error).toBe('Test error message');
    });
  });

  describe('updateProgress', () => {
    it('[P0] 6.2-UNIT-015: should update job progress', () => {
      // GIVEN: Running job
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup' }));
      queue.dequeue();

      // WHEN: Progress is updated
      queue.updateProgress(jobId, 50);

      // THEN: Progress is stored
      const job = queue.getJob(jobId);
      expect(job?.progress).toBe(50);
    });

    it('[P1] 6.2-UNIT-016: should clamp progress to 0-100', () => {
      // GIVEN: Running job
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup' }));
      queue.dequeue();

      // WHEN: Invalid progress values are set
      queue.updateProgress(jobId, -10);
      expect(queue.getJob(jobId)?.progress).toBe(0);

      queue.updateProgress(jobId, 150);
      expect(queue.getJob(jobId)?.progress).toBe(100);
    });
  });

  describe('cancel', () => {
    it('[P0] 6.2-UNIT-017: should cancel pending job', () => {
      // GIVEN: Pending job
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup' }));

      // WHEN: Cancel is called
      const cancelled = queue.cancel(jobId);

      // THEN: Job is cancelled
      expect(cancelled).toBe(true);
      const job = queue.getJob(jobId);
      expect(job?.status).toBe('cancelled');
    });

    it('[P1] 6.2-UNIT-018: should not cancel running job', () => {
      // GIVEN: Running job
      const jobId = queue.enqueue(createJobInput({ type: 'cache_cleanup' }));
      queue.dequeue();

      // WHEN: Cancel is called
      const cancelled = queue.cancel(jobId);

      // THEN: Job is not cancelled
      expect(cancelled).toBe(false);
      const job = queue.getJob(jobId);
      expect(job?.status).toBe('running');
    });
  });

  describe('getJobs', () => {
    it('[P0] 6.2-UNIT-019: should filter by status', () => {
      // GIVEN: Jobs with different statuses
      queue.enqueue(createJobInput({ type: 'cache_cleanup' }));
      const pendingId = queue.enqueue(createJobInput({ type: 'rag_sync_channel' }));

      // WHEN: Filter by pending
      const pendingJobs = queue.getJobs({ status: 'pending' });

      // THEN: Only pending jobs returned
      expect(pendingJobs.every(j => j.status === 'pending')).toBe(true);
    });

    it('[P1] 6.2-UNIT-020: should filter by type', () => {
      // GIVEN: Jobs of different types
      queue.enqueue(createJobInput({ type: 'cache_cleanup' }));
      queue.enqueue(createJobInput({ type: 'rag_sync_channel' }));

      // WHEN: Filter by type
      const cleanupJobs = queue.getJobs({ type: 'cache_cleanup' });

      // THEN: Only matching type returned
      expect(cleanupJobs.every(j => j.type === 'cache_cleanup')).toBe(true);
    });

    it('[P1] 6.2-UNIT-021: should support pagination', () => {
      // GIVEN: Multiple jobs
      for (let i = 0; i < 5; i++) {
        queue.enqueue(createJobInput({ type: 'cache_cleanup' }));
      }

      // WHEN: Paginate with limit
      const page1 = queue.getJobs({ limit: 2 });
      const page2 = queue.getJobs({ limit: 2, offset: 2 });

      // THEN: Correct pagination
      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
    });
  });

  describe('getStatusCounts', () => {
    it('[P1] 6.2-UNIT-022: should return counts by status', () => {
      // GIVEN: Jobs in different statuses
      queue.enqueue(createJobInput({ type: 'cache_cleanup' }));
      queue.enqueue(createJobInput({ type: 'rag_sync_channel' }));

      // WHEN: Get status counts
      const counts = queue.getStatusCounts();

      // THEN: Counts include all statuses
      expect(counts).toHaveProperty('pending');
      expect(counts).toHaveProperty('running');
      expect(counts).toHaveProperty('completed');
      expect(counts).toHaveProperty('failed');
      expect(counts).toHaveProperty('cancelled');
      expect(counts.pending).toBeGreaterThanOrEqual(2);
    });
  });
});
