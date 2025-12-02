# Story 6.2: Background Job Queue & Cron Scheduler

**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
**Story:** 6.2 - Background Job Queue & Cron Scheduler
**Status:** Done
**Created:** 2025-11-30
**Completed:** 2025-11-30

---

## Story Description

Implement a SQLite-backed background job queue with cron scheduling for executing long-running tasks outside the HTTP request lifecycle. This enables daily RAG syncs, news fetches, and other scheduled operations without blocking user interactions.

**User Value:** Users get automatic daily updates to their channel intelligence without manual intervention. The system continuously monitors their channels, competitors, and news sources, keeping the RAG context fresh and relevant for script generation.

---

## Acceptance Criteria

### AC-6.2.1: Job Queue Persistence
- **Given** a job is enqueued via the job queue API
- **When** the application restarts
- **Then** the job persists in SQLite and resumes processing
- **And** job status, payload, and progress are preserved

### AC-6.2.2: Retry Logic with Exponential Backoff
- **Given** a job fails during execution
- **When** the job has remaining retry attempts (max 3)
- **Then** the job is rescheduled with exponential backoff:
  - Attempt 1 failure → retry after 2 seconds
  - Attempt 2 failure → retry after 4 seconds
  - Attempt 3 failure → mark as permanently failed

### AC-6.2.3: Concurrent Job Limit
- **Given** multiple jobs are pending in the queue
- **When** the job processor is running
- **Then** at most 2 jobs execute concurrently
- **And** additional jobs wait until a slot becomes available

### AC-6.2.4: Cron Scheduler Triggers
- **Given** a cron schedule is configured and enabled
- **When** the cron expression matches current time
- **Then** a new job is enqueued with the configured payload
- **And** last_run timestamp is updated in cron_schedules table

### AC-6.2.5: Job Status API
- **Given** the jobs API endpoint receives a GET request
- **When** filtering by project_id or status
- **Then** returns matching jobs with id, type, status, progress, result

### AC-6.2.6: Progress Updates During Execution
- **Given** a long-running job is executing
- **When** the job handler calls updateProgress()
- **Then** the progress percentage (0-100) is visible via the jobs API

### AC-6.2.7: Job Cancellation
- **Given** a job is in 'pending' status
- **When** DELETE /api/jobs/{id} is called
- **Then** the job status changes to 'cancelled'
- **And** the job is not processed

---

## Tasks

### Task 1: Install node-cron Dependency
- [ ] Add `node-cron@^3.0.3` to package.json
- [ ] Add `@types/node-cron` dev dependency
- [ ] Verify import works in Next.js environment

### Task 2: Create Job Queue Module
- [ ] Create `lib/jobs/types.ts` with JobType and JobStatus enums
- [ ] Create `lib/jobs/queue.ts` with JobQueue class
- [ ] Implement `enqueue()` method with priority support
- [ ] Implement `dequeue()` method with priority ordering
- [ ] Implement `complete()` method
- [ ] Implement `fail()` method with retry logic
- [ ] Implement `updateProgress()` method
- [ ] Implement `cancel()` method
- [ ] Implement `getJob()` and `getJobs()` query methods
- [ ] Export singleton `jobQueue` instance

### Task 3: Create Job Processor Module
- [ ] Create `lib/jobs/processor.ts` with JobProcessor class
- [ ] Implement configurable concurrency (default: 2)
- [ ] Implement `start()` method with polling loop
- [ ] Implement `stop()` method with graceful shutdown
- [ ] Implement `processJob()` with handler dispatch
- [ ] Create handler registry pattern for job types
- [ ] Add error isolation per job

### Task 4: Create Cron Scheduler Module
- [ ] Create `lib/jobs/scheduler.ts` with CronScheduler class
- [ ] Implement `initialize()` to load enabled schedules from DB
- [ ] Implement `scheduleJob()` using node-cron
- [ ] Implement `registerDefaults()` for default schedules
- [ ] Implement `stop()` method
- [ ] Update last_run and next_run timestamps
- [ ] Export singleton `cronScheduler` instance

### Task 5: Create Default Job Handlers (Stubs)
- [ ] Create `lib/jobs/handlers/index.ts` with handler exports
- [ ] Create `lib/jobs/handlers/rag-sync.ts` (stub)
- [ ] Create `lib/jobs/handlers/news-fetch.ts` (stub)
- [ ] Create `lib/jobs/handlers/embedding.ts` (stub)
- [ ] Create `lib/jobs/handlers/cleanup.ts` with cache cleanup logic

### Task 6: Jobs API Endpoints
- [ ] Create `app/api/jobs/route.ts` for GET (list) and POST (create)
- [ ] Create `app/api/jobs/[id]/route.ts` for GET, DELETE
- [ ] Implement filtering by project_id, status, type
- [ ] Implement pagination with limit/offset
- [ ] Return job details including progress and result

### Task 7: Job Processor Startup Integration
- [ ] Create `lib/jobs/init.ts` for initialization
- [ ] Start processor and scheduler on app startup (when enabled)
- [ ] Add JOBS_ENABLED environment variable
- [ ] Add graceful shutdown on process termination
- [ ] Log processor status

### Task 8: Test Automation
- [ ] Create `tests/factories/job-factories.ts`
- [ ] Create `tests/fixtures/job-fixtures.ts`
- [ ] Unit tests for JobQueue class
- [ ] Unit tests for JobProcessor class
- [ ] Unit tests for CronScheduler class
- [ ] Integration tests for job persistence
- [ ] Integration tests for retry logic
- [ ] API tests for jobs endpoints

---

## Technical Notes

### Architecture References
- **Architecture:** Section 20 - Background Job Queue Architecture
- **Tech Spec:** Epic 6 - Story 6.2 Acceptance Criteria
- **Database:** Migration 013 (already created in Story 6.1)

### Dependencies
- **New Node.js:** node-cron@^3.0.3
- **Existing:** better-sqlite3@12.4.1 (job storage)

### Database Tables (Created in Story 6.1)
- `background_jobs` - Job queue storage
- `cron_schedules` - Recurring job definitions

### Job Types
```typescript
type JobType =
  | 'rag_sync_channel'    // Sync YouTube channel transcripts
  | 'rag_sync_news'       // Fetch news from RSS feeds
  | 'rag_sync_trends'     // Update trending topics
  | 'embedding_generation' // Generate embeddings for content
  | 'video_assembly'      // Assemble final video (existing)
  | 'cv_batch_analysis'   // Batch CV analysis (existing)
  | 'cache_cleanup';      // Clean old cache files
```

### Job Priority Levels
- 1-3: High priority (user-initiated, scheduled jobs)
- 4-6: Normal priority (default)
- 7-10: Low priority (background maintenance)

### Default Cron Schedules
| Name | Job Type | Expression | Description |
|------|----------|------------|-------------|
| Daily RAG Channel Sync | rag_sync_channel | 0 6 * * * | Daily at 6 AM |
| News Fetch | rag_sync_news | 0 */4 * * * | Every 4 hours |
| Weekly Cache Cleanup | cache_cleanup | 0 3 * * 0 | Sunday at 3 AM |

### Performance Targets
- Job dequeue: <10ms
- Progress update: <5ms
- Cron schedule check: <1ms per schedule
- Max concurrent jobs: 2 (configurable)

### Environment Variables
```bash
JOBS_ENABLED=true|false  # Enable/disable job processor
JOBS_CONCURRENCY=2       # Max concurrent jobs
```

---

## Definition of Done

- [x] All acceptance criteria pass
- [x] Job queue persists jobs across restarts
- [x] Retry logic works with exponential backoff
- [x] Concurrent job limit enforced
- [x] Cron scheduler triggers jobs on schedule
- [x] Jobs API returns status and progress
- [x] Job cancellation works for pending jobs
- [x] Unit tests written and passing (48 tests)
- [x] Integration tests written and passing
- [x] API tests written and passing
- [x] No TypeScript/ESLint errors
- [x] Build passes successfully
- [x] Code reviewed and approved

---

## Story Points

**Estimate:** 5 points (Medium)

**Justification:**
- Well-defined architecture with clear patterns
- Database schema already exists (Story 6.1)
- node-cron is simple to integrate
- Mostly TypeScript implementation

---

## References

- PRD: Feature 2.7 - Channel Intelligence & Content Research (RAG-Powered)
- Epic File: docs/epics.md - Epic 6 Story 6.2
- Tech Spec: docs/sprint-artifacts/tech-spec-epic-6.md
- Architecture: docs/architecture.md - Section 20 (Background Job Queue)
