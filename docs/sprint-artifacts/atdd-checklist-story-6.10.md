# ATDD Checklist - Story 6.10: DVIDS Web Scraping MCP Server

**Story ID:** 6.10
**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
**Status:** RED PHASE (Tests Failing)
**Created:** 2026-01-24
**Technology:** Python, Playwright, MCP SDK

---

## Story Summary

Build a DVIDS (Defense Visual Information Distribution Service) web scraping MCP server that enables the video production pipeline to source authentic military footage without API keys. The server will scrape the public DVIDS website using Playwright headless browser automation, cache content locally, and expose tools via MCP protocol.

**Technology Pivot (2026-01-24):** This story previously attempted HTTP scraping with `httpx` + `BeautifulSoup`, which failed due to JavaScript-rendered content. The new approach uses **Playwright headless browser automation** to render JavaScript and extract video data.

---

## Acceptance Criteria Breakdown

### AC-6.10.1: DVIDS Playwright MCP Server Implementation

**Given** the MCP Video Provider Client architecture is implemented (Story 6.9)
**When** the DVIDS Playwright MCP server is built
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

**Given** the DVIDS Playwright MCP server is implemented
**When** the VideoProviderClient connects to the server
**Then** the system shall:
- Configure DVIDS Playwright MCP server in `config/mcp_servers.json` as local stdio process
- Support automatic visual selection using algorithm: `combinedScore = (durationFit × 0.6) + (relevanceScore × 0.4)`
- Handle MCP server connection failures (server not running, startup errors)
- Display progress during scraping: "Searching DVIDS...", "Downloading video..."
- Display error message if DVIDS unavailable: "DVIDS scraping server unavailable"

### AC-6.10.4: Testing

**Given** the DVIDS Playwright MCP server is implemented
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

## Test Files Created

### Unit Tests (pytest)

#### 1. `tests/mcp_servers/test_cache.py`
**Purpose:** Test shared VideoCache module independently
**Test Count:** 8 tests

```python
import pytest
from mcp_servers.cache import VideoCache
import tempfile
import shutil

class TestVideoCache:
    """Test suite for VideoCache shared caching module."""

    def test_cache_initialization_creates_directories(self, tmp_path):
        # GIVEN: Temporary cache directory
        cache = VideoCache(provider_name="test", cache_dir=str(tmp_path), default_ttl_days=30)

        # WHEN: Cache is initialized
        # THEN: Provider subdirectory should exist
        assert (tmp_path / "test").exists()

    def test_is_cached_returns_false_for_nonexistent_video(self, tmp_path):
        # GIVEN: Empty cache
        cache = VideoCache(provider_name="test", cache_dir=str(tmp_path), default_ttl_days=30)

        # WHEN: Checking for non-existent video
        result = cache.is_cached("nonexistent_id")

        # THEN: Should return False
        assert result is False

    def test_get_stores_fetched_video_in_cache(self, tmp_path):
        # GIVEN: Cache and fetch function
        cache = VideoCache(provider_name="test", cache_dir=str(tmp_path), default_ttl_days=30)
        fetch_fn = lambda: {"data": "test_data", "ext": "mp4"}

        # WHEN: Getting video (not cached)
        result = cache.get("video_123", fetch_fn)

        # THEN: Video should be stored in cache
        assert cache.is_cached("video_123") is True
        assert result["data"] == "test_data"

    def test_get_returns_cached_video_if_within_ttl(self, tmp_path):
        # GIVEN: Cached video
        cache = VideoCache(provider_name="test", cache_dir=str(tmp_path), default_ttl_days=30)
        fetch_fn = lambda: {"data": "fresh_data", "ext": "mp4"}
        cache.get("video_123", fetch_fn)

        # WHEN: Getting same video again (should use cache)
        result = cache.get("video_123", fetch_fn)

        # THEN: Should return cached data (fetch_fn not called)
        assert result["data"] == "test_data"  # Original cached value

    def test_get_refetches_if_ttl_expired(self, tmp_path, time_machine):
        # GIVEN: Cached video with expired TTL
        cache = VideoCache(provider_name="test", cache_dir=str(tmp_path), default_ttl_days=0)  # Immediate expiry
        fetch_fn = lambda: {"data": "fresh_data", "ext": "mp4"}
        cache.get("video_123", fetch_fn)

        # WHEN: Getting video after TTL expiry
        result = cache.get("video_123", lambda: {"data": "new_data", "ext": "mp4"})

        # THEN: Should fetch new data
        assert result["data"] == "new_data"

    def test_invalidate_removes_cached_video(self, tmp_path):
        # GIVEN: Cached video
        cache = VideoCache(provider_name="test", cache_dir=str(tmp_path), default_ttl_days=30)
        fetch_fn = lambda: {"data": "test_data", "ext": "mp4"}
        cache.get("video_123", fetch_fn)

        # WHEN: Invalidating cache
        cache.invalidate("video_123")

        # THEN: Video should be removed from cache
        assert cache.is_cached("video_123") is False

    def test_get_cache_size_returns_total_size_in_bytes(self, tmp_path):
        # GIVEN: Cache with multiple videos
        cache = VideoCache(provider_name="test", cache_dir=str(tmp_path), default_ttl_days=30)
        # Add test videos...

        # WHEN: Getting cache size
        size = cache.get_cache_size()

        # THEN: Should return total size
        assert size > 0

    def test_get_cache_count_returns_number_of_cached_videos(self, tmp_path):
        # GIVEN: Cache with multiple videos
        cache = VideoCache(provider_name="test", cache_dir=str(tmp_path), default_ttl_days=30)
        cache.get("video_1", lambda: {"data": "x" * 100, "ext": "mp4"})
        cache.get("video_2", lambda: {"data": "y" * 200, "ext": "mp4"})

        # WHEN: Getting cache count
        count = cache.get_cache_count()

        # THEN: Should return correct count
        assert count == 2
```

#### 2. `tests/mcp_servers/test_dvids_server.py`
**Purpose:** Test DVIDS Playwright MCP server with mocked Playwright browser
**Test Count:** 12 tests

```python
import pytest
from unittest.mock import Mock, AsyncMock, patch
from mcp_servers.dvids_playwright_server import DVIDSPlaywrightMCPServer

class TestDVIDSServerBrowserLifecycle:
    """Test browser lifecycle management."""

    @pytest.mark.asyncio
    async def test_ensure_browser_launches_browser_on_first_use(self):
        # GIVEN: DVIDS server instance
        server = DVIDSPlaywrightMCPServer()

        # WHEN: First request requiring browser
        await server._ensure_browser()

        # THEN: Browser should be launched
        assert server.browser is not None
        assert server.context is not None

    @pytest.mark.asyncio
    async def test_ensure_browser_reuses_browser_for_subsequent_requests(self):
        # GIVEN: Server with already launched browser
        server = DVIDSPlaywrightMCPServer()
        await server._ensure_browser()
        first_browser = server.browser

        # WHEN: Calling ensure_browser again
        await server._ensure_browser()

        # THEN: Should reuse same browser instance
        assert server.browser is first_browser

    @pytest.mark.asyncio
    async def test_cleanup_closes_browser_resources(self):
        # GIVEN: Server with active browser
        server = DVIDSPlaywrightMCPServer()
        await server._ensure_browser()

        # WHEN: Cleaning up
        await server.cleanup()

        # THEN: Browser resources should be released
        assert server.browser is None
        assert server.context is None

class TestDVIDSServerRateLimiting:
    """Test rate limiting behavior."""

    @pytest.mark.asyncio
    async def test_respect_rate_limit_waits_30_seconds_between_requests(self):
        # GIVEN: Server with last_request time set
        server = DVIDSPlaywrightMCPServer()
        server.last_request = datetime.now()

        # WHEN: Making request within 30 seconds
        with patch('asyncio.sleep') as mock_sleep:
            await server._respect_rate_limit()

            # THEN: Should sleep for remaining time
            mock_sleep.assert_called_once()

    @pytest.mark.asyncio
    async def test_respect_rate_limit_skips_wait_if_30_seconds_elapsed(self):
        # GIVEN: Server with old last_request time (>30s ago)
        server = DVIDSPlaywrightMCPServer()
        server.last_request = datetime.now() - timedelta(seconds=31)

        # WHEN: Making request after 30 seconds
        with patch('asyncio.sleep') as mock_sleep:
            await server._respect_rate_limit()

            # THEN: Should NOT sleep
            mock_sleep.assert_not_called()

class TestDVIDSServerSearchVideos:
    """Test search_videos MCP tool."""

    @pytest.mark.asyncio
    async def test_search_videos_returns_results_from_dvids(self):
        # GIVEN: Server with mocked browser
        server = DVIDSPlaywrightMCPServer()
        mock_page = await self._setup_mock_browser(server)

        # Mock search results
        mock_page.evaluate.return_value = [
            {"videoId": "123", "title": "Military Aircraft", "duration": 120}
        ]

        # WHEN: Searching for videos
        results = await server.search_videos("military aircraft", 120)

        # THEN: Should return search results
        assert len(results) > 0
        assert results[0]["videoId"] == "123"

    @pytest.mark.asyncio
    async def test_search_videos_waits_for_javascript_rendering(self):
        # GIVEN: Server with mocked browser
        server = DVIDSPlaywrightMCPServer()
        mock_page = await self._setup_mock_browser(server)

        # WHEN: Searching for videos
        await server.search_videos("test query", 120)

        # THEN: Should wait for video results selector
        mock_page.wait_for_selector.assert_called_with('.video-result')

class TestDVIDSServerDownloadVideo:
    """Test download_video MCP tool."""

    @pytest.mark.asyncio
    async def test_download_video_stores_file_in_cache_directory(self):
        # GIVEN: Server with mocked browser and cache
        server = DVIDSPlaywrightMCPServer()
        mock_page = await self._setup_mock_browser(server)

        # Mock video URL extraction
        mock_page.locator.return_value.get_attribute.return_value = "https://example.com/video.mp4"

        # WHEN: Downloading video
        result = await server.download_video("video_123")

        # THEN: Video should be stored in cache
        assert "cached_path" in result
        assert "dvids" in result["cached_path"]

    @pytest.mark.asyncio
    async def test_download_video_uses_cache_if_already_cached(self):
        # GIVEN: Server with cached video
        server = DVIDSPlaywrightMCPServer()
        server.cache.is_cached.return_value = True

        # WHEN: Downloading already cached video
        result = await server.download_video("video_123")

        # THEN: Should return cached path without re-downloading
        assert "cached_path" in result
        # Browser should NOT be launched
        assert server.browser is None

class TestDVIDSServerGetVideoDetails:
    """Test get_video_details MCP tool."""

    @pytest.mark.asyncio
    async def test_get_video_details_returns_metadata(self):
        # GIVEN: Server with mocked browser
        server = DVIDSPlaywrightMCPServer()
        mock_page = await self._setup_mock_browser(server)

        # Mock video page content
        mock_page.evaluate.side_effect = [
            "Military Aircraft Operations",  # title
            "Training video showing aircraft procedures",  # description
            "120",  # duration
            "MP4",  # format
            "1920x1080",  # resolution
        ]

        # WHEN: Getting video details
        details = await server.get_video_details("video_123")

        # THEN: Should return all metadata fields
        assert details["title"] == "Military Aircraft Operations"
        assert details["duration"] == 120
        assert details["format"] == "MP4"

class TestDVIDSServerErrorHandling:
    """Test error handling and logging."""

    @pytest.mark.asyncio
    async def test_search_videos_handles_timeout_gracefully(self):
        # GIVEN: Server with browser that times out
        server = DVIDSPlaywrightMCPServer()
        mock_page = await self._setup_mock_browser(server)
        mock_page.wait_for_selector.side_effect = TimeoutError("Page load timeout")

        # WHEN: Searching with timeout
        # THEN: Should handle error gracefully
        with pytest.raises(Exception) as exc_info:
            await server.search_videos("test query", 120)
        assert "timeout" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_download_video_handles_network_errors(self):
        # GIVEN: Server with mocked browser
        server = DVIDSPlaywrightMCPServer()
        mock_page = await self._setup_mock_browser(server)

        # Mock network error
        mock_page.locator.return_value.get_attribute.side_effect = Exception("Network error")

        # WHEN: Downloading fails
        # THEN: Should raise appropriate error
        with pytest.raises(Exception):
            await server.download_video("video_123")
```

### Integration Tests

#### 3. `tests/mcp_servers/test_dvids_integration.py`
**Purpose:** Test real DVIDS website interaction via Playwright
**Test Count:** 4 tests (marked as slow/integration)

```python
import pytest
from mcp_servers.dvids_playwright_server import DVIDSPlaywrightMCPServer

@pytest.mark.integration
@pytest.mark.slow
class TestDVIDSIntegration:
    """Integration tests with real DVIDS website."""

    @pytest.mark.asyncio
    async def test_real_dvids_search_returns_results(self):
        # GIVEN: Real DVIDS server instance
        server = DVIDSPlaywrightMCPServer()

        # WHEN: Searching real DVIDS website
        results = await server.search_videos("military", 120)

        # THEN: Should return actual results
        assert len(results) > 0
        assert "videoId" in results[0]

    @pytest.mark.asyncio
    async def test_real_dvids_download_saves_video_file(self):
        # GIVEN: Real DVIDS server
        server = DVIDSPlaywrightMCPServer()

        # WHEN: Downloading real video
        result = await server.download_video("test_video_id")

        # THEN: Video file should exist
        import os
        assert os.path.exists(result["cached_path"])

    @pytest.mark.asyncio
    async def test_real_dvids_rate_limiting_respects_delay(self):
        # GIVEN: Real DVIDS server
        server = DVIDSPlaywrightMCPServer()

        # WHEN: Making two rapid requests
        import time
        start = time.time()
        await server.search_videos("test1", 120)
        await server.search_videos("test2", 120)
        elapsed = time.time() - start

        # THEN: Should have waited 30 seconds
        assert elapsed >= 30

    @pytest.mark.asyncio
    async def test_cache_persists_across_server_restart(self):
        # GIVEN: Server with cached video
        server1 = DVIDSPlaywrightMCPServer()
        await server1.download_video("test_video_id")
        cached_path = server1.cache.get_cache_files()[0]

        # WHEN: Server restarts and requests same video
        await server1.cleanup()
        server2 = DVIDSPlaywrightMCPServer()
        result = await server2.download_video("test_video_id")

        # THEN: Should use cached file
        assert result["cached_path"] == cached_path
```

---

## Supporting Infrastructure

### Test Fixtures

#### `tests/conftest.py`
**Purpose:** Shared pytest fixtures for DVIDS server tests

```python
import pytest
from unittest.mock import Mock, AsyncMock
from mcp_servers.dvids_playwright_server import DVIDSPlaywrightMCPServer

@pytest.fixture
def mock_playwright():
    """Mock Playwright browser instance."""
    with patch('playwright.async_api.async_playwright') as mock:
        playwright_instance = mock.return_value.__aenter__.return_value
        browser = AsyncMock()
        context = AsyncMock()
        page = AsyncMock()

        playwright_instance.chromium.launch.return_value = browser
        browser.new_context.return_value = context
        context.new_page.return_value = page

        yield {
            'playwright': playwright_instance,
            'browser': browser,
            'context': context,
            'page': page
        }

@pytest.fixture
def dvids_server():
    """DVIDS server instance."""
    server = DVIDSPlaywrightMCPServer()
    yield server
    # Cleanup
    import asyncio
    asyncio.run(server.cleanup())
```

### Test Data

#### `tests/mcp_servers/fixtures/dvids_search_response.html`
**Purpose:** Mock HTML response for DVIDS search page

#### `tests/mcp_servers/fixtures/dvids_video_page.html`
**Purpose:** Mock HTML response for DVIDS video details page

---

## Mock Requirements for DEV Team

### Playwright Mock

**Purpose:** Avoid launching real browser in unit tests

**Mock Behavior:**
- `async_playwright().start()`: Returns mock playwright instance
- `playwright.chromium.launch(headless=True)`: Returns mock browser
- `browser.new_context()`: Returns mock context
- `context.new_page()`: Returns mock page
- `page.goto(url)`: Simulates navigation
- `page.wait_for_selector(selector)`: Simulates waiting for element
- `page.evaluate(script)`: Returns mock data (search results, metadata)
- `page.locator(selector)`: Returns mock element
- `element.get_attribute(attr)`: Returns mock attribute values

### HTTP Download Mock

**Purpose:** Avoid downloading real video files in tests

**Mock Behavior:**
- `httpx.AsyncClient.get()`: Returns mock response with video data
- `httpx.stream_download()`: Simulates download to file

---

## Implementation Checklist

### AC-6.10.5: Shared Caching Module

- [ ] Create `mcp_servers/__init__.py`
- [ ] Create `mcp_servers/cache.py` with `VideoCache` class
- [ ] Implement `__init__(provider_name, cache_dir, default_ttl_days)`
- [ ] Implement `is_cached(video_id)` method
- [ ] Implement `get(video_id, fetch_fn)` method with cache hit/miss logic
- [ ] Implement `invalidate(video_id)` method
- [ ] Implement `get_cache_size()`, `get_cache_count()`, `get_cache_age()` methods
- [ ] Implement `_load_metadata()` and `_save_metadata()` methods
- [ ] Create `assets/cache/` directory structure
- [ ] Add metadata JSON schema validation
- [ ] Run tests: `pytest tests/mcp_servers/test_cache.py -v`
- [ ] ✅ All cache tests pass (8/8)

### AC-6.10.1: DVIDS Playwright Server

- [ ] Create `mcp_servers/dvids_playwright_server.py`
- [ ] Import MCP SDK dependencies (`mcp.server`, `playwright`, `playwright-stealth`)
- [ ] Implement `DVIDSPlaywrightMCPServer` class
- [ ] Implement `_ensure_browser()` method with Playwright launch
- [ ] Implement `_respect_rate_limit()` method (30s delay)
- [ ] Implement `search_videos(query, max_duration)` MCP tool with page wait
- [ ] Implement `download_video(video_id)` MCP tool with network interception
- [ ] Implement `get_video_details(video_id)` MCP tool
- [ ] Implement `cleanup()` method for browser resource cleanup
- [ ] Register MCP tools with server
- [ ] Implement `main()` entry point for stdio server
- [ ] Add logging for all browser operations
- [ ] Run tests: `pytest tests/mcp_servers/test_dvids_server.py -v`
- [ ] ✅ All unit tests pass (12/12)

### AC-6.10.2: Video Caching Integration

- [ ] Initialize `VideoCache` in DVIDS server constructor
- [ ] Configure cache with provider_name="dvids", default_ttl=30 days
- [ ] Update `download_video()` to use `cache.get(video_id, fetch_fn)`
- [ ] Store videos in `assets/cache/dvids/` subdirectory
- [ ] Verify cache metadata is stored in `assets/cache/metadata.json`
- [ ] Test cache hit/miss behavior manually

### AC-6.10.4: Integration Tests

- [ ] Create `tests/mcp_servers/test_dvids_integration.py`
- [ ] Test real MCP server startup
- [ ] Test JSON-RPC tool calls with real DVIDS website
- [ ] Test with real DVIDS website (use rate limits carefully)
- [ ] Test cache persistence across server restarts
- [ ] Run integration tests: `pytest tests/mcp_servers/test_dvids_integration.py -v --slow`
- [ ] ✅ All integration tests pass (4/4)

### AC-6.10.3: Client Integration

- [ ] Update `config/mcp_servers.json` with DVIDS provider entry
- [ ] Configure command: `python -m mcp_servers.dvids_playwright_server`
- [ ] Set environment variables for cache directory and rate limit
- [ ] Set priority=1 for DVIDS (military niche priority)
- [ ] Set enabled=false by default (user opt-in)
- [ ] Update `lib/mcp/video-provider-client.ts` to handle DVIDS responses
- [ ] Add error handling for DVIDS server unavailable
- [ ] Add progress callbacks: "Searching DVIDS...", "Downloading video..."
- [ ] Implement visual selection algorithm in `lib/pipeline/visual-generation.ts`
- [ ] Add provider fallback logic in ProviderRegistry
- [ ] Manual test: Search DVIDS from UI
- [ ] Manual test: Download DVIDS video from UI
- [ ] Manual test: Verify cache behavior

---

## Red-Green-Refactor Workflow

### RED Phase (Complete)

- ✅ All tests written and failing
- ✅ Fixtures and factories created
- ✅ Mock requirements documented
- ✅ Implementation checklist created

### GREEN Phase (DEV Team - Next Phase)

1. Pick one failing test from implementation checklist
2. Implement minimal code to make it pass
3. Run test to verify green: `pytest tests/mcp_servers/test_cache.py -v`
4. Move to next test
5. Repeat until all tests pass

**Commands:**
```bash
# Run all failing tests
pytest tests/mcp_servers/ -v

# Run specific test file
pytest tests/mcp_servers/test_cache.py -v

# Run with coverage
pytest tests/mcp_servers/ --cov=mcp_servers --cov-report=html

# Run integration tests (slow)
pytest tests/mcp_servers/test_dvids_integration.py -v --slow
```

### REFACTOR Phase (DEV Team - After Green)

1. All tests passing (green)
2. Improve code quality
3. Extract duplications
4. Optimize performance
5. Ensure tests still pass

---

## Running Tests

```bash
# Install dependencies
pip install playwright pytest pytest-asyncio pytest-cov pytest-mock pytest-timeout
playwright install chromium

# Run all tests
pytest tests/mcp_servers/ -v

# Run specific test file
pytest tests/mcp_servers/test_cache.py -v

# Run with coverage
pytest tests/mcp_servers/ --cov=mcp_servers --cov-report=html

# Run integration tests only
pytest tests/mcp_servers/test_dvids_integration.py -v -m integration

# Run unit tests only (exclude integration)
pytest tests/mcp_servers/ -v -m "not integration"

# Run specific test
pytest tests/mcp_servers/test_dvids_server.py::TestDVIDSServerBrowserLifecycle::test_ensure_browser_launches_browser_on_first_use -v

# Debug with pdb
pytest tests/mcp_servers/test_cache.py -v --pdb
```

---

## Expected Failure Messages (RED Phase Verification)

### test_cache.py

```bash
$ pytest tests/mcp_servers/test_cache.py -v

FAILED [0%] test_cache_initialization_creates_directories
  ImportError: No module named 'mcp_servers.cache'

FAILED [12%] test_is_cached_returns_false_for_nonexistent_video
  ImportError: No module named 'mcp_servers.cache'

FAILED [25%] test_get_stores_fetched_video_in_cache
  ImportError: No module named 'mcp_servers.cache'

... (all 8 tests fail with import error)
```

### test_dvids_server.py

```bash
$ pytest tests/mcp_servers/test_dvids_server.py -v

FAILED [0%] test_ensure_browser_launches_browser_on_first_use
  ImportError: No module named 'mcp_servers.dvids_playwright_server'

FAILED [8%] test_ensure_browser_reuses_browser_for_subsequent_requests
  ImportError: No module named 'mcp_servers.dvids_playwright_server'

... (all 12 tests fail with import error)
```

**Note:** These import errors are expected in RED phase - the modules don't exist yet.

---

## Next Steps for DEV Team

1. **Review this checklist** - Understand all acceptance criteria and test scenarios
2. **Run failing tests** - Verify RED phase: `pytest tests/mcp_servers/ -v`
3. **Start with cache module** - AC-6.10.5 has no dependencies, implement first
4. **Implement DVIDS server** - AC-6.10.1 uses cache module from AC-6.10.5
5. **Integrate caching** - AC-6.10.2 connects server to cache
6. **Write integration tests** - AC-6.10.4 validates with real DVIDS website
7. **Client integration** - AC-6.10.3 connects to TypeScript client
8. **Share progress** - Update story file with implementation notes

---

## Knowledge Base References Applied

This ATDD checklist applies BMAD test architecture patterns:

- **Fixture Architecture**: Auto-cleanup fixtures for browser and cache setup
- **Data Factories**: Mock data generation for test scenarios
- **Test Quality**: Deterministic tests with no hard waits
- **Given-When-Then**: Clear test structure with setup/action/assertion phases
- **Red-Green-Refactor**: Classic TDD workflow enforced

**Note:** This is a **Python pytest** test suite (not Playwright/Cypress E2E tests) because Story 6.10 implements a **Python MCP server**, not a web frontend.

---

## Output Summary

**Story**: 6.10 - DVIDS Web Scraping MCP Server
**Primary Test Level**: Unit Tests (pytest) + Integration Tests (real DVIDS website)

**Failing Tests Created**:
- Unit tests: 20 tests (8 cache + 12 server)
- Integration tests: 4 tests (marked slow/integration)

**Supporting Infrastructure**:
- Test fixtures: 2 fixtures (mock_playwright, dvids_server)
- Mock requirements: Playwright browser, HTTP download
- Test data: 2 HTML fixtures for DVIDS responses

**Implementation Checklist**:
- Total tasks: 45 tasks across 5 acceptance criteria
- Estimated effort: 16-24 hours

**Required Files/Directories**:
- mcp_servers/cache.py (NEW)
- mcp_servers/dvids_playwright_server.py (NEW)
- tests/mcp_servers/test_cache.py (NEW)
- tests/mcp_servers/test_dvids_server.py (NEW)
- tests/mcp_servers/test_dvids_integration.py (NEW)
- tests/conftest.py (NEW or UPDATE)
- assets/cache/dvids/ (CREATE)
- assets/cache/metadata.json (CREATE)

**Next Phase:** DEV_STORY (Phase 4) - Implement to make tests pass (GREEN)
