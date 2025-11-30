/**
 * Job Queue - Story 6.2
 *
 * SQLite-backed job queue with priority ordering and retry logic.
 * Provides CRUD operations for background jobs.
 */

import { randomUUID } from 'crypto';
import db from '@/lib/db/client';
import type { Job, JobType, JobStatus, CreateJobInput, UpdateJobInput } from './types';

/**
 * Database row type for jobs
 */
interface JobRow {
  id: string;
  type: string;
  status: string;
  priority: number;
  payload: string | null;
  result: string | null;
  progress: number;
  attempt: number;
  max_attempts: number;
  project_id: string | null;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database row to Job object
 */
function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    type: row.type as JobType,
    status: row.status as JobStatus,
    priority: row.priority as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
    payload: row.payload ? JSON.parse(row.payload) : {},
    result: row.result ? JSON.parse(row.result) : undefined,
    progress: row.progress,
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    projectId: row.project_id || undefined,
    scheduledFor: row.scheduled_for || undefined,
    startedAt: row.started_at || undefined,
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Job Queue class for managing background jobs
 */
export class JobQueue {
  /**
   * Add a new job to the queue
   */
  enqueue(input: CreateJobInput): string {
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO background_jobs (
        id, type, payload, priority, project_id, scheduled_for, max_attempts, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.type,
      JSON.stringify(input.payload),
      input.priority || 5,
      input.projectId || null,
      input.scheduledFor || null,
      input.maxAttempts || 3,
      now,
      now
    );

    return id;
  }

  /**
   * Get the next job to process (dequeue)
   * Returns null if no jobs are available
   */
  dequeue(): Job | null {
    const now = new Date().toISOString();

    // Get next pending job ordered by priority (ASC) and created_at (ASC)
    const row = db.prepare(`
      SELECT * FROM background_jobs
      WHERE status = 'pending'
        AND (scheduled_for IS NULL OR scheduled_for <= ?)
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
    `).get(now) as JobRow | undefined;

    if (!row) {
      return null;
    }

    // Mark as running
    db.prepare(`
      UPDATE background_jobs
      SET status = 'running', started_at = ?, attempt = attempt + 1, updated_at = ?
      WHERE id = ?
    `).run(now, now, row.id);

    // Re-fetch to get updated values
    const updatedRow = db.prepare('SELECT * FROM background_jobs WHERE id = ?').get(row.id) as JobRow;
    return rowToJob(updatedRow);
  }

  /**
   * Get a job by ID
   */
  getJob(id: string): Job | null {
    const row = db.prepare('SELECT * FROM background_jobs WHERE id = ?').get(id) as JobRow | undefined;
    return row ? rowToJob(row) : null;
  }

  /**
   * Get jobs with optional filters
   */
  getJobs(filters: {
    status?: JobStatus | JobStatus[];
    type?: JobType | JobType[];
    projectId?: string;
    limit?: number;
    offset?: number;
  } = {}): Job[] {
    let query = 'SELECT * FROM background_jobs WHERE 1=1';
    const params: (string | number)[] = [];

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      query += ` AND status IN (${statuses.map(() => '?').join(', ')})`;
      params.push(...statuses);
    }

    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      query += ` AND type IN (${types.map(() => '?').join(', ')})`;
      params.push(...types);
    }

    if (filters.projectId) {
      query += ' AND project_id = ?';
      params.push(filters.projectId);
    }

    query += ' ORDER BY priority ASC, created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = db.prepare(query).all(...params) as JobRow[];
    return rows.map(rowToJob);
  }

  /**
   * Mark job as completed
   */
  complete(jobId: string, result?: Record<string, unknown>): void {
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE background_jobs
      SET status = 'completed', result = ?, progress = 100, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      result ? JSON.stringify(result) : null,
      now,
      now,
      jobId
    );
  }

  /**
   * Mark job as failed with retry logic
   * Returns true if job will be retried, false if max attempts reached
   */
  fail(jobId: string, error: Error): boolean {
    const now = new Date().toISOString();

    const job = db.prepare('SELECT attempt, max_attempts FROM background_jobs WHERE id = ?')
      .get(jobId) as { attempt: number; max_attempts: number } | undefined;

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.attempt < job.max_attempts) {
      // Schedule retry with exponential backoff: 2s, 4s, 8s...
      const backoffMs = Math.pow(2, job.attempt) * 1000;
      const retryAt = new Date(Date.now() + backoffMs).toISOString();

      db.prepare(`
        UPDATE background_jobs
        SET status = 'pending', scheduled_for = ?, result = ?, updated_at = ?
        WHERE id = ?
      `).run(
        retryAt,
        JSON.stringify({ error: error.message, stack: error.stack }),
        now,
        jobId
      );

      return true; // Will retry
    } else {
      // Max attempts reached, mark as permanently failed
      db.prepare(`
        UPDATE background_jobs
        SET status = 'failed', result = ?, completed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(
        JSON.stringify({ error: error.message, stack: error.stack }),
        now,
        now,
        jobId
      );

      return false; // No more retries
    }
  }

  /**
   * Update job progress (0-100)
   */
  updateProgress(jobId: string, progress: number): void {
    const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));

    db.prepare(`
      UPDATE background_jobs
      SET progress = ?, updated_at = ?
      WHERE id = ?
    `).run(clampedProgress, new Date().toISOString(), jobId);
  }

  /**
   * Cancel a pending job
   * Returns true if cancelled, false if job was not pending
   */
  cancel(jobId: string): boolean {
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE background_jobs
      SET status = 'cancelled', completed_at = ?, updated_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(now, now, jobId);

    return result.changes > 0;
  }

  /**
   * Update a job
   */
  update(jobId: string, input: UpdateJobInput): void {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }

    if (input.progress !== undefined) {
      updates.push('progress = ?');
      params.push(input.progress);
    }

    if (input.result !== undefined) {
      updates.push('result = ?');
      params.push(JSON.stringify(input.result));
    }

    if (input.startedAt !== undefined) {
      updates.push('started_at = ?');
      params.push(input.startedAt);
    }

    if (input.completedAt !== undefined) {
      updates.push('completed_at = ?');
      params.push(input.completedAt);
    }

    if (updates.length === 0) {
      return;
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(jobId);

    db.prepare(`
      UPDATE background_jobs
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...params);
  }

  /**
   * Get count of jobs by status
   */
  getStatusCounts(): Record<JobStatus, number> {
    const rows = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM background_jobs
      GROUP BY status
    `).all() as { status: string; count: number }[];

    const counts: Record<JobStatus, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const row of rows) {
      counts[row.status as JobStatus] = row.count;
    }

    return counts;
  }

  /**
   * Clean up old completed/failed/cancelled jobs
   */
  cleanup(maxAgeDays: number = 30): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeDays);

    const result = db.prepare(`
      DELETE FROM background_jobs
      WHERE status IN ('completed', 'failed', 'cancelled')
        AND completed_at < ?
    `).run(cutoff.toISOString());

    return result.changes;
  }
}

// Export singleton instance
export const jobQueue = new JobQueue();
