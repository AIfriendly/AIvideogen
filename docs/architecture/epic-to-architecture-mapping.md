# Epic to Architecture Mapping

### Epic 1: Conversational Topic Discovery

#### Story 1.1-1.5: Chat Interface & LLM Integration
**Components:**
- `components/features/conversation/ChatInterface.tsx` - Main chat UI
- `components/features/conversation/MessageList.tsx` - Message display
- `components/features/conversation/TopicConfirmation.tsx` - Topic approval

**Backend:**
- `app/api/chat/route.ts` - LLM conversation endpoint
- `lib/llm/ollama-provider.ts` - Ollama integration (local)
- `lib/llm/gemini-provider.ts` - Gemini integration (cloud, optional)
- `lib/llm/factory.ts` - Provider selection logic
- `stores/conversation-store.ts` - Conversation state

**Database:**
- `messages` table - Persistent conversation history
- `projects` table - Topic and project metadata

**Key Flow:**
1. User types message → Saved to database
2. Load conversation history → Send to Llama 3.2 via Ollama
3. AI response → Saved to database → Displayed
4. Topic confirmation → Create project record

#### Story 1.6: Project Management UI
**Components:**
- `components/features/projects/ProjectSidebar.tsx` - Sidebar with project list (280px width)
- `components/features/projects/ProjectListItem.tsx` - Individual project item display
- `components/features/projects/NewChatButton.tsx` - Create new project action button

**Backend:**
- `app/api/projects/route.ts` - GET (list all projects), POST (create new project)
- `app/api/projects/[id]/route.ts` - GET (project details), PUT (update metadata), DELETE (delete project - optional)
- `lib/db/queries.ts` - getAllProjects(), createProject(), updateProjectLastActive(), deleteProject()
- `stores/project-store.ts` - Active project ID, project list state, localStorage persistence

**Database:**
- `projects` table - All project records with name, topic, last_active timestamp
- Query pattern: `SELECT * FROM projects ORDER BY last_active DESC`

**Key Flow:**
1. User clicks "New Chat" → Create project record → Set as active → Clear chat
2. User clicks project in sidebar → Load project's messages → Update URL → Update last_active
3. On any project activity → Update last_active timestamp
4. First user message → Auto-generate project name (first 30 chars, trim to word)
5. Active project ID persisted in localStorage → Restored on app reload

---

### Epic 2: Content Generation Pipeline + Voice Selection
**Components:**
- `components/features/voice/VoiceSelector.tsx` - Voice selection UI
- `components/features/voice/VoicePreview.tsx` - Audio preview player

**Backend:**
- `app/api/script/route.ts` - Script generation via LLM
- `app/api/voice/list/route.ts` - Get available KokoroTTS voices
- `app/api/voice/generate/route.ts` - Generate voiceover audio
- `lib/tts/kokoro.ts` - KokoroTTS integration
- `lib/llm/ollama-provider.ts` - Script generation (local)
- `lib/llm/gemini-provider.ts` - Script generation (cloud, optional)

**Database:**
- `projects` table - Store generated script, selected voice
- SQLite stores script text and voice selection

**Key Flow:**
1. Generate script from topic using Llama 3.2
2. Parse script into scenes
3. Display voice options (48+ KokoroTTS voices)
4. User selects voice → Preview audio
5. Generate voiceover for each scene using selected voice
6. Save audio files to `.cache/audio/`

---

### Epic 3: Visual Content Sourcing (YouTube API)

**Goal:** Automatically source relevant B-roll video clips from YouTube using AI analysis and the YouTube Data API v3.

#### Story 3.1: YouTube API Client & Authentication
**Components:**
- `lib/youtube/client.ts` - YouTubeAPIClient class with authentication
- Environment variable: `YOUTUBE_API_KEY`

**Key Features:**
- API key configuration and validation
- Quota tracking (10,000 units/day limit)
- Rate limiting (100 requests per 100 seconds)
- Exponential backoff retry logic (max 3 attempts)
- Error handling for invalid key, quota exceeded, network failures

**Error Messages:**
- Missing API key: "YouTube API key not configured. Add YOUTUBE_API_KEY to .env.local"
- Quota exceeded: "YouTube API quota exceeded. Try again tomorrow or upgrade quota."
- Invalid key: "Invalid YouTube API key. Get a key at https://console.cloud.google.com"

#### Story 3.2: Scene Text Analysis & Search Query Generation
**Components:**
- `src/lib/youtube/analyze-scene.ts` - analyzeSceneForVisuals() function
- `src/lib/llm/prompts/visual-search-prompt.ts` - Scene analysis prompt template
- `src/lib/youtube/keyword-extractor.ts` - Fallback keyword extraction
- `src/lib/youtube/types.ts` - SceneAnalysis interface and ContentType enum

**Module Responsibilities:**
- **SceneAnalyzer:** Main analyzeSceneForVisuals() function, orchestrates LLM call with retry logic and fallback
- **VisualSearchPrompt:** LLM prompt template optimized for extracting visual themes and generating search queries
- **KeywordExtractor:** Fallback NLP-based keyword extraction (frequency analysis, stop word removal)
- **Types:** TypeScript interfaces for SceneAnalysis and ContentType enum

**Key Flow:**
1. Input validation (scene text must be non-empty)
2. Build LLM prompt from template with scene text injection
3. Call LLM provider with 10-second timeout
4. Parse JSON response and validate required fields (mainSubject, primaryQuery)
5. Handle errors with retry logic:
   - Empty/missing fields → Retry once (1s delay)
   - Invalid JSON → Immediate fallback (no retry)
   - Timeout/connection error → Immediate fallback
6. Return SceneAnalysis object or fallback result

**Data Flow:**
```
Scene Text (from database)
    ↓
Visual Search Prompt Template
    ↓
LLM Provider (Ollama/Gemini) → [10s timeout]
    ↓
JSON Response Parsing & Validation
    ↓
    ├─→ Valid Response → SceneAnalysis Object
    ├─→ Invalid/Empty → Retry (1x) → Valid or Fallback
    └─→ Timeout/Error → Fallback Keyword Extraction
    ↓
SceneAnalysis Object Returned
    ↓
[Story 3.3: YouTube Search]
```

**SceneAnalysis Structure:**
```typescript
interface SceneAnalysis {
  mainSubject: string;        // e.g., "lion"
  setting: string;            // e.g., "savanna"
  mood: string;               // e.g., "sunset"
  action: string;             // e.g., "roaming"
  keywords: string[];         // e.g., ["wildlife", "grassland", "golden hour"]
  primaryQuery: string;       // e.g., "lion savanna sunset wildlife"
  alternativeQueries: string[]; // e.g., ["african lion sunset", "lion walking grassland"]
  contentType: ContentType;   // e.g., ContentType.NATURE
}
```

**ContentType Enum:**
- GAMEPLAY - Gaming footage (e.g., Minecraft gameplay)
- TUTORIAL - Educational how-to content
- NATURE - Wildlife, landscapes, natural phenomena
- B_ROLL - Generic background footage (default fallback)
- DOCUMENTARY - Documentary-style footage
- URBAN - City scenes, architecture
- ABSTRACT - Visual metaphors for abstract concepts

**Example Analysis:**
- Input: "A majestic lion roams the savanna at sunset"
- Output:
  - mainSubject: "lion"
  - setting: "savanna"
  - mood: "sunset"
  - action: "roaming"
  - keywords: ["wildlife", "grassland", "golden hour", "majestic"]
  - primaryQuery: "lion savanna sunset wildlife"
  - alternativeQueries: ["african lion sunset", "lion walking grassland golden hour"]
  - contentType: ContentType.NATURE

**Fallback Mechanism:**
When LLM is unavailable, keyword extraction provides:
- Simple frequency-based analysis (no external NLP libraries)
- Stop word removal (~50 common English words)
- Top 5 keywords by frequency
- Basic query construction from top 4 keywords
- Default contentType: B_ROLL
- Performance: <100ms (vs <5s LLM target)

**Error Handling:**
- Input validation: Throws error for empty/whitespace-only scene text
- LLM timeout: 10 seconds, triggers fallback
- Invalid JSON: Immediate fallback (no retry)
- Missing required fields: Retry once, then fallback
- Connection errors: Immediate fallback
- All errors logged with context for debugging

**Performance Targets:**
- LLM analysis: <5s average (10s timeout)
- Fallback: <100ms
- No blocking delays for user workflow
- Performance warnings logged if analysis >5s

**Integration:**
- Uses createLLMProvider() factory from Epic 1 Story 1.3
- Supports both Ollama (local) and Gemini (cloud) providers
- No provider-specific logic in scene analysis code
- Follows same patterns as Epic 1 chat implementation

**Visual Keywords Storage & CV Integration (Story 3.7b):**

The `keywords` array from SceneAnalysis is stored in the `scenes.visual_keywords` column for later use by CV analysis. This enables label verification during Story 3.7b auto-triggered CV analysis.

```typescript
// During Story 3.2 scene analysis (lib/youtube/analyze-scene.ts)
const analysis = await analyzeSceneForVisuals(scene.text);

// Store keywords for CV label matching (used by Story 3.7b)
db.prepare(`
  UPDATE scenes
  SET visual_keywords = ?
  WHERE id = ?
`).run(JSON.stringify(analysis.keywords), scene.id);

// Later, during Story 3.7b CV analysis (after download)
const scene = await getSceneById(sceneId);
const expectedLabels = JSON.parse(scene.visual_keywords || '[]');

// Pass to CV analysis for label verification
await analyzeVideoSuggestion(suggestionId, segmentPath, expectedLabels);
```

**Data Flow: Visual Keywords → CV Analysis:**
```
Story 3.2: analyzeSceneForVisuals()
    ↓
SceneAnalysis.keywords: ["lion", "savanna", "wildlife", "sunset"]
    ↓
Store in scenes.visual_keywords (JSON)
    ↓
Story 3.6: Download segment completes
    ↓
Story 3.7b: Fetch scene.visual_keywords
    ↓
Pass as expectedLabels to analyzeVideoSuggestion()
    ↓
CV verifies Vision API labels match expected keywords
    ↓
cv_score reflects label match quality
```

#### Story 3.3: YouTube Video Search & Result Retrieval
**Backend:**
- `app/api/projects/[id]/generate-visuals/route.ts` - Main endpoint
- `lib/youtube/client.ts` - searchVideos() method

**API Parameters:**
```typescript
{
  q: string,              // Search query
  part: 'snippet',
  type: 'video',
  videoEmbeddable: true,  // Only embeddable videos
  maxResults: 10-15,
  relevanceLanguage: 'en' // Configurable
}
```

**Key Flow:**
1. Load all scenes for project from database
2. For each scene:
   - Call analyzeSceneForVisuals() to get search queries
   - Execute YouTube search for primary + alternative queries
   - Retrieve metadata: videoId, title, thumbnail, channelTitle
   - Aggregate and deduplicate results by videoId
3. Save suggestions to visual_suggestions table
4. Update project.visuals_generated = true

**Error Handling:**
- Zero results: Pass empty array to filter (triggers empty state in Story 3.5 AC6)
- API quota exceeded: User-friendly error message, don't crash
- Network error: Retry with exponential backoff

#### Story 3.4: Content Filtering & Quality Ranking
**Components:**
- `lib/youtube/filter-results.ts` - Filtering and ranking logic
- `lib/youtube/filter-config.ts` - Configuration preferences

**Filtering Criteria:**
- **Duration:** Videos must be between 1x-3x scene voiceover duration (max 5 minutes)
- **Licensing:** Creative Commons preferred, Standard embeddable accepted
- **Quality:** Minimum 1000 views (spam prevention)
- **Title Spam:** Remove videos with >5 emojis or >50% ALL CAPS
- **Content Type:** Gaming = "gameplay no commentary", Nature = documentary-style

**Duration Filtering Logic:**
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

**Duration Calculation:**
- Scene voiceover duration obtained from `scenes.duration` column (in seconds)
- Minimum: Equal to scene duration (1x ratio)
- Maximum: 3x scene duration OR 5 minutes (300s), whichever is smaller
- Example: 10s scene → accepts 10s-30s videos (max 30s)
- Example: 90s scene → accepts 90s-270s videos (max 270s = 4.5 min)
- Example: 120s scene → accepts 120s-300s videos (max 300s = 5 min, NOT 360s)

**Ranking Algorithm:**
- Relevance score (from YouTube API)
- View count (normalized)
- Recency (newer videos score higher)
- Channel authority (subscriber count if available)

**Output:** Top 5-8 ranked suggestions per scene

**Fallback Logic:**
- If all results filtered out:
  1. Relax duration threshold (1x-4x instead of 1x-3x)
  2. Relax view count threshold
  3. Relax title spam filters
  4. Return at least 1-3 suggestions if any results exist

#### Story 3.5: Visual Suggestions Database & Workflow Integration
**Components:**
- `app/api/projects/[id]/visual-suggestions/route.ts` - GET suggestions
- `components/features/visual-sourcing/VisualSourcingLoader.tsx` - Loading UI
- Database: visual_suggestions table

**Database:**
- visual_suggestions table stores suggested clip data per scene (see Database Schema section, lines 1528-1540 for full schema)

**Database Query Functions:**
```typescript
// lib/db/queries.ts
saveVisualSuggestions(sceneId: string, suggestions: Suggestion[]): void
getVisualSuggestions(sceneId: string): Suggestion[]
getVisualSuggestionsByProject(projectId: string): Suggestion[]
```

**Loading UI Features:**
- Scene-by-scene progress: "Analyzing scene 2 of 5..."
- Stage messages: "Analyzing scene...", "Searching YouTube...", "Filtering results..."
- Error recovery: Retry button for failed scenes (doesn't regenerate completed)
- Empty state: "No clips found for this scene. Try editing the script or searching manually." (AC6)
- API failure: Retry button for partial completion (AC7)

**Workflow Integration:**
1. Trigger automatically after Epic 2 voiceover generation completes
2. Update project.current_step = 'visual-sourcing'
3. Display VisualSourcingLoader with progress
4. On completion: Update project.current_step = 'visual-curation'
5. Navigate to Epic 4 Visual Curation UI

**Key Flow:**
1. For each scene, analyze text for visual keywords using LLM
2. Query YouTube Data API v3 with generated search terms
3. Filter and rank results (Creative Commons preferred, duration checks, quality checks)
4. Store top 5-8 clip suggestions per scene in database
5. Handle edge cases: zero results (empty state), API failures (retry), quota exceeded (error message)

#### Story 3.6: Default Segment Download Service
**Goal:** Download default video segments (first N seconds) for instant preview in Epic 4 curation UI

**Components:**
- `lib/video/downloader.ts` - yt-dlp wrapper with segment support
- `app/api/projects/[id]/download-default-segments/route.ts` - Batch download endpoint

**Database Extensions:**
- `visual_suggestions` table extended with:
  - `duration INTEGER` (video duration in seconds)
  - `default_segment_path TEXT` (path to downloaded default segment)
  - `download_status TEXT` (pending, downloading, complete, error)

**yt-dlp Default Segment Download:**
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

  // yt-dlp command: download first N seconds with audio stripped
  const command = `yt-dlp "https://youtube.com/watch?v=${videoId}" \
    --download-sections "*0-${segmentDuration}" \
    -f "best[height<=720]" \
    --postprocessor-args "ffmpeg:-an" \
    -o "${outputPath}"`;
  // Note: --postprocessor-args "ffmpeg:-an" strips audio track (Story 3.7 requirement)

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

**Key Flow:**
```
1. After Story 3.4 filters and ranks suggestions (top 5-8 per scene)
2. For each scene's top suggestions:
   - Verify duration <= 3x scene duration (already filtered in Story 3.4)
   - Calculate segment duration: scene duration + 5s buffer
   - Download first N seconds using yt-dlp --download-sections "*0-{N}"
   - Save to .cache/videos/{projectId}/scene-{sceneNumber}-default.mp4
   - Update visual_suggestions.default_segment_path and download_status = 'complete'
3. Progress indicator: "Downloading preview clips... 12/24 complete"
4. On completion: Users can immediately preview actual footage in Epic 4 curation UI
5. Error handling: Network failures, YouTube restrictions → Mark download_status = 'error', continue with other clips
```

**Benefits:**
- ✅ Users preview actual footage (not just thumbnails) before selecting (Epic 4)
- ✅ "Use Default Segment" button in Epic 4 requires NO download (file already exists)
- ✅ Faster Epic 4 curation workflow (no waiting for downloads during selection)
- ✅ Default segments use first N seconds (0:00 start) - predictable, fast

**Download Parameters:**
- **Format:** `best[height<=720]` (HD quality, manageable file size)
- **Segment:** `*0-{duration}` (from 0:00 to scene_duration + 5s)
- **Buffer:** 5 seconds extra to allow trimming flexibility in Epic 5
- **Quality vs Size:** 720p strikes balance between preview quality and download speed

**Error Recovery:**
- Failed downloads don't block other scenes (continue processing)
- Retry logic: 3 attempts with exponential backoff (2s, 4s, 8s)
- Permanent failures (restricted videos) → Mark error, skip retry
- User can manually retry failed downloads in Epic 4 UI

**Auto-Trigger CV Analysis (Story 3.7b Integration):**

After each successful segment download, CV analysis automatically triggers to evaluate B-roll quality. This integration ensures users only see high-quality suggestions in the Visual Curation UI.

```typescript
// app/api/projects/[id]/download-segments/route.ts
import { analyzeVideoSuggestion, getCVFilterStatus } from '@/lib/vision';

// After successful segment download:
async function handleSuccessfulDownload(
  suggestionId: string,
  segmentPath: string,
  sceneId: string
) {
  // Update download status first (download is successful regardless of CV)
  await updateSuggestionStatus(suggestionId, 'complete', segmentPath);

  // Auto-trigger CV analysis (non-blocking, graceful degradation)
  try {
    const cvStatus = await getCVFilterStatus();
    if (cvStatus.available) {
      // Fetch scene's visual_keywords for expected labels
      const scene = await getSceneById(sceneId);
      const expectedLabels = scene.visual_keywords || [];

      // Run CV analysis - updates cv_score in database
      await analyzeVideoSuggestion(suggestionId, segmentPath, expectedLabels);
      console.log(`CV analysis complete for suggestion ${suggestionId}`);
    }
  } catch (error) {
    // CV failure should NEVER block download success (AC59)
    console.warn(`CV analysis failed for ${suggestionId}:`, error);
    // cv_score remains NULL - suggestion still visible to user
  }
}
```

**Error Isolation Pattern:**
- Download marked successful BEFORE CV analysis runs
- CV analysis wrapped in try-catch with warning log only
- If CV fails, cv_score remains NULL (suggestion stays visible)
- User can still see and use videos that weren't CV-analyzed

**Data Flow:**
```
Download Complete → Update download_status = 'complete'
                 → Fetch scene.visual_keywords
                 → Call analyzeVideoSuggestion(id, path, keywords)
                 → Update cv_score in visual_suggestions table
                 → [If CV fails: log warning, cv_score stays NULL]
```

#### Story 3.2b: Enhanced Search Query Generation

**Goal:** Improve query relevance with content-type awareness, entity extraction, and platform-optimized search patterns for pure B-roll results.

**Components:**
- `lib/youtube/entity-extractor.ts` - Entity extraction for specific subjects
- `lib/youtube/query-optimizer.ts` - Platform-optimized query generation
- `lib/llm/prompts/visual-search-prompt.ts` - Updated with content-type detection

**Content-Type Detection:**
```typescript
// lib/youtube/analyze-scene.ts - Extended ContentType enum
enum ContentType {
  GAMING = 'gaming',        // Gaming footage, boss fights, gameplay
  HISTORICAL = 'historical', // Documentary, archive footage
  CONCEPTUAL = 'conceptual', // Abstract visualization, futuristic
  NATURE = 'nature',        // Wildlife, landscapes
  TUTORIAL = 'tutorial',    // How-to, educational
  B_ROLL = 'b_roll',        // Generic background footage (default)
}

// Content-type specific query patterns
const CONTENT_TYPE_PATTERNS = {
  gaming: {
    qualityTerms: ['no commentary', 'gameplay only', '4K'],
    negativeTerms: ['-reaction', '-review', '-tier list', '-ranking'],
  },
  historical: {
    qualityTerms: ['documentary', 'archive footage', 'historical'],
    negativeTerms: ['-explained', '-reaction', '-my thoughts'],
  },
  conceptual: {
    qualityTerms: ['cinematic', '4K', 'stock footage', 'futuristic'],
    negativeTerms: ['-vlog', '-reaction', '-review'],
  },
  // ... other content types
};
```

**Entity Extraction:**
```typescript
// lib/youtube/entity-extractor.ts
interface ExtractedEntities {
  primarySubject: string;    // e.g., "Ornstein and Smough"
  gameTitle?: string;        // e.g., "Dark Souls"
  historicalEvent?: string;  // e.g., "Russian Revolution"
  conceptKeywords: string[]; // e.g., ["dystopian", "AI", "robots"]
}

async function extractEntities(sceneText: string, contentType: ContentType): Promise<ExtractedEntities> {
  // Use LLM to extract specific entities based on content type
  const prompt = `Extract specific entities from this scene text for ${contentType} video search:
  "${sceneText}"

  Return JSON with: primarySubject, gameTitle (if gaming), historicalEvent (if historical), conceptKeywords`;

  const llm = getLLMProvider();
  const response = await llm.chat([{ role: 'user', content: prompt }]);
  return JSON.parse(response);
}
```

**Query Optimization:**
```typescript
// lib/youtube/query-optimizer.ts
function optimizeQuery(
  entities: ExtractedEntities,
  contentType: ContentType
): string[] {
  const patterns = CONTENT_TYPE_PATTERNS[contentType];
  const baseTerms = [entities.primarySubject];

  // Add content-type specific context
  if (contentType === 'gaming' && entities.gameTitle) {
    baseTerms.push(entities.gameTitle);
  }

  // Build optimized queries
  const primaryQuery = [
    ...baseTerms,
    ...patterns.qualityTerms.slice(0, 2),
  ].join(' ') + ' ' + patterns.negativeTerms.join(' ');

  const alternativeQueries = [
    `${entities.primarySubject} ${patterns.qualityTerms[0]}`,
    `${baseTerms.join(' ')} cinematic`,
  ];

  return [primaryQuery, ...alternativeQueries];
}
```

**Example Query Generation:**

| Scene Text | Content Type | Generated Query |
|------------|--------------|-----------------|
| "The epic battle against Ornstein and Smough tests every player's skill" | GAMING | `dark souls ornstein smough boss fight no commentary gameplay only -reaction -review -tier list` |
| "The storming of the Winter Palace marked the beginning of Soviet rule" | HISTORICAL | `russian revolution winter palace historical documentary archive footage -explained -reaction` |
| "Towering skyscrapers loom over empty streets as autonomous drones patrol" | CONCEPTUAL | `dystopian city AI robots cinematic 4K stock footage -vlog -reaction` |

**Integration with Story 3.2:**
- Story 3.2b extends analyzeSceneForVisuals() to call entity extraction
- Query optimizer runs after content-type detection
- Negative terms automatically injected based on content type
- Fallback to basic keyword extraction if entity extraction fails

---

#### Story 3.7: Computer Vision Content Filtering

**Goal:** Filter low-quality B-roll using Google Cloud Vision API (face detection, OCR, label verification) and local processing (keyword filtering, audio stripping).

**Components:**
- `lib/vision/client.ts` - Google Cloud Vision API client
- `lib/vision/analyze-content.ts` - Content analysis functions
- `lib/vision/frame-extractor.ts` - FFmpeg frame extraction
- `lib/youtube/filter-results.ts` - Extended with CV filtering

**Architecture Pattern: Two-Tier Filtering**

```
                    YouTube Search Results
                            ↓
              ┌─────────────────────────────┐
              │   TIER 1: Local Filtering   │  (Free, Fast)
              │   - Keyword filtering       │
              │   - Title/description scan  │
              │   - Duration filtering      │
              └─────────────────────────────┘
                            ↓
                   Filtered Candidates
                            ↓
              ┌─────────────────────────────┐
              │   TIER 2: Vision API        │  (Cloud, Metered)
              │   - Thumbnail pre-filter    │
              │   - Face detection          │
              │   - OCR text detection      │
              │   - Label verification      │
              └─────────────────────────────┘
                            ↓
                   Ranked Suggestions
                   (with cv_score)
```

**Vision API Client:**
```typescript
// lib/vision/client.ts
import vision from '@google-cloud/vision';

export class VisionAPIClient {
  private client: vision.ImageAnnotatorClient;
  private quotaTracker: QuotaTracker;

  constructor() {
    this.client = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_CLOUD_VISION_KEY_FILE,
      // Or use API key: apiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY
    });
    this.quotaTracker = new QuotaTracker(1000); // 1,000 units/month free tier
  }

  async analyzeThumbnail(thumbnailUrl: string): Promise<ThumbnailAnalysis> {
    // Pre-filter using thumbnail before downloading video
    await this.quotaTracker.checkQuota(3); // 3 units per image

    const [result] = await this.client.annotateImage({
      image: { source: { imageUri: thumbnailUrl } },
      features: [
        { type: 'FACE_DETECTION' },
        { type: 'TEXT_DETECTION' },
        { type: 'LABEL_DETECTION', maxResults: 10 },
      ],
    });

    return {
      faceArea: this.calculateFaceArea(result.faceAnnotations),
      hasText: (result.textAnnotations?.length || 0) > 0,
      labels: result.labelAnnotations?.map(l => l.description) || [],
    };
  }

  async analyzeVideoFrames(
    framePaths: string[],
    expectedLabels: string[]
  ): Promise<VideoAnalysis> {
    // Analyze 3 frames (10%, 50%, 90% of video duration)
    const analyses = await Promise.all(
      framePaths.map(path => this.analyzeFrame(path))
    );

    return {
      avgFaceArea: this.average(analyses.map(a => a.faceArea)),
      hasTextOverlay: analyses.some(a => a.hasText),
      labelMatches: this.countLabelMatches(analyses, expectedLabels),
      cvScore: this.calculateCVScore(analyses, expectedLabels),
    };
  }

  private calculateFaceArea(faces: vision.protos.google.cloud.vision.v1.IFaceAnnotation[]): number {
    if (!faces || faces.length === 0) return 0;

    // Calculate total face bounding box area as percentage of frame
    let totalArea = 0;
    for (const face of faces) {
      const box = face.boundingPoly?.vertices;
      if (box && box.length >= 4) {
        const width = Math.abs((box[1].x || 0) - (box[0].x || 0));
        const height = Math.abs((box[2].y || 0) - (box[1].y || 0));
        totalArea += (width * height) / (1920 * 1080); // Normalized to 1080p
      }
    }
    return totalArea;
  }

  private calculateCVScore(
    analyses: FrameAnalysis[],
    expectedLabels: string[]
  ): number {
    // Higher score = better B-roll quality (normalized 0.0-1.0)
    let score = 1.0;

    // Penalize for faces (talking heads) - Story 3.7b thresholds
    const avgFaceArea = this.average(analyses.map(a => a.faceArea));
    if (avgFaceArea > CV_THRESHOLDS.TALKING_HEAD_AREA) {
      score -= CV_THRESHOLDS.FACE_PENALTY_MAJOR; // >10% = major penalty (-0.6)
    } else if (avgFaceArea > CV_THRESHOLDS.SMALL_FACE_AREA) {
      score -= CV_THRESHOLDS.FACE_PENALTY_MINOR; // 3-10% = minor penalty (-0.3)
    }

    // Penalize for text overlays (captions) - Story 3.7b thresholds
    const hasCaption = analyses.some(a =>
      a.textCoverage > CV_THRESHOLDS.CAPTION_COVERAGE ||
      a.textBlockCount > CV_THRESHOLDS.CAPTION_BLOCKS
    );
    if (hasCaption) {
      score -= CV_THRESHOLDS.CAPTION_PENALTY; // -0.4
    }

    // Reward for label matches
    const matchCount = this.countLabelMatches(analyses, expectedLabels);
    score += matchCount * 0.1; // +0.1 per matching label

    return Math.max(0, Math.min(1.0, score));
  }
}

// CV_THRESHOLDS constant (Story 3.7b values)
const CV_THRESHOLDS = {
  // Face detection thresholds
  TALKING_HEAD_AREA: 0.10,    // 10% of frame (was 15% in Story 3.7)
  SMALL_FACE_AREA: 0.03,      // 3% of frame (was 5% in Story 3.7)

  // Caption detection thresholds
  CAPTION_COVERAGE: 0.03,     // 3% text coverage (was 5% in Story 3.7)
  CAPTION_BLOCKS: 2,          // 2 text blocks (was 3 in Story 3.7)

  // Penalty values (normalized 0-1 scale)
  FACE_PENALTY_MAJOR: 0.6,    // -0.6 for talking heads (was -0.5)
  FACE_PENALTY_MINOR: 0.3,    // -0.3 for small faces (was -0.2)
  CAPTION_PENALTY: 0.4,       // -0.4 for captions (was -0.3)

  // UI filtering threshold
  MIN_DISPLAY_SCORE: 0.5,     // Hide suggestions below 0.5
};
```

**Quota Management:**
```typescript
// lib/vision/quota-tracker.ts
export class QuotaTracker {
  private monthlyLimit: number;
  private currentUsage: number = 0;

  constructor(monthlyLimit: number) {
    this.monthlyLimit = monthlyLimit;
    this.loadUsageFromDB();
  }

  async checkQuota(unitsNeeded: number): Promise<void> {
    if (this.currentUsage + unitsNeeded > this.monthlyLimit) {
      throw new QuotaExceededError(
        `Vision API quota exceeded (${this.currentUsage}/${this.monthlyLimit} units used). ` +
        'Falling back to keyword-only filtering. ' +
        'Upgrade quota at https://console.cloud.google.com/apis/api/vision.googleapis.com'
      );
    }
    this.currentUsage += unitsNeeded;
    await this.saveUsageToDB();
  }

  getUsagePercentage(): number {
    return (this.currentUsage / this.monthlyLimit) * 100;
  }
}
```

**Face Detection Filtering:**
```typescript
// lib/vision/analyze-content.ts
function filterByFaceDetection(
  analysis: ThumbnailAnalysis | VideoAnalysis,
  threshold: number = CV_THRESHOLDS.TALKING_HEAD_AREA // 10% of frame area (Story 3.7b)
): FilterResult {
  if (analysis.avgFaceArea > threshold) {
    return {
      pass: false,
      reason: `Face detected covering ${(analysis.avgFaceArea * 100).toFixed(1)}% of frame (threshold: ${threshold * 100}%)`,
    };
  }
  return { pass: true };
}
```

**Label Verification:**
```typescript
// lib/vision/analyze-content.ts
async function generateExpectedLabels(
  sceneText: string,
  contentType: ContentType
): Promise<string[]> {
  // Use LLM to generate expected Vision API labels for scene
  const prompt = `For this ${contentType} scene: "${sceneText}"
  Generate 5 expected Google Cloud Vision API labels that should appear in matching B-roll footage.
  Return as JSON array of strings.`;

  const llm = getLLMProvider();
  const response = await llm.chat([{ role: 'user', content: prompt }]);
  return JSON.parse(response);
}

function verifyLabels(
  detectedLabels: string[],
  expectedLabels: string[]
): LabelVerification {
  const matches = expectedLabels.filter(expected =>
    detectedLabels.some(detected =>
      detected.toLowerCase().includes(expected.toLowerCase()) ||
      expected.toLowerCase().includes(detected.toLowerCase())
    )
  );

  return {
    pass: matches.length >= 1, // At least 1 of top 3 expected labels
    matchCount: matches.length,
    matchedLabels: matches,
    expectedLabels,
  };
}
```

**Frame Extraction:**
```typescript
// lib/vision/frame-extractor.ts
async function extractFrames(
  videoPath: string,
  outputDir: string
): Promise<string[]> {
  // Extract 3 frames at 10%, 50%, 90% of video duration
  const duration = await getVideoDuration(videoPath);
  const timestamps = [
    duration * 0.1,
    duration * 0.5,
    duration * 0.9,
  ];

  const framePaths: string[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const outputPath = `${outputDir}/frame-${i}.jpg`;
    await execCommand(
      `ffmpeg -ss ${timestamps[i]} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`
    );
    framePaths.push(outputPath);
  }

  return framePaths;
}
```

**Integration with Filtering Pipeline:**
```typescript
// lib/youtube/filter-results.ts - Extended
async function filterAndRankResults(
  results: YouTubeVideo[],
  sceneText: string,
  sceneDuration: number,
  contentType: ContentType
): Promise<RankedSuggestion[]> {
  // TIER 1: Local filtering (free, fast)
  let filtered = filterByDuration(results, sceneDuration);
  filtered = filterByKeywords(filtered, contentType);
  filtered = filterByViewCount(filtered, 1000);
  filtered = filterByTitleSpam(filtered);

  // TIER 2: Vision API filtering (cloud, metered)
  const visionClient = new VisionAPIClient();
  const expectedLabels = await generateExpectedLabels(sceneText, contentType);

  const analyzed: RankedSuggestion[] = [];

  for (const video of filtered) {
    try {
      // Step 1: Thumbnail pre-filter (faster, cheaper)
      const thumbnailAnalysis = await visionClient.analyzeThumbnail(video.thumbnailUrl);

      // Quick reject if thumbnail shows talking head
      if (thumbnailAnalysis.faceArea > 0.15) {
        continue; // Skip downloading this video
      }

      // Step 2: Full video frame analysis (after download)
      // This happens in Story 3.6 after segment download

      analyzed.push({
        ...video,
        cv_score: calculateCVScore(thumbnailAnalysis, expectedLabels),
        thumbnailAnalysis,
      });
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        // Fallback to keyword-only filtering
        console.warn('Vision API quota exceeded, using keyword-only filtering');
        analyzed.push({ ...video, cv_score: 50 }); // Neutral score
      } else {
        throw error;
      }
    }
  }

  // Rank by cv_score (higher = better B-roll)
  return analyzed.sort((a, b) => b.cv_score - a.cv_score);
}
```

**Database Extension:**
```sql
-- Add cv_score column to visual_suggestions table (Migration v8)
ALTER TABLE visual_suggestions ADD COLUMN cv_score REAL;

-- cv_score ranges from 0-100:
-- 100 = Perfect B-roll (no faces, no text, matching labels)
-- 50 = Neutral (keyword-only filtering, no CV analysis)
-- 0 = Poor quality (talking heads, captions, mismatched content)
```

**Error Handling & Fallback:**
```typescript
// Graceful degradation when Vision API unavailable
async function filterWithFallback(
  results: YouTubeVideo[],
  sceneText: string,
  sceneDuration: number,
  contentType: ContentType
): Promise<RankedSuggestion[]> {
  try {
    return await filterAndRankResults(results, sceneText, sceneDuration, contentType);
  } catch (error) {
    if (error instanceof QuotaExceededError ||
        error.message.includes('GOOGLE_CLOUD_VISION')) {
      // Fall back to Tier 1 filtering only
      console.warn('Vision API unavailable, using keyword-only filtering');

      let filtered = filterByDuration(results, sceneDuration);
      filtered = filterByKeywords(filtered, contentType);

      return filtered.map(video => ({
        ...video,
        cv_score: 50, // Neutral score for keyword-only filtering
      }));
    }
    throw error;
  }
}
```

**Performance Considerations:**
- **Thumbnail Pre-Filtering:** ~200ms per thumbnail (reduces video downloads by 30-50%)
- **Video Frame Analysis:** ~500ms per video (3 frames)
- **Total CV Processing:** <5 seconds per video suggestion
- **Quota Efficiency:** 3 units per thumbnail, 9 units per video (3 frames × 3 features)

**Environment Variables:**
```bash
# .env.local - Google Cloud Vision API Configuration
GOOGLE_CLOUD_VISION_API_KEY=your_api_key_here
# Or use service account:
# GOOGLE_CLOUD_VISION_KEY_FILE=./service-account.json
```

---

### Epic 4: Visual Curation Interface

**Goal:** Provide a professional, intuitive interface for creators to review scripts, preview suggested video clips, and finalize visual selections scene-by-scene.

**User Value:** Maintain creative control through easy-to-use curation workflow with instant video previews, progress tracking, and validation before final assembly.

#### Story 4.1: Scene-by-Scene UI Layout & Script Display

**Page Component:**
- `app/projects/[id]/visual-curation/page.tsx` - Main curation page route
- `components/features/curation/VisualCuration.tsx` - Container component

**Layout Structure:**
```typescript
// VisualCuration.tsx component structure
<div className="visual-curation">
  {/* Sticky Navigation Header */}
  <NavigationBreadcrumb
    steps={['Project', 'Script', 'Voiceover', 'Visual Curation']}
    currentStep="Visual Curation"
  />

  {/* Progress Tracker */}
  <ProgressTracker
    completed={selectedScenes}
    total={totalScenes}
  />

  {/* Actions Bar */}
  <div className="actions-bar">
    <button onClick={backToScriptPreview}>← Back to Script Preview</button>
    <button onClick={regenerateVisuals}>🔄 Regenerate Visuals</button>
  </div>

  {/* Scene Cards */}
  {scenes.map(scene => (
    <SceneCard
      key={scene.id}
      scene={scene}
      suggestions={getSuggestionsForScene(scene.id)}
      onClipSelect={handleClipSelection}
    />
  ))}

  {/* Sticky Assembly Footer */}
  <AssemblyTriggerButton
    disabled={!allScenesComplete}
    onClick={showAssemblyConfirmation}
  />
</div>
```

**SceneCard Component:**
```typescript
// components/features/curation/SceneCard.tsx
interface SceneCardProps {
  scene: Scene;
  suggestions: VisualSuggestion[];
  onClipSelect: (sceneId: string, suggestionId: string) => void;
  selectedSuggestionId?: string;
}

export function SceneCard({ scene, suggestions, onClipSelect, selectedSuggestionId }: SceneCardProps) {
  return (
    <div className="scene-card">
      {/* Header */}
      <div className="scene-header">
        <div className="scene-badge">Scene {scene.scene_number}</div>
        <div className={`status-badge status-${getStatus()}`}>
          {selectedSuggestionId ? '✓ Complete' : '⚠ Pending'}
        </div>
      </div>

      {/* Script Text */}
      <div className="scene-script">
        {scene.text}
      </div>

      {/* Visual Suggestions Gallery */}
      <VisualSuggestionGallery
        suggestions={suggestions}
        onSelect={(suggestionId) => onClipSelect(scene.id, suggestionId)}
        selectedId={selectedSuggestionId}
      />
    </div>
  );
}
```

**API Endpoint:**
```typescript
// app/api/projects/[id]/scenes/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const scenes = db.prepare(`
    SELECT id, scene_number, text, audio_file_path, duration
    FROM scenes
    WHERE project_id = ?
    ORDER BY scene_number ASC
  `).all(params.id);

  return Response.json({ success: true, data: scenes });
}
```

**UX Specifications (from ux-design-specification.md):**
- **Layout:** Desktop-first, max-width 1400px, centered
- **Navigation:** Sticky header with breadcrumb navigation
- **Scene Cards:** Sequential display (Scene 1, Scene 2, etc.)
- **Progress:** Real-time completion tracker in header
- **Colors:** Dark mode (Slate 900 background, Slate 800 cards)
- **Typography:** Clear hierarchy (scene number, script text, metadata)
- **Spacing:** Consistent 24px gaps between scene cards

#### Story 4.2: Visual Suggestions Display & Gallery

**Component:**
```typescript
// components/features/curation/VisualSuggestionGallery.tsx
interface VisualSuggestionGalleryProps {
  suggestions: VisualSuggestion[];
  onSelect: (suggestionId: string) => void;
  selectedId?: string;
}

export function VisualSuggestionGallery({ suggestions, onSelect, selectedId }: VisualSuggestionGalleryProps) {
  if (suggestions.length === 0) {
    return <EmptyClipState />;
  }

  return (
    <div className="clip-grid">
      {suggestions.map(suggestion => (
        <ClipSelectionCard
          key={suggestion.id}
          suggestion={suggestion}
          isSelected={suggestion.id === selectedId}
          onSelect={() => onSelect(suggestion.id)}
        />
      ))}
    </div>
  );
}

// components/features/curation/ClipSelectionCard.tsx
interface ClipSelectionCardProps {
  suggestion: VisualSuggestion;
  isSelected: boolean;
  onSelect: () => void;
}

export function ClipSelectionCard({ suggestion, isSelected, onSelect }: ClipSelectionCardProps) {
  return (
    <div
      className={`clip-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      {/* Selection Checkmark */}
      {isSelected && <div className="checkmark">✓</div>}

      {/* YouTube Thumbnail */}
      <img
        src={suggestion.thumbnail_url}
        alt={suggestion.title}
        className="clip-thumbnail"
      />

      {/* Download Status Badge */}
      <div className={`download-badge download-${suggestion.download_status}`}>
        {getDownloadStatusLabel(suggestion.download_status)}
      </div>

      {/* Play Icon Overlay */}
      <div className="play-icon">▶</div>

      {/* Metadata Overlay */}
      <div className="clip-overlay">
        <div className="clip-title">{suggestion.title}</div>
        <div className="clip-meta">
          <span>{suggestion.channel_title}</span>
          <span>{formatDuration(suggestion.duration)}</span>
        </div>
      </div>
    </div>
  );
}

// components/features/curation/EmptyClipState.tsx
export function EmptyClipState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">🎬</div>
      <div className="empty-title">No suitable video clips found for this scene</div>
      <div className="empty-text">
        The YouTube search returned no results. Try manual search or skip this scene.
      </div>
      <button onClick={handleManualSearch}>🔍 Search YouTube Manually</button>
      <button onClick={handleSkipScene}>Skip This Scene</button>
    </div>
  );
}
```

**API Endpoint:**
```typescript
// app/api/projects/[id]/visual-suggestions/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Get all scenes for project
  const scenes = db.prepare(`
    SELECT id, scene_number FROM scenes WHERE project_id = ? ORDER BY scene_number
  `).all(params.id);

  // Get suggestions for each scene (includes cv_score for filtering)
  const scenesSuggestions = scenes.map(scene => {
    const suggestions = db.prepare(`
      SELECT id, video_id, title, thumbnail_url, channel_title,
             embed_url, rank, duration, default_segment_path, download_status, cv_score
      FROM visual_suggestions
      WHERE scene_id = ?
      ORDER BY rank ASC
    `).all(scene.id);

    return {
      sceneId: scene.id,
      sceneNumber: scene.scene_number,
      suggestions
    };
  });

  return Response.json({ success: true, data: scenesSuggestions });
}
```

**CV Score UI Filtering (Story 3.7b):**

The Visual Curation UI filters suggestions based on cv_score to hide low-quality B-roll:

```typescript
// lib/utils/cv-filter.ts
import { CV_THRESHOLDS } from '@/lib/vision/client';

interface FilteredSuggestions {
  visible: VisualSuggestion[];
  hiddenCount: number;
}

/**
 * Filter suggestions for UI display based on cv_score
 * - cv_score >= 0.5: Show (acceptable B-roll)
 * - cv_score < 0.5: Hide (low quality - faces, captions)
 * - cv_score === null: Show (not yet analyzed)
 */
export function filterSuggestionsByQuality(
  suggestions: VisualSuggestion[]
): FilteredSuggestions {
  const visible: VisualSuggestion[] = [];
  let hiddenCount = 0;

  for (const suggestion of suggestions) {
    // NULL cv_score = not analyzed yet, show to user (AC65)
    if (suggestion.cv_score === null) {
      visible.push(suggestion);
      continue;
    }

    // cv_score >= 0.5 = acceptable quality, show (AC64)
    if (suggestion.cv_score >= CV_THRESHOLDS.MIN_DISPLAY_SCORE) {
      visible.push(suggestion);
    } else {
      // cv_score < 0.5 = low quality, hide (AC64)
      hiddenCount++;
    }
  }

  return { visible, hiddenCount };
}

// components/features/curation/FilteredSuggestionsInfo.tsx
interface FilteredSuggestionsInfoProps {
  hiddenCount: number;
}

/**
 * Display count of filtered low-quality videos (AC66)
 */
export function FilteredSuggestionsInfo({ hiddenCount }: FilteredSuggestionsInfoProps) {
  if (hiddenCount === 0) return null;

  return (
    <div className="filtered-info">
      <span className="filtered-icon">🔍</span>
      <span className="filtered-text">
        {hiddenCount} low-quality video{hiddenCount > 1 ? 's' : ''} filtered
      </span>
    </div>
  );
}
```

**Integration with VisualSuggestionGallery:**
```typescript
// components/features/curation/VisualSuggestionGallery.tsx
export function VisualSuggestionGallery({ sceneId, suggestions }: Props) {
  // Apply CV score filtering (Story 3.7b)
  const { visible, hiddenCount } = filterSuggestionsByQuality(suggestions);

  return (
    <div className="suggestion-gallery">
      {/* Filtered count indicator (AC66) */}
      <FilteredSuggestionsInfo hiddenCount={hiddenCount} />

      {/* Grid of visible suggestions only */}
      <div className="suggestions-grid">
        {visible.length > 0 ? (
          visible.map(suggestion => (
            <ClipSelectionCard
              key={suggestion.id}
              suggestion={suggestion}
              onSelect={handleSelect}
            />
          ))
        ) : (
          <EmptyClipState />
        )}
      </div>
    </div>
  );
}
```

**CV Score Interpretation:**

| Score Range | Quality | UI Behavior |
|-------------|---------|-------------|
| 0.8 - 1.0 | Excellent B-roll | ✅ Shown (priority) |
| 0.5 - 0.8 | Acceptable B-roll | ✅ Shown |
| 0.0 - 0.5 | Low quality (faces/captions) | ❌ Hidden |
| NULL | Not yet analyzed | ✅ Shown |


**UX Specifications:**
- **Grid Layout:** 3 columns on desktop (1920px), 2 on tablet (768px), 1 on mobile
- **Clip Cards:** 16:9 aspect ratio, thumbnail covers entire card
- **Selection Visual:** 3px indigo border, checkmark badge, shadow glow
- **Download Status Badges:**
  - Complete: Green badge (✓ Ready)
  - Downloading: Blue badge with percentage (⏳ 67%)
  - Pending: Gray badge (⏳ Pending)
  - Error: Red badge (⚠ Error)
- **Hover State:** Scale 1.02, indigo border
- **Empty State:** Centered, icon + message + CTA buttons

#### Story 4.3: Video Preview & Playback Functionality

**Component:**
```typescript
// components/features/curation/VideoPreviewPlayer.tsx
interface VideoPreviewPlayerProps {
  isOpen: boolean;
  suggestion: VisualSuggestion | null;
  onClose: () => void;
}

export function VideoPreviewPlayer({ isOpen, suggestion, onClose }: VideoPreviewPlayerProps) {
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    // Keyboard shortcut handlers
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') togglePlayPause();
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  if (!isOpen || !suggestion) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="video-player" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="video-header">
          <div className="video-title">{suggestion.title}</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Video Container */}
        <div className="video-container">
          {suggestion.download_status === 'complete' && !useFallback ? (
            // HTML5 video player for downloaded segments
            <video
              controls
              autoPlay
              src={`/.cache/videos/${projectId}/${suggestion.default_segment_path}`}
              onError={() => setUseFallback(true)}
            >
              <source type="video/mp4" />
            </video>
          ) : (
            // YouTube iframe fallback for failed downloads
            <iframe
              src={suggestion.embed_url}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="controls-hint">
          Space: Play/Pause | Esc: Close
        </div>
      </div>
    </div>
  );
}
```

**Key Features:**
- **Instant Playback:** Downloaded default segments play immediately (Story 3.6)
- **Fallback Strategy:** If download failed, use YouTube iframe embed
- **Keyboard Shortcuts:** Space (play/pause), Esc (close)
- **HTML5 Controls:** Play/pause, progress bar, volume, fullscreen
- **Click Outside:** Close modal on backdrop click
- **Auto-open on Selection:** Preview opens automatically when user clicks clip

**UX Specifications:**
- **Modal Backdrop:** Slate 900 with 95% opacity, 8px blur
- **Player Container:** Max-width 800px, 90% width, Slate 800 background
- **Video Aspect Ratio:** 16:9
- **Controls:** Default HTML5 video controls
- **Close Button:** Top-right, 32px x 32px, hover effect

#### Story 4.4: Clip Selection Mechanism & State Management

**Zustand Store:**
```typescript
// stores/curation-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ClipSelection {
  sceneId: string;
  suggestionId: string;
  videoId: string;
}

interface CurationState {
  projectId: string | null;
  selections: Map<string, ClipSelection>; // sceneId -> ClipSelection

  // Actions
  setProject: (projectId: string) => void;
  selectClip: (sceneId: string, suggestionId: string, videoId: string) => void;
  clearSelection: (sceneId: string) => void;
  isSceneComplete: (sceneId: string) => boolean;
  getCompletionProgress: () => { completed: number; total: number };
  reset: () => void;
}

export const useCurationStore = create<CurationState>()(
  persist(
    (set, get) => ({
      projectId: null,
      selections: new Map(),

      setProject: (projectId) => set({ projectId }),

      selectClip: (sceneId, suggestionId, videoId) => {
        set((state) => {
          const newSelections = new Map(state.selections);
          newSelections.set(sceneId, { sceneId, suggestionId, videoId });
          return { selections: newSelections };
        });

        // Save to database asynchronously
        saveClipSelection(get().projectId!, sceneId, suggestionId);
      },

      clearSelection: (sceneId) => {
        set((state) => {
          const newSelections = new Map(state.selections);
          newSelections.delete(sceneId);
          return { selections: newSelections };
        });
      },

      isSceneComplete: (sceneId) => {
        return get().selections.has(sceneId);
      },

      getCompletionProgress: () => {
        const state = get();
        // Assuming total scenes fetched from scenes list
        return {
          completed: state.selections.size,
          total: totalScenes // from context
        };
      },

      reset: () => set({ projectId: null, selections: new Map() }),
    }),
    {
      name: 'curation-storage',
    }
  )
);
```

**API Endpoint:**
```typescript
// app/api/projects/[id]/select-clip/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { sceneId, suggestionId } = await request.json();

  // Update scenes table with selected_clip_id
  db.prepare(`
    UPDATE scenes
    SET selected_clip_id = ?
    WHERE id = ?
  `).run(suggestionId, sceneId);

  return Response.json({ success: true });
}
```

**Database Extension (Migration v7):**
```sql
-- Add selected_clip_id to scenes table
ALTER TABLE scenes ADD COLUMN selected_clip_id TEXT;
ALTER TABLE scenes ADD FOREIGN KEY (selected_clip_id) REFERENCES visual_suggestions(id);
```

**Selection Behavior:**
- **One Selection Per Scene:** Selecting new clip automatically deselects previous
- **Visual Feedback:** Checkmark badge, indigo border, shadow glow
- **Optimistic UI:** Selection appears immediately, saved asynchronously
- **Error Handling:** If save fails, toast notification + revert UI state
- **Progress Tracking:** Real-time update of "3/5 scenes selected" counter

#### Story 4.5: Assembly Trigger & Validation Workflow

**Component:**
```typescript
// components/features/curation/AssemblyTriggerButton.tsx
interface AssemblyTriggerButtonProps {
  totalScenes: number;
  completedScenes: number;
  onTrigger: () => void;
}

export function AssemblyTriggerButton({ totalScenes, completedScenes, onTrigger }: AssemblyTriggerButtonProps) {
  const isComplete = completedScenes === totalScenes;
  const [showConfirmation, setShowConfirmation] = useState(false);

  return (
    <>
      {/* Sticky Footer */}
      <div className="assembly-footer">
        <button
          className="btn-assemble"
          disabled={!isComplete}
          onClick={() => setShowConfirmation(true)}
        >
          <span>🎬</span>
          <span>Assemble Video</span>
        </button>

        {!isComplete && (
          <div className="tooltip">
            Select clips for all {totalScenes} scenes to continue
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <ConfirmationModal
          onConfirm={onTrigger}
          onCancel={() => setShowConfirmation(false)}
          sceneCount={totalScenes}
        />
      )}
    </>
  );
}

// components/features/curation/ConfirmationModal.tsx
interface ConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  sceneCount: number;
}

export function ConfirmationModal({ onConfirm, onCancel, sceneCount }: ConfirmationModalProps) {
  return (
    <div className="confirm-modal">
      <div className="confirm-content">
        <div className="confirm-icon">🎬</div>
        <h2 className="confirm-title">Ready to Assemble Your Video?</h2>
        <p className="confirm-message">
          You've selected clips for all {sceneCount} scenes.
          This will create your final video with synchronized voiceovers.
        </p>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>Not Yet</button>
          <button className="btn-confirm" onClick={onConfirm}>Assemble Video</button>
        </div>
      </div>
    </div>
  );
}
```

**API Endpoint:**
```typescript
// app/api/projects/[id]/assemble/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Get all scenes with selections
  const scenes = db.prepare(`
    SELECT
      s.id,
      s.scene_number,
      s.text,
      s.audio_file_path,
      s.duration,
      vs.video_id,
      vs.embed_url,
      vs.default_segment_path
    FROM scenes s
    LEFT JOIN visual_suggestions vs ON s.selected_clip_id = vs.id
    WHERE s.project_id = ?
    ORDER BY s.scene_number ASC
  `).all(params.id);

  // Validate all scenes have selections
  const incomplete = scenes.filter(s => !s.video_id);
  if (incomplete.length > 0) {
    return Response.json({
      success: false,
      error: `${incomplete.length} scenes missing clip selections`
    }, { status: 400 });
  }

  // Update project workflow step
  db.prepare(`
    UPDATE projects
    SET current_step = 'assembly'
    WHERE id = ?
  `).run(params.id);

  // Trigger Epic 5 video assembly (async job)
  const assemblyJobId = await triggerVideoAssembly(params.id, scenes);

  return Response.json({
    success: true,
    data: { assemblyJobId, sceneCount: scenes.length }
  });
}
```

**UX Specifications:**
- **Footer:** Sticky at bottom, 88px height, Slate 800 background
- **Button State (Disabled):** Gray background, opacity 0.6, cursor not-allowed
- **Button State (Enabled):** Indigo 500, hover effect (transform + shadow)
- **Tooltip:** Positioned above button when disabled
- **Modal:** Backdrop blur, center-aligned, 500px max-width
- **Confirmation Flow:** Click → Modal → Confirm → Navigate to assembly page

#### Story 4.6: Visual Curation Workflow Integration & Error Recovery

**Navigation Flow:**
```typescript
// Workflow progression
Epic 2 (Voiceover Preview)
  ↓ [Continue to Visual Curation button]
Epic 3 (Visual Sourcing) - Auto-triggered
  ↓ [Progress: Analyzing scenes, searching YouTube, downloading segments]
Epic 4 (Visual Curation) - Auto-navigate on completion
  ↓ [User selects clips scene-by-scene]
  ↓ [All scenes complete → Assemble Video button enabled]
Epic 5 (Video Assembly) - Triggered by user
```

**Navigation Components:**
```typescript
// components/features/curation/NavigationBreadcrumb.tsx
interface BreadcrumbStep {
  label: string;
  path?: string;
}

export function NavigationBreadcrumb({ steps, currentStep }: { steps: BreadcrumbStep[]; currentStep: string }) {
  return (
    <div className="breadcrumb">
      {steps.map((step, index) => (
        <React.Fragment key={step.label}>
          {step.path ? (
            <Link href={step.path} className="breadcrumb-link">
              {step.label}
            </Link>
          ) : (
            <span className={step.label === currentStep ? 'current' : ''}>
              {step.label}
            </span>
          )}
          {index < steps.length - 1 && <span>→</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
```

**Error Recovery:**
```typescript
// Regenerate visuals if unsatisfied with suggestions
async function handleRegenerateVisuals(projectId: string) {
  try {
    // Clear existing suggestions
    await fetch(`/api/projects/${projectId}/visual-suggestions`, {
      method: 'DELETE'
    });

    // Trigger Epic 3 visual sourcing again
    await fetch(`/api/projects/${projectId}/generate-visuals`, {
      method: 'POST'
    });

    // Navigate to loading screen
    router.push(`/projects/${projectId}/visual-sourcing`);
  } catch (error) {
    toast.error('Failed to regenerate visuals. Please try again.');
  }
}
```

**Session Persistence:**
```typescript
// localStorage for scroll position and preview state
useEffect(() => {
  // Save scroll position
  const handleScroll = () => {
    localStorage.setItem(
      `curation-scroll-${projectId}`,
      window.scrollY.toString()
    );
  };
  window.addEventListener('scroll', handleScroll);

  // Restore scroll position on mount
  const savedScroll = localStorage.getItem(`curation-scroll-${projectId}`);
  if (savedScroll) {
    window.scrollTo(0, parseInt(savedScroll));
  }

  return () => window.removeEventListener('scroll', handleScroll);
}, [projectId]);
```

**Edge Case Handling:**
- **Missing Audio:** Display error + option to regenerate voiceovers
- **Missing Suggestions:** Show empty state + manual search option
- **Incomplete Selection Navigation:** Warning modal when leaving page
- **Workflow Step Validation:** Redirect if accessed before Epic 3 complete

**State:**
- `stores/curation-store.ts` - Clip selections, progress, session data

**UX Specifications (Complete Epic 4):**
- **Layout:** Desktop-first (1920px), responsive tablet (768px), mobile (375px)
- **Color System:** Dark mode (Slate 900/800/700), Indigo 500 accents
- **Typography:** Inter font family, clear hierarchy
- **Component Library:** shadcn/ui (Button, Card, Dialog, Progress)
- **Video Player:** HTML5 with controls, YouTube iframe fallback
- **Interactions:** Click to select, hover effects, keyboard shortcuts
- **Progress Tracking:** Real-time completion counter, visual indicators
- **Validation:** All scenes must have selections before assembly
- **Accessibility:** WCAG AA compliant, keyboard navigation, ARIA labels

---

### Epic 5: Video Assembly & Output

**Goal:** Automatically combine user selections into a final, downloadable video file with synchronized audio and visuals.

**Backend:**
- `app/api/projects/[id]/assemble/route.ts` - Assembly trigger endpoint
- `app/api/projects/[id]/assembly-status/route.ts` - Progress polling endpoint
- `app/api/projects/[id]/export/route.ts` - Export metadata endpoint
- `lib/video/ffmpeg.ts` - FFmpeg command builder utilities
- `lib/video/assembler.ts` - Assembly pipeline orchestration
- `lib/video/thumbnail.ts` - Thumbnail generation logic

**Components:**
- `app/projects/[id]/assembly/page.tsx` - Assembly progress page route
- `components/features/assembly/AssemblyProgress.tsx` - Progress UI with scene tracking
- `app/projects/[id]/export/page.tsx` - Export page route
- `components/features/export/ExportPage.tsx` - Video/thumbnail download UI

---

#### Story 5.1: Video Processing Infrastructure Setup

**Database Extension (Migration v8):**
```sql
-- Assembly jobs table for tracking video assembly progress
CREATE TABLE assembly_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, complete, error
  progress INTEGER DEFAULT 0, -- 0-100 percentage
  current_stage TEXT, -- 'trimming', 'concatenating', 'audio_overlay', 'thumbnail', 'finalizing'
  current_scene INTEGER, -- Scene number being processed
  total_scenes INTEGER,
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_assembly_jobs_project ON assembly_jobs(project_id);
CREATE INDEX idx_assembly_jobs_status ON assembly_jobs(status);
```

**FFmpeg Client:**
```typescript
// lib/video/ffmpeg.ts
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class FFmpegClient {
  private ffmpegPath: string = 'ffmpeg'; // Assumes ffmpeg in PATH

  async getVideoDuration(videoPath: string): Promise<number> {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    return parseFloat(stdout.trim());
  }

  async trimToAudioDuration(
    videoPath: string,
    audioPath: string,
    outputPath: string
  ): Promise<void> {
    const audioDuration = await this.getVideoDuration(audioPath);

    await execAsync(
      `ffmpeg -y -i "${videoPath}" -t ${audioDuration} -c:v libx264 -c:a aac "${outputPath}"`
    );
  }

  async overlayAudio(
    videoPath: string,
    audioPath: string,
    outputPath: string
  ): Promise<void> {
    // Remove original audio, add voiceover audio
    await execAsync(
      `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -map 0:v:0 -map 1:a:0 "${outputPath}"`
    );
  }

  async concatenateVideos(
    inputPaths: string[],
    outputPath: string
  ): Promise<void> {
    // Create concat list file
    const listPath = outputPath.replace('.mp4', '-list.txt');
    const listContent = inputPaths.map(p => `file '${p}'`).join('\n');
    await writeFile(listPath, listContent);

    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`
    );

    // Clean up list file
    await unlink(listPath);
  }

  async extractFrame(
    videoPath: string,
    timestamp: number,
    outputPath: string
  ): Promise<void> {
    await execAsync(
      `ffmpeg -y -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`
    );
  }

  async addTextOverlay(
    imagePath: string,
    text: string,
    outputPath: string
  ): Promise<void> {
    // Add title text at bottom third of thumbnail
    const escapedText = text.replace(/'/g, "'\\''");
    await execAsync(
      `ffmpeg -y -i "${imagePath}" -vf "drawtext=text='${escapedText}':fontsize=48:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h*0.75" "${outputPath}"`
    );
  }
}
```

**Environment Variables:**
```bash
# .env.local
FFMPEG_PATH=ffmpeg  # Path to FFmpeg executable (default: system PATH)
```

---

#### Story 5.2: Scene Video Trimming & Preparation

**Assembler Pipeline:**
```typescript
// lib/video/assembler.ts
import { FFmpegClient } from './ffmpeg';
import db from '@/lib/db/client';

interface AssemblyScene {
  sceneNumber: number;
  videoPath: string;      // Downloaded segment from Epic 3
  audioPath: string;      // Generated voiceover from Epic 2
  duration: number;       // Audio duration in seconds
}

export class VideoAssembler {
  private ffmpeg = new FFmpegClient();
  private projectId: string;
  private jobId: string;
  private outputDir: string;

  constructor(projectId: string, jobId: string) {
    this.projectId = projectId;
    this.jobId = jobId;
    this.outputDir = `.cache/assembly/${projectId}`;
  }

  async assembleVideo(scenes: AssemblyScene[]): Promise<string> {
    await mkdir(this.outputDir, { recursive: true });

    const trimmedPaths: string[] = [];

    // Phase 1: Trim each scene to voiceover duration
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      await this.updateProgress('trimming', i + 1, scenes.length);

      const trimmedPath = `${this.outputDir}/scene-${scene.sceneNumber}-trimmed.mp4`;
      await this.ffmpeg.trimToAudioDuration(
        scene.videoPath,
        scene.audioPath,
        trimmedPath
      );

      // Phase 2: Overlay audio on trimmed video
      await this.updateProgress('audio_overlay', i + 1, scenes.length);

      const withAudioPath = `${this.outputDir}/scene-${scene.sceneNumber}-audio.mp4`;
      await this.ffmpeg.overlayAudio(
        trimmedPath,
        scene.audioPath,
        withAudioPath
      );

      trimmedPaths.push(withAudioPath);
    }

    // Phase 3: Concatenate all scenes
    await this.updateProgress('concatenating', scenes.length, scenes.length);

    const finalPath = `.cache/output/${this.projectId}/final.mp4`;
    await mkdir(`.cache/output/${this.projectId}`, { recursive: true });
    await this.ffmpeg.concatenateVideos(trimmedPaths, finalPath);

    return finalPath;
  }

  private async updateProgress(
    stage: string,
    currentScene: number,
    totalScenes: number
  ): Promise<void> {
    // Calculate progress percentage
    const stageWeight = {
      trimming: 0.3,
      audio_overlay: 0.3,
      concatenating: 0.2,
      thumbnail: 0.1,
      finalizing: 0.1,
    };

    let progress = 0;
    if (stage === 'trimming') {
      progress = Math.round((currentScene / totalScenes) * 30);
    } else if (stage === 'audio_overlay') {
      progress = 30 + Math.round((currentScene / totalScenes) * 30);
    } else if (stage === 'concatenating') {
      progress = 60;
    } else if (stage === 'thumbnail') {
      progress = 80;
    } else if (stage === 'finalizing') {
      progress = 90;
    }

    db.prepare(`
      UPDATE assembly_jobs
      SET progress = ?, current_stage = ?, current_scene = ?, total_scenes = ?
      WHERE id = ?
    `).run(progress, stage, currentScene, totalScenes, this.jobId);
  }
}
```

---

#### Story 5.3: Video Concatenation & Audio Overlay

**Assembly Trigger API:**
```typescript
// app/api/projects/[id]/assemble/route.ts
import { VideoAssembler } from '@/lib/video/assembler';
import { ThumbnailGenerator } from '@/lib/video/thumbnail';
import db from '@/lib/db/client';
import { randomUUID } from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;

  // Validate all scenes have selections
  const scenes = db.prepare(`
    SELECT
      s.id,
      s.scene_number,
      s.text,
      s.audio_file_path,
      s.duration,
      vs.default_segment_path
    FROM scenes s
    JOIN visual_suggestions vs ON s.selected_clip_id = vs.id
    WHERE s.project_id = ?
    ORDER BY s.scene_number ASC
  `).all(projectId);

  const incomplete = scenes.filter(s => !s.default_segment_path || !s.audio_file_path);
  if (incomplete.length > 0) {
    return Response.json({
      success: false,
      error: `${incomplete.length} scenes missing required files`
    }, { status: 400 });
  }

  // Create assembly job
  const jobId = randomUUID();
  db.prepare(`
    INSERT INTO assembly_jobs (id, project_id, status, total_scenes, started_at)
    VALUES (?, ?, 'processing', ?, datetime('now'))
  `).run(jobId, projectId, scenes.length);

  // Update project step
  db.prepare(`
    UPDATE projects SET current_step = 'assembly' WHERE id = ?
  `).run(projectId);

  // Run assembly asynchronously
  runAssembly(projectId, jobId, scenes).catch(error => {
    db.prepare(`
      UPDATE assembly_jobs
      SET status = 'error', error_message = ?
      WHERE id = ?
    `).run(error.message, jobId);
  });

  return Response.json({
    success: true,
    data: { jobId, sceneCount: scenes.length }
  });
}

async function runAssembly(
  projectId: string,
  jobId: string,
  scenes: any[]
): Promise<void> {
  const assembler = new VideoAssembler(projectId, jobId);
  const thumbnailGen = new ThumbnailGenerator(projectId);

  // Assemble video
  const assemblyScenes = scenes.map(s => ({
    sceneNumber: s.scene_number,
    videoPath: s.default_segment_path,
    audioPath: s.audio_file_path,
    duration: s.duration,
  }));

  const videoPath = await assembler.assembleVideo(assemblyScenes);

  // Generate thumbnail
  db.prepare(`
    UPDATE assembly_jobs SET current_stage = 'thumbnail', progress = 80 WHERE id = ?
  `).run(jobId);

  const project = db.prepare('SELECT name, topic FROM projects WHERE id = ?').get(projectId);
  const thumbnailPath = await thumbnailGen.generate(videoPath, project.name || project.topic);

  // Get video metadata
  const videoStats = await stat(videoPath);
  const duration = await new FFmpegClient().getVideoDuration(videoPath);

  // Save rendered video record
  const videoId = randomUUID();
  db.prepare(`
    INSERT INTO rendered_videos (id, project_id, file_path, thumbnail_path, duration_seconds, file_size_bytes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(videoId, projectId, videoPath, thumbnailPath, duration, videoStats.size);

  // Complete job
  db.prepare(`
    UPDATE assembly_jobs
    SET status = 'complete', progress = 100, current_stage = 'finalizing', completed_at = datetime('now')
    WHERE id = ?
  `).run(jobId);

  // Update project step
  db.prepare(`
    UPDATE projects SET current_step = 'export' WHERE id = ?
  `).run(projectId);
}
```

**Assembly Status Polling API:**
```typescript
// app/api/projects/[id]/assembly-status/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const job = db.prepare(`
    SELECT id, status, progress, current_stage, current_scene, total_scenes, error_message
    FROM assembly_jobs
    WHERE project_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(params.id);

  if (!job) {
    return Response.json({
      success: false,
      error: 'No assembly job found'
    }, { status: 404 });
  }

  return Response.json({
    success: true,
    data: {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      currentStage: job.current_stage,
      currentScene: job.current_scene,
      totalScenes: job.total_scenes,
      error: job.error_message,
    }
  });
}
```

---

#### Story 5.4: Automated Thumbnail Generation

**Thumbnail Generator:**
```typescript
// lib/video/thumbnail.ts
import { FFmpegClient } from './ffmpeg';

export class ThumbnailGenerator {
  private ffmpeg = new FFmpegClient();
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  async generate(videoPath: string, title: string): Promise<string> {
    const outputDir = `.cache/output/${this.projectId}`;
    const tempFramePath = `${outputDir}/thumbnail-temp.jpg`;
    const finalPath = `${outputDir}/thumbnail.jpg`;

    // Extract candidate frames at 10%, 30%, 50%, 70%
    const duration = await this.ffmpeg.getVideoDuration(videoPath);
    const timestamps = [0.1, 0.3, 0.5, 0.7].map(p => duration * p);

    // Score frames and select best (simplified: use 30% mark)
    // In production, use Vision API or heuristics to score visual appeal
    const bestTimestamp = timestamps[1]; // 30% mark usually has good content

    await this.ffmpeg.extractFrame(videoPath, bestTimestamp, tempFramePath);

    // Add title text overlay
    const displayTitle = this.formatTitle(title);
    await this.ffmpeg.addTextOverlay(tempFramePath, displayTitle, finalPath);

    // Clean up temp frame
    await unlink(tempFramePath);

    return finalPath;
  }

  private formatTitle(title: string): string {
    // Truncate for thumbnail display
    if (title.length > 40) {
      return title.substring(0, 37) + '...';
    }
    return title;
  }
}
```

**Advanced Frame Selection (Future Enhancement):**
```typescript
// Frame scoring algorithm (can use Vision API labels)
async function scoreFrame(framePath: string, expectedLabels: string[]): Promise<number> {
  // Score based on:
  // - Visual clarity (not too dark/bright)
  // - Composition (rule of thirds)
  // - Relevance to topic (label matching)
  // - No text overlays or faces
  return 50; // Placeholder
}
```

---

#### Story 5.5: Export UI & Download Workflow

**Export Metadata API:**
```typescript
// app/api/projects/[id]/export/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Get rendered video info
  const video = db.prepare(`
    SELECT id, file_path, thumbnail_path, duration_seconds, file_size_bytes, created_at
    FROM rendered_videos
    WHERE project_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(params.id);

  if (!video) {
    return Response.json({
      success: false,
      error: 'No rendered video found'
    }, { status: 404 });
  }

  // Get project metadata
  const project = db.prepare(`
    SELECT name, topic FROM projects WHERE id = ?
  `).get(params.id);

  // Count scenes
  const sceneCount = db.prepare(`
    SELECT COUNT(*) as count FROM scenes WHERE project_id = ?
  `).get(params.id).count;

  return Response.json({
    success: true,
    data: {
      video: {
        path: video.file_path,
        thumbnailPath: video.thumbnail_path,
        durationSeconds: video.duration_seconds,
        fileSizeBytes: video.file_size_bytes,
        createdAt: video.created_at,
      },
      project: {
        name: project.name,
        topic: project.topic,
        sceneCount,
      },
      download: {
        videoFilename: sanitizeFilename(project.name || project.topic) + '.mp4',
        thumbnailFilename: sanitizeFilename(project.name || project.topic) + '-thumbnail.jpg',
      }
    }
  });
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')          // Spaces to hyphens
    .substring(0, 50);             // Truncate
}
```

**Video File Download API:**
```typescript
// app/api/videos/[...path]/route.ts
import { readFile, stat } from 'fs/promises';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const filePath = path.join(process.cwd(), '.cache', ...params.path);

  try {
    const fileStats = await stat(filePath);
    const fileContent = await readFile(filePath);

    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.mp4' ? 'video/mp4' :
                        ext === '.jpg' ? 'image/jpeg' :
                        'application/octet-stream';

    return new Response(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStats.size.toString(),
        'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: 'File not found' }, { status: 404 });
  }
}
```

**Key Integration Points:**
- Epic 4 Story 4.5 triggers assembly via POST `/api/projects/[id]/assemble`
- Assembly Progress UI polls GET `/api/projects/[id]/assembly-status`
- Export Page fetches metadata via GET `/api/projects/[id]/export`
- Downloads served via GET `/api/videos/[...path]`

**UX Specifications (from ux-design-specification.md Section 7.6-7.7):**
- Assembly Progress: Scene-by-scene status tracking with stage messages
- Export Page: Video player with preview, thumbnail sidebar, download buttons
- Metadata: Duration, file size, resolution, topic, scene count
- Actions: Download Video, Download Thumbnail, Create New Video, Back to Curation

**Workflow States:**
```
'visual-curation' → 'assembly' → 'export' → 'complete'
```

---

### Epic 5 Database Schema Summary

**New Tables:**
- `assembly_jobs` - Tracks assembly progress and status

**Extended Tables:**
- `rendered_videos` - Already exists (line 3061)

**Migration v8:**
```sql
-- Add assembly_jobs table
CREATE TABLE IF NOT EXISTS assembly_jobs (
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
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assembly_jobs_project ON assembly_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_assembly_jobs_status ON assembly_jobs(status);
```

---

### Epic 6: Channel Intelligence & Automated Video Production

**Goal:** Enable creators to go from "topic idea" to "finished video" with a single click using RAG-powered topic suggestions and domain-specific content APIs.

**Epic Overview:**
- **Feature 2.7:** Channel Intelligence & Content Research (RAG-Powered)
- **Feature 2.8:** Pixabay Music Provider (legal music sourcing)
- **Feature 2.9:** Automated Video Production Pipeline (Quick Production Flow)

This epic transforms the video creation workflow from manual, multi-step process to intelligent, one-click automation by leveraging:
- RAG (Retrieval-Augmented Generation) for channel learning and topic recommendations
- Quick Production Flow for automated pipeline execution
- Domain-specific content APIs via MCP servers (PRIMARY architecture for QPF)

---

#### Feature 2.7: Channel Intelligence & Content Research (RAG-Powered)

**Goal:** VidIQ-style intelligence system that syncs with YouTube channels, analyzes competitors, monitors trends, and generates scripts informed by the user's niche and style.

**Architecture Pattern:** Retrieval-Augmented Generation (RAG)

**Components:**
- `lib/rag/modes/established-channel.ts` - Existing channel sync
- `lib/rag/modes/cold-start.ts` - New channel niche learning
- `lib/rag/ingestion/youtube-captions.ts` - YouTube transcript scraping
- `lib/rag/ingestion/news-sources.ts` - Niche-specific news RSS
- `lib/rag/embeddings/local-embeddings.ts` - sentence-transformers integration
- `lib/rag/vector-db/chroma-client.ts` - ChromaDB vector store wrapper
- `lib/rag/generation/rag-script-generator.ts` - RAG-augmented script generation
- `lib/rag/generation/topic-suggestions.ts` - AI topic recommendations

**API Endpoints:**
- `POST /api/rag/setup` - Initialize RAG for project
- `POST /api/rag/sync` - Trigger manual RAG data sync
- `GET /api/rag/status` - Get RAG configuration and sync status
- `GET /api/projects/[id]/topic-suggestions` - Get RAG-generated topic suggestions

---

#### Feature 2.9: Automated Video Production Pipeline

**Goal:** A one-click video creation system that transforms RAG-generated topic suggestions into complete, ready-to-export videos through fully automated script generation, TTS, visual sourcing, and assembly.

**Operating Modes:**
- **Quick Production Flow (QPF):** One-click video creation from RAG topic suggestions
- **Domain-Specific Automation:** Military content uses DVIDS API, space content uses NASA API, stock footage uses Pexels/Pixabay APIs
- **No Manual Curation:** System automatically selects best-matching visuals
- **No YouTube API:** QPF uses ONLY domain-specific content APIs via MCP servers

**Architecture Diagram:**

```
┌─────────────────────────────────────────────────────────────────┐
│                Quick Production Flow Pipeline                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Topic Suggestions UI (Channel Intelligence Page)            │
│     - Display RAG-generated topics                                │
│     - "Create Video" button on each topic card                 │
│                         ↓ Click "Create Video"                   │
│  2. Defaults Resolution                                         │
│     - Load user_preferences (default_voice_id, default_persona_id)│
│     - If no defaults: redirect to settings                        │
│                         ↓                                        │
│  3. Project Creation (POST /api/projects/quick-create)       │
│     - Create project with topic pre-filled                         │
│     - Set topic_confirmed = true                                 │
│     - Apply default voice + persona                                │
│     - Attach RAG context                                         │
│                         ↓                                        │
│  4. Pipeline Orchestration                                      │
│     - Trigger script generation with RAG context                 │
│     - Trigger voiceover generation                               │
│     - Trigger visual sourcing + auto-selection                   │
│     - Trigger video assembly                                     │
│                         ↓                                        │
│  5. Progress Tracking & Navigation                                │
│     - Redirect to /projects/[id]/progress                        │
│     - Real-time status updates via polling                         │
│     - Auto-redirect to /projects/[id]/export on complete         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Database Schema:**

```sql
-- Migration 015: User Preferences for Quick Production Flow
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_voice_id TEXT,           -- No FK: voices defined in TypeScript
  default_persona_id TEXT,
  quick_production_enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (default_persona_id) REFERENCES system_prompts(id) ON DELETE SET NULL
);

-- Migration 016: Add default duration
ALTER TABLE user_preferences ADD COLUMN default_duration INTEGER DEFAULT 2;
```

**API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/user-preferences` | GET | Get user's Quick Production defaults |
| `/api/user-preferences` | PUT | Update defaults (voice, persona, duration) |
| `/api/projects/quick-create` | POST | One-click video creation |
| `/api/projects/[id]/pipeline-status` | GET | Poll pipeline progress |
| `/api/projects/[id]/auto-select-visuals` | POST | Auto-select best clips |

**Pipeline Stages:**
1. **Script Generation** - `POST /api/projects/[id]/generate-script`
2. **Voiceover Generation** - `POST /api/projects/[id]/generate-voiceovers`
3. **Visual Sourcing** - `POST /api/projects/[id]/generate-visuals`
4. **Auto-Select Visuals** - `POST /api/projects/[id]/auto-select-visuals`
5. **Video Assembly** - `POST /api/projects/[id]/assemble`

**Auto-Selection Algorithm:**

```typescript
// Ranking Formula
combinedScore = (durationFit × 0.6) + (relevanceScore × 0.4)

Where:
- durationFit = 1 - (|actualDuration - targetDuration| / tolerance)
- relevanceScore = From search position (1.0 for #1, decreasing)
```

---

#### Visual Source Providers (Domain-Specific MCP Architecture)

**Provider Interface Pattern:**

```
VideoSourceProvider interface
├── DVIDS_MCP_Provider (via MCP server)
├── NASA_MCP_Provider (via MCP server)
├── Pexels_MCP_Provider (stock footage, via MCP server)
├── Pixabay_MCP_Provider (stock footage, via MCP server)
└── MockVideoProvider (testing only)
```

**Note:** Quick Production Flow uses ONLY domain-specific content APIs via MCP servers. Unlike the manual pipeline (Epic 3, Feature 1.5), QPF does NOT use YouTube API.

**Provider Responsibilities:**
- `search(query, options)` - Search for videos
- `autoSelect(results, options)` - Automatically select best match
- `download(videoId, options)` - Download to local cache
- `isAvailable()` - Check if provider is configured
- `getHealthStatus()` - Get quota/rate limit status

---

#### MCP Server Architecture (Primary Design for QPF)

**Purpose:** Act as API gateway between application and content sources.

**Key Design Principle:** MCP servers act as "unofficial API keys" — they handle all external API authentication internally.

**Application Does NOT:**
- Store or manage external API keys
- Communicate directly with DVIDS, NASA, etc.
- Handle API authentication logic

**Application Does:**
- Communicate with MCP servers via Model Context Protocol
- Request content from MCP servers
- Receive results without any API key knowledge

**Architecture Benefits:**
- Complete isolation of API credentials from application codebase
- MCP server layer abstracts away all authentication complexity
- Simplified security model (no API keys in application)

**MCP Server Responsibilities:**
- Rate limiting enforcement (30-second default per request)
- Request queuing and caching
- API authentication (handled internally, never exposed to app)
- Error handling and retry logic
- Usage monitoring and logging

**Domain-Specific Providers:**

| Provider | Content | Rate Limit | Licensing | Implementation Priority |
|----------|---------|------------|-----------|------------------------|
| DVIDS | U.S. military footage | 30s/request | Public domain | Phase 1 (Primary) |
| NASA | Space/astronomy footage | 30s/request | Public domain | Phase 2 |
| Pexels | Stock footage | TBD | Free tier | Phase 3 |
| Pixabay | Stock footage | 500/hour | Royalty-free | Phase 3 |

---

#### Security Considerations

**MCP Server Authentication:**
- **MCP servers act as "unofficial API keys"** — they handle all external API authentication
- Application does NOT store or manage any external API keys
- Application communicates only with MCP servers via Model Context Protocol
- MCP servers handle communication with external APIs using their own credentials
- API keys are completely isolated from the application codebase

**Architecture Benefit:** This separation means the application never needs to handle, store, or manage sensitive API credentials. The MCP server layer abstracts all of that away.

**Rate Limiting:**
- Enforced at MCP server layer
- Per-provider configurable limits
- Progress UI shows "Sourcing visuals (scene X of Y)..." during delays

**Error Handling:**
- Graceful failure if domain API unavailable
- Clear error messages (QPF has no fallback to other providers)
- Pipeline state cleanup on errors

---

#### Project Structure

```
src/
├── lib/
│   ├── db/
│   │   ├── queries-user-preferences.ts    # User preferences queries
│   │   └── migrations/
│   │       ├── 015_user_preferences.ts    # Create user_preferences table
│   │       └── 016_user_preferences_duration.ts  # Add default_duration
│   └── video-sources/ (MCP provider implementations)
│       ├── provider.ts                     # VideoSourceProvider interface
│       ├── mcp-provider.ts                 # MCP base class
│       ├── dvids-mcp-provider.ts           # DVIDS implementation
│       ├── nasa-mcp-provider.ts            # NASA implementation
│       └── mock-provider.ts                # Testing provider
└── app/
    └── api/
        ├── user-preferences/
        │   └── route.ts                    # GET/PUT user preferences
        └── projects/
            ├── quick-create/
            │   └── route.ts                # POST quick-create endpoint
            └── [id]/
                ├── pipeline-status/
                │   └── route.ts            # GET pipeline progress
                └── auto-select-visuals/
                    └── route.ts            # POST auto-select clips
```

**Note:** Stories 6.8a/6.8b implemented the QPF infrastructure (user preferences, quick-create API, pipeline-status API, progress UI). The MCP provider implementations are the next phase of Epic 6 development.

---

#### Integration with Existing Features

**Feature 2.7 (RAG):**
- RAG provides topic suggestions with context
- QPF consumes these suggestions for one-click video creation
- RAG context attached to project for informed script generation

**Feature 1.12 (Automate Mode):**
- QPF reuses Automate Mode pipeline orchestration
- Same pipeline stages, different entry point
- Shared progress tracking and status APIs

---
