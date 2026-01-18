# Epic 3: Visual Content Sourcing (YouTube API)

**Goal:** Intelligently source and suggest relevant B-roll footage for each script scene using YouTube as the primary content source, with duration filtering and automatic default segment downloads for instant preview.

**Features Included:**
- 1.5. AI-Powered Visual Sourcing (YouTube API Integration with Duration Filtering and Default Segment Downloads)

**User Value:** Creators save hours of manual footage searching by receiving AI-curated visual suggestions from YouTube's massive content library, including gaming footage, tutorials, nature content, and more. Duration filtering ensures videos are appropriate for scene length, and automatic segment downloads enable instant preview without waiting.

**Technical Approach:**
- Primary Source: YouTube Data API v3
- Search queries generated from scene text analysis
- Duration filtering: 1x-3x ratio with 5-minute max cap
- Automatic default segment download using yt-dlp
- Filter for appropriate licensing (Creative Commons when possible)
- Support for niche content (gaming, tutorials, vlogs, etc.)
- Handle YouTube API quotas and rate limiting

**Story Count Estimate:** 9 stories (6 original + 3 enhancement stories for advanced filtering and pipeline integration)

**Dependencies:**
- Epic 2 (needs script structure as input)

**Acceptance:**
- System analyzes scene text for visual themes
- Queries YouTube API successfully with relevant search terms
- Returns multiple relevant video clip options per scene
- Handles various content types (general footage, gaming, educational)
- Respects YouTube API quotas and implements appropriate error handling
- Suggestion quality meets user expectations
- **Pure B-roll results with no commentary, captions, or reaction content**
- **Google Cloud Vision API validates content relevance and quality**
- **Audio stripped from all downloaded segments**

---

### Epic 3 Stories

#### Story 3.1: YouTube API Client Setup & Configuration
**Goal:** Set up YouTube Data API v3 client with authentication and quota management infrastructure

**Tasks:**
- Obtain YouTube Data API v3 credentials (API key)
- Install googleapis library (@google/googleapis or similar)
- Create YouTubeAPIClient class (lib/youtube/client.ts)
- Implement API key configuration via environment variables
- Add quota tracking and rate limiting logic
- Implement exponential backoff for rate limit handling
- Create error handling for API failures (quota exceeded, invalid key, network errors)
- Add logging for API requests and quota usage

**Acceptance Criteria:**
- YouTubeAPIClient successfully initializes with valid API key from environment variable
- API client can make authenticated requests to YouTube Data API v3
- Quota tracking counts requests against daily limit (10,000 units default)
- Rate limiter prevents exceeding 100 requests per 100 seconds
- Exponential backoff retries failed requests (max 3 attempts)
- Error messages provide actionable guidance (e.g., "API key invalid - check YOUTUBE_API_KEY in .env.local")
- Logging captures request count, quota usage, and errors for debugging
- **Test Case:** When YOUTUBE_API_KEY is missing or empty in environment variables, system displays actionable error message: "YouTube API key not configured. Add YOUTUBE_API_KEY to .env.local" and prevents API calls

**References:**
- PRD Feature 1.5 (AI-Powered Visual Sourcing) lines 179-209
- PRD Feature 1.5 AC3 (API Error Handling) lines 206-209
- Epic 3 Technical Approach lines 571-575

---

#### Story 3.2: Scene Text Analysis & Search Query Generation
**Goal:** Analyze script scene text using LLM to extract visual themes and generate optimized YouTube search queries

**Tasks:**
- Create scene analysis prompt template (lib/llm/prompts/visual-search-prompt.ts)
- Design prompt to extract: main subject, setting, mood, action, keywords
- Implement query generation strategy:
  - Primary search query (most relevant)
  - Alternative search queries (2-3 variations for diversity)
  - Content type hints (gameplay, tutorial, nature, b-roll, etc.)
- Create analyzeSceneForVisuals() function (lib/youtube/analyze-scene.ts)
- Call LLM provider with scene text and analysis prompt
- Parse LLM response and extract search queries
- Validate search queries (non-empty, relevant keywords)
- Add fallback logic for LLM failures (use simple keyword extraction)

**Acceptance Criteria:**
- Given scene text "A majestic lion roams the savanna at sunset", system generates:
  - Primary query: "lion savanna sunset wildlife"
  - Alternative queries: ["african lion sunset", "lion walking grassland golden hour"]
  - Content type: "nature documentary"
- Search queries are relevant to scene content and optimized for YouTube search
- LLM analysis completes within 5 seconds per scene
- System handles various scene types: nature, gaming, tutorials, urban, abstract concepts
- Fallback keyword extraction works when LLM unavailable (extracts nouns/verbs from scene text)
- Invalid or empty LLM responses trigger fallback or retry

**References:**
- PRD Feature 1.5 (Visual Sourcing) lines 186-189
- PRD Feature 1.5 AC1 (Visual Suggestion) lines 197-201
- Epic 1 Story 1.3 (LLM Provider pattern) lines 155-180

---

#### Story 3.3: YouTube Video Search & Result Retrieval
**Goal:** Query YouTube API with generated search terms and retrieve relevant video clip suggestions

**Tasks:**
- Implement searchVideos() function in YouTubeAPIClient (lib/youtube/client.ts)
- Build YouTube Data API search.list request with parameters:
  - q (search query)
  - part: snippet
  - type: video
  - videoEmbeddable: true
  - maxResults: 10-15 per query
  - relevanceLanguage: en (configurable)
- Execute search for primary query and alternative queries
- Retrieve video metadata: videoId, title, thumbnail, channelTitle, duration (if available)
- Aggregate results from multiple queries (deduplicate by videoId)
- Sort results by relevance score
- Create POST /api/projects/[id]/generate-visuals endpoint
- Load all scenes for project from database
- For each scene: analyze text → generate queries → search YouTube → store suggestions
- Save video suggestions to database (new visual_suggestions table)
- Handle API errors gracefully (quota exceeded, invalid query, no results)

**Acceptance Criteria:**
- searchVideos() accepts search query and returns array of video results with metadata
- Each result includes: videoId, title, thumbnailUrl, channelTitle, embedUrl
- Search returns 10-15 relevant videos per query
- Results are embeddable (videoEmbeddable=true filter applied)
- Duplicate videos removed when aggregating multiple query results
- POST /api/projects/[id]/generate-visuals endpoint processes all scenes successfully
- Video suggestions saved to database with scene_id association
- API quota errors display user-friendly message and don't crash endpoint
- No results for query returns empty array (not error)
- **Test Case:** When YouTube returns 0 results for a search query, system passes empty array to Story 3.4 filter (which triggers fallback or empty state in Story 3.5 AC6)

**References:**
- PRD Feature 1.5 (Visual Sourcing) lines 179-209
- PRD Feature 1.5 AC1 (Visual Suggestion) lines 197-201
- PRD Feature 1.5 AC2 (Data Structure) lines 202-205
- YouTube Data API v3 documentation (search.list method)

---

#### Story 3.4: Content Filtering & Quality Ranking
**Goal:** Filter and rank YouTube search results to prioritize high-quality, appropriate content with duration filtering to ensure videos are suitable for scene length

**Tasks:**
- Implement content filtering logic (lib/youtube/filter-results.ts)
- **Duration Filtering (PRIMARY FILTER):**
  - Implement filterByDuration() function
  - Filter videos based on 1x-3x duration ratio relative to scene voiceover duration
  - Apply 5-minute (300 second) maximum duration cap regardless of scene length
  - Examples: 10s scene accepts 10s-30s videos; 90s scene accepts 90s-270s videos; 120s scene accepts 120s-300s (NOT 360s)
  - Fetch video duration via YouTube API videos.list (contentDetails.duration ISO 8601 format)
  - Parse ISO 8601 duration to seconds for comparison
- Filter by licensing preference:
  - Priority 1: Creative Commons licensed videos
  - Priority 2: Standard YouTube license (embeddable)
- Filter by content quality indicators:
  - Minimum view count threshold (configurable, default 1000)
  - Exclude videos with excessive title spam (ALL CAPS, excessive emojis)
  - Exclude explicit content (use YouTube API contentDetails.contentRating if available)
- Implement ranking algorithm:
  - Relevance score (from YouTube API)
  - View count (normalized)
  - Recency (newer videos score higher)
  - Channel authority (subscriber count if available)
- Support content-type specific filtering:
  - Gaming: filter for "gameplay", "no commentary" keywords
  - Tutorials: prioritize educational channels
  - Nature: prioritize documentary-style content
- Limit final suggestions to 5-8 videos per scene (top-ranked)
- Add configuration options for filtering preferences (lib/youtube/filter-config.ts)
- Implement fallback logic: If insufficient results after duration filtering, relax duration threshold (1x-5x ratio, then remove cap)

**Acceptance Criteria:**
- **Duration filtering applied FIRST before other filters**
- **Given scene with 30s voiceover, only videos 30s-90s (1x-3x) pass duration filter**
- **Given scene with 180s voiceover, max duration capped at 300s (5 min), NOT 540s (3x)**
- **ISO 8601 duration parsing correctly converts "PT1M30S" to 90 seconds**
- Creative Commons videos ranked higher than standard license (when available)
- Videos with <1000 views filtered out (spam prevention)
- Title spam detection removes videos with >5 emojis or >50% ALL CAPS
- Ranking algorithm produces diverse, high-quality suggestions
- Gaming content filtering successfully identifies "gameplay only" videos
- Final suggestions limited to 5-8 top-ranked videos per scene
- Filtering preferences configurable via filter-config.ts
- **Fallback 1:** If <3 videos pass strict duration filter (1x-3x), relax to 1x-5x ratio
- **Fallback 2:** If still <3 videos, remove 5-minute cap and accept any video ≥1x scene duration
- **Fallback 3:** If no videos pass filters, relax criteria incrementally (remove view count threshold, then title filters)
- **Test Case:** When all results fail initial filters (e.g., all videos <1000 views), system relaxes view count threshold first, then title spam filters, ensuring at least 1-3 suggestions returned if any results exist from Story 3.3

**References:**
- PRD Feature 1.5 (Visual Sourcing) lines 191-192
- PRD Feature 2.2 (Advanced Content Filtering) lines 312-313
- Epic 3 Technical Approach lines 573-575

---

#### Story 3.5: Visual Suggestions Database & Workflow Integration
**Goal:** Store visual suggestions in database with duration and segment download tracking, and integrate visual sourcing step into project workflow

**Tasks:**
- Create visual_suggestions table in database:
  - id (primary key)
  - scene_id (foreign key to scenes table)
  - video_id (YouTube video ID)
  - title, thumbnail_url, channel_title, embed_url
  - rank (suggestion ranking 1-8)
  - **duration INTEGER (video duration in seconds from Story 3.4)**
  - **default_segment_path TEXT (path to downloaded default segment from Story 3.6)**
  - **download_status TEXT DEFAULT 'pending' (pending, downloading, complete, error from Story 3.6)**
  - created_at timestamp
- Add index on visual_suggestions(scene_id)
- Implement database query functions (lib/db/queries.ts):
  - saveVisualSuggestions(sceneId, suggestions[])
  - getVisualSuggestions(sceneId)
  - getVisualSuggestionsByProject(projectId)
  - **updateSegmentDownloadStatus(suggestionId, status, filePath)**
- Update projects table: Add visuals_generated boolean flag
- Update POST /api/projects/[id]/generate-visuals to save suggestions to database
- Implement GET /api/projects/[id]/visual-suggestions endpoint to retrieve suggestions
- Create VisualSourcing.tsx loading screen component
- Trigger visual sourcing automatically after voiceover generation completes (Epic 2 Story 2.5)
- Update projects.current_step = 'visual-curation' after visual sourcing completes
- Display progress indicator during visual sourcing (X/Y scenes analyzed)
- Add error recovery for partial completion

**Acceptance Criteria:**
- visual_suggestions table created with all required fields and foreign key constraints
- **duration column stores video duration in seconds (INTEGER, nullable for backward compatibility)**
- **default_segment_path column stores file path to downloaded segment (TEXT, NULL until download completes)**
- **download_status column defaults to 'pending' and updates to 'downloading', 'complete', or 'error'**
- Index on scene_id improves query performance
- saveVisualSuggestions() stores 5-8 suggestions per scene with ranking and duration
- getVisualSuggestions(sceneId) retrieves suggestions ordered by rank with duration and download status
- **updateSegmentDownloadStatus() successfully updates status and file path for a suggestion**
- projects.visuals_generated flag updated on completion
- VisualSourcing loading screen displays during visual generation process
- Progress indicator shows "Analyzing scene 2/5..." dynamically
- After Epic 2 Story 2.5 completion, visual sourcing triggers automatically
- projects.current_step advances to 'visual-curation' enabling Epic 4 UI
- Partial failures allow resume (don't regenerate completed scenes)
- **AC6:** If YouTube returns 0 results for a scene, UI displays empty state with guidance message (e.g., "No clips found for this scene. Try editing the script or searching manually.")
- **AC7:** If API fails during visual sourcing, UI provides 'Retry' button to re-attempt visual sourcing for failed scenes without regenerating completed scenes

**References:**
- PRD Feature 1.5 AC2 (Data Structure) lines 202-205
- Story 3.4 (visual_suggestions table schema) lines 760-769
- Epic 2 Story 2.6 (UI workflow integration) lines 530-558

---

#### Story 3.6: Default Segment Download Service
**Goal:** Automatically download default video segments (first N seconds) for instant preview capability in Visual Curation UI

**Tasks:**
- Install yt-dlp dependency (Python-based YouTube downloader)
- Create downloadDefaultSegment() service function (lib/youtube/download-segment.ts)
- Implement yt-dlp command execution:
  - Command: `yt-dlp "https://youtube.com/watch?v=${videoId}" --download-sections "*0-${segmentDuration}" -f "best[height<=720]" -o "${outputPath}"`
  - segmentDuration = scene voiceover duration + 5 second buffer
  - outputPath = `.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`
  - Resolution: 720p max for performance
- Create POST /api/projects/[id]/download-segments endpoint
- For each visual suggestion after Story 3.5 saves to database:
  - Calculate segment duration (scene.duration + 5 seconds)
  - Queue download job for each suggestion (max 5-8 per scene)
  - Update visual_suggestions.download_status = 'downloading'
  - Execute yt-dlp download
  - Save file to .cache/videos/{projectId}/ directory
  - Update visual_suggestions.default_segment_path and download_status = 'complete'
- Implement error handling:
  - Retry logic: Max 3 attempts with exponential backoff (1s, 2s, 4s delays)
  - Permanent failure: Update download_status = 'error' after max retries
  - Quota/rate limit handling: Pause downloads and resume later
- Create background job queue for parallel downloads (limit 3 concurrent downloads)
- Add progress tracking: Track X/Y segments downloaded per project
- Clean up old cached segments (retention policy: 7 days)

**Acceptance Criteria:**
- yt-dlp installed and accessible via system PATH or bundled
- downloadDefaultSegment() successfully downloads first N seconds of YouTube video
- **Given scene with 8s voiceover, download captures first 13 seconds (8s + 5s buffer)**
- **Given scene with 120s voiceover, download captures first 125 seconds (120s + 5s buffer)**
- Downloaded segments saved to `.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`
- File naming convention prevents conflicts (scene number unique per project)
- **Resolution capped at 720p** (format: "best[height<=720]")
- POST /api/projects/[id]/download-segments processes all suggestions for all scenes
- download_status updates correctly: pending → downloading → complete (or error)
- default_segment_path populated with file path on successful download
- **Retry logic:** Failed downloads retry max 3 times with exponential backoff
- **Permanent failures:** After 3 retries, download_status = 'error' and download stops
- **Parallel downloads:** Max 3 concurrent downloads to avoid overwhelming network/CPU
- Progress tracking: API returns "Downloaded 12/40 segments" status
- **Cached files:** Segments remain available for 7 days, then auto-deleted to save disk space
- **Error scenarios handled:**
  - Video unavailable/deleted: Mark as error immediately (no retry)
  - Network timeout: Retry with backoff
  - Disk space full: Pause downloads, alert user
  - Invalid YouTube URL: Mark as error immediately (no retry)

**References:**
- PRD Feature 1.5 (Default Segment Download) lines 203-208
- PRD Feature 1.5 AC6 (Default Segment Download) lines 235-238
- PRD Feature 1.5 AC7 (Instant Preview) lines 239-242
- Story 3.5 (database schema extensions) lines 767-768
- Architecture lines 610-685 (yt-dlp implementation details)

---

#### Story 3.2b: Enhanced Search Query Generation
**Goal:** Improve query relevance with content-type awareness, entity extraction, and platform-optimized search patterns for pure B-roll results

**Tasks:**
- Update visual search prompt (lib/llm/prompts/visual-search-prompt.ts) for content-type detection
- Implement content-type classification: gaming, historical, conceptual, nature, tutorial
- Add entity extraction logic for specific subjects (boss names, historical events, concepts)
- Generate platform-optimized YouTube search queries with B-roll quality terms
- Implement automatic negative term injection (-reaction, -review, -commentary, -tier list, -vlog)
- Add B-roll quality terms (+cinematic, +4K, +no commentary, +gameplay only, +stock footage)
- Create content-type specific query templates (gaming: "no commentary gameplay only", historical: "documentary footage")
- Update tests for diverse content types (gaming, historical, conceptual)

**Acceptance Criteria:**
- Given scene "The epic battle against Ornstein and Smough tests every player's skill":
  - Content type detected: gaming
  - Entities extracted: "Ornstein and Smough", "Dark Souls"
  - Query includes: "dark souls ornstein smough boss fight no commentary gameplay only"
  - Negative terms applied: -reaction -review -tier list
- Given scene "The storming of the Winter Palace marked the beginning of Soviet rule":
  - Content type detected: historical
  - Entities extracted: "Winter Palace", "Russian Revolution"
  - Query includes: "russian revolution winter palace historical footage documentary"
- Given scene "Towering skyscrapers loom over empty streets as autonomous drones patrol":
  - Content type detected: conceptual
  - Query includes: "dystopian city AI robots cinematic 4K"
- All queries include appropriate negative terms for content type
- Manual review of 10 sample scenes shows relevant search results
- Query generation completes within 5 seconds per scene

**References:**
- PRD Feature 1.5 (Enhanced Query Generation) lines 200-204
- PRD Feature 1.5 AC8 (Enhanced Query Generation) lines 262-265

---

#### Story 3.7: Computer Vision Content Filtering
**Goal:** Filter low-quality B-roll using Google Cloud Vision API (face detection, OCR, label verification) and local processing (keyword filtering, audio stripping)

**Tasks:**
- **Tier 1 - Local Filtering:**
  - Implement keyword filtering for titles/descriptions (lib/youtube/filter-results.ts)
  - Filter patterns: "reaction", "reacts", "commentary", "my thoughts", "review", "tier list", "ranking", "explained", "vlog"
  - Prioritize B-roll indicators: "stock footage", "cinematic", "4K", "no text", "gameplay only"
  - Add audio stripping to segment download using FFmpeg (-an flag)
  - Update yt-dlp download command or add post-processing step
- **Tier 2 - Google Cloud Vision API:**
  - Set up Google Cloud Vision API credentials and client library (@google-cloud/vision)
  - Create vision API client (lib/vision/client.ts) with quota management
  - **Implement thumbnail pre-filtering: analyze YouTube thumbnails first to pre-filter candidates before downloading (reduces bandwidth and API calls)**
  - Implement frame extraction from downloaded video segments using FFmpeg (3 frames: 10%, 50%, 90% duration)
  - Implement FACE_DETECTION to identify talking heads (filter if face bounding box area >15% of total frame area)
  - Implement TEXT_DETECTION (OCR) to identify burned-in captions/overlays
  - Implement LABEL_DETECTION to verify content matches scene theme (at least 1 of top 3 expected labels)
  - Create label matching logic (scene keywords → expected Vision API labels generated by LLM)
  - Implement quality ranking based on CV results (fewer faces, less text, better label match = higher rank)
- **Error Handling & Fallback:**
  - Implement API quota tracking (1,000 units/month free tier)
  - Add graceful fallback to Tier 1 filtering when API quota exceeded
  - Implement retry logic with exponential backoff for API failures
  - Add logging for CV analysis results
- **Database & Integration:**
  - Add cv_score column to visual_suggestions table for ranking
  - Update filtering pipeline to run CV analysis after initial keyword filtering
  - Create POST /api/projects/[id]/cv-filter endpoint for manual re-filtering
- **Testing:**
  - Create mocked Vision API responses for unit tests
  - Add benchmark tests for face detection accuracy (20 talking head vs 20 B-roll videos)
  - Add benchmark tests for OCR accuracy (20 captioned vs 20 clean videos)
  - Verify filtering adds <5 seconds per video suggestion
- **Frontend - Silent Video Indicator (VideoPreviewPlayer):**
  - Remove volume control from VideoPreviewPlayer component
  - Add static mute icon (🔇) with tooltip "Audio removed for preview"
  - Position icon bottom-left of controls bar, before time display
  - Style icon with muted color (Slate 400, not alarming)
  - Remove keyboard shortcuts for volume (M, Up/Down arrows)
  - Update accessibility labels per UX spec v3.4

**Acceptance Criteria:**
- **Keyword Filtering:**
  - Videos with "reaction", "commentary", "vlog" in titles filtered out
  - Videos with "cinematic", "4K", "stock footage" prioritized in ranking
- **Audio Stripping:**
  - All downloaded segments have no audio track (verify with ffprobe)
  - Audio stripping adds <1 second to download time
- **Thumbnail Pre-Filtering:**
  - YouTube thumbnails analyzed before downloading video segments
  - Videos with faces in thumbnails pre-filtered (reduces downloads by ~30-50%)
  - Thumbnail analysis uses same FACE_DETECTION and TEXT_DETECTION features
- **Face Detection:**
  - Videos with face bounding box area >15% of total frame area filtered out
  - Face detection correctly identifies >80% of talking head videos (benchmark test)
  - Pure B-roll videos (no faces) pass filter
  - Multiple faces summed for total area calculation
- **Text/Caption Detection:**
  - Videos with burned-in captions detected and filtered/ranked lower
  - OCR correctly identifies >80% of captioned videos (benchmark test)
  - Clean B-roll videos pass filter
- **Label Verification:**
  - Scene "mountain landscape" → video must have labels like "mountain", "landscape", "nature"
  - Scene "Dark Souls boss fight" → video must have labels like "video game", "combat", "fantasy", "dark souls boss"
  - Mismatched content filtered out or ranked significantly lower
- **API Quota & Fallback:**
  - System tracks API usage against 1,000 units/month limit
  - When quota exceeded, system falls back to keyword-only filtering
  - Fallback does not cause visual sourcing to fail
- **Performance:**
  - CV filtering completes in <5 seconds per video suggestion
  - Frame extraction uses FFmpeg efficiently (3 frames only)
- **Manual Validation:**
  - Manual review of 10 sample scenes shows 80%+ pure B-roll results
  - Significant improvement over pre-enhancement filtering
- **Silent Video Indicator (Frontend):**
  - VideoPreviewPlayer displays 🔇 icon in bottom-left of controls
  - Hovering icon shows tooltip: "Audio removed for preview"
  - No volume slider or unmute option available
  - Icon uses muted color (Slate 400, not red/alarming)
  - Keyboard shortcuts M, Up/Down arrows do not trigger any action

**References:**
- PRD Feature 1.5 (Pure B-Roll Content Filtering) lines 210-213
- PRD Feature 1.5 (Google Cloud Vision API Integration) lines 214-220
- PRD Feature 1.5 AC9-AC14 lines 266-289
- UX Design Specification v3.4, Section 8.13 (VideoPreviewPlayer Silent Video Indicator)

---

#### Story 3.7b: CV Pipeline Integration
**Goal:** Integrate CV filtering into the automatic download pipeline and enforce quality thresholds in the UI to ensure users only see pure B-roll footage

**Problem Statement:** Story 3.7 implemented CV filtering as a standalone service with a manual API endpoint, but this was never integrated into the visual sourcing workflow. Users see low-quality B-roll because:
1. CV analysis never runs automatically - requires manual POST call
2. Low cv_score suggestions aren't filtered from UI
3. Detection thresholds (15% face area) are too lenient

**Tasks:**
- **Auto-Trigger CV Analysis:**
  - Modify download-segments route to call analyzeVideoSuggestion() after each segment download
  - Import cv-filter-service functions into download pipeline
  - Wrap CV analysis in try-catch to not block download success (graceful degradation)
  - Pass scene.visual_keywords as expectedLabels for label matching
- **Tighten CV Detection Thresholds:**
  - Create CV_THRESHOLDS constant object in lib/vision/client.ts
  - Update TALKING_HEAD_AREA from 0.15 to 0.10 (10% face area)
  - Update CAPTION_COVERAGE from 0.05 to 0.03 (3% text coverage)
  - Update CAPTION_BLOCKS from 3 to 2 text blocks
  - Increase FACE_PENALTY_MAJOR from -0.5 to -0.6
  - Increase FACE_PENALTY_MINOR from -0.2 to -0.3
  - Increase CAPTION_PENALTY from -0.3 to -0.4
- **UI Filtering for Low CV Scores:**
  - Add getFilteredSuggestions() function to visual curation component
  - Filter suggestions where cv_score < 0.5 (hide from view)
  - Keep suggestions with cv_score = NULL visible (not yet analyzed)
  - Display "X low-quality video(s) filtered" message

**Acceptance Criteria:**
- **Auto CV Trigger:** CV analysis automatically runs after each segment download completes (no manual API call)
- **Graceful Degradation:** CV analysis failure does not block download success (cv_score remains NULL)
- **Stricter Face Detection:** Videos with face area >10% flagged as talking heads (was 15%)
- **Stricter Caption Detection:** Videos with text coverage >3% OR >2 text blocks flagged (was 5% or 3 blocks)
- **Increased Penalties:** Face penalty -0.6 (was -0.5), caption penalty -0.4 (was -0.3)
- **UI Filtering:** Suggestions with cv_score < 0.5 hidden from visual curation view
- **NULL Handling:** Suggestions with cv_score = NULL (not yet analyzed) remain visible
- **Filtered Count:** UI displays "X low-quality video(s) filtered" message
- **Label Passing:** visual_keywords from scene passed to CV analysis as expectedLabels
- **Manual Validation:** >90% pure B-roll in visible results across 10 test scenes

**Threshold Changes Summary:**

| Threshold | Before (3.7) | After (3.7b) |
|-----------|--------------|--------------|
| Talking head face area | 15% | 10% |
| Small face area | 5% | 3% |
| Caption text coverage | 5% | 3% |
| Caption text blocks | 3 | 2 |
| Major face penalty | -0.5 | -0.6 |
| Minor face penalty | -0.2 | -0.3 |
| Caption penalty | -0.3 | -0.4 |

**References:**
- Story 3.7 (Parent implementation - CV filtering service)
- Tech Spec Epic 3 v3.1, Story 3.7b section
- PRD Feature 1.5 (Pure B-Roll Content Filtering)

---
