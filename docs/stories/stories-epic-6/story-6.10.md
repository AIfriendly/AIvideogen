# Story 6.10: DVIDS Web Scraping MCP Server

**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
**Status:** done (completed with Playwright implementation 2026-01-24)
**Priority:** P2 (Medium - Deferred Feature)
**Points:** 8
**Dependencies:** Story 6.9 (MCP Video Provider Client)
**Created:** 2026-01-17
**Updated:** 2026-01-24 (Completed with Playwright implementation)
**Developer:** TBD
**Completed:** 2026-01-24

---

## Story Description

Build a DVIDS (Defense Visual Information Distribution Service) web scraping MCP (Model Context Protocol) server that enables the video production pipeline to source authentic military footage without API keys. The server will scrape the public DVIDS website (dvidshub.net), cache content locally, and expose tools via MCP protocol for the VideoProviderClient to use.

**User Value:** Content creators in the military niche can automatically source authentic military footage from DVIDS for their videos, enhancing content authenticity without needing API credentials.

**Note:** This story is part of **Feature 2.9 (Domain-Specific Content APIs)** and implements the DVIDS scraping server. The shared caching module (VideoCache) created here will be reused by Story 6.11 (NASA server).

---

## Technology Pivot (2026-01-24)

**Previous Approach:** HTTP web scraping with `httpx` + `BeautifulSoup`

**Issue Discovered:**
After nearly one week of development effort, the HTTP scraping approach failed because:
- DVIDS website uses JavaScript-rendered content (video information loads after page load)
- Video download URLs are served via streaming protocols (HLS/DASH), not static file links
- Simple HTTP requests cannot access dynamically loaded content or intercept network requests

**New Approach:** Playwright Headless Browser Automation

**Technology Changes:**
| Component | Old Approach | New Approach |
|-----------|--------------|--------------|
| Page Rendering | Static HTML only | Full JavaScript rendering |
| HTTP Client | `httpx` | Playwright browser (Chromium) |
| HTML Parsing | `BeautifulSoup` | Playwright page.evaluate() |
| Video URL Extraction | Not possible | Network interception + `<video>` src extraction |
| Anti-Detection | None | `playwright-stealth` plugin |

**Impact:**
- All Acceptance Criteria remain valid (the WHAT hasn't changed, only the HOW)
- Module renamed: `dvids_scraping_server` → `dvids_playwright_server`
- New dependency: `playwright` + `playwright-stealth` (Apache 2.0 licensed)
- Resource increase: ~200MB RAM per browser instance (vs ~20MB for HTTP)
- New setup step: `playwright install chromium` (~300MB browser binary)

**Reference:** See `docs/sprint-artifacts/sprint-change-proposal-2026-01-24-dvids-playwright-pivot.md` for full technical details and implementation roadmap.

---

## User Story

**As a** content creator in the military niche,
**I want** an MCP server that scrapes military videos from DVIDS website,
**So that** I can use authentic DVIDS content in my videos without API keys.

**As a** developer,
**I want** to build a DVIDS scraping MCP server that caches content locally,
**So that** we minimize requests to DVIDS and have offline access.

---

## Acceptance Criteria

### AC-6.10.1: DVIDS Scraping MCP Server Implementation

**Given** the MCP Video Provider Client architecture is implemented (Story 6.9)
**When** the DVIDS scraping MCP server is built
**Then** the system shall:
- Implement `DVIDSPlaywrightMCPServer` class using the MCP Python SDK with stdio transport
- Expose MCP tool: `search_videos(query, duration)` that searches DVIDS website and returns results
- Expose MCP tool: `download_video(video_id)` that downloads video from DVIDS to local cache
- Expose MCP tool: `get_video_details(video_id)` that retrieves video metadata from DVIDS
- Use Playwright headless browser (Chromium) to render JavaScript and extract video data from dvidshub.net
- Extract video metadata: title, description, duration, format, resolution, download URL, public domain confirmation
- Implement rate limiting (1 request per 30 seconds) to respect DVIDS server load
- Implement browser lifecycle management: launch on first use, reuse across requests, cleanup on shutdown
- Use `playwright-stealth` to avoid bot detection
- NOT use DVIDS API or require API credentials (browser-based scraping only)
- Be runnable via: `python -m mcp_servers.dvids_playwright_server`
- Log all browser operations and errors for monitoring

### AC-6.10.2: Video Caching Integration

**Given** downloading from DVIDS on every request is inefficient
**When** videos are downloaded
**Then** the system shall:
- Use the `VideoCache` class from `mcp_servers/cache.py` (created in AC-6.10.5)
- Configure cache with provider-specific settings: provider_name="dvids", default_ttl=30 days
- Call `cache.get(video_id, fetch_fn)` to automatically check cache before scraping
- Call `cache.invalidate(video_id)` for manual cache invalidation when needed
- Store DVIDS videos in `assets/cache/dvids/` subdirectory (handled automatically by cache module)
- NOT duplicate caching logic - use the shared module

### AC-6.10.3: Client Integration

**Given** the DVIDS scraping MCP server is implemented
**When** the VideoProviderClient connects to the server
**Then** the system shall:
- Configure DVIDS scraping MCP server in `config/mcp_servers.json` as local stdio process
- Support automatic visual selection using algorithm: `combinedScore = (durationFit × 0.6) + (relevanceScore × 0.4)`
- Handle MCP server connection failures (server not running, startup errors)
- Display progress during scraping: "Searching DVIDS...", "Downloading video..."
- Display error message if DVIDS unavailable: "DVIDS scraping server unavailable"

### AC-6.10.4: Testing

**Given** the DVIDS scraping MCP server is implemented
**When** tests are executed
**Then** the tests shall validate:
- Unit tests validate Playwright browser automation logic with mocked browser responses
- Unit tests validate rate limiting and backoff behavior
- Unit tests validate cache hit/miss logic
- Unit tests validate browser lifecycle (startup, reuse, cleanup)
- Integration tests validate MCP tool calls with real DVIDS website via Playwright (careful with rate limits)

**Specific Test Scenarios:**
- Search with query "military aircraft" returns results with videoId, title, duration (using Playwright page rendering)
- Download with valid video_id stores file in assets/cache/dvids/ directory (via Playwright-extracted URL)
- Subsequent download with same video_id returns cached file (no re-download)
- Rate limiting: two rapid searches respect 30-second delay between requests
- Browser lifecycle: first request launches browser (~2-3s), subsequent requests reuse browser instance
- Cache invalidation removes file and metadata from assets/cache/metadata.json

### AC-6.10.5: Shared Caching Module

**Given** both DVIDS and NASA scraping servers will need caching functionality
**When** the shared caching module is created
**Then** the system shall:
- Implement `VideoCache` class in `mcp_servers/cache.py` as shared infrastructure
- Provide methods: `get(video_id, fetch_fn)`, `is_cached(video_id)`, `invalidate(video_id)`
- Store cache metadata in `assets/cache/metadata.json` (video_id, provider, cached_date, ttl, file_path)
- Store video files in provider-specific subdirectories: `assets/cache/{provider}/{video_id}.{ext}`
- Check cache before fetching: if cached and within TTL, return cached file
- Implement TTL validation: re-fetch if cached item is older than `ttl` parameter
- Support manual invalidation via `invalidate(video_id)` method
- Provide cache statistics: `get_cache_size()`, `get_cache_count()`, `get_cache_age(video_id)`
- Be usable by both DVIDS and NASA scraping servers with same interface
- Have the caching module tested independently with mock fetch functions
- Be reused by Story 6.11 instead of duplicating caching logic

---

## Technical Design

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                  DVIDS MCP Server Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  VideoProviderClient (Story 6.9)                         │   │
│  │     - Spawns DVIDS MCP server via stdio                  │   │
│  │     - Calls MCP tools: search_videos, download_video     │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │ JSON-RPC over stdio                     │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  DVIDS Scraping MCP Server (Python)                       │   │
│  │  ├── mcp_servers/dvids_scraping_server.py                 │   │
│  │  │   ├── search_videos(query, duration)                   │   │
│  │  │   ├── download_video(video_id)                         │   │
│  │  │   └── get_video_details(video_id)                      │   │
│  │  └── mcp_servers/cache.py (Shared VideoCache)              │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  DVIDS Website (dvidshub.net)                             │   │
│  │  ├── HTTP requests + HTML parsing                         │   │
│  │  ├── Video metadata extraction                            │   │
│  │  └── Video download                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Local Video Cache                                        │   │
│  │  ├── assets/cache/dvids/{video_id}.mp4                    │   │
│  │  └── assets/cache/metadata.json                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
mcp_servers/
├── __init__.py
├── cache.py                          # Shared VideoCache class (AC-6.10.5)
├── dvids_scraping_server.py          # DVIDS MCP server (AC-6.10.1)
└── nasa_scraping_server.py           # NASA MCP server (Story 6.11)

assets/cache/
├── metadata.json                     # Cache metadata (all providers)
├── dvids/                           # DVIDS cached videos
│   ├── {video_id}.mp4
│   └── {video_id}.jpg
└── nasa/                            # NASA cached videos (Story 6.11)

tests/mcp_servers/
├── test_cache.py                     # VideoCache tests (AC-6.10.5)
├── test_dvids_server.py             # DVIDS server tests (AC-6.10.4)
└── fixtures/
    ├── dvids_search_response.html   # Mocked DVIDS HTML
    └── dvids_video_page.html        # Mocked DVIDS video page
```

### Shared VideoCache Class (AC-6.10.5)

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
    "dvids123": {
      "provider": "dvids",
      "cached_date": "2026-01-17T10:30:00",
      "ttl": 30,
      "file_path": "assets/cache/dvids/dvids123.mp4"
    }
  }
}
```

**Implementation Details:**
- Load/save metadata from `assets/cache/metadata.json`
- Store video files in `assets/cache/{provider}/{video_id}.{ext}`
- Validate TTL before returning cached content
- Create provider directories on initialization

### DVIDS Scraping MCP Server (AC-6.10.1)

**Location:** `mcp_servers/dvids_scraping_server.py`

**Dependencies:**
- `mcp.server` - MCP Python SDK for stdio transport
- `httpx` - Async HTTP client
- `beautifulsoup4` - HTML parsing
- `cache.VideoCache` - Shared caching module

**Key Components:**

1. **Rate Limiting:**
   - 1 request per 30 seconds (`RATE_LIMIT_SECONDS = 30`)
   - `_respect_rate_limit()` enforces delay between requests

2. **Exponential Backoff:**
   - Base backoff: 2 seconds (`BASE_BACKOFF_SECONDS = 2`)
   - Max backoff: 60 seconds (`MAX_BACKOFF_SECONDS = 60`)
   - Formula: `min(BASE_BACKOFF × 2^attempt, MAX_BACKOFF)`
   - Applied on HTTP 429/503 responses

3. **MCP Tools:**
   - `search_videos(query, max_duration)` - Search DVIDS website
   - `download_video(video_id)` - Download to local cache
   - `get_video_details(video_id)` - Retrieve metadata

4. **Main Entry Point:**
   - Runnable via: `python -m mcp_servers.dvids_scraping_server`
   - Uses `stdio_server()` for JSON-RPC communication

### Configuration: config/mcp_servers.json (AC-6.10.3)

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
    }
  ]
}
```

### Visual Selection Algorithm (AC-6.10.3)

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

### Task 1: Create Shared VideoCache Module → AC-6.10.5
- [ ] Create `mcp_servers/__init__.py`
- [ ] Create `mcp_servers/cache.py` with `VideoCache` class
- [ ] Implement `__init__(provider_name, cache_dir, default_ttl_days)`
- [ ] Implement `is_cached(video_id)` method
- [ ] Implement `get(video_id, fetch_fn)` method
- [ ] Implement `invalidate(video_id)` method
- [ ] Implement `get_cache_size()`, `get_cache_count()`, `get_cache_age()` methods
- [ ] Implement `_load_metadata()` and `_save_metadata()` methods
- [ ] Create `assets/cache/` directory structure
- [ ] Add metadata JSON schema

### Task 2: Create DVIDS Scraping Server → AC-6.10.1
- [ ] Create `mcp_servers/dvids_scraping_server.py`
- [ ] Import MCP SDK dependencies (`mcp.server`, `httpx`, `bs4`)
- [ ] Implement `DVIDSScrapingMCPServer` class
- [ ] Implement `_respect_rate_limit()` method (30s delay)
- [ ] Implement `_fetch_with_backoff()` method (exponential backoff)
- [ ] Implement `search_videos(query, max_duration)` MCP tool
- [ ] Implement `download_video(video_id)` MCP tool
- [ ] Implement `get_video_details(video_id)` MCP tool
- [ ] Register MCP tools with server
- [ ] Implement `main()` entry point for stdio server
- [ ] Add logging for all scrape operations

### Task 3: Integrate VideoCache → AC-6.10.2
- [ ] Initialize `VideoCache` in DVIDS server constructor
- [ ] Configure cache with provider_name="dvids", default_ttl=30 days
- [ ] Update `download_video()` to use `cache.get(video_id, fetch_fn)`
- [ ] Store videos in `assets/cache/dvids/` subdirectory
- [ ] Verify cache metadata is stored in `assets/cache/metadata.json`

### Task 4: Add DVIDS Server Configuration → AC-6.10.3
- [ ] Update `config/mcp_servers.json` with DVIDS provider entry
- [ ] Configure command: `python -m mcp_servers.dvids_scraping_server`
- [ ] Set environment variables for cache directory and rate limit
- [ ] Set priority=1 for DVIDS (military niche priority)
- [ ] Set enabled=false by default (user opt-in)

### Task 5: Implement Client Integration → AC-6.10.3
- [ ] Update `lib/mcp/video-provider-client.ts` to handle DVIDS responses
- [ ] Add error handling for DVIDS server unavailable
- [ ] Add progress callbacks: "Searching DVIDS...", "Downloading video..."
- [ ] Implement visual selection algorithm in `lib/pipeline/visual-generation.ts`
- [ ] Add provider fallback logic in ProviderRegistry

### Task 6: Unit Tests → AC-6.10.4, AC-6.10.5
- [ ] Create `tests/mcp_servers/test_cache.py`
- [ ] Test VideoCache initialization
- [ ] Test `is_cached()` with valid/expired cache
- [ ] Test `get()` with cache hit/miss
- [ ] Test `invalidate()` removes file and metadata
- [ ] Test cache statistics methods
- [ ] Create `tests/mcp_servers/test_dvids_server.py`
- [ ] Mock HTTP responses with `tests/mcp_servers/fixtures/dvids_*.html`
- [ ] Test `search_videos()` with mocked HTML
- [ ] Test rate limiting with time mocking
- [ ] Test exponential backoff on 429/503
- [ ] Test cache integration in `download_video()`

### Task 7: Integration Tests → AC-6.10.4
- [ ] Create `tests/mcp_servers/test_dvids_integration.py`
- [ ] Test real MCP server startup
- [ ] Test JSON-RPC tool calls
- [ ] Test with real DVIDS website (use rate limits carefully)
- [ ] Test cache persistence across server restarts

---

## Dev Notes

### Architecture References
- **Tech Spec:** Epic 6 - Story 6.10 Acceptance Criteria
- **PRD:** Feature 2.9 - Domain-Specific Content APIs (FR-2.9.02, FR-2.9.04, FR-2.9.05, FR-2.9.08)
- **Epic File:** docs/epics/epic-6-channel-intelligence-content-research-rag-powered.md (Future Work section - Stories 6.9-6.11)
- **Epic Architecture Index:** docs/architecture/epic-6-index.md (Future Work: MCP Video Provider Architecture)
- **ADR-013:** MCP Protocol for Video Provider Servers (Proposed - see architecture-decision-records.md)

### Dependencies
- **Story 6.9:** MCP Video Provider Client (completed - provides VideoProviderClient infrastructure) → AC-6.10.3
- **MCP Python SDK:** `mcp` package for server implementation
- **HTTP Client:** `httpx` for async HTTP requests
- **HTML Parsing:** `beautifulsoup4` for web scraping
- **Python Environment:** MCP servers run as Python stdio processes

### DVIDS Website Structure
- **Base URL:** https://www.dvidshub.net
- **Search Endpoint:** https://www.dvidshub.net/search/?query={query}
- **Video Page:** https://www.dvidshub.net/video/{video_id}
- **Public Domain:** Most DVIDS content is public domain (verify per video)

### Rate Limiting Strategy
- **Base Rate:** 1 request per 30 seconds (DVIDS)
- **Backoff:** Exponential backoff on 429/503: `2 × 2^attempt` (capped at 60s)
- **Respect robots.txt:** Check DVIDS robots.txt before production use
- **Caching:** 30-day TTL to minimize repeated requests

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

### Testing Approach
- **Unit Tests:** Mock HTTP responses with BeautifulSoup HTML fixtures
- **Rate Limit Tests:** Use `time.sleep()` mocking or async time mocking
- **Cache Tests:** Test with temporary cache directories
- **Integration Tests:** Real DVIDS website (careful with rate limits, use test videos only)

### Legal Considerations
- **DVIDS Terms:** Review DVIDS website terms of service
- **robots.txt:** Check https://www.dvidshub.net/robots.txt
- **Public Domain:** Most DVIDS content is public domain but verify per video
- **Attribution:** Consider adding attribution metadata to cached videos

### Code Patterns from Story 6.9
- **MCP Protocol:** Use JSON-RPC 2.0 over stdio transport
- **Tool Registration:** Follow `@server.list_tools()` and `@server.call_tool()` pattern
- **Error Responses:** Return `[TextContent(type="text", text=str(results))]`

### Performance Considerations
- **Async I/O:** Use `asyncio` and `httpx` for concurrent requests
- **Memory:** Stream video downloads to avoid loading large files in memory
- **Disk Space:** Monitor cache directory size, implement cleanup if needed

### Future Enhancements
- **Batch Search:** Search multiple queries in parallel (respect rate limits)
- **Thumbnail Caching:** Cache video thumbnails for faster UI loading
- **Cache Cleanup:** Automatic cleanup of old cache entries
- **Metrics:** Track cache hit rate, request success rate

---

## Definition of Done

- [ ] All Acceptance Criteria verified and passing
- [ ] DVIDS scraping MCP server implemented and runnable
- [ ] Shared VideoCache module created and tested
- [ ] Cache integration working with 30-day TTL
- [ ] Rate limiting (30s) and exponential backoff implemented
- [ ] Configuration added to `config/mcp_servers.json`
- [ ] Unit tests written and passing (80%+ coverage)
- [ ] Integration tests with real DVIDS website
- [ ] No Python linting errors
- [ ] Code reviewed and approved  
- [ ] Documentation updated

---

## Story Points

**Estimate:** 8 points (Medium-High)

**Justification:**
- New technology: MCP server implementation with Python SDK
- Web scraping: HTML parsing, rate limiting, error handling
- Shared infrastructure: VideoCache module with TTL and metadata management
- Testing: Mocked HTTP responses, rate limit tests, integration tests
- Legal review: DVIDS terms of service, robots.txt compliance
- Client integration: Configuration, error handling, progress UI

---

## References

- PRD: Feature 2.9 - Domain-Specific Content APIs (FR-2.9.02, FR-2.9.04, FR-2.9.05, FR-2.9.08)
- Epic File: docs/epics/epic-6-channel-intelligence-content-research-rag-powered.md (Future Work section)
- Epic Architecture Index: docs/architecture/epic-6-index.md (MCP Video Provider Architecture)
- ADR-013: MCP Protocol for Video Provider Servers (Proposed)
- MCP Protocol: https://modelcontextprotocol.io/
- Story 6.9: MCP Video Provider Client (dependency)
- Story 6.11: NASA Web Scraping MCP Server (will reuse VideoCache)
- DVIDS Website: https://www.dvidshub.net
