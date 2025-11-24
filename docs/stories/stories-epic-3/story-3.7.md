# Story 3.7: Computer Vision Content Filtering

## Story Info
- **Epic:** 3 - Visual Content Sourcing
- **Story ID:** 3.7
- **Title:** Computer Vision Content Filtering
- **Status:** Done
- **Created:** 2025-11-22
- **Completed:** 2025-11-23
- **Priority:** High

## User Story

**As a** creator generating video content,
**I want** the system to filter out low-quality videos using computer vision analysis (face detection, OCR, label verification) and strip audio from downloaded segments,
**So that** I receive only pure B-roll footage without talking heads, captions, or irrelevant content, and can preview videos silently.

## Description

This story implements a comprehensive two-tier content filtering system to ensure high-quality pure B-roll footage for video creators. The system combines local keyword filtering (Tier 1) with Google Cloud Vision API analysis (Tier 2) to identify and filter out videos with talking heads, burned-in captions, and content that doesn't match the scene theme.

**Key Capabilities:**

1. **Tier 1 - Local Filtering (Fast, Free):**
   - Keyword-based filtering of video titles/descriptions
   - Removal of reaction, commentary, and vlog content
   - Prioritization of B-roll indicators (cinematic, 4K, stock footage)
   - Audio stripping from all downloaded segments using FFmpeg

2. **Tier 2 - Google Cloud Vision API (Accurate):**
   - Thumbnail pre-filtering before video download (reduces bandwidth by 30-50%)
   - Face detection to identify talking heads (>15% frame area threshold)
   - Text detection (OCR) to identify burned-in captions/overlays
   - Label detection to verify content matches scene theme
   - Quality scoring (cv_score) based on combined analysis

3. **Frontend Enhancement:**
   - Silent video indicator in VideoPreviewPlayer component
   - Visual cue that audio removal is intentional, not a bug

**Processing Flow:**
```
YouTube Results → Tier 1 Keyword Filtering → Thumbnail Pre-Filter (Vision API)
→ Download Segment (with audio stripping) → Frame Extraction
→ Frame Analysis (Face, Text, Labels) → CV Score Calculation
→ Database Update → Quality-Ranked Results
```

**Benefits:**
- Eliminates talking heads, reaction content, and commentary videos
- Filters burned-in captions and text overlays
- Verifies content relevance through label matching
- Reduces wasted bandwidth through thumbnail pre-filtering
- Provides silent previews suitable for B-roll curation workflow
- Graceful fallback when API quota exceeded

## Acceptance Criteria

### Keyword Filtering (AC33-34)

**AC33: Keyword Filter Removes Low-Quality Content**
- **Given** YouTube search results for a scene
- **When** content filtering is applied
- **Then** videos with titles containing "reaction", "reacts", "commentary", "my thoughts", "review", "tier list", "ranking", "explained", or "vlog" must be filtered out

**AC34: Keyword Filter Prioritizes B-Roll Indicators**
- **Given** filtered YouTube search results
- **When** quality ranking is applied
- **Then** videos with "stock footage", "cinematic", "4K", "no text", or "gameplay only" in titles must be ranked higher

### Audio Stripping (AC35-36)

**AC35: Audio Stripping Implementation**
- **Given** a video segment is downloaded for preview
- **When** the download process completes
- **Then** the saved .mp4 file must contain no audio track (stripped using FFmpeg -an flag, verifiable with ffprobe)

**AC36: Audio Stripping Performance**
- **Given** a video segment download
- **When** audio stripping is applied
- **Then** the stripping process must add less than 1 second to total download time

### Thumbnail Pre-Filtering (AC37-38)

**AC37: Thumbnail Pre-Filter Implementation**
- **Given** YouTube video results after keyword filtering
- **When** thumbnail pre-filtering runs
- **Then** YouTube thumbnails must be analyzed using Vision API FACE_DETECTION and TEXT_DETECTION before downloading video segments

**AC38: Thumbnail Pre-Filter Effectiveness**
- **Given** a set of YouTube video results
- **When** thumbnail pre-filtering completes
- **Then** downloads must be reduced by approximately 30-50% by filtering videos with faces/text in thumbnails early

### Face Detection (AC39-40)

**AC39: Face Detection Threshold**
- **Given** a downloaded video segment with extracted frames
- **When** FACE_DETECTION analyzes the frames
- **Then** videos with face bounding box area exceeding 15% of total frame area must be filtered out

**AC40: Face Detection Accuracy**
- **Given** a benchmark test with 20 talking head videos and 20 B-roll videos
- **When** face detection is applied to all samples
- **Then** at least 80% of talking head videos must be correctly identified (16/20 minimum)

### Text/Caption Detection (AC41-42)

**AC41: Text Detection Implementation**
- **Given** a downloaded video segment with extracted frames
- **When** TEXT_DETECTION (OCR) analyzes the frames
- **Then** videos with burned-in captions or significant text overlays must be detected and filtered/ranked lower

**AC42: OCR Detection Accuracy**
- **Given** a benchmark test with 20 captioned videos and 20 clean videos
- **When** OCR detection is applied to all samples
- **Then** at least 80% of captioned videos must be correctly identified (16/20 minimum)

### Label Verification (AC43-44)

**AC43: Label Matching Implementation**
- **Given** a scene about "mountain landscape" and a video segment
- **When** LABEL_DETECTION analyzes the frames
- **Then** at least 1 of the top 3 expected labels (e.g., "mountain", "landscape", "nature") must be present in the video's detected labels

**AC44: Label Mismatch Handling**
- **Given** a video segment that doesn't match expected scene labels
- **When** CV score is calculated
- **Then** videos with 0 matching labels must be filtered out or ranked significantly lower (cv_score penalty of 0.3+)

### CV Score Calculation (AC45-46)

**AC45: CV Score Formula**
- **Given** Vision API analysis results for a video
- **When** CV score is calculated
- **Then** the score must be 0-1 based on:
  - Base score: 1.0
  - Talking head (face >15%): -0.5 penalty
  - Small faces (face 5-15%): -0.2 penalty
  - Captions detected: -0.3 penalty
  - Label match bonus: +0.3 * matchScore (0-1)
  - Final score clamped to 0-1 range

**AC46: CV Score Database Storage**
- **Given** a video suggestion with CV analysis complete
- **When** results are saved
- **Then** cv_score must be correctly stored in visual_suggestions.cv_score column (REAL type, 0-1 range)

### API Quota & Fallback (AC47-49)

**AC47: API Quota Tracking**
- **Given** Vision API calls being made
- **When** quota is tracked
- **Then** the system must count usage against 1,000 units/month limit (3 units per image: FACE_DETECTION + TEXT_DETECTION + LABEL_DETECTION)

**AC48: Quota Exceeded Fallback**
- **Given** Vision API quota has been exceeded
- **When** the system attempts CV filtering
- **Then** the system must gracefully fall back to keyword-only filtering (Tier 1)

**AC49: Fallback Reliability**
- **Given** Vision API quota is exceeded or API fails
- **When** fallback is activated
- **Then** visual sourcing must continue without failure, using keyword-only results

### Performance (AC50-52)

**AC50: CV Filtering Performance**
- **Given** a downloaded video segment
- **When** full CV analysis runs (frame extraction + Vision API + scoring)
- **Then** the process must complete in less than 5 seconds per video suggestion

**AC51: Frame Extraction Accuracy**
- **Given** a downloaded video segment
- **When** frames are extracted
- **Then** exactly 3 frames must be extracted at 10%, 50%, and 90% of video duration
5
**AC52: FFmpeg Dependency Check**
- **Given** FFmpeg is not installed or not in PATH
- **When** frame extraction is attempted
- **Then** an actionable error message must be displayed: "FFmpeg not found. Install FFmpeg and ensure it's in PATH"

### Manual Validation (AC53)

**AC53: B-Roll Quality Validation**
- **Given** 10 sample scenes processed through CV filtering
- **When** results are manually reviewed
- **Then** at least 80% of results must be pure B-roll (no talking heads, no burned-in captions)

### Silent Video Indicator - Frontend (AC54-57)

**AC54: Mute Indicator Display**
- **Given** the VideoPreviewPlayer component
- **When** rendering a video preview
- **Then** a static mute icon (muted speaker emoji) must be displayed in bottom-left of controls bar, before time display

**AC55: Mute Indicator Tooltip**
- **Given** the mute indicator in VideoPreviewPlayer
- **When** user hovers over the icon
- **Then** a tooltip must appear with text "Audio removed for preview"

**AC56: Volume Control Removal**
- **Given** the VideoPreviewPlayer component
- **When** controls are rendered
- **Then** there must be no volume slider, mute button, or unmute option

**AC57: Keyboard Shortcuts Removal**
- **Given** the VideoPreviewPlayer component
- **When** user presses M, Up Arrow, or Down Arrow keys
- **Then** no volume-related action must be triggered (these shortcuts are removed)

## Technical Tasks

### Task 1: Implement Keyword Filtering (Tier 1) [AC33, AC34]

- [x] **1.1** Create/update `lib/youtube/filter-results.ts` with keyword filtering function
- [x] **1.2** Implement `filterByKeywords()` function with configurable filter patterns
  ```typescript
  const FILTER_PATTERNS = [
    'reaction', 'reacts', 'commentary', 'my thoughts',
    'review', 'tier list', 'ranking', 'explained', 'vlog'
  ];
  ```
- [x] **1.3** Implement B-roll prioritization patterns
  ```typescript
  const PRIORITY_PATTERNS = [
    'stock footage', 'cinematic', '4K', 'no text', 'gameplay only'
  ];
  ```
- [x] **1.4** Add scoring boost for videos matching priority patterns
- [x] **1.5** Integrate keyword filtering into existing filter pipeline after initial results
- [x] **1.6** Add logging for filtered/prioritized videos
- [x] **1.7** Write unit tests for keyword filtering with sample titles

### Task 2: Implement Audio Stripping [AC35, AC36]

- [x] **2.1** Update `lib/video/downloader.ts` to include audio stripping via yt-dlp
- [x] **2.2** Add `--postprocessor-args "ffmpeg:-an"` flag to yt-dlp command
  ```typescript
  const command = `yt-dlp "https://youtube.com/watch?v=${videoId}" \
    --download-sections "*0-${segmentDuration}" \
    -f "best[height<=720]" \
    --postprocessor-args "ffmpeg:-an" \
    -o "${outputPath}"`;
  ```
- [x] **2.3** Verify audio stripping with ffprobe validation function
  ```typescript
  async function verifyNoAudio(filePath: string): Promise<boolean> {
    const result = await exec(`ffprobe -i "${filePath}" -show_streams -select_streams a`);
    return result.stdout.trim() === ''; // No audio streams
  }
  ```
- [x] **2.4** Add performance timing for audio stripping overhead
- [x] **2.5** Write tests verifying downloaded segments have no audio track

### Task 3: Set Up Google Cloud Vision API Client [AC47, AC48, AC49]

- [x] **3.1** Add `@google-cloud/vision` package to dependencies
  ```bash
  npm install @google-cloud/vision@^4.0.0
  ```
- [x] **3.2** Create `lib/vision/client.ts` with VisionAPIClient class
- [x] **3.3** Implement constructor with API key configuration from environment variable
  ```typescript
  class VisionAPIClient {
    private client: vision.ImageAnnotatorClient;
    private quotaTracker: QuotaTracker;

    constructor() {
      // Use service account JSON credentials (GOOGLE_APPLICATION_CREDENTIALS env var)
      // or explicit keyFilename for authentication
      const credentialsPath = process.env.GOOGLE_CLOUD_VISION_CREDENTIALS_PATH;
      if (!credentialsPath && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error('Vision API credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_VISION_CREDENTIALS_PATH');
      }

      this.client = credentialsPath
        ? new vision.ImageAnnotatorClient({ keyFilename: credentialsPath })
        : new vision.ImageAnnotatorClient(); // Uses GOOGLE_APPLICATION_CREDENTIALS
      this.quotaTracker = new QuotaTracker(1000); // 1000 units/month free tier
    }
  }
  ```
- [x] **3.4** Implement QuotaTracker class with monthly tracking
  ```typescript
  class QuotaTracker {
    private used: number = 0;
    private limit: number;
    private resetDate: Date;

    constructor(limit: number) {
      this.limit = limit;
      this.resetDate = this.getNextMonthStart();
      this.loadFromStorage(); // Persist quota state
    }

    increment(units: number): void { /* ... */ }
    isExceeded(): boolean { return this.used >= this.limit; }
    getUsage(): { used: number; limit: number } { /* ... */ }
  }
  ```
- [x] **3.5** Add graceful fallback method for quota exceeded
- [x] **3.6** Implement retry logic with exponential backoff for API failures
- [x] **3.7** Add logging for API calls and quota usage
- [x] **3.8** Write unit tests with mocked Vision API responses

### Task 4: Implement Thumbnail Pre-Filtering [AC37, AC38]

- [x] **4.1** Create `lib/vision/thumbnail-filter.ts` module
- [x] **4.2** Implement `analyzeThumbnail()` method in VisionAPIClient
  ```typescript
  async analyzeThumbnail(thumbnailUrl: string): Promise<ThumbnailAnalysis> {
    if (this.quotaTracker.isExceeded()) {
      throw new VisionAPIError(VisionErrorCode.QUOTA_EXCEEDED);
    }

    const [result] = await this.client.annotateImage({
      image: { source: { imageUri: thumbnailUrl } },
      features: [
        { type: 'FACE_DETECTION' },
        { type: 'TEXT_DETECTION' }
      ]
    });

    this.quotaTracker.increment(2); // 2 features = 2 units
    return this.parseThumbnailResult(result);
  }
  ```
- [x] **4.3** Implement pre-filter logic (filter if face detected OR significant text)
- [x] **4.4** Integrate thumbnail pre-filtering into visual sourcing pipeline
- [x] **4.5** Add metrics tracking for download reduction percentage
- [x] **4.6** Write integration tests with sample YouTube thumbnails

### Task 5: Implement Frame Extraction [AC51, AC52]

- [x] **5.1** Create `lib/vision/frame-extractor.ts` module
- [x] **5.2** Implement FrameExtractor class with FFmpeg integration
  ```typescript
  class FrameExtractor {
    async extractFrames(videoPath: string, count: number = 3): Promise<Buffer[]> {
      const duration = await this.getVideoDuration(videoPath);
      const timestamps = [
        duration * 0.10,  // 10%
        duration * 0.50,  // 50%
        duration * 0.90   // 90%
      ];

      const frames: Buffer[] = [];
      for (const ts of timestamps) {
        const outputPath = path.join(os.tmpdir(), `frame-${Date.now()}-${ts}.jpg`);
        await execAsync(
          `ffmpeg -ss ${ts} -i "${videoPath}" -vframes 1 -f image2 "${outputPath}"`
        );
        frames.push(fs.readFileSync(outputPath));
        fs.unlinkSync(outputPath); // Cleanup
      }
      return frames;
    }

    private async getVideoDuration(videoPath: string): Promise<number> {
      const result = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      );
      return parseFloat(result.stdout.trim());
    }
  }
  ```
- [x] **5.3** Add FFmpeg dependency check with actionable error message
- [x] **5.4** Implement temp file cleanup on error
- [x] **5.5** Write unit tests for frame extraction at correct timestamps

### Task 6: Implement Face, Text, and Label Detection [AC39, AC40, AC41, AC42, AC43, AC44]

- [x] **6.1** Create `lib/vision/analyze-content.ts` module
- [x] **6.2** Implement `analyzeFrames()` method in VisionAPIClient
  ```typescript
  async analyzeFrames(frames: Buffer[]): Promise<VisionAnalysisResult[]> {
    const results: VisionAnalysisResult[] = [];

    for (const frame of frames) {
      const [result] = await this.client.annotateImage({
        image: { content: frame.toString('base64') },
        features: [
          { type: 'FACE_DETECTION' },
          { type: 'TEXT_DETECTION' },
          { type: 'LABEL_DETECTION' }
        ]
      });

      this.quotaTracker.increment(3); // 3 features = 3 units
      results.push(this.parseFrameResult(result));
    }

    return results;
  }
  ```
- [x] **6.3** Implement `calculateFaceArea()` method
  ```typescript
  calculateFaceArea(faces: FaceAnnotation[], frameSize: { width: number; height: number }): number {
    const totalArea = frameSize.width * frameSize.height;
    let faceArea = 0;

    for (const face of faces) {
      const box = face.boundingPoly.vertices;
      const width = Math.abs(box[1].x - box[0].x);
      const height = Math.abs(box[2].y - box[1].y);
      faceArea += width * height;
    }

    return faceArea / totalArea; // Returns 0-1 percentage
  }
  ```
- [x] **6.4** Implement `verifyLabels()` for label matching
  ```typescript
  verifyLabels(detected: Label[], expected: string[]): { matched: string[]; matchScore: number } {
    const matched: string[] = [];

    for (const label of detected) {
      for (const exp of expected) {
        if (label.description.toLowerCase().includes(exp.toLowerCase()) ||
            exp.toLowerCase().includes(label.description.toLowerCase())) {
          matched.push(label.description);
        }
      }
    }

    const matchScore = expected.length > 0
      ? Math.min(1, matched.length / Math.min(3, expected.length))
      : 0;

    return { matched, matchScore };
  }
  ```
- [x] **6.5** Create ContentAnalyzer class to orchestrate full analysis
- [x] **6.6** Implement `getFrameDimensions()` to extract frame size from video metadata via FFmpeg
  ```typescript
  async getFrameDimensions(videoPath: string): Promise<{ width: number; height: number }> {
    const result = await execAsync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`
    );
    const [width, height] = result.stdout.trim().split('x').map(Number);
    return { width, height };
  }
  ```
- [x] **6.7** Aggregate results from 3 frames (use worst-case for faces/text, best for labels)
- [x] **6.8** Write benchmark tests with 20 talking head + 20 B-roll samples
- [x] **6.9** Write benchmark tests with 20 captioned + 20 clean samples

### Task 7: Implement CV Score Calculation and Database Integration [AC45, AC46]

- [x] **7.1** Implement `calculateCVScore()` method in ContentAnalyzer
  ```typescript
  calculateCVScore(result: VisionAnalysisResult): number {
    let score = 1.0;

    // Penalize face area (talking heads)
    if (result.faceDetection.hasTalkingHead) {
      score -= 0.5; // Heavy penalty for >15% face area
    } else if (result.faceDetection.totalFaceArea > 0.05) {
      score -= 0.2; // Small penalty for 5-15% face area
    }

    // Penalize text/captions
    if (result.textDetection.hasCaption) {
      score -= 0.3;
    }

    // Bonus for matching labels
    score += result.labelDetection.matchScore * 0.3;

    return Math.max(0, Math.min(1, score)); // Clamp to 0-1
  }
  ```
- [x] **7.2** Add Drizzle migration for `cv_score` column in `visual_suggestions` table
  ```sql
  ALTER TABLE visual_suggestions ADD COLUMN cv_score REAL;
  ```
- [x] **7.3** Update `lib/db/queries.ts` with cv_score update function
- [x] **7.4** Implement expected labels generation using LLM
  ```typescript
  async function generateExpectedLabels(sceneText: string, contentType: ContentType): Promise<string[]> {
    const prompt = `Generate 3-5 Google Cloud Vision labels expected for this ${contentType} scene:
    Scene: "${sceneText}"

    Return only label names, one per line. Examples: "car", "mountain", "video game", "crowd".`;

    const result = await llmProvider.chat([{ role: 'user', content: prompt }]);
    return result.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  }
  ```
- [x] **7.5** Write unit tests for CV score calculation formula
- [x] **7.6** Write database integration tests for cv_score storage

### Task 8: Create CV Filter API Endpoint [AC50]

- [x] **8.1** Create `app/api/projects/[id]/cv-filter/route.ts`
- [x] **8.2** Implement POST handler for manual CV filtering trigger
  ```typescript
  export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const projectId = params.id;

    // Get all suggestions with downloaded segments
    const suggestions = await getVisualSuggestionsForCVFilter(projectId);

    const results = [];
    for (const suggestion of suggestions) {
      try {
        const cvResult = await contentAnalyzer.analyzeVideoContent(
          suggestion.defaultSegmentPath,
          await generateExpectedLabels(suggestion.sceneText, suggestion.contentType)
        );

        await updateCVScore(suggestion.id, cvResult.cvScore);
        results.push({ suggestionId: suggestion.id, cvScore: cvResult.cvScore });
      } catch (error) {
        results.push({ suggestionId: suggestion.id, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: results.filter(r => !r.error).length,
      filteredCount: results.filter(r => r.cvScore && r.cvScore < 0.5).length,
      updatedScores: results.filter(r => r.cvScore),
      errors: results.filter(r => r.error)
    });
  }
  ```
- [x] **8.3** Integrate CV filtering into main visual sourcing pipeline
- [x] **8.4** Add performance timing and logging
- [x] **8.5** Implement <5 second per video timeout
- [x] **8.6** Write API endpoint tests with mocked dependencies

### Task 9: Implement Silent Video Indicator (Frontend) [AC54, AC55, AC56, AC57]

- [x] **9.1** Locate `src/components/features/curation/VideoPreviewPlayer.tsx`
- [x] **9.2** Remove volume control components (slider, mute button)
- [x] **9.3** Add static mute indicator with emoji icon
  ```typescript
  // Silent video indicator - audio stripped intentionally
  <div
    className="mute-indicator flex items-center text-muted-foreground"
    title="Audio removed for preview"
    aria-label="Audio removed for preview"
  >
    <span className="text-base" aria-hidden="true">&#x1F507;</span>
  </div>
  ```
- [x] **9.4** Position indicator bottom-left of controls bar, before time display
- [x] **9.5** Style with Slate 400 color (text-muted-foreground)
- [x] **9.6** Remove keyboard event handlers for M, Up Arrow, Down Arrow keys
- [x] **9.7** Update ARIA labels for accessibility per UX spec v3.4
- [x] **9.8** Write component tests for indicator display and tooltip

### Task 10: Testing and Validation [AC40, AC42, AC53]

- [x] **10.1** Create mocked Vision API responses fixture file
- [x] **10.2** Write unit tests for all filtering and scoring functions
- [x] **10.3** Create benchmark test suite for face detection accuracy
  - [x] Collect 20 talking head video samples
  - [x] Collect 20 B-roll video samples
  - [x] Run detection and measure accuracy (>80% target)
- [x] **10.4** Create benchmark test suite for OCR accuracy
  - [x] Collect 20 captioned video samples
  - [x] Collect 20 clean video samples
  - [x] Run detection and measure accuracy (>80% target)
- [x] **10.5** Perform manual validation with 10 sample scenes
- [x] **10.6** Add performance tests verifying <5 second per video
- [x] **10.7** Test fallback behavior when Vision API quota exceeded
- [x] **10.8** Test error scenarios (FFmpeg missing, API failures, network errors)

## Dependencies

### External Services
- **Google Cloud Vision API** - Face detection, OCR, label detection (1,000 units/month free tier)
- **YouTube Data API v3** - Already integrated from Stories 3.1-3.5
- **LLM Provider (Ollama/Gemini)** - For generating expected labels from scene text

### External Tools
- **FFmpeg** - Frame extraction and audio stripping (must be installed and in PATH)
- **yt-dlp** - Video segment downloads (already integrated from Story 3.6)
- **ffprobe** - Audio track verification (bundled with FFmpeg)

### NPM Dependencies
```json
{
  "@google-cloud/vision": "^4.0.0"
}
```

### Internal Dependencies
- **Story 3.2b** - Entity extraction and content type detection (EntityExtractionResult)
- **Story 3.6** - Default segment download service (VideoDownloader, default_segment_path)
- **Epic 2** - Scene data (scene text, duration, voiceover)
- **Epic 1** - LLM provider abstraction (lib/llm/provider.ts)

### Configuration Requirements
```env
# Vision API Authentication (one of these required for CV filtering)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# OR
GOOGLE_CLOUD_VISION_CREDENTIALS_PATH=/path/to/service-account.json

# Already required from previous stories
YOUTUBE_API_KEY=your_youtube_api_key
LLM_PROVIDER=ollama|gemini

# Optional - defaults to system PATH
FFMPEG_PATH=ffmpeg
```

## Technical Notes

### Data Models

```typescript
// Vision API Analysis Result (from Tech Spec)
interface VisionAnalysisResult {
  faceDetection: {
    faces: Array<{
      boundingBox: { x: number; y: number; width: number; height: number };
      confidence: number;
    }>;
    totalFaceArea: number;       // Percentage of frame area covered by faces
    hasTalkingHead: boolean;     // True if face area > 15%
  };
  textDetection: {
    texts: Array<{
      text: string;
      boundingBox: { x: number; y: number; width: number; height: number };
    }>;
    hasCaption: boolean;         // True if burned-in captions detected
    textCoverage: number;        // Percentage of frame with text
  };
  labelDetection: {
    labels: Array<{
      description: string;
      score: number;             // Confidence 0-1
    }>;
    matchedLabels: string[];     // Labels matching expected scene labels
    matchScore: number;          // 0-1 based on label matches
  };
  cvScore: number;               // Overall quality score 0-1 (higher = better B-roll)
}

// Error Codes
enum VisionErrorCode {
  MISSING_API_KEY = 'VISION_API_KEY_NOT_CONFIGURED',
  INVALID_API_KEY = 'VISION_API_KEY_INVALID',
  QUOTA_EXCEEDED = 'VISION_QUOTA_EXCEEDED',
  RATE_LIMITED = 'VISION_RATE_LIMITED',
  NETWORK_ERROR = 'VISION_NETWORK_ERROR',
  FRAME_EXTRACTION_FAILED = 'FRAME_EXTRACTION_FAILED',
  ANALYSIS_FAILED = 'VISION_ANALYSIS_FAILED'
}
```

### File Structure

**Files to Create:**
- `lib/vision/client.ts` - VisionAPIClient with quota management
- `lib/vision/analyze-content.ts` - ContentAnalyzer for face/text/label detection
- `lib/vision/frame-extractor.ts` - FFmpeg-based frame extraction
- `lib/vision/thumbnail-filter.ts` - Thumbnail pre-filtering logic
- `app/api/projects/[id]/cv-filter/route.ts` - Manual CV filter endpoint

**Files to Modify:**
- `lib/youtube/filter-results.ts` - Add keyword filtering
- `lib/video/downloader.ts` - Add audio stripping (-an flag)
- `lib/db/schema.ts` - Add cv_score column migration
- `lib/db/queries.ts` - Add CV score update function
- `components/features/visual-curation/VideoPreviewPlayer.tsx` - Add silent indicator

### Architecture Patterns

**Two-Tier Filtering Flow:**
```
[YouTube Results]
    ↓
[Tier 1: Keyword Filter] ← Fast, free, local
    ↓
[Tier 1: B-Roll Priority] ← Boost cinematic/4K
    ↓
[Tier 2: Thumbnail Pre-Filter] ← Vision API (reduces downloads 30-50%)
    ↓
[Download Segment + Strip Audio] ← yt-dlp + FFmpeg
    ↓
[Frame Extraction] ← 3 frames at 10%, 50%, 90%
    ↓
[Tier 2: Face/Text/Label Analysis] ← Vision API
    ↓
[CV Score Calculation] ← 0-1 quality score
    ↓
[Database Update] ← visual_suggestions.cv_score
```

**Fallback Strategy:**
```typescript
async function filterWithFallback(
  suggestions: VisualSuggestion[],
  expectedLabels: string[]
): Promise<VisualSuggestion[]> {
  // Check quota before attempting Vision API
  if (visionClient.isQuotaExceeded()) {
    console.warn('Vision API quota exceeded, falling back to keyword-only filtering');
    return filterByKeywordsOnly(suggestions);
  }

  try {
    return await filterWithVision(suggestions, expectedLabels);
  } catch (error) {
    if (error.code === VisionErrorCode.QUOTA_EXCEEDED ||
        error.code === VisionErrorCode.RATE_LIMITED) {
      console.warn('Vision API unavailable, falling back:', error.message);
      return filterByKeywordsOnly(suggestions);
    }
    throw error; // Re-throw unexpected errors
  }
}
```

### UX Specifications

**Silent Video Indicator (from UX Design Specification v3.4, Section 8.13):**
- Icon: Unicode character U+1F507 (speaker with cancellation stroke)
- Position: Bottom-left of controls bar, before time display
- Size: 16px, matching other control icons
- Color: `text-muted-foreground` (Slate 400, #94a3b8)
- Tooltip: "Audio removed for preview"
- ARIA label: "Audio removed for preview"
- Purpose: Communicate that silence is intentional, not broken playback

**Removed Keyboard Shortcuts:**
- M (mute toggle) - removed
- Up Arrow (volume up) - removed
- Down Arrow (volume down) - removed

**Remaining Keyboard Shortcuts:**
- Space: Play/Pause
- Esc: Close preview
- Left/Right Arrow: Rewind/Forward 5 seconds
- F: Fullscreen toggle

## Definition of Done

### Code Quality
- [x] All TypeScript code compiles without errors
- [x] ESLint passes with no warnings
- [x] All functions have JSDoc documentation
- [x] Code follows project conventions and patterns

### Testing
- [x] Unit tests for all filtering and scoring functions
- [x] Integration tests for Vision API client (with mocks)
- [x] Benchmark tests for face detection (>80% accuracy)
- [x] Benchmark tests for OCR detection (>80% accuracy)
- [x] API endpoint tests for /cv-filter
- [x] Component tests for VideoPreviewPlayer silent indicator
- [x] Performance tests (<5 seconds per video)

### Functionality
- [x] Keyword filtering removes reaction/commentary/vlog videos
- [x] B-roll indicators boost video rankings
- [x] Audio successfully stripped from all downloaded segments
- [x] Thumbnail pre-filtering reduces downloads by 30-50%
- [x] Face detection filters >15% face area videos
- [x] Text detection identifies burned-in captions
- [x] Label verification matches scene content
- [x] CV score correctly calculated and stored
- [x] Fallback works when Vision API quota exceeded
- [x] Silent video indicator displays correctly

### Documentation
- [x] README updated with Vision API setup instructions
- [x] Environment variable documentation updated
- [x] API endpoint documentation added
- [x] Technical notes capture implementation decisions

### Deployment
- [x] Database migration for cv_score column applied
- [x] Environment variables documented
- [x] FFmpeg dependency documented in setup guide
- [x] Build passes successfully

## References

### PRD References
- PRD Feature 1.5 (AI-Powered Visual Sourcing) - lines 192-241
- PRD Feature 1.5 (Enhanced Query Generation) - lines 209-213
- PRD Feature 1.5 (Pure B-Roll Content Filtering) - lines 219-222
- PRD Feature 1.5 (Google Cloud Vision API Integration) - lines 223-230
- PRD Feature 1.5 AC9-AC14 - lines 276-301

### Tech Spec References
- Tech Spec Epic 3, Story 3.7 - lines 537-774
- Tech Spec AC33-AC57 - lines 942-967
- Tech Spec Data Models (VisionAnalysisResult) - lines 124-151
- Tech Spec VisionAPIClient Methods - lines 243-257
- Tech Spec ContentAnalyzer Methods - lines 251-257
- Tech Spec FrameExtractor Methods - lines 259-262

### UX Design Specification References
- UX Design Spec v3.4, Section 8.13 (VideoPreviewPlayer) - lines 2665-2756
- Silent Video Indicator specification - lines 2709-2716
- Keyboard shortcuts (removed volume controls) - lines 2722-2728
- Accessibility requirements - lines 2744-2756

### Architecture References
- Architecture.md - Vision API integration patterns
- Architecture.md - Database schema (visual_suggestions table)
- Architecture.md - File storage conventions (.cache/videos/)

### Epics.md Reference
- Story 3.7: Computer Vision Content Filtering - lines 909-997
