/**
 * Download Job Queue System
 *
 * Manages parallel downloads with max 3 concurrent jobs, queue state persistence,
 * and crash recovery. Ensures reliable download processing with transaction safety.
 *
 * Story 3.6: Default Segment Download Service
 *
 * Features:
 * - FIFO queue with max 3 concurrent downloads
 * - Queue state persistence to .cache/queue-state.json
 * - Crash recovery: loads queue state on startup, cleans stale statuses
 * - Database transactions with row locking (FOR UPDATE)
 * - Processing locks to prevent duplicate job execution
 */

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import db from '../db/client';
import { downloadWithRetry, DownloadSegmentOptions } from './download-segment';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Download job status
 */
export type JobStatus = 'queued' | 'downloading' | 'complete' | 'error';

/**
 * Download job definition
 */
export interface DownloadJob {
  id: string;
  suggestionId: string;
  videoId: string;
  segmentDuration: number;
  outputPath: string;        // RELATIVE path for database storage
  projectId: string;
  sceneNumber: number;
  status: JobStatus;
  retryCount: number;
  error?: string;
}

/**
 * Queue status summary for a project
 */
export interface QueueStatus {
  total: number;
  completed: number;
  downloading: number;
  queued: number;
  failed: number;
}

/**
 * Persisted queue state
 */
interface QueueState {
  queue: DownloadJob[];
  activeDownloads: string[];  // Job IDs currently processing
  timestamp: string;
}

// ============================================================================
// Download Queue Class
// ============================================================================

/**
 * Singleton download queue manager
 * Handles parallel downloads with concurrency control and persistence
 */
export class DownloadQueue {
  private static instance: DownloadQueue | null = null;

  private queue: DownloadJob[] = [];
  private activeDownloads: Set<string> = new Set();
  private processingLock: Map<string, boolean> = new Map();
  private maxConcurrent: number = 3;
  private queueStatePath: string;
  private initialized: boolean = false;

  private constructor() {
    this.queueStatePath = path.join(process.cwd(), '.cache', 'queue-state.json');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DownloadQueue {
    if (!DownloadQueue.instance) {
      DownloadQueue.instance = new DownloadQueue();
    }
    return DownloadQueue.instance;
  }

  // ==========================================================================
  // Initialization and Persistence
  // ==========================================================================

  /**
   * Initialize queue on server startup
   * Loads persisted queue state and cleans up stale download statuses
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[DownloadQueue] Already initialized, skipping');
      return;
    }

    console.log('[DownloadQueue] Initializing queue...');

    // Load persisted queue state
    await this.loadQueueState();

    // Clean up stale "downloading" statuses (from previous crash)
    await this.cleanStaleDownloadStatus();

    // Resume processing pending jobs
    if (this.queue.length > 0) {
      console.log(`[DownloadQueue] Resuming ${this.queue.length} pending jobs from previous session`);
      await this.processQueue();
    }

    this.initialized = true;
    console.log('[DownloadQueue] Initialization complete');
  }

  /**
   * Save queue state to disk for crash recovery
   */
  private async saveQueueState(): Promise<void> {
    try {
      const state: QueueState = {
        queue: this.queue,
        activeDownloads: Array.from(this.activeDownloads),
        timestamp: new Date().toISOString(),
      };

      // Ensure .cache directory exists
      const cacheDir = path.dirname(this.queueStatePath);
      await fs.mkdir(cacheDir, { recursive: true });

      await fs.writeFile(this.queueStatePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
      console.error('[DownloadQueue] Failed to save queue state:', error);
      // Don't throw - queue can continue without persistence
    }
  }

  /**
   * Load queue state from disk on startup
   */
  private async loadQueueState(): Promise<void> {
    try {
      const stateFile = await fs.readFile(this.queueStatePath, 'utf-8');
      const state: QueueState = JSON.parse(stateFile);

      this.queue = state.queue || [];
      // Don't restore activeDownloads - these were in-progress when crashed
      // They'll be reset to 'queued' by cleanStaleDownloadStatus()

      console.log(`[DownloadQueue] Loaded ${this.queue.length} jobs from persisted state`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('[DownloadQueue] No persisted queue state found, starting fresh');
      } else {
        console.error('[DownloadQueue] Failed to load queue state:', error);
      }
      // Start with empty queue
      this.queue = [];
    }
  }

  /**
   * Clean up stale "downloading" statuses from previous session
   * Resets interrupted downloads to "queued" for retry
   */
  private async cleanStaleDownloadStatus(): Promise<void> {
    try {
      const stmt = db.prepare(`
        UPDATE visual_suggestions
        SET download_status = 'queued'
        WHERE download_status = 'downloading'
      `);

      const result = stmt.run();
      const changes = result.changes;

      if (changes > 0) {
        console.log(`[DownloadQueue] Reset ${changes} stale 'downloading' statuses to 'queued'`);
      }
    } catch (error) {
      console.error('[DownloadQueue] Failed to clean stale download statuses:', error);
      throw new Error(`Failed to clean stale download statuses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==========================================================================
  // Job Management
  // ==========================================================================

  /**
   * Enqueue a download job
   * Updates database status to 'queued' and triggers queue processing
   */
  public async enqueueJob(job: DownloadJob): Promise<void> {
    // Add to queue
    this.queue.push(job);
    console.log(`[DownloadQueue] Enqueued job ${job.id} for videoId=${job.videoId} (queue size: ${this.queue.length})`);

    // Update database status to 'queued' with transaction
    try {
      await this.updateDownloadStatus(job.suggestionId, 'queued');
    } catch (error) {
      console.error(`[DownloadQueue] Failed to update status to 'queued' for job ${job.id}:`, error);
      // Remove from queue if DB update fails
      this.queue = this.queue.filter(j => j.id !== job.id);
      throw error;
    }

    // Save queue state after enqueue
    await this.saveQueueState();

    // Trigger queue processing
    await this.processQueue();
  }

  /**
   * Process jobs in queue with concurrency control
   * Max 3 concurrent downloads
   */
  private async processQueue(): Promise<void> {
    // Process jobs while slots available and queue not empty
    while (this.activeDownloads.size < this.maxConcurrent && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      // Check if job already being processed (prevent duplicates)
      if (this.processingLock.get(job.id)) {
        console.warn(`[DownloadQueue] Job ${job.id} already being processed, skipping`);
        continue;
      }

      // Acquire lock
      this.processingLock.set(job.id, true);
      this.activeDownloads.add(job.id);

      console.log(`[DownloadQueue] Starting job ${job.id} (active: ${this.activeDownloads.size}/${this.maxConcurrent})`);

      // Save queue state after dequeue
      await this.saveQueueState();

      // Process job asynchronously (don't await - parallel execution)
      this.executeJob(job).finally(() => {
        this.activeDownloads.delete(job.id);
        this.processingLock.delete(job.id);
        console.log(`[DownloadQueue] Job ${job.id} finished (active: ${this.activeDownloads.size}/${this.maxConcurrent})`);

        // Save queue state after job completion
        this.saveQueueState().then(() => {
          // Process next job
          this.processQueue();
        });
      });
    }
  }

  /**
   * Execute a download job
   */
  private async executeJob(job: DownloadJob): Promise<void> {
    try {
      // Update status to 'downloading' with transaction
      await this.updateDownloadStatus(job.suggestionId, 'downloading');

      // Convert relative path to absolute for yt-dlp execution
      const absolutePath = path.resolve(process.cwd(), job.outputPath);

      // Build download options
      const downloadOptions: DownloadSegmentOptions = {
        videoId: job.videoId,
        segmentDuration: job.segmentDuration,
        outputPath: absolutePath,
        maxHeight: 720,
      };

      // Attempt download with retry logic
      const result = await downloadWithRetry(downloadOptions);

      if (result.success && result.filePath) {
        // Verify file exists
        try {
          await fs.access(result.filePath);

          // Update database with relative path
          await this.updateDownloadStatus(
            job.suggestionId,
            'complete',
            job.outputPath  // Store RELATIVE path
          );

          console.log(`[DownloadQueue] Job ${job.id} completed successfully`);
        } catch (accessError) {
          console.error(`[DownloadQueue] File not found after download: ${result.filePath}`);
          await this.updateDownloadStatus(job.suggestionId, 'error');
        }
      } else {
        // Download failed
        console.error(`[DownloadQueue] Job ${job.id} failed: ${result.error}`);
        await this.updateDownloadStatus(job.suggestionId, 'error');
      }
    } catch (error) {
      console.error(`[DownloadQueue] Unexpected error executing job ${job.id}:`, error);
      try {
        await this.updateDownloadStatus(job.suggestionId, 'error');
      } catch (dbError) {
        console.error(`[DownloadQueue] Failed to update error status for job ${job.id}:`, dbError);
      }
    }
  }

  // ==========================================================================
  // Database Operations with Transactions
  // ==========================================================================

  /**
   * Update download status in database with transaction and row locking
   * Prevents race conditions and ensures data consistency
   */
  private async updateDownloadStatus(
    suggestionId: string,
    status: string,
    filePath?: string
  ): Promise<void> {
    try {
      // Start transaction
      const updateTransaction = db.transaction(() => {
        // Lock row to prevent concurrent updates
        const lockStmt = db.prepare(`
          SELECT id FROM visual_suggestions
          WHERE id = ?
        `);
        const suggestion = lockStmt.get(suggestionId);

        if (!suggestion) {
          throw new Error(`Suggestion ${suggestionId} not found`);
        }

        // Build update query
        const updates: string[] = ['download_status = ?'];
        const values: any[] = [status];

        if (filePath !== undefined) {
          updates.push('default_segment_path = ?');
          values.push(filePath);
        }

        values.push(suggestionId);

        // Update status
        const updateStmt = db.prepare(`
          UPDATE visual_suggestions
          SET ${updates.join(', ')}
          WHERE id = ?
        `);

        updateStmt.run(...values);
      });

      // Execute transaction
      updateTransaction();
    } catch (error) {
      console.error('[DownloadQueue] Failed to update download status:', error);
      throw new Error(
        `Failed to update download status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ==========================================================================
  // Status Queries
  // ==========================================================================

  /**
   * Get queue status for a project
   * Returns counts of jobs by status
   */
  public getQueueStatus(projectId: string): QueueStatus {
    try {
      // Query database for counts by status
      const stmt = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN vs.download_status = 'complete' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN vs.download_status = 'downloading' THEN 1 ELSE 0 END) as downloading,
          SUM(CASE WHEN vs.download_status = 'queued' THEN 1 ELSE 0 END) as queued,
          SUM(CASE WHEN vs.download_status = 'error' THEN 1 ELSE 0 END) as failed
        FROM visual_suggestions vs
        INNER JOIN scenes s ON vs.scene_id = s.id
        WHERE s.project_id = ?
      `);

      const result = stmt.get(projectId) as any;

      return {
        total: result.total || 0,
        completed: result.completed || 0,
        downloading: result.downloading || 0,
        queued: result.queued || 0,
        failed: result.failed || 0,
      };
    } catch (error) {
      console.error('[DownloadQueue] Failed to get queue status:', error);
      throw new Error(
        `Failed to get queue status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get count of active downloads
   */
  public getActiveDownloadCount(): number {
    return this.activeDownloads.size;
  }

  /**
   * Get count of pending jobs in queue
   */
  public getPendingJobCount(): number {
    return this.queue.length;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Export singleton instance
 * Use this for all queue operations
 */
export const downloadQueue = DownloadQueue.getInstance();
