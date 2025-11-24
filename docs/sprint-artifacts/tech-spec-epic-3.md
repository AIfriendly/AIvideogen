# Epic Technical Specification: Visual Content Sourcing (YouTube API)

Date: 2025-11-22 (Updated)
Author: master
Epic ID: 3
Status: Production Ready
Version: 3.0

**Version History:**
- v3.0 (2025-11-22): Added Stories 3.2b (Enhanced Query Generation) and 3.7 (Computer Vision Content Filtering)
- v2.0 (2025-11-16): Added Stories 3.4 (Duration Filtering) and 3.6 (Default Segment Downloads)
- v1.0 (2025-11-13): Initial specification for Stories 3.1-3.5

---

## Overview

Epic 3 implements the AI-powered visual content sourcing system that automatically analyzes script scenes and sources relevant **pure B-roll** video clips from YouTube. This system leverages the YouTube Data API v3 to search YouTube's massive content library, providing creators with intelligently curated visual suggestions for each scene of their video script. The sourcing process includes scene text analysis using LLM, **content-type aware query generation with entity extraction**, YouTube API integration, **two-tier content filtering (local keyword filtering + Google Cloud Vision API)**, quality ranking (including duration-based filtering), default video segment downloads with **audio stripping** for instant preview, and seamless workflow integration with the content generation pipeline from Epic 2.

This epic transforms the manual process of searching for video clips into an automated, AI-driven workflow that understands scene context, retrieves appropriate visual content from YouTube, filters by duration appropriateness, **validates content quality using computer vision (face detection, OCR, label verification)**, and pre-downloads video segments for immediate preview in Epic 4. It supports diverse content types including educational videos, gaming footage, nature documentaries, tutorials, and general B-roll, with **intelligent filtering to ensure pure B-roll results free of commentary, captions, and reaction content**.

## Objectives and Scope

**In Scope:**
- YouTube Data API v3 client implementation with authentication and quota management
- LLM-based scene text analysis for visual theme extraction
- Intelligent search query generation optimized for YouTube search
- **Content-type aware query generation with entity extraction (Story 3.2b)**
- **Platform-optimized search queries with B-roll quality terms and negative term injection (Story 3.2b)**
- YouTube video search with metadata retrieval (including duration)
- Content filtering and quality ranking algorithms with duration-based filtering (1x-3x scene duration, max 5 min)
- **Two-tier content filtering: local keyword filtering + Google Cloud Vision API (Story 3.7)**
- **Google Cloud Vision API integration for face detection, OCR, and label verification (Story 3.7)**
- **Thumbnail pre-filtering to reduce bandwidth and API calls (Story 3.7)**
- **Audio stripping from downloaded video segments (Story 3.7)**
- Default video segment download service using yt-dlp (Story 3.6)
- Visual suggestions database storage and retrieval with duration, download tracking, and CV score
- Automatic workflow trigger after voiceover generation (Epic 2)
- Progress tracking UI during visual sourcing and segment downloads
- **Silent video indicator in VideoPreviewPlayer component (Story 3.7)**
- Support for diverse content types (gaming, tutorials, nature, educational)
- Error handling for API failures, quota limits, download failures, Vision API quota, and edge cases

**Out of Scope:**
- Stock footage API integration (Pexels, Pixabay) - Post-MVP Epic 8
- Manual search functionality within UI - Post-MVP Enhancement 2.3
- Custom segment selection (start time trimming) - Epic 4
- Visual curation UI for selecting clips - Epic 4
- Advanced content filtering with visual analysis - Post-MVP Enhancement 2.2

## System Architecture Alignment

This epic integrates with the existing architecture by extending the API layer with YouTube integration capabilities, adding video download infrastructure using yt-dlp, **adding Google Cloud Vision API for content validation**, leveraging the LLM provider abstraction from Epic 1, and building upon the database schema from Epic 2. Key architectural components:

- **lib/youtube/**: New module for YouTube API integration including client, analysis, and filtering with duration support
- **lib/youtube/entity-extractor.ts**: Entity extraction for specific subjects (Story 3.2b)
- **lib/youtube/query-optimizer.ts**: Platform-optimized query generation with negative terms (Story 3.2b)
- **lib/vision/**: New module for Google Cloud Vision API integration (Story 3.7)
- **lib/vision/client.ts**: VisionAPIClient with quota management
- **lib/vision/analyze-content.ts**: Face detection, OCR, and label verification
- **lib/vision/frame-extractor.ts**: FFmpeg-based frame extraction from video segments
- **lib/video/**: New module for yt-dlp video download service (Story 3.6)
- **Database Extensions**: visual_suggestions table with foreign keys to scenes, duration tracking, download status, and cv_score
- **API Endpoints**: /api/projects/[id]/generate-visuals, /api/projects/[id]/visual-suggestions, /api/projects/[id]/download-default-segments, and /api/projects/[id]/cv-filter
- **LLM Integration**: Reuses provider abstraction for scene analysis prompts and expected label generation
- **File Storage**: .cache/videos/{projectId}/ for downloaded video segments (audio stripped)
- **Workflow State**: Updates project.current_step progression from 'voiceover' to 'visual-sourcing' to 'visual-curation'
- **Error Handling**: Implements exponential backoff, quota tracking, download retry logic, Vision API fallback, and graceful degradation

## Detailed Design

### Services and Modules

| Module | Responsibility | Inputs | Outputs | Owner |
|--------|---------------|---------|---------|-------|
| YouTubeAPIClient | YouTube Data API v3 interface with auth and quota management | API key, search queries | Video metadata (including duration), error states | lib/youtube/client.ts |
| SceneAnalyzer | Analyze scene text for visual themes using LLM | Scene text, analysis prompt | Search queries, content type hints | lib/youtube/analyze-scene.ts |
| EntityExtractor | Extract specific entities (boss names, events, concepts) from scene text (Story 3.2b) | Scene text | Entities, content type classification | lib/youtube/entity-extractor.ts |
| QueryOptimizer | Generate platform-optimized queries with negative terms and B-roll quality terms (Story 3.2b) | Entities, content type | Optimized search queries | lib/youtube/query-optimizer.ts |
| ContentFilter | Filter and rank YouTube search results by quality, spam, and duration | Raw video results, scene duration, filter config | Ranked suggestions (5-8 per scene) | lib/youtube/filter-results.ts |
| VisionAPIClient | Google Cloud Vision API interface with quota management (Story 3.7) | API key, image data | Face detection, OCR, labels, error states | lib/vision/client.ts |
| ContentAnalyzer | Analyze video frames for faces, text, and labels (Story 3.7) | Video frames, expected labels | CV analysis results, cv_score | lib/vision/analyze-content.ts |
| FrameExtractor | Extract sample frames from video segments using FFmpeg (Story 3.7) | Video file path | Extracted frame images (3 frames) | lib/vision/frame-extractor.ts |
| VideoDownloader | Download default video segments using yt-dlp with audio stripping (Story 3.6, 3.7) | Video ID, segment duration, output path | Downloaded file path (no audio), error status | lib/video/downloader.ts |
| Visual Sourcing API | Orchestrate visual generation for all scenes | Project ID | Visual suggestions in DB | /api/projects/[id]/generate-visuals |
| Download Segments API | Batch download default segments for all suggestions (Story 3.6) | Project ID | Download completion status | /api/projects/[id]/download-default-segments |
| CV Filter API | Run computer vision filtering on downloaded segments (Story 3.7) | Project ID | Updated cv_scores, filtered results | /api/projects/[id]/cv-filter |
| Suggestions API | Retrieve stored visual suggestions | Project/Scene ID | Formatted suggestions array | /api/projects/[id]/visual-suggestions |
| VisualSourcingLoader | Display progress during visual sourcing and downloads | Project state | Loading UI with progress | components/features/visual-sourcing/ |

### Data Models and Contracts

```typescript
// Visual Suggestions Table Schema
interface VisualSuggestion {
  id: string;                    // Primary key
  scene_id: string;              // Foreign key to scenes.id
  video_id: string;              // YouTube video ID
  title: string;                 // Video title
  thumbnail_url: string;         // Thumbnail image URL
  channel_title: string;         // YouTube channel name
  embed_url: string;             // Embeddable video URL
  rank: number;                  // Suggestion ranking (1-8)
  duration: number;              // Video duration in seconds (Story 3.4)
  default_segment_path?: string; // Path to downloaded default segment (Story 3.6)
  download_status: 'pending' | 'downloading' | 'complete' | 'error'; // Download status (Story 3.6)
  cv_score?: number;             // Computer vision quality score 0-1 (Story 3.7)
  created_at: string;            // ISO timestamp
}

// Content Type Classification (Story 3.2b)
type ContentType = 'gameplay' | 'tutorial' | 'nature' | 'documentary' | 'historical' | 'conceptual' | 'general';

// Entity Extraction Result (Story 3.2b)
interface EntityExtractionResult {
  contentType: ContentType;      // Detected content type
  entities: string[];            // Extracted entities (boss names, events, etc.)
  primarySubject: string;        // Main subject of the scene
  keywords: string[];            // Relevant keywords for search
  negativeTerms: string[];       // Terms to exclude (-reaction, -review, etc.)
  qualityTerms: string[];        // B-roll quality terms (+cinematic, +4K, etc.)
}

// Vision API Analysis Result (Story 3.7)
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

// Scene Analysis Result
interface SceneAnalysis {
  primary_query: string;         // Main search query
  alternative_queries: string[]; // 2-3 alternative queries
  content_type: 'gameplay' | 'tutorial' | 'nature' | 'documentary' | 'general';
  keywords: string[];            // Extracted keywords
  mood: string;                  // Scene mood/atmosphere
}

// YouTube Search Parameters
interface YouTubeSearchParams {
  q: string;                     // Search query
  part: 'snippet';               // API response parts
  type: 'video';                 // Content type
  videoEmbeddable: true;         // Only embeddable videos
  videoDuration?: 'short' | 'medium' | 'long'; // Optional duration filter
  maxResults: number;            // 10-15 per query
  relevanceLanguage: string;     // Default 'en'
}

// Filter Configuration
interface FilterConfig {
  minViewCount: number;          // Default 1000
  maxTitleEmojis: number;        // Default 5
  maxTitleCapsPercent: number;   // Default 0.5
  preferCreativeCommons: boolean;// Default true
  durationRatioMin: number;      // Default 1 (1x scene duration)
  durationRatioMax: number;      // Default 3 (3x scene duration)
  maxDurationSeconds: number;    // Default 300 (5 minutes absolute cap)
  contentTypeFilters: Map<ContentType, FilterRules>;
}

// Download Segment Parameters (Story 3.6)
interface DownloadSegmentParams {
  videoId: string;               // YouTube video ID
  sceneDuration: number;         // Scene voiceover duration (seconds)
  sceneNumber: number;           // Scene number for file naming
  projectId: string;             // Project ID for directory structure
  bufferSeconds: number;         // Extra seconds to download (default 5)
  quality: string;               // Video quality (default 'best[height<=720]')
}
```

### APIs and Interfaces

```typescript
// POST /api/projects/[id]/generate-visuals
Request: { projectId: string }
Response: {
  success: boolean;
  scenesProcessed: number;
  suggestionsGenerated: number;
  errors?: string[];
}

// GET /api/projects/[id]/visual-suggestions
Request: { projectId: string, sceneId?: string }
Response: {
  suggestions: VisualSuggestion[];
  totalScenes: number;
  scenesWithSuggestions: number;
}

// POST /api/projects/[id]/download-default-segments (Story 3.6)
Request: { projectId: string }
Response: {
  success: boolean;
  downloadedCount: number;
  failedCount: number;
  errors?: Array<{ sceneId: string; videoId: string; error: string }>;
}

// YouTubeAPIClient Methods
class YouTubeAPIClient {
  constructor(apiKey: string);
  searchVideos(query: string, options?: SearchOptions): Promise<VideoResult[]>;
  getQuotaUsage(): { used: number; limit: number };
  isQuotaExceeded(): boolean;
}

// VideoDownloader Methods (Story 3.6, 3.7)
class VideoDownloader {
  constructor();
  downloadDefaultSegment(params: DownloadSegmentParams): Promise<string>;
  getDownloadStatus(projectId: string, sceneNumber: number): Promise<DownloadStatus>;
  cancelDownload(projectId: string, sceneNumber: number): Promise<void>;
}

// VisionAPIClient Methods (Story 3.7)
class VisionAPIClient {
  constructor(apiKey: string);
  analyzeThumbnail(thumbnailUrl: string): Promise<VisionAnalysisResult>;
  analyzeFrames(frames: Buffer[]): Promise<VisionAnalysisResult>;
  calculateFaceArea(faces: FaceAnnotation[]): number;
  getQuotaUsage(): { used: number; limit: number };
  isQuotaExceeded(): boolean;
}

// ContentAnalyzer Methods (Story 3.7)
class ContentAnalyzer {
  constructor(visionClient: VisionAPIClient);
  analyzeVideoContent(videoPath: string, expectedLabels: string[]): Promise<VisionAnalysisResult>;
  calculateCVScore(result: VisionAnalysisResult): number;
  shouldFilter(result: VisionAnalysisResult): boolean;
}

// FrameExtractor Methods (Story 3.7)
class FrameExtractor {
  extractFrames(videoPath: string, count?: number): Promise<Buffer[]>;
  getFrameAtTimestamp(videoPath: string, timestamp: number): Promise<Buffer>;
}

// EntityExtractor Methods (Story 3.2b)
class EntityExtractor {
  constructor(llmProvider: LLMProvider);
  extractEntities(sceneText: string): Promise<EntityExtractionResult>;
  detectContentType(sceneText: string): ContentType;
}

// QueryOptimizer Methods (Story 3.2b)
class QueryOptimizer {
  optimizeQuery(entities: EntityExtractionResult): string[];
  addNegativeTerms(query: string, contentType: ContentType): string;
  addQualityTerms(query: string, contentType: ContentType): string;
}

// POST /api/projects/[id]/cv-filter (Story 3.7)
Request: { projectId: string }
Response: {
  success: boolean;
  processedCount: number;
  filteredCount: number;
  updatedScores: Array<{ suggestionId: string; cvScore: number }>;
  errors?: Array<{ suggestionId: string; error: string }>;
}

// Error Codes
enum YouTubeErrorCode {
  MISSING_API_KEY = 'YOUTUBE_API_KEY_NOT_CONFIGURED',
  INVALID_API_KEY = 'YOUTUBE_API_KEY_INVALID',
  QUOTA_EXCEEDED = 'YOUTUBE_QUOTA_EXCEEDED',
  RATE_LIMITED = 'YOUTUBE_RATE_LIMITED',
  NETWORK_ERROR = 'YOUTUBE_NETWORK_ERROR'
}

enum DownloadErrorCode {
  YTDLP_NOT_INSTALLED = 'YTDLP_NOT_INSTALLED',
  VIDEO_UNAVAILABLE = 'VIDEO_UNAVAILABLE',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  STORAGE_ERROR = 'STORAGE_ERROR'
}

// Vision API Error Codes (Story 3.7)
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

### Duration Filtering Logic (Story 3.4 Enhancement)

**Purpose:** Filter YouTube videos to ensure they are appropriate length for scene voiceovers (not too short, not too long).

**Filtering Rules:**
- Minimum duration: 1x scene voiceover duration (e.g., 10s scene → minimum 10s video)
- Maximum duration: 3x scene voiceover duration OR 5 minutes (300s), whichever is smaller
- Rationale: Videos too short lack content; videos too long waste download time and editing effort

**Implementation:**
```typescript
// lib/youtube/filter-results.ts
function filterByDuration(
  results: YouTubeVideo[],
  sceneDuration: number
): YouTubeVideo[] {
  const minDuration = sceneDuration; // 1x ratio
  const maxDuration = Math.min(sceneDuration * 3, 300); // 3x or 5 min max

  return results.filter(video => {
    const duration = video.durationSeconds;
    return duration >= minDuration && duration <= maxDuration;
  });
}
```

**Duration Calculation Examples:**
- **10s scene:** Accepts 10s-30s videos (max 30s)
- **90s scene:** Accepts 90s-270s videos (max 270s = 4.5 min)
- **120s scene:** Accepts 120s-300s videos (max 300s = 5 min, NOT 360s due to cap)

**Fallback Logic:**
If all results are filtered out by duration:
1. Relax duration threshold to 1x-4x (instead of 1x-3x)
2. If still no results, relax view count threshold
3. If still no results, relax title spam filters
4. Return at least 1-3 suggestions if ANY results exist from YouTube search

### Default Segment Download Service (Story 3.6)

**Goal:** Download default video segments (first N seconds) for instant preview in Epic 4 curation UI.

**Components:**
- `lib/video/downloader.ts` - yt-dlp wrapper with segment support
- `app/api/projects/[id]/download-default-segments/route.ts` - Batch download endpoint

**yt-dlp Integration:**
```typescript
// lib/video/downloader.ts
async function downloadDefaultSegment(
  videoId: string,
  sceneDuration: number,
  sceneNumber: number,
  projectId: string
): Promise<string> {
  const bufferSeconds = 5;
  const segmentDuration = sceneDuration + bufferSeconds;
  const outputPath = `.cache/videos/${projectId}/scene-${sceneNumber}-default.mp4`;

  // yt-dlp command: download first N seconds
  const command = `yt-dlp "https://youtube.com/watch?v=${videoId}" \
    --download-sections "*0-${segmentDuration}" \
    -f "best[height<=720]" \
    -o "${outputPath}"`;

  await execCommand(command);
  return outputPath;
}
```

**File Naming Convention:**
```
Default segments:  .cache/videos/{projectId}/scene-{sceneNumber}-default.mp4
Custom segments:   .cache/videos/{projectId}/scene-{sceneNumber}-custom-{startTimestamp}s.mp4
                   (Custom segments handled in Epic 4)
```

**Key Workflow:**
1. After Story 3.4 filters and ranks suggestions (top 5-8 per scene)
2. For each scene's top suggestion (rank 1):
   - Verify duration <= 3x scene duration (already filtered in Story 3.4)
   - Calculate segment duration: scene duration + 5s buffer
   - Download first N seconds using yt-dlp `--download-sections "*0-{N}"`
   - Save to `.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`
   - Update `visual_suggestions.default_segment_path` and `download_status = 'complete'`
3. Progress indicator: "Downloading preview clips... 2/5 complete"
4. On completion: Users can immediately preview actual footage in Epic 4 curation UI
5. Error handling: Network failures, YouTube restrictions → Mark `download_status = 'error'`, continue with other clips

**Benefits:**
- ✅ Users preview actual footage (not just thumbnails) before selecting in Epic 4
- ✅ "Use Default Segment" button in Epic 4 requires NO download (file already exists, instant playback)
- ✅ Faster Epic 4 curation workflow (no waiting for downloads during selection)
- ✅ Default segments use first N seconds (0:00 start) - predictable, fast, appropriate for most content

**Download Parameters:**
- **Format:** `best[height<=720]` (HD quality, manageable file size ~5-15MB per 30s)
- **Segment:** `*0-{duration}` (from 0:00 to scene_duration + 5s)
- **Buffer:** 5 seconds extra to allow trimming flexibility in Epic 5
- **Quality vs Size:** 720p strikes balance between preview quality and download speed (typically 2-10 seconds download per video)

**Error Recovery:**
- Failed downloads don't block other scenes (continue processing)
- Retry logic: 3 attempts with exponential backoff (2s, 4s, 8s delays)
- Permanent failures (restricted videos, age-gated content) → Mark error, skip retry
- User can manually retry failed downloads in Epic 4 UI
- Graceful degradation: If download fails, users still see thumbnail and can manually download custom segment

### Enhanced Query Generation (Story 3.2b)

**Goal:** Improve search query relevance with content-type awareness, entity extraction, and platform-optimized search patterns for pure B-roll results.

**Components:**
- `lib/youtube/entity-extractor.ts` - LLM-based entity extraction
- `lib/youtube/query-optimizer.ts` - Platform-optimized query generation

**Content Type Detection:**
```typescript
// lib/youtube/entity-extractor.ts
async function detectContentType(sceneText: string): Promise<ContentType> {
  // Use LLM to classify scene into content type
  const prompt = `Classify this scene text into ONE of these types:
  - gaming: Video game content, boss fights, gameplay
  - historical: Historical events, figures, periods
  - conceptual: Abstract concepts, futuristic, hypothetical
  - nature: Wildlife, landscapes, natural phenomena
  - tutorial: How-to, educational step-by-step
  - documentary: Documentary-style factual content
  - general: Everything else

  Scene: "${sceneText}"

  Return ONLY the type name.`;

  const result = await llmProvider.chat([{ role: 'user', content: prompt }]);
  return result.toLowerCase().trim() as ContentType;
}
```

**Entity Extraction:**
```typescript
// lib/youtube/entity-extractor.ts
async function extractEntities(sceneText: string): Promise<EntityExtractionResult> {
  const contentType = await detectContentType(sceneText);

  const prompt = `Extract key entities from this ${contentType} scene for YouTube search:
  Scene: "${sceneText}"

  Return JSON:
  {
    "entities": ["specific names, events, concepts"],
    "primarySubject": "main topic",
    "keywords": ["relevant search keywords"]
  }`;

  const result = await llmProvider.chat([{ role: 'user', content: prompt }]);
  const parsed = JSON.parse(result);

  return {
    contentType,
    entities: parsed.entities,
    primarySubject: parsed.primarySubject,
    keywords: parsed.keywords,
    negativeTerms: getNegativeTermsForType(contentType),
    qualityTerms: getQualityTermsForType(contentType)
  };
}
```

**Query Optimization:**
```typescript
// lib/youtube/query-optimizer.ts
function optimizeQuery(extraction: EntityExtractionResult): string[] {
  const baseQuery = [
    ...extraction.entities,
    ...extraction.keywords
  ].join(' ');

  // Add content-type specific terms
  const typeTerms = getContentTypeTerms(extraction.contentType);
  const qualityQuery = `${baseQuery} ${extraction.qualityTerms.join(' ')}`;

  // Build final queries with negative terms
  const queries = [
    `${qualityQuery} ${extraction.negativeTerms.map(t => `-${t}`).join(' ')}`,
    `${baseQuery} ${typeTerms}`,
    `${extraction.primarySubject} ${typeTerms}`
  ];

  return queries;
}

function getNegativeTermsForType(type: ContentType): string[] {
  const common = ['reaction', 'reacts', 'review', 'tier list', 'ranking', 'vlog', 'my thoughts'];
  const typeSpecific = {
    gaming: ['commentary', 'explained', 'guide'],
    historical: ['explained', 'analysis', 'theory'],
    conceptual: ['explained', 'theory'],
    // ... other types
  };
  return [...common, ...(typeSpecific[type] || [])];
}

function getQualityTermsForType(type: ContentType): string[] {
  const typeQuality = {
    gaming: ['no commentary', 'gameplay only', 'raw gameplay'],
    historical: ['documentary footage', 'archive', 'historical'],
    conceptual: ['cinematic', '4K', 'stock footage'],
    nature: ['documentary', 'wildlife', 'nature'],
    // ... other types
  };
  return ['cinematic', '4K', ...(typeQuality[type] || [])];
}
```

**Examples:**
- **Gaming:** "ornstein smough boss fight dark souls no commentary gameplay only -reaction -review -tier list"
- **Historical:** "winter palace russian revolution documentary footage archive -explained -analysis"
- **Conceptual:** "dystopian city AI robots cinematic 4K stock footage -reaction -review"

### Computer Vision Content Filtering (Story 3.7)

**Goal:** Filter low-quality B-roll using Google Cloud Vision API (face detection, OCR, label verification) and local processing (keyword filtering, audio stripping).

**Architecture: Two-Tier Filtering**
```
Tier 1 (Local - Fast, Free)     Tier 2 (Cloud Vision API - Accurate)
┌─────────────────────────┐     ┌──────────────────────────────────┐
│ Keyword Filtering       │     │ Thumbnail Pre-Filtering          │
│ - Title/description     │     │ - Quick face/text check          │
│ - "reaction", "vlog"    │ --> │ - Reduces downloads by 30-50%    │
│ Audio Stripping         │     │                                  │
│ - FFmpeg -an flag       │     │ Frame Analysis                   │
└─────────────────────────┘     │ - FACE_DETECTION (15% threshold) │
                                │ - TEXT_DETECTION (captions)      │
                                │ - LABEL_DETECTION (verification) │
                                └──────────────────────────────────┘
```

**VisionAPIClient Implementation:**
```typescript
// lib/vision/client.ts
import vision from '@google-cloud/vision';

class VisionAPIClient {
  private client: vision.ImageAnnotatorClient;
  private quotaTracker: QuotaTracker;

  constructor(apiKey: string) {
    this.client = new vision.ImageAnnotatorClient({ apiKey });
    this.quotaTracker = new QuotaTracker(1000); // 1000 units/month free tier
  }

  async analyzeThumbnail(thumbnailUrl: string): Promise<VisionAnalysisResult> {
    if (this.quotaTracker.isExceeded()) {
      throw new Error(VisionErrorCode.QUOTA_EXCEEDED);
    }

    const [result] = await this.client.annotateImage({
      image: { source: { imageUri: thumbnailUrl } },
      features: [
        { type: 'FACE_DETECTION' },
        { type: 'TEXT_DETECTION' },
        { type: 'LABEL_DETECTION' }
      ]
    });

    this.quotaTracker.increment(3); // 3 features = 3 units
    return this.parseResult(result);
  }

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
}
```

**Frame Extraction:**
```typescript
// lib/vision/frame-extractor.ts
import { execSync } from 'child_process';
import * as fs from 'fs';

class FrameExtractor {
  async extractFrames(videoPath: string, count: number = 3): Promise<Buffer[]> {
    const duration = await this.getVideoDuration(videoPath);
    const timestamps = [
      duration * 0.1,  // 10%
      duration * 0.5,  // 50%
      duration * 0.9   // 90%
    ];

    const frames: Buffer[] = [];
    for (const ts of timestamps) {
      const outputPath = `/tmp/frame-${Date.now()}.jpg`;
      execSync(`ffmpeg -ss ${ts} -i "${videoPath}" -vframes 1 -f image2 "${outputPath}"`);
      frames.push(fs.readFileSync(outputPath));
      fs.unlinkSync(outputPath);
    }

    return frames;
  }
}
```

**Content Analysis with CV Score:**
```typescript
// lib/vision/analyze-content.ts
class ContentAnalyzer {
  async analyzeVideoContent(
    videoPath: string,
    expectedLabels: string[]
  ): Promise<VisionAnalysisResult> {
    // Extract 3 frames
    const frames = await this.frameExtractor.extractFrames(videoPath);

    // Analyze each frame
    const results = await Promise.all(
      frames.map(frame => this.visionClient.analyzeFrames([frame]))
    );

    // Aggregate results
    const aggregated = this.aggregateResults(results);

    // Verify labels match expected
    aggregated.labelDetection.matchedLabels = this.verifyLabels(
      aggregated.labelDetection.labels,
      expectedLabels
    );

    // Calculate CV score
    aggregated.cvScore = this.calculateCVScore(aggregated);

    return aggregated;
  }

  calculateCVScore(result: VisionAnalysisResult): number {
    let score = 1.0;

    // Penalize face area (talking heads)
    if (result.faceDetection.hasTalkingHead) {
      score -= 0.5; // Heavy penalty for talking heads
    } else if (result.faceDetection.totalFaceArea > 0.05) {
      score -= 0.2; // Small penalty for small faces
    }

    // Penalize text/captions
    if (result.textDetection.hasCaption) {
      score -= 0.3;
    }

    // Bonus for matching labels
    score += result.labelDetection.matchScore * 0.3;

    return Math.max(0, Math.min(1, score)); // Clamp to 0-1
  }

  verifyLabels(detected: Label[], expected: string[]): string[] {
    const matched: string[] = [];
    for (const label of detected) {
      for (const exp of expected) {
        if (label.description.toLowerCase().includes(exp.toLowerCase()) ||
            exp.toLowerCase().includes(label.description.toLowerCase())) {
          matched.push(label.description);
        }
      }
    }
    return matched;
  }
}
```

**Audio Stripping in Download:**
```typescript
// lib/video/downloader.ts - Updated for Story 3.7
async function downloadDefaultSegment(params: DownloadSegmentParams): Promise<string> {
  const segmentDuration = params.sceneDuration + params.bufferSeconds;
  const outputPath = `.cache/videos/${params.projectId}/scene-${params.sceneNumber}-default.mp4`;

  // yt-dlp command with audio stripping
  const command = `yt-dlp "https://youtube.com/watch?v=${params.videoId}" \
    --download-sections "*0-${segmentDuration}" \
    -f "best[height<=720]" \
    --postprocessor-args "ffmpeg:-an" \
    -o "${outputPath}"`;

  await execCommand(command);
  return outputPath;
}
```

**Expected Labels Generation:**
```typescript
// Called during Story 3.2b entity extraction
async function generateExpectedLabels(sceneText: string, contentType: ContentType): Promise<string[]> {
  const prompt = `Generate 3-5 Google Cloud Vision labels expected for this ${contentType} scene:
  Scene: "${sceneText}"

  Return only label names, one per line. Examples: "car", "mountain", "video game", "crowd".`;

  const result = await llmProvider.chat([{ role: 'user', content: prompt }]);
  return result.split('\n').map(l => l.trim()).filter(l => l.length > 0);
}
```

**Fallback Logic:**
```typescript
// lib/vision/client.ts
async function filterWithFallback(
  suggestions: VisualSuggestion[],
  expectedLabels: string[]
): Promise<VisualSuggestion[]> {
  if (this.quotaTracker.isExceeded()) {
    console.warn('Vision API quota exceeded, falling back to keyword-only filtering');
    return filterByKeywordsOnly(suggestions);
  }

  try {
    return await this.filterWithVision(suggestions, expectedLabels);
  } catch (error) {
    console.error('Vision API error, falling back:', error);
    return filterByKeywordsOnly(suggestions);
  }
}
```

**Silent Video Indicator (Frontend):**
```typescript
// components/features/visual-curation/VideoPreviewPlayer.tsx
export function VideoPreviewPlayer({ videoPath }: Props) {
  return (
    <div className="video-preview-player">
      <video src={videoPath} controls />
      <div className="controls-bar">
        {/* Silent video indicator - no volume controls */}
        <div
          className="mute-indicator text-slate-400"
          title="Audio removed for preview"
          aria-label="Audio removed for preview"
        >
          🔇
        </div>
        <span className="time-display">{formatTime(currentTime)}</span>
      </div>
    </div>
  );
}
```

### Workflows and Sequencing

**Visual Sourcing Workflow (Stories 3.1-3.5):**
1. Trigger: Epic 2 voiceover generation completes → project.current_step = 'visual-sourcing'
2. Load all scenes for project from database (ordered by scene_number)
3. For each scene:
   - Call SceneAnalyzer with scene.text
   - Extract visual themes, generate search queries
   - Execute YouTube searches (primary + alternatives)
   - Aggregate and deduplicate results
   - Apply content filtering (spam, quality, **duration**)
   - Apply quality ranking algorithm
   - Store top 5-8 suggestions in visual_suggestions table with duration and rank
4. Update project.visuals_generated = true
5. Trigger Story 3.6 default segment download workflow
6. Update project.current_step = 'visual-curation' after downloads complete
7. Navigate to Epic 4 Visual Curation UI

**Default Segment Download Workflow (Story 3.6):**
1. Trigger: After Story 3.5 completes (all scenes have visual suggestions)
2. Load all scenes with visual suggestions from database
3. For each scene:
   - Get top-ranked suggestion (rank = 1) from visual_suggestions table
   - Verify scene duration exists (from scenes.duration column)
   - Call VideoDownloader.downloadDefaultSegment() with video ID, scene duration, scene number, project ID
   - Update visual_suggestions.download_status = 'downloading'
   - On success: Update default_segment_path and download_status = 'complete'
   - On failure: Update download_status = 'error', log error, continue with next scene
4. Display progress: "Downloading preview clips... X/Y complete"
5. On completion: All scenes ready for Epic 4 visual curation with instant preview
6. Navigate to Epic 4 Visual Curation UI

**Error Recovery Flow:**
1. Track completion per scene in session
2. On failure, display retry button
3. Retry only failed scenes (skip completed)
4. After 3 attempts, allow manual proceed with partial results
5. Partial downloads: Users can still curate scenes with successful downloads, failed scenes show thumbnail-only

## Non-Functional Requirements

### Performance

- Scene analysis completion: < 5 seconds per scene
- YouTube API search: < 3 seconds per query (excluding network latency)
- Duration filtering: < 50ms per scene (in-memory filtering)
- Total visual sourcing time: < 30 seconds for 5-scene script (excluding downloads)
- Default segment download: < 10 seconds per video on 10Mbps connection (720p, 30s segment ~10MB)
- Total download time: < 60 seconds for 5-scene script (5 parallel downloads)
- Suggestion retrieval: < 100ms from database
- Maximum concurrent API requests: 10 (respecting rate limits)
- Maximum concurrent downloads: 3 (avoid overwhelming network/disk)
- Response caching: 5 minutes for identical queries

### Security

- API key stored in environment variables only (never in code or database)
- API key validation on startup with actionable error messages
- No storage of YouTube video content (only metadata, IDs, and downloaded segments)
- Downloaded segments stored in .cache directory (excluded from git, cleaned on project deletion)
- HTTPS-only communication with YouTube API
- Input sanitization for search queries (prevent injection)
- Input sanitization for file paths (prevent directory traversal)
- Rate limiting on visual generation endpoint (max 1 per project per minute)
- Rate limiting on download endpoint (max 1 per project per 2 minutes)

### Reliability/Availability

- Exponential backoff retry logic (max 3 attempts for API and downloads)
- Graceful degradation when YouTube API unavailable (fallback to keyword extraction)
- Graceful degradation when yt-dlp unavailable (skip downloads, show error message)
- Partial completion recovery (resume from failure point for both sourcing and downloads)
- Fallback to keyword extraction when LLM unavailable
- Empty state handling when no results found
- Quota exceeded handling with user-friendly messaging
- Download failures handled gracefully (continue with other scenes, allow manual retry)
- Storage space validation before downloads (check available disk space)

### Observability

- Log all YouTube API requests with quota usage
- Track scene analysis success/failure rates
- Monitor average suggestions per scene
- Log filter effectiveness (videos filtered vs passed, duration filter hit rate)
- Track API error rates by type
- Session-based progress tracking for debugging
- Log download success/failure rates per scene (Story 3.6)
- Track average download time and file size per video (Story 3.6)
- Monitor disk space usage in .cache/videos/ directory (Story 3.6)
- Alert when .cache directory exceeds 1GB (cleanup recommended)

## Dependencies and Integrations

**External Services:**
- YouTube Data API v3 (requires API key from Google Cloud Console)
- Google Cloud Vision API (requires API key, 1,000 units/month free tier) (Story 3.7)
- LLM Provider (Ollama or Gemini from Epic 1)

**External Tools:**
- yt-dlp (video download tool, installed via pip or npm, version >= 2023.11.16 recommended)
- FFmpeg (for frame extraction and audio stripping, must be in PATH) (Story 3.7)

**NPM Dependencies:**
- @googleapis/youtube (or axios for direct API calls)
- @google-cloud/vision@4.x.x (Google Cloud Vision API client) (Story 3.7)
- Existing: ollama, @google/generative-ai (from Epic 1)

**Internal Dependencies:**
- Epic 1: LLM provider abstraction for scene analysis
- Epic 2: Scene structure, voiceover completion trigger, and scene duration data
- Database: scenes table (Epic 2), new visual_suggestions table with extensions

**Configuration Requirements:**
- YOUTUBE_API_KEY environment variable (required)
- GOOGLE_CLOUD_VISION_API_KEY environment variable (optional, enables Story 3.7 CV filtering)
- LLM_PROVIDER environment variable (from Epic 1)
- YTDLP_PATH environment variable (optional, defaults to 'yt-dlp' in PATH)
- FFMPEG_PATH environment variable (optional, defaults to 'ffmpeg' in PATH) (Story 3.7)
- CACHE_DIR environment variable (optional, defaults to '.cache')
- Daily YouTube API quota: 10,000 units (default free tier)
- Monthly Vision API quota: 1,000 units (default free tier) (Story 3.7)
- Rate limit: 100 requests per 100 seconds
- Disk space: Minimum 500MB free for .cache/videos/ (recommended 2GB for 20+ projects)

## Acceptance Criteria (Authoritative)

**Stories 3.1-3.5 (Original):**
1. **YouTube API client successfully authenticates with valid API key from environment variable**
2. **Missing API key displays actionable error: "YouTube API key not configured. Add YOUTUBE_API_KEY to .env.local"**
3. **Scene text analysis generates relevant search queries within 5 seconds per scene**
4. **YouTube search returns 10-15 video results per query with required metadata (including duration)**
5. **Content filtering removes spam, low-quality videos, AND videos outside duration range (1x-3x scene duration, max 5 min)**
6. **Quality ranking produces diverse, high-quality suggestions (5-8 per scene)**
7. **Visual suggestions stored in database with scene associations, ranking, and duration**
8. **Visual sourcing triggers automatically after Epic 2 voiceover generation**
9. **Progress indicator shows real-time status: "Analyzing scene X of Y..."**
10. **Zero results handling displays helpful empty state message**
11. **API quota exceeded shows user-friendly error with retry guidance**
12. **Partial failure recovery allows retry without regenerating completed scenes**
13. **Project workflow advances from 'visual-sourcing' to 'visual-curation' on completion**
14. **Gaming content filtering successfully identifies "gameplay only" videos**
15. **Creative Commons licensed videos ranked higher when available**

**Story 3.4 Enhancement (Duration Filtering):**
16. **Duration filtering accepts videos between 1x-3x scene duration with 5-minute absolute maximum**
17. **10-second scene accepts 10-30s videos; 120-second scene accepts 120-300s videos (NOT 360s)**
18. **Fallback logic relaxes duration threshold (1x-4x) if all results filtered out**

**Story 3.6 (Default Segment Downloads):**
19. **Default segment download completes within 10 seconds per video on 10Mbps connection (720p quality)**
20. **Default segments stored in .cache/videos/{projectId}/scene-{sceneNumber}-default.mp4 with correct naming convention**
21. **Download failures marked as 'error' status and don't block other downloads (continue processing)**
22. **Progress indicator shows "Downloading preview clips... X/Y complete" during batch download**
23. **Downloaded segments include 5-second buffer beyond scene duration for trimming flexibility**
24. **yt-dlp missing displays actionable error: "yt-dlp not found. Install with: pip install yt-dlp"**
25. **Storage space validation prevents downloads when <100MB disk space available**

**Story 3.2b (Enhanced Query Generation):**
26. **Content type detected correctly for gaming, historical, conceptual, nature, tutorial, and documentary scenes**
27. **Entity extraction identifies specific names (boss names, historical events, concepts) from scene text**
28. **Platform-optimized queries include relevant negative terms (-reaction, -review, -commentary, -tier list, -vlog)**
29. **Queries include B-roll quality terms appropriate to content type (no commentary, gameplay only, cinematic, 4K)**
30. **Gaming scene "Ornstein and Smough" generates query with specific entity names and "no commentary gameplay only"**
31. **Historical scene "Winter Palace" generates query with "documentary footage archive" quality terms**
32. **Query generation completes within 5 seconds per scene (including entity extraction)**

**Story 3.7 (Computer Vision Content Filtering):**
33. **Keyword filtering removes videos with "reaction", "reacts", "commentary", "vlog", "tier list" in titles**
34. **Keyword filtering prioritizes videos with "stock footage", "cinematic", "4K", "no text" in titles**
35. **Audio stripping removes audio track from all downloaded segments (verify with ffprobe -an)**
36. **Audio stripping adds <1 second to download time**
37. **Thumbnail pre-filtering analyzes YouTube thumbnails before downloading video segments**
38. **Thumbnail pre-filtering reduces downloads by 30-50% by filtering videos with faces/text early**
39. **Face detection filters videos with face bounding box area >15% of total frame area**
40. **Face detection correctly identifies >80% of talking head videos (benchmark test with 20 samples)**
41. **Text/caption detection identifies and filters videos with burned-in captions**
42. **OCR correctly identifies >80% of captioned videos (benchmark test with 20 samples)**
43. **Label verification ensures at least 1 of top 3 expected labels present (e.g., "mountain", "landscape" for nature scene)**
44. **Label mismatch filters or significantly ranks lower videos that don't match scene content**
45. **CV score calculated 0-1 based on face area, text detection, and label match (higher = better B-roll)**
46. **cv_score column correctly stored in visual_suggestions database table**
47. **API quota tracking counts usage against 1,000 units/month limit**
48. **Graceful fallback to keyword-only filtering when Vision API quota exceeded**
49. **Fallback does not cause visual sourcing to fail**
50. **CV filtering completes in <5 seconds per video suggestion**
51. **Frame extraction extracts exactly 3 frames at 10%, 50%, 90% of video duration**
52. **FFmpeg missing displays actionable error: "FFmpeg not found. Install FFmpeg and ensure it's in PATH"**
53. **Manual validation shows 80%+ pure B-roll results (no talking heads, no captions) across 10 test scenes**
54. **Silent video indicator (🔇) displays in VideoPreviewPlayer bottom-left controls**
55. **Silent video indicator tooltip shows "Audio removed for preview"**
56. **No volume slider or unmute option in VideoPreviewPlayer**
57. **Keyboard shortcuts M, Up/Down arrows do not trigger any action (removed)**

## Traceability Mapping

| Acceptance Criteria | Spec Section | Component/API | Test Idea |
|-------------------|--------------|---------------|-----------|
| AC1: API Authentication | YouTubeAPIClient | lib/youtube/client.ts | Unit test with valid/invalid keys |
| AC2: Missing API Key Error | Error Handling | client.ts constructor | Test empty env variable |
| AC3: Scene Analysis Speed | SceneAnalyzer | analyze-scene.ts | Performance test with timer |
| AC4: Search Results | YouTube Search | searchVideos() | Integration test with API |
| AC5: Content Filtering | ContentFilter | filter-results.ts | Unit test filter rules |
| AC6: Quality Ranking | Ranking Algorithm | filter-results.ts | Test ranking order |
| AC7: Database Storage | Data Models | saveVisualSuggestions() | Database integration test |
| AC8: Auto Trigger | Workflow | Epic 2 integration | E2E test full flow |
| AC9: Progress UI | VisualSourcingLoader | React component | Component test |
| AC10: Empty State | Error Handling | UI component | Test zero results |
| AC11: Quota Error | Error Handling | API client | Mock quota exceeded |
| AC12: Partial Recovery | Workflow | generate-visuals API | Test retry logic |
| AC13: Workflow State | Project State | Database update | State transition test |
| AC14: Gaming Filter | Content Filtering | filter-config.ts | Test gaming keywords |
| AC15: CC Licensing | Ranking | filter-results.ts | Test license priority |
| AC16: Duration Filtering | ContentFilter | filterByDuration() | Unit test duration ranges |
| AC17: Duration Examples | ContentFilter | filterByDuration() | Test 10s, 120s scenes |
| AC18: Duration Fallback | ContentFilter | filter-results.ts | Test all-filtered scenario |
| AC19: Download Performance | VideoDownloader | downloadDefaultSegment() | Performance test with timer |
| AC20: File Naming | VideoDownloader | File system verification | Test output path correctness |
| AC21: Download Errors | Error Handling | downloader.ts | Mock download failures |
| AC22: Download Progress | DownloadSegmentsAPI | React component | Component test |
| AC23: Buffer Duration | VideoDownloader | yt-dlp command params | Verify segment length |
| AC24: yt-dlp Missing | Error Handling | downloader.ts | Test missing dependency |
| AC25: Storage Validation | Storage Management | File system check | Test low disk space scenario |
| AC26: Content Type Detection | EntityExtractor | detectContentType() | Unit test with gaming/historical/nature scenes |
| AC27: Entity Extraction | EntityExtractor | extractEntities() | Test with specific names and events |
| AC28: Negative Terms | QueryOptimizer | addNegativeTerms() | Verify -reaction, -review in queries |
| AC29: Quality Terms | QueryOptimizer | addQualityTerms() | Verify content-type specific terms |
| AC30: Gaming Query | Story 3.2b | optimizeQuery() | Test Ornstein/Smough query |
| AC31: Historical Query | Story 3.2b | optimizeQuery() | Test Winter Palace query |
| AC32: Query Performance | Story 3.2b | Performance test | Timer test <5s per scene |
| AC33: Keyword Filter Remove | ContentFilter | filterByKeywords() | Test reaction/vlog filtering |
| AC34: Keyword Filter Priority | ContentFilter | filterByKeywords() | Test cinematic/4K prioritization |
| AC35: Audio Stripping | VideoDownloader | yt-dlp -an | ffprobe verification test |
| AC36: Audio Strip Performance | VideoDownloader | Performance test | Timer test <1s overhead |
| AC37: Thumbnail Pre-Filter | VisionAPIClient | analyzeThumbnail() | Integration test with thumbnails |
| AC38: Pre-Filter Reduction | Story 3.7 | Metrics tracking | Track download reduction percentage |
| AC39: Face Detection | VisionAPIClient | calculateFaceArea() | Unit test 15% threshold |
| AC40: Face Detection Accuracy | Story 3.7 | Benchmark test | 20 talking head samples |
| AC41: Text Detection | VisionAPIClient | TEXT_DETECTION | Unit test caption detection |
| AC42: OCR Accuracy | Story 3.7 | Benchmark test | 20 captioned video samples |
| AC43: Label Verification | ContentAnalyzer | verifyLabels() | Test expected label matching |
| AC44: Label Mismatch | ContentAnalyzer | calculateCVScore() | Test ranking penalty |
| AC45: CV Score Calculation | ContentAnalyzer | calculateCVScore() | Unit test score formula |
| AC46: CV Score Storage | Database | visual_suggestions.cv_score | Database integration test |
| AC47: API Quota Tracking | VisionAPIClient | getQuotaUsage() | Unit test quota counter |
| AC48: Quota Fallback | VisionAPIClient | filterWithFallback() | Test fallback to keyword-only |
| AC49: Fallback Reliability | Story 3.7 | Integration test | Verify no failure on fallback |
| AC50: CV Filter Performance | ContentAnalyzer | Performance test | Timer test <5s per video |
| AC51: Frame Extraction | FrameExtractor | extractFrames() | Verify 3 frames at 10/50/90% |
| AC52: FFmpeg Missing | Error Handling | frame-extractor.ts | Test missing dependency |
| AC53: B-Roll Quality | Story 3.7 | Manual validation | 10 scene samples reviewed |
| AC54: Mute Indicator Display | VideoPreviewPlayer | React component | Component test |
| AC55: Mute Tooltip | VideoPreviewPlayer | title attribute | Accessibility test |
| AC56: Volume Control Removal | VideoPreviewPlayer | React component | Verify no volume slider |
| AC57: Keyboard Shortcuts | VideoPreviewPlayer | Event handlers | Test M/Up/Down disabled |

## Risks, Assumptions, Open Questions

**Risks:**
- Risk: YouTube API quota (10,000 units/day) may be insufficient for heavy usage
  - Mitigation: Implement caching, optimize queries, provide quota usage dashboard
- Risk: YouTube search may not return relevant results for abstract concepts
  - Mitigation: Multiple search query variations, fallback keywords, empty state guidance
- Risk: API key exposure if not properly secured
  - Mitigation: Environment variables only, never commit keys, validate on startup
- Risk: yt-dlp download failures for region-restricted or age-gated videos
  - Mitigation: Graceful error handling, retry logic, allow users to select alternative videos in Epic 4
- Risk: Disk space exhaustion from downloaded video segments
  - Mitigation: Storage validation before downloads, automatic cleanup on project deletion, alert at 1GB cache size
- Risk: yt-dlp version incompatibility or breaking changes
  - Mitigation: Document required version (>= 2023.11.16), version check on startup, fallback to thumbnail-only mode
- Risk: Google Cloud Vision API quota (1,000 units/month) may be insufficient for heavy usage (Story 3.7)
  - Mitigation: Graceful fallback to keyword-only filtering, thumbnail pre-filtering to reduce API calls, users can upgrade to paid tier
- Risk: Face detection false positives (e.g., artwork, crowd shots) (Story 3.7)
  - Mitigation: 15% threshold with multiple frame sampling, cv_score ranking rather than hard filter
- Risk: LLM-generated expected labels may not match Vision API labels (Story 3.7)
  - Mitigation: Flexible substring matching, multiple expected labels (3-5), partial match scoring
- Risk: FFmpeg not installed on user systems (Story 3.7)
  - Mitigation: Actionable error message with installation instructions, graceful degradation to thumbnail-only mode

**Assumptions:**
- Assumption: YouTube Data API v3 remains stable and available
- Assumption: Free tier quota (10,000 units) sufficient for MVP testing
- Assumption: Users have access to Google Cloud Console for API key generation
- Assumption: YouTube's embeddable flag accurately identifies playable videos
- Assumption: Scene text provides enough context for meaningful visual search
- Assumption: yt-dlp can be installed via pip/npm on target deployment environment
- Assumption: First N seconds of YouTube videos are representative of overall content
- Assumption: 720p quality is sufficient for preview purposes (not final render)
- Assumption: Users have at least 500MB disk space available for cache directory
- Assumption: Google Cloud Vision API free tier (1,000 units/month) sufficient for MVP testing (Story 3.7)
- Assumption: LLM can reliably classify content types and extract entities (Story 3.2b)
- Assumption: 3 frames (10%, 50%, 90%) provide representative sample of video content (Story 3.7)
- Assumption: 15% face area threshold correctly identifies talking heads without excessive false positives (Story 3.7)
- Assumption: FFmpeg can be installed on target deployment environments (Story 3.7)
- Assumption: Users prefer silent previews for B-roll curation workflow (Story 3.7)

**Open Questions:**
- Question: Should we implement result caching to reduce API calls for common queries?
  - Next Step: Monitor API usage patterns in testing, implement if needed
- Question: How to handle region-restricted content?
  - Next Step: Test with VPN, may need region parameter in search, or skip restricted videos
- Question: Should we support other video platforms (Vimeo, Dailymotion)?
  - Next Step: Gather user feedback post-MVP about video source preferences
- Question: Should we download multiple segments per scene (top 3 instead of top 1)?
  - Next Step: Monitor user behavior in Epic 4 - do users frequently switch from top suggestion?
  - Trade-off: More downloads = better UX but slower workflow and more disk space
- Question: Should we implement automatic cache cleanup (delete old projects)?
  - Next Step: Monitor disk usage patterns, implement if cache regularly exceeds 2GB
- Question: Should we analyze more than 3 frames per video for CV analysis? (Story 3.7)
  - Next Step: Benchmark accuracy with 3 vs 5 vs 10 frames, balance accuracy vs API quota
  - Trade-off: More frames = better accuracy but higher API costs
- Question: Should we use service account authentication instead of API key for Vision API? (Story 3.7)
  - Next Step: Document both options in setup guide, recommend API key for simplicity
- Question: How to handle content-type edge cases (e.g., historical gaming content)? (Story 3.2b)
  - Next Step: Test with ambiguous content, may need to support multiple content types per scene
- Question: Should we expose CV filtering results to users (show why video was filtered)? (Story 3.7)
  - Next Step: Gather user feedback, consider optional "debug mode" for transparency

## Test Strategy Summary

**Test Levels:**
- Unit Tests: YouTubeAPIClient methods, filter functions, ranking algorithm, duration filtering, yt-dlp wrapper, EntityExtractor, QueryOptimizer, VisionAPIClient, ContentAnalyzer, FrameExtractor
- Integration Tests: Database operations, API endpoint flows, LLM integration, download service, Vision API integration
- Component Tests: VisualSourcingLoader UI, progress tracking, download progress indicator, VideoPreviewPlayer silent indicator
- E2E Tests: Complete flow from voiceover completion to visual curation with downloads and CV filtering
- Benchmark Tests: Face detection accuracy (20 samples), OCR accuracy (20 samples), query relevance (10 samples)

**Key Test Scenarios:**
1. Happy path: 5-scene script generates 5-8 suggestions per scene with duration filtering and downloads top suggestion
2. Empty results: Scene with no YouTube matches shows appropriate message
3. Quota exceeded: Graceful error handling and user guidance
4. Partial failure: Retry recovers without regenerating completed scenes
5. Gaming content: "Gameplay" scenes filter appropriately
6. API key missing: Clear error message on startup
7. Network failure: Exponential backoff and recovery
8. Duration filtering edge cases: Exactly 1x, exactly 3x, 5-minute cap (120s scene → max 300s, not 360s)
9. Duration fallback: All results filtered → relax threshold to 1x-4x
10. Default segment download happy path: 5 videos downloaded successfully in parallel (Story 3.6)
11. Download failures handled gracefully: Network error, restricted video, yt-dlp missing (Story 3.6)
12. Storage validation: Low disk space (<100MB) prevents downloads with actionable error (Story 3.6)
13. Content type detection: Gaming, historical, conceptual scenes correctly classified (Story 3.2b)
14. Entity extraction: Specific names and events extracted from scene text (Story 3.2b)
15. Negative terms injection: -reaction, -review, -commentary in optimized queries (Story 3.2b)
16. Quality terms by content type: Gaming gets "no commentary gameplay only", historical gets "documentary footage" (Story 3.2b)
17. Keyword filtering removes: Videos with "reaction", "vlog", "tier list" in titles (Story 3.7)
18. Keyword filtering prioritizes: Videos with "cinematic", "4K", "stock footage" (Story 3.7)
19. Audio stripping: Downloaded segments have no audio track (ffprobe verification) (Story 3.7)
20. Thumbnail pre-filtering: Thumbnails with faces/text filtered before download (Story 3.7)
21. Face detection accuracy: >80% of talking head videos correctly identified (Story 3.7)
22. OCR accuracy: >80% of captioned videos correctly identified (Story 3.7)
23. Label verification: Expected labels match Vision API labels (Story 3.7)
24. CV score calculation: Correct scoring based on face area, text, label match (Story 3.7)
25. Vision API quota fallback: Graceful degradation to keyword-only filtering (Story 3.7)
26. FFmpeg missing: Actionable error message displayed (Story 3.7)
27. Silent video indicator: 🔇 icon displayed in VideoPreviewPlayer (Story 3.7)
28. Volume control removal: No volume slider or mute button (Story 3.7)

**Coverage Focus:**
- Error handling paths (API failures, quota, network, download failures, storage errors, Vision API errors)
- Filter edge cases (all filtered, none filtered, duration fallback logic, CV score thresholds)
- Ranking algorithm correctness
- Duration filtering accuracy (1x-3x range, 5-minute cap)
- Database operations and constraints (duration, download_status, cv_score columns)
- State transitions in workflow (visual-sourcing → download → cv-filter → visual-curation)
- File system operations (download, storage validation, cleanup, frame extraction)
- yt-dlp command construction and execution (including -an flag for audio stripping)
- Parallel download management (max 3 concurrent)
- Content type classification accuracy (Story 3.2b)
- Entity extraction quality (Story 3.2b)
- Query optimization patterns (Story 3.2b)
- Face detection accuracy and threshold (Story 3.7)
- OCR detection accuracy (Story 3.7)
- Label matching logic (Story 3.7)
- CV score calculation formula (Story 3.7)
- Vision API quota tracking and fallback (Story 3.7)
- VideoPreviewPlayer silent mode (Story 3.7)
