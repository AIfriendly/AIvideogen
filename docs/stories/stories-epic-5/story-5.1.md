# Story 5.1: Video Processing Infrastructure Setup

**Epic:** Epic 5 - Video Assembly & Output
**Status:** Done
**Priority:** High
**Estimated Effort:** Medium (4-6 hours)
**Implements:** FR-7.01, FR-7.05

---

## Story Description

Set up FFmpeg-based video processing infrastructure for video assembly operations. This story creates the foundational types, utilities, database schema, and API endpoints that all other Epic 5 stories will build upon. As the first story in Epic 5, it establishes the shared component registry and patterns for parallel-safe implementation.

---

## User Story

**As a** system administrator
**I want** the video processing infrastructure properly configured
**So that** subsequent stories can perform video assembly operations reliably

---

## Story Contract (Parallel Execution)

> **CRITICAL:** This story is designed for parallel execution. Follow this contract exactly to prevent conflicts with other Epic 5 stories.

### File Ownership

**Files I Create (exclusive_create):**
- `src/types/assembly.ts` - Shared TypeScript types for assembly
- `lib/video/ffmpeg.ts` - FFmpegClient class with base methods (probe, getDuration)
- `lib/video/constants.ts` - Assembly configuration constants
- `lib/video/assembler.ts` - VideoAssembler class skeleton with job management
- `lib/db/migrations/008_assembly_jobs.sql` - Database migration for assembly_jobs table
- `app/api/projects/[id]/assemble/route.ts` - POST endpoint to initiate assembly
- `app/api/projects/[id]/assembly-status/route.ts` - GET endpoint for job status polling
- `tests/unit/video/ffmpeg.test.ts` - FFmpegClient unit tests
- `tests/unit/video/assembler.test.ts` - VideoAssembler unit tests

**Files I Modify (exclusive_modify):**
- `lib/db/queries.ts` - Add assembly job query functions
- `lib/db/schema.sql` - Add assembly_jobs table definition

**Files I Import From (Read-Only):**
- `lib/db/client.ts` - Import `db`
- `src/types/database.ts` - Import `Project`, `Scene`

### Naming Conventions

- File prefix: `assembly-`
- Component prefix: `Assembly`
- CSS class prefix: `asm-`
- Test prefix: `assembly.`

### Database Ownership

**Tables I create:**
- `assembly_jobs` with columns: id, project_id, status, progress, current_stage, current_scene, total_scenes, error_message, started_at, completed_at, created_at

**Columns I add to projects:**
- `video_path` (TEXT)
- `thumbnail_path` (TEXT)
- `total_duration` (REAL)
- `video_file_size` (INTEGER)

### API Contracts I Expose

**POST /api/projects/[id]/assemble**
- Request: `{ scenes: AssemblyScene[] }`
- Response: `{ job_id: string, status: string }`
- Error codes: INVALID_REQUEST, PROJECT_NOT_FOUND, SCENE_NOT_FOUND, FILE_NOT_FOUND, JOB_ALREADY_EXISTS

**GET /api/projects/[id]/assembly-status**
- Request: Path param only
- Response: `AssemblyJob`
- Error codes: PROJECT_NOT_FOUND, JOB_NOT_FOUND

### Interface Implementations

**FFmpegClient base methods (lib/video/ffmpeg.ts):**
- `getVideoDuration(videoPath: string): Promise<number>`
- `getAudioDuration(audioPath: string): Promise<number>`
- `probe(filePath: string): Promise<FFProbeResult>`

**VideoAssembler job management (lib/video/assembler.ts):**
- `createJob(projectId: string, totalScenes: number): Promise<string>`
- `updateJobProgress(jobId: string, progress: number, stage: string, currentScene?: number): Promise<void>`
- `getJobStatus(jobId: string): Promise<AssemblyJob>`
- `failJob(jobId: string, errorMessage: string): Promise<void>`
- `completeJob(jobId: string): Promise<void>`

---

## Acceptance Criteria

### AC1: FFmpeg Installation Verification
**Given** the video processing infrastructure is being set up
**When** the system initializes
**Then** FFmpeg must be installed and accessible via system PATH
**And** error messages must provide actionable guidance (e.g., "FFmpeg not found - install FFmpeg and add to PATH")

### AC2: Assembly Job Creation
**Given** a valid project with all scenes having selected clips
**When** POST /api/projects/[id]/assemble is called with valid scene data
**Then** an assembly job must be created in the database with status 'pending'
**And** the response must include the job_id and initial status

### AC3: Job Status Updates
**Given** an assembly job exists
**When** the job progresses through stages
**Then** job status must update correctly: pending → processing → complete (or error)
**And** progress percentage (0-100) must update accurately

### AC4: Scene Validation
**Given** a request to POST /api/projects/[id]/assemble
**When** any scene is missing a selected_clip_id
**Then** the endpoint must return SCENE_NOT_FOUND error
**And** the assembly must not start

### AC5: Duplicate Job Prevention
**Given** an assembly job already exists for a project with status 'pending' or 'processing'
**When** POST /api/projects/[id]/assemble is called
**Then** the endpoint must return JOB_ALREADY_EXISTS error
**And** the existing job must not be affected

### AC6: Basic FFmpeg Operations
**Given** a valid video or audio file path
**When** FFmpegClient.probe() or getDuration() is called
**Then** the operation must complete successfully
**And** return accurate file metadata

### AC7: Temporary File Management
**Given** assembly operations create temporary files
**When** the assembly completes (success or error)
**Then** temporary files must be cleaned up
**And** disk space must be reclaimed

---

## Tasks

### Task 1: Create Shared Type Definitions
**File:** `src/types/assembly.ts`

1.1. Define AssemblyJob interface with all status fields
1.2. Define AssemblyScene interface for input data
1.3. Define AssemblyRequest and AssemblyResult interfaces
1.4. Define ThumbnailOptions interface
1.5. Define FFmpegProgress interface
1.6. Define AssemblyError and AssemblyErrorCode types
1.7. Export all types for use by other stories

### Task 2: Create Assembly Constants
**File:** `lib/video/constants.ts`

2.1. Define VIDEO_ASSEMBLY_CONFIG with codec, bitrate, resolution settings
2.2. Define ASSEMBLY_JOB_STATUS constants
2.3. Define path constants for TEMP_DIR and OUTPUT_DIR
2.4. Define timeout and stage constants
2.5. Export all constants

### Task 3: Create FFmpegClient Base Class
**File:** `lib/video/ffmpeg.ts`

3.1. Create FFmpegClient class
3.2. Implement constructor with FFmpeg path verification
3.3. Implement getVideoDuration() method using ffprobe
3.4. Implement getAudioDuration() method using ffprobe
3.5. Implement probe() method for general file metadata
3.6. Add error handling for FFmpeg not found
3.7. Add error handling for invalid file paths
3.8. Export FFmpegClient class

### Task 4: Create Database Migration
**File:** `lib/db/migrations/008_assembly_jobs.sql`

4.1. Create assembly_jobs table with all required columns
4.2. Add foreign key constraint to projects table
4.3. Create indexes on project_id and status
4.4. Add columns to projects table: video_path, thumbnail_path, total_duration, video_file_size

### Task 5: Update Database Queries
**File:** `lib/db/queries.ts` (modify)

5.1. Add createAssemblyJob() function
5.2. Add getAssemblyJob() function
5.3. Add getAssemblyJobByProjectId() function
5.4. Add updateAssemblyJobProgress() function
5.5. Add failAssemblyJob() function
5.6. Add completeAssemblyJob() function
5.7. Add updateProjectVideoPath() function

### Task 6: Create VideoAssembler Class
**File:** `lib/video/assembler.ts`

6.1. Create VideoAssembler class with FFmpegClient dependency
6.2. Implement createJob() method with validation
6.3. Implement updateJobProgress() method
6.4. Implement getJobStatus() method
6.5. Implement failJob() method
6.6. Implement completeJob() method
6.7. Add temporary directory management
6.8. Export VideoAssembler class

### Task 7: Create Assembly API Endpoint
**File:** `app/api/projects/[id]/assemble/route.ts`

7.1. Create POST handler for assembly initiation
7.2. Validate project exists
7.3. Validate all scenes have selected clips
7.4. Check for existing pending/processing jobs
7.5. Create new assembly job
7.6. Return job_id and status
7.7. Implement error handling with AssemblyError format

### Task 8: Create Assembly Status Endpoint
**File:** `app/api/projects/[id]/assembly-status/route.ts`

8.1. Create GET handler for status polling
8.2. Validate project exists
8.3. Retrieve assembly job for project
8.4. Return AssemblyJob data
8.5. Handle JOB_NOT_FOUND error

### Task 9: Write Unit Tests
**Files:** `tests/unit/video/ffmpeg.test.ts`, `tests/unit/video/assembler.test.ts`

9.1. Test FFmpegClient initialization and path verification
9.2. Test getVideoDuration with valid/invalid files
9.3. Test getAudioDuration with valid/invalid files
9.4. Test probe with various file types
9.5. Test VideoAssembler job lifecycle
9.6. Test job state transitions
9.7. Mock FFmpeg commands for isolation

---

## Technical Notes

### FFmpeg Installation
- FFmpeg must be installed on the system and accessible via PATH
- Use `ffprobe` (included with FFmpeg) for file probing
- Target FFmpeg 7.x for consistent behavior

### Database Schema
```sql
CREATE TABLE assembly_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  current_stage TEXT,
  current_scene INTEGER,
  total_scenes INTEGER,
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_assembly_jobs_project ON assembly_jobs(project_id);
CREATE INDEX idx_assembly_jobs_status ON assembly_jobs(status);

ALTER TABLE projects ADD COLUMN video_path TEXT;
ALTER TABLE projects ADD COLUMN thumbnail_path TEXT;
ALTER TABLE projects ADD COLUMN total_duration REAL;
ALTER TABLE projects ADD COLUMN video_file_size INTEGER;
```

### Assembly Job State Machine
```
PENDING → PROCESSING → COMPLETE
           ↓
         ERROR
```

### Error Code Reference
- `INVALID_REQUEST`: Missing or invalid request parameters
- `PROJECT_NOT_FOUND`: Project ID doesn't exist
- `SCENE_NOT_FOUND`: Scene or clip not found
- `FILE_NOT_FOUND`: Video/audio file missing
- `FFMPEG_ERROR`: FFmpeg command failed
- `FFMPEG_NOT_INSTALLED`: FFmpeg binary not found
- `JOB_NOT_FOUND`: Assembly job not found
- `JOB_ALREADY_EXISTS`: Duplicate assembly job

### Temporary File Structure
```
.cache/assembly/{jobId}/
├── scene-1-trimmed.mp4
├── scene-2-trimmed.mp4
├── concat-list.txt
└── ...
```

---

## Dev Notes (Contract Enforcement)

> **CRITICAL:** Follow these constraints during implementation

### File Operations
- **ONLY** create/modify files listed in the Story Contract
- Before creating any file, verify it's in `exclusive_create`
- Before modifying any file, verify it's in `exclusive_modify`
- **NEVER** touch files owned by other stories

### Naming Conventions
- Use `assembly-` prefix for new files
- Use `Assembly` prefix for components/classes
- Use `assembly.` prefix for test files

### Import Restrictions
- Only import from files listed in `read_only_dependencies`
- Import `db` from `lib/db/client.ts`
- Import `Project`, `Scene` from `src/types/database.ts`

### Database Operations
- Only create the `assembly_jobs` table
- Only add the specified columns to `projects`
- Do not modify other tables

### Merge Order
This story is **first in the merge order** for Epic 5. It creates the shared infrastructure that Stories 5.2-5.5 build upon. Merge this story before any other Epic 5 stories.

---

## Dependencies

### Upstream Dependencies
- Epic 4 (provides user clip selections via scenes.selected_clip_id)
- Epic 2 (provides voiceover audio files)
- Epic 3 (provides downloaded video segments)

### Downstream Dependencies
- Story 5.2 (Trimming) - Uses FFmpegClient and VideoAssembler
- Story 5.3 (Concatenation) - Uses FFmpegClient and VideoAssembler
- Story 5.4 (Thumbnail) - Uses FFmpegClient and VideoAssembler
- Story 5.5 (Export UI) - Uses assembly-status endpoint

---

## Definition of Done

- [x] All acceptance criteria pass
- [x] All tasks completed
- [x] Unit tests written and passing
- [x] FFmpeg installation verified
- [x] Database migration runs successfully
- [x] API endpoints respond correctly
- [x] Error handling covers all cases
- [x] Code follows project conventions
- [x] Contract compliance verified (no forbidden files touched)
- [x] Build passes with no errors
- [x] Security scan passes (no secrets)

---

## Dev Agent Record

### Context Reference
- `docs/stories/5-1-video-processing-infrastructure.context.xml`

---

## References

- PRD Feature 1.7 (Automated Video Assembly): FR-7.01, FR-7.05
- PRD Success Criteria: SC-8 (5-minute assembly for 3-minute video)
- Epic 5 Parallel Spec: `docs/sprint-artifacts/parallel-spec-epic-5.md`
- Story Contracts: `docs/sprint-artifacts/story-contracts-epic-5.yaml`
