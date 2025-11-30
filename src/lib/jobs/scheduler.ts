/**
 * Cron Scheduler - Story 6.2
 *
 * node-cron based scheduler for recurring background jobs.
 * Loads schedules from database and triggers jobs at configured times.
 */

import cron, { ScheduledTask } from 'node-cron';
import { randomUUID } from 'crypto';
import db from '@/lib/db/client';
import { jobQueue } from './queue';
import type { CronSchedule, JobType } from './types';

/**
 * Database row type for cron schedules
 */
interface CronScheduleRow {
  id: string;
  name: string;
  job_type: string;
  cron_expression: string;
  payload: string | null;
  enabled: number;
  last_run: string | null;
  next_run: string | null;
  created_at: string;
}

/**
 * Default cron schedules
 */
const DEFAULT_SCHEDULES: Array<{
  name: string;
  jobType: JobType;
  cronExpression: string;
  payload: Record<string, unknown>;
}> = [
  {
    name: 'Daily RAG Channel Sync',
    jobType: 'rag_sync_channel',
    cronExpression: '0 6 * * *', // Daily at 6 AM
    payload: {},
  },
  {
    name: 'News Fetch',
    jobType: 'rag_sync_news',
    cronExpression: '0 */4 * * *', // Every 4 hours
    payload: {},
  },
  {
    name: 'Weekly Cache Cleanup',
    jobType: 'cache_cleanup',
    cronExpression: '0 3 * * 0', // Sunday at 3 AM
    payload: { maxAgeDays: 30 },
  },
];

/**
 * Convert database row to CronSchedule object
 */
function rowToSchedule(row: CronScheduleRow): CronSchedule {
  return {
    id: row.id,
    name: row.name,
    jobType: row.job_type as JobType,
    cronExpression: row.cron_expression,
    payload: row.payload ? JSON.parse(row.payload) : {},
    enabled: row.enabled === 1,
    lastRun: row.last_run || undefined,
    nextRun: row.next_run || undefined,
    createdAt: row.created_at,
  };
}

/**
 * Cron Scheduler class
 */
export class CronScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize scheduler - load and start all enabled schedules
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[CronScheduler] Already initialized');
      return;
    }

    console.log('[CronScheduler] Initializing...');

    // Register default schedules
    await this.registerDefaults();

    // Load all enabled schedules from database
    const schedules = this.getEnabledSchedules();

    for (const schedule of schedules) {
      this.startSchedule(schedule);
    }

    this.initialized = true;
    console.log(`[CronScheduler] Initialized with ${schedules.length} schedules`);
  }

  /**
   * Register default schedules (if not exists)
   */
  async registerDefaults(): Promise<void> {
    for (const def of DEFAULT_SCHEDULES) {
      const existing = db.prepare(
        'SELECT id FROM cron_schedules WHERE name = ?'
      ).get(def.name);

      if (!existing) {
        const id = randomUUID();

        db.prepare(`
          INSERT INTO cron_schedules (id, name, job_type, cron_expression, payload, enabled)
          VALUES (?, ?, ?, ?, ?, 1)
        `).run(
          id,
          def.name,
          def.jobType,
          def.cronExpression,
          JSON.stringify(def.payload)
        );

        console.log(`[CronScheduler] Registered default schedule: ${def.name}`);
      }
    }
  }

  /**
   * Get all schedules from database
   */
  getAllSchedules(): CronSchedule[] {
    const rows = db.prepare('SELECT * FROM cron_schedules ORDER BY name ASC')
      .all() as CronScheduleRow[];
    return rows.map(rowToSchedule);
  }

  /**
   * Get enabled schedules from database
   */
  getEnabledSchedules(): CronSchedule[] {
    const rows = db.prepare('SELECT * FROM cron_schedules WHERE enabled = 1 ORDER BY name ASC')
      .all() as CronScheduleRow[];
    return rows.map(rowToSchedule);
  }

  /**
   * Get a schedule by ID
   */
  getSchedule(id: string): CronSchedule | null {
    const row = db.prepare('SELECT * FROM cron_schedules WHERE id = ?')
      .get(id) as CronScheduleRow | undefined;
    return row ? rowToSchedule(row) : null;
  }

  /**
   * Create a new schedule
   */
  createSchedule(input: {
    name: string;
    jobType: JobType;
    cronExpression: string;
    payload?: Record<string, unknown>;
    enabled?: boolean;
  }): string {
    // Validate cron expression
    if (!cron.validate(input.cronExpression)) {
      throw new Error(`Invalid cron expression: ${input.cronExpression}`);
    }

    const id = randomUUID();

    db.prepare(`
      INSERT INTO cron_schedules (id, name, job_type, cron_expression, payload, enabled)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name,
      input.jobType,
      input.cronExpression,
      JSON.stringify(input.payload || {}),
      input.enabled !== false ? 1 : 0
    );

    // Start the schedule if enabled
    if (input.enabled !== false) {
      const schedule = this.getSchedule(id);
      if (schedule) {
        this.startSchedule(schedule);
      }
    }

    return id;
  }

  /**
   * Update a schedule
   */
  updateSchedule(id: string, input: {
    name?: string;
    cronExpression?: string;
    payload?: Record<string, unknown>;
    enabled?: boolean;
  }): void {
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }

    if (input.cronExpression !== undefined) {
      if (!cron.validate(input.cronExpression)) {
        throw new Error(`Invalid cron expression: ${input.cronExpression}`);
      }
      updates.push('cron_expression = ?');
      params.push(input.cronExpression);
    }

    if (input.payload !== undefined) {
      updates.push('payload = ?');
      params.push(JSON.stringify(input.payload));
    }

    if (input.enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(input.enabled ? 1 : 0);
    }

    if (updates.length === 0) {
      return;
    }

    params.push(id);

    db.prepare(`
      UPDATE cron_schedules SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

    // Restart the schedule
    this.stopScheduleTask(id);
    const schedule = this.getSchedule(id);
    if (schedule && schedule.enabled) {
      this.startSchedule(schedule);
    }
  }

  /**
   * Delete a schedule
   */
  deleteSchedule(id: string): void {
    this.stopScheduleTask(id);
    db.prepare('DELETE FROM cron_schedules WHERE id = ?').run(id);
  }

  /**
   * Enable a schedule
   */
  enableSchedule(id: string): void {
    db.prepare('UPDATE cron_schedules SET enabled = 1 WHERE id = ?').run(id);
    const schedule = this.getSchedule(id);
    if (schedule) {
      this.startSchedule(schedule);
    }
  }

  /**
   * Disable a schedule
   */
  disableSchedule(id: string): void {
    this.stopScheduleTask(id);
    db.prepare('UPDATE cron_schedules SET enabled = 0 WHERE id = ?').run(id);
  }

  /**
   * Start a schedule's cron task
   */
  private startSchedule(schedule: CronSchedule): void {
    if (this.tasks.has(schedule.id)) {
      return; // Already running
    }

    const task = cron.schedule(schedule.cronExpression, async () => {
      console.log(`[CronScheduler] Triggered: ${schedule.name}`);

      try {
        // Enqueue the job
        const jobId = jobQueue.enqueue({
          type: schedule.jobType,
          payload: schedule.payload,
          priority: 3, // Scheduled jobs get higher priority
        });

        console.log(`[CronScheduler] Enqueued job ${jobId} for schedule: ${schedule.name}`);

        // Update last_run timestamp
        db.prepare(`
          UPDATE cron_schedules SET last_run = ? WHERE id = ?
        `).run(new Date().toISOString(), schedule.id);

      } catch (error) {
        console.error(`[CronScheduler] Failed to enqueue job for ${schedule.name}:`, error);
      }
    });

    this.tasks.set(schedule.id, task);
    console.log(`[CronScheduler] Started schedule: ${schedule.name} (${schedule.cronExpression})`);
  }

  /**
   * Stop a schedule's cron task
   */
  private stopScheduleTask(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.stop();
      this.tasks.delete(id);
      console.log(`[CronScheduler] Stopped schedule task: ${id}`);
    }
  }

  /**
   * Stop all schedules
   */
  stop(): void {
    console.log('[CronScheduler] Stopping all schedules...');

    for (const [id, task] of this.tasks) {
      task.stop();
      console.log(`[CronScheduler] Stopped: ${id}`);
    }

    this.tasks.clear();
    this.initialized = false;

    console.log('[CronScheduler] All schedules stopped');
  }

  /**
   * Check if scheduler is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get count of active schedules
   */
  getActiveCount(): number {
    return this.tasks.size;
  }

  /**
   * Trigger a schedule immediately (for testing)
   */
  async triggerNow(id: string): Promise<string> {
    const schedule = this.getSchedule(id);
    if (!schedule) {
      throw new Error(`Schedule ${id} not found`);
    }

    const jobId = jobQueue.enqueue({
      type: schedule.jobType,
      payload: schedule.payload,
      priority: 3,
    });

    // Update last_run
    db.prepare(`
      UPDATE cron_schedules SET last_run = ? WHERE id = ?
    `).run(new Date().toISOString(), id);

    return jobId;
  }
}

// Export singleton instance
export const cronScheduler = new CronScheduler();
