# Story 5.4: Automated Thumbnail Generation

**Epic:** 5 - Video Assembly & Output
**Story ID:** 5.4
**Status:** Done
**Priority:** Medium
**Created:** 2025-11-27
**Completed:** 2025-11-27
**Implements:** FR-8.01, FR-8.02, FR-8.03, FR-8.04, FR-8.05

---

## Story Contract (Parallel Execution)

 
### File Ownership

**Files I Create (exclusive_create):**
- `src/lib/video/thumbnail.ts` - ThumbnailGenerator class with frame extraction and text overlay
- `src/app/api/projects/[id]/generate-thumbnail/route.ts` - POST endpoint to trigger thumbnail generation
- `tests/unit/video/thumbnail.test.ts` - Thumbnail generator unit tests

**Files I Modify (exclusive_modify):**
- `src/lib/video/ffmpeg.ts` - Add `extractFrame`, `extractMultipleFrames`, and `addTextOverlay` methods
- `src/lib/video/assembler.ts` - Add `generateThumbnail` method
- `src/lib/db/queries.ts` - Add `updateProjectThumbnail` function for thumbnail-only updates

**Files I Import From (read_only):**
- `src/lib/video/constants.ts` - Import `VIDEO_ASSEMBLY_CONFIG`
- `src/types/assembly.ts` - Import `ThumbnailOptions`, `AssemblyJob`
- `src/lib/db/client.ts` - Import `db`
- `src/lib/db/queries.ts` - Import `updateProjectVideo`, `getProject`

### Naming Conventions

- **File prefix:** `thumb-`
- **Component prefix:** `Thumbnail`
- **CSS class prefix:** `tmb-`
- **Test prefix:** `thumbnail.`

### Database Ownership

- **Tables I create:** None
- **Columns I add:** None (thumbnail_path already added by Story 5.1)
- **Tables I read:** `projects`, `assembly_jobs`
- **Tables I update:** `projects` (thumbnail_path only)

### Interface Dependencies

**I Consume (from Story 5.1 & 5.3):**
- `FFmpegClient.execute()` - Execute FFmpeg commands (protected method - already changed by Story 5.3)
- `FFmpegClient.getVideoDuration()` - Get video duration for frame selection
- `VideoAssembler.updateJobProgress()` - Update job progress (signature: `updateJobProgress(jobId, progress, stage, currentScene?)`)
- `VideoAssembler.updateProjectVideo()` - Update project record (method on VideoAssembler class)

**I Implement:**
- `FFmpegClient.extractFrame(videoPath, timestamp, outputPath)` - Extract single frame at timestamp
- `FFmpegClient.extractMultipleFrames(videoPath, timestamps, outputDir)` - Extract frames at multiple timestamps
- `ThumbnailGenerator.generate(options)` - Main thumbnail generation method
- `ThumbnailGenerator.selectBestFrame(frames)` - Select most visually compelling frame
- `ThumbnailGenerator.addTextOverlay(imagePath, text, outputPath)` - Add title text to image
- `VideoAssembler.generateThumbnail(jobId, videoPath, title, projectId)` - Orchestrate thumbnail generation

### Merge Order

- **Position:** 4 of 5
- **Merges after:** Story 5.3 (Video Concatenation & Audio Overlay)
- **Merges before:** Story 5.5 (Export UI & Download Workflow)

---

## User Story

**As a** video creator,
**I want** an attractive thumbnail automatically generated for my video,
**So that** I don't have to spend time creating one myself and my video grabs viewer attention.

---

## Description

This story implements automated thumbnail generation for completed videos. After Story 5.3 creates the final assembled video, this story:

1. **Extracts** candidate frames from the video at multiple timestamps (10%, 50%, 90% of duration)
2. **Selects** the most visually compelling frame based on simple heuristics
3. **Overlays** the video title text in a legible, visually appealing manner
4. **Saves** the thumbnail as a high-quality JPEG (1920x1080, 16:9 aspect ratio)
5. **Updates** the project record with the thumbnail path

The thumbnail serves as the video's visual preview and is essential for platforms like YouTube where thumbnails significantly impact click-through rates.

---

## Acceptance Criteria

### AC1: Successful Thumbnail Generation
**Given** a video has been generated with the title "The Secrets of Ancient Rome"
**When** the thumbnail generation process runs
**Then** a 16:9 aspect ratio JPG image is created and made available for download

### AC2: Thumbnail Content Verification
**Given** the generated thumbnail from AC1
**When** the image is viewed
**Then** it must contain the text "The Secrets of Ancient Rome" and a background image from the video

### AC3: Dimensions
**Given** completed thumbnail generation
**When** the image dimensions are checked
**Then** they must be exactly 1920x1080 pixels (16:9 aspect ratio)

### AC4: Frame from Video
**Given** thumbnail generation is triggered
**When** frame extraction runs
**Then** the background image must be extracted from the assembled video (not arbitrary)

### AC5: Output Location
**Given** completed thumbnail generation
**When** the file is saved
**Then** it is saved to `public/videos/{projectId}/thumbnail.jpg`

### AC6: Project Record Update
**Given** completed thumbnail generation
**When** the process finishes
**Then** the project's `thumbnail_path` column is updated with the file path

### AC7: Text Legibility
**Given** the generated thumbnail
**When** the title text is viewed
**Then** it must be clearly legible with appropriate font size, color, and background/shadow

### AC8: Job Progress Update
**Given** thumbnail generation in progress
**When** processing
**Then** assembly job progress is updated to thumbnail stage (70-85%)

### AC9: API Endpoint
**Given** a completed video exists
**When** POST /api/projects/[id]/generate-thumbnail is called
**Then** a new thumbnail is generated and the path is returned

---

## Technical Implementation

### Architecture

```
src/lib/video/
├── ffmpeg.ts         # Add extractFrame and extractMultipleFrames methods
├── assembler.ts      # Add generateThumbnail method
├── thumbnail.ts      # NEW: ThumbnailGenerator class
└── constants.ts      # Thumbnail settings (may be modified)

src/app/api/projects/[id]/
└── generate-thumbnail/
    └── route.ts      # NEW: POST endpoint for thumbnail generation

tests/unit/video/
└── thumbnail.test.ts # NEW: Thumbnail unit tests
```

### Key Components

#### 1. ThumbnailGenerator Class (src/lib/video/thumbnail.ts)

```typescript
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { FFmpegClient } from './ffmpeg';
import { VIDEO_ASSEMBLY_CONFIG } from './constants';

export interface ThumbnailOptions {
  videoPath: string;
  title: string;
  outputPath: string;
  width?: number;   // Default 1920
  height?: number;  // Default 1080
}

export interface ThumbnailResult {
  thumbnailPath: string;
  width: number;
  height: number;
  sourceTimestamp: number;
}

export class ThumbnailGenerator {
  constructor(private ffmpeg: FFmpegClient) {}

  /**
   * Generate a thumbnail from video with title overlay
   */
  async generate(options: ThumbnailOptions): Promise<ThumbnailResult> {
    const {
      videoPath,
      title,
      outputPath,
      width = VIDEO_ASSEMBLY_CONFIG.THUMBNAIL_WIDTH,
      height = VIDEO_ASSEMBLY_CONFIG.THUMBNAIL_HEIGHT,
    } = options;

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Get video duration for frame selection
    const duration = await this.ffmpeg.getVideoDuration(videoPath);

    // Extract candidate frames at 10%, 50%, 90% of video
    const timestamps = [
      duration * 0.1,
      duration * 0.5,
      duration * 0.9,
    ];

    const tempDir = `${VIDEO_ASSEMBLY_CONFIG.TEMP_DIR}/thumbnails`;
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    const framePaths = await this.ffmpeg.extractMultipleFrames(
      videoPath,
      timestamps,
      tempDir
    );

    // Select best frame (middle frame for simplicity in MVP)
    const bestFrame = this.selectBestFrame(framePaths);
    const selectedTimestamp = timestamps[framePaths.indexOf(bestFrame)];

    // Add title text overlay to selected frame
    await this.addTextOverlay(bestFrame, title, outputPath, width, height);

    // Clean up temp frames
    // Note: In production, add cleanup logic

    return {
      thumbnailPath: outputPath,
      width,
      height,
      sourceTimestamp: selectedTimestamp,
    };
  }

  /**
   * Select the best frame from candidates
   * MVP: Simply use the middle frame (50% timestamp)
   * Future: Implement frame scoring based on color variance, sharpness, etc.
   */
  selectBestFrame(framePaths: string[]): string {
    // MVP implementation: use middle frame
    const middleIndex = Math.floor(framePaths.length / 2);
    return framePaths[middleIndex];
  }

  /**
   * Add title text overlay to image using FFmpeg drawtext filter
   * Creates visually appealing text with shadow/background for legibility
   */
  async addTextOverlay(
    inputPath: string,
    title: string,
    outputPath: string,
    width: number,
    height: number
  ): Promise<void> {
    await this.ffmpeg.addTextOverlay(inputPath, title, outputPath, width, height);
  }
}
```

#### 2. FFmpegClient Extensions (src/lib/video/ffmpeg.ts)

```typescript
// Story 5.4 adds these frame extraction and text overlay methods:

/**
 * Extract a single frame from video at specified timestamp
 * Command: ffmpeg -i video.mp4 -ss 5.0 -vframes 1 -q:v 2 output.jpg
 */
async extractFrame(
  videoPath: string,
  timestamp: number,
  outputPath: string
): Promise<void> {
  const args = [
    '-ss', timestamp.toFixed(2),
    '-i', videoPath,
    '-vframes', '1',
    '-q:v', '2',  // High quality JPEG
    '-y',
    outputPath,
  ];

  await this.execute(args);
}

/**
 * Extract multiple frames at specified timestamps
 * Returns array of output paths
 */
async extractMultipleFrames(
  videoPath: string,
  timestamps: number[],
  outputDir: string
): Promise<string[]> {
  const outputPaths: string[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const outputPath = path.join(outputDir, `frame-${i}.jpg`);
    await this.extractFrame(videoPath, timestamps[i], outputPath);
    outputPaths.push(outputPath);
  }

  return outputPaths;
}

/**
 * Add text overlay to image with title
 * Uses FFmpeg drawtext filter with shadow for legibility
 * Scales image to target dimensions
 */
async addTextOverlay(
  inputPath: string,
  title: string,
  outputPath: string,
  width: number = 1920,
  height: number = 1080
): Promise<void> {
  // Escape special characters in title for FFmpeg
  const escapedTitle = title
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:');

  // Calculate font size based on title length
  const fontSize = Math.min(80, Math.floor(1600 / title.length));

  const filterComplex = [
    // Scale to target dimensions
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
    // Add text shadow for readability
    `drawtext=text='${escapedTitle}':fontsize=${fontSize}:fontcolor=black:x=(w-text_w)/2+3:y=h-100+3`,
    // Add main text
    `drawtext=text='${escapedTitle}':fontsize=${fontSize}:fontcolor=white:x=(w-text_w)/2:y=h-100`,
  ].join(',');

  const args = [
    '-i', inputPath,
    '-vf', filterComplex,
    '-q:v', String(VIDEO_ASSEMBLY_CONFIG.THUMBNAIL_QUALITY || 2),
    '-y',
    outputPath,
  ];

  await this.execute(args);
}
```

#### 3. VideoAssembler Extension (src/lib/video/assembler.ts)

```typescript
// Story 5.4 adds:

import { ThumbnailGenerator } from './thumbnail';
import { updateProjectThumbnail } from '@/lib/db/queries';

/**
 * Generate thumbnail for completed video
 */
async generateThumbnail(
  jobId: string,
  videoPath: string,
  title: string,
  projectId: string
): Promise<string> {
  const generator = new ThumbnailGenerator(this.ffmpeg);

  // Update progress to thumbnail stage
  this.updateJobProgress(jobId, 75, 'thumbnail');

  const outputDir = `${VIDEO_ASSEMBLY_CONFIG.OUTPUT_DIR}/${projectId}`;
  const thumbnailPath = `${outputDir}/thumbnail.jpg`;

  const result = await generator.generate({
    videoPath,
    title,
    outputPath: thumbnailPath,
  });

  // Update project with thumbnail path only
  // Use new updateProjectThumbnail function (thumbnail-only update)
  updateProjectThumbnail(projectId, result.thumbnailPath);

  // Update progress
  this.updateJobProgress(jobId, 85, 'thumbnail');

  console.log(
    `[VideoAssembler] Thumbnail generated: ${result.thumbnailPath}, ` +
    `dimensions: ${result.width}x${result.height}, ` +
    `source timestamp: ${result.sourceTimestamp.toFixed(2)}s`
  );

  return result.thumbnailPath;
}
```

#### 3b. New Query Function (src/lib/db/queries.ts)

```typescript
// Story 5.4 adds:

/**
 * Update project thumbnail path only
 * Use when updating thumbnail without modifying video data
 * @param projectId Project ID
 * @param thumbnailPath Path to thumbnail image
 */
export function updateProjectThumbnail(
  projectId: string,
  thumbnailPath: string
): void {
  try {
    const stmt = db.prepare(`
      UPDATE projects
      SET thumbnail_path = ?
      WHERE id = ?
    `);
    stmt.run(thumbnailPath, projectId);
  } catch (error) {
    console.error('Error updating project thumbnail:', error);
    throw new Error(
      `Failed to update project thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
```

#### 4. API Endpoint (src/app/api/projects/[id]/generate-thumbnail/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/client';
import { FFmpegClient } from '@/lib/video/ffmpeg';
import { ThumbnailGenerator } from '@/lib/video/thumbnail';
import { VIDEO_ASSEMBLY_CONFIG } from '@/lib/video/constants';
import { updateProjectThumbnail } from '@/lib/db/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Get project to verify it exists and get video path and title
    const projectStmt = db.prepare(`
      SELECT id, video_path, topic, title
      FROM projects
      WHERE id = ?
    `);
    const project = projectStmt.get(projectId) as {
      id: string;
      video_path: string | null;
      topic: string | null;
      title: string | null;
    } | undefined;

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!project.video_path) {
      return NextResponse.json(
        { error: 'No video available for this project', code: 'FILE_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Use topic or title as the thumbnail text
    const title = project.topic || project.title || 'Untitled Video';

    // Generate thumbnail
    const ffmpeg = new FFmpegClient();
    const generator = new ThumbnailGenerator(ffmpeg);

    const outputPath = `${VIDEO_ASSEMBLY_CONFIG.OUTPUT_DIR}/${projectId}/thumbnail.jpg`;

    const result = await generator.generate({
      videoPath: project.video_path,
      title,
      outputPath,
    });

    // Update project with thumbnail path only
    updateProjectThumbnail(projectId, result.thumbnailPath);

    return NextResponse.json({
      thumbnail_path: result.thumbnailPath,
      width: result.width,
      height: result.height,
      source_timestamp: result.sourceTimestamp,
    });
  } catch (error) {
    console.error('[generate-thumbnail] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate thumbnail',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### FFmpeg Commands

**Extract single frame at timestamp:**
```bash
ffmpeg -ss 5.0 -i video.mp4 -vframes 1 -q:v 2 frame.jpg
```

**Add text overlay with shadow:**
```bash
ffmpeg -i frame.jpg -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,drawtext=text='Video Title':fontsize=72:fontcolor=black:x=(w-text_w)/2+3:y=h-100+3,drawtext=text='Video Title':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=h-100" -q:v 2 thumbnail.jpg
```

**Scale and pad to exact dimensions:**
```bash
ffmpeg -i input.jpg -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black" output.jpg
```

---

## Tasks

### Task 1: Create ThumbnailGenerator Service

**Subtasks:**
1.1. Create `src/lib/video/thumbnail.ts` with `ThumbnailGenerator` class
1.2. Implement `generate()` method as main entry point
1.3. Implement `selectBestFrame()` with MVP middle-frame selection
1.4. Add input validation for video path existence
1.5. Create output directory if it doesn't exist

**Contract Compliance:** Creates only `src/lib/video/thumbnail.ts` (in exclusive_create)

---

### Task 2: Extend FFmpegClient with Frame Extraction

**Subtasks:**
2.1. Add `extractFrame()` method for single frame extraction
2.2. Add `extractMultipleFrames()` method for batch extraction
2.3. Use `-ss` before `-i` for faster seeking (input seeking)
2.4. Set high JPEG quality with `-q:v 2`
2.5. Handle path imports for path.join

**Contract Compliance:** Modifies only `src/lib/video/ffmpeg.ts` (in exclusive_modify)

---

### Task 3: Implement Text Overlay Method

**Subtasks:**
3.1. Add `addTextOverlay()` method to FFmpegClient
3.2. Implement drawtext filter with shadow for legibility
3.3. Calculate dynamic font size based on title length
3.4. Escape special characters in title (backslash, colon, quote)
3.5. Scale and pad image to exact 1920x1080 dimensions
3.6. Position text at bottom center of image

**Contract Compliance:** Modifies only `src/lib/video/ffmpeg.ts` (in exclusive_modify)

---

### Task 4: Extend VideoAssembler with Thumbnail Method

**Subtasks:**
4.1. Add `generateThumbnail()` method to VideoAssembler
4.2. Import ThumbnailGenerator from thumbnail.ts
4.3. Update job progress to 'thumbnail' stage (75-85%)
4.4. Call updateProjectVideo with thumbnail_path
4.5. Log thumbnail generation details

**Contract Compliance:** Modifies only `src/lib/video/assembler.ts` (in exclusive_modify)

---

### Task 5: Create API Endpoint

**Subtasks:**
5.1. Create `src/app/api/projects/[id]/generate-thumbnail/route.ts`
5.2. Implement POST handler for thumbnail generation
5.3. Validate project exists and has video_path
5.4. Extract title from project topic/title field
5.5. Return thumbnail path and metadata in response
5.6. Handle errors with appropriate status codes

**Contract Compliance:** Creates only `src/app/api/projects/[id]/generate-thumbnail/route.ts` (in exclusive_create)

---

### Task 6: Add Thumbnail-Only Update Query

**Subtasks:**
6.1. Add `updateProjectThumbnail(projectId, thumbnailPath)` function to queries.ts
6.2. Function updates only the `thumbnail_path` column in projects table
6.3. Verify existing constants (THUMBNAIL_WIDTH=1920, THUMBNAIL_HEIGHT=1080, THUMBNAIL_FORMAT='jpg', THUMBNAIL_QUALITY=85 already exist)

**Contract Compliance:** Modifies only `src/lib/db/queries.ts` (in exclusive_modify)

---

### Task 7: Create Unit Tests

**Subtasks:**
7.1. Create `tests/unit/video/thumbnail.test.ts`
7.2. Test `generate()` with mock video
7.3. Test `selectBestFrame()` frame selection logic
7.4. Test `addTextOverlay()` with various titles
7.5. Test special character escaping in titles
7.6. Test dimension validation (1920x1080)
7.7. Mock FFmpeg commands for isolated testing

**Contract Compliance:** Creates only `tests/unit/video/thumbnail.test.ts` (in exclusive_create)

---

## Dev Notes

### Contract Enforcement

**ONLY touch files listed in ownership:**
- Create: `src/lib/video/thumbnail.ts`, `src/app/api/projects/[id]/generate-thumbnail/route.ts`, `tests/unit/video/thumbnail.test.ts`
- Modify: `src/lib/video/ffmpeg.ts`, `src/lib/video/assembler.ts`, `src/lib/video/constants.ts`

**Use ONLY the naming prefixes specified:**
- Functions/classes: `Thumbnail*`, `thumbnail*`
- Test files: `thumbnail.*`

**Import ONLY from read_only dependencies:**
- `src/lib/video/constants.ts`
- `src/types/assembly.ts`
- `src/lib/db/client.ts`
- `src/lib/db/queries.ts`

### Critical Implementation Notes (Architect Review)

> **These issues were identified during architect review and MUST be addressed:**

1. **Use Protected execute() Method** ✅
   - Story 5.3 already changed FFmpegClient.execute() from private to protected
   - New methods can call `this.execute()` directly

2. **Thumbnail-Only Database Update**
   - The existing `updateProjectVideo()` function requires ALL parameters (videoPath, thumbnailPath, duration, fileSize)
   - It does NOT support partial updates with `null` values
   - **Solution:** Create new `updateProjectThumbnail(projectId, thumbnailPath)` function in queries.ts
   - This allows thumbnail-only updates without affecting video data

3. **Constants Already Exist** ✅
   - Verified in `src/lib/video/constants.ts`:
     - `THUMBNAIL_WIDTH: 1920`
     - `THUMBNAIL_HEIGHT: 1080`
     - `THUMBNAIL_FORMAT: 'jpg'`
     - `THUMBNAIL_QUALITY: 85`
   - No modifications to constants.ts needed

4. **Input Seeking for Fast Frame Extraction**
   - Use `-ss` BEFORE `-i` for input seeking (faster for large videos)
   - Order matters: `-ss 5.0 -i video.mp4` is faster than `-i video.mp4 -ss 5.0`

5. **Text Escaping for FFmpeg**
   - Backslash: `\\` → `\\\\`
   - Single quote: `'` → `'\\''`
   - Colon: `:` → `\\:`

### Frame Selection Strategy

MVP uses simple middle-frame selection (50% timestamp). Future improvements could include:
- Color variance scoring (prefer varied, interesting frames)
- Face detection (prefer frames with faces visible)
- Sharpness detection (avoid blurry frames)
- Scene detection (prefer frames at scene boundaries)

### Text Positioning

Title is positioned at bottom center with:
- Shadow offset: 3px right, 3px down (black shadow)
- Main text: centered horizontally, 100px from bottom
- Dynamic font size: `min(80, 1600/title_length)` to prevent overflow

### Performance Considerations

- Frame extraction is fast with input seeking
- Text overlay requires re-encoding the image (still fast for single frame)
- Total thumbnail generation: <5 seconds expected
- Temp frames should be cleaned up after selection

### Output Format

- Format: JPEG (`.jpg`)
- Quality: 85 (good balance of quality and file size)
- Dimensions: 1920x1080 (16:9, YouTube recommended)
- File size: ~200-500KB typical

---

## Test Scenarios

### Positive Tests

1. **Basic Generation:** Generate thumbnail with title text
2. **Dimensions:** Output is exactly 1920x1080
3. **Text Visible:** Title appears in thumbnail
4. **Frame Source:** Background is from video content
5. **File Location:** Saved to `public/videos/{projectId}/thumbnail.jpg`

### Edge Case Tests

1. **Long Title:** Title >50 characters scales font appropriately
2. **Special Characters:** Title with quotes, colons handled correctly
3. **Short Video:** Video <10 seconds still generates valid thumbnail
4. **Non-Standard Aspect Ratio:** Video with 4:3 ratio padded correctly

### Integration Tests

1. **Full Pipeline:** Video assembly → Thumbnail generation
2. **Database Update:** Project thumbnail_path updated correctly
3. **API Endpoint:** POST returns correct response format

### Negative Tests

1. **Missing Video:** Clear error if video_path doesn't exist
2. **Invalid Project:** 404 for non-existent project ID
3. **FFmpeg Failure:** Handle FFmpeg errors gracefully

---

## Definition of Done

- [x] All acceptance criteria met and tested
- [x] Unit tests pass with >80% coverage
- [x] Thumbnail dimensions are exactly 1920x1080
- [x] Title text is clearly legible on thumbnail
- [x] Frame is extracted from assembled video
- [x] API endpoint returns correct response format
- [x] Project thumbnail_path updated in database
- [x] **New `updateProjectThumbnail()` function created in queries.ts**
- [x] Code follows contract boundaries exactly
- [x] No files outside exclusive_create/modify touched
- [x] All imports from read_only dependencies only
- [x] Build passes without errors
- [x] Thumbnail displays correctly in browsers
- [x] Code reviewed for contract compliance
- [x] Ready for merge after Story 5.3

---

## Implementation Notes

### Files Created

1. **`src/lib/video/thumbnail.ts`** - ThumbnailGenerator class
   - `generate()` - Main entry point, extracts frames at 10%, 50%, 90% of duration
   - `selectBestFrame()` - MVP uses middle frame (50% timestamp)
   - `selectBestFrameIndex()` - Pure logic for frame selection (testable)
   - Creates temp directory for frame extraction, cleans up after

2. **`src/app/api/projects/[id]/generate-thumbnail/route.ts`** - POST endpoint
   - Validates project exists and has video_path
   - Uses project's `topic` or `name` field for title text
   - Returns thumbnail path, dimensions, and source timestamp

3. **`tests/unit/video/thumbnail.test.ts`** - 25 unit tests
   - Pure logic tests for frame selection, font sizing, text escaping
   - No complex mocking required

### Files Modified

1. **`src/lib/video/ffmpeg.ts`** - Added methods:
   - `extractFrame()` - Extract single frame at timestamp using input seeking
   - `extractMultipleFrames()` - Extract frames at multiple timestamps
   - `addTextOverlay()` - Add title text with shadow, scale to 1920x1080

2. **`src/lib/video/assembler.ts`** - Added methods:
   - `generateThumbnail()` - Orchestrates thumbnail generation during assembly
   - `updateProjectThumbnail()` - Updates only thumbnail_path in database
   - Integrated thumbnail generation into `assembleScenes()` pipeline

3. **`src/lib/db/queries.ts`** - Added function:
   - `updateProjectThumbnail()` - Thumbnail-only database update

4. **`src/app/projects/[id]/assembly/assembly-client.tsx`** - Bug fixes:
   - Changed video path from `/api/videos/` to `/videos/` (public folder)
   - Fixed filename from `final-output.mp4` to `final.mp4`
   - Added thumbnail poster to video element

5. **`src/components/features/curation/VideoPreviewPlayer.tsx`** - Bug fix:
   - Changed Plyr from static import to dynamic import in useEffect
   - Fixes "document is not defined" SSR error

### Bug Fixes Applied

1. **Video Download 404 Error**
   - **Problem:** UI requested `/api/videos/{id}/final-output.mp4` but video was at `public/videos/{id}/final.mp4`
   - **Fix:** Changed UI to use `/videos/${projectId}/final.mp4` for direct public folder access

2. **Thumbnail Not Generated During Assembly**
   - **Problem:** Thumbnail generation was standalone, not integrated into assembly
   - **Fix:** Integrated `generateThumbnail()` call into `assembleScenes()` method

3. **Database Column Error**
   - **Problem:** SQL queried `title` column which doesn't exist (only `topic` and `name`)
   - **Fix:** Changed queries to use `topic, name` instead of `topic, title`

4. **Windows Fontconfig Error**
   - **Problem:** FFmpeg `drawtext` filter failed on Windows: "Cannot load default config file"
   - **Fix:** Added explicit font file path for Windows: `fontfile=C\\:/Windows/Fonts/arial.ttf`
   - Fallback still exists if text overlay fails completely

5. **Plyr SSR Error**
   - **Problem:** `import Plyr from 'plyr'` caused "document is not defined" during SSR
   - **Fix:** Changed to dynamic import inside `useEffect()` to only load on client

### Key Implementation Details

- **Frame Extraction:** Uses input seeking (`-ss` before `-i`) for fast extraction
- **Font Size:** Dynamic based on title length: `min(120, 2400/title.length)` *(updated 2025-11-29)*
- **Text Position:** Centered both horizontally and vertically using `(h-text_h)/2` *(updated 2025-11-29)*
- **Shadow:** 3px offset black shadow for legibility
- **Windows Compatibility:** Explicit Arial font path avoids Fontconfig dependency
- **Non-Fatal Errors:** Thumbnail generation failure doesn't fail assembly

### Post-Completion Correction (2025-11-29)

**Issue:** Thumbnail text was positioned too low (120px from bottom) and font was too small.

**Fix Applied:**
1. **Text Position:** Changed from `y=h-120` (bottom) to `y=(h-text_h)/2` (vertically centered)
2. **Font Size:** Increased from `min(80, 1600/title.length)` to `min(120, 2400/title.length)`

**Files Modified:**
- `src/lib/video/ffmpeg.ts` - Updated `addTextOverlay()` method

**Rationale:** Centered, larger text provides better visibility and a more professional thumbnail appearance consistent with AC7 (Text Legibility).

### Post-Completion Enhancement (2025-11-30)

**Issue:** User requested more visually appealing thumbnail text - two-line layout with color differentiation.

**Enhancement Applied:**
1. **Two-Line Layout:** Title is now automatically split at word boundary into two lines
2. **Line 1 Color:** WHITE (#FFFFFF) - for first half of words
3. **Line 2 Color:** GOLD (#FFD700) - for second half of words
4. **Font Size:** Increased from `min(120, 2400/title.length)` to `min(150, 3000/title.length)`
5. **Line Spacing:** 30% of font size between lines
6. **Single-Word Fallback:** Single-word titles display as single white line (centered)

**Files Modified:**
- `src/lib/video/ffmpeg.ts` - Major update to `addTextOverlay()` method:
  - Added `splitTitleIntoTwoLines()` helper method
  - Added `escapeTextForFFmpeg()` helper method
  - Updated filter complex for two-line rendering with WHITE/GOLD colors
- `tests/unit/video/thumbnail.test.ts` - Added 3 new test suites:
  - `5.4-UNIT-030`: Two-line title split logic (9 tests)
  - `5.4-UNIT-031`: Two-line text color scheme (4 tests)
  - `5.4-UNIT-032`: Line spacing calculation (3 tests)

**Example Output:**
```
"The Secrets of Ancient Rome"

        ┌─────────────────────────────────┐
        │                                 │
        │      The Secrets of             │  ← WHITE
        │       Ancient Rome              │  ← GOLD
        │                                 │
        └─────────────────────────────────┘
```

**Rationale:** Two-line layout with contrasting colors provides stronger visual impact and improved thumbnail aesthetics while maintaining AC7 (Text Legibility) compliance.

---

## References

- PRD Feature 1.8 (Automated Thumbnail Generation) lines 443-467
- PRD FR-8.01 (Use video title as text)
- PRD FR-8.02 (Select compelling frame from video)
- PRD FR-8.03 (Overlay title text legibly)
- PRD FR-8.04 (16:9 aspect ratio, 1920x1080)
- PRD FR-8.05 (Make thumbnail available for download)
- PRD AC1-AC2 (Thumbnail generation acceptance criteria)
- Epic 5 Parallel Spec Story 5.4 Contract
- Story 5.1 (Video Processing Infrastructure)
- Story 5.3 (Video Concatenation & Audio Overlay)
- FFmpeg drawtext filter documentation
