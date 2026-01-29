# Epic 9: NASA API Integration - Architecture Summary

**Date:** 2026-01-25
**Status:** Planned
**Author:** Winston (System Architect)
**Related Epic:** Epic 8 (DVIDS API Integration)

---

## Executive Summary

Epic 9 migrates the NASA video provider from Playwright web scraping to the official NASA Image and Video Library API, following the successful pattern established by Epic 8 (DVIDS API Integration). This migration improves reliability, simplifies the implementation, and maximally reuses infrastructure built for Epic 8.

**Key Achievement:** 16 points vs 19 points for Epic 8 (simpler video download + infrastructure reuse)

---

## Architecture Overview

### Before: Playwright Web Scraping (Story 6.11)

```
┌─────────────────────────────────────────────────────────────┐
│           NASA Playwright Web Scraping Architecture        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Launch Playwright headless browser                      │
│  2. Navigate to images.nasa.gov                             │
│  3. Wait for JavaScript-rendered content                    │
│  4. Extract video metadata from DOM                         │
│  5. Intercept network requests for download URLs            │
│  6. Download videos to local cache                          │
│                                                             │
│  Challenges:                                                │
│  - Browser overhead (~200MB RAM)                            │
│  - Slow startup (~2-3 seconds)                              │
│  - Fragile (DOM selector changes break scraping)            │
│  - Anti-detection required (playwright-stealth)             │
└─────────────────────────────────────────────────────────────┘
```

### After: NASA API Integration (Epic 9)

```
┌─────────────────────────────────────────────────────────────┐
│              NASA API Integration Architecture             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Send HTTP GET request to NASA API                      │
│     POST https://images-api.nasa.gov/search                │
│     Parameters: q, media_type, center, year                │
│                                                             │
│  2. Parse JSON response for video metadata                 │
│     - nasa_id (unique identifier)                          │
│     - title, description                                   │
│     - download URL (direct MP4 link)                       │
│                                                             │
│  3. Download videos via httpx (direct MP4 URLs)            │
│     No FFmpeg required (simpler than DVIDS)                │
│                                                             │
│  4. Enforce cross-scene diversity (reuses Epic 8 infra)    │
│     - selectedVideoIds tracking                           │
│     - Prioritize unused videos                            │
│                                                             │
│  Benefits:                                                  │
│  - Faster (no browser overhead)                            │
│  - More reliable (HTTP API vs DOM scraping)                │
│  - Simpler (direct MP4 URLs, no HLS)                       │
│  - Infrastructure reuse (3 stories reuse Epic 8)           │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### API Endpoint Integration

**NASA Image and Video Library API:**
- **Base URL:** `https://images-api.nasa.gov/search`
- **Method:** GET
- **Authentication:** Optional (API key via `NASA_API_KEY` for higher rate limits)
- **Documentation:** https://api.nasa.gov/

**Search Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query terms |
| `media_type` | string | No | "video" to filter for videos only |
| `center` | string | No | NASA center (GSFC, JSC, KSC, etc.) |
| `year_start` | string | No | Start year filter (YYYY-MM-DD) |
| `year_end` | string | No | End year filter (YYYY-MM-DD) |
| `keywords` | string | No | Comma-separated keywords |

**Response Format (NASA API):**
```json
{
  "collection": {
    "metadata": {
      "total_hits": 1234
    },
    "items": [
      {
        "data": [{
          "nasa_id": "12345-A",           // Unique identifier (use as video_id)
          "title": "Space Shuttle Launch",
          "description": "HD footage of space shuttle launch...",
          "date_created": "2020-01-01T00:00:00Z",
          "center": "KSC"
        }],
        "links": [{
          "href": "https://images-assets.nasa.gov/video/xxx/xxx.mp4",
          "rel": "preview"
        }]
      }
    ]
  }
}
```

**Key Differences from DVIDS API:**
| Aspect | DVIDS API | NASA API |
|--------|-----------|----------|
| **Response structure** | Flat JSON with `results` array | Nested JSON with `collection.items` |
| **Unique ID field** | `video_id` | `data[0].nasa_id` |
| **Download URL** | `hls_url` (HLS manifest) | `links[0].href` (direct MP4) |
| **Duration** | Included in search results | Not included (requires fetch) |
| **Authentication** | Required API key | Optional API key |

---

### Video Download Architecture

**Simpler than DVIDS (No FFmpeg Required):**

```
┌─────────────────────────────────────────────────────────────┐
│            NASA Video Download Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. NASA API Response:                                      │
│     {                                                       │
│       "links": [{ "href": "https://.../xxx.mp4" }]         │
│     }                                                       │
│                                                             │
│  2. Extract download URL:                                   │
│     url = response.links[0].href                           │
│                                                             │
│  3. Download via httpx:                                    │
│     async with httpx.AsyncClient() as client:              │
│         response = await client.get(url)                   │
│         file_path = f"cache/nasa/{nasa_id}.mp4"            │
│         write(file_path, response.content)                 │
│                                                             │
│  No FFmpeg required (NASA provides direct MP4 links)       │
└─────────────────────────────────────────────────────────────┘
```

**Comparison with DVIDS:**

| Step | DVIDS (Epic 8) | NASA (Epic 9) |
|------|---------------|---------------|
| **URL extraction** | Parse `hls_url` from API response | Parse `links[0].href` from API response |
| **URL format** | `.m3u8` HLS manifest | Direct `.mp4` URL |
| **Download tool** | FFmpeg subprocess | httpx async client |
| **Complexity** | 5 points | 3 points |
| **Dependencies** | FFmpeg binary required | No additional dependencies |

---

## Infrastructure Reuse from Epic 8

Epic 9 maximally reuses infrastructure built in Epic 8, reducing development effort and ensuring consistency.

### 1. Connection Pooling (Story 9.4 - 2 points)

**Reused Components:**
- `Map<string, MCPClient> connections` - Stores active connections
- `ensureConnection(providerId)` - Reuses existing connections
- `disconnectAll()` - Cleanup on shutdown

**Implementation:**
```typescript
// No new code required - uses Epic 8 implementation

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

**Verification Required:**
- Test that `ensureConnection('nasa')` works correctly
- Verify connection pooling works for NASA provider
- Confirm health checks detect stale NASA connections

### 2. Diversity Tracking (Story 9.3 - 4 points)

**Reused Components:**
- `Set<string> selectedVideoIds` - Tracks selected videos
- Selection algorithm - Prioritizes unused videos
- Fallback logic - Allows reuse if <3 unique videos available

**Implementation:**
```typescript
// No new code required - uses Epic 8 implementation

const sortedCandidates = candidates.sort((a, b) => {
  const aUnused = !selectedVideoIds.has(a.video_id);
  const bUnused = !selectedVideoIds.has(b.video_id);
  if (aUnused && !bUnused) return -1;  // Prioritize unused
  if (!aUnused && bUnused) return 1;
  return b.combinedScore - a.combinedScore;  // Then by score
});
```

**Verification Required:**
- Test that NASA video IDs work with `selectedVideoIds`
- Verify diversity enforcement works for NASA provider
- Confirm fallback logic works when insufficient unique videos

### 3. Filename Sanitization (Story 9.5 - 2 points)

**Reused Components:**
- `sanitize_video_id()` function - Removes invalid characters
- Cross-platform compatibility - Works on Windows/Unix

**Implementation:**
```python
# No new code required - uses Epic 8 implementation

def sanitize_video_id(video_id: str) -> str:
    """Sanitize video ID for safe filename usage on all platforms."""
    sanitized = video_id.split(':', 1)[-1] if ':' in video_id else video_id
    sanitized = re.sub(r'[<>:"|?*]', '-', sanitized)
    sanitized = ''.join(char for char in sanitized if ord(char) >= 32)
    sanitized = sanitized.strip()

    if not sanitized:
        raise ValueError(f"Video ID '{video_id}' is empty after sanitization")

    return sanitized
```

**Verification Required:**
- Test that NASA `nasa_id` format works with sanitization
- Verify cross-platform compatibility for NASA video IDs
- Confirm edge cases handled (special characters, unicode)

---

## Story Breakdown

### Story 9.1: NASA API Integration (5 points)

**Goal:** Implement NASA Image and Video Library API integration.

**Tasks:**
- Replace Playwright scraping with NASA API calls
- Implement search filters (media_type, center, year, keywords)
- **Implement rate limiting: 30 seconds per request (consistent with DVIDS)**
- Parse API response JSON for video metadata
- Add error handling (400, 404, 429, 500)
- Implement exponential backoff on HTTP 429/503
- Implement request logging
- Update MCP tool `search_videos` to use API

**Acceptance:**
- API queries `https://images-api.nasa.gov/search`
- **Rate limiting enforced: 30 seconds delay between requests**
- Parameters: q, media_type=video, center, year_start, year_end
- Response parsed: nasa_id, title, description, download URL
- Error handling: 400, 404, 429, 500 with user-friendly messages
- Exponential backoff on 429: 2s, 4s, 8s delays (capped at 60s)
- Logging: endpoint, params, response status, result count

**Prerequisites:** Story 6.11 (Original NASA web scraping - being replaced)

**Files Modified:**
- `mcp_servers/nasa_api_server.py` (renamed from `nasa_playwright_server.py`)

---

### Story 9.2: Direct MP4 Video Download (3 points)

**Goal:** Implement direct video download handling for NASA MP4 URLs.

**Tasks:**
- Implement httpx-based download function
- Parse download URLs from NASA API responses
- Add progress tracking
- Handle download errors (timeouts, network failures)
- Update MCP tool `download_video` to use httpx

**Acceptance:**
- Direct MP4 URLs downloaded via httpx (no FFmpeg)
- Download URLs parsed from `links[0].href`
- Progress tracking reports percentage
- Downloaded videos stored in `assets/cache/nasa/{nasa_id}.mp4`
- Timeout handling: 30 seconds
- Error handling with actionable messages

**Prerequisites:** Story 9.1 (NASA API Integration)

**Files Modified:**
- `mcp_servers/nasa_api_server.py`

**Simpler than Epic 8:**
- No FFmpeg dependency
- Direct MP4 URLs (no HLS manifest parsing)
- 3 points vs 5 points for DVIDS Story 8.2

---

### Story 9.3: Video Selection Diversity (4 points)

**Goal:** Verify NASA videos work with Epic 8's diversity infrastructure.

**Tasks:**
- Verify NASA video IDs work with `selectedVideoIds`
- Test diversity enforcement with NASA provider
- Update visual selection algorithm (no changes needed)
- Log diversity metrics for NASA-sourced videos
- Verify reset tracking between projects

**Acceptance:**
- NASA selection uses existing `selectedVideoIds` (no new code)
- NASA videos identified by `nasa_id`
- Videos not in `selectedVideoIds` prioritized
- Fallback: If <3 unique videos, allow reuse with warning
- Diversity metrics logged: "Scene 5: Selected NEW video nasa_123 (5/8 unique)"
- Metrics summary logged: "8 unique videos across 10 scenes (80% diversity)"

**Prerequisites:** Story 9.1 (NASA API Integration), Story 9.2 (Direct Download)

**Files Verified:**
- `src/lib/pipeline/visual-generation.ts` (no changes needed)
- `src/lib/mcp/video-provider-client.ts` (no changes needed)

**Reuses Epic 8:**
- No new code needed (verification only)
- Same 4 points as Epic 8 Story 8.3

---

### Story 9.4: Connection Pooling (2 points)

**Goal:** Verify NASA MCP server works with Epic 8's connection pooling.

**Tasks:**
- Verify `connections` map handles NASA provider
- Test `ensureConnection('nasa')` function
- Verify `disconnectAll()` works for NASA connections
- Test lifecycle logging for NASA provider
- Verify connection health checks
- Test connection timeout and cleanup

**Acceptance:**
- `connections` map stores NASA connections correctly
- `ensureConnection('nasa')` returns existing connection if available
- New NASA connections only spawned if not in map
- `disconnectAll()` closes NASA connections
- Lifecycle logging: "Connecting to nasa provider...", "Reusing existing..."
- Health checks detect stale NASA connections (>60 seconds)
- Idle NASA connections closed after 5 minutes

**Prerequisites:** Story 6.9 (MCP Video Provider Client)

**Files Verified:**
- `src/lib/mcp/video-provider-client.ts` (no changes needed)
- `src/lib/mcp/index.ts` (no changes needed)

**Reuses Epic 8:**
- No new code needed (verification only)
- 2 points vs 3 points for Epic 8 Story 8.4

---

### Story 9.5: Filename Compatibility (2 points)

**Goal:** Verify NASA video IDs work with Epic 8's filename sanitization.

**Tasks:**
- Verify NASA `nasa_id` works with sanitization function
- Test filename creation on Windows and Unix
- Verify cache module uses sanitized IDs
- Test edge cases (special characters, unicode)
- Verify backward compatibility

**Acceptance:**
- Sanitization function handles NASA `nasa_id` format
- Windows filenames valid (no `:`, `<`, `>`, `"`, `|`, `?`, `*`)
- Cached NASA videos stored with sanitized IDs
- Sanitization logged: "Sanitized video ID: 'xxx:xxx' → 'xxx-xxx'"
- Empty IDs after sanitization rejected
- Edge cases handled (special characters, unicode)
- Existing cached files still accessible

**Prerequisites:** Story 9.2 (Direct Video Download)

**Files Verified:**
- `mcp_servers/nasa_api_server.py` (uses existing cache module)
- `mcp_servers/cache.py` (no changes needed)
- `src/lib/download/universal-downloader.ts` (no changes needed)

**Reuses Epic 8:**
- No new code needed (verification only)
- Same 2 points as Epic 8 Story 8.5

---

## Architecture Decision Record

**ADR-015: NASA Image and Video Library API Integration**

**Status:** Accepted
**Date:** 2026-01-25

**Context:**
Story 6.11 implemented NASA video provider using Playwright web scraping. Epic 8 successfully migrated DVIDS from web scraping to official API, proving the pattern's effectiveness. NASA provides an official Image and Video Library API that can replace Playwright with similar benefits.

**Decision:**
Migrate NASA video provider from Playwright web scraping to official NASA Image and Video Library API, following Epic 8 pattern.

**Consequences:**
- ✅ More reliable than web scraping (no JavaScript rendering issues)
- ✅ Better error handling (HTTP status codes vs browser detection)
- ✅ Simpler than DVIDS (direct MP4 URLs, no HLS/FFmpeg)
- ✅ Faster performance (no browser overhead)
- ✅ Infrastructure reuse (reduces development effort)
- ✅ Consistent architecture across DVIDS and NASA
- ⚠️ API doesn't provide duration in search results
- ⚠️ Rate limiting is self-imposed

**Full Documentation:** `docs/architecture/architecture-decision-records.md#adr-015`

---

## Comparison with Epic 8 (DVIDS)

| Aspect | Epic 8 (DVIDS) | Epic 9 (NASA) | Difference |
|--------|---------------|---------------|------------|
| **Video Download** | HLS manifests require FFmpeg | Direct MP4 URLs | Simpler (no FFmpeg) |
| **Story 9.2 Points** | 5 points | 3 points | -2 points |
| **Authentication** | Required API key | Optional API key | Simpler (public content) |
| **Rate Limiting** | 30 seconds per request | 30 seconds per request | **Same** (consistent) |
| **Duration in Results** | Yes (in API response) | No (requires fetch) | More complex |
| **Connection Pooling** | New implementation (3 points) | Reuse Epic 8 (2 points) | -1 point |
| **Diversity Tracking** | New implementation (4 points) | Reuse Epic 8 (4 points) | Same (verification) |
| **Filename Handling** | New implementation (2 points) | Reuse Epic 8 (2 points) | Same (verification) |
| **Total Points** | 19 points | 16 points | -3 points |

**Key Insight:** Epic 9 is more efficient because it maximally reuses Epic 8 infrastructure (3 stories) and has simpler video download requirements (direct MP4 vs HLS).

---

## Documentation Updates

### Files Created

1. **Epic Definition:** `docs/epics/epic-9-nasa-api-integration.md`
   - Complete epic documentation with 5 stories
   - Acceptance criteria for each story
   - Technical notes and implementation details
   - Key differences from Epic 8

2. **Architecture Summary:** `docs/epics/EPIC-9-ARCHITECTURE-SUMMARY.md` (this file)
   - Executive summary
   - Architecture overview (before/after)
   - Technical architecture details
   - Infrastructure reuse breakdown
   - Story breakdown with verification tasks

### Files Updated

1. **Epic-to-Architecture Mapping:** `docs/architecture/epic-to-architecture-mapping.md`
   - Added Epic 8 section (DVIDS API Integration)
   - Added Epic 9 section (NASA API Integration)
   - Documented infrastructure components
   - Documented key flows and error handling

2. **Architecture Decision Records:** `docs/architecture/architecture-decision-records.md`
   - Added ADR-015: NASA Image and Video Library API Integration
   - Documented decision context, consequences, and alternatives
   - Referenced Epic 8 pattern and infrastructure reuse

3. **Epic Summary:** `docs/epics/epic-summary.md`
   - Updated epic count: 50 stories (was 45)
   - Added Epic 9 to epic table
   - Updated recommended development order
   - Updated critical path description

4. **Future Work:** `docs/architecture/future-work.md`
   - Marked Epic 8 as complete
   - Added Epic 9 as planned
   - Updated status and timeline
   - Documented infrastructure reuse benefits

---

## Implementation Checklist

### Pre-Implementation

- [ ] Review Epic 8 documentation for patterns
- [ ] Verify NASA API documentation is current
- [ ] Test NASA API endpoints manually
- [ ] Confirm infrastructure reuse opportunities
- [ ] Create Epic 9 issue tracker

### Story 9.1: NASA API Integration

- [ ] Implement NASA API client
- [ ] Add search parameter handling
- [ ] Parse API response JSON
- [ ] Add error handling (400, 404, 429, 500)
- [ ] Add request logging
- [ ] Update MCP tool `search_videos`
- [ ] Write unit tests for API integration
- [ ] Test with real NASA API

### Story 9.2: Direct MP4 Video Download

- [ ] Implement httpx-based download function
- [ ] Parse download URLs from API responses
- [ ] Add progress tracking
- [ ] Add error handling (timeouts, network failures)
- [ ] Update MCP tool `download_video`
- [ ] Write unit tests for download function
- [ ] Test download with real NASA videos

### Story 9.3: Video Selection Diversity

- [ ] Verify NASA video IDs work with `selectedVideoIds`
- [ ] Test diversity enforcement with NASA provider
- [ ] Verify fallback logic works
- [ ] Test logging for NASA-sourced videos
- [ ] Write integration tests for diversity

### Story 9.4: Connection Pooling

- [ ] Verify `connections` map handles NASA provider
- [ ] Test `ensureConnection('nasa')` function
- [ ] Test `disconnectAll()` for NASA connections
- [ ] Verify lifecycle logging
- [ ] Test connection health checks
- [ ] Test connection timeout and cleanup
- [ ] Write integration tests for connection pooling

### Story 9.5: Filename Compatibility

- [ ] Verify NASA `nasa_id` works with sanitization
- [ ] Test filename creation on Windows and Unix
- [ ] Verify cache module uses sanitized IDs
- [ ] Test edge cases (special characters, unicode)
- [ ] Verify backward compatibility
- [ ] Write cross-platform tests

### Post-Implementation

- [ ] Run all unit tests (80%+ coverage target)
- [ ] Run integration tests with real NASA API
- [ ] Verify backward compatibility
- [ ] Update API design documentation
- [ ] Create migration guide (if needed)
- [ ] Code review and approval
- [ ] Deploy to production

---

## Success Metrics

### Technical Metrics

- [ ] NASA API success rate > 95%
- [ ] Video download success rate > 98%
- [ ] Average search response time < 2 seconds
- [ ] Average download time < 30 seconds (for typical videos)
- [ ] Connection reuse rate > 80%
- [ ] Cross-scene diversity rate > 90%
- [ ] Unit test coverage > 80%
- [ ] Integration test pass rate = 100%

### User Value Metrics

- [ ] Space/tech niche creators can access authentic NASA footage
- [ ] Video selection is diverse across scenes (no repetitive footage)
- [ ] System works on all platforms without filename errors
- [ ] Provider is reliable (no browser automation issues)
- [ ] Performance is faster than web scraping (no browser overhead)

### Developer Experience Metrics

- [ ] Infrastructure reuse reduces development time by ~40%
- [ ] Code is consistent with Epic 8 patterns
- [ ] Documentation is comprehensive and clear
- [ ] Tests are comprehensive and maintainable

---

## Conclusion

Epic 9 represents a significant improvement over the original NASA web scraping implementation (Story 6.11), following the successful pattern established by Epic 8 (DVIDS API Integration). By maximally reusing infrastructure built for Epic 8, Epic 9 achieves:

1. **Simpler Implementation:** 16 points vs 19 points for Epic 8
2. **Faster Development:** 3 stories reuse Epic 8 infrastructure (verification only)
3. **Consistent Architecture:** Same patterns as DVIDS provider
4. **Better User Experience:** Faster, more reliable, no browser overhead
5. **Maintainability:** Easier to maintain due to infrastructure reuse

The key architectural insight is that **Epic 9 is not just another API integration epic—it's a validation of the Epic 8 infrastructure patterns**. By successfully reusing connection pooling, diversity tracking, and filename sanitization from Epic 8, Epic 9 demonstrates that these patterns are:
- **Reusable** across different providers
- **Scalable** to future providers (Pexels, Pixabay, etc.)
- **Maintainable** with consistent code patterns
- **Efficient** with reduced development effort

Epic 9 sets the pattern for future provider integrations, establishing a clear blueprint for migrating from web scraping to official APIs with maximum infrastructure reuse.

---

**Document Status:** Complete
**Next Steps:** Awaiting Epic 9 implementation start
**Dependencies:** Epic 8 (DVIDS API Integration) must be complete

---

**References:**
- Epic 8 Documentation: `docs/epics/epic-8-dvids-api-integration.md`
- Epic 9 Documentation: `docs/epics/epic-9-nasa-api-integration.md`
- ADR-015: `docs/architecture/architecture-decision-records.md#adr-015`
- NASA API Documentation: https://api.nasa.gov/
- NASA Image and Video Library API: https://images-api.nasa.gov/
