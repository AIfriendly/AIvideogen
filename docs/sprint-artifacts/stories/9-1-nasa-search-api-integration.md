# Story 9.1: NASA Image and Video Library API Integration

Status: drafted

## Story

As a **video creator in the space/tech niche**,
I want **the system to search for NASA videos using the official NASA Image and Video Library API**,
so that **I can reliably access authentic NASA footage without the overhead and fragility of web scraping**.

## Acceptance Criteria

1. **AC-001:** The `search_videos` tool queries the `https://images-api.nasa.gov/search` endpoint using GET requests with search parameters (query, media_type, center, year ranges)
2. **AC-002:** API key authentication is loaded from the `NASA_API_KEY` environment variable when provided; if not provided, the system still works for public content access
3. **AC-003:** Rate limiting is enforced with a 30-second delay between requests (consistent with DVIDS provider) using `_respect_rate_limit()` function
4. **AC-004:** Search parameters include: `q` (search query), `media_type=video` (filter for videos only), `center` (NASA center), `year_start` and `year_end` (year filters)
5. **AC-005:** API response JSON is parsed successfully to extract: `nasa_id` (used as video_id), `title`, `description`, `date_created`, `center`, and download URL from `links[0].href`
6. **AC-006:** HTTP 400 errors display "Bad request - check search parameters" to the user with actionable guidance
7. **AC-007:** HTTP 404 errors display "Resource not found" when the requested resource is unavailable
8. **AC-008:** HTTP 429 errors trigger retry with exponential backoff using the formula `min(BASE_BACKOFF × 2^attempt, MAX_BACKOFF)` where BASE_BACKOFF=2s and MAX_BACKOFF=60s
9. **AC-009:** HTTP 500 errors fall back to returning empty results with graceful degradation (does not crash the system)
10. **AC-010:** Request logging includes: endpoint URL, request parameters, HTTP response status code, and result count
11. **AC-011:** API unavailability logs an error and returns empty results (does not crash the system)
12. **AC-012:** Test Case: Searching for "space shuttle" returns 10+ results with valid video metadata including nasa_id, title, description, and download URL
13. **AC-013:** Test Case: Missing API key still allows public content access (API key is optional)
14. **AC-014:** Test Case: Invalid search parameters return HTTP 400 with a user-friendly error message
15. **AC-015:** Test Case: Two rapid searches respect the 30-second delay between requests (rate limiting enforced)

## Tasks / Subtasks

- [ ] **Task 1:** Replace Playwright web scraping logic with NASA API calls (AC: 1, 5, 10)
  - [ ] Subtask 1.1: Implement `search_nasa_api()` function that sends GET requests to `https://images-api.nasa.gov/search`
  - [ ] Subtask 1.2: Parse NASA API response JSON structure (`collection.items`) to extract video metadata
  - [ ] Subtask 1.3: Extract `nasa_id` from `data[0].nasa_id` field as unique video identifier
  - [ ] Subtask 1.4: Extract `title`, `description`, `date_created`, `center` from response
  - [ ] Subtask 1.5: Extract download URL from `links[0].href` field (direct MP4 link)

- [ ] **Task 2:** Implement API key authentication via environment variable (AC: 2, 13)
  - [ ] Subtask 2.1: Load `NASA_API_KEY` from environment variables using `os.getenv()`
  - [ ] Subtask 2.2: Add API key to request headers if provided (optional for public content)
  - [ ] Subtask 2.3: Test with missing API key to verify public content access works

- [ ] **Task 3:** Implement rate limiting with 30-second delay (AC: 3, 15)
  - [ ] Subtask 3.1: Define `RATE_LIMIT_SECONDS = 30` constant (consistent with DVIDS provider)
  - [ ] Subtask 3.2: Implement `_respect_rate_limit()` function using `time.time()` tracking
  - [ ] Subtask 3.3: Add rate limit enforcement before each API request
  - [ ] Subtask 3.4: Test two rapid searches to verify 30-second delay is enforced

- [ ] **Task 4:** Implement search filters and parameters (AC: 4)
  - [ ] Subtask 4.1: Add support for `q` parameter (search query terms)
  - [ ] Subtask 4.2: Add support for `media_type=video` parameter (filter for videos only)
  - [ ] Subtask 4.3: Add support for `center` parameter (NASA centers: GSFC, JSC, KSC, etc.)
  - [ ] Subtask 4.4: Add support for `year_start` parameter (start year filter in YYYY-MM-DD format)
  - [ ] Subtask 4.5: Add support for `year_end` parameter (end year filter in YYYY-MM-DD format)
  - [ ] Subtask 4.6: Add support for `keywords` parameter (comma-separated keywords)

- [ ] **Task 5:** Add error handling for HTTP failures (AC: 6, 7, 8, 9, 11)
  - [ ] Subtask 5.1: Implement HTTP 400 error handling with "Bad request - check search parameters" message
  - [ ] Subtask 5.2: Implement HTTP 404 error handling with "Resource not found" message
  - [ ] Subtask 5.3: Implement HTTP 429 error handling with exponential backoff retry
  - [ ] Subtask 5.4: Define `BASE_BACKOFF = 2` and `MAX_BACKOFF = 60` constants
  - [ ] Subtask 5.5: Implement exponential backoff formula: `min(BASE_BACKOFF × 2^attempt, MAX_BACKOFF)`
  - [ ] Subtask 5.6: Implement HTTP 500 error handling with graceful degradation (return empty results)
  - [ ] Subtask 5.7: Add error handling for API unavailability (network failures, timeouts)

- [ ] **Task 6:** Implement request logging for debugging (AC: 10)
  - [ ] Subtask 6.1: Add logging for endpoint URL
  - [ ] Subtask 6.2: Add logging for request parameters
  - [ ] Subtask 6.3: Add logging for HTTP response status code
  - [ ] Subtask 6.4: Add logging for result count

- [ ] **Task 7:** Update MCP tool `search_videos` to use NASA API (AC: 1)
  - [ ] Subtask 7.1: Modify `mcp_servers/nasa_api_server.py` to use API instead of Playwright
  - [ ] Subtask 7.2: Remove Playwright dependencies (can be kept for other providers)
  - [ ] Subtask 7.3: Update MCP tool schema to reflect API-based search parameters
  - [ ] Subtask 7.4: Test MCP tool integration with NASA API

- [ ] **Task 8:** Write comprehensive tests (AC: 12, 13, 14, 15)
  - [ ] Subtask 8.1: Write test for "space shuttle" search returning 10+ results
  - [ ] Subtask 8.2: Write test for missing API key (public content access)
  - [ ] Subtask 8.3: Write test for invalid search parameters (400 error)
  - [ ] Subtask 8.4: Write test for rapid searches (rate limiting enforcement)
  - [ ] Subtask 8.5: Write test for exponential backoff on 429 errors
  - [ ] Subtask 8.6: Write test for graceful degradation on 500 errors

## Dev Notes

### Architecture Context

**Epic 9 Context:** This story migrates the NASA video provider from Playwright web scraping (Story 6.11) to the official NASA Image and Video Library API, following the successful pattern established by Epic 8 (DVIDS API Integration). The API-based approach provides better reliability, simpler implementation, and faster performance without browser overhead.

**Key Technical Differences from Epic 8:**
- No HLS manifest handling (NASA provides direct MP4 URLs)
- Simpler authentication (API key is optional for public content)
- Different parameter naming (q vs query, media_type vs type)
- Duration not included in search results (requires additional fetch if needed)
- Same rate limiting: 30 seconds per request (consistent with DVIDS provider)

### API Integration Details

**NASA API Endpoint:** `https://images-api.nasa.gov/search`

**Authentication:**
- API key via `NASA_API_KEY` environment variable
- Optional for public content (API works without key)
- Key format: `api_key=<YOUR_API_KEY>` in request headers or query parameters

**Search Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query terms |
| `media_type` | string | No | "video" to filter for videos only |
| `center` | string | No | NASA center (GSFC, JSC, KSC, etc.) |
| `year_start` | string | No | Start year filter (YYYY-MM-DD) |
| `year_end` | string | No | End year filter (YYYY-MM-DD) |
| `keywords` | string | No | Comma-separated keywords |

**Response Structure (NASA API):**
```json
{
  "collection": {
    "metadata": {
      "total_hits": 1234
    },
    "items": [
      {
        "data": [{
          "nasa_id": "12345-A",
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

**Response Field Mapping:**
- `data[0].nasa_id` → `video_id` (unique identifier)
- `data[0].title` → `title`
- `data[0].description` → `description`
- `data[0].date_created` → `date_created`
- `data[0].center` → `center`
- `links[0].href` → `download_url` (direct MP4 link)

### Rate Limiting Implementation

**Rate Limit Constants:**
```python
RATE_LIMIT_SECONDS = 30  # Consistent with DVIDS provider
BASE_BACKOFF = 2  # Base backoff for exponential retry
MAX_BACKOFF = 60  # Maximum backoff cap
```

**Rate Limiting Function:**
```python
import time

_last_request_time = 0

def _respect_rate_limit():
    """Enforce rate limiting with 30-second delay between requests."""
    global _last_request_time
    current_time = time.time()
    time_since_last_request = current_time - _last_request_time

    if time_since_last_request < RATE_LIMIT_SECONDS:
        wait_time = RATE_LIMIT_SECONDS - time_since_last_request
        logger.info(f"Rate limit: Waiting {wait_time:.1f}s before next request")
        time.sleep(wait_time)

    _last_request_time = time.time()
```

**Exponential Backoff for HTTP 429/503:**
```python
import asyncio

async def _retry_with_backoff(request_fn, max_retries=3):
    """Retry request with exponential backoff on 429/503 errors."""
    for attempt in range(max_retries):
        try:
            return await request_fn()
        except HTTPStatusError as e:
            if e.response.status_code in [429, 503]:
                if attempt < max_retries - 1:
                    backoff = min(BASE_BACKOFF * (2 ** attempt), MAX_BACKOFF)
                    logger.warning(f"HTTP {e.response.status_code}: Retrying in {backoff}s (attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(backoff)
                else:
                    logger.error(f"HTTP {e.response.status_code}: Max retries exceeded")
                    raise
            else:
                raise
```

### Error Handling Strategy

**HTTP Error Codes:**
- **400 Bad Request:** Invalid search parameters → Display "Bad request - check search parameters"
- **404 Not Found:** Resource not available → Display "Resource not found"
- **429 Too Many Requests:** Rate limit exceeded → Retry with exponential backoff
- **500 Internal Server Error:** API error → Return empty results (graceful degradation)

**Graceful Degradation:**
- API unavailability logs error but does not crash
- Returns empty results when API fails
- Allows system to continue with other video providers

### Files Modified

**Primary File:**
- `mcp_servers/nasa_api_server.py` (renamed from `nasa_playwright_server.py`)
  - Replace Playwright logic with API calls
  - Implement rate limiting with `_respect_rate_limit()`
  - Add error handling for HTTP failures
  - Update `search_videos` MCP tool
  - Add request logging

**Dependencies:**
- `httpx` - HTTP client for API requests
- `python-dotenv` - Environment variable loading

### Testing Requirements

**Unit Tests:**
- Test API request construction with various parameters
- Test response parsing for valid JSON
- Test rate limiting enforcement
- Test error handling for each HTTP status code (400, 404, 429, 500)
- Test exponential backoff calculation
- Test logging output

**Integration Tests:**
- Test with real NASA API endpoint
- Test "space shuttle" search returns 10+ results
- Test with missing API key (public content)
- Test invalid search parameters (400 error)
- Test rapid searches (rate limiting)
- Test API unavailability (network failure)

**Test Coverage Target:** 80%+ for API integration code

### Project Structure Notes

**Alignment with Epic 8 Pattern:**
This story follows the same pattern as Epic 8 Story 8.1 (DVIDS Search API Integration):
- API endpoint integration
- Rate limiting (30 seconds)
- Error handling with HTTP status codes
- Request logging for debugging
- Exponential backoff for 429/503 errors

**Differences from Epic 8:**
- No HLS manifest handling (NASA provides direct MP4 URLs)
- Optional API key (public content access)
- Different response structure (nested JSON)
- Duration not in search results

**No Conflicts:** NASA API integration does not conflict with existing DVIDS provider implementation.

### References

**Epic Documentation:**
- [Source: docs/epics/epic-9-nasa-api-integration.md#story-91]
- [Source: docs/epics/EPIC-9-ARCHITECTURE-SUMMARY.md#technical-architecture]

**Architecture Decision Record:**
- [Source: docs/architecture/architecture-decision-records.md#adr-015]

**NASA API Documentation:**
- NASA API Documentation: https://api.nasa.gov/
- NASA Image and Video Library API: https://images-api.nasa.gov/

**Epic 8 Pattern Reference:**
- Story 8.1: DVIDS Search API Integration (pattern to follow)
- DVIDS rate limiting implementation: `mcp_servers/dvids_api_server.py`

**Previous Implementation:**
- Story 6.11: Original NASA web scraping implementation (being replaced)

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

<!-- To be filled by dev agent -->

### Completion Notes List

<!-- To be filled by dev agent -->

### File List

<!-- To be filled by dev agent -->
