/**
 * Job Processor - Story 6.2
 *
 * Background job processor with configurable concurrency.
 * Polls the queue and executes jobs using registered handlers.
 */

import { jobQueue } from './queue';
import type { Job, JobType, JobHandler, JobProcessorConfig } from './types';

/**
 * Default processor configuration
 */
const DEFAULT_CONFIG: JobProcessorConfig = {
  maxConcurrency: 2,
  pollIntervalMs: 1000,
  retryDelays: [2000, 4000, 8000], // Exponential backoff: 2s, 4s, 8s
};

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Job Processor class
 */
export class JobProcessor {
  private config: JobProcessorConfig;
  private handlers: Map<JobType, JobHandler> = new Map();
  private running: boolean = false;
  private activeJobs: number = 0;
  private processingPromises: Promise<void>[] = [];

  constructor(config: Partial<JobProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a handler for a job type
   */
  registerHandler(type: JobType, handler: JobHandler): void {
    this.handlers.set(type, handler);
    console.log(`[JobProcessor] Registered handler for job type: ${type}`);
  }

  /**
   * Unregister a handler
   */
  unregisterHandler(type: JobType): void {
    this.handlers.delete(type);
    console.log(`[JobProcessor] Unregistered handler for job type: ${type}`);
  }

  /**
   * Get registered handlers
   */
  getRegisteredTypes(): JobType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if processor is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get number of active jobs
   */
  getActiveJobCount(): number {
    return this.activeJobs;
  }

  /**
   * Start the job processor
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('[JobProcessor] Already running');
      return;
    }

    this.running = true;
    console.log(`[JobProcessor] Starting (concurrency: ${this.config.maxConcurrency})`);

    // Main processing loop
    while (this.running) {
      try {
        // Check if we can process more jobs
        if (this.activeJobs < this.config.maxConcurrency) {
          const job = jobQueue.dequeue();

          if (job) {
            // Process job asynchronously
            const promise = this.processJob(job);
            this.processingPromises.push(promise);

            // Clean up completed promises
            promise.finally(() => {
              const index = this.processingPromises.indexOf(promise);
              if (index > -1) {
                this.processingPromises.splice(index, 1);
              }
            });
          }
        }
      } catch (error) {
        console.error('[JobProcessor] Error in processing loop:', error);
      }

      // Wait before next poll
      await sleep(this.config.pollIntervalMs);
    }

    console.log('[JobProcessor] Stopped');
  }

  /**
   * Stop the job processor
   * Waits for active jobs to complete
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    console.log('[JobProcessor] Stopping...');
    this.running = false;

    // Wait for all active jobs to complete
    if (this.processingPromises.length > 0) {
      console.log(`[JobProcessor] Waiting for ${this.processingPromises.length} active jobs to complete...`);
      await Promise.all(this.processingPromises);
    }

    console.log('[JobProcessor] Stopped gracefully');
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    this.activeJobs++;

    try {
      const handler = this.handlers.get(job.type);

      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      console.log(`[JobProcessor] Processing job ${job.id} (type: ${job.type}, attempt: ${job.attempt})`);

      const result = await handler(job);

      jobQueue.complete(job.id, result || { success: true });
      console.log(`[JobProcessor] Job ${job.id} completed successfully`);

    } catch (error) {
      const err = error as Error;
      console.error(`[JobProcessor] Job ${job.id} failed:`, err.message);

      const willRetry = jobQueue.fail(job.id, err);

      if (willRetry) {
        console.log(`[JobProcessor] Job ${job.id} will be retried (attempt ${job.attempt}/${job.maxAttempts})`);
      } else {
        console.log(`[JobProcessor] Job ${job.id} permanently failed after ${job.attempt} attempts`);
      }
    } finally {
      this.activeJobs--;
    }
  }

  /**
   * Process a specific job immediately (bypass queue)
   * Useful for testing
   */
  async processJobImmediate(jobId: string): Promise<Record<string, unknown> | null> {
    const job = jobQueue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'pending') {
      throw new Error(`Job ${jobId} is not pending (status: ${job.status})`);
    }

    const handler = this.handlers.get(job.type);

    if (!handler) {
      throw new Error(`No handler registered for job type: ${job.type}`);
    }

    // Mark as running
    jobQueue.update(jobId, {
      status: 'running',
      startedAt: new Date().toISOString(),
    });

    try {
      const result = await handler(job);
      jobQueue.complete(jobId, result || { success: true });
      return result || { success: true };
    } catch (error) {
      jobQueue.fail(jobId, error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const jobProcessor = new JobProcessor();

/**
 * Helper function to register all default handlers
 */
export function registerDefaultHandlers(processor: JobProcessor): void {
  // Import handlers dynamically to avoid circular dependencies
  // These will be registered when the handlers module is loaded
  console.log('[JobProcessor] Default handlers should be registered via handler modules');
}
