# Story 5.2: Scene Video Trimming & Preparation

**Epic:** 5 - Video Assembly & Output
**Story ID:** 5.2
**Status:** Done (Bug Fix Applied 2025-11-25)
**Priority:** High
**Created:** 2025-11-24
**Revised:** 2025-11-25 (Bug Fix)

---

## Bug Fix History

### BUG-002: Trimmer Uses Wrong Duration Field (Fixed 2025-11-25)

**Symptom:** Videos were trimmed to the wrong duration, causing audio/video duration mismatch in final output.

**Root Cause:** The `trimmer.ts` was using `scene.clipDuration` (original YouTube video duration from `visual_suggestions.duration`) instead of `scene.audioDuration` (actual voiceover duration from `scenes.duration`) for trimming.

**Impact:**
- Videos were trimmed to 45s, 76s, 69s, etc. (YouTube clip lengths) instead of ~40-50s (voiceover lengths)
- Final concatenated video was much longer than total audio
- Combined with the audio timing bug (BUG-001 in Story 5.3), resulted in silent video

**Fix Applied:**
Changed `trimmer.ts:43` from:
```typescript
const audioDuration = scene.clipDuration;  // WRONG
```
To:
```typescript
const audioDuration = scene.audioDuration;  // CORRECT
```

**Files Changed:**
- `src/lib/video/trimmer.ts` - Lines 43, 160, 161

**Prevention:** Added CRITICAL comment in code explaining to use `audioDuration` for trimming, not `clipDuration`.

**Related:** This bug was discovered alongside BUG-001 (audio timing) in Story 5.3. Both bugs used the wrong duration field.

---

## Story Contract (Parallel Execution)

> **CRITICAL:** This story is designed for parallel execution. Follow this contract strictly to prevent conflicts with other stories.

### File Ownership

**Files I Create (exclusive_create):**
- `lib/video/trimmer.ts` - Video trimming logic and edge case handling
- `tests/unit/video/trimmer.test.ts` - Trimmer unit tests

**Files I Modify (exclusive_modify):**
- `lib/video/ffmpeg.ts` - Add `trimToAudioDuration` and `trimVideo` methods
- `lib/video/assembler.ts` - Add `trimAllScenes` method to VideoAssembler

**Files I Import From (read_only):**
- `lib/video/constants.ts` - Import `VIDEO_ASSEMBLY_CONFIG`
- `src/types/assembly.ts` - Import `AssemblyScene`, `AssemblyJob`
- `lib/db/client.ts` - Import `db`

### Naming Conventions

- **File prefix:** `trim-`
- **Component prefix:** `Trim`
- **CSS class prefix:** `trm-`
- **Test prefix:** `trim.`

### Database Ownership

- **Tables I create:** None
- **Columns I add:** None
- **Tables I read:** `assembly_jobs`, `scenes`

### Interface Dependencies

**I Consume (from Story 5.1):**
- `FFmpegClient.getVideoDuration()`
- `FFmpegClient.getAudioDuration()`
- `VideoAssembler.updateJobProgress()`

**I Implement:**
- `FFmpegClient.trimToAudioDuration(videoPath, audioPath, outputPath)`
- `FFmpegClient.trimVideo(videoPath, duration, outputPath)`
- `VideoAssembler.trimAllScenes(jobId, scenes)`

### Merge Order

- **Position:** 2 of 5
- **Merges after:** Story 5.1 (Infrastructure)
- **Merges before:** Story 5.3 (Concatenation)

---

## User Story

**As a** video creator,
**I want** my selected video clips to be automatically trimmed to match the voiceover duration,
**So that** each scene's visuals sync perfectly with the narration.

---

## Description

This story implements the video trimming functionality that prepares selected clips for concatenation. When a user triggers video assembly, each scene's selected video clip must be trimmed to match the corresponding voiceover audio duration. This ensures perfect synchronization between visuals and narration in the final video.

The trimming system must handle edge cases:
- **Video longer than audio:** Trim from start to match audio duration
- **Video shorter than audio:** Loop or extend the final frame
- **Exact match:** No trimming needed

All trimmed clips are saved to a temporary directory for subsequent concatenation (Story 5.3).

---

## Acceptance Criteria

### AC1: Duration-Based Trimming
**Given** a scene with 10s voiceover and 30s video clip
**When** trimming is executed
**Then** the system trims the video to exactly 10 seconds

### AC2: Trimmed Clip Storage
**Given** trimmed video clips
**When** trimming completes
**Then** clips are saved to temp directory: `.cache/assembly/{jobId}/scene-{n}-trimmed.mp4`

### AC3: Sequential Processing
**Given** a project with multiple scenes
**When** trimming is initiated
**Then** all scenes are trimmed before proceeding to concatenation

### AC4: Progress Tracking
**Given** an ongoing trimming operation
**When** each scene is processed
**Then** progress indicator shows "Trimming scene X/Y..."

### AC5: Short Video Edge Case
**Given** a video shorter than the voiceover duration
**When** trimming is executed
**Then** the system either loops the video or extends the final frame

### AC6: Missing Video Error
**Given** a missing selected clip file
**When** trimming is attempted
**Then** assembly fails with clear error message identifying the missing file

### AC7: Performance
**Given** typical clip lengths (5-60 seconds)
**When** trimming is executed
**Then** each scene completes within 30 seconds

### AC8: Quality Preservation
**Given** any trimming operation
**When** using copy codec is possible
**Then** video quality is preserved without re-encoding

---

## Technical Implementation

### Architecture

```
lib/video/
├── ffmpeg.ts         # Add trim methods to FFmpegClient
├── assembler.ts      # Add trimAllScenes to VideoAssembler
└── trimmer.ts        # NEW: Trimming logic and edge cases

tests/unit/video/
└── trimmer.test.ts   # NEW: Trimmer unit tests
```

### Key Components

#### 1. Trimmer Class (lib/video/trimmer.ts)

```typescript
import { VIDEO_ASSEMBLY_CONFIG } from './constants';
import { AssemblyScene } from '@/types/assembly';
import { FFmpegClient } from './ffmpeg';

export class Trimmer {
  constructor(private ffmpeg: FFmpegClient) {}

  async trimScene(
    scene: AssemblyScene,
    outputDir: string
  ): Promise<string> {
    const videoDuration = await this.ffmpeg.getVideoDuration(scene.video_path);
    const audioDuration = scene.duration;

    const outputPath = `${outputDir}/scene-${scene.scene_number}-trimmed.mp4`;

    if (videoDuration >= audioDuration) {
      // Video is long enough - trim to audio duration
      await this.ffmpeg.trimVideo(scene.video_path, audioDuration, outputPath);
    } else {
      // Video is too short - handle edge case
      await this.handleShortVideo(scene.video_path, audioDuration, videoDuration, outputPath);
    }

    return outputPath;
  }

  private async handleShortVideo(
    videoPath: string,
    targetDuration: number,
    actualDuration: number,
    outputPath: string
  ): Promise<void> {
    // Calculate how many loops needed
    const loopCount = Math.ceil(targetDuration / actualDuration);

    // Use FFmpeg filter to loop and then trim
    // ffmpeg -stream_loop {count} -i input.mp4 -t {duration} -c copy output.mp4
  }
}
```

#### 2. FFmpegClient Extensions (lib/video/ffmpeg.ts)

Add to existing FFmpegClient class:

```typescript
// Story 5.2 adds these trimming methods:

async trimToAudioDuration(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  const audioDuration = await this.getAudioDuration(audioPath);
  await this.trimVideo(videoPath, audioDuration, outputPath);
}

async trimVideo(
  videoPath: string,
  duration: number,
  outputPath: string
): Promise<void> {
  // FFmpeg command: -i input -t duration -c copy output
  const args = [
    '-i', videoPath,
    '-t', duration.toString(),
    '-c', 'copy',
    '-y',
    outputPath
  ];

  await this.execute(args);
}
```

#### 3. VideoAssembler Extension (lib/video/assembler.ts)

Add to existing VideoAssembler class:

```typescript
// Story 5.2 adds:

async trimAllScenes(
  jobId: string,
  scenes: AssemblyScene[]
): Promise<string[]> {
  const trimmer = new Trimmer(this.ffmpeg);
  const outputDir = `${VIDEO_ASSEMBLY_CONFIG.TEMP_DIR}/${jobId}`;
  const trimmedPaths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    await this.updateJobProgress(jobId, {
      stage: 'trimming',
      progress: Math.round((i / scenes.length) * 30), // Trimming is 0-30% of total
      current_scene: scene.scene_number
    });

    const trimmedPath = await trimmer.trimScene(scene, outputDir);
    trimmedPaths.push(trimmedPath);
  }

  return trimmedPaths;
}
```

### FFmpeg Commands

**Basic Trim (video longer than audio):**
```bash
ffmpeg -i input.mp4 -t 10.5 -c copy -y output.mp4
```

**Loop Short Video:**
```bash
ffmpeg -stream_loop 2 -i input.mp4 -t 15.0 -c copy -y output.mp4
```

**Re-encode if Copy Fails:**
```bash
ffmpeg -i input.mp4 -t 10.5 -c:v libx264 -c:a aac -y output.mp4
```

---

## Tasks

### Task 1: Create Trimmer Service

**Subtasks:**
1.1. Create `lib/video/trimmer.ts` with `Trimmer` class
1.2. Implement `trimScene()` method with duration comparison
1.3. Implement `handleShortVideo()` for edge cases
1.4. Add validation for input files

**Contract Compliance:** Creates only `lib/video/trimmer.ts` (in exclusive_create)

---

### Task 2: Extend FFmpegClient with Trim Methods

**Subtasks:**
2.1. Add `trimVideo()` method to FFmpegClient
2.2. Add `trimToAudioDuration()` convenience method
2.3. Implement copy codec with re-encode fallback
2.4. Add duration tolerance validation (±0.5s)

**Contract Compliance:** Modifies only `lib/video/ffmpeg.ts` (in exclusive_modify)

---

### Task 3: Extend VideoAssembler with trimAllScenes

**Subtasks:**
3.1. Add `trimAllScenes()` method to VideoAssembler
3.2. Implement progress tracking with `updateJobProgress()`
3.3. Create temporary directory structure
3.4. Return array of trimmed file paths

**Contract Compliance:** Modifies only `lib/video/assembler.ts` (in exclusive_modify)

---

### Task 4: Implement Edge Case Handling

**Subtasks:**
4.1. Handle video shorter than audio (loop strategy)
4.2. Handle missing input file with clear error
4.3. Handle codec compatibility issues
4.4. Add retry logic for transient failures

---

### Task 5: Create Unit Tests

**Subtasks:**
5.1. Create `tests/unit/video/trimmer.test.ts`
5.2. Test `trimScene()` with various duration combinations
5.3. Test `handleShortVideo()` edge case
5.4. Test error handling for missing files
5.5. Mock FFmpeg commands for isolated testing

**Contract Compliance:** Creates only `tests/unit/video/trimmer.test.ts` (in exclusive_create)

---

## Dev Notes

### Contract Enforcement

**ONLY touch files listed in ownership:**
- Create: `lib/video/trimmer.ts`, `tests/unit/video/trimmer.test.ts`
- Modify: `lib/video/ffmpeg.ts`, `lib/video/assembler.ts`

**Use ONLY the naming prefixes specified:**
- Functions/classes: `Trim*`, `trim*`
- Test files: `trim.*`

**Import ONLY from read_only_dependencies:**
- `lib/video/constants.ts`
- `src/types/assembly.ts`
- `lib/db/client.ts`

### Dependency on Story 5.1

This story modifies files created by Story 5.1:
- `lib/video/ffmpeg.ts` - Must have base FFmpegClient class
- `lib/video/assembler.ts` - Must have base VideoAssembler class

**Merge Order:** Story 5.1 must merge first before Story 5.2.

### Performance Considerations

- Use `-c copy` to avoid re-encoding when possible
- Parallel trimming limited to 3 concurrent operations
- Monitor disk space in temp directory

### Error Handling

- Validate input files exist before processing
- Provide actionable error messages with file paths
- Log FFmpeg stderr for debugging
- Clean up partial outputs on failure

---

## Test Scenarios

### Positive Tests

1. **Normal trim:** 30s video trimmed to 10s audio = 10s output
2. **Exact match:** 10s video with 10s audio = 10s output (no op)
3. **Multiple scenes:** 5 scenes all trim successfully

### Edge Case Tests

1. **Short video:** 5s video, 15s audio = looped/extended output
2. **Very short:** 2s video, 30s audio = multiple loops
3. **Millisecond precision:** 10.523s audio = accurate trim

### Negative Tests

1. **Missing file:** Clear error with path
2. **Corrupt video:** FFmpeg error handled gracefully
3. **Insufficient disk:** Disk space error detected

---

## Definition of Done

- [x] All acceptance criteria met and tested
- [x] Unit tests pass with >80% coverage
- [x] Code follows contract boundaries exactly
- [x] No files outside exclusive_create/modify touched
- [x] All imports from read_only dependencies only
- [x] Build passes without errors
- [x] Code reviewed for contract compliance
- [x] Ready for merge after Story 5.1

---

## References

- PRD Feature 1.7 AC1 (Successful Video Assembly)
- PRD FR-7.02 (Trim clips to voiceover duration)
- Parallel Spec: Story Contract Matrix (Story 5.2)
- Epic 3 Story 3.6 (Downloaded segments in cache)
