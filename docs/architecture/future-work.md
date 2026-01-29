# Future Work & Roadmap

**Project:** BMAD Video Generator
**Last Updated:** 2026-01-25
**Status:** Epic 8 Complete (DVIDS API Migration) | Epic 9 Planned (NASA API Migration) | Stories 6.9-6.11 Partially Complete

---

## Overview

This document outlines deferred features, future enhancements, and architectural considerations for upcoming development cycles.

---

## Completed Work

### Epic 8: DVIDS API Integration (Completed 2026-01-25)

**Status:** ✅ **COMPLETE**
**Stories:** 8.1-8.5 (5 stories, 19 points)
**Achievement:** Migrated DVIDS from Playwright web scraping to official DVIDS Search API with HLS download support.

**Key Accomplishments:**
- API-based video metadata retrieval (more reliable than web scraping)
- FFmpeg-based HLS video download with API key injection
- Connection pooling infrastructure (reusable by future providers)
- Cross-scene diversity enforcement (tracks selected video IDs)
- Cross-platform filename compatibility (Windows/Unix)

**Infrastructure Created (Reusable):**
- Connection pooling: `Map<string, MCPClient> connections`
- Diversity tracking: `Set<string> selectedVideoIds`
- Filename sanitization: `sanitize_video_id()` function

**Documentation:**
- Epic Definition: `docs/epics/epic-8-dvids-api-integration.md`
- ADR-014: DVIDS API Integration Decision Record

---

## Planned Work

### Epic 9: NASA API Integration (Planned)

**Status:** 📋 **PLANNED**
**Stories:** 9.1-9.5 (5 stories, 16 points)
**Dependencies:** Epic 8 (DVIDS API Integration) - for infrastructure reuse
**Rationale:** Apply Epic 8's successful API migration pattern to NASA provider.

**Key Differences from Epic 8:**
- Direct MP4 URLs (no FFmpeg required - simpler than DVIDS)
- Optional API key (public content accessible without authentication)
- Infrastructure reuse from Epic 8 (reduces development effort)
- 16 points vs 19 points (simpler download + infrastructure reuse)

**Stories:**
- Story 9.1: NASA API Integration (5 points)
- Story 9.2: Direct MP4 Video Download (3 points) - Simpler than Epic 8
- Story 9.3: Video Selection Diversity (4 points) - Reuse Epic 8
- Story 9.4: Connection Pooling (2 points) - Reuse Epic 8
- Story 9.5: Filename Compatibility (2 points) - Reuse Epic 8

**Documentation:**
- Epic Definition: `docs/epics/epic-9-nasa-api-integration.md`
- ADR-015: NASA API Integration Decision Record

---

## Historical Deferred Work

### Feature 2.9: Domain-Specific Content APIs (MCP Video Providers)

**Stories:** 6.9, 6.10, 6.11
**Status:** ⚠️ **PARTIALLY COMPLETE** (Epic 8 complete, Epic 9 planned)
**Original Rationale:** YouTube API provides sufficient visual sourcing for MVP; MCP servers require dedicated architectural planning.
**Technology Pivot (2026-01-24):** HTTP scraping failed on DVIDS (JavaScript-rendered content). Now using Playwright headless browser automation instead of `httpx` + `BeautifulSoup`.

#### Story 6.9: MCP Video Provider Client Architecture

**As a** developer,
**I want** an MCP client architecture for connecting to local video provider MCP servers,
**So that** the app can use custom scraping MCP servers without implementing web scraping directly.

**Key Components:**
- `VideoProviderClient` class for MCP stdio connections
- Configuration schema: `config/mcp_servers.json`
- Provider registry pattern for extensible video sources
- Interface methods: `search_videos()`, `download_video()`, `get_video_details()`
- Error handling for MCP-specific failures

**See:** ADR-013 (MCP Protocol for Video Provider Servers)

---

#### Story 6.10: DVIDS Web Scraping MCP Server (Playwright)

**As a** content creator in the military niche,
**I want** an MCP server that scrapes military videos from DVIDS website,
**So that** I can use authentic DVIDS content in my videos without API keys.

**Key Components:**
- `DVIDSPlaywrightMCPServer` (Python MCP SDK, stdio transport)
- MCP tools: `search_videos`, `download_video`, `get_video_details`
- Web scraping: **Playwright headless browser** (not HTTP requests)
- JavaScript rendering to access dynamic content (download codes)
- playwright-stealth for anti-detection
- Rate limiting: 1 request per 30 seconds
- Exponential backoff: `base_backoff × 2^attempt` (capped at 60s)
- Shared `VideoCache` class from `mcp_servers/cache.py`
- Browser installation: `playwright install chromium` (~300MB)

**Technical Note:** HTTP scraping (`httpx` + `BeautifulSoup`) failed because DVIDS uses JavaScript rendering to load video download codes. Playwright is required to access this dynamic content.

**Legal Note:** Ensure compliance with DVIDS terms of service and robots.txt.

---

#### Story 6.11: NASA Web Scraping MCP Server & Pipeline Integration (Playwright)

**As a** content creator in any niche,
**I want** an MCP server that scrapes space videos from NASA website,
**So that** I can use authentic NASA content in my videos without API keys.

**Key Components:**
- `NASAPlaywrightMCPServer` (Python MCP SDK, stdio transport)
- Web scraping: **Playwright headless browser** for NASA Image and Video Library (images.nasa.gov)
- Rate limiting: 1 request per 10 seconds
- Reuse `VideoCache` from Story 6.10
- Pipeline integration: Update Quick Production Flow to use VideoProviderClient
- Provider fallback logic: Try each provider in priority order
- Real-time progress UI: "Searching DVIDS...", "Searching NASA..."

**Legal Note:** NASA content is generally public domain.

---

### Implementation Notes for MCP Epic

When implementing Stories 6.9-6.11, follow this sequence:

1. **Story 6.9 First:** Build VideoProviderClient and configuration schema
2. **Create Shared Cache:** Implement `mcp_servers/cache.py` (VideoCache class)
3. **Story 6.10:** Build DVIDS server using Playwright headless browser (not HTTP scraping)
4. **Story 6.11:** Build NASA server using Playwright + pipeline integration

**Architecture Reference:** ADR-013 (Revised 2026-01-24 for Playwright)

**Browser Requirements:**
- Install Chromium: `playwright install chromium`
- Resource requirements: ~200MB RAM per browser instance
- playwright-stealth for anti-detection
- Sequential processing recommended (avoid concurrent browser instances)

---

## Future Enhancements

### RAG System Enhancements

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **Multi-language Support** | Extend caption/news scraping beyond English | Medium |
| **Custom Embedding Models** | Allow user-trained models for niche-specific embeddings | Low |
| **Real-time Sync Notifications** | WebSocket-based sync status updates | Low |
| **Advanced Analytics Dashboard** | View counts, engagement metrics over time | Low |
| **Full Transcript Editing UI** | Edit scraped transcripts before embedding | Low |

### Quick Production Flow Enhancements

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **Batch Video Creation** | Create multiple videos from topic suggestions | Medium |
| **Template-Based Production** | Pre-defined visual styles for different niches | Low |
| **Pipeline Retry Logic** | Auto-retry failed stages with adjusted parameters | Medium |
| **Progress WebSocket** | Real-time push updates instead of polling | Low |

### Visual Sourcing Enhancements

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **Additional MCP Providers** | Expand beyond DVIDS/NASA (e.g., NOAA, National Archives) | Medium |
| **Provider Auto-Discovery** | Dynamically detect available providers | Low |
| **Video Quality Selection** | Allow user to prefer HD/4K sources | Low |
| **Clip Smart-Cropping** | Automatic aspect ratio adaptation | Medium |

---

## Post-MVP Features

### Cloud Migration Path

Current architecture is local-first (ADR-006). Future cloud deployment considerations:

| Component | Local (Current) | Cloud (Future) |
|-----------|-----------------|----------------|
| **LLM** | Ollama (local) | Gemini API (cloud fallback) |
| **Vector DB** | ChromaDB (local) | Pinecone/Weaviate (cloud) |
| **Video Storage** | Local cache | CDN (e.g., Cloudflare R2) |
| **Database** | SQLite | PostgreSQL |
| **Job Queue** | SQLite-backed | Redis/BullMQ |

### Multi-User Support

If scaling beyond single-user:

| Feature | Implementation |
|---------|----------------|
| **Authentication** | Add user accounts, JWT tokens |
| **Project Isolation** | User-scoped project queries |
| **Resource Quotas** | Per-user storage/compute limits |
| **Concurrent Jobs** | User-specific job queues |

---

## Architectural Debt & Technical Improvements

### Known Limitations

| Area | Current State | Improvement |
|------|---------------|-------------|
| **Progress Polling** | HTTP polling every 1s | WebSocket push notifications |
| **Job Concurrency** | Hardcoded limit of 2 | Configurable per-user limits |
| **Error Recovery** | Manual retry for failed jobs | Auto-retry with backoff |
| **Cache Invalidation** | Manual only | TTL-based auto-invalidation |
| **Test Coverage** | Unit/integration only | Add E2E tests for critical flows |

### Performance Optimizations

| Component | Current Target | Optimization Opportunity |
|-----------|----------------|-------------------------|
| **Embedding Generation** | <500ms per video | Batch processing, model caching |
| **RAG Retrieval** | <500ms per query | Query result caching |
| **Channel Sync** | <5 min for 50 videos | Parallel transcript fetching |
| **News Fetch** | <2 min for all sources | Concurrent RSS parsing |
| **Pipeline Assembly** | Variable | Optimize FFmpeg commands |

---

## Deprecated / Removed Features

### Features Not Implemented

| Feature | Status | Reason |
|---------|--------|--------|
| **Real-time WebSocket sync status** | Not implemented | HTTP polling sufficient for MVP |
| **Multi-language caption scraping** | Not implemented | English-only for MVP |
| **Custom embedding model training** | Not implemented | Pre-trained models sufficient |
| **Analytics dashboard** | Not implemented | Out of scope for MVP |

---

## References

| Document | Location |
|----------|----------|
| Epic 6 Stories (Deferred) | [_bmad-output/planning-artifacts/epics.md](../../_bmad-output/planning-artifacts/epics.md) |
| Sprint Status | [docs/sprint-artifacts/sprint-status.yaml](../../sprint-artifacts/sprint-status.yaml) |
| ADR-013: MCP Protocol | [docs/architecture/architecture-decision-records.md](architecture-decision-records.md) |
| Epic 6 Architecture Index | [docs/architecture/epic-6-index.md](epic-6-index.md) |

---

**Last Updated:** 2025-12-03
**Next Review:** When planning MCP Video Provider Epic (Stories 6.9-6.11)
