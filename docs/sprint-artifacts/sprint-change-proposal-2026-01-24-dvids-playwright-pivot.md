# Sprint Change Proposal: DVIDS Playwright Pivot

**Date:** 2026-01-24
**Project:** AI Video Generator
**Initiated By:** Technical discovery during Story 6.10 implementation
**Severity:** Significant (technology pivot within same feature scope)
**Mode:** Incremental

---

## Executive Summary

After nearly one week of development effort, the HTTP web scraping approach for the DVIDS MCP server (Story 6.10) has proven technically infeasible. The DVIDS website uses JavaScript-rendered content and video streaming protocols that cannot be accessed through simple HTTP requests and HTML parsing.

**Recommendation:** Pivot from HTTP scraping (`httpx` + `BeautifulSoup`) to **Playwright headless browser automation** within the existing MCP server architecture. This maintains the architectural design while enabling access to JavaScript-rendered content and video streaming URLs.

---

## Section 1: Issue Summary

### Triggering Story
- **Story ID:** 6.10 - DVIDS Web Scraping MCP Server
- **Status:** Marked as "done" but **NON-FUNCTIONAL**
- **Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
- **Feature:** 2.9 - Domain-Specific Content APIs

### Core Problem

| Category | Details |
|----------|---------|
| **Issue Type** | Technical limitation discovered during implementation |
| **Root Cause** | DVIDS website uses JavaScript-rendered content and video streaming protocols (HLS/DASH) instead of direct file downloads |
| **Discovery Timeline** | Nearly 1 week of development effort attempting HTTP scraping |
| **Impact** | Video download URLs cannot be located or extracted with simple HTTP scraping |

### Evidence

1. **Web Scraper Failure:** The scraper cannot locate video download codes on dvidshub.net despite multiple approaches
2. **JavaScript Rendering:** DVIDS loads video information dynamically after page load
3. **Streaming Protocol:** Videos are served via streaming endpoints, not static file URLs
4. **Time Invested:** ~1 week of development effort on HTTP scraping approach

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Impact | Details |
|------|--------|---------|
| **Epic 6** | **MODIFIED** | Stories 6.9, 6.10, 6.11 are P2 "Future Work" - core Epic 6 functionality unaffected |
| **Epic 7** | **NONE** | Complete and unaffected |

### Story Impact

| Story | Status | Action Required |
|-------|--------|-----------------|
| **6.9** (MCP Video Provider Client) | Complete | No changes - architecture remains valid |
| **6.10** (DVIDS Server) | Needs Rewrite | Pivot from HTTP scraping to Playwright |
| **6.11** (NASA Server) | Not Started | Should use Playwright from the start |

### Artifact Conflicts

| Artifact | Conflict | Resolution |
|----------|----------|------------|
| **PRD** | Feature 2.9 references HTTP scraping | ✅ Updated to v3.7 with Playwright technology |
| **ADR-013** | Documents HTTP scraping approach | ✅ Updated to "Playwright Headless Browser" |
| **Architecture** | MCP integration plan references old tech | ✅ Updated with Playwright details |

### Technical Impact

| Area | Impact | Details |
|------|--------|---------|
| **Dependencies** | MODIFIED | Add: `playwright`, `playwright-stealth` |
| **System Resources** | INCREASED | ~200MB RAM per browser instance (vs ~20MB for HTTP) |
| **Installation** | NEW STEP | `playwright install chromium` (~300MB download) |
| **Startup Time** | INCREASED | 2-3 seconds for browser launch (vs ~100ms for HTTP) |

---

## Section 3: Recommended Approach

### Selected Path: **Direct Adjustment with Technology Pivot**

**Decision:** Maintain existing MCP server architecture but replace HTTP scraping with Playwright headless browser automation.

### Rationale

| Factor | Assessment |
|--------|------------|
| **User Value** | Preserved - feature remains the same, implementation changes only |
| **Architecture** | Valid - MCP pattern still applies, only server internals change |
| **Timeline** | +2-3 days for Playwright implementation |
| **Risk** | Medium - Playwright is battle-tested technology |
| **Alternatives Considered** | Official DVIDS API: Does not exist; Defer feature: Would lose user value |

### Trade-offs

| Pro | Con |
|-----|-----|
| ✅ Solves JavaScript rendering problem | ⚠️ Higher system resource usage |
| ✅ Can intercept network requests for video URLs | ⚠️ Browser binary installation required |
| ✅ Handles authentication/session if needed | ⚠️ Slower than HTTP scraping |
| ✅ Anti-detection with playwright-stealth | ⚠️ More complex debugging |
| ✅ Extensible to other JavaScript-heavy sites | ⚠️ Requires browser process management |

---

## Section 4: Detailed Change Proposals

### Change 1: Story 6.10 - Rewrite DVIDS Server with Playwright

**Story:** 6.10 - DVIDS Web Scraping MCP Server
**Section:** Technical Design, Dependencies, Tasks

**OLD:**
```python
# HTTP scraping approach
import httpx
from bs4 import BeautifulSoup

async def search_videos(query: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://dvidshub.net/search?q={query}")
        soup = BeautifulSoup(response.text, 'html.parser')
        # Cannot access JavaScript-rendered content ❌
```

**NEW:**
```python
# Playwright headless browser approach
from playwright.async_api import async_playwright

class DVIDSPlaywrightMCPServer:
    async def _ensure_browser(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=True)
        self.context = await self.browser.new_context()

    async def search_videos(self, query: str):
        await self._ensure_browser()
        page = await self.context.new_page()
        await page.goto(f"https://www.dvidshub.net/search/?query={query}")
        await page.wait_for_selector('.video-result')  # Wait for JS rendering ✅

        # Extract results using JavaScript execution
        results = await page.evaluate('''() => {
            const items = document.querySelectorAll('.video-result');
            return Array.from(items).map(item => ({...}));
        }''')
        return results
```

**Rationale:** Playwright can render JavaScript, wait for dynamic content, and extract data that HTTP scraping cannot access.

---

### Change 2: Story 6.10 - Update Dependencies

**Section:** Dependencies

**OLD:**
```markdown
- HTTP Client: httpx for async HTTP requests
- HTML Parsing: beautifulsoup4 for web scraping
```

**NEW:**
```markdown
- Headless Browser: playwright for JavaScript rendering and dynamic content
- Anti-Detection: playwright-stealth to avoid bot detection
- HTTP Client: httpx for video file downloads (after URL extraction via Playwright)
```

**Rationale:** Playwright replaces httpx/bs4 for page navigation, but httpx is still useful for downloading video files once URLs are extracted.

---

### Change 3: Story 6.10 - Rename Server Module

**Section:** File Structure, Configuration

**OLD:**
```json
{
  "id": "dvids",
  "command": "python",
  "args": ["-m", "mcp_servers.dvids_scraping_server"]
}
```

**NEW:**
```json
{
  "id": "dvids",
  "name": "DVIDS Military Videos (Playwright)",
  "command": "python",
  "args": ["-m", "mcp_servers.dvids_playwright_server"],
  "env": {
    "DVIDS_CACHE_DIR": "./assets/cache/dvids",
    "PLAYWRIGHT_HEADLESS": "true",
    "PLAYWRIGHT_STEALTH": "true"
  }
}
```

**Rationale:** New module name reflects Playwright implementation. Environment variables control browser behavior.

---

### Change 4: Story 6.10 - Update Tasks

**Section:** Tasks

**OLD Task 2: Create DVIDS Scraping Server → AC-6.10.1**
- [ ] Create `mcp_servers/dvids_scraping_server.py`
- [ ] Import httpx, beautifulsoup4
- [ ] Implement HTTP-based scraping

**NEW Task 2: Create DVIDS Playwright Server → AC-6.10.1**
- [ ] Create `mcp_servers/dvids_playwright_server.py`
- [ ] Import playwright, playwright-stealth
- [ ] Implement `_ensure_browser()` for browser lifecycle management
- [ ] Implement `search_videos()` with page wait for JavaScript rendering
- [ ] Implement `download_video()` with network interception for video URLs
- [ ] Implement `cleanup()` for browser resource cleanup
- [ ] Add browser configuration (headless, stealth, user agent)

---

### Change 5: Story 6.11 - Use Playwright from Start

**Story:** 6.11 - NASA Web Scraping MCP Server
**Status:** Not Started

**Action:** Implement NASA server using Playwright from the start, following the same pattern as DVIDS server.

**Module:** `mcp_servers/nasa_playwright_server.py`

**Rationale:** Avoids duplicate effort. Lessons learned from DVIDS implementation apply directly to NASA.

---

### Change 6: New Base Class for Playwright Providers

**NEW FILE:** `mcp_servers/base_playwright_provider.py`

```python
"""Base class for Playwright-based MCP video providers."""

from abc import ABC, abstractmethod
from playwright.async_api import async_playwright, Browser, BrowserContext

class BasePlaywrightVideoProvider(ABC):
    """Shared Playwright functionality for all video provider MCP servers."""

    def __init__(self):
        self.playwright = None
        self.browser = None
        self.context = None

    async def _ensure_browser(self):
        """Initialize headless browser on first use."""
        if self.browser is None:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage']
            )
            self.context = await self.browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
            )
            # Apply stealth to avoid detection
            await self.context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            """)

    @abstractmethod
    async def search_videos(self, query: str, max_duration: int = 120):
        """Search for videos on the provider's website."""
        pass

    @abstractmethod
    async def download_video(self, video_id: str):
        """Download video by ID."""
        pass

    async def cleanup(self):
        """Clean up browser resources."""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
```

**Rationale:** DRY principle - shared browser management, stealth setup, and cleanup logic for DVIDS and NASA servers.

---

## Section 5: Implementation Handoff

### Change Scope Classification

**Scope: MODERATE**

- Requires backlog reorganization (Story 6.10 rewrite, Story 6.11 update)
- PO/SM coordination needed for story status updates
- Development team executes Playwright implementation
- Architecture documents updated (already complete)

### Handoff Recipients

| Role | Responsibilities |
|------|------------------|
| **Product Owner / Scrum Master** | Update Story 6.10 status from "done" to "in-progress", update story file with new tasks |
| **Developer** | Implement Playwright-based DVIDS MCP server following updated story specifications |
| **Technical Writer** | Story documentation already updated with Playwright details |

### Success Criteria

- [ ] DVIDS MCP server can successfully search for videos on dvidshub.net
- [ ] DVIDS MCP server can successfully download videos using Playwright-extracted URLs
- [ ] Rate limiting (30 seconds) is enforced to respect DVIDS server load
- [ ] Browser resources are properly cleaned up after each operation
- [ ] Unit tests pass with mocked Playwright browsers
- [ ] Integration test confirms end-to-end video retrieval works

---

## Section 6: Implementation Roadmap

### Phase 1: Environment Setup (Day 1)
- [ ] Add `playwright` and `playwright-stealth` to requirements.txt
- [ ] Run `playwright install chromium` to download browser binary
- [ ] Create `mcp_servers/base_playwright_provider.py` base class
- [ ] Update `config/mcp_servers.json` with Playwright environment variables

### Phase 2: DVIDS Server Implementation (Days 2-3)
- [ ] Create `mcp_servers/dvids_playwright_server.py`
- [ ] Implement browser lifecycle management
- [ ] Implement `search_videos()` with JavaScript rendering wait
- [ ] Implement `download_video()` with network interception
- [ ] Integrate with shared VideoCache module
- [ ] Add error handling and cleanup

### Phase 3: Testing (Day 3)
- [ ] Write unit tests with mocked Playwright browsers
- [ ] Write integration test with real DVIDS website
- [ ] Verify rate limiting and resource cleanup
- [ ] Test cache hit/miss behavior

### Phase 4: Story Updates (Day 4)
- [ ] Update Story 6.10 file with Playwright implementation details
- [ ] Update Story 6.11 to use Playwright from start
- [ ] Mark Story 6.10 as "done" after verification
- [ ] Update sprint status

---

## Appendix: Technical Reference

### Playwright vs HTTP Scraping Comparison

| Capability | HTTP Scraping | Playwright |
|------------|---------------|------------|
| Static HTML | ✅ Works | ✅ Works |
| JavaScript Rendering | ❌ No access | ✅ Full rendering |
| Network Interception | ❌ Cannot | ✅ Can monitor requests |
| Form Interaction | ❌ Manual only | ✅ Can fill/submit |
| Anti-Detection | ❌ Easy to detect | ✅ Stealth plugins |
| Resource Usage | ~20MB RAM | ~200MB RAM |
| Speed | Fast (~100ms) | Slower (2-3s startup) |

### Browser Installation Commands

```bash
# Install Python packages
pip install playwright playwright-stealth

# Download Chromium browser binary (~300MB)
python -m playwright install chromium

# Verify installation
python -m playwright show-chromium
```

### Playwright Stealth Configuration

```python
import playwright_stealth

async def _ensure_browser(self):
    self.playwright = await async_playwright().start()
    self.browser = await self.playwright.chromium.launch(headless=True)
    self.context = await self.browser.new_context()

    # Apply stealth to avoid bot detection
    await playwright_stealth.stealth_async(self.context)
```

---

## Approval

**Prepared by:** Correct Course Workflow (2026-01-24)
**Reviewed by:** Product Manager, Architect (via subagent updates)
**Approved by:** _________________ **Date:** _____

**Implementation Start:** _____
**Target Completion:** _____
**Actual Completion:** _____
