/**
 * Background Job Queue Type Definitions
 *
 * Type definitions for the SQLite-backed job queue system.
 * Story 6.1 - RAG Infrastructure Setup
 */

// Job types supported by the system
export type JobType =
  | 'rag_sync_channel'
  | 'rag_sync_news'
  | 'rag_sync_trends'
  | 'embedding_generation'
  | 'video_assembly'
  | 'cv_batch_analysis'
  | 'cache_cleanup';

// Job status states
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Job priority levels (1 = highest, 10 = lowest)
export type JobPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// Background job record
export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  progress: number;
  attempt: number;
  maxAttempts: number;
  projectId?: string;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Job creation input
export interface CreateJobInput {
  type: JobType;
  payload: Record<string, unknown>;
  priority?: JobPriority;
  projectId?: string;
  scheduledFor?: string;
  maxAttempts?: number;
}

// Job update input
export interface UpdateJobInput {
  status?: JobStatus;
  progress?: number;
  result?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
}

// Cron schedule record
export interface CronSchedule {
  id: string;
  name: string;
  jobType: JobType;
  cronExpression: string;
  payload: Record<string, unknown>;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
}

// Cron schedule creation input
export interface CreateCronScheduleInput {
  name: string;
  jobType: JobType;
  cronExpression: string;
  payload?: Record<string, unknown>;
  enabled?: boolean;
}

// Job processor configuration
export interface JobProcessorConfig {
  maxConcurrency: number;
  pollIntervalMs: number;
  retryDelays: number[];
}

// Job handler function type
export type JobHandler = (job: Job) => Promise<Record<string, unknown> | void>;

// Job event types
export type JobEvent = 'started' | 'progress' | 'completed' | 'failed' | 'cancelled';

// Job event callback
export type JobEventCallback = (event: JobEvent, job: Job) => void;
