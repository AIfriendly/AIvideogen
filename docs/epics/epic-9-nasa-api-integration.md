# Epic 9: NASA API Integration

**Goal:** Complete rewrite of the NASA video provider from web scraping to API-based implementation with proper video download handling, connection pooling, and cross-scene diversity enforcement.

**Features Included:**
- 2.9 Enhancement: Domain-Specific Content APIs (NASA API Integration)
- Direct video download handling (NASA provides direct MP4 URLs, no HLS/FFmpeg needed)
- Connection pooling and lifecycle management (reuses Epic 8 infrastructure)
- Video selection diversity across scenes (reuses Epic 8 infrastructure)
- Cross-platform filename compatibility (reuses Epic 8 infrastructure)

**User Value:** Creators in the space/tech niche can now:
- Access authentic NASA footage via official NASA Image and Video Library API (more reliable than web scraping)
- Download videos with proper URL handling (NASA provides direct MP4 links)
- Experience consistent video selection across scenes (no repeated footage)
- Benefit from faster performance through connection reuse
- Use the system on all platforms without filename errors

**Technical Approach:**
- Migrate from Playwright web scraping to official NASA Image and Video Library API
- API endpoint: `https://images-api.nasa.gov/search`
- Authentication: API key via environment variable `NASA_API_KEY` (optional for public content)
- Direct video download: NASA provides direct MP4 URLs (no HLS/FFmpeg required)
- Connection pooling: MCP server maintains connections across requests (reuses Epic 8 infrastructure)
- Cross-scene diversity: tracks selected video IDs, prefers unused videos (reuses Epic 8 infrastructure)
- Filename sanitization: removes invalid characters (reuses Epic 8 infrastructure)

**Story Count:** 6 stories

**Dependencies:**
- Epic 6 Story 6.11 (Original NASA web scraping implementation - being replaced)
- Epic 6 Story 6.9 (MCP Video Provider Client - provides client infrastructure)
- Epic 8 (DVIDS API Integration - provides shared infrastructure for connection pooling, diversity, filename handling)

**Total Points:** 18 points (reduced from Epic 8's 19 points due to simpler video download and infrastructure reuse)

**Acceptance:**
- NASA API successfully queried with search filters (media_type, center, year, keywords)
- Direct MP4 videos downloaded via httpx (no FFmpeg required)
- Connections reused across MCP requests (not recreated each time)
- Video selection enforces diversity across scenes (no repeats unless necessary)
- Filenames sanitized for cross-platform compatibility
- All existing functionality preserved (backward compatible)

**Architecture References:**
- `ai-video-generator/mcp_servers/nasa_api_server.py` - Complete API-based implementation
- `ai-video-generator/src/lib/mcp/video-provider-client.ts` - Client integration
- `ai-video-generator/src/lib/pipeline/visual-generation.ts` - Diversity enforcement
- Epic 8 architecture patterns for connection pooling, diversity, and filename handling

---

## Epic 9 Stories

### Story 9.1: Implement NASA Image and Video Library API Integration (5 points)

**Goal:** Migrate from Playwright web scraping to official NASA Image and Video Library API for reliable video metadata retrieval.

**Tasks:**
- Replace Playwright web scraping logic with NASA API calls
- Implement API endpoint: `https://images-api.nasa.gov/search`
- Add API key authentication via `NASA_API_KEY` environment variable (optional for public content)
- Implement **rate limiting: 30 seconds per request** (consistent with DVIDS provider)
- Implement search filters: media_type (video), center (NASA centers), year, keywords
- Parse API response JSON for video metadata (title, description, duration, thumbnails, download URL)
- Add error handling for API failures (400 bad request, 404 not found, 429 rate limits, 500 errors)
- Implement exponential backoff on HTTP 429/503: `base_backoff × 2^attempt` (capped at 60s)
- Implement request logging for debugging
- Add fallback logic for API unavailability
- Update MCP tool `search_videos` to use API instead of web scraping
- Test with NASA's public API documentation

**Acceptance Criteria:**
- `search_videos` tool queries `https://images-api.nasa.gov/search` endpoint
- API key loaded from `NASA_API_KEY` environment variable (if provided)
- **Rate limiting enforced: 30 seconds delay between requests (consistent with DVIDS)**
- Search parameters include: query (q), media_type=video, center, year_start, year_end
- API response parsed successfully: nasa_id (video_id), title, description, duration, thumbnails, download URL
- 400 errors display "Bad request - check search parameters"
- 404 errors display "Resource not found"
- 429 errors trigger retry with exponential backoff (2s, 4s, 8s delays)
- 500 errors fall back to empty results (graceful degradation)
- Request logging includes: endpoint, params, response status, result count
- API unavailability logs error and returns empty results (does not crash)
- **Test Case:** Search "space shuttle" returns 10+ results with valid video metadata
- **Test Case:** Missing API key still works (public content access)
- **Test Case:** Invalid search parameters return 400 with user-friendly error
- **Test Case:** Two rapid searches respect 30-second delay between requests (rate limiting)

**Prerequisites:** Story 6.11 (Original NASA web scraping server - being replaced)

**Technical Notes:**
- API endpoint: `https://images-api.nasa.gov/search`
- API key environment variable: `NASA_API_KEY` (optional for public content)
- API documentation: https://api.nasa.gov/
- **Rate limiting:** 30 seconds per request (consistent with DVIDS provider)
  - `RATE_LIMIT_SECONDS = 30`
  - `_respect_rate_limit()` enforces delay between requests
- **Exponential backoff:** Base backoff: 2 seconds, Max backoff: 60 seconds
  - Formula: `min(BASE_BACKOFF × 2^attempt, MAX_BACKOFF)`
  - Applied on HTTP 429/503 responses
- Search parameters:
  - `q`: search terms (query)
  - `media_type`: "video" (filter for videos only)
  - `center`: NASA center (GSFC, JSC, KSC, etc.)
  - `year_start`: start year filter
  - `year_end`: end year filter
  - `keywords`: comma-separated keywords
- Response fields (NASA API format):
  - `data[0].nasa_id`: unique identifier (use as video_id)
  - `data[0].title`: video title
  - `data[0].description`: video description
  - `links[0].href`: download URL (direct MP4 link)
  - `data[0].date_created`: publication date
  - `data[0].center`: NASA center
- Note: NASA API does not provide duration in search results - need to fetch video details or estimate
- Error handling:
  - 400 Bad Request: Invalid parameters
  - 404 Not Found: Resource not found
  - 429 Too Many Requests: Rate limit exceeded (NASA API: 1000 requests per hour)
  - 500 Internal Server Error: API error
- Files modified: `mcp_servers/nasa_api_server.py`

**Differences from DVIDS (Epic 8):**
- No HLS manifest handling (NASA provides direct MP4 URLs)
- Simpler authentication (API key is optional for public content)
- Different parameter naming (q vs query, media_type vs type)
- Duration not in search results (requires additional fetch)
- **Same rate limiting: 30 seconds per request (consistent with DVIDS)**

---

### Story 9.2: Add Direct MP4 Video Download (3 points)

**Goal:** Implement direct video download handling for NASA MP4 URLs (no FFmpeg required - NASA provides direct download links).

**Tasks:**
- Implement httpx-based download function for NASA video URLs
- Parse download URLs from NASA API responses (direct MP4 links)
- Add progress tracking for video downloads
- Handle download errors (network failures, timeouts)
- Update MCP tool `download_video` to use httpx for NASA videos
- Add download logging for monitoring
- Handle edge cases: missing URLs, invalid URLs, large files

**Acceptance Criteria:**
- Direct MP4 URLs downloaded using httpx (no FFmpeg required)
- Download URLs parsed from NASA API `links[0].href` field
- Progress tracking reports download percentage
- Network errors logged with actionable error messages
- Downloaded videos stored in `assets/cache/nasa/{nasa_id}.mp4`
- Timeout handling: 30-second default
- **Test Case:** Given NASA video URL `https://images-assets.nasa.gov/video/xxx/xxx.mp4`, httpx downloads video successfully
- **Test Case:** Invalid URL logs error and falls back gracefully
- **Test Case:** Network timeout logs error and retries once

**Prerequisites:** Story 9.1 (NASA API Integration)

**Technical Notes:**
- Download client: `httpx` (same as DVIDS fallback)
- Download function:
  ```python
  import httpx

  async def download_nasa_video(url: str, video_id: str) -> str:
      """Download NASA video via direct MP4 URL."""
      async with httpx.AsyncClient(timeout=30.0) as client:
          response = await client.get(url, follow_redirects=True)
          response.raise_for_status()

          file_path = f"assets/cache/nasa/{video_id}.mp4"
          with open(file_path, 'wb') as f:
              f.write(response.content)

          return file_path
  ```
- No FFmpeg required (NASA provides direct MP4 links)
- Progress tracking: Track bytes downloaded vs total file size
- Error handling:
  - Network timeout: 30 seconds
  - Invalid URL: Log error, return None
  - HTTP errors: Raise `httpx.HTTPStatusError`
- Files modified: `mcp_servers/nasa_api_server.py`

**Differences from DVIDS (Epic 8):**
- No FFmpeg dependency (simpler)
- Direct MP4 URLs (no HLS manifest parsing)
- Simpler implementation (3 points vs 5 points)

---

### Story 9.3: Implement Video Selection Diversity Across Scenes (4 points)

**Goal:** Reuse Epic 8's cross-scene diversity infrastructure for NASA video selection to prevent footage repetition.

**Tasks:**
- Verify NASA video IDs work with existing `selectedVideoIds` tracking variable
- Ensure NASA videos use `nasa_id` as unique identifier
- Test diversity enforcement with NASA provider
- Update visual selection algorithm to prioritize unused NASA videos
- Log diversity metrics for NASA-sourced videos
- Verify reset tracking between projects works for NASA

**Acceptance Criteria:**
- NASA video selection uses existing `selectedVideoIds` tracking (no new code needed)
- NASA videos identified by `nasa_id` (not title or URL)
- Videos not in `selectedVideoIds` prioritized over already-selected videos
- Fallback: If <3 unique videos available, allow reuse with warning logged
- Diversity metrics logged: "Scene 5: Selected NEW video nasa_123 (5/8 unique so far)"
- Metrics summary logged: "Visual generation complete: 8 unique videos across 10 scenes (80% diversity)"
- `selectedVideoIds` cleared on new project generation
- **Test Case:** Given 10 scenes and 20 available NASA videos, selection uses 10 different videos (100% diversity)
- **Test Case:** Given 10 scenes and 5 available NASA videos, selection reuses videos but logs warning

**Prerequisites:** Story 9.1 (NASA API Integration), Story 9.2 (Direct Download)

**Technical Notes:**
- Reuses existing infrastructure from Epic 8 Story 8.3
- Tracking variable: `Set<string> selectedVideoIds` (already implemented)
- Selection algorithm: (already implemented)
  ```typescript
  const sortedCandidates = candidates.sort((a, b) => {
    const aUnused = !selectedVideoIds.has(a.video_id);
    const bUnused = !selectedVideoIds.has(b.video_id);
    if (aUnused && !bUnused) return -1;  // Prioritize unused
    if (!aUnused && bUnused) return 1;
    return b.combinedScore - a.combinedScore;  // Then by score
  });
  ```
- Fallback threshold: <3 unique videos available (already implemented)
- Logging format: `[DIVERSITY] Scene {N}: Selected {video_id} ({uniqueCount}/{totalScenes} unique)` (already implemented)
- Files verified:
  - `src/lib/pipeline/visual-generation.ts` (no changes needed)
  - `src/lib/mcp/video-provider-client.ts` (no changes needed)

**Differences from DVIDS (Epic 8):**
- No new code needed (reuses Epic 8 infrastructure)
- Only verification testing required
- Video ID format: `nasa_id` instead of `video_id`

---

### Story 9.4: Add Connection Pooling for MCP Providers (2 points)

**Goal:** Verify NASA MCP server works with Epic 8's connection pooling infrastructure.

**Tasks:**
- Verify `connections` map handles NASA provider correctly
- Test `ensureConnection('nasa')` function with NASA MCP server
- Verify `disconnectAll()` function works for NASA connections
- Test lifecycle logging for NASA provider
- Verify connection health checks detect stale NASA connections
- Test connection timeout and cleanup for NASA provider
- Verify connection statistics tracking includes NASA

**Acceptance Criteria:**
- `connections` map stores NASA MCP server connections correctly
- `ensureConnection('nasa')` returns existing connection if available
- New NASA connections only spawned if not already in `connections` map
- `disconnectAll()` closes NASA connections and clears from map
- Lifecycle logging: "[MCP] Connecting to nasa provider...", "[MCP] Reusing existing connection..."
- Health check detects stale NASA connections (no response for >60 seconds)
- Idle NASA connections closed after 5 minutes of inactivity
- Connection statistics logged: "MCP connections: 2 active (dvids, nasa), 15 reuse rate, 0 failures"
- **Test Case:** First NASA request spawns new connection (logged as "Connecting...")
- **Test Case:** Second NASA request reuses connection (logged as "Reusing existing...")
- **Test Case:** After `disconnectAll()`, next NASA request spawns new connection

**Prerequisites:** Story 6.9 (MCP Video Provider Client)

**Technical Notes:**
- Reuses existing infrastructure from Epic 8 Story 8.4
- Connection map: `Map<string, MCPClient> connections` (already implemented)
- `ensureConnection(providerId)`: (already implemented)
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
- `disconnectAll()`: (already implemented)
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
- Health check: Ping server with timeout (60 seconds) (already implemented)
- Idle timeout: 5 minutes (300 seconds) (already implemented)
- Cleanup hooks: `process.on('SIGTERM', disconnectAll)` (already implemented)
- Statistics: `{ active: number, reused: number, failed: number }` (already implemented)
- Files verified:
  - `src/lib/mcp/video-provider-client.ts` (no changes needed)
  - `src/lib/mcp/index.ts` (no changes needed)

**Differences from DVIDS (Epic 8):**
- No new code needed (reuses Epic 8 infrastructure)
- Only verification testing required
- 2 points vs 3 points (verification only)

---

### Story 9.5: Verify Cross-Platform Filename Compatibility (2 points)

**Goal:** Verify NASA video IDs work with Epic 8's filename sanitization infrastructure.

**Tasks:**
- Verify NASA video IDs (`nasa_id`) work with existing sanitization function
- Test filename creation on Windows and Unix systems for NASA videos
- Verify cache module uses sanitized IDs for NASA videos
- Test edge cases: special characters in NASA IDs, unicode characters
- Verify existing cached files still accessible (backward compatibility)

**Acceptance Criteria:**
- Filename sanitization function handles NASA `nasa_id` format correctly
- NASA video IDs sanitized if they contain invalid characters
- Windows filenames valid for NASA videos (no `:`, `<`, `>`, `"`, `|`, `?`, `*` characters)
- Unix filenames also valid (maintains compatibility)
- Cached NASA videos stored with sanitized IDs: `assets/cache/nasa/{sanitized_id}.mp4`
- Sanitization logged: "Sanitized video ID: 'xxx:xxx' → 'xxx-xxx'"
- Empty IDs after sanitization rejected with error
- Edge cases handled: special characters, unicode
- Existing cached NASA files still accessible (backward compatibility)
- **Test Case:** Given NASA ID "nasa_12345", cached as `nasa_12345.mp4` on Windows
- **Test Case:** Given NASA ID with special characters, sanitized correctly
- **Test Case:** Existing cache files with old naming scheme still accessible

**Prerequisites:** Story 9.2 (Direct Video Download)

**Technical Notes:**
- Reuses existing infrastructure from Epic 8 Story 8.5
- Windows invalid characters: `: < > " | ? *` and control characters (0-31)
- Sanitization function: (already implemented)
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
- Cache path: `assets/cache/{provider}/{sanitized_id}.mp4` (already implemented)
- Logging: `logger.info(f"Sanitized video ID: '{video_id}' → '{sanitized}'")` (already implemented)
- Error handling: Raise `ValueError` if sanitized ID is empty (already implemented)
- Backward compatibility: Check both sanitized and original paths (already implemented)
- Files verified:
  - `mcp_servers/nasa_api_server.py` (uses existing cache module)
  - `mcp_servers/cache.py` (no changes needed)
  - `src/lib/download/universal-downloader.ts` (no changes needed)

**Differences from DVIDS (Epic 8):**
- No new code needed (reuses Epic 8 infrastructure)
- Only verification testing required
- NASA IDs typically cleaner than DVIDS IDs (fewer special characters)

---

### Story 9.6: NASA Cache Cleanup Integration (2 points)

**Goal:** Integrate NASA cached videos with Epic 5's post-generation cleanup service to automatically remove NASA cache files after final video output is produced.

**Tasks:**
- Verify Epic 5 Story 5.6 cleanup service handles NASA cache files correctly
- Test cleanup with NASA videos in `assets/cache/nasa/` directory
- Verify cleanup logging includes NASA provider name
- (Optional) Add NASA MCP server cleanup method for manual cleanup triggers
- Update Epic 9 completion criteria to include Story 9.6

**Acceptance Criteria:**
- ✅ NASA cached videos (`assets/cache/nasa/{nasa_id}.mp4`) are deleted after final video generation
- ✅ Cleanup service (from Epic 5 Story 5.6) identifies and removes NASA provider files
- ✅ Cleanup logging includes "Deleted NASA cache: {nasa_id}.mp4"
- ✅ Final output video preserved (same as Epic 5 behavior)
- ✅ Cleanup failures don't fail video generation (errors logged only)
- ✅ Story 5.6 dependency verified and working
- ✅ **Test Case:** Generate video with NASA sources → Verify NASA cache deleted after generation
- ✅ **Test Case:** Generate video with DVIDS + NASA sources → Verify both providers' caches deleted
- ✅ **Test Case:** Selective cleanup → Verify only NASA files used in project are deleted

**Prerequisites:** Story 5.6 (Post-Generation Cache Cleanup from Epic 5)

**Technical Notes:**
- **Reuses Epic 5 Story 5.6 infrastructure** - No new cleanup code required for automatic cleanup
- NASA cache location: `assets/cache/nasa/{sanitized_nasa_id}.mp4`
- Cleanup service (Epic 5 Story 5.6) handles provider-agnostic cleanup automatically
- Optional NASA MCP `clear_cache` tool for manual cleanup:
  ```python
  @server.tool()
  def clear_cache() -> str:
      """Clear all cached NASA videos (optional manual cleanup)."""
      cache_dir = Path("assets/cache/nasa")
      count = 0
      for file in cache_dir.glob("*.mp4"):
          file.unlink()
          count += 1
      return f"Cleared {count} NASA cache files"
  ```
- Files modified (optional): `mcp_servers/nasa_api_server.py` (only if adding MCP cleanup tool)
- **Files verified** (for automatic cleanup):
  - `src/lib/db/cleanup.ts` (from Epic 5 Story 5.6) - verifies NASA cache directory included
  - Cleanup service handles `assets/cache/nasa/` automatically

**Cache Cleanup Behavior (from Epic 5 Story 5.6):**
- Cleanup triggered after successful final video generation
- Only deletes NASA videos referenced by the completed project
- Final output video always preserved
- Cleanup failures logged but don't fail video generation
- Configuration: `AUTO_CLEANUP_ENABLED=true` (default, from Epic 5)

**Differences from Epic 8:**
- Epic 8 (DVIDS) will also use Epic 5 Story 5.6 cleanup service
- No separate cleanup story needed for DVIDS (Epic 8 already complete)
- Story 9.6 is primarily verification + optional MCP tool
- 2 points reflects minimal effort (verification mostly)

---

## Epic Completion Criteria

- [ ] All 6 stories completed and marked as "Done"
- [ ] All acceptance criteria pass
- [ ] NASA API successfully queried with authentication (optional for public content)
- [ ] Direct MP4 videos downloaded via httpx
- [ ] Video selection enforces cross-scene diversity (reuses Epic 8 infrastructure)
- [ ] MCP connections pooled and reused (reuses Epic 8 infrastructure)
- [ ] Filenames valid and sanitized (reuses Epic 8 infrastructure)
- [ ] **NASA cache files automatically cleaned up after video generation (uses Epic 5 Story 5.6 service)**
- [ ] Unit tests pass (80%+ coverage)
- [ ] Integration tests pass with real NASA API
- [ ] No breaking changes to existing functionality
- [ ] Code reviewed and approved

---

## Definition of Done for Epic

When Epic 9 is complete:
- Space/tech niche creators can reliably source authentic NASA footage via official API
- Direct MP4 video downloads work correctly (no FFmpeg required)
- Videos are diverse across scenes (no repetitive footage)
- MCP servers are efficient (connection reuse, proper cleanup)
- System works on all platforms without filename errors
- **NASA cache files are automatically cleaned up after video generation (uses Epic 5 Story 5.6 service)**
- All changes are backward compatible (existing functionality preserved)

---

## References

- **PRD v3.7:** Feature 2.9 Enhancement - Domain-Specific Content APIs (NASA API Integration)
- **Epic 5 Story 5.6:** Post-Generation Cache Cleanup (cleanup service dependency)
- **Epic 6 Story 6.11:** Original NASA web scraping implementation (being replaced)
- **Epic 6 Story 6.9:** MCP Video Provider Client (dependency)
- **Epic 8:** DVIDS API Integration (shared infrastructure pattern)
- **Sprint Change Proposal:** `docs/sprint-artifacts/sprint-change-proposal-epic-9-2026-01-29.md`
- **NASA API Documentation:** https://api.nasa.gov/
- **NASA Image and Video Library API:** https://images-api.nasa.gov/
- **Implementation:** `ai-video-generator/mcp_servers/nasa_api_server.py`
- **Client Integration:** `ai-video-generator/src/lib/mcp/video-provider-client.ts`
- **Visual Generation:** `ai-video-generator/src/lib/pipeline/visual-generation.ts`

---

## Key Differences from Epic 8 (DVIDS)

| Aspect | Epic 8 (DVIDS) | Epic 9 (NASA) |
|--------|---------------|---------------|
| **Video Download** | HLS manifests require FFmpeg | Direct MP4 URLs (simpler) |
| **Story 9.2 Points** | 5 points | 3 points |
| **Authentication** | Required API key | Optional API key (public content) |
| **Rate Limiting** | 30 seconds per request | 30 seconds per request (consistent) |
| **Duration in Results** | Yes (in API response) | No (requires additional fetch) |
| **Connection Pooling** | New implementation (3 points) | Reuse Epic 8 (2 points) |
| **Diversity Tracking** | New implementation (4 points) | Reuse Epic 8 (4 points, verification) |
| **Filename Handling** | New implementation (2 points) | Reuse Epic 8 (2 points, verification) |
| **Cache Cleanup** | Uses Epic 5 Story 5.6 (no separate story) | Story 9.6: Integration (2 points) |
| **Total Points** | 19 points | 18 points |

---

## Infrastructure Reuse from Epic 8 and Epic 5

Epic 9 maximally reuses infrastructure built in Epic 8:

1. **Connection Pooling** (Story 9.4): Reuses `connections` map, `ensureConnection()`, `disconnectAll()`
2. **Diversity Tracking** (Story 9.3): Reuses `selectedVideoIds` set, selection algorithm
3. **Filename Sanitization** (Story 9.5): Reuses `sanitize_video_id()` function
4. **MCP Client**: Reuses `VideoProviderClient` class

Epic 9 also reuses cleanup infrastructure from Epic 5:

5. **Cache Cleanup** (Story 9.6): Reuses Epic 5 Story 5.6's `cleanupProjectFiles()` service for automatic NASA cache cleanup after video generation

This reduces development effort and ensures consistency across providers.
