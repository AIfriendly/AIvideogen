# Epic 8: DVIDS Video Provider API Integration

**Goal:** Complete rewrite of the DVIDS video provider from web scraping to API-based implementation with HLS download support, connection pooling, and cross-scene diversity enforcement.

**Features Included:**
- 2.9 Enhancement: Domain-Specific Content APIs (DVIDS API Integration)
- HLS video download with FFmpeg
- Connection pooling and lifecycle management
- Video selection diversity across scenes
- Windows compatibility fixes

**User Value:** Creators in the military niche can now:
- Access authentic military footage via official DVIDS Search API (more reliable than web scraping)
- Download videos with proper HLS stream handling (previously broken)
- Experience consistent video selection across scenes (no repeated footage)
- Use the system on Windows without filename errors
- Benefit from faster performance through connection reuse

**Technical Approach:**
- Migrated from web scraping to official DVIDS Search API
- API endpoint: `https://api.dvidshub.net/search`
- Authentication: API key via environment variable `DVIDS_API_KEY`
- HLS video download with FFmpeg for `.m3u8` manifest processing
- Connection pooling: MCP server maintains connections across requests
- Cross-scene diversity: tracks selected video IDs, prefers unused videos
- Windows filename sanitization: removes colons from video IDs

**Story Count:** 5 stories

**Dependencies:**
- Epic 6 Story 6.10 (Original DVIDS web scraping implementation - being replaced)
- Epic 6 Story 6.9 (MCP Video Provider Client - provides client infrastructure)

**Total Points:** 19 points

**Acceptance:**
- DVIDS API successfully queried with search filters (type, branch, category, duration)
- HLS videos downloaded via FFmpeg with API key injection
- Connections reused across MCP requests (not recreated each time)
- Video selection enforces diversity across scenes (no repeats unless necessary)
- Windows filenames sanitized (colons removed from IDs)
- All existing functionality preserved (backward compatible)

**Validation Status:** ✅ **PRODUCTION READY** (2026-01-30)
- All 5 stories completed and validated
- Test Report: `VIDEO_GENERATION_TEST_REPORT.md`
- 3 full test runs with comprehensive validation results:
  - Test Run 1 (2026-01-27): 18 scenes, ~500% diversity improvement
  - Test Run 2 (2026-01-29): 25 scenes, 118 MB output, 97% API success rate
  - Test Run 3 (2026-01-30): 25 scenes, 89 MB output, duration accuracy fix validated

**Architecture References:**
- `ai-video-generator/mcp_servers/dvids_scraping_server.py` - Complete API-based implementation
- `ai-video-generator/src/lib/mcp/video-provider-client.ts` - Client integration
- `ai-video-generator/src/lib/pipeline/visual-generation.ts` - Diversity enforcement

---

## Epic 8 Stories

### Story 8.1: Implement DVIDS Search API Integration (5 points)

**Goal:** Migrate from web scraping to official DVIDS Search API for reliable video metadata retrieval.

**Tasks:**
- Replace web scraping logic with DVIDS Search API calls
- Implement API endpoint: `https://api.dvidshub.net/search`
- Add API key authentication via `DVIDS_API_KEY` environment variable
- Implement search filters: type (video), branch (military branches), category, duration
- Parse API response JSON for video metadata (title, description, duration, thumbnails)
- Add error handling for API failures (401 unauthorized, 429 rate limits, 500 errors)
- Implement request logging for debugging
- Add fallback logic for API unavailability
- Update MCP tool `search_videos` to use API instead of web scraping

**Acceptance Criteria:**
- `search_videos` tool queries `https://api.dvidshub.net/search` endpoint
- API key loaded from `DVIDS_API_KEY` environment variable
- Search parameters include: query, type=video, branch, category, max_duration
- API response parsed successfully: video_id, title, description, duration, thumbnails, hls_url
- 401 errors display "Invalid API key - check DVIDS_API_KEY environment variable"
- 429 errors trigger retry with exponential backoff (2s, 4s, 8s delays)
- 500 errors fall back to empty results (graceful degradation)
- Request logging includes: endpoint, params, response status, result count
- API unavailability logs error and returns empty results (does not crash)
- **Test Case:** Search "military aircraft" returns 10+ results with valid video metadata
- **Test Case:** Missing API key displays actionable error message and prevents API calls
- **Test Case:** Invalid API key returns 401 with user-friendly error

**Prerequisites:** Story 6.10 (Original DVIDS web scraping server - being replaced)

**Technical Notes:**
- API endpoint: `https://api.dvidshub.net/search`
- API key environment variable: `DVIDS_API_KEY`
- Search parameters:
  - `query`: search terms
  - `type`: "video" (filter for videos only)
  - `branch`: military branch (army, navy, airforce, marines, etc.)
  - `category`: content category (news, imagery, etc.)
  - `max_duration`: maximum video duration in seconds
- Response fields:
  - `video_id`: unique identifier
  - `title`: video title
  - `description`: video description
  - `duration`: video duration in seconds
  - `thumbnails`: array of thumbnail URLs
  - `hls_url`: HLS manifest URL (.m3u8)
  - `date`: publication date
- Error handling:
  - 401 Unauthorized: Invalid API key
  - 429 Too Many Requests: Rate limit exceeded
  - 500 Internal Server Error: API error
- Files modified: `mcp_servers/dvids_scraping_server.py`

---

### Story 8.2: Add HLS Video Download with FFmpeg (5 points)

**Goal:** Implement FFmpeg-based HLS (`.m3u8`) manifest download with API key injection for authenticated segment access.

**Tasks:**
- Install FFmpeg dependency check (detect `ffmpeg` binary availability)
- Implement FFmpeg version detection at server startup
- Create HLS download function using FFmpeg subprocess
- Parse `.m3u8` manifest URLs from DVIDS API responses
- Inject API key into segment requests via HTTP headers
- Implement fallback to direct download for non-HLS URLs
- Add progress tracking for FFmpeg downloads
- Handle FFmpeg errors (missing binary, download failures)
- Update MCP tool `download_video` to use FFmpeg for HLS streams
- Add FFmpeg detection logging with install instructions if missing

**Acceptance Criteria:**
- FFmpeg availability checked at server startup (logs version or warning)
- HLS URLs (`.m3u8`) downloaded using FFmpeg subprocess
- API key injected into segment requests via HTTP headers
- Direct MP4 URLs downloaded via httpx (fallback for non-HLS)
- Progress tracking reports download percentage
- Missing FFmpeg displays warning: "FFmpeg NOT AVAILABLE - Install from https://ffmpeg.org/download.html"
- FFmpeg errors logged with actionable error messages
- Downloaded videos stored in `assets/cache/dvids/{video_id}.mp4`
- **Test Case:** Given HLS URL `https://api.dvidshub.net/hls/video/123.m3u8?api_key=XXX`, FFmpeg downloads video successfully
- **Test Case:** Given direct MP4 URL, httpx downloads video without FFmpeg
- **Test Case:** Missing FFmpeg displays installation instructions but doesn't crash server
- **Test Case:** Invalid HLS URL logs error and falls back gracefully

**Prerequisites:** Story 8.1 (DVIDS Search API Integration)

**Technical Notes:**
- FFmpeg detection: `shutil.which('ffmpeg')`
- Version command: `ffmpeg -version`
- FFmpeg command for HLS download:
  ```bash
  ffmpeg -i "https://api.dvidshub.net/hls/video/123.m3u8?api_key=XXX" \
         -c copy \
         -bsf:a aac_adtstoasc \
         "assets/cache/dvids/123.mp4"
  ```
- API key injection: Append `?api_key=XXX` or update HTTP headers
- Fallback: Use `httpx` for direct MP4 URLs (non-HLS)
- Progress tracking: Parse FFmpeg stderr for duration/frame info
- Error handling:
  - Missing FFmpeg: Log warning, continue (non-HLS only)
  - Download failure: Log error, return None
  - Timeout: 30-second default
- Files modified: `mcp_servers/dvids_scraping_server.py`
- FFmpeg documentation: https://ffmpeg.org/ffmpeg.html

---

### Story 8.3: Implement Video Selection Diversity Across Scenes (4 points)

**Goal:** Enforce cross-scene diversity in video selection to prevent footage repetition and improve video quality.

**Tasks:**
- Add `selectedVideoIds` tracking variable to visual generation pipeline
- Track all selected video IDs across all scenes in current project
- Implement diversity check: prefer videos not in `selectedVideoIds` set
- Update visual selection algorithm to prioritize unused videos
- Add fallback logic: allow reuse only if insufficient unique videos available
- Log diversity metrics: "Selected 8 unique videos across 10 scenes (80% diversity)"
- Reset tracking between projects (clear `selectedVideoIds` on new project)
- Add configuration option: `enforce_diversity = true` (default)
- Update auto-select-visuals function to use diversity-aware selection
- Add diversity validation to prevent all scenes from using same video

**Acceptance Criteria:**
- `selectedVideoIds` set initialized at start of visual generation
- Each scene's video selection checks against `selectedVideoIds` before choosing
- Videos not in `selectedVideoIds` prioritized over already-selected videos
- Fallback: If <3 unique videos available, allow reuse with warning logged
- Diversity metrics logged: "Scene 5: Selected NEW video 988497 (5/8 unique so far)"
- Metrics summary logged: "Visual generation complete: 8 unique videos across 10 scenes (80% diversity)"
- `selectedVideoIds` cleared on new project generation
- Configuration option `enforce_diversity` can be set to `false` to disable
- **Test Case:** Given 10 scenes and 20 available videos, selection uses 10 different videos (100% diversity)
- **Test Case:** Given 10 scenes and 5 available videos, selection reuses videos but logs warning
- **Test Case:** Given `enforce_diversity=false`, same video can be selected for multiple scenes

**Prerequisites:** Story 8.1 (DVIDS Search API Integration), Story 8.2 (HLS Download)

**Technical Notes:**
- Tracking variable: `Set<string> selectedVideoIds = new Set()`
- Selection algorithm:
  ```typescript
  // Sort candidates: unused videos first, then used videos
  const sortedCandidates = candidates.sort((a, b) => {
    const aUnused = !selectedVideoIds.has(a.video_id);
    const bUnused = !selectedVideoIds.has(b.video_id);
    if (aUnused && !bUnused) return -1;  // Prioritize unused
    if (!aUnused && bUnused) return 1;
    return b.combinedScore - a.combinedScore;  // Then by score
  });
  ```
- Fallback threshold: <3 unique videos available
- Logging format: `[DIVERSITY] Scene {N}: Selected {video_id} ({uniqueCount}/{totalScenes} unique)`
- Configuration: `enforce_diversity: boolean` (default: true)
- Files modified:
  - `src/lib/pipeline/visual-generation.ts`
  - `src/lib/mcp/video-provider-client.ts`

---

### Story 8.4: Add Connection Pooling for MCP Providers (3 points)

**Goal:** Implement connection pooling and lifecycle management for MCP video provider servers to improve performance and resource efficiency.

**Tasks:**
- Add `connections` map to track active MCP server connections
- Implement `ensureConnection(providerId)` function with connection reuse
- Implement `disconnectAll()` function for cleanup and shutdown
- Add lifecycle logging for debugging (connect, reuse, disconnect)
- Update MCP client to reuse existing connections instead of spawning new processes
- Add connection health checks (detect stale connections)
- Implement connection timeout and cleanup (close idle connections)
- Add connection statistics tracking (count, reuse rate, failures)
- Update video provider client to use pooled connections
- Add disconnect call on process shutdown (cleanup hook)

**Acceptance Criteria:**
- `connections` map stores active MCP server connections by provider ID
- `ensureConnection('dvids')` returns existing connection if available
- New connections only spawned if not already in `connections` map
- `disconnectAll()` closes all connections and clears map
- Lifecycle logging: "[MCP] Connecting to dvids provider...", "[MCP] Reusing existing connection..."
- Health check detects stale connections (no response for >60 seconds)
- Idle connections closed after 5 minutes of inactivity
- Connection statistics logged: "MCP connections: 2 active, 15 reuse rate, 0 failures"
- Video provider client uses `ensureConnection()` before tool calls
- `disconnectAll()` called on process shutdown (SIGTERM, SIGINT)
- **Test Case:** First request spawns new connection (logged as "Connecting...")
- **Test Case:** Second request reuses connection (logged as "Reusing existing...")
- **Test Case:** After `disconnectAll()`, next request spawns new connection
- **Test Case:** Process shutdown triggers `disconnectAll()` and logs cleanup

**Prerequisites:** Story 6.9 (MCP Video Provider Client)

**Technical Notes:**
- Connection map: `Map<string, MCPClient> connections`
- `ensureConnection(providerId)`:
  ```typescript
  async function ensureConnection(providerId: string): Promise<MCPClient> {
    if (connections.has(providerId)) {
      logger.info(`Reusing existing MCP connection: ${providerId}`);
      return connections.get(providerId)!;
    }
    logger.info(`Connecting to MCP provider: ${providerId}...`);
    const client = await spawnMCPServer(providerId);
    connections.set(providerId, client);
    return client;
  }
  ```
- `disconnectAll()`:
  ```typescript
  async function disconnectAll(): Promise<void> {
    logger.info(`Disconnecting all MCP connections (${connections.size} active)...`);
    for (const [id, client] of connections) {
      await client.close();
      logger.info(`Disconnected: ${id}`);
    }
    connections.clear();
  }
  ```
- Health check: Ping server with timeout (60 seconds)
- Idle timeout: 5 minutes (300 seconds)
- Cleanup hooks: `process.on('SIGTERM', disconnectAll)`, `process.on('SIGINT', disconnectAll)`
- Statistics: `{ active: number, reused: number, failed: number }`
- Files modified:
  - `src/lib/mcp/video-provider-client.ts`
  - `src/lib/mcp/index.ts`

---

### Story 8.5: Fix Windows Filename Compatibility (2 points)

**Goal:** Fix filename handling errors on Windows by sanitizing video IDs that contain invalid characters (colons).

**Tasks:**
- Identify Windows filename restrictions (colons not allowed in filenames)
- Add filename sanitization function to strip invalid characters
- Update video ID parsing to remove type prefixes (e.g., "VIDEO:988497" → "988497")
- Apply sanitization to all cached video filenames
- Test filename creation on Windows and Unix systems
- Update cache module to use sanitized IDs
- Add logging for filename sanitization (for debugging)
- Handle edge cases: empty IDs after sanitization, special characters
- Update video download to use sanitized IDs
- Verify backward compatibility (existing cached files still accessible)

**Acceptance Criteria:**
- Filename sanitization function removes colons and other invalid characters
- Type prefixes stripped from video IDs ("VIDEO:988497" → "988497", "IMAGE:123" → "123")
- Windows filenames valid (no `:`, `<`, `>`, `"`, `|`, `?`, `*` characters)
- Unix filenames also valid (maintains compatibility)
- Cached videos stored with sanitized IDs: `assets/cache/dvids/988497.mp4` (not `VIDEO:988497.mp4`)
- Sanitization logged: "Sanitized video ID: 'VIDEO:988497' → '988497'"
- Empty IDs after sanitization rejected with error
- Edge cases handled: multiple colons, special characters, unicode
- Existing cached files still accessible (migration or fallback)
- **Test Case:** Given video ID "VIDEO:988497", cached as `988497.mp4` on Windows
- **Test Case:** Given video ID "Army:Navy:Game", sanitized to "Army-Navy-Game.mp4"
- **Test Case:** Given empty ID after sanitization, error logged and download skipped
- **Test Case:** Existing cache files with old naming scheme still accessible (fallback)

**Prerequisites:** Story 8.2 (HLS Video Download)

**Technical Notes:**
- Windows invalid characters: `: < > " | ? *` and control characters (0-31)
- Sanitization function:
  ```python
  import re

  def sanitize_video_id(video_id: str) -> str:
      """Sanitize video ID for safe filename usage on all platforms."""
      # Remove type prefix (e.g., "VIDEO:988497" → "988497")
      sanitized = video_id.split(':', 1)[-1] if ':' in video_id else video_id

      # Replace Windows-invalid characters with dash
      sanitized = re.sub(r'[<>:"|?*]', '-', sanitized)

      # Remove control characters
      sanitized = ''.join(char for char in sanitized if ord(char) >= 32)

      # Strip whitespace
      sanitized = sanitized.strip()

      if not sanitized:
          raise ValueError(f"Video ID '{video_id}' is empty after sanitization")

      return sanitized
  ```
- Cache path: `assets/cache/{provider}/{sanitized_id}.mp4`
- Logging: `logger.info(f"Sanitized video ID: '{video_id}' → '{sanitized}'")`
- Error handling: Raise `ValueError` if sanitized ID is empty
- Backward compatibility: Check both sanitized and original paths
- Files modified:
  - `mcp_servers/dvids_scraping_server.py`
  - `mcp_servers/cache.py`
  - `src/lib/download/universal-downloader.ts`

---

## Epic Completion Criteria

- [x] All 5 stories completed and marked as "Done"
- [x] All acceptance criteria pass
- [x] DVIDS API successfully queried with authentication
- [x] HLS videos downloaded via FFmpeg
- [x] Video selection enforces cross-scene diversity
- [x] MCP connections pooled and reused
- [x] Windows filenames valid and sanitized
- [x] Unit tests pass (80%+ coverage)
- [x] Integration tests pass with real DVIDS API
- [x] No breaking changes to existing functionality
- [x] Code reviewed and approved

**Epic Status:** ✅ **COMPLETE AND VALIDATED** (2026-01-30)

---

## Definition of Done for Epic

When Epic 8 is complete:
- Military niche creators can reliably source authentic DVIDS footage via official API
- HLS video downloads work correctly with FFmpeg
- Videos are diverse across scenes (no repetitive footage)
- MCP servers are efficient (connection reuse, proper cleanup)
- System works on Windows without filename errors
- All changes are backward compatible (existing functionality preserved)

---

## References

- **PRD v3.7:** Feature 2.9 Enhancement - Domain-Specific Content APIs (DVIDS API Integration)
- **Epic 6 Story 6.10:** Original DVIDS web scraping implementation (being replaced)
- **Epic 6 Story 6.9:** MCP Video Provider Client (dependency)
- **DVIDS API Documentation:** https://dvidshub.net/api/
- **FFmpeg Documentation:** https://ffmpeg.org/ffmpeg.html
- **Implementation:** `ai-video-generator/mcp_servers/dvids_scraping_server.py`
- **Client Integration:** `ai-video-generator/src/lib/mcp/video-provider-client.ts`
- **Visual Generation:** `ai-video-generator/src/lib/pipeline/visual-generation.ts`
- **Video Generation Test Report:** `VIDEO_GENERATION_TEST_REPORT.md` - Comprehensive test documentation with all Epic 8 validation results
- **Duration Accuracy Fix:** `produce_video.py` lines 332-381 - Word count-based prompt generation for accurate video durations
- **Story 5.6 Cleanup:** `produce_video.py` lines 292-352 - Post-generation cache cleanup (Python implementation)

---

## 🆕 Epic 8 Validation Summary (2026-01-30)

### Test Runs Completed

| Test Run | Date | Video | Scenes | Status | Key Findings |
|----------|------|-------|--------|--------|--------------|
| 1 | 2026-01-27 | Russian invasion of Ukraine | 18+ | ✅ | ~500% diversity improvement |
| 2 | 2026-01-29 | Syrian ISIS conflict | 25/25 | ✅ | 97% API success rate, 118 MB output |
| 3 | 2026-01-30 | Modern Navy Aircraft Carrier Operations | 25/25 | ✅ | Duration fix validated, 89 MB output |

### Component Status Summary

| Component | Status | Test Coverage | Notes |
|-----------|--------|---------------|-------|
| DVIDS Search API | ✅ Working | 3 test runs | Smart filtering implemented |
| HLS Download (FFmpeg) | ✅ Working | 3 test runs | 97%+ success rate |
| Video Diversity | ✅ Working | 3 test runs | ~700% improvement vs baseline |
| Connection Pooling | ✅ Working | 3 test runs | ~99% reuse rate, 0 failures |
| Windows Compatibility | ✅ Working | 3 test runs | Zero sanitization errors |
| Duration Accuracy | ✅ Fixed | Test Run 3 | Word count formula validated |
| Cache Cleanup | ✅ Working | Test Run 3 | 226 files cleaned successfully |

### Deliverables

1. **Videos Generated:**
   - Syrian ISIS Conflict Video (224s, 118 MB)
   - Modern Navy Aircraft Carrier Operations Video (178s, 89 MB)

2. **Code Changes:**
   - `produce_video.py`: Duration accuracy fix (lines 332-381)
   - `produce_video.py`: Cache cleanup implementation (lines 292-352)
   - `mcp_servers/dvids_scraping_server.py`: Smart filtering + HLS download
   - Story files updated with validation results

3. **Documentation:**
   - `VIDEO_GENERATION_TEST_REPORT.md`: Comprehensive test report
   - All Epic 8 story files updated with 3 test runs
   - Epic 8 documentation updated with completion status

### Production Readiness Assessment

**Epic 8 Status:** ✅ **PRODUCTION READY**

- All 5 stories completed
- All acceptance criteria validated
- 3 full test runs with comprehensive results
- Duration accuracy fix applied and validated
- Cache cleanup implemented and validated
- Windows compatibility confirmed
- No breaking changes
- Code reviewed and approved
