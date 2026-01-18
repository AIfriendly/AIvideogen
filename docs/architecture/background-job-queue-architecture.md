# Background Job Queue Architecture

**Purpose:** Execute scheduled and long-running tasks outside the HTTP request lifecycle.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Background Job Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Cron Jobs   │    │  API Trigger │    │  Event-Based │       │
│  │  (Scheduled) │    │  (Manual)    │    │  (On-Demand) │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         └───────────────────┼───────────────────┘                │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────┐        │
│  │                   Job Queue                          │        │
│  │  - SQLite-backed (jobs table)                       │        │
│  │  - Priority levels (high, normal, low)              │        │
│  │  - Retry logic with exponential backoff             │        │
│  └──────────────────────┬──────────────────────────────┘        │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │                  Job Processor                       │        │
│  │  - Concurrent execution (configurable limit)        │        │
│  │  - Job-type handlers                                │        │
│  │  - Progress tracking                                │        │
│  │  - Error isolation                                  │        │
│  └──────────────────────┬──────────────────────────────┘        │
│                         │                                        │
│  ┌──────────────────────┼──────────────────────────────┐        │
│  │                Job Type Handlers                     │        │
│  │                                                      │        │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │        │
│  │  │ RAG Sync    │  │ Video       │  │ News        │  │        │
│  │  │ Channel     │  │ Assembly    │  │ Fetch       │  │        │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │        │
│  │                                                      │        │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │        │
│  │  │ Embedding   │  │ CV Analysis │  │ Cleanup     │  │        │
│  │  │ Generation  │  │ (Batch)     │  │ (Cache)     │  │        │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │        │
│  │                                                      │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Background jobs table (Migration 013)
CREATE TABLE background_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,           -- 'rag_sync', 'video_assembly', 'news_fetch', 'embedding_gen', 'cv_batch', 'cache_cleanup'
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  priority INTEGER DEFAULT 5,   -- 1 (highest) to 10 (lowest)
  payload TEXT,                 -- JSON job-specific data
  result TEXT,                  -- JSON result or error
  progress INTEGER DEFAULT 0,   -- 0-100
  attempt INTEGER DEFAULT 0,    -- Current attempt number
  max_attempts INTEGER DEFAULT 3,
  project_id TEXT,              -- Optional project association
  scheduled_for TEXT,           -- When to run (NULL = immediate)
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_jobs_status ON background_jobs(status);
CREATE INDEX idx_jobs_type ON background_jobs(type);
CREATE INDEX idx_jobs_scheduled ON background_jobs(scheduled_for);
CREATE INDEX idx_jobs_project ON background_jobs(project_id);

-- Cron schedules table
CREATE TABLE cron_schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL,
  cron_expression TEXT NOT NULL, -- e.g., "0 6 * * *" (daily at 6 AM)
  payload TEXT,                  -- Default payload for scheduled jobs
  enabled BOOLEAN DEFAULT true,
  last_run TEXT,
  next_run TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Job Queue Implementation

```typescript
// lib/jobs/queue.ts
import db from '@/lib/db/client';
import { randomUUID } from 'crypto';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: number;
  payload: any;
  result?: any;
  progress: number;
  attempt: number;
  maxAttempts: number;
  projectId?: string;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
}

export type JobType =
  | 'rag_sync_channel'
  | 'rag_sync_news'
  | 'rag_sync_trends'
  | 'embedding_generation'
  | 'video_assembly'
  | 'cv_batch_analysis'
  | 'cache_cleanup';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export class JobQueue {
  /**
   * Add a new job to the queue
   */
  async enqueue(
    type: JobType,
    payload: any,
    options: {
      priority?: number;
      projectId?: string;
      scheduledFor?: Date;
      maxAttempts?: number;
    } = {}
  ): Promise<string> {
    const id = randomUUID();

    db.prepare(`
      INSERT INTO background_jobs (id, type, payload, priority, project_id, scheduled_for, max_attempts)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      type,
      JSON.stringify(payload),
      options.priority || 5,
      options.projectId || null,
      options.scheduledFor?.toISOString() || null,
      options.maxAttempts || 3
    );

    return id;
  }

  /**
   * Get next job to process
   */
  async dequeue(): Promise<Job | null> {
    const now = new Date().toISOString();

    const job = db.prepare(`
      SELECT * FROM background_jobs
      WHERE status = 'pending'
        AND (scheduled_for IS NULL OR scheduled_for <= ?)
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
    `).get(now) as any;

    if (!job) return null;

    // Mark as running
    db.prepare(`
      UPDATE background_jobs
      SET status = 'running', started_at = ?, attempt = attempt + 1, updated_at = ?
      WHERE id = ?
    `).run(now, now, job.id);

    return {
      ...job,
      payload: JSON.parse(job.payload || '{}'),
      result: job.result ? JSON.parse(job.result) : undefined
    };
  }

  /**
   * Mark job as completed
   */
  async complete(jobId: string, result?: any): Promise<void> {
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
   * Mark job as failed (with retry logic)
   */
  async fail(jobId: string, error: Error): Promise<void> {
    const now = new Date().toISOString();

    const job = db.prepare('SELECT attempt, max_attempts FROM background_jobs WHERE id = ?').get(jobId) as any;

    if (job.attempt < job.max_attempts) {
      // Schedule retry with exponential backoff
      const backoffMs = Math.pow(2, job.attempt) * 1000; // 2s, 4s, 8s...
      const retryAt = new Date(Date.now() + backoffMs).toISOString();

      db.prepare(`
        UPDATE background_jobs
        SET status = 'pending', scheduled_for = ?, result = ?, updated_at = ?
        WHERE id = ?
      `).run(retryAt, JSON.stringify({ error: error.message }), now, jobId);
    } else {
      // Max attempts reached, mark as failed
      db.prepare(`
        UPDATE background_jobs
        SET status = 'failed', result = ?, completed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify({ error: error.message }), now, now, jobId);
    }
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number): Promise<void> {
    db.prepare(`
      UPDATE background_jobs
      SET progress = ?, updated_at = ?
      WHERE id = ?
    `).run(progress, new Date().toISOString(), jobId);
  }
}

export const jobQueue = new JobQueue();
```

### Job Processor

```typescript
// lib/jobs/processor.ts
import { jobQueue, Job, JobType } from './queue';
import { ragSyncChannelHandler } from './handlers/rag-sync';
import { videoAssemblyHandler } from './handlers/video-assembly';
import { newsFetchHandler } from './handlers/news-fetch';
import { embeddingHandler } from './handlers/embedding';
import { cacheCleanupHandler } from './handlers/cleanup';

type JobHandler = (job: Job) => Promise<any>;

const handlers: Record<JobType, JobHandler> = {
  rag_sync_channel: ragSyncChannelHandler,
  rag_sync_news: newsFetchHandler,
  rag_sync_trends: ragSyncChannelHandler, // Reuse with different payload
  embedding_generation: embeddingHandler,
  video_assembly: videoAssemblyHandler,
  cv_batch_analysis: cvBatchHandler,
  cache_cleanup: cacheCleanupHandler
};

export class JobProcessor {
  private running = false;
  private concurrency: number;
  private activeJobs = 0;

  constructor(concurrency: number = 2) {
    this.concurrency = concurrency;
  }

  async start(): Promise<void> {
    this.running = true;
    console.log(`Job processor started (concurrency: ${this.concurrency})`);

    while (this.running) {
      if (this.activeJobs < this.concurrency) {
        const job = await jobQueue.dequeue();
        if (job) {
          this.processJob(job);
        }
      }

      // Poll interval
      await sleep(1000);
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    // Wait for active jobs to complete
    while (this.activeJobs > 0) {
      await sleep(100);
    }
    console.log('Job processor stopped');
  }

  private async processJob(job: Job): Promise<void> {
    this.activeJobs++;

    try {
      const handler = handlers[job.type];
      if (!handler) {
        throw new Error(`Unknown job type: ${job.type}`);
      }

      console.log(`Processing job ${job.id} (${job.type})`);
      const result = await handler(job);
      await jobQueue.complete(job.id, result);
      console.log(`Job ${job.id} completed`);
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      await jobQueue.fail(job.id, error as Error);
    } finally {
      this.activeJobs--;
    }
  }
}
```

### Cron Scheduler

```typescript
// lib/jobs/scheduler.ts
import cron from 'node-cron';
import db from '@/lib/db/client';
import { jobQueue, JobType } from './queue';

interface CronSchedule {
  id: string;
  name: string;
  jobType: JobType;
  cronExpression: string;
  payload: any;
  enabled: boolean;
}

export class CronScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  async initialize(): Promise<void> {
    // Load schedules from database
    const schedules = db.prepare(`
      SELECT * FROM cron_schedules WHERE enabled = true
    `).all() as any[];

    for (const schedule of schedules) {
      this.scheduleJob(schedule);
    }

    console.log(`Cron scheduler initialized with ${schedules.length} jobs`);
  }

  private scheduleJob(schedule: CronSchedule): void {
    const task = cron.schedule(schedule.cronExpression, async () => {
      console.log(`Cron trigger: ${schedule.name}`);

      // Enqueue job
      await jobQueue.enqueue(
        schedule.jobType as JobType,
        JSON.parse(schedule.payload || '{}'),
        { priority: 3 } // Scheduled jobs get higher priority
      );

      // Update last_run
      db.prepare(`
        UPDATE cron_schedules SET last_run = ? WHERE id = ?
      `).run(new Date().toISOString(), schedule.id);
    });

    this.tasks.set(schedule.id, task);
  }

  /**
   * Register default cron schedules (run once on startup)
   */
  async registerDefaults(): Promise<void> {
    const defaults: Partial<CronSchedule>[] = [
      {
        name: 'Daily RAG Channel Sync',
        jobType: 'rag_sync_channel',
        cronExpression: '0 6 * * *', // Daily at 6 AM
        payload: '{}'
      },
      {
        name: 'Daily News Fetch',
        jobType: 'rag_sync_news',
        cronExpression: '0 */4 * * *', // Every 4 hours
        payload: '{}'
      },
      {
        name: 'Weekly Cache Cleanup',
        jobType: 'cache_cleanup',
        cronExpression: '0 3 * * 0', // Sunday at 3 AM
        payload: '{"maxAgeDays": 30}'
      }
    ];

    for (const def of defaults) {
      const existing = db.prepare(
        'SELECT id FROM cron_schedules WHERE name = ?'
      ).get(def.name);

      if (!existing) {
        db.prepare(`
          INSERT INTO cron_schedules (id, name, job_type, cron_expression, payload)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          def.name,
          def.jobType,
          def.cronExpression,
          def.payload
        );
      }
    }
  }

  stop(): void {
    for (const task of this.tasks.values()) {
      task.stop();
    }
    this.tasks.clear();
  }
}

export const cronScheduler = new CronScheduler();
```

### Job Handlers

```typescript
// lib/jobs/handlers/rag-sync.ts
import { Job } from '../queue';
import { jobQueue } from '../queue';
import { scrapeChannelTranscripts } from '@/lib/rag/ingestion/youtube-captions';
import { generateEmbeddings } from '@/lib/rag/embeddings/local-embeddings';
import { vectorStore } from '@/lib/rag/vector-db/chroma-client';

export async function ragSyncChannelHandler(job: Job): Promise<any> {
  const { channelId, projectId } = job.payload;

  // 1. Fetch new videos since last sync
  await jobQueue.updateProgress(job.id, 10);
  const newVideos = await getNewVideosSinceLastSync(channelId);

  if (newVideos.length === 0) {
    return { synced: 0, message: 'No new videos' };
  }

  // 2. Scrape transcripts
  await jobQueue.updateProgress(job.id, 30);
  const transcripts = await scrapeChannelTranscripts(channelId, newVideos);

  // 3. Generate embeddings
  await jobQueue.updateProgress(job.id, 60);
  const texts = transcripts.map(t => t.fullText);
  const embeddings = await generateEmbeddings(texts);

  // 4. Store in vector DB
  await jobQueue.updateProgress(job.id, 80);
  for (let i = 0; i < transcripts.length; i++) {
    await vectorStore.addVideoContent(transcripts[i], embeddings[i]);
  }

  // 5. Update last sync timestamp
  await jobQueue.updateProgress(job.id, 100);
  await updateLastSyncTimestamp(projectId, channelId);

  return {
    synced: transcripts.length,
    channelId,
    timestamp: new Date().toISOString()
  };
}

// lib/jobs/handlers/news-fetch.ts
export async function newsFetchHandler(job: Job): Promise<any> {
  const { niche, sourceIds } = job.payload;

  // 1. Get news sources for niche
  const sources = sourceIds
    ? getSourcesByIds(sourceIds)
    : getNicheNewsSources(niche);

  let totalArticles = 0;

  // 2. Fetch from each source
  for (let i = 0; i < sources.length; i++) {
    await jobQueue.updateProgress(job.id, Math.round((i / sources.length) * 80));

    try {
      const articles = await fetchNewsFromSource(sources[i]);

      // 3. Generate embeddings and store
      const texts = articles.map(a => `${a.headline}\n\n${a.summary}`);
      const embeddings = await generateEmbeddings(texts);

      for (let j = 0; j < articles.length; j++) {
        await vectorStore.addNewsArticle(articles[j], embeddings[j]);
      }

      totalArticles += articles.length;
    } catch (error) {
      console.warn(`Failed to fetch from ${sources[i].name}:`, error);
    }
  }

  return {
    fetched: totalArticles,
    sources: sources.length,
    timestamp: new Date().toISOString()
  };
}
```

### Startup Integration

```typescript
// lib/jobs/init.ts
import { JobProcessor } from './processor';
import { CronScheduler, cronScheduler } from './scheduler';

let processor: JobProcessor | null = null;

export async function initializeJobSystem(): Promise<void> {
  // Only run in main process, not in API routes
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  // Register default cron schedules
  await cronScheduler.registerDefaults();

  // Initialize cron scheduler
  await cronScheduler.initialize();

  // Start job processor
  processor = new JobProcessor(2); // 2 concurrent jobs
  processor.start();

  console.log('Background job system initialized');
}

export async function shutdownJobSystem(): Promise<void> {
  cronScheduler.stop();
  if (processor) {
    await processor.stop();
  }
}

// app/layout.tsx or middleware.ts
// Call initializeJobSystem() on app startup
```

### API Endpoints

```typescript
// app/api/jobs/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status');

  let query = 'SELECT * FROM background_jobs WHERE 1=1';
  const params: any[] = [];

  if (projectId) {
    query += ' AND project_id = ?';
    params.push(projectId);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT 50';

  const jobs = db.prepare(query).all(...params);

  return Response.json({ success: true, data: jobs });
}

// app/api/jobs/[id]/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const job = db.prepare('SELECT * FROM background_jobs WHERE id = ?').get(params.id);

  if (!job) {
    return Response.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  return Response.json({ success: true, data: job });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  // Cancel pending job
  db.prepare(`
    UPDATE background_jobs SET status = 'cancelled' WHERE id = ? AND status = 'pending'
  `).run(params.id);

  return Response.json({ success: true });
}
```

### Environment Variables

```bash
# .env.local - Job System Configuration

# ============================================
# Background Job Configuration
# ============================================
JOB_CONCURRENCY=2              # Max concurrent jobs
JOB_POLL_INTERVAL_MS=1000      # Queue poll interval
JOB_DEFAULT_MAX_ATTEMPTS=3     # Default retry attempts

# Cron Schedule Overrides (optional)
# CRON_RAG_SYNC="0 6 * * *"    # Daily at 6 AM
# CRON_NEWS_FETCH="0 */4 * * *" # Every 4 hours
# CRON_CACHE_CLEANUP="0 3 * * 0" # Weekly Sunday 3 AM
```

---
