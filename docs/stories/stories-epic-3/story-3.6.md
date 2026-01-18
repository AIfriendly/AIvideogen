# Story 3.6: Default Segment Download Service

## Story Header
- **ID:** 3.6
- **Title:** Default Segment Download Service
- **Goal:** Automatically download default video segments (first N seconds) for instant preview capability in Visual Curation UI
- **Epic:** Epic 3 - Visual Content Sourcing (YouTube API)
- **Status:** Completed
- **Dependencies:**
  - Story 3.3 (YouTube Video Search & Result Retrieval) - COMPLETED
  - Story 3.4 (Relevance Filtering & Ranking) - COMPLETED
  - Story 3.5 (Database Persistence & Visual Suggestion Retrieval) - COMPLETED

## Context

This story implements the automatic download service for default video segments that enable instant preview functionality in the Visual Curation UI (Epic 4). After Story 3.5 saves filtered visual suggestions to the database, this story downloads the first N seconds of each suggested video using yt-dlp, a robust Python-based YouTube downloader.

The default segment download service ensures users can preview actual footage immediately when curating visuals, without waiting for custom segment selection. Each segment is downloaded with a 5-second buffer beyond the scene's voiceover duration to provide adequate coverage for timing adjustments.

**Key Technical Components:**
- yt-dlp integration for YouTube segment downloading with health check validation
- Background job queue with parallel download processing (max 3 concurrent)
- Queue state persistence for crash recovery
- Progress tracking and status updates via visual_suggestions.download_status
- Retry logic with exponential backoff for network resilience
- File caching system with 7-day retention policy
- Database transaction handling to prevent partial state
- Proactive disk space validation before enqueuing jobs
- Secure command execution preventing injection attacks
- Error handling for quota limits, network failures, and invalid videos

**PRD References:**
- PRD Feature 1.5 AC6 (Default Segment Download) lines 235-238
- PRD Feature 1.5 AC7 (Instant Preview) lines 239-242

**Tech Spec References:**
- Tech Spec Epic 3 lines 229-298 (yt-dlp Integration & Download Workflow)

## Tasks

### Task 1: Install yt-dlp Dependency and Create Health Check
**Files:**
- `package.json` (add yt-dlp as system dependency)
- `README.md` (document installation requirements)
- `app/api/health/yt-dlp/route.ts` (NEW - health check endpoint)

**Implementation Details:**
- Install yt-dlp via system package manager or bundled approach
- Verify yt-dlp is accessible via system PATH
- Test yt-dlp command execution from Node.js
- Document installation requirements for development environment:
  - macOS: `brew install yt-dlp`
  - Linux: `pip install yt-dlp` or package manager
  - Windows: Download from GitHub releases or use pip
- Ensure yt-dlp supports --download-sections flag (version 2023.03.04+)

**Task 1.5: Create yt-dlp Health Check Endpoint**
Implement health check endpoint to verify yt-dlp availability:

```typescript
GET /api/health/yt-dlp
Response: {
  available: boolean;
  version?: string;              // e.g., "2024.03.10"
  supportsDownloadSections: boolean;
  error?: string;
}
```

**Health Check Implementation:**
- Execute command: `yt-dlp --version` using spawn()
- Parse version from stdout
- Verify version >= 2023.03.04 (required for --download-sections)
- Return availability status
- Called at:
  1. Server startup (log warning if unavailable)
  2. Before enqueuing downloads (return 503 if unavailable)
  3. Periodic background check (optional, every 5 minutes)
- If yt-dlp not available, POST /api/projects/[id]/download-segments returns:
  - HTTP 503 Service Unavailable
  - Error message: "yt-dlp not installed. See installation guide."
  - Include link to README installation instructions

### Task 2: Create downloadDefaultSegment() Service Function
**File:** `lib/youtube/download-segment.ts`

Implement core download service function with secure execution:

```typescript
interface DownloadSegmentOptions {
  videoId: string;
  segmentDuration: number;  // Duration in seconds (voiceover + 5s buffer)
  outputPath: string;        // Full file path including filename
  maxHeight?: number;        // Default: 720
}

interface DownloadSegmentResult {
  success: boolean;
  filePath?: string;
  error?: string;
  retryable?: boolean;      // True if error is retryable (network, timeout)
}

async function downloadDefaultSegment(
  options: DownloadSegmentOptions
): Promise<DownloadSegmentResult>
```

**SECURITY - Command Injection Prevention:**
Use `child_process.spawn()` with argument array (NOT string interpolation):

```typescript
import { spawn } from 'child_process';

// CORRECT - Secure execution with args array
const args = [
  `https://youtube.com/watch?v=${videoId}`,
  '--download-sections', `*0-${segmentDuration}`,
  '-f', '18',  // Format 18 (640x360 MP4 with audio) - Fix #9
  '-o', outputPath
];
const process = spawn('yt-dlp', args);

// WRONG - Vulnerable to command injection (DO NOT USE)
const command = `yt-dlp "https://youtube.com/watch?v=${videoId}" --download-sections "*0-${segmentDuration}" -f "best[height<=720]" -o "${outputPath}"`;
exec(command); // NEVER DO THIS
```

**Input Validation (Security):**
```typescript
function validateVideoId(videoId: string): boolean {
  // YouTube video IDs are 11 characters: alphanumeric, dashes, underscores
  const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  return videoIdRegex.test(videoId);
}

function sanitizeOutputPath(outputPath: string, projectId: string): string {
  // Ensure path is within .cache/videos/{projectId}/ directory
  const basePath = path.resolve('.cache/videos', projectId);
  const resolvedPath = path.resolve(outputPath);

  // Prevent path traversal attacks
  if (!resolvedPath.startsWith(basePath)) {
    throw new Error('Invalid output path: path traversal detected');
  }

  return resolvedPath;
}

// Apply validation before download
if (!validateVideoId(options.videoId)) {
  return { success: false, error: 'Invalid video ID format', retryable: false };
}
const sanitizedPath = sanitizeOutputPath(options.outputPath, projectId);
```

**Implementation Details:**
- Calculate segmentDuration = scene.duration + 5 (5-second buffer)
- Build output path (RELATIVE): `.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`
- Scene number formatting: `sceneNumber.toString().padStart(2, '0')` (zero-padded to 2 digits)
  - Examples: 1 → "01", 5 → "05", 10 → "10", 99 → "99"
  - Edge case: scene > 99 → no padding or increase width (e.g., 100 → "100")
- Resolution capped at 720p for performance (format filter: "best[height<=720]")
- Execute command using spawn() with argument array (prevents injection)
- Capture stdout/stderr for error diagnosis
- Parse yt-dlp output for download progress (optional for future progress bars)
- Return DownloadSegmentResult with success status and RELATIVE file path
- Classify errors as retryable (network, timeout) vs permanent (video unavailable, invalid URL)

**Path Storage Strategy:**
- Database stores: RELATIVE paths (e.g., `.cache/videos/proj1/scene-01-default.mp4`)
- yt-dlp uses: ABSOLUTE paths (resolved at runtime)
- UI resolves: Relative path to URL `/cache/videos/proj1/scene-01-default.mp4`
- Benefit: Project portability across different environments

### Task 3: Implement Retry Logic with Exponential Backoff
**File:** `lib/youtube/download-segment.ts`

Create retry wrapper around downloadDefaultSegment():

```typescript
interface RetryOptions {
  maxRetries: number;       // Default: 3
  baseDelay: number;        // Default: 1000ms
  maxDelay: number;         // Default: 8000ms
}

async function downloadWithRetry(
  options: DownloadSegmentOptions,
  retryOptions?: RetryOptions
): Promise<DownloadSegmentResult>
```

**Implementation Details:**
- Retry logic: Max 3 attempts with exponential backoff
- Delay sequence: 1s, 2s, 4s (exponential: delay = baseDelay * 2^attempt)
- Only retry if error is retryable (network timeout, temporary failure)
- Don't retry permanent failures (video unavailable, invalid URL, disk space full)
- Track retry attempts in logs for monitoring
- Return final result after max retries or success
- Log all retry attempts with error details

**Error Classification:**
- **Retryable:** Network timeout, connection refused, HTTP 429 (rate limit), HTTP 503
- **Permanent:** Video unavailable (HTTP 404), private/deleted video, invalid URL, disk space full, unsupported format

### Task 4: Create Download Job Queue System with Persistence
**Files:**
- `lib/youtube/download-queue.ts` (queue implementation)
- `.cache/queue-state.json` (NEW - queue persistence file)

Implement background job queue for parallel downloads with crash recovery:

```typescript
interface DownloadJob {
  id: string;
  suggestionId: string;
  videoId: string;
  segmentDuration: number;
  outputPath: string;        // RELATIVE path for database storage
  projectId: string;
  sceneNumber: number;
  status: 'queued' | 'downloading' | 'complete' | 'error';
  retryCount: number;
  error?: string;
}

class DownloadQueue {
  private queue: DownloadJob[] = [];
  private activeDownloads: Set<string> = new Set();
  private maxConcurrent: number = 3;
  private processingLock: Map<string, boolean> = new Map();  // Prevent duplicate processing

  async enqueueJob(job: DownloadJob): Promise<void>;
  private async processQueue(): Promise<void>;
  async getQueueStatus(projectId: string): { total: number; completed: number; failed: number };
  private async saveQueueState(): Promise<void>;          // NEW
  private async loadQueueState(): Promise<void>;          // NEW
  private async cleanStaleDownloadStatus(): Promise<void>; // NEW
}
```

**Queue State Persistence (REQUIRED - Fix #3):**

```typescript
// Save queue state to disk after every significant change
private async saveQueueState(): Promise<void> {
  const state = {
    queue: this.queue,
    activeDownloads: Array.from(this.activeDownloads),
    timestamp: new Date().toISOString()
  };
  await fs.writeFile('.cache/queue-state.json', JSON.stringify(state, null, 2));
}

// Load queue state on server startup
private async loadQueueState(): Promise<void> {
  try {
    const stateFile = await fs.readFile('.cache/queue-state.json', 'utf-8');
    const state = JSON.parse(stateFile);
    this.queue = state.queue || [];
    // Don't restore activeDownloads - these were in-progress when crashed
  } catch (error) {
    // File doesn't exist or invalid - start with empty queue
    this.queue = [];
  }
}

// Clean up stale "downloading" status on startup (crash recovery)
private async cleanStaleDownloadStatus(): Promise<void> {
  // Find all suggestions with download_status = 'downloading'
  // Reset them to 'queued' (they were interrupted by crash)
  await db.execute(`
    UPDATE visual_suggestions
    SET download_status = 'queued'
    WHERE download_status = 'downloading'
  `);
  console.log('Cleaned up stale download statuses from previous session');
}

// Initialize queue on server startup
async initialize(): Promise<void> {
  await this.loadQueueState();
  await this.cleanStaleDownloadStatus();

  // Re-enqueue jobs that were in queue before crash
  for (const job of this.queue) {
    if (job.status === 'queued') {
      await this.processQueue(); // Resume processing
    }
  }
}
```

**Database Transaction Handling (Fix #4):**

```typescript
// Use database transactions for status updates to prevent partial state
async function updateDownloadStatus(
  suggestionId: string,
  status: string,
  filePath?: string
): Promise<void> {
  await db.transaction(async (tx) => {
    // Lock row to prevent concurrent updates
    const [suggestion] = await tx.execute(`
      SELECT id FROM visual_suggestions
      WHERE id = ?
      FOR UPDATE
    `, [suggestionId]);

    if (!suggestion) {
      throw new Error(`Suggestion ${suggestionId} not found`);
    }

    // Update status
    await tx.execute(`
      UPDATE visual_suggestions
      SET download_status = ?,
          default_segment_path = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, filePath || null, suggestionId]);
  });
}

// Rollback handling if file write fails after DB update
async function handleDownloadComplete(job: DownloadJob, result: DownloadSegmentResult): Promise<void> {
  if (result.success && result.filePath) {
    // Verify file actually exists before updating database
    const fileExists = await fs.access(result.filePath).then(() => true).catch(() => false);

    if (!fileExists) {
      console.error(`File not found after download: ${result.filePath}`);
      await updateDownloadStatus(job.suggestionId, 'error');
      return;
    }

    // Update database with relative path
    const relativePath = path.relative(process.cwd(), result.filePath);
    await updateDownloadStatus(job.suggestionId, 'complete', relativePath);
  } else {
    await updateDownloadStatus(job.suggestionId, 'error');
  }
}
```

**Concurrency Control (Prevent Duplicate Processing):**

```typescript
private async processQueue(): Promise<void> {
  // Process jobs while slots available
  while (this.activeDownloads.size < this.maxConcurrent && this.queue.length > 0) {
    const job = this.queue.shift();
    if (!job) break;

    // Check if job already being processed (prevent duplicates)
    if (this.processingLock.get(job.id)) {
      console.warn(`Job ${job.id} already being processed, skipping`);
      continue;
    }

    // Acquire lock
    this.processingLock.set(job.id, true);
    this.activeDownloads.add(job.id);

    // Save queue state after dequeue
    await this.saveQueueState();

    // Process job asynchronously
    this.executeJob(job).finally(() => {
      this.activeDownloads.delete(job.id);
      this.processingLock.delete(job.id);
      this.saveQueueState();
      this.processQueue(); // Process next job
    });
  }
}
```

**Implementation Details:**
- Queue structure: FIFO (first-in, first-out) array
- Concurrency limit: Max 3 concurrent downloads to avoid overwhelming network/CPU
- Job processing:
  1. Dequeue next job when slot available
  2. Update visual_suggestions.download_status = 'downloading' (with transaction)
  3. Call downloadWithRetry() with job parameters
  4. Verify file exists after download
  5. Update download_status = 'complete' or 'error' based on result (with transaction)
  6. Update default_segment_path on success (RELATIVE path)
  7. Save queue state to .cache/queue-state.json
  8. Process next job in queue
- Track active downloads using Set to prevent duplicate processing
- Implement getQueueStatus() for progress tracking API endpoint
- Queue persistence (REQUIRED): Save queue state after every enqueue/dequeue
- Resume logic on server startup: Load queue state and continue processing
- Clean up stale "downloading" status on startup (crash recovery)

### Task 5: Create POST /api/projects/[id]/download-segments Endpoint
**File:** `app/api/projects/[id]/download-segments/route.ts`

Implement download orchestration endpoint with disk space validation:

```typescript
POST /api/projects/[id]/download-segments
Request: { projectId: string }
Response: {
  success: boolean;
  totalJobs: number;
  queued: number;
  alreadyDownloaded: number;
  message: string;
  error?: string;
}
```

**Disk Space Validation (Fix #2 - BEFORE ENQUEUING):**

```typescript
import { statfs } from 'fs/promises';

async function checkDiskSpace(requiredBytes: number): Promise<{ available: boolean; freeSpace: number }> {
  try {
    // Get disk space for .cache directory
    const stats = await statfs('.cache');
    const freeSpace = stats.bavail * stats.bsize; // Available space in bytes

    return {
      available: freeSpace >= requiredBytes,
      freeSpace
    };
  } catch (error) {
    console.error('Failed to check disk space:', error);
    // Assume space available if check fails (fail open)
    return { available: true, freeSpace: 0 };
  }
}

// In POST /api/projects/[id]/download-segments handler
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const projectId = params.id;

  // Check yt-dlp availability first
  const healthCheck = await fetch('/api/health/yt-dlp');
  const health = await healthCheck.json();
  if (!health.available) {
    return NextResponse.json(
      { success: false, error: 'yt-dlp not installed. See installation guide.' },
      { status: 503 }
    );
  }

  // Load pending suggestions
  const suggestions = await loadPendingSuggestions(projectId);

  if (suggestions.length === 0) {
    return NextResponse.json({
      success: true,
      totalJobs: 0,
      queued: 0,
      alreadyDownloaded: 0,
      message: 'No pending downloads'
    });
  }

  // PROACTIVE DISK SPACE CHECK (Fix #2)
  const estimatedSizePerSegment = 5 * 1024 * 1024; // 5MB per segment
  const requiredSpace = suggestions.length * estimatedSizePerSegment;
  const bufferSpace = 100 * 1024 * 1024; // 100MB safety buffer
  const totalRequired = requiredSpace + bufferSpace;

  const { available, freeSpace } = await checkDiskSpace(totalRequired);

  if (!available) {
    const requiredMB = Math.ceil(totalRequired / (1024 * 1024));
    const freeMB = Math.ceil(freeSpace / (1024 * 1024));

    return NextResponse.json({
      success: false,
      error: `Insufficient disk space. Required: ${requiredMB}MB, Available: ${freeMB}MB. Free up space and retry.`,
      totalJobs: suggestions.length,
      queued: 0,
      alreadyDownloaded: 0
    }, { status: 507 }); // HTTP 507 Insufficient Storage
  }

  // Proceed with enqueuing jobs
  // ... (rest of implementation)
}
```

**Implementation Details:**
- Load all visual suggestions for project from database
- Filter suggestions by download_status = 'pending' (skip already downloaded/downloading)
- **BEFORE ENQUEUING:** Check disk space (suggestions.length * 5MB + 100MB buffer)
- Return error if insufficient disk space (HTTP 507 with clear message)
- For each suggestion:
  1. Get associated scene to retrieve duration and scene number
  2. Calculate segmentDuration = scene.duration + 5
  3. Build outputPath (RELATIVE) = `.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`
  4. Apply zero-padding to sceneNumber: `sceneNumber.toString().padStart(2, '0')`
  5. Create DownloadJob object
  6. Enqueue job to DownloadQueue
  7. Update visual_suggestions.download_status = 'queued' (with transaction)
- Create .cache/videos/{projectId}/ directory if it doesn't exist
- Return response with job counts
- Endpoint is idempotent: can be called multiple times safely
- Handle cases where no suggestions exist (return success with 0 jobs)

### Task 6: Implement Progress Tracking API
**File:** `app/api/projects/[id]/download-progress/route.ts`

Create endpoint for tracking download progress:

```typescript
GET /api/projects/[id]/download-progress
Response: {
  total: number;
  completed: number;
  downloading: number;
  queued: number;
  failed: number;
  message: string;  // e.g., "Downloaded 12/40 segments"
}
```

**Implementation Details:**
- Query visual_suggestions table by project (JOIN with scenes)
- Aggregate counts by download_status:
  - completed: download_status = 'complete'
  - downloading: download_status = 'downloading'
  - queued: download_status = 'queued'
  - failed: download_status = 'error'
  - total: all suggestions
- Build message: "Downloaded {completed}/{total} segments"
- Return progress data for UI polling/progress bars
- Cache results briefly (5-10 seconds) to reduce database load

### Task 7: Implement File Cleanup Service
**File:** `lib/youtube/cleanup-cache.ts`

Create cache cleanup service with 7-day retention and database synchronization:

```typescript
interface CleanupOptions {
  retentionDays: number;    // Default: 7
  dryRun?: boolean;         // Preview mode without deleting
}

interface CleanupResult {
  filesDeleted: number;
  spaceFreed: number;       // Bytes
  databaseUpdates: number;  // NEW - DB records updated
  orphanedFiles: number;    // NEW - Files without DB record
  errors: string[];
}

async function cleanupOldSegments(
  options?: CleanupOptions
): Promise<CleanupResult>
```

**Database Synchronization (Fix #8):**

```typescript
// Map deleted files to database records via filename parsing
async function syncDatabaseAfterCleanup(deletedFiles: string[]): Promise<number> {
  let updatedCount = 0;

  for (const filePath of deletedFiles) {
    // Parse filename: .cache/videos/{projectId}/scene-{sceneNumber}-default.mp4
    const match = filePath.match(/\.cache\/videos\/([^\/]+)\/scene-(\d+)-default\.mp4$/);

    if (!match) {
      console.warn(`Could not parse filename: ${filePath}`);
      continue;
    }

    const [, projectId, sceneNumber] = match;

    // Query database for suggestions with this file path
    const suggestions = await db.execute(`
      SELECT vs.id, vs.download_status
      FROM visual_suggestions vs
      JOIN scenes s ON vs.scene_id = s.id
      WHERE s.project_id = ?
        AND s.scene_number = ?
        AND vs.default_segment_path = ?
    `, [projectId, parseInt(sceneNumber), filePath]);

    // Update status to 'pending' and clear file path
    for (const suggestion of suggestions) {
      await db.transaction(async (tx) => {
        await tx.execute(`
          UPDATE visual_suggestions
          SET download_status = 'pending',
              default_segment_path = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [suggestion.id]);
      });
      updatedCount++;
    }
  }

  return updatedCount;
}

// Handle orphaned files (files without DB record)
async function findOrphanedFiles(allFiles: string[]): Promise<string[]> {
  const orphaned: string[] = [];

  for (const filePath of allFiles) {
    const match = filePath.match(/\.cache\/videos\/([^\/]+)\/scene-(\d+)-default\.mp4$/);
    if (!match) continue;

    const [, projectId, sceneNumber] = match;

    // Check if any DB record references this file
    const [result] = await db.execute(`
      SELECT COUNT(*) as count
      FROM visual_suggestions vs
      JOIN scenes s ON vs.scene_id = s.id
      WHERE s.project_id = ?
        AND s.scene_number = ?
        AND vs.default_segment_path = ?
    `, [projectId, parseInt(sceneNumber), filePath]);

    if (result.count === 0) {
      orphaned.push(filePath);
    }
  }

  return orphaned;
}
```

**Implementation Details:**
- Scan `.cache/videos/` directory recursively
- Check file modification time (mtime) for each .mp4 file
- Delete files older than retention period (default: 7 days)
- Track space freed (sum of file sizes deleted)
- **Parse filename to extract projectId and sceneNumber** (Fix #8)
- **Query database for all suggestions with matching file path**
- **Update download_status = 'pending' and default_segment_path = null for deleted files**
- **Identify orphaned files (files without DB record)**
- Return cleanup statistics including database updates
- Implement dry-run mode for testing
- Handle file access errors gracefully (log and continue)
- Schedule cleanup via cron job or background task (future enhancement)

### Task 8: Implement Error Handling and Edge Cases
**Files:** All above files

**Error Scenarios:**
1. **Video Unavailable/Deleted:**
   - yt-dlp returns error: "Video unavailable"
   - Mark download_status = 'error' immediately (no retry)
   - Store error message in database for user feedback
   - Continue processing other downloads

2. **Network Timeout:**
   - yt-dlp returns error: "Connection timeout"
   - Classify as retryable error
   - Retry with exponential backoff (max 3 attempts)
   - Mark as error after max retries

3. **Disk Space Full:**
   - Proactive check BEFORE enqueuing (Task 5)
   - If detected during download: yt-dlp returns "No space left on device"
   - Pause download queue immediately
   - Return user-friendly error message
   - Alert user to free disk space
   - Resume queue when space available

4. **Invalid YouTube URL:**
   - yt-dlp returns error: "Invalid URL"
   - Mark download_status = 'error' immediately (no retry)
   - Log error for investigation (suggests bug in video_id storage)

5. **YouTube Rate Limit/Quota:**
   - yt-dlp returns error: HTTP 429 "Too many requests"
   - Pause queue for extended period (e.g., 15 minutes)
   - Retry downloads after cooldown period
   - Alert user if quota consistently exceeded

6. **yt-dlp Not Installed:**
   - Health check endpoint detects missing yt-dlp
   - POST /api/projects/[id]/download-segments returns HTTP 503
   - Return clear error message with installation instructions
   - Don't enqueue any jobs
   - Link to README installation guide

## Acceptance Criteria

### AC1: yt-dlp Installation and Accessibility
- [ ] yt-dlp installed and accessible via system PATH or bundled with project
- [ ] yt-dlp version verified to support --download-sections flag (2023.03.04+)
- [ ] Installation instructions documented in README.md
- [ ] Missing yt-dlp returns clear error message with installation guide

### AC1.5: yt-dlp Health Check Endpoint (Fix #6)
- [ ] GET /api/health/yt-dlp endpoint implemented
- [ ] Returns: { available, version, supportsDownloadSections }
- [ ] Health check called at server startup (logs warning if unavailable)
- [ ] Health check called before enqueuing downloads
- [ ] Periodic health check (optional, every 5 minutes)
- [ ] POST /api/projects/[id]/download-segments returns HTTP 503 if yt-dlp missing
- [ ] Error message includes link to installation instructions

### AC2: downloadDefaultSegment() Core Functionality
- [ ] downloadDefaultSegment() accepts DownloadSegmentOptions interface
- [ ] Uses spawn() with argument array (NOT string interpolation) to prevent command injection
- [ ] Example: `spawn('yt-dlp', [url, '--download-sections', duration, ...])` (Fix #1)
- [ ] Validates videoId format: 11 characters, alphanumeric + dashes/underscores (Fix #1)
- [ ] Sanitizes outputPath to prevent path traversal attacks (Fix #1)
- [ ] Given scene with 8s voiceover, downloads first 13 seconds (8s + 5s buffer)
- [ ] Given scene with 120s voiceover, downloads first 125 seconds (120s + 5s buffer)
- [ ] Resolution capped at 720p via format filter: "best[height<=720]"
- [ ] Scene number formatting: `sceneNumber.toString().padStart(2, '0')` (Fix #7)
- [ ] Examples: 1 → "01", 5 → "05", 10 → "10", 99 → "99" (Fix #7)
- [ ] Edge case: scene > 99 → no padding or increase width (e.g., 100 → "100") (Fix #7)
- [ ] Returns DownloadSegmentResult with success status and RELATIVE file path
- [ ] Classifies errors as retryable vs permanent
- [ ] Executes yt-dlp command successfully and captures output

### AC3: Retry Logic with Exponential Backoff
- [ ] downloadWithRetry() wraps downloadDefaultSegment() with retry logic
- [ ] Max 3 retry attempts for retryable errors
- [ ] Exponential backoff delays: 1s, 2s, 4s between retries
- [ ] Retryable errors: Network timeout, HTTP 429, HTTP 503, connection refused
- [ ] Permanent errors: Video unavailable (404), invalid URL, disk space full
- [ ] Permanent errors don't trigger retries (fail immediately)
- [ ] All retry attempts logged with error details
- [ ] Returns final result after max retries or first success

### AC4: Download Job Queue System
- [ ] DownloadQueue class implemented with job management
- [ ] Queue processes jobs in FIFO order
- [ ] Max 3 concurrent downloads enforced (no more than 3 active at once)
- [ ] enqueueJob() adds new jobs to queue
- [ ] processQueue() dequeues and executes jobs when slots available
- [ ] getQueueStatus() returns total, completed, failed counts per project
- [ ] Active downloads tracked via Set to prevent duplicates
- [ ] Queue continues processing even if individual jobs fail

### AC4.5: Queue State Persistence (Fix #3 - REQUIRED)
- [ ] Queue state saved to .cache/queue-state.json after every enqueue/dequeue
- [ ] Queue state includes: queue array, activeDownloads, timestamp
- [ ] loadQueueState() called on server startup to restore queue
- [ ] cleanStaleDownloadStatus() resets 'downloading' → 'queued' on startup
- [ ] Crash recovery: incomplete downloads resume after server restart
- [ ] Queue state persists across server restarts (AC added)
- [ ] DoD includes crash recovery test scenario (Fix #3)

### AC5: POST /api/projects/[id]/download-segments Endpoint
- [ ] Endpoint accepts projectId parameter
- [ ] Checks yt-dlp health before proceeding (returns 503 if unavailable)
- [ ] Loads all visual suggestions for project from database
- [ ] Filters suggestions by download_status = 'pending' (skips completed/downloading)
- [ ] **Proactive disk space check BEFORE enqueuing jobs** (Fix #2)
- [ ] **Estimates required space: suggestions.length * 5MB per segment** (Fix #2)
- [ ] **Returns HTTP 507 error if insufficient space (required + 100MB buffer)** (Fix #2)
- [ ] **AC5 addition: "Validates sufficient disk space before enqueuing"** (Fix #2)
- [ ] For each suggestion: retrieves scene, calculates segment duration, builds output path
- [ ] Creates .cache/videos/{projectId}/ directory if not exists
- [ ] Enqueues DownloadJob for each pending suggestion
- [ ] Updates visual_suggestions.download_status = 'queued' on enqueue
- [ ] Returns response with totalJobs, queued, alreadyDownloaded counts
- [ ] Endpoint is idempotent (safe to call multiple times)
- [ ] Handles case where no suggestions exist (returns success with 0 jobs)

### AC6: Download Status Updates (Fix #4 - Transactions)
- [ ] visual_suggestions.download_status updates correctly through lifecycle:
  - pending → queued (when enqueued to job queue)
  - queued → downloading (when download starts)
  - downloading → complete (on successful download)
  - downloading → error (after max retries or permanent failure)
- [ ] **Status updates use database transactions via db.transaction()** (Fix #4)
- [ ] **Row locking (FOR UPDATE) prevents concurrent updates to same suggestion** (Fix #4)
- [ ] **Rollback handling if file write fails after DB update** (Fix #4)
- [ ] **AC6 addition: "Status updates use transactions to prevent partial state"** (Fix #4)
- [ ] visual_suggestions.default_segment_path populated with RELATIVE path on success (Fix #5)
- [ ] **AC6 update: Specify RELATIVE path storage** (Fix #5)
- [ ] default_segment_path format: `.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`
- [ ] File path stored as RELATIVE to project root for portability (Fix #5)
- [ ] yt-dlp uses ABSOLUTE paths (resolved at runtime) (Fix #5)
- [ ] UI resolves relative path to URL for video player (Fix #5)

### AC7: Progress Tracking API
- [ ] GET /api/projects/[id]/download-progress endpoint returns progress data
- [ ] Response includes: total, completed, downloading, queued, failed counts
- [ ] Response includes message: "Downloaded X/Y segments"
- [ ] Counts accurate based on visual_suggestions.download_status aggregation
- [ ] Endpoint queries efficiently via JOIN with scenes table
- [ ] Results cached briefly (5-10s) to reduce database load during polling

### AC8: File Naming and Organization (Fix #7 - Zero-Padding)
- [ ] Downloaded segments saved to `.cache/videos/{projectId}/` directory
- [ ] File naming convention: `scene-{sceneNumber}-default.mp4`
- [ ] **Scene numbers padded to 2 digits minimum using padStart(2, '0')** (Fix #7)
- [ ] **AC8 update: "Scene numbers padded to 2 digits minimum"** (Fix #7)
- [ ] Examples: scene-01-default.mp4, scene-05-default.mp4, scene-10-default.mp4
- [ ] Edge case handled: scene > 99 (scene-100-default.mp4 or wider padding)
- [ ] File naming prevents conflicts (scene number unique per project)
- [ ] Directory structure created automatically if missing
- [ ] Files are valid .mp4 format playable in browser video player

### AC9: Cache Cleanup Service (Fix #8 - Database Mapping)
- [ ] cleanupOldSegments() implemented with retention policy
- [ ] Default retention: 7 days from file modification time
- [ ] Scans `.cache/videos/` directory recursively
- [ ] Deletes files older than retention period
- [ ] **Parses filename to extract projectId and sceneNumber** (Fix #8)
- [ ] **Queries database for all suggestions with default_segment_path matching deleted file** (Fix #8)
- [ ] **Updates download_status = 'pending' for suggestions whose files were deleted** (Fix #8)
- [ ] **Clears default_segment_path = null for deleted segments** (Fix #8)
- [ ] **Identifies and logs orphaned files (files without DB record)** (Fix #8)
- [ ] **AC9 update: "Maps deleted files to DB via filename parsing"** (Fix #8)
- [ ] Returns CleanupResult with filesDeleted, spaceFreed, databaseUpdates, orphanedFiles
- [ ] Dry-run mode available for testing (preview without deleting)
- [ ] Handles file access errors gracefully (logs and continues)

### AC10: Error Handling - Video Unavailable
- [ ] yt-dlp error "Video unavailable" detected
- [ ] download_status = 'error' immediately (no retry)
- [ ] Error message stored for user feedback
- [ ] Queue continues processing other downloads
- [ ] User sees "Video unavailable" in UI next to failed suggestion

### AC11: Error Handling - Network Timeout
- [ ] yt-dlp network timeout detected and classified as retryable
- [ ] Retry logic triggers with exponential backoff
- [ ] Max 3 retry attempts executed
- [ ] download_status = 'error' after max retries exhausted
- [ ] All retry attempts logged with timestamps and delays

### AC12: Error Handling - Disk Space Full
- [ ] **Proactive disk space check prevents enqueuing if insufficient space** (Fix #2)
- [ ] **Returns HTTP 507 with clear error message showing required vs available MB** (Fix #2)
- [ ] If detected during download: yt-dlp error "No space left on device" detected
- [ ] Download queue paused immediately (no new downloads start)
- [ ] User-friendly error message returned: "Disk space full. Free space and retry."
- [ ] Queue can be resumed manually after space freed
- [ ] Partial downloads cleaned up (incomplete .mp4 files deleted)

### AC13: Error Handling - Invalid YouTube URL
- [ ] yt-dlp error "Invalid URL" detected
- [ ] download_status = 'error' immediately (no retry)
- [ ] Error logged for investigation (indicates bug in video_id storage)
- [ ] User sees "Invalid video URL" in UI

### AC14: Error Handling - YouTube Rate Limit
- [ ] yt-dlp HTTP 429 "Too many requests" detected
- [ ] Download queue paused for cooldown period (15 minutes)
- [ ] Retryable error: queued jobs resume after cooldown
- [ ] User alerted if rate limit consistently hit
- [ ] Consider implementing download throttling (delay between downloads)

### AC15: Parallel Download Performance
- [ ] Max 3 concurrent downloads enforced (verified via active download tracking)
- [ ] Downloads execute in parallel when queue has multiple jobs
- [ ] Queue doesn't block: new jobs can be enqueued while downloads active
- [ ] No race conditions: job status updates are thread-safe via transactions
- [ ] Download performance monitored (average download time per segment)

## Technical Notes

### Security Considerations (Fix #1)

**Command Injection Prevention:**
- **NEVER use string interpolation or exec() for yt-dlp commands**
- **ALWAYS use spawn() with argument array:**
  ```typescript
  // CORRECT - Safe from injection
  spawn('yt-dlp', [url, '--download-sections', `*0-${duration}`, ...])

  // WRONG - Vulnerable to injection
  exec(`yt-dlp "${url}" --download-sections "*0-${duration}"`)
  ```
- **Input Validation:**
  - videoId: Must match `/^[a-zA-Z0-9_-]{11}$/` (YouTube format)
  - outputPath: Must be within `.cache/videos/{projectId}/` (prevent path traversal)
  - Reject any input that fails validation before spawning process

**Path Traversal Prevention:**
- Validate projectId contains no path separators (`/`, `\`, `..`)
- Resolve output path and verify it starts with `.cache/videos/`
- Reject attempts to write outside designated cache directory

**File Permissions:**
- Set `.cache/` directory permissions: read/write for app only
- Don't expose cache directory via public web server routes
- Use environment-specific paths (don't hardcode absolute paths)

### Database Transaction Handling (Fix #4)

**Transaction Strategy:**
```typescript
// All status updates wrapped in transactions
await db.transaction(async (tx) => {
  // Lock row to prevent concurrent updates
  await tx.execute(`SELECT id FROM visual_suggestions WHERE id = ? FOR UPDATE`, [id]);

  // Update status
  await tx.execute(`UPDATE visual_suggestions SET download_status = ? WHERE id = ?`, [status, id]);
});
```

**Semaphore/Lock for Job Processing:**
- Use `Map<string, boolean>` to track jobs being processed
- Check lock before starting job, acquire lock, release after completion
- Prevents duplicate processing if queue resumed or job retried

**Rollback Handling:**
- Verify file exists after download before updating database
- If file missing, rollback transaction or update status to 'error'
- Log discrepancies between filesystem and database for investigation

### File Path Strategy (Fix #5)

**Path Storage Convention:**
- **Database:** Stores RELATIVE paths (e.g., `.cache/videos/proj1/scene-01-default.mp4`)
- **yt-dlp execution:** Uses ABSOLUTE paths (resolved via `path.resolve()` at runtime)
- **UI/API:** Resolves relative path to URL (e.g., `/cache/videos/proj1/scene-01-default.mp4`)

**Benefits:**
- Project portability across different environments
- Database migrations don't break file references
- Easy to relocate cache directory without DB updates

**Implementation:**
```typescript
// Store relative path in DB
const relativePath = `.cache/videos/${projectId}/scene-${sceneNumber}-default.mp4`;
await db.execute(`UPDATE visual_suggestions SET default_segment_path = ?`, [relativePath]);

// Resolve to absolute for yt-dlp
const absolutePath = path.resolve(process.cwd(), relativePath);
spawn('yt-dlp', [..., '-o', absolutePath]);

// Resolve to URL for UI
const videoUrl = relativePath.replace('.cache/', '/cache/');
```

### yt-dlp Integration

**Why yt-dlp:** More robust than youtube-dl, actively maintained, supports --download-sections for precise segment extraction

**Segment Download Command:** `--download-sections "*0-N"` downloads first N seconds (0 to N)

**Format Selection (Fix #9):** `-f "18"` uses format 18 (640x360 MP4 with audio)
- **Previous:** `-f "best[height<=720]"` selected HLS formats causing ffmpeg error 3199971767
- **Current:** `-f "18"` uses single MP4 format, avoiding HLS segmentation issues
- **Trade-off:** 360p resolution instead of 720p, but reliable downloads without HTTP 403 errors
- **Rationale:** Format 18 is always available, single file (no segments), and works consistently

**Output Template:** `-o "path/to/file.mp4"` specifies exact output path

**Error Codes:** yt-dlp returns specific exit codes and error messages for different failure types

**Health Check:** Verify yt-dlp availability and version before allowing downloads

### File Naming Convention (Fix #7)

**Zero-Padding Implementation:**
```typescript
const paddedNumber = sceneNumber.toString().padStart(2, '0');
// 1 → "01", 5 → "05", 10 → "10", 99 → "99"

// Edge case: scene > 99
// Option 1: No padding (100 → "100")
// Option 2: Increase width (100 → "0100") - requires consistent width
```

**Naming Pattern:**
- **Default segments:** `scene-{sceneNumber}-default.mp4`
- **Custom segments (future):** `scene-{sceneNumber}-custom-{timestamp}.mp4`
- **Zero-padding:** Scene numbers padded to 2 digits minimum for sorting
- **Uniqueness:** Scene number is unique per project (guaranteed by database schema)

### Download Workflow Integration

1. **Story 3.3:** Searches YouTube, saves suggestions to database
2. **Story 3.4:** Filters suggestions by relevance (duration, embeddability)
3. **Story 3.5:** Persists top N suggestions per scene to database
4. **Story 3.6:** Downloads default segment for each suggestion
5. **Epic 4:** User previews downloaded segments in Visual Curation UI

### Performance Considerations

- **Concurrency Limit:** 3 concurrent downloads balances speed with network/CPU usage
- **Resolution Cap:** 360p (format 18) ensures reliable downloads, avoids HLS segmentation issues (Fix #9)
- **Buffer Duration:** 5-second buffer provides timing flexibility for users
- **Cache Retention:** 7-day retention balances instant preview availability with disk space
- **Retry Strategy:** Exponential backoff prevents overwhelming YouTube servers during failures
- **Disk Space Check:** Proactive validation prevents failed downloads due to space issues

### Storage Estimates

- **Average segment size:** 2-3 MB for 10-15 seconds at 360p (format 18, Fix #9)
- **Project with 10 scenes, 5 suggestions each:** 50 segments × 2.5 MB = 125 MB
- **Retention period:** 7 days of cached segments
- **Cleanup frequency:** Daily cleanup recommended to maintain storage health
- **Disk space buffer:** 100MB safety margin for proactive checks

### Error Recovery Strategy

- **Transient errors:** Retry with backoff (network issues, rate limits)
- **Permanent errors:** Fail immediately and alert user (video unavailable, invalid URL)
- **Disk space:** Proactive check before enqueuing, pause queue if detected during download
- **Quota exceeded:** Pause queue with extended cooldown (15+ minutes)
- **Crash recovery:** Queue state persists, stale statuses cleaned on startup

### Future Enhancements

- **Progress Bars:** Parse yt-dlp output to show download progress percentage in UI
- **Custom Segments:** Extend download service to support custom time ranges (e.g., "30-45s")
- **Download Scheduling:** Schedule downloads for off-peak hours to reduce server load
- **CDN Integration:** Upload segments to CDN for faster delivery in production
- **Queue Monitoring:** Dashboard showing queue health, average download time, error rates

## Definition of Done

- [ ] All tasks completed and code reviewed
- [ ] All acceptance criteria met and verified
- [ ] yt-dlp installed and installation documented
- [ ] **yt-dlp health check endpoint implemented (GET /api/health/yt-dlp)** (Fix #6)
- [ ] **Health check called at startup, before downloads, and periodically** (Fix #6)
- [ ] downloadDefaultSegment() implemented with segment extraction
- [ ] **Command execution uses spawn() with args array (prevents injection)** (Fix #1)
- [ ] **Input validation for videoId and outputPath sanitization** (Fix #1)
- [ ] Retry logic with exponential backoff working
- [ ] Download job queue with max 3 concurrent downloads functional
- [ ] **Queue state persistence to .cache/queue-state.json** (Fix #3)
- [ ] **Queue resume logic on server startup** (Fix #3)
- [ ] **Stale download status cleanup on startup** (Fix #3)
- [ ] **Database transactions for all status updates** (Fix #4)
- [ ] **Row locking to prevent duplicate job processing** (Fix #4)
- [ ] **Rollback handling if file write fails** (Fix #4)
- [ ] POST /api/projects/[id]/download-segments endpoint implemented
- [ ] **Proactive disk space validation before enqueuing** (Fix #2)
- [ ] **Returns HTTP 507 if insufficient disk space** (Fix #2)
- [ ] GET /api/projects/[id]/download-progress endpoint implemented
- [ ] Cache cleanup service with 7-day retention implemented
- [ ] **Cleanup service maps deleted files to DB via filename parsing** (Fix #8)
- [ ] **Database updates for deleted segments (status → pending, path → null)** (Fix #8)
- [ ] **Orphaned file detection and logging** (Fix #8)
- [ ] **File paths stored as RELATIVE in database** (Fix #5)
- [ ] **Path resolution documented: DB=relative, yt-dlp=absolute, UI=URL** (Fix #5)
- [ ] **Zero-padding implementation for scene numbers (padStart(2, '0'))** (Fix #7)
- [ ] **Edge case handling for scene > 99** (Fix #7)
- [ ] All error scenarios tested:
  - [ ] Video unavailable (permanent failure)
  - [ ] Network timeout (retry with backoff)
  - [ ] Disk space full (proactive check + pause queue)
  - [ ] Invalid URL (permanent failure)
  - [ ] Rate limit (pause with cooldown)
  - [ ] yt-dlp missing (health check returns 503)
- [ ] **Crash recovery scenario tested (queue resumes after restart)** (Fix #3)
- [ ] File naming convention follows spec (scene-{sceneNumber}-default.mp4 with zero-padding)
- [ ] Downloaded segments playable in browser
- [ ] Progress tracking accurate and performant
- [ ] Database status updates transactional and consistent
- [ ] Integration tested with Stories 3.3, 3.4, 3.5
- [ ] Manual testing:
  - [ ] Download 5+ segments for test project
  - [ ] Verify parallel downloads (max 3 concurrent)
  - [ ] Trigger retry scenario (disconnect network mid-download)
  - [ ] Verify cleanup service deletes old files and updates database
  - [ ] Test progress tracking during active downloads
  - [ ] Test crash recovery (stop server mid-download, restart, verify queue resumes)
  - [ ] Test disk space validation (low disk space scenario)
  - [ ] Test transaction rollback (simulate file write failure)
- [ ] Security testing:
  - [ ] Verify command injection prevention (malicious videoId)
  - [ ] Verify path traversal prevention (malicious projectId)
  - [ ] Verify input validation rejects invalid formats
- [ ] Code follows project conventions and style guide
- [ ] No console errors or warnings in development
- [ ] API endpoints return consistent error formats
- [ ] Documentation updated (API docs, README)
- [ ] Story marked as DONE in sprint status

---

## Architect Feedback & Resolutions

**Feedback Received:** 2025-11-17
**Story Regenerated:** 2025-11-17
**Regenerated By:** SM Agent

### Fix #1: Command Injection Vulnerability (Task 2)
**Issue:** String interpolation in yt-dlp command execution vulnerable to command injection.

**Resolution:**
- Replaced string interpolation with `spawn()` using argument array
- Added security example showing correct vs incorrect implementation
- Added `validateVideoId()` function: validates 11-char alphanumeric + dashes format
- Added `sanitizeOutputPath()` function: prevents path traversal attacks
- Updated AC2 to require spawn() with args array and input validation
- Added Security Considerations section with detailed examples

### Fix #2: Disk Space Validation (Task 5)
**Issue:** No proactive disk space check before enqueuing downloads.

**Resolution:**
- Added `checkDiskSpace()` function using `statfs()`
- Estimates required space: `suggestions.length * 5MB per segment`
- Adds 100MB safety buffer to estimate
- Returns HTTP 507 Insufficient Storage if space unavailable
- Prevents enqueuing any jobs if disk space check fails
- Added AC5 requirement: "Validates sufficient disk space before enqueuing"
- Updated Technical Notes with disk space estimates and buffer strategy

### Fix #3: Queue State Persistence (Task 4)
**Issue:** Queue persistence marked as optional, no crash recovery.

**Resolution:**
- Changed queue persistence from optional to REQUIRED
- Added `saveQueueState()` function: saves to `.cache/queue-state.json`
- Added `loadQueueState()` function: restores queue on server startup
- Added `cleanStaleDownloadStatus()`: resets 'downloading' → 'queued' on startup
- Added `initialize()` method: orchestrates startup sequence
- Added AC4.5: "Queue state persists and resumes after restart"
- Added DoD requirement: Test crash recovery scenario
- Updated Technical Notes with persistence strategy

### Fix #4: Database Transaction Handling (Task 4, AC6)
**Issue:** No transaction specification, risk of partial state updates.

**Resolution:**
- Added transaction wrapper using `db.transaction()` for all status updates
- Added row locking with `FOR UPDATE` clause to prevent concurrent updates
- Added `processingLock` Map to prevent duplicate job processing
- Added rollback handling: verify file exists before DB update
- Added `handleDownloadComplete()` with file verification logic
- Updated AC6: "Status updates use transactions to prevent partial state"
- Added Technical Notes section on Database Transaction Handling
- Added DoD requirement: Test transaction rollback scenario

### Fix #5: File Path Consistency (Task 2, AC6, AC8)
**Issue:** Unclear whether paths stored as relative or absolute, impacts portability.

**Resolution:**
- Clarified path storage strategy: Database stores RELATIVE paths
- Added Technical Notes section: "File Path Strategy"
- Database: `.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`
- yt-dlp: Resolves to absolute path at runtime using `path.resolve()`
- UI: Resolves relative path to URL for video player
- Updated AC6: Specify relative path storage for portability
- Added implementation examples showing path conversion

### Fix #6: yt-dlp Health Check Endpoint (Task 1)
**Issue:** No health check to verify yt-dlp availability before downloads.

**Resolution:**
- Added Task 1.5: "Create yt-dlp health check endpoint"
- Created endpoint: `GET /api/health/yt-dlp`
- Returns: `{ available, version, supportsDownloadSections }`
- Health check called at:
  - Server startup (logs warning if unavailable)
  - Before enqueuing downloads (returns 503 if unavailable)
  - Periodic background check (optional, every 5 minutes)
- Added AC1.5: Health check endpoint requirements
- Updated Task 5: Check yt-dlp health before enqueuing
- Returns HTTP 503 with installation guide link if unavailable

### Fix #7: Zero-Padding Implementation (Task 2, AC8)
**Issue:** Scene number zero-padding mentioned but not implemented.

**Resolution:**
- Added implementation: `sceneNumber.toString().padStart(2, '0')`
- Specified: 2-digit padding minimum (supports 01-99)
- Added edge case handling: scene > 99 (no padding or increase width)
- Added examples: 1 → "01", 5 → "05", 10 → "10", 99 → "99", 100 → "100"
- Updated AC8: "Scene numbers padded to 2 digits minimum"
- Updated Technical Notes with zero-padding examples
- Added DoD verification: File naming follows spec with zero-padding

### Fix #8: Cache Cleanup Database Updates (Task 7, AC9)
**Issue:** Cleanup service deletes files but doesn't update database records.

**Resolution:**
- Added `syncDatabaseAfterCleanup()` function
- Parses filename regex: `.cache/videos/([^/]+)/scene-(\d+)-default\.mp4`
- Extracts projectId and sceneNumber from filename
- Queries database for suggestions with matching `default_segment_path`
- Updates `download_status = 'pending'` and `default_segment_path = null`
- Added `findOrphanedFiles()` function: identifies files without DB record
- Updated CleanupResult interface: added `databaseUpdates` and `orphanedFiles`
- Updated AC9: "Maps deleted files to DB via filename parsing"
- Added Technical Notes on database synchronization strategy

### Fix #9: HLS Format Download Issue (Task 2, AC2)
**Date:** 2026-01-16
**Issue:** Format selector `best[height<=720]` selects HLS formats that cause ffmpeg exit code 3199971767.

**Root Cause:**
- HLS formats (like format 95) require downloading multiple HLS segments
- Authentication tokens in segments can expire quickly, causing HTTP 403 Forbidden errors
- ffmpeg cannot process incomplete HLS data, resulting in exit code 3199971767

**Resolution:**
- Changed format selector from `best[height<=${maxHeight}]` to format `'18'`
- Format 18 = 640x360 MP4 with audio (single file, always available on YouTube)
- Avoids HLS/DASH segmentation and associated HTTP 403 errors
- Trade-off: Downloads at 360p instead of 720p for reliability
- Updated code in `src/lib/youtube/download-segment.ts` lines 188-208
- Verified fix: Test download completed successfully (485 KB file created)

**Technical Details:**
```typescript
// OLD format selector (caused HLS issues):
const formatSelector = `best[height<=${maxHeight}]`;

// NEW format selector (reliable):
const formatSelector = '18';  // 640x360 MP4 with audio
```

### Summary of Changes:
- **9 critical fixes** applied across 11 tasks and 15+ acceptance criteria
- **Security hardened:** Command injection prevention, input validation, path sanitization
- **Reliability improved:** Queue persistence, crash recovery, transaction handling, HLS format fix
- **Data integrity:** Database synchronization, file-to-record mapping, relative path strategy
- **Operational readiness:** Health checks, disk space validation, zero-padding
- **Documentation:** Technical Notes expanded with security, transactions, paths, and error recovery

---

## Agent Records

### Scrum Master (SM) Record
**Story Created:** 2025-11-17
**Story Regenerated:** 2025-11-17
**Created By:** SM Agent

**Story Validation:**
- Story ID: 3.6 follows epic numbering convention
- Dependencies verified: Stories 3.3, 3.4, 3.5 completed
- Acceptance criteria align with epics.md lines 812-869
- Tasks cover all requirements from PRD Feature 1.5 AC6-AC7
- All 8 architect critical fixes incorporated
- Error handling requirements comprehensive (6 error scenarios + crash recovery)
- Definition of Done includes all quality gates, manual testing, and security testing
- Integration points documented with Epic 3 workflow

**Story Complexity Assessment:**
- Very high complexity: External tool integration, job queue, retry logic, persistence, transactions
- Estimated effort: 16-20 hours (increased from 12-16 due to security/reliability requirements)
- Critical path story: Enables instant preview in Epic 4 Visual Curation UI
- Risk factors:
  - yt-dlp installation varies by OS (health check mitigates)
  - YouTube rate limiting may affect downloads (proactive validation mitigates)
  - Disk space management critical (proactive check mitigates)
  - Parallel download coordination requires careful concurrency control (locks mitigate)
  - Command injection vulnerability (spawn() with args array mitigates)
  - Crash recovery complexity (queue persistence mitigates)

**Technical Dependencies:**
- Requires yt-dlp installed on system (external dependency with health check)
- Depends on visual_suggestions table from Story 3.3
- Depends on scene.duration field from Epic 2
- Prepares for Epic 4 Visual Curation UI (preview functionality)

**Security Considerations:**
- Command injection prevention is CRITICAL
- Path traversal attacks must be blocked
- Input validation required for all external inputs
- File permissions must restrict access to cache directory

**Notes:**
- Story is ready for development with architect approval
- All critical security and reliability fixes incorporated
- Requires careful testing of edge cases (crash recovery, disk space, transactions)
- Consider OS-specific installation testing (macOS, Linux, Windows)
- Monitor download performance and adjust concurrency limit if needed
- Plan for future enhancement: custom segment downloads (user-specified time ranges)

---

**Story Status:** TODO
**Last Updated:** 2026-01-16 (Fix #9: HLS Format Download Issue)
**Created By:** SM Agent (Story Regeneration with Architect Feedback)
