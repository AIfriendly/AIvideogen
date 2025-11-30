/**
 * Jobs System Initialization - Story 6.2
 *
 * Initializes the background job processor and cron scheduler.
 */

import { jobProcessor } from './processor';
import { cronScheduler } from './scheduler';
import { ragSyncChannelHandler } from './handlers/rag-sync';
import { ragSyncNewsHandler } from './handlers/news-fetch';
import { embeddingGenerationHandler } from './handlers/embedding';
import { cacheCleanupHandler } from './handlers/cleanup';

/**
 * Check if jobs system is enabled via environment
 */
export function isJobsEnabled(): boolean {
  return process.env.JOBS_ENABLED === 'true';
}

/**
 * Get jobs concurrency from environment (default: 2)
 */
export function getJobsConcurrency(): number {
  const value = process.env.JOBS_CONCURRENCY;
  if (value) {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0 && num <= 10) {
      return num;
    }
  }
  return 2;
}

// Track initialization state
let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the jobs system
 *
 * Registers handlers, starts processor and scheduler.
 */
export async function initializeJobs(): Promise<{
  success: boolean;
  processor: boolean;
  scheduler: boolean;
  error?: string;
}> {
  // Check if jobs are enabled
  if (!isJobsEnabled()) {
    console.log('[Jobs] Jobs system disabled (JOBS_ENABLED not set to true)');
    return {
      success: true,
      processor: false,
      scheduler: false,
      error: 'Jobs system disabled via environment variable',
    };
  }

  // Already initialized
  if (initialized) {
    return {
      success: true,
      processor: jobProcessor.isRunning(),
      scheduler: cronScheduler.isInitialized(),
    };
  }

  // Initialization in progress
  if (initPromise) {
    await initPromise;
    return {
      success: true,
      processor: jobProcessor.isRunning(),
      scheduler: cronScheduler.isInitialized(),
    };
  }

  // Start initialization
  initPromise = (async () => {
    console.log('[Jobs] Initializing jobs system...');

    // Register handlers
    registerHandlers();

    // Initialize cron scheduler
    try {
      await cronScheduler.initialize();
      console.log('[Jobs] Cron scheduler initialized');
    } catch (error) {
      console.error('[Jobs] Failed to initialize cron scheduler:', error);
    }

    // Start job processor
    try {
      // Start processor in background (non-blocking)
      jobProcessor.start().catch(error => {
        console.error('[Jobs] Job processor error:', error);
      });
      console.log('[Jobs] Job processor started');
    } catch (error) {
      console.error('[Jobs] Failed to start job processor:', error);
    }

    initialized = true;
    console.log('[Jobs] Jobs system initialized');
  })();

  await initPromise;

  return {
    success: true,
    processor: jobProcessor.isRunning(),
    scheduler: cronScheduler.isInitialized(),
  };
}

/**
 * Register all job handlers
 */
function registerHandlers(): void {
  console.log('[Jobs] Registering handlers...');

  jobProcessor.registerHandler('rag_sync_channel', ragSyncChannelHandler);
  jobProcessor.registerHandler('rag_sync_trends', ragSyncChannelHandler);
  jobProcessor.registerHandler('rag_sync_news', ragSyncNewsHandler);
  jobProcessor.registerHandler('embedding_generation', embeddingGenerationHandler);
  jobProcessor.registerHandler('cache_cleanup', cacheCleanupHandler);

  console.log('[Jobs] Handlers registered:', jobProcessor.getRegisteredTypes().join(', '));
}

/**
 * Shutdown the jobs system
 */
export async function shutdownJobs(): Promise<void> {
  console.log('[Jobs] Shutting down jobs system...');

  // Stop cron scheduler first
  cronScheduler.stop();

  // Stop job processor (waits for active jobs)
  await jobProcessor.stop();

  initialized = false;
  initPromise = null;

  console.log('[Jobs] Jobs system shutdown complete');
}

/**
 * Get jobs system status
 */
export function getJobsStatus(): {
  enabled: boolean;
  initialized: boolean;
  processorRunning: boolean;
  schedulerInitialized: boolean;
  activeJobs: number;
  activeSchedules: number;
  registeredHandlers: string[];
} {
  return {
    enabled: isJobsEnabled(),
    initialized,
    processorRunning: jobProcessor.isRunning(),
    schedulerInitialized: cronScheduler.isInitialized(),
    activeJobs: jobProcessor.getActiveJobCount(),
    activeSchedules: cronScheduler.getActiveCount(),
    registeredHandlers: jobProcessor.getRegisteredTypes(),
  };
}

/**
 * Check if jobs system is initialized
 */
export function isJobsInitialized(): boolean {
  return initialized;
}
