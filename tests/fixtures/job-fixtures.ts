/**
 * Job Queue Test Fixtures - Story 6.2
 *
 * Mock fixtures and helpers for job queue testing.
 */

import { vi } from 'vitest';
import type { Job, JobHandler } from '@/lib/jobs/types';

/**
 * Create a mock job handler
 */
export function createMockJobHandler(
  result: Record<string, unknown> = { success: true }
): JobHandler {
  return vi.fn().mockResolvedValue(result);
}

/**
 * Create a mock job handler that fails
 */
export function createFailingJobHandler(error: Error = new Error('Test error')): JobHandler {
  return vi.fn().mockRejectedValue(error);
}

/**
 * Create a mock job handler with delay
 */
export function createDelayedJobHandler(
  delayMs: number,
  result: Record<string, unknown> = { success: true }
): JobHandler {
  return vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return result;
  });
}

/**
 * Create a mock job handler with progress updates
 */
export function createProgressJobHandler(
  progressSteps: number[] = [25, 50, 75, 100],
  result: Record<string, unknown> = { success: true }
): JobHandler {
  return vi.fn().mockImplementation(async (job: Job) => {
    // Import dynamically to avoid circular dependencies in tests
    const { jobQueue } = await import('@/lib/jobs/queue');

    for (const progress of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, 10));
      jobQueue.updateProgress(job.id, progress);
    }

    return result;
  });
}

/**
 * Mock database for isolated testing
 */
export function createMockDatabase() {
  const jobs = new Map<string, Job>();

  return {
    jobs,
    prepare: vi.fn().mockImplementation((sql: string) => ({
      run: vi.fn().mockImplementation((...args: unknown[]) => {
        return { changes: 1, lastInsertRowid: 1 };
      }),
      get: vi.fn().mockImplementation((...args: unknown[]) => {
        const id = args[0] as string;
        const job = jobs.get(id);
        if (job) {
          return {
            id: job.id,
            type: job.type,
            status: job.status,
            priority: job.priority,
            payload: JSON.stringify(job.payload),
            result: job.result ? JSON.stringify(job.result) : null,
            progress: job.progress,
            attempt: job.attempt,
            max_attempts: job.maxAttempts,
            project_id: job.projectId || null,
            scheduled_for: job.scheduledFor || null,
            started_at: job.startedAt || null,
            completed_at: job.completedAt || null,
            created_at: job.createdAt,
            updated_at: job.updatedAt,
          };
        }
        return undefined;
      }),
      all: vi.fn().mockImplementation(() => {
        return Array.from(jobs.values()).map(job => ({
          id: job.id,
          type: job.type,
          status: job.status,
          priority: job.priority,
          payload: JSON.stringify(job.payload),
          result: job.result ? JSON.stringify(job.result) : null,
          progress: job.progress,
          attempt: job.attempt,
          max_attempts: job.maxAttempts,
          project_id: job.projectId || null,
          scheduled_for: job.scheduledFor || null,
          started_at: job.startedAt || null,
          completed_at: job.completedAt || null,
          created_at: job.createdAt,
          updated_at: job.updatedAt,
        }));
      }),
    })),
    exec: vi.fn(),
    pragma: vi.fn(),
  };
}

/**
 * Environment variable helpers
 */
export function withJobsEnabled(): () => void {
  const original = process.env.JOBS_ENABLED;
  process.env.JOBS_ENABLED = 'true';

  return () => {
    if (original !== undefined) {
      process.env.JOBS_ENABLED = original;
    } else {
      delete process.env.JOBS_ENABLED;
    }
  };
}

export function withJobsDisabled(): () => void {
  const original = process.env.JOBS_ENABLED;
  delete process.env.JOBS_ENABLED;

  return () => {
    if (original !== undefined) {
      process.env.JOBS_ENABLED = original;
    }
  };
}

export function withJobsConcurrency(concurrency: number): () => void {
  const original = process.env.JOBS_CONCURRENCY;
  process.env.JOBS_CONCURRENCY = String(concurrency);

  return () => {
    if (original !== undefined) {
      process.env.JOBS_CONCURRENCY = original;
    } else {
      delete process.env.JOBS_CONCURRENCY;
    }
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeoutMs: number = 5000,
  intervalMs: number = 50
): Promise<void> {
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitFor timed out after ${timeoutMs}ms`);
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

/**
 * Wait for a job to reach a specific status
 */
export async function waitForJobStatus(
  getJob: () => Job | null,
  targetStatus: string,
  timeoutMs: number = 5000
): Promise<Job> {
  const start = Date.now();

  while (true) {
    const job = getJob();

    if (job?.status === targetStatus) {
      return job;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(`Job did not reach status ${targetStatus} within ${timeoutMs}ms. Current: ${job?.status}`);
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

/**
 * Cleanup tracker for test resources
 */
export class CleanupTracker {
  private cleanups: Array<() => void | Promise<void>> = [];

  add(cleanup: () => void | Promise<void>): void {
    this.cleanups.push(cleanup);
  }

  async runAll(): Promise<void> {
    for (const cleanup of this.cleanups.reverse()) {
      try {
        await cleanup();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
    this.cleanups = [];
  }
}
