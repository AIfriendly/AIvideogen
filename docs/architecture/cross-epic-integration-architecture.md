# Cross-Epic Integration Architecture

### Overview

The cross-epic integration architecture establishes clear boundaries and contracts between modular epics while enabling seamless data flow for complex multi-stage workflows. The primary integration point is between Epic 4 (Visual Curation Interface) and Epic 5 (Video Assembly Pipeline).

### Epic 4 to Epic 5 Integration

#### Integration Point: Assembly Trigger

**Story 4.5 (Assembly Trigger) → Epic 5 (Video Assembly Pipeline)**

The `/api/projects/[id]/assemble` endpoint serves as the orchestration point that bridges user-facing curation (Epic 4) with backend video processing (Epic 5).

```typescript
// Integration Flow
Epic 4 (Visual Curation)
    → POST /api/projects/[id]/assemble
    → Epic 5 (Video Assembly Pipeline)
        → Story 5.1 (VideoAssembler - Job Management)
        → Story 5.2 (Trimmer - Scene Preparation)
        → Story 5.3 (Concatenator - Final Assembly)
```

#### Data Contract: AssemblyScene Interface

The AssemblyScene interface defines the data contract between Epic 4 and Epic 5:

```typescript
interface AssemblyScene {
  // Core identifiers
  sceneId: string;
  sceneNumber: number;

  // Content data
  scriptText: string;
  audioFilePath: string;

  // Video selection from Epic 4
  selectedClipId: string;
  videoId: string;
  clipDuration: number;

  // Path fields populated during processing
  defaultSegmentPath?: string;  // Downloaded YouTube video
  video_path: string;           // Alias for compatibility

  // Legacy aliases for backward compatibility
  scene_number: number;         // Alias for sceneNumber
  script_text?: string;         // Alias for scriptText
  audio_path: string;           // Alias for audioFilePath
  duration: number;             // Alias for clipDuration
}
```

### Async Job Processing Pattern

The integration implements an asynchronous job processing pattern with progress tracking:

#### Job Lifecycle

```typescript
type AssemblyJobStatus = 'pending' | 'processing' | 'complete' | 'error';

type AssemblyStage =
  | 'initializing'
  | 'downloading'    // Added for YouTube downloads
  | 'trimming'
  | 'concatenating'
  | 'audio_overlay'
  | 'thumbnail'
  | 'finalizing';
```

#### Progress Tracking

```typescript
// Job progress update flow
assembleVideo(projectId) {
  const jobId = videoAssembler.createJob(projectId, sceneCount);

  // Async execution with progress updates
  (async () => {
    videoAssembler.updateJobProgress(jobId, 5, 'downloading');
    // Download YouTube videos...

    videoAssembler.updateJobProgress(jobId, 20, 'trimming');
    // Trim scenes to audio duration...

    videoAssembler.updateJobProgress(jobId, 50, 'concatenating');
    // Concatenate scenes...

    videoAssembler.updateJobProgress(jobId, 80, 'audio_overlay');
    // Overlay audio tracks...

    videoAssembler.completeJob(jobId);
  })();

  return { jobId, status: 'processing' };
}
```

### YouTube Download Integration

A critical integration point added during implementation is the YouTube download stage, which wasn't originally in Epic 5:

```typescript
// Download stage integration
const downloadPath = path.join('.cache', 'videos', projectId, `scene-${sceneNumber}-source.mp4`);

const downloadResult = await downloadWithRetry({
  videoId: scene.videoId,
  segmentDuration: scene.clipDuration + 5,  // Buffer for trimming
  outputPath: downloadPath,
  maxHeight: 720
});

// Path validation for security
function sanitizeOutputPath(outputPath: string, projectId: string): string {
  const basePath = path.resolve('.cache', 'videos', projectId);
  const resolvedPath = path.resolve(outputPath);

  if (!resolvedPath.startsWith(basePath)) {
    throw new Error('Path traversal detected');
  }

  return resolvedPath;
}
```

### Database Migration Strategy

Cross-epic integrations may require database schema updates:

```sql
-- Migration 009: Add downloading stage
ALTER TABLE assembly_jobs
  MODIFY COLUMN current_stage
  CHECK(current_stage IN (
    'initializing', 'downloading', 'trimming',
    'concatenating', 'audio_overlay', 'thumbnail', 'finalizing'
  ));
```

### Error Handling & Recovery

The integration implements a cascading error handling pattern:

```typescript
// Error classification
interface DownloadError {
  error: string;
  retryable: boolean;  // Network errors vs permanent failures
}

// Retry strategy with exponential backoff
const retryOptions = {
  maxRetries: 3,
  baseDelay: 1000,  // 1s, 2s, 4s
  maxDelay: 8000
};

// Error propagation
try {
  const result = await downloadWithRetry(options, retryOptions);
  if (!result.success) {
    await videoAssembler.failJob(jobId, result.error);
  }
} catch (error) {
  await videoAssembler.failJob(jobId, 'Unknown error');
}
```

### Integration Testing Requirements

Cross-epic integration requires specialized testing strategies:

#### Integration Test Boundaries

```typescript
describe('Epic 4-5 Integration', () => {
  it('should complete full pipeline from clip selection to video output', async () => {
    // 1. Setup: Create project with scenes and selections
    const projectId = await createProject();
    await generateScenes(projectId);
    await selectClips(projectId);

    // 2. Trigger assembly
    const response = await fetch(`/api/projects/${projectId}/assemble`, {
      method: 'POST'
    });
    const { jobId } = await response.json();

    // 3. Wait for completion
    await waitForJobCompletion(jobId);

    // 4. Verify output
    const outputPath = `public/videos/${projectId}/final.mp4`;
    expect(fs.existsSync(outputPath)).toBe(true);

    // 5. Verify video properties
    const metadata = await getVideoMetadata(outputPath);
    expect(metadata.duration).toBeCloseTo(expectedDuration, 1);
  });
});
```

#### Test Data Requirements

```typescript
// Integration tests require:
- YouTube video IDs that are stable and available
- Pre-generated audio files matching expected durations
- Database migrations applied before test runs
- FFmpeg and yt-dlp available in test environment
```

### Performance Considerations

#### Pipeline Optimization

- **Parallel Downloads**: Download multiple YouTube videos concurrently
- **Stream Processing**: Process videos as streams when possible
- **Temp File Management**: Clean up intermediate files after each stage
- **Progress Granularity**: Balance update frequency with database writes

#### Resource Management

```typescript
// Temp directory management
const tempDir = videoAssembler.getTempDir(jobId);
try {
  // Process videos...
} finally {
  await videoAssembler.cleanupTempDir(tempDir);
}
```

### Future Integration Points

#### Planned Integrations

1. **Epic 6 → Epic 5**: Post-processing effects integration
2. **Epic 4 → Analytics**: Clip selection telemetry
3. **Epic 5 → CDN**: Final video distribution
4. **Epic 2 → Epic 5**: Direct audio file handoff optimization

#### Integration Principles

- **Loose Coupling**: Epics communicate via well-defined APIs
- **Data Contracts**: Interfaces versioned and backward compatible
- **Async by Default**: Long-running operations use job queue pattern
- **Error Recovery**: All integrations support retry and rollback
- **Observability**: Integration points emit structured logs and metrics

---
