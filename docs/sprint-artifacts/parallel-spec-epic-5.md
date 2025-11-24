# Parallel Epic Technical Specification: Video Assembly & Output

**Date:** 2025-11-24
**Author:** master
**Epic ID:** 5
**Status:** Parallel-Ready
**Stories:** 5

---

## Overview

This parallel-ready technical specification enables safe multi-agent implementation of Epic 5: Video Assembly & Output. The epic transforms user-curated visual selections into downloadable video files with synchronized audio and auto-generated thumbnails. This spec defines precise Story Contracts, shared component interfaces, and collision prevention rules to allow 5 agents to work simultaneously without conflicts.

## Objectives and Scope

**In Scope:**
- FFmpeg-based video processing infrastructure
- Scene video trimming to match voiceover duration
- Multi-scene video concatenation with audio overlay
- Automated thumbnail generation with title overlay
- Export UI with video/thumbnail download capabilities
- Assembly job tracking and progress reporting

**Out of Scope:**
- Advanced video effects or transitions
- Background music addition
- Multi-track audio mixing
- Video re-encoding for different platforms
- Cloud storage or CDN distribution

## System Architecture Alignment

Epic 5 integrates with the established architecture:
- **Input:** Scene data from Epic 4 (selected_clip_id, voiceover audio, script text)
- **Processing:** FFmpeg for all video operations (trim, concat, overlay, extract)
- **Storage:** Local filesystem (.cache/ for temp, public/videos/ for output)
- **Database:** assembly_jobs table for progress tracking
- **Output:** MP4 video file + JPEG thumbnail

---

## Parallel Execution Analysis

### Story Dependency Analysis

```
Story 5.1 (Infrastructure) ──┬──> Story 5.2 (Trimming) ──┐
                             │                           │
                             └──────────────────────────>├──> Story 5.3 (Concat)
                                                        │
Story 5.4 (Thumbnail) ─────────────────────────────────>┘
                                                        │
Story 5.5 (Export UI) ─────────────────────────────────>┘
```

**Key Insight:** While there's logical dependency (5.1 creates infrastructure others use), with pre-defined interfaces all stories can be implemented in parallel. Each story implements its part of the contract.

### Collision Risk Assessment

| Risk | Severity | Stories Affected | Mitigation |
|------|----------|------------------|------------|
| FFmpegClient method duplication | HIGH | 5.1, 5.2, 5.3, 5.4 | Pre-define all method signatures in shared registry |
| assembly_jobs status conflicts | HIGH | 5.1, 5.2, 5.3, 5.4 | Define explicit state machine |
| File path conflicts | MEDIUM | All | Story-specific naming prefixes |
| API endpoint conflicts | MEDIUM | 5.1, 5.4, 5.5 | Pre-define all endpoints |
| Database column conflicts | LOW | 5.1, 5.5 | Pre-define all schema changes |

---

## Shared Component Registry

### Shared Types & Interfaces

```typescript
// src/types/assembly.ts - SHARED (All stories import, Story 5.1 creates)

export interface AssemblyJob {
  id: string;
  project_id: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100
  current_stage: 'trimming' | 'concatenating' | 'audio_overlay' | 'thumbnail' | 'finalizing';
  current_scene: number | null;
  total_scenes: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AssemblyScene {
  scene_number: number;
  video_path: string;        // Path to selected clip segment
  audio_path: string;        // Path to voiceover MP3
  duration: number;          // Voiceover duration in seconds
  script_text: string;       // For reference
}

export interface AssemblyRequest {
  project_id: string;
  scenes: AssemblyScene[];
}

export interface AssemblyResult {
  job_id: string;
  video_path: string;
  thumbnail_path: string;
  total_duration: number;
  file_size: number;
}

export interface ThumbnailOptions {
  title: string;
  video_path: string;
  output_path: string;
  width?: number;   // Default 1920
  height?: number;  // Default 1080
}

export interface FFmpegProgress {
  percent: number;
  frame: number;
  fps: number;
  time: string;
}

// Standard error response format for all assembly APIs
export interface AssemblyError {
  error: string;
  code: AssemblyErrorCode;
  details?: string;
  timestamp: string;
}

export type AssemblyErrorCode =
  | 'INVALID_REQUEST'      // Missing or invalid request parameters
  | 'PROJECT_NOT_FOUND'    // Project ID doesn't exist
  | 'SCENE_NOT_FOUND'      // Scene or clip not found
  | 'FILE_NOT_FOUND'       // Video/audio file missing
  | 'FFMPEG_ERROR'         // FFmpeg command failed
  | 'FFMPEG_NOT_INSTALLED' // FFmpeg binary not found
  | 'DISK_SPACE_ERROR'     // Insufficient disk space
  | 'TIMEOUT_ERROR'        // Operation exceeded timeout
  | 'JOB_NOT_FOUND'        // Assembly job not found
  | 'JOB_ALREADY_EXISTS'   // Duplicate assembly job
  | 'INTERNAL_ERROR';      // Unexpected server error
```

**Location:** `src/types/assembly.ts`
**Created by:** Story 5.1
**Used by:** All stories

### Shared Utilities

```typescript
// lib/video/ffmpeg.ts - SHARED (Story 5.1 creates base, others add methods)

export class FFmpegClient {
  // Story 5.1 creates these base methods:
  async getVideoDuration(videoPath: string): Promise<number>;
  async getAudioDuration(audioPath: string): Promise<number>;
  async probe(filePath: string): Promise<FFProbeResult>;

  // Story 5.2 creates these trimming methods:
  async trimToAudioDuration(
    videoPath: string,
    audioPath: string,
    outputPath: string
  ): Promise<void>;
  async trimVideo(
    videoPath: string,
    duration: number,
    outputPath: string
  ): Promise<void>;

  // Story 5.3 creates these concatenation/overlay methods:
  async concatenateVideos(
    inputPaths: string[],
    outputPath: string
  ): Promise<void>;
  async overlayAudio(
    videoPath: string,
    audioPath: string,
    outputPath: string
  ): Promise<void>;
  async mergeAudioTracks(
    audioPaths: string[],
    outputPath: string
  ): Promise<void>;

  // Story 5.4 creates these thumbnail methods:
  async extractFrame(
    videoPath: string,
    timestamp: number,
    outputPath: string
  ): Promise<void>;
  async extractMultipleFrames(
    videoPath: string,
    timestamps: number[],
    outputDir: string
  ): Promise<string[]>;
}
```

**Location:** `lib/video/ffmpeg.ts`
**Pattern:** Each story adds its methods to the shared class

### Shared Constants

```typescript
// lib/video/constants.ts - SHARED (Story 5.1 creates)

export const VIDEO_ASSEMBLY_CONFIG = {
  // Output formats
  VIDEO_CODEC: 'libx264',
  AUDIO_CODEC: 'aac',
  CONTAINER: 'mp4',

  // Quality settings
  VIDEO_BITRATE: '2M',
  AUDIO_BITRATE: '128k',
  CRF: 23, // Constant Rate Factor (lower = better quality)

  // Resolution
  MAX_WIDTH: 1280,
  MAX_HEIGHT: 720,

  // Thumbnail settings
  THUMBNAIL_WIDTH: 1920,
  THUMBNAIL_HEIGHT: 1080,
  THUMBNAIL_FORMAT: 'jpg',
  THUMBNAIL_QUALITY: 85,

  // Paths
  TEMP_DIR: '.cache/assembly',
  OUTPUT_DIR: 'public/videos',

  // Timeouts
  FFMPEG_TIMEOUT: 600000, // 10 minutes

  // Progress stages
  STAGES: ['trimming', 'concatenating', 'audio_overlay', 'thumbnail', 'finalizing'] as const,
};

export const ASSEMBLY_JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const;
```

**Location:** `lib/video/constants.ts`
**Created by:** Story 5.1
**Used by:** All stories

### Shared Database Entities

```sql
-- Migration v8: Assembly Infrastructure
-- Created by Story 5.1, used by all stories

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

-- Projects table extensions (Story 5.1 adds)
ALTER TABLE projects ADD COLUMN video_path TEXT;
ALTER TABLE projects ADD COLUMN thumbnail_path TEXT;
ALTER TABLE projects ADD COLUMN total_duration REAL;
ALTER TABLE projects ADD COLUMN video_file_size INTEGER;
```

**Owner:** Story 5.1 creates the table and columns
**Usage:** Stories 5.2-5.4 update job progress, Story 5.5 reads final results

---

## Story Contract Matrix

> **CRITICAL FOR PARALLEL EXECUTION:** Each agent implementing a story MUST follow these contracts exactly to prevent conflicts.

### Story 5.1: Video Processing Infrastructure Setup

```yaml
story_id: "5.1"
story_title: "Video Processing Infrastructure Setup"

file_ownership:
  exclusive_create:
    - path: "src/types/assembly.ts"
      purpose: "Shared TypeScript types for assembly"
    - path: "lib/video/ffmpeg.ts"
      purpose: "FFmpegClient class with base methods (probe, getDuration)"
    - path: "lib/video/constants.ts"
      purpose: "Assembly configuration constants"
    - path: "lib/video/assembler.ts"
      purpose: "VideoAssembler class skeleton with job management"
    - path: "lib/db/migrations/008_assembly_jobs.sql"
      purpose: "Database migration for assembly_jobs table"
    - path: "app/api/projects/[id]/assemble/route.ts"
      purpose: "POST endpoint to initiate assembly"
    - path: "app/api/projects/[id]/assembly-status/route.ts"
      purpose: "GET endpoint for job status polling"
    - path: "tests/unit/video/ffmpeg.test.ts"
      purpose: "FFmpegClient unit tests"
    - path: "tests/unit/video/assembler.test.ts"
      purpose: "VideoAssembler unit tests"

  exclusive_modify:
    - path: "lib/db/queries.ts"
      sections: ["Add assembly job query functions"]
    - path: "lib/db/schema.sql"
      sections: ["Add assembly_jobs table definition"]

read_only_dependencies:
  - path: "lib/db/client.ts"
    imports: ["db"]
  - path: "src/types/database.ts"
    imports: ["Project", "Scene"]

interface_implementations:
  - interface: "FFmpegClient base methods"
    location: "lib/video/ffmpeg.ts"
    methods: ["getVideoDuration", "getAudioDuration", "probe"]
  - interface: "VideoAssembler job management"
    location: "lib/video/assembler.ts"
    methods: ["createJob", "updateJobProgress", "getJobStatus", "failJob", "completeJob"]

interface_consumptions: []

database_ownership:
  tables_created:
    - table: "assembly_jobs"
      columns: ["id", "project_id", "status", "progress", "current_stage", "current_scene", "total_scenes", "error_message", "started_at", "completed_at", "created_at"]
  columns_added:
    - table: "projects"
      columns: ["video_path", "thumbnail_path", "total_duration", "video_file_size"]
  read_only_tables:
    - "projects"
    - "scenes"

api_contracts:
  exposes:
    - endpoint: "POST /api/projects/[id]/assemble"
      request_schema: "{ scenes: AssemblyScene[] }"
      response_schema: "{ job_id: string, status: string }"
      error_schema: "AssemblyError"
      error_codes: ["INVALID_REQUEST", "PROJECT_NOT_FOUND", "SCENE_NOT_FOUND", "FILE_NOT_FOUND", "JOB_ALREADY_EXISTS"]
    - endpoint: "GET /api/projects/[id]/assembly-status"
      request_schema: "N/A (path param only)"
      response_schema: "AssemblyJob"
      error_schema: "AssemblyError"
      error_codes: ["PROJECT_NOT_FOUND", "JOB_NOT_FOUND"]
  consumes: []

naming_conventions:
  file_prefix: "assembly-"
  component_prefix: "Assembly"
  css_class_prefix: "asm-"
  test_prefix: "assembly."
```

---

### Story 5.2: Scene Video Trimming & Preparation

```yaml
story_id: "5.2"
story_title: "Scene Video Trimming & Preparation"

file_ownership:
  exclusive_create:
    - path: "lib/video/trimmer.ts"
      purpose: "Video trimming logic and edge case handling"
    - path: "tests/unit/video/trimmer.test.ts"
      purpose: "Trimmer unit tests"

  exclusive_modify:
    - path: "lib/video/ffmpeg.ts"
      sections: ["Add trimToAudioDuration method", "Add trimVideo method"]
    - path: "lib/video/assembler.ts"
      sections: ["Add trimAllScenes method to VideoAssembler"]

read_only_dependencies:
  - path: "lib/video/constants.ts"
    imports: ["VIDEO_ASSEMBLY_CONFIG"]
  - path: "src/types/assembly.ts"
    imports: ["AssemblyScene", "AssemblyJob"]
  - path: "lib/db/client.ts"
    imports: ["db"]

interface_implementations:
  - interface: "FFmpegClient trimming methods"
    location: "lib/video/ffmpeg.ts"
    methods: ["trimToAudioDuration", "trimVideo"]
  - interface: "VideoAssembler trimming"
    location: "lib/video/assembler.ts"
    methods: ["trimAllScenes", "handleShortVideo", "handleLongVideo"]

interface_consumptions:
  - interface: "FFmpegClient.getVideoDuration"
    provider_story: "5.1"
  - interface: "FFmpegClient.getAudioDuration"
    provider_story: "5.1"
  - interface: "VideoAssembler.updateJobProgress"
    provider_story: "5.1"

database_ownership:
  tables_created: []
  columns_added: []
  read_only_tables:
    - "assembly_jobs"
    - "scenes"

api_contracts:
  exposes: []
  consumes:
    - endpoint: "Internal: VideoAssembler.trimAllScenes()"
      provider_story: "5.1"

naming_conventions:
  file_prefix: "trim-"
  component_prefix: "Trim"
  css_class_prefix: "trm-"
  test_prefix: "trim."
```

---

### Story 5.3: Video Concatenation & Audio Overlay

```yaml
story_id: "5.3"
story_title: "Video Concatenation & Audio Overlay"

file_ownership:
  exclusive_create:
    - path: "lib/video/concatenator.ts"
      purpose: "Video concatenation and audio merge logic"
    - path: "tests/unit/video/concatenator.test.ts"
      purpose: "Concatenator unit tests"

  exclusive_modify:
    - path: "lib/video/ffmpeg.ts"
      sections: ["Add concatenateVideos method", "Add overlayAudio method", "Add mergeAudioTracks method"]
    - path: "lib/video/assembler.ts"
      sections: ["Add concatenateScenes method", "Add overlayVoiceovers method", "Add renderFinalVideo method"]

read_only_dependencies:
  - path: "lib/video/constants.ts"
    imports: ["VIDEO_ASSEMBLY_CONFIG"]
  - path: "src/types/assembly.ts"
    imports: ["AssemblyScene", "AssemblyJob", "AssemblyResult"]
  - path: "lib/db/client.ts"
    imports: ["db"]

interface_implementations:
  - interface: "FFmpegClient concatenation methods"
    location: "lib/video/ffmpeg.ts"
    methods: ["concatenateVideos", "overlayAudio", "mergeAudioTracks"]
  - interface: "VideoAssembler rendering"
    location: "lib/video/assembler.ts"
    methods: ["concatenateScenes", "overlayVoiceovers", "renderFinalVideo"]

interface_consumptions:
  - interface: "FFmpegClient.probe"
    provider_story: "5.1"
  - interface: "VideoAssembler.updateJobProgress"
    provider_story: "5.1"
  - interface: "VideoAssembler.trimAllScenes"
    provider_story: "5.2"

database_ownership:
  tables_created: []
  columns_added: []
  read_only_tables:
    - "assembly_jobs"
    - "scenes"

api_contracts:
  exposes: []
  consumes:
    - endpoint: "Internal: VideoAssembler.concatenateScenes()"
      provider_story: "5.1"

naming_conventions:
  file_prefix: "concat-"
  component_prefix: "Concat"
  css_class_prefix: "cnc-"
  test_prefix: "concat."
```

---

### Story 5.4: Automated Thumbnail Generation

```yaml
story_id: "5.4"
story_title: "Automated Thumbnail Generation"

file_ownership:
  exclusive_create:
    - path: "lib/video/thumbnail.ts"
      purpose: "ThumbnailGenerator class with frame selection and text overlay"
    - path: "app/api/projects/[id]/generate-thumbnail/route.ts"
      purpose: "POST endpoint to trigger thumbnail generation"
    - path: "tests/unit/video/thumbnail.test.ts"
      purpose: "Thumbnail generator unit tests"

  exclusive_modify:
    - path: "lib/video/ffmpeg.ts"
      sections: ["Add extractFrame method", "Add extractMultipleFrames method"]
    - path: "lib/video/assembler.ts"
      sections: ["Add generateThumbnail method"]

read_only_dependencies:
  - path: "lib/video/constants.ts"
    imports: ["VIDEO_ASSEMBLY_CONFIG"]
  - path: "src/types/assembly.ts"
    imports: ["ThumbnailOptions"]
  - path: "lib/db/client.ts"
    imports: ["db"]

interface_implementations:
  - interface: "FFmpegClient frame extraction"
    location: "lib/video/ffmpeg.ts"
    methods: ["extractFrame", "extractMultipleFrames"]
  - interface: "ThumbnailGenerator"
    location: "lib/video/thumbnail.ts"
    methods: ["generateThumbnail", "selectBestFrame", "addTextOverlay", "scoreFrame"]

interface_consumptions:
  - interface: "FFmpegClient.getVideoDuration"
    provider_story: "5.1"
  - interface: "VideoAssembler.updateJobProgress"
    provider_story: "5.1"

database_ownership:
  tables_created: []
  columns_added: []
  read_only_tables:
    - "assembly_jobs"
    - "projects"

api_contracts:
  exposes:
    - endpoint: "POST /api/projects/[id]/generate-thumbnail"
      request_schema: "{ video_path: string, title: string }"
      response_schema: "{ thumbnail_path: string }"
      error_schema: "AssemblyError"
      error_codes: ["INVALID_REQUEST", "PROJECT_NOT_FOUND", "FILE_NOT_FOUND", "FFMPEG_ERROR", "DISK_SPACE_ERROR"]
  consumes: []

naming_conventions:
  file_prefix: "thumb-"
  component_prefix: "Thumbnail"
  css_class_prefix: "tmb-"
  test_prefix: "thumbnail."
```

---

### Story 5.5: Export UI & Download Workflow

```yaml
story_id: "5.5"
story_title: "Export UI & Download Workflow"

file_ownership:
  exclusive_create:
    - path: "app/projects/[id]/export/page.tsx"
      purpose: "Export page route component"
    - path: "app/projects/[id]/export/export-client.tsx"
      purpose: "Export page client component"
    - path: "components/assembly/AssemblyProgress.tsx"
      purpose: "Assembly progress indicator component"
    - path: "components/assembly/VideoDownload.tsx"
      purpose: "Video download button component"
    - path: "components/assembly/ThumbnailPreview.tsx"
      purpose: "Thumbnail preview display"
    - path: "components/assembly/ExportSummary.tsx"
      purpose: "Project completion summary"
    - path: "app/api/projects/[id]/export/route.ts"
      purpose: "GET endpoint for export metadata"
    - path: "stores/export-store.ts"
      purpose: "Zustand store for export page state"
    - path: "tests/unit/components/export.test.tsx"
      purpose: "Export component tests"

  exclusive_modify:
    - path: "lib/db/queries.ts"
      sections: ["Add getExportData query function"]

read_only_dependencies:
  - path: "lib/video/constants.ts"
    imports: ["VIDEO_ASSEMBLY_CONFIG"]
  - path: "src/types/assembly.ts"
    imports: ["AssemblyJob", "AssemblyResult"]
  - path: "lib/db/client.ts"
    imports: ["db"]
  - path: "components/ui/button.tsx"
    imports: ["Button"]
  - path: "components/ui/card.tsx"
    imports: ["Card"]

interface_implementations:
  - interface: "ExportStore"
    location: "stores/export-store.ts"
    methods: ["setJobStatus", "setVideoPath", "setThumbnailPath", "reset"]

interface_consumptions:
  - interface: "GET /api/projects/[id]/assembly-status"
    provider_story: "5.1"

database_ownership:
  tables_created: []
  columns_added: []
  read_only_tables:
    - "assembly_jobs"
    - "projects"
    - "scenes"

api_contracts:
  exposes:
    - endpoint: "GET /api/projects/[id]/export"
      request_schema: "N/A (path param only)"
      response_schema: "{ video_path, thumbnail_path, duration, file_size, scene_count, title }"
      error_schema: "AssemblyError"
      error_codes: ["PROJECT_NOT_FOUND", "FILE_NOT_FOUND", "JOB_NOT_FOUND"]
  consumes:
    - endpoint: "GET /api/projects/[id]/assembly-status"
      provider_story: "5.1"

naming_conventions:
  file_prefix: "export-"
  component_prefix: "Export"
  css_class_prefix: "exp-"
  test_prefix: "export."
```

---

## Integration Contracts

### API Contracts Between Stories

**Assembly Initiation (5.1 → Internal):**
```typescript
// POST /api/projects/[id]/assemble
// Request
{
  scenes: [
    {
      scene_number: 1,
      video_path: ".cache/videos/proj123/scene-1-default.mp4",
      audio_path: "public/audio/scenes/proj123/scene-1.mp3",
      duration: 8.5,
      script_text: "Welcome to Mars..."
    }
    // ... more scenes
  ]
}

// Response
{
  job_id: "asm_abc123",
  status: "processing"
}
```

**Assembly Status (5.1 → 5.5):**
```typescript
// GET /api/projects/[id]/assembly-status
// Response
{
  id: "asm_abc123",
  project_id: "proj123",
  status: "processing",
  progress: 45,
  current_stage: "concatenating",
  current_scene: 3,
  total_scenes: 5,
  error_message: null,
  started_at: "2025-11-24T10:00:00Z",
  completed_at: null,
  created_at: "2025-11-24T10:00:00Z"
}
```

**Export Data (5.5):**
```typescript
// GET /api/projects/[id]/export
// Response
{
  video_path: "public/videos/proj123/final.mp4",
  thumbnail_path: "public/videos/proj123/thumbnail.jpg",
  duration: 45.5,
  file_size: 15234567,
  scene_count: 5,
  title: "Mars Colonization"
}
```

### Event Contracts

**Assembly State Machine:**
```
PENDING → PROCESSING → COMPLETE
           ↓
         ERROR

Stages within PROCESSING:
trimming → concatenating → audio_overlay → thumbnail → finalizing
```

**Progress Updates:**
- Stories 5.2-5.4 call `VideoAssembler.updateJobProgress()` with:
  - `stage`: Current processing stage
  - `progress`: Overall percentage (0-100)
  - `current_scene`: Scene being processed (if applicable)

### State Management Boundaries

**Server State (Database):**
- Story 5.1 owns `assembly_jobs` table creation and management
- Stories 5.2-5.4 update job progress only
- Story 5.5 reads job status only

**Client State (Zustand):**
- Story 5.5 owns `export-store.ts`
- No other stories manage client state for export

### Integration Test Points

After all stories merge, test these integration scenarios:

1. **End-to-end assembly:** Trigger assembly → verify all stages complete → verify output files
2. **Progress tracking:** Monitor WebSocket/polling updates through all stages
3. **Error recovery:** Simulate FFmpeg failure → verify job marked as error
4. **File integrity:** Verify video duration matches sum of scenes
5. **Thumbnail quality:** Verify thumbnail contains title text and is 1920x1080

---

## Collision Prevention Rules

### File Naming Rules

| Story | File Pattern | Example |
|-------|-------------|---------|
| 5.1 | `assembly-*.ts`, `*-infrastructure.*` | `assembly-types.ts` |
| 5.2 | `trim-*.ts`, `*-trimmer.*` | `trim-video.ts` |
| 5.3 | `concat-*.ts`, `*-concatenator.*` | `concat-scenes.ts` |
| 5.4 | `thumb-*.ts`, `*-thumbnail.*` | `thumb-generator.ts` |
| 5.5 | `export-*.tsx`, `*-export.*` | `export-page.tsx` |

### Directory Structure

```
lib/video/
├── ffmpeg.ts         # Shared - all stories add methods
├── constants.ts      # 5.1 creates
├── assembler.ts      # Shared - all stories add methods
├── trimmer.ts        # 5.2 creates
├── concatenator.ts   # 5.3 creates
└── thumbnail.ts      # 5.4 creates

app/api/projects/[id]/
├── assemble/route.ts         # 5.1 creates
├── assembly-status/route.ts  # 5.1 creates
├── generate-thumbnail/route.ts # 5.4 creates
└── export/route.ts           # 5.5 creates

components/assembly/
├── AssemblyProgress.tsx      # 5.5 creates
├── VideoDownload.tsx         # 5.5 creates
├── ThumbnailPreview.tsx      # 5.5 creates
└── ExportSummary.tsx         # 5.5 creates
```

### Database Migration Rules

- **Migration file naming:** `008_assembly_jobs.sql` (Story 5.1)
- **Only Story 5.1 creates migrations** - all schema changes pre-defined
- Other stories do NOT create migrations

### Git Branch Strategy

```bash
# Branch naming
feature/epic-5-story-1   # Infrastructure
feature/epic-5-story-2   # Trimming
feature/epic-5-story-3   # Concatenation
feature/epic-5-story-4   # Thumbnail
feature/epic-5-story-5   # Export UI

# Merge order (recommended)
1. Story 5.1 (creates shared infrastructure)
2. Story 5.2 (adds trimming to shared files)
3. Story 5.3 (adds concatenation to shared files)
4. Story 5.4 (adds thumbnail to shared files)
5. Story 5.5 (UI consumes everything)
```

### Pre-commit Validation

Each agent should verify before committing:
1. ✅ Only touched files in my `exclusive_create` or `exclusive_modify`
2. ✅ Used correct naming prefix
3. ✅ Imported only from `read_only_dependencies`
4. ✅ Implemented interfaces listed in `interface_implementations`
5. ✅ Did not create database migrations (except Story 5.1)

---

## Detailed Design

### Services and Modules

| Module | Story Owner | Purpose |
|--------|-------------|---------|
| `lib/video/ffmpeg.ts` | Shared (5.1 base) | FFmpeg command builder |
| `lib/video/assembler.ts` | Shared (5.1 base) | Assembly pipeline orchestration |
| `lib/video/trimmer.ts` | 5.2 | Video trimming edge cases |
| `lib/video/concatenator.ts` | 5.3 | Multi-video concatenation |
| `lib/video/thumbnail.ts` | 5.4 | Thumbnail generation |
| `stores/export-store.ts` | 5.5 | Export page state |

### Data Models and Contracts

**assembly_jobs (Story 5.1 owns):**
- Primary tracking table for assembly progress
- Status follows state machine
- Progress updated by Stories 5.2-5.4

**projects extensions (Story 5.1 owns):**
- `video_path`: Final video location
- `thumbnail_path`: Thumbnail location
- `total_duration`: Video length in seconds
- `video_file_size`: File size in bytes

### APIs and Interfaces

| Endpoint | Method | Story | Purpose |
|----------|--------|-------|---------|
| `/api/projects/[id]/assemble` | POST | 5.1 | Initiate assembly |
| `/api/projects/[id]/assembly-status` | GET | 5.1 | Poll job status |
| `/api/projects/[id]/generate-thumbnail` | POST | 5.4 | Generate thumbnail |
| `/api/projects/[id]/export` | GET | 5.5 | Get export metadata |

### Workflows and Sequencing

**Assembly Pipeline Flow:**
1. User clicks "Assemble Video" (Epic 4) → POST /assemble (5.1)
2. Job created with status `pending` → transitions to `processing`
3. Stage: `trimming` → Story 5.2 trims each scene
4. Stage: `concatenating` → Story 5.3 joins scenes
5. Stage: `audio_overlay` → Story 5.3 adds voiceovers
6. Stage: `thumbnail` → Story 5.4 generates thumbnail
7. Stage: `finalizing` → Story 5.1 updates project record
8. Status: `complete` → Story 5.5 displays export page

---

## Non-Functional Requirements

### Performance

- **SC-8:** Video assembly completes within 5 minutes for a 3-minute video
- FFmpeg operations should use hardware acceleration when available
- Parallel processing for scene trimming (max 3 concurrent)
- Thumbnail generation completes within 10 seconds

### Security

- FFmpeg commands must sanitize all user-provided inputs
- Output files stored in public directory with safe paths
- No executable code in video metadata

### Reliability/Availability

- Assembly jobs implement retry logic (max 3 attempts)
- Partial failures allow resume (track last completed scene)
- Temp files cleaned up on error
- Job timeout: 10 minutes maximum

### Observability

- Assembly job table provides audit trail
- FFmpeg commands logged for debugging
- Progress percentage exposed for UI polling
- Error messages captured in job record

---

## Dependencies and Integrations

**Internal Dependencies:**
- Epic 2: Voiceover audio files (MP3)
- Epic 3: Downloaded video segments (MP4)
- Epic 4: User clip selections (scene.selected_clip_id)

**External Dependencies:**
- FFmpeg 7.1.2 binary installed on system
- Sufficient disk space for temp files (~2x final video size)

**System Requirements:**
- Node.js child_process for FFmpeg execution
- Local filesystem access for read/write

---

## Acceptance Criteria (Authoritative)

**Story 5.1:**
- AC1: FFmpeg installed and accessible via system PATH
- AC2: Assembly job created when POST /assemble called
- AC3: Job status updates correctly through state machine
- AC4: Assembly endpoint validates all scenes have selected clips

**Story 5.2:**
- AC1: Given scene with 10s voiceover and 30s clip, system trims to 10s
- AC2: Trimmed clips saved to temp directory
- AC3: Video quality preserved (no re-encoding unless necessary)
- AC4: Short video edge case handled (loop or extend)

**Story 5.3:**
- AC1: Given 3 trimmed scenes (5s, 7s, 8s), final video is 20s
- AC2: Scenes appear in correct order
- AC3: Voiceover audio syncs with corresponding scene
- AC4: Final format: H.264 video, AAC audio, MP4 container

**Story 5.4:**
- AC1: Thumbnail generated after video assembly completes
- AC2: Title text displayed prominently and legibly
- AC3: Dimensions exactly 1920x1080 pixels (16:9)
- AC4: Frame selected from assembled video (not arbitrary)

**Story 5.5:**
- AC1: Export page displays after assembly completes
- AC2: Video player shows final video with controls
- AC3: Download buttons save files with sanitized names
- AC4: Loading state shows assembly progress

---

## Traceability Mapping

| Acceptance Criteria | Spec Section | Component | Test |
|---------------------|--------------|-----------|------|
| AC 5.1.1 (FFmpeg) | Infrastructure | lib/video/ffmpeg.ts | ffmpeg.test.ts |
| AC 5.1.2 (Job created) | API Contracts | POST /assemble | api/assemble.test.ts |
| AC 5.2.1 (Trim duration) | Trimmer | lib/video/trimmer.ts | trimmer.test.ts |
| AC 5.3.3 (Audio sync) | Concatenator | lib/video/concatenator.ts | concatenator.test.ts |
| AC 5.4.3 (Dimensions) | Thumbnail | lib/video/thumbnail.ts | thumbnail.test.ts |
| AC 5.5.1 (Export page) | Export UI | app/projects/[id]/export | export.test.tsx |

---

## Risks, Assumptions, Open Questions

### Risks

1. **FFmpeg version compatibility:** Different FFmpeg versions may have different command syntax
   - Mitigation: Pin to FFmpeg 7.1.2, test commands explicitly

2. **Large file handling:** Videos over 100MB may cause memory issues
   - Mitigation: Use streaming where possible, monitor memory usage

3. **Merge conflicts in shared files:** Multiple stories modifying ffmpeg.ts/assembler.ts
   - Mitigation: Clear method ownership, merge in order

### Assumptions

1. FFmpeg is installed on the development/production system
2. Sufficient disk space exists for temp files
3. Video segments from Epic 3 are in compatible format (MP4, H.264)
4. Voiceover audio from Epic 2 is in compatible format (MP3)

### Open Questions

1. Should we support hardware acceleration (NVENC, QSV)?
   - Recommendation: Post-MVP, keep simple for now

2. What's the maximum supported video duration?
   - Recommendation: 10 minutes for MVP

---

## Test Strategy Summary

### Unit Tests

- **Story 5.1:** FFmpegClient methods, VideoAssembler job management
- **Story 5.2:** Trimmer logic, edge cases (short/long videos)
- **Story 5.3:** Concatenator, audio overlay timing
- **Story 5.4:** Frame scoring, text overlay positioning
- **Story 5.5:** Export component rendering, store actions

### Integration Tests

After all stories merged:
- End-to-end assembly pipeline
- API endpoint integration
- Database state transitions
- File system operations

### Performance Tests

- Assembly time for 3-minute video < 5 minutes
- Thumbnail generation < 10 seconds

### Parallel Testing Considerations

Each story can run its unit tests independently. Integration tests require all stories merged.

---

## Parallel Execution Checklist

Before starting parallel implementation:

- [ ] All 5 story contracts reviewed
- [ ] Shared component registry committed to repo (Story 5.1 first)
- [ ] Each terminal assigned to specific story
- [ ] Story contracts YAML file accessible to all agents
- [ ] Merge order understood (1 → 2 → 3 → 4 → 5)
- [ ] Integration test points identified
