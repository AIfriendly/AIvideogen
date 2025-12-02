# Story 5.3: Video Concatenation & Audio Overlay

**Epic:** 5 - Video Assembly & Output
**Story ID:** 5.3
**Status:** Complete (Bug Fix Applied 2025-11-25)
**Priority:** High
**Created:** 2025-11-24
**Revised:** 2025-11-25 (Bug Fix)
**Implements:** FR-7.03, FR-7.04, FR-7.06

---

## Story Contract (Parallel Execution)

> **CRITICAL:** This story is designed for parallel execution. Follow this contract strictly to prevent conflicts with other stories.

### File Ownership

**Files I Create (exclusive_create):**
- `lib/video/concatenator.ts` - Video concatenation and audio overlay logic
- `tests/unit/video/concatenator.test.ts` - Concatenator unit tests

**Files I Modify (exclusive_modify):**
- `lib/video/ffmpeg.ts` - Add `concat`, `overlayAudio`, and `muxAudioVideo` methods; **change `execute()` visibility from private to protected**
- `lib/video/assembler.ts` - Add `concatenateAllScenes` and `overlayAllAudio` methods; **add fs imports**

**Files I Import From (read_only):**
- `lib/video/constants.ts` - Import `VIDEO_ASSEMBLY_CONFIG`, `ASSEMBLY_JOB_STATUS`
- `src/types/assembly.ts` - Import `AssemblyScene`, `AssemblyJob`, `AssemblyStage`
- `lib/db/client.ts` - Import `db`
- `lib/db/queries.ts` - Import `updateProjectVideo`, `completeAssemblyJob`

### Naming Conventions

- **File prefix:** `concat-`
- **Component prefix:** `Concat`
- **CSS class prefix:** `cat-`
- **Test prefix:** `concat.`

### Database Ownership

- **Tables I create:** None
- **Columns I add:** None
- **Tables I read:** `assembly_jobs`, `scenes`, `projects`
- **Tables I update:** `projects` (video_path, total_duration, file_size), `assembly_jobs` (status, completed_at)

### Interface Dependencies

**I Consume (from Story 5.1 & 5.2):**
- `FFmpegClient.execute()` - Execute FFmpeg commands (**NOTE: Must change to protected visibility**)
- `FFmpegClient.getVideoDuration()` - Verify output duration
- `FFmpegClient.getAudioDuration()` - Get audio file durations
- `VideoAssembler.updateJobProgress()` - Update job progress (signature: `updateJobProgress(jobId, progress, stage, currentScene?)`)
- `VideoAssembler.completeJob()` - Mark job as complete
- `Trimmer.trimScenes()` - Get trimmed scene paths (from Story 5.2)

**I Implement:**
- `FFmpegClient.concat(inputPaths, outputPath)` - Concatenate video files
- `FFmpegClient.overlayAudio(videoPath, audioPath, outputPath)` - Overlay audio onto video
- `FFmpegClient.muxAudioVideo(videoPath, audioPaths, outputPath)` - Mux multiple audio tracks
- `VideoAssembler.concatenateAllScenes(jobId, trimmedPaths)` - Concatenate all trimmed scenes
- `VideoAssembler.overlayAllAudio(jobId, concatenatedPath, scenes)` - Overlay all voiceovers
- `Concatenator.concatenate(trimmedPaths, outputPath)` - Main concatenation logic
- `Concatenator.overlayAudio(videoPath, audioPath, outputPath)` - Single audio overlay

### Merge Order

- **Position:** 3 of 5
- **Merges after:** Story 5.2 (Scene Video Trimming)
- **Merges before:** Story 5.4 (Thumbnail Generation)

---

## Bug Fix History

### BUG-001: Audio Timing Uses Wrong Duration Field (Fixed 2025-11-25)

**Symptom:** Final assembled video had no audible audio or audio was severely misaligned.

**Root Cause:** The `overlayAllAudio()` method was using `scene.clipDuration` (original YouTube video duration from `visual_suggestions.duration`) instead of `scene.audioDuration` (actual voiceover duration from `scenes.duration`) for calculating audio delay times.

**Impact:**
- Scene 1 audio: Correct (started at 0s)
- Scene 2+ audio: Delayed too far because YouTube clips are longer than trimmed duration
- Example: If YouTube clip was 76s but voiceover was 40s, scene 2 audio started at 76s instead of 40s
- Result: Most audio delayed past end of video, appearing as silence

**Fix Applied:**
1. Added `audioDuration` field to `AssemblyScene` interface (`src/types/assembly.ts`)
2. Updated assembly route to include `s.duration as audioDuration` in SQL query (`route.ts`)
3. Changed `assembler.ts:308` from `scene.clipDuration` to `scene.audioDuration`

**Files Changed:**
- `src/types/assembly.ts` - Added `audioDuration` field
- `src/app/api/projects/[id]/assemble/route.ts` - Added audioDuration to query and mapping
- `src/lib/video/assembler.ts` - Fixed timing calculation

**Prevention:** Updated this story's code examples and added prominent warnings about using `audioDuration` for timing.

### BUG-002: AAC Audio Codec Playback Issue (Fixed 2025-11-25)

**Symptom:** Final assembled video appeared to have no audio when played in certain players (Kiro IDE, some browsers), even though FFmpeg reported audio was present with valid volume levels.

**Root Cause:** FFmpeg's AAC encoder (`-c:a aac`) produces audio that some players don't decode correctly. The audio stream existed and had valid volume (-24dB mean), but players couldn't play it.

**Diagnosis Steps:**
1. FFprobe showed audio stream existed with valid properties
2. `volumedetect` filter showed -24dB mean volume (not silent)
3. Source MP3 files played correctly
4. Test video with `-c:a copy` (MP3 passthrough) had working audio
5. Test video with `-c:a aac` (AAC re-encode) had no audible audio

**Fix Applied:**
Changed `VIDEO_ASSEMBLY_CONFIG.AUDIO_CODEC` in `constants.ts` from:
```typescript
AUDIO_CODEC: 'aac',  // Playback issues in some players
```
To:
```typescript
AUDIO_CODEC: 'libmp3lame',  // Better compatibility
```

**Files Changed:**
- `src/lib/video/constants.ts` - Line 12

**Prevention:** Added comment explaining why MP3 codec is used instead of AAC for player compatibility.

**Note:** This may be specific to the FFmpeg build/version on the development machine. AAC should theoretically work, but MP3 provides better cross-player compatibility.

---

## User Story

**As a** video creator,
**I want** my trimmed video scenes to be concatenated in order with voiceover audio overlaid,
**So that** I receive a complete, synchronized video ready for export.

---

## Description

This story implements the core video assembly functionality that combines trimmed scenes into a final video with synchronized voiceover audio. After Story 5.2 trims each scene to match voiceover duration, this story:

1. **Concatenates** all trimmed scenes in sequential order using FFmpeg's concat demuxer
2. **Overlays** the corresponding voiceover audio for each scene
3. **Renders** the final output as H.264 MP4 with AAC audio
4. **Saves** the final video to the public output directory
5. **Updates** the project and job records with completion status

The assembly must ensure perfect audio/video synchronization where each scene's voiceover plays exactly when that scene's visuals appear.

---

## Acceptance Criteria

### AC1: Video Concatenation
**Given** 3 trimmed scenes (5s, 7s, 8s)
**When** concatenation is executed
**Then** the final video is exactly 20 seconds

### AC2: Scene Order
**Given** trimmed scenes for Scene 1, Scene 2, Scene 3
**When** concatenation completes
**Then** scenes appear in correct sequential order (Scene 1 -> Scene 2 -> Scene 3)

### AC3: Audio Synchronization
**Given** voiceover audio files for each scene
**When** audio overlay is applied
**Then** voiceover audio plays in sync with corresponding scene visuals

### AC4: Audio Sync Accuracy
**Given** voiceover with specific timing
**When** final video is played
**Then** voiceover words align with scene timing (no drift > 0.1s)

### AC5: Output Format
**Given** completed assembly
**When** final video is rendered
**Then** format is H.264 video codec, AAC audio codec, MP4 container

### AC6: Output Location
**Given** completed assembly
**When** final video is saved
**Then** file is at `public/videos/{projectId}/final.mp4`

### AC7: Project Record Update
**Given** completed assembly
**When** job completes successfully
**Then** project record updated with video_path and total_duration

### AC8: Job Completion
**Given** completed assembly
**When** job finishes
**Then** assembly job marked as 'complete' with completion timestamp

### AC9: Playability
**Given** final video file
**When** opened in standard video players (VLC, browser)
**Then** video plays correctly without errors

### AC10: File Size
**Given** completed video at 720p
**When** file size is measured
**Then** size is approximately 5-10 MB per minute of duration

---

## Technical Implementation

### Architecture

```
lib/video/
├── ffmpeg.ts         # Add concat and overlayAudio methods; change execute() to protected
├── assembler.ts      # Add concatenateAllScenes and overlayAllAudio methods; add fs imports
├── trimmer.ts        # (from Story 5.2) Provides trimmed paths
└── concatenator.ts   # NEW: Concatenation and audio overlay logic

tests/unit/video/
└── concatenator.test.ts   # NEW: Concatenator unit tests
```

### Key Components

#### 1. Concatenator Class (lib/video/concatenator.ts)

```typescript
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { FFmpegClient } from './ffmpeg';
import { VIDEO_ASSEMBLY_CONFIG } from './constants';
import { AssemblyScene } from '@/types/assembly';

export interface ConcatResult {
  outputPath: string;
  totalDuration: number;
  sceneCount: number;
}

export class Concatenator {
  constructor(private ffmpeg: FFmpegClient) {}

  /**
   * Concatenate multiple video files into a single video
   * Uses FFmpeg concat demuxer for efficient joining without re-encoding
   */
  async concatenate(
    trimmedPaths: string[],
    outputPath: string
  ): Promise<ConcatResult> {
    // Generate concat demuxer file
    const concatListPath = this.generateConcatFile(trimmedPaths, outputPath);

    // Execute concat command
    await this.ffmpeg.concat(concatListPath, outputPath);

    // Verify output and get duration
    const duration = await this.ffmpeg.getVideoDuration(outputPath);

    return {
      outputPath,
      totalDuration: duration,
      sceneCount: trimmedPaths.length,
    };
  }

  /**
   * Overlay voiceover audio onto video
   * Handles audio format conversion (MP3 -> AAC)
   */
  async overlayAudio(
    videoPath: string,
    audioPath: string,
    outputPath: string
  ): Promise<string> {
    await this.ffmpeg.overlayAudio(videoPath, audioPath, outputPath);
    return outputPath;
  }

  /**
   * Overlay multiple audio files sequentially onto concatenated video
   * Each audio starts at the corresponding scene's start time
   *
   * CRITICAL: Use audioDuration (voiceover length) NOT clipDuration (YouTube video length)
   * Videos are trimmed to match audioDuration, so timing must use the same value.
   */
  async overlayAllAudio(
    concatenatedVideoPath: string,
    scenes: AssemblyScene[],
    outputPath: string
  ): Promise<string> {
    // Calculate cumulative start times for each scene
    // IMPORTANT: Use audioDuration, NOT clipDuration!
    let currentTime = 0;
    const audioInputs: Array<{ path: string; startTime: number }> = [];

    for (const scene of scenes) {
      audioInputs.push({
        path: scene.audioFilePath,
        startTime: currentTime,
      });
      // Use audioDuration (actual voiceover length) for timing calculation
      // NOT clipDuration (original YouTube video duration)
      currentTime += scene.audioDuration;

    await this.ffmpeg.muxAudioVideo(
      concatenatedVideoPath,
      audioInputs,
      outputPath
    );

    return outputPath;
  }

  /**
   * Generate FFmpeg concat demuxer file
   * NOTE: Windows paths require special handling - convert backslashes to forward slashes
   * and escape single quotes in paths
   */
  private generateConcatFile(
    inputPaths: string[],
    outputDir: string
  ): string {
    const listPath = path.join(path.dirname(outputDir), 'concat-list.txt');

    // Windows path handling: convert backslashes to forward slashes
    // and escape any single quotes in the path
    const content = inputPaths
      .map(p => {
        const normalizedPath = p.replace(/\\/g, '/').replace(/'/g, "'\\''");
        return `file '${normalizedPath}'`;
      })
      .join('\n');

    writeFileSync(listPath, content);
    return listPath;
  }
}
```

#### 2. FFmpegClient Extensions (lib/video/ffmpeg.ts)

**CRITICAL CHANGE:** The `execute()` method must be changed from `private` to `protected` to allow these new methods to call it:

```typescript
// REQUIRED: Change execute() visibility from private to protected
// This allows subclasses and methods added in this story to call execute()
protected async execute(args: string[]): Promise<void> {
  // existing implementation
}

// Story 5.3 adds these concatenation and audio methods:

/**
 * Concatenate videos using concat demuxer
 * Command: ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4
 */
async concat(
  concatListPath: string,
  outputPath: string
): Promise<void> {
  const args = [
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListPath,
    '-c', 'copy',
    '-y',
    outputPath,
  ];

  await this.execute(args);
}

/**
 * Overlay audio onto video
 * Command: ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 output.mp4
 */
async overlayAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  const args = [
    '-i', videoPath,
    '-i', audioPath,
    '-c:v', 'copy',
    '-c:a', VIDEO_ASSEMBLY_CONFIG.AUDIO_CODEC,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-y',
    outputPath,
  ];

  await this.execute(args);
}

/**
 * Mux multiple audio tracks onto video at specified start times
 * Uses filter_complex for precise audio positioning
 * NOTE: amix filter uses normalize=0 to prevent volume reduction
 */
async muxAudioVideo(
  videoPath: string,
  audioInputs: Array<{ path: string; startTime: number }>,
  outputPath: string
): Promise<void> {
  // Build input arguments
  const inputArgs = ['-i', videoPath];
  audioInputs.forEach(input => {
    inputArgs.push('-i', input.path);
  });

  // Build filter_complex for audio mixing
  const filterParts: string[] = [];
  const audioLabels: string[] = [];

  audioInputs.forEach((input, index) => {
    const audioIndex = index + 1; // Video is input 0
    const label = `a${index}`;
    const delayMs = Math.round(input.startTime * 1000);
    filterParts.push(`[${audioIndex}:a]adelay=${delayMs}|${delayMs}[${label}]`);
    audioLabels.push(`[${label}]`);
  });

  // Mix all audio streams with normalize=0 to prevent volume reduction
  // NOTE: Without normalize=0, amix reduces volume by 1/n for each input
  const mixFilter = `${audioLabels.join('')}amix=inputs=${audioInputs.length}:duration=longest:normalize=0[aout]`;
  filterParts.push(mixFilter);

  const filterComplex = filterParts.join(';');

  const args = [
    ...inputArgs,
    '-filter_complex', filterComplex,
    '-map', '0:v:0',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', VIDEO_ASSEMBLY_CONFIG.AUDIO_CODEC,
    '-b:a', VIDEO_ASSEMBLY_CONFIG.AUDIO_BITRATE,
    '-y',
    outputPath,
  ];

  await this.execute(args);
}
```

#### 3. VideoAssembler Extensions (lib/video/assembler.ts)

**REQUIRED IMPORT:** Add fs imports at the top of the file:

```typescript
// Add this import to the top of assembler.ts
import { existsSync, mkdirSync } from 'fs';
```

Add to existing VideoAssembler class:

```typescript
// Story 5.3 adds:

/**
 * Concatenate all trimmed scenes into a single video
 */
async concatenateAllScenes(
  jobId: string,
  trimmedPaths: string[]
): Promise<string> {
  const concatenator = new Concatenator(this.ffmpeg);
  const outputDir = `${VIDEO_ASSEMBLY_CONFIG.TEMP_DIR}/${jobId}`;
  const outputPath = `${outputDir}/concatenated.mp4`;

  // Use existing signature: updateJobProgress(jobId, progress, stage, currentScene?)
  await this.updateJobProgress(jobId, 35, 'concatenating');

  const result = await concatenator.concatenate(trimmedPaths, outputPath);

  console.log(
    `[VideoAssembler] Concatenated ${result.sceneCount} scenes, ` +
    `total duration: ${result.totalDuration.toFixed(2)}s`
  );

  return result.outputPath;
}

/**
 * Overlay voiceover audio for all scenes
 */
async overlayAllAudio(
  jobId: string,
  concatenatedPath: string,
  scenes: AssemblyScene[],
  projectId: string
): Promise<string> {
  const concatenator = new Concatenator(this.ffmpeg);

  // Ensure output directory exists
  const outputDir = `${VIDEO_ASSEMBLY_CONFIG.OUTPUT_DIR}/${projectId}`;
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const finalPath = `${outputDir}/final.mp4`;

  // Use existing signature: updateJobProgress(jobId, progress, stage, currentScene?)
  await this.updateJobProgress(jobId, 60, 'audio_overlay');

  await concatenator.overlayAllAudio(concatenatedPath, scenes, finalPath);

  // Verify final output
  const finalDuration = await this.ffmpeg.getVideoDuration(finalPath);

  // Get file size for project record
  const stats = await import('fs').then(fs => fs.statSync(finalPath));
  const fileSize = stats.size;

  // Use existing updateProjectVideo function with all required parameters
  // Pass null for thumbnailPath since Story 5.4 handles thumbnail generation
  await updateProjectVideo(projectId, finalPath, null, finalDuration, fileSize);

  // Use existing signature: updateJobProgress(jobId, progress, stage, currentScene?)
  await this.updateJobProgress(jobId, 95, 'finalizing');

  console.log(
    `[VideoAssembler] Final video created: ${finalPath}, ` +
    `duration: ${finalDuration.toFixed(2)}s, size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`
  );

  return finalPath;
}
```

### FFmpeg Commands

**Concat Demuxer File (concat-list.txt):**
```
file '/path/to/scene-1-trimmed.mp4'
file '/path/to/scene-2-trimmed.mp4'
file '/path/to/scene-3-trimmed.mp4'
```

**Basic Concatenation (copy codec, no re-encoding):**
```bash
ffmpeg -f concat -safe 0 -i concat-list.txt -c copy output.mp4
```

**Single Audio Overlay (replace video audio with voiceover):**
```bash
ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 output.mp4
```

**Multiple Audio Overlay with Precise Timing and Volume Normalization:**
```bash
ffmpeg -i video.mp4 -i scene1.mp3 -i scene2.mp3 -i scene3.mp3 \
  -filter_complex "[1:a]adelay=0|0[a0];[2:a]adelay=5000|5000[a1];[3:a]adelay=12000|12000[a2];[a0][a1][a2]amix=inputs=3:duration=longest:normalize=0[aout]" \
  -map 0:v:0 -map "[aout]" -c:v copy -c:a aac -b:a 128k -y output.mp4
```

**Final Encoding with Quality Settings:**
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k output.mp4
```

---

## Tasks

### Task 1: Create Concatenator Service

**Subtasks:**
1.1. Create `lib/video/concatenator.ts` with `Concatenator` class
1.2. Implement `concatenate()` method with concat demuxer approach
1.3. Implement `generateConcatFile()` to create demuxer input file with Windows path handling
1.4. Add input validation for trimmed paths
1.5. Verify output file created and has expected duration

**Contract Compliance:** Creates only `lib/video/concatenator.ts` (in exclusive_create)

---

### Task 2: Extend FFmpegClient with Concat Method

**Subtasks:**
2.1. **Change `execute()` from private to protected** in FFmpegClient
2.2. Add `concat()` method to FFmpegClient
2.3. Implement concat demuxer command execution
2.4. Handle Windows path separators (convert \ to / in concat file)
2.5. Escape special characters (single quotes) in file paths
2.6. Add error handling for missing input files

**Contract Compliance:** Modifies only `lib/video/ffmpeg.ts` (in exclusive_modify)

---

### Task 3: Implement Audio Overlay Methods

**Subtasks:**
3.1. Add `overlayAudio()` method for single audio overlay
3.2. Add `muxAudioVideo()` method for multiple audio tracks with timing
3.3. **Add `normalize=0` to amix filter** to prevent volume reduction
3.4. Implement audio format conversion (MP3 -> AAC)
3.5. Calculate audio delay positions based on scene durations
3.6. Use amix filter for combining multiple audio streams

**Contract Compliance:** Modifies only `lib/video/ffmpeg.ts` (in exclusive_modify)

---

### Task 4: Extend VideoAssembler with Assembly Methods

**Subtasks:**
4.1. **Add import `{ existsSync, mkdirSync } from 'fs'`** to assembler.ts
4.2. Add `concatenateAllScenes()` method to VideoAssembler
4.3. Add `overlayAllAudio()` method to VideoAssembler
4.4. **Use correct `updateJobProgress(jobId, progress, stage)` signature** (not object parameter)
4.5. Create output directory structure (`public/videos/{projectId}/`)
4.6. **Use existing `updateProjectVideo(projectId, videoPath, thumbnailPath, totalDuration, fileSize)`** function
     - Pass `null` for thumbnailPath (Story 5.4 handles thumbnail generation)
4.7. Mark assembly job as complete

**Contract Compliance:** Modifies only `lib/video/assembler.ts` (in exclusive_modify)

---

### Task 5: Implement Progress Tracking

**Subtasks:**
5.1. Update job progress during concatenation stage (30-40%)
5.2. Update job progress during audio overlay stage (40-70%)
5.3. Update job progress during finalization stage (95%)
5.4. Log timing information for debugging

**Epic 5 Full Progress Mapping:**
| Story | Stage | Progress Range | Description |
|-------|-------|----------------|-------------|
| 5.1 | initializing | 0-5% | Job creation, validation |
| 5.2 | downloading | 5-20% | Download source videos |
| 5.2 | trimming | 20-30% | Trim scenes to duration |
| 5.3 | concatenating | 30-40% | Join trimmed scenes |
| 5.3 | audio_overlay | 40-70% | Apply voiceover audio |
| 5.4 | thumbnail | 70-85% | Generate thumbnail |
| 5.5 | finalizing | 85-95% | Final cleanup |
| 5.5 | complete | 100% | Job done |

---

### Task 6: Error Handling & Validation

**Subtasks:**
6.1. Validate all input files exist before processing
6.2. Handle FFmpeg command failures with clear error messages
6.3. Verify final video duration matches expected total
6.4. Clean up intermediate files on failure
6.5. Update job status to 'error' if assembly fails
6.6. **Add warning for large scene counts (>10 scenes)** - may impact performance

---

### Task 7: Create Unit Tests

**Subtasks:**
7.1. Create `tests/unit/video/concatenator.test.ts`
7.2. Test `concatenate()` with mock video files
7.3. Test `overlayAudio()` with single audio track
7.4. Test `overlayAllAudio()` with multiple scenes
7.5. Test `generateConcatFile()` output format including Windows path handling
7.6. Test error handling for missing files
7.7. Mock FFmpeg commands for isolated testing

**Contract Compliance:** Creates only `tests/unit/video/concatenator.test.ts` (in exclusive_create)

---

## Dev Notes

### Contract Enforcement

**ONLY touch files listed in ownership:**
- Create: `lib/video/concatenator.ts`, `tests/unit/video/concatenator.test.ts`
- Modify: `lib/video/ffmpeg.ts`, `lib/video/assembler.ts`

**Use ONLY the naming prefixes specified:**
- Functions/classes: `Concat*`, `concat*`
- Test files: `concat.*`

**Import ONLY from read_only dependencies:**
- `lib/video/constants.ts`
- `src/types/assembly.ts`
- `lib/db/client.ts`
- `lib/db/queries.ts`

### Critical Implementation Notes (Architect Feedback)

> **These issues MUST be addressed during implementation:**

1. **FFmpegClient `execute()` Visibility**
   - Current: `private execute(args: string[])`
   - Required: `protected execute(args: string[])`
   - Reason: New methods (`concat`, `overlayAudio`, `muxAudioVideo`) need to call `execute()`

2. **VideoAssembler `updateJobProgress()` Signature**
   - Existing signature: `updateJobProgress(jobId: string, progress: number, stage: string, currentScene?: number)`
   - Do NOT use object parameter like `{ stage: 'concatenating', progress: 35 }`
   - Correct usage: `this.updateJobProgress(jobId, 35, 'concatenating')`

3. **Required fs Imports in assembler.ts**
   ```typescript
   import { existsSync, mkdirSync } from 'fs';
   ```

4. **Use Existing `updateProjectVideo` Function**
   - Signature: `updateProjectVideo(projectId, videoPath, thumbnailPath, totalDuration, fileSize)`
   - Pass `null` for `thumbnailPath` (Story 5.4 generates thumbnail)
   - Calculate `fileSize` using `fs.statSync(finalPath).size`

5. **Audio Volume Normalization**
   - Add `normalize=0` to amix filter to prevent volume reduction (1/n for each input)
   ```typescript
   const mixFilter = `${audioLabels.join('')}amix=inputs=${audioInputs.length}:duration=longest:normalize=0[aout]`;
   ```

### Windows Path Handling

When generating concat demuxer files on Windows:
- Convert backslashes to forward slashes: `path.replace(/\\/g, '/')`
- Escape single quotes: `path.replace(/'/g, "'\\''")`
- Handle paths with spaces (single quotes in concat file handle this)

### Large Scene Count Warning

For projects with >10 scenes:
- FFmpeg filter_complex with many adelay filters can be slow
- Consider logging a performance warning
- Monitor memory usage during audio mixing
- May need to process in batches for very large projects

### Dependency on Story 5.1 & 5.2

This story modifies files created/modified by previous stories:
- `lib/video/ffmpeg.ts` - Must have base FFmpegClient class with execute() method
- `lib/video/assembler.ts` - Must have VideoAssembler class with updateJobProgress()

**Merge Order:** Stories 5.1 and 5.2 must merge first before Story 5.3.

### Audio/Video Sync Strategy

The key to perfect synchronization is:

1. **Trimming (Story 5.2):** Each scene video is trimmed to exactly match voiceover duration
2. **Concatenation (this story):** Videos join without gaps
3. **Audio Overlay:** Each audio starts at cumulative time offset:
   - Scene 1 audio starts at 0s
   - Scene 2 audio starts at Scene 1 **audioDuration**
   - Scene 3 audio starts at Scene 1 + Scene 2 **audioDuration**

> **⚠️ CRITICAL BUG PREVENTION:**
>
> Always use `scene.audioDuration` (voiceover length from `scenes.duration`) for timing calculations.
>
> **NEVER** use `scene.clipDuration` (YouTube video length from `visual_suggestions.duration`).
>
> The videos are trimmed to match `audioDuration`, so audio timing must use the same value.
> Using `clipDuration` causes audio to be delayed past video boundaries, resulting in silence.
>
> See BUG-001 in Bug Fix History for details.

### FFmpeg Concat Demuxer Approach

Using the concat demuxer (`-f concat`) instead of concat protocol because:
- Works with files that don't have matching codecs
- No re-encoding required (uses `-c copy`)
- Faster than re-encoding approach
- Better compatibility with varied input formats

### Audio Format Conversion

- Input: MP3 (from TTS engine in Epic 2)
- Output: AAC (for MP4 container compatibility)
- FFmpeg handles conversion automatically with `-c:a aac`

### Performance Considerations

- Concatenation with `-c copy` is fast (no re-encoding)
- Audio mixing requires processing but is efficient
- Target: Complete assembly in <2 minutes for 3-minute video
- Avoid unnecessary re-encoding to preserve quality
- **Warning:** Projects with >10 scenes may experience slower audio mixing

### File Size Estimation

At 720p with H.264 and AAC:
- Video bitrate: ~2 Mbps
- Audio bitrate: 128 kbps
- Total: ~2.1 Mbps = ~15.8 MB/minute
- With CRF 23: ~5-10 MB/minute (variable bitrate)

---

## Test Scenarios

### Positive Tests

1. **Basic Concat:** 3 scenes of 5s, 7s, 8s = 20s final video
2. **Audio Sync:** Voiceover aligns with scene visuals
3. **Format Correct:** Output is H.264/AAC MP4
4. **File Location:** Video saved to `public/videos/{projectId}/final.mp4`
5. **Volume Levels:** Audio volume is consistent (not reduced by amix)

### Edge Case Tests

1. **Single Scene:** Project with only 1 scene concatenates correctly
2. **Many Scenes:** Project with 10+ scenes handles efficiently (with warning)
3. **Long Video:** 10-minute video assembles successfully
4. **Variable Durations:** Scenes with varying lengths (1s to 60s)
5. **Windows Paths:** Paths with backslashes and special characters handled

### Integration Tests

1. **Full Pipeline:** Trimming -> Concatenation -> Audio Overlay
2. **Database Updates:** Project record and job status updated correctly
3. **Progress Tracking:** Job progress updates throughout assembly
4. **updateProjectVideo Call:** Verify all 5 parameters passed correctly

### Negative Tests

1. **Missing Trimmed File:** Clear error if input file missing
2. **Invalid Audio:** Handle corrupt or missing audio file
3. **Insufficient Disk:** Detect disk space issues
4. **FFmpeg Failure:** Handle FFmpeg command errors gracefully

---

## Definition of Done

- [ ] All acceptance criteria met and tested
- [ ] Unit tests pass with >80% coverage
- [ ] Integration tests verify full assembly pipeline
- [ ] Code follows contract boundaries exactly
- [ ] No files outside exclusive_create/modify touched
- [ ] All imports from read_only dependencies only
- [ ] **FFmpegClient.execute() changed to protected**
- [ ] **updateJobProgress() uses correct 4-parameter signature**
- [ ] **fs imports added to assembler.ts**
- [ ] **updateProjectVideo called with all 5 parameters**
- [ ] **amix filter includes normalize=0**
- [ ] Build passes without errors
- [ ] Final video plays correctly in VLC and browser
- [ ] Audio sync verified (no drift > 0.1s)
- [ ] Audio volume levels correct (not reduced)
- [ ] Project and job records update correctly
- [ ] Code reviewed for contract compliance
- [ ] Ready for merge after Story 5.2

---

## References

- PRD Feature 1.7 (Automated Video Assembly) lines 346-369
- PRD FR-7.03 (Concatenate clips in order)
- PRD FR-7.04 (Overlay voiceover audio)
- PRD FR-7.06 (Make video available for download)
- PRD AC1 (Successful Video Assembly) lines 355-369
- Story 5.1 (Video Processing Infrastructure)
- Story 5.2 (Scene Video Trimming)
- FFmpeg Concat Demuxer Documentation
- FFmpeg Filters Documentation (amix, adelay)
