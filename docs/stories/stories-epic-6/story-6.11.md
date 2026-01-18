# Story 6.11: NASA Web Scraping MCP Server & Pipeline Integration

**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
**Status:** done
**Priority:** P2 (Medium - Deferred Feature)
**Points:** 8
**Dependencies:** Story 6.9 (MCP Video Provider Client), Story 6.10 (DVIDS Scraping Server)
**Created:** 2026-01-17
**Developer:** TBD

---

## Story Description

Build a NASA (National Aeronautics and Space Administration) web scraping MCP (Model Context Protocol) server that enables the video production pipeline to source authentic space footage without API keys. The server will scrape the public NASA Image and Video Library (images.nasa.gov), cache content locally using the shared VideoCache module from Story 6.10, and integrate with the VideoProviderClient. This story also updates the Quick Production Flow to support multiple MCP providers with explicit provider selection.

**User Value:** Content creators in any niche (especially space/tech) can automatically source authentic NASA content for their videos, enhancing content authenticity without needing API credentials.

**Note:** This story is part of **Feature 2.9 (Domain-Specific Content APIs)** and implements the NASA scraping server plus pipeline integration. The shared caching module (VideoCache) is reused from Story 6.10.

---

## User Story

**As a** content creator in any niche,
**I want** an MCP server that scrapes space videos from NASA website,
**So that** I can use authentic NASA content in my videos without API keys.

**As a** developer,
**I want** to build a NASA scraping MCP server and integrate it into the video pipeline,
**So that** the video production system can use multiple scraping providers.

---

## Acceptance Criteria

### AC-6.11.1: NASA Scraping MCP Server Implementation

**Given** the DVIDS scraping MCP Server is implemented (Story 6.10)
**When** the NASA scraping MCP server is built
**Then** the system shall:
- Implement `NASAScrapingMCPServer` class using the MCP Python SDK with stdio transport
- Expose MCP tool: `search_videos(query, duration)` that searches NASA website and returns results
- Expose MCP tool: `download_video(video_id)` that downloads video from NASA to local cache
- Expose MCP tool: `get_video_details(video_id)` that retrieves video metadata from NASA
- Scrape NASA Image and Video Library website (images.nasa.gov) using HTTP requests and HTML parsing
- Extract video metadata: title, description, duration, format, resolution, center, date, download URL
- Implement rate limiting (1 request per 10 seconds) to respect NASA server load
- Detect HTTP 429/503 responses and implement exponential backoff: `base_backoff × 2^attempt` (capped at 60s)
- NOT use NASA API key (public content, no authentication required)
- Be runnable via: `python -m mcp_servers.nasa_scraping_server`
- Log all scrape operations and errors for monitoring

### AC-6.11.2: Video Caching Integration

**Given** the shared caching module was created in Story 6.10
**When** the NASA scraping server caches videos
**Then** the system shall:
- Use the `VideoCache` class from `mcp_servers/cache.py` (shared with DVIDS server)
- Configure cache with provider-specific settings: provider_name="nasa", default_ttl=30 days
- Call `cache.get(video_id, fetch_fn)` to automatically check cache before scraping
- Call `cache.invalidate(video_id)` for manual cache invalidation when needed
- Store NASA videos in `assets/cache/nasa/` subdirectory (handled automatically by cache module)
- NOT duplicate caching logic - reuse the shared module

### AC-6.11.3: Pipeline Integration

**Given** both DVIDS and NASA scraping MCP servers are implemented
**When** the Quick Production Flow is executed
**Then** the system shall:
- Update the Quick Production Flow (Stories 6.8a/6.8b) to use VideoProviderClient with explicit provider selection
- Configure provider priority order in `config/mcp_servers.json` (e.g., DVIDS first for military niche, NASA as fallback)
- Implement provider fallback logic: try each provider in priority order, skip failures, try next
- Display real-time progress UI showing which provider is being queried: "Searching DVIDS...", "Searching NASA..."
- Display progress during downloads: "Downloading video (45%)..."
- Store provider usage logs for each video production job (provider used, search terms, results count, duration)
- Support auto-selection algorithm: `combinedScore = (durationFit × 0.6) + (relevanceScore × 0.4)`
- The provider registry shall support dynamic provider registration via config changes (no code changes required)

### AC-6.11.4: Testing

**Given** the NASA scraping MCP server is implemented
**When** tests are executed
**Then** the tests shall validate:
- Unit tests validate web scraping logic with mocked HTML responses
- Unit tests validate rate limiting and backoff behavior for both servers
- Unit tests validate cache hit/miss logic for both servers
- Integration tests validate MCP tool calls with real websites (careful with rate limits)
- End-to-end tests validate complete Quick Production Flow with both providers

**Specific Test Scenarios:**
- Search with query "space shuttle" returns results with videoId, title, duration
- Download with valid video_id stores file in assets/cache/nasa/ directory
- Subsequent download with same video_id returns cached file (no re-download)
- Rate limiting: two rapid searches respect 10-second delay between requests
- HTTP 429 response triggers exponential backoff (2s, 4s, 8s delays)
- Cache invalidation removes file and metadata from assets/cache/metadata.json
- Provider fallback: DVIDS failure triggers NASA provider automatically
- Progress UI displays correct provider status during searches

---

## Technical Design

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                  NASA MCP Server Architecture                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  VideoProviderClient (Story 6.9)                         │   │
│  │     - Spawns NASA MCP server via stdio                   │   │
│  │     - Calls MCP tools: search_videos, download_video     │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │ JSON-RPC over stdio                     │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  NASA Scraping MCP Server (Python)                        │   │
│  │  ├── mcp_servers/nasa_scraping_server.py                  │   │
│  │  │   ├── search_videos(query, duration)                   │   │
│  │  │   ├── download_video(video_id)                         │   │
│  │  │   └── get_video_details(video_id)                      │   │
│  │  └── mcp_servers/cache.py (Shared VideoCache)              │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  NASA Image and Video Library (images.nasa.gov)           │   │
│  │  ├── HTTP requests + HTML parsing                         │   │
│  │  ├── Video metadata extraction                            │   │
│  │  └── Video download                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Local Video Cache                                        │   │
│  │  ├── assets/cache/nasa/{video_id}.mp4                     │   │
│  │  └── assets/cache/metadata.json                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
mcp_servers/
├── __init__.py
├── cache.py                          # Shared VideoCache class (from Story 6.10)
├── dvids_scraping_server.py          # DVIDS MCP server (from Story 6.10)
└── nasa_scraping_server.py           # NASA MCP server (NEW - AC-6.11.1)

assets/cache/
├── metadata.json                     # Cache metadata (all providers)
├── dvids/                           # DVIDS cached videos (from Story 6.10)
│   ├── {video_id}.mp4
│   └── {video_id}.jpg
└── nasa/                            # NASA cached videos (NEW - AC-6.11.2)
    ├── {video_id}.mp4
    └── {video_id}.jpg

tests/mcp_servers/
├── test_cache.py                     # VideoCache tests (from Story 6.10)
├── test_dvids_server.py             # DVIDS server tests (from Story 6.10)
├── test_nasa_server.py              # NASA server tests (NEW - AC-6.11.4)
└── fixtures/
    ├── nasa_search_response.html    # Mocked NASA HTML
    └── nasa_video_page.html         # Mocked NASA video page
```

### Shared VideoCache Class (Reused from Story 6.10)

**Location:** `mcp_servers/cache.py`

**Key Methods:**
- `__init__(provider_name, cache_dir, default_ttl_days)` - Initialize cache with provider-specific directory
- `is_cached(video_id)` - Check if video exists in cache and is within TTL
- `get(video_id, fetch_fn)` - Return cached file or fetch using provided function
- `invalidate(video_id)` - Remove cached video and delete file
- `get_cache_size()`, `get_cache_count()`, `get_cache_age()` - Cache statistics

**Metadata Schema:**
```json
{
  "videos": {
    "nasa123": {
      "provider": "nasa",
      "cached_date": "2026-01-17T10:30:00",
      "ttl": 30,
      "file_path": "assets/cache/nasa/nasa123.mp4"
    },
    "dvids456": {
      "provider": "dvids",
      "cached_date": "2026-01-17T10:25:00",
      "ttl": 30,
      "file_path": "assets/cache/dvids/dvids456.mp4"
    }
  }
}
```

### NASA Scraping MCP Server (AC-6.11.1)

**Location:** `mcp_servers/nasa_scraping_server.py`

**Dependencies:**
- `mcp.server` - MCP Python SDK for stdio transport
- `httpx` - Async HTTP client
- `beautifulsoup4` - HTML parsing
- `cache.VideoCache` - Shared caching module (from Story 6.10)

**Key Components:**

1. **Rate Limiting:**
   - 1 request per 10 seconds (`RATE_LIMIT_SECONDS = 10`)
   - `_respect_rate_limit()` enforces delay between requests

2. **Exponential Backoff:**
   - Base backoff: 2 seconds (`BASE_BACKOFF_SECONDS = 2`)
   - Max backoff: 60 seconds (`MAX_BACKOFF_SECONDS = 60`)
   - Formula: `min(BASE_BACKOFF × 2^attempt, MAX_BACKOFF)`
   - Applied on HTTP 429/503 responses

3. **MCP Tools:**
   - `search_videos(query, max_duration)` - Search NASA website
   - `download_video(video_id)` - Download to local cache
   - `get_video_details(video_id)` - Retrieve metadata

4. **Main Entry Point:**
   - Runnable via: `python -m mcp_servers.nasa_scraping_server`
   - Uses `stdio_server()` for JSON-RPC communication

### Configuration: config/mcp_servers.json (AC-6.11.3)

```json
{
  "providers": [
    {
      "id": "dvids",
      "name": "DVIDS Military Videos",
      "priority": 1,
      "enabled": false,
      "command": "python",
      "args": ["-m", "mcp_servers.dvids_scraping_server"],
      "env": {
        "PYTHONPATH": "./mcp_servers",
        "DVIDS_CACHE_DIR": "./assets/cache/dvids",
        "DVIDS_RATE_LIMIT": "30"
      }
    },
    {
      "id": "nasa",
      "name": "NASA Space Videos",
      "priority": 2,
      "enabled": false,
      "command": "python",
      "args": ["-m", "mcp_servers.nasa_scraping_server"],
      "env": {
        "PYTHONPATH": "./mcp_servers",
        "NASA_CACHE_DIR": "./assets/cache/nasa",
        "NASA_RATE_LIMIT": "10"
      }
    }
  ]
}
```

### Pipeline Integration (AC-6.11.3)

**Updated Visual Generation with Provider Selection:**

```typescript
// lib/pipeline/visual-generation.ts
// UPDATED: Support explicit provider selection with fallback

import { providerRegistry } from '@/lib/mcp/provider-registry';

export async function generateVisualsForProject(
  projectId: string,
  preferredProvider?: string
): Promise<void> {
  const scenes = await getScenesByProject(projectId);

  // Get available providers in priority order
  const providers = preferredProvider
    ? [providerRegistry.getProvider(preferredProvider)]
    : providerRegistry.getProvidersByPriority();

  for (const scene of scenes) {
    const analysis = await analyzeSceneForVisuals(scene.text);
    let suggestions: VideoSuggestion[] = [];
    let lastError: Error | null = null;

    // Try each provider in priority order (fallback logic)
    for (const provider of providers) {
      try {
        const results = await provider.searchVideos({
          query: analysis.primaryQuery,
          maxDuration: scene.duration * 3,
          maxResults: 15
        });

        if (results.length > 0) {
          suggestions = results.map(r => ({
            ...r,
            provider: provider.name,
            source: 'mcp'
          }));
          break; // Success - stop trying providers
        }
      } catch (error) {
        lastError = error;
        console.warn(`Provider ${provider.name} failed:`, error);
        continue; // Try next provider
      }
    }

    if (suggestions.length === 0 && lastError) {
      throw new Error(`All providers failed. Last error: ${lastError.message}`);
    }

    await saveVisualSuggestions(scene.id, suggestions);
  }
}
```

**Progress UI Updates:**

```typescript
// components/features/rag/QuickProductionProgress.tsx
// UPDATED: Show which provider is being used

export function QuickProductionProgress({ projectId }: Props) {
  const { data: status } = usePipelineStatus(projectId);

  return (
    <div className="progress-container">
      <Stage stage="script" current={status?.currentStage} />
      <Stage stage="voiceover" current={status?.currentStage} />

      {/* Enhanced: Visual sourcing stage shows provider */}
      <Stage
        stage="visuals"
        current={status?.currentStage}
        detail={status?.currentStage === 'visuals' && (
          <span className="provider-info">
            {status.visuals_provider === 'dvids' && '🎖️ Searching DVIDS...'}
            {status.visuals_provider === 'nasa' && '🚀 Searching NASA...'}
            {status.visuals_provider === 'youtube' && '📺 Searching YouTube...'}
            {status.visuals_download_progress && ` (${status.visuals_download_progress}%)`}
          </span>
        )}
      />

      <Stage stage="assembly" current={status?.currentStage} />
      <Stage stage="complete" current={status?.currentStage} />
    </div>
  );
}
```

### Visual Selection Algorithm (AC-6.11.3)

```typescript
// Calculate combined score for auto-selection
function calculateVideoScore(
  video: VideoSearchResult,
  targetDuration: number,
  relevanceScore: number
): number {
  // Duration fit: closer to target is better (0-1 scale)
  const durationDiff = Math.abs(video.duration - targetDuration);
  const durationFit = Math.max(0, 1 - (durationDiff / targetDuration));

  // Combined score: 60% duration fit, 40% relevance
  return (durationFit * 0.6) + (relevanceScore * 0.4);
}
```

---

## Tasks

### Task 1: Create NASA Scraping Server → AC-6.11.1
- [ ] Create `mcp_servers/nasa_scraping_server.py`
- [ ] Import MCP SDK dependencies (`mcp.server`, `httpx`, `bs4`)
- [ ] Import `VideoCache` from `mcp_servers/cache.py` (shared module)
- [ ] Implement `NASAScrapingMCPServer` class
- [ ] Implement `_respect_rate_limit()` method (10s delay)
- [ ] Implement `_fetch_with_backoff()` method (exponential backoff)
- [ ] Implement `search_videos(query, max_duration)` MCP tool
- [ ] Implement `download_video(video_id)` MCP tool
- [ ] Implement `get_video_details(video_id)` MCP tool
- [ ] Register MCP tools with server
- [ ] Implement `main()` entry point for stdio server
- [ ] Add logging for all scrape operations

### Task 2: Integrate VideoCache → AC-6.11.2
- [ ] Initialize `VideoCache` in NASA server constructor
- [ ] Configure cache with provider_name="nasa", default_ttl=30 days
- [ ] Update `download_video()` to use `cache.get(video_id, fetch_fn)`
- [ ] Store videos in `assets/cache/nasa/` subdirectory
- [ ] Verify cache metadata is stored in `assets/cache/metadata.json`

### Task 3: Update MCP Server Configuration → AC-6.11.3
- [ ] Update `config/mcp_servers.json` with NASA provider entry
- [ ] Configure command: `python -m mcp_servers.nasa_scraping_server`
- [ ] Set environment variables for cache directory and rate limit
- [ ] Set priority=2 for NASA (after DVIDS)
- [ ] Set enabled=false by default (user opt-in)

### Task 4: Implement Pipeline Integration → AC-6.11.3
- [ ] Update `lib/mcp/provider-registry.ts` to load NASA provider
- [ ] Update `lib/pipeline/visual-generation.ts` for provider selection
- [ ] Implement provider fallback logic (try DVIDS, then NASA)
- [ ] Add progress callbacks: "Searching NASA...", "Downloading video..."
- [ ] Update `QuickProductionProgress.tsx` to show provider status
- [ ] Add provider usage logging for each video job

### Task 5: Database Migration for Provider Tracking → AC-6.11.3
- [ ] Create migration file: `lib/db/migrations/018_visual_suggestions_provider.ts`
- [ ] Add `provider` column to `visual_suggestions` table
- [ ] Update existing rows to default to 'youtube'
- [ ] Create migration file: `lib/db/migrations/019_user_preferences_default_provider.ts`
- [ ] Add `default_video_provider` column to `user_preferences` table
- [ ] Set default value to 'youtube' (backwards compatible)

### Task 6: Unit Tests → AC-6.11.4
- [ ] Create `tests/mcp_servers/test_nasa_server.py`
- [ ] Mock HTTP responses with `tests/mcp_servers/fixtures/nasa_*.html`
- [ ] Test `search_videos()` with mocked HTML
- [ ] Test rate limiting with time mocking
- [ ] Test exponential backoff on 429/503
- [ ] Test cache integration in `download_video()`
- [ ] Test provider fallback logic in visual generation
- [ ] Test progress UI updates during provider switches

### Task 7: Integration Tests → AC-6.11.4
- [ ] Create `tests/mcp_servers/test_nasa_integration.py`
- [ ] Test real MCP server startup
- [ ] Test JSON-RPC tool calls
- [ ] Test with real NASA website (use rate limits carefully)
- [ ] Test cache persistence across server restarts
- [ ] Create end-to-end test for Quick Production Flow with both providers
- [ ] Test provider fallback when DVIDS fails

### Task 8: UI Updates for Provider Selection → AC-6.11.3
- [ ] Update `TopicSuggestionCard.tsx` to show provider selection modal
- [ ] Create `ProviderSelectionModal.tsx` component
- [ ] Add provider status indicators (online/offline)
- [ ] Update `QuickProductionSettingsPage.tsx` with provider selector
- [ ] Add provider status section showing available providers

---

## Dev Notes

### Architecture References
- **Tech Spec:** Epic 6 - Story 6.11 Acceptance Criteria
- **PRD:** Feature 2.9 - Domain-Specific Content APIs (FR-2.9.01, FR-2.9.07, FR-2.9.08)
- **Epic File:** _bmad-output/planning-artifacts/epics.md - Story 6.11
- **Epic Architecture Index:** docs/architecture/epic-6-index.md (MCP Video Provider Architecture)
- **MCP Integration Plan:** docs/architecture/mcp-integration-plan.md (Complete integration strategy)
- **ADR-013:** MCP Protocol for Video Provider Servers (Proposed)

### Dependencies
- **Story 6.9:** MCP Video Provider Client (completed - provides VideoProviderClient infrastructure) → AC-6.11.3
- **Story 6.10:** DVIDS Web Scraping MCP Server (completed - provides VideoCache shared module) → AC-6.11.2
- **MCP Python SDK:** `mcp` package for server implementation
- **HTTP Client:** `httpx` for async HTTP requests
- **HTML Parsing:** `beautifulsoup4` for web scraping
- **Python Environment:** MCP servers run as Python stdio processes

### NASA Website Structure
- **Base URL:** https://images.nasa.gov
- **Search API:** https://images.nasa.gov/search?q={query}&media=video
- **Video Page:** https://images.nasa.gov/details/{video_id}
- **Public Domain:** NASA content is generally public domain

### Rate Limiting Strategy
- **Base Rate:** 1 request per 10 seconds (NASA)
- **Backoff:** Exponential backoff on 429/503: `2 × 2^attempt` (capped at 60s)
- **Caching:** 30-day TTL to minimize repeated requests
- **Respect robots.txt:** Check NASA robots.txt before production use

### Error Handling

**Exponential Backoff Pattern:**
```python
for attempt in range(max_retries):
    try:
        response = await fetch_with_rate_limit(url)
        return response
    except HTTPStatusError as e:
        if e.status in (429, 503) and attempt < max_retries - 1:
            backoff = min(BASE_BACKOFF * (2 ** attempt), MAX_BACKOFF)
            await asyncio.sleep(backoff)
        else:
            raise
```

**Provider Fallback Logic:**
```typescript
// Try providers in priority order
for (const provider of providersByPriority) {
  try {
    const results = await provider.searchVideos(query);
    if (results.length > 0) return results;  // Success
  } catch (error) {
    console.warn(`Provider ${provider.id} failed:`, error);
    continue;  // Try next provider
  }
}
// All providers failed - return empty or show error
```

### Testing Approach
- **Unit Tests:** Mock HTTP responses with BeautifulSoup HTML fixtures
- **Rate Limit Tests:** Use `time.sleep()` mocking or async time mocking
- **Cache Tests:** Test with temporary cache directories
- **Integration Tests:** Real NASA website (careful with rate limits, use test videos only)
- **End-to-End Tests:** Complete Quick Production Flow with both providers

### Legal Considerations
- **NASA Terms:** NASA content is generally public domain
- **robots.txt:** Check https://images.nasa.gov/robots.txt
- **Attribution:** Consider adding attribution metadata to cached videos

### Code Patterns from Story 6.9 & 6.10
- **MCP Protocol:** Use JSON-RPC 2.0 over stdio transport
- **Tool Registration:** Follow `@server.list_tools()` and `@server.call_tool()` pattern
- **Error Responses:** Return `[TextContent(type="text", text=str(results))]`
- **Shared Cache:** Reuse `VideoCache` class from Story 6.10 without modification

### Pipeline Integration Notes
- **Non-Breaking:** YouTube API remains default provider
- **Explicit Selection:** Users choose provider via UI
- **Fail-Fast:** Clear error messages if provider unavailable
- **Progress Tracking:** UI shows which provider is being queried
- **Provider Logging:** Track which provider sourced each video

### Performance Considerations
- **Async I/O:** Use `asyncio` and `httpx` for concurrent requests
- **Memory:** Stream video downloads to avoid loading large files in memory
- **Disk Space:** Monitor cache directory size, implement cleanup if needed
- **Rate Limits:** NASA is faster than DVIDS (10s vs 30s), but still significant

### Future Enhancements
- **Batch Search:** Search multiple providers in parallel (respect rate limits)
- **Thumbnail Caching:** Cache video thumbnails for faster UI loading
- **Cache Cleanup:** Automatic cleanup of old cache entries
- **Metrics:** Track cache hit rate, request success rate, provider performance

---

## Definition of Done

- [ ] All Acceptance Criteria verified and passing
- [ ] NASA scraping MCP server implemented and runnable
- [ ] VideoCache module reused from Story 6.10 (no duplication)
- [ ] Cache integration working with 30-day TTL
- [ ] Rate limiting (10s) and exponential backoff implemented
- [ ] Configuration added to `config/mcp_servers.json`
- [ ] Pipeline integration with provider fallback logic
- [ ] Progress UI shows provider status during searches
- [ ] Database migrations for provider tracking completed
- [ ] Unit tests written and passing (80%+ coverage)
- [ ] Integration tests with real NASA website
- [ ] End-to-end tests with Quick Production Flow
- [ ] No Python linting errors
- [ ] Code reviewed and approved
- [ ] Documentation updated

---

## Story Points

**Estimate:** 8 points (Medium-High)

**Justification:**
- New MCP server implementation (similar to Story 6.10 but different website)
- Pipeline integration with provider fallback logic
- Database schema changes for provider tracking
- UI updates for provider selection and status
- Testing: Mocked HTTP responses, rate limit tests, integration tests, E2E tests
- Legal review: NASA public domain verification

---

## References

- PRD: Feature 2.9 - Domain-Specific Content APIs (FR-2.9.01, FR-2.9.07, FR-2.9.08)
- Epic File: _bmad-output/planning-artifacts/epics.md - Story 6.11
- Epic Architecture Index: docs/architecture/epic-6-index.md (MCP Video Provider Architecture)
- MCP Integration Plan: docs/architecture/mcp-integration-plan.md
- ADR-013: MCP Protocol for Video Provider Servers (Proposed)
- MCP Protocol: https://modelcontextprotocol.io/
- Story 6.9: MCP Video Provider Client (dependency)
- Story 6.10: DVIDS Web Scraping MCP Server (dependency, provides VideoCache)
- NASA Image and Video Library: https://images.nasa.gov
- NASA Website: https://www.nasa.gov

---

## Dev Agent Record

### Agent Model Used

TBD

### Debug Log References

### Completion Notes List

#### UI Integration Completion (2026-01-18)

**Missing UI Component Discovered:**
During testing, it was discovered that while the `ProviderSelectionModal` and `QuickProductionProgress` components were implemented, there was no UI entry point for users to trigger Quick Production with provider selection from the Channel Intelligence page.

**Fixes Applied:**
1. Created `QuickProductionForm.tsx` - A form component providing:
   - Topic input field (500 char limit with counter)
   - Provider selection button (opens `ProviderSelectionModal`)
   - "Generate Video" submit button
   - Error handling and loading states

2. Updated `channel-intelligence/page.tsx`:
   - Added `QuickProductionForm` to the configured view
   - Positioned at top of page for easy access
   - Shows only after channel intelligence setup is complete

3. Created `ui/label.tsx` - Missing shadcn/ui Label component:
   - Uses `@radix-ui/react-label` primitive
   - Styled with `class-variance-authority`
   - Required for form accessibility

4. Updated `quick-create/route.ts`:
   - Added `provider` parameter to `QuickCreateRequest` interface
   - Stores `preferredProvider` in project `config_json`
   - Provider preference is used during visual generation stage

5. Updated `package.json`:
   - Added `@radix-ui/react-label` dependency

**Result:** Users can now:
- Navigate to Settings → Channel Intelligence
- See "Quick Production" card at the top
- Enter topic (e.g., "Military tank training exercises")
- Click "Select Provider" → choose DVIDS (Shield icon)
- Click "Generate Video" to start pipeline

**Build Fixes:**
- Fixed `Military` icon → `Shield` icon (lucide-react doesn't have Military)
- Fixed `CallToolResultSchema` import in video-provider-client.ts
- Fixed `scene.visual_prompt` → `scene.text` in visual-generation.ts
- Fixed delete operator issues in mcp.factory.ts
- Fixed null check issues in tts-service.fixture.ts
- Fixed vitest config (`suiteTimeout` invalid option)
- Fixed missing `expect` import in tts-provider.mock.ts

### File List

**Created:**
- `src/components/features/channel-intelligence/QuickProductionForm.tsx` - Quick Production entry form with topic input and provider selection
- `src/components/ui/label.tsx` - shadcn/ui Label component for form inputs

**Modified:**
- `src/components/features/channel-intelligence/index.ts` - Added QuickProductionForm and ProviderSelectionModal exports
- `src/app/settings/channel-intelligence/page.tsx` - Added QuickProductionForm to configured view
- `src/app/api/projects/quick-create/route.ts` - Added provider parameter support
- `src/components/ui/provider-registry.ts` - Fixed CallToolResultSchema import and response parsing
- `src/components/features/channel-intelligence/QuickProductionProgress.tsx` - Fixed Military icon → Shield icon
- `src/components/features/channel-intelligence/ProviderSelectionModal.tsx` - Fixed Military icon → Shield icon
- `src/lib/pipeline/visual-generation.ts` - Fixed scene.visual_prompt → scene.text
- `tests/factories/mcp.factory.ts` - Fixed delete operator issue with destructuring
- `tests/fixtures/tts-service.fixture.ts` - Fixed null check issues with service reference
- `vitest.config.ts` - Removed invalid suiteTimeout option
- `tests/mocks/tts-provider.mock.ts` - Added expect import
- `package.json` - Added @radix-ui/react-label dependency
