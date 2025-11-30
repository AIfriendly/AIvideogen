/**
 * Job Queue Test Factories - Story 6.2
 *
 * Factory functions for creating job-related test data.
 */

import { faker } from '@faker-js/faker';
import type { Job, JobType, JobStatus, CronSchedule, CreateJobInput } from '@/lib/jobs/types';

/**
 * Valid job types for testing
 */
export const JOB_TYPES: JobType[] = [
  'rag_sync_channel',
  'rag_sync_news',
  'rag_sync_trends',
  'embedding_generation',
  'video_assembly',
  'cv_batch_analysis',
  'cache_cleanup',
];

/**
 * Valid job statuses for testing
 */
export const JOB_STATUSES: JobStatus[] = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
];

/**
 * Create a random job type
 */
export function createJobType(): JobType {
  return faker.helpers.arrayElement(JOB_TYPES);
}

/**
 * Create a random job status
 */
export function createJobStatus(): JobStatus {
  return faker.helpers.arrayElement(JOB_STATUSES);
}

/**
 * Create a job input for enqueue
 * Note: projectId is undefined by default to avoid FK constraint violations in tests.
 * Pass a valid projectId explicitly when testing project-specific jobs.
 */
export function createJobInput(overrides: Partial<CreateJobInput> = {}): CreateJobInput {
  return {
    type: createJobType(),
    payload: {
      testId: faker.string.uuid(),
      timestamp: Date.now(),
    },
    priority: faker.number.int({ min: 1, max: 10 }) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
    // Don't generate random projectId - it would violate FK constraint
    // Pass explicit projectId in overrides when testing with real projects
    maxAttempts: 3,
    ...overrides,
  };
}

/**
 * Create a pending job input
 */
export function createPendingJobInput(overrides: Partial<CreateJobInput> = {}): CreateJobInput {
  return createJobInput(overrides);
}

/**
 * Create a scheduled job input
 */
export function createScheduledJobInput(
  delayMs: number = 60000,
  overrides: Partial<CreateJobInput> = {}
): CreateJobInput {
  const scheduledFor = new Date(Date.now() + delayMs).toISOString();
  return createJobInput({
    scheduledFor,
    ...overrides,
  });
}

/**
 * Create a job object (as returned from queue)
 * Note: projectId is undefined by default to avoid FK constraint violations.
 */
export function createJob(overrides: Partial<Job> = {}): Job {
  const now = new Date().toISOString();
  const status = overrides.status || 'pending';

  return {
    id: faker.string.uuid(),
    type: createJobType(),
    status,
    priority: faker.number.int({ min: 1, max: 10 }) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
    payload: {
      testId: faker.string.uuid(),
    },
    result: status === 'completed' ? { success: true } : undefined,
    progress: status === 'completed' ? 100 : status === 'running' ? faker.number.int({ min: 0, max: 99 }) : 0,
    attempt: status === 'failed' ? 3 : status === 'running' ? 1 : 0,
    maxAttempts: 3,
    // Don't generate random projectId - it would violate FK constraint
    projectId: undefined,
    scheduledFor: undefined,
    startedAt: status !== 'pending' ? now : undefined,
    completedAt: ['completed', 'failed', 'cancelled'].includes(status) ? now : undefined,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a completed job
 */
export function createCompletedJob(overrides: Partial<Job> = {}): Job {
  const now = new Date().toISOString();
  return createJob({
    status: 'completed',
    progress: 100,
    result: { success: true, message: 'Test completed' },
    completedAt: now,
    ...overrides,
  });
}

/**
 * Create a failed job
 */
export function createFailedJob(overrides: Partial<Job> = {}): Job {
  const now = new Date().toISOString();
  return createJob({
    status: 'failed',
    progress: 50,
    attempt: 3,
    result: { error: 'Test error', stack: 'Error: Test error\n    at test.ts:1:1' },
    completedAt: now,
    ...overrides,
  });
}

/**
 * Create a running job
 */
export function createRunningJob(overrides: Partial<Job> = {}): Job {
  return createJob({
    status: 'running',
    progress: faker.number.int({ min: 10, max: 90 }),
    attempt: 1,
    startedAt: new Date().toISOString(),
    ...overrides,
  });
}

/**
 * Create multiple jobs
 */
export function createJobs(count: number, overrides: Partial<Job> = {}): Job[] {
  return Array.from({ length: count }, () => createJob(overrides));
}

/**
 * Create a cron schedule
 */
export function createCronSchedule(overrides: Partial<CronSchedule> = {}): CronSchedule {
  const now = new Date().toISOString();

  return {
    id: faker.string.uuid(),
    name: faker.lorem.words(3),
    jobType: createJobType(),
    cronExpression: '0 6 * * *', // Daily at 6 AM
    payload: {},
    enabled: true,
    lastRun: faker.helpers.maybe(() => now, { probability: 0.5 }),
    nextRun: faker.helpers.maybe(() => now, { probability: 0.5 }),
    createdAt: now,
    ...overrides,
  };
}

/**
 * Create RAG sync job input
 * Note: projectId is only set on the job if explicitly provided
 */
export function createRagSyncJobInput(channelId?: string, projectId?: string): CreateJobInput {
  const input = createJobInput({
    type: 'rag_sync_channel',
    payload: {
      channelId: channelId || faker.string.alphanumeric(24),
    },
    priority: 3,
  });

  // Only set projectId if explicitly provided (to avoid FK constraint violations)
  if (projectId) {
    input.projectId = projectId;
  }

  return input;
}

/**
 * Create news fetch job input
 */
export function createNewsFetchJobInput(niche?: string): CreateJobInput {
  return createJobInput({
    type: 'rag_sync_news',
    payload: {
      niche: niche || 'military',
    },
    priority: 5,
  });
}

/**
 * Create cache cleanup job input
 */
export function createCacheCleanupJobInput(maxAgeDays: number = 30): CreateJobInput {
  return createJobInput({
    type: 'cache_cleanup',
    payload: {
      maxAgeDays,
    },
    priority: 8,
  });
}
