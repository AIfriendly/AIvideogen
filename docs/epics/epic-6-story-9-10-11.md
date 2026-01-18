---
stepsCompleted: ['validate-prerequisites', 'design-epics', 'create-stories', 'final-validation']
inputDocuments: ['docs/prd.md', 'docs/architecture/index.md', 'docs/ux-design-specification.md']
workflowCompleted: true
---

# BMAD video generator - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for **Epic 6: Channel Intelligence & Content Research (RAG-Powered)** and **Feature 2.9: Automated Video Production Pipeline**.

**Epic 6 Goal:** Enable VidIQ-style intelligence by syncing with YouTube channels, analyzing competitors, monitoring trends, and generating scripts informed by the user's niche and content style using RAG (Retrieval-Augmented Generation).

## Requirements Inventory

### Functional Requirements - Epic 6 (Channel Intelligence - RAG)

**Feature 2.7: Channel Intelligence & Content Research:**
- **FR-2.7.01:** The system shall support two operating modes: Established Channel Mode (sync existing channel) and Cold Start Mode (declare niche for new channels)
- **FR-2.7.02:** The system shall ingest YouTube channel content via YouTube Data API (titles, descriptions, tags, metrics)
- **FR-2.7.03:** The system shall scrape video captions using `youtube-transcript-api` for content analysis
- **FR-2.7.04:** The system shall sync competitor channels (up to 5) using the same caption scraping approach
- **FR-2.7.05:** The system shall monitor YouTube Trends via YouTube Search API for niche-specific trending videos
- **FR-2.7.06:** The system shall fetch news articles from configured sources (e.g., military news sites) for niche awareness
- **FR-2.7.07:** The system shall use ChromaDB or LanceDB as local vector database for embeddings storage
- **FR-2.7.08:** The system shall use `all-MiniLM-L6-v2` for local text embeddings or Gemini for cloud embeddings
- **FR-2.7.09:** The system shall provide pre-configured authoritative sources for military niche (The War Zone, Defense News, etc.)
- **FR-2.7.10:** The system shall perform semantic search across indexed content for RAG retrieval
- **FR-2.7.11:** The system shall build context from retrieved documents (channel style, competitor patterns, trending topics)
- **FR-2.7.12:** The system shall augment script generation with RAG context for niche-aware content
- **FR-2.7.13:** The system shall provide topic suggestions based on RAG analysis (trending + gaps in content)
- **FR-2.7.14:** The system shall display sync status and last update timestamps for all data sources

### Functional Requirements - Feature 2.9 (Automated Video Production Pipeline)

**Quick Production Flow (QPF) - Phase 1 (Complete):**
- **FR-2.9.QPF.01:** The system shall display a "Create Video" button on each topic suggestion card
- **FR-2.9.QPF.02:** The system shall store user default preferences (default_voice_id, default_persona_id) in user settings
- **FR-2.9.QPF.03:** When "Create Video" is clicked, the system shall create a new project with the topic pre-filled and confirmed
- **FR-2.9.QPF.04:** The system shall automatically apply the user's default voice and persona to the new project
- **FR-2.9.QPF.05:** The system shall trigger the full video production pipeline without user intervention
- **FR-2.9.QPF.06:** The system shall redirect the user to a progress page showing pipeline status
- **FR-2.9.QPF.07:** Upon completion, the system shall redirect to the export page with the finished video
- **FR-2.9.QPF.08:** If no defaults are configured, the system shall prompt the user to set defaults before proceeding

**Domain-Specific Content APIs - Phase 2 & 3:**
- **FR-2.9.01:** The system shall provide automated video production from RAG topic suggestions
- **FR-2.9.02:** The system shall use domain-specific content APIs for visual sourcing (not YouTube)
- **FR-2.9.03:** The system shall access content APIs via MCP server layer
- **FR-2.9.04:** The system shall enforce rate limiting (default: 30 seconds per request)
- **FR-2.9.05:** The system shall auto-select best-matching visuals (no user choice)
- **FR-2.9.06:** The system shall NOT fallback to YouTube if domain-specific API fails
- **FR-2.9.07:** The system shall display real-time progress during pipeline execution
- **FR-2.9.08:** The system shall support extensible content providers (DVIDS, NASA, future APIs)

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-2.7.01 | FOSS compliance: ChromaDB (Apache 2.0), LanceDB (Apache 2.0), sentence-transformers (Apache 2.0) |
| NFR-2.7.02 | Local-first architecture: Vector database stored locally, embeddings generated locally |
| NFR-2.7.03 | Background job queue for daily sync operations (cron scheduling) |
| NFR-2.9.01 | Web scraping MCP servers fetch videos from DVIDS/NASA websites (no official APIs) |
| NFR-2.9.02 | Rate limiting enforced by scraping servers (DVIDS: 30s, NASA: 10s) |
| NFR-2.9.03 | Graceful failure if scraping server unavailable (no YouTube fallback) |
| NFR-2.9.04 | Progress UI shows scraping status: "Searching DVIDS...", "Downloading video..." |
| NFR-2.9.05 | Content licensing: Verify DVIDS/NASA usage rights for scraped content |
| NFR-2.9.06 | FOSS compliance: MCP protocol is open-source |

### Additional Requirements

**From Architecture Document:**
- VideoProviderClient interface for connecting to MCP video provider servers
- Provider connections (web scraping MCP servers, local, stdio transport):
  - **DVIDS Scraping MCP Server** - Scrapes dvidshub.net for military videos, caches locally
  - **NASA Scraping MCP Server** - Scrapes images.nasa.gov for space videos, caches locally
- Shared infrastructure: `mcp_servers/cache.py` - VideoCache class used by both scraping servers
- Web scraping approach: HTTP requests + HTML parsing (no official APIs used)
- Video caching: Downloaded videos stored in `assets/cache/{provider}/{video_id}.{ext}`
- Cache metadata: `assets/cache/metadata.json` with video details, cache dates, TTL
- Rate limiting: DVIDS (30s), NASA (10s) - implemented in scraping servers
- Exponential backoff on HTTP 429/503: `base_backoff × 2^attempt` (capped at 60s)
- Auto-selection algorithm: `combinedScore = (durationFit × 0.6) + (relevanceScore × 0.4)`
- RAG database tables: rag_documents, rag_sources, channel_sync_jobs, news_articles
- Background job queue with SQLite backend
- App uses MCP Client library (`mcp` Python package) to connect to scraping servers via stdio transport
- MCP server configuration stored in `config/mcp_servers.json` (provider commands, priorities)
- Provider fallback logic: try each provider in priority order, skip failures, try next
- Real-time progress UI shows scraping status: "Searching DVIDS...", "Downloading from NASA..."

**From UX Design Specification:**
- Channel Intelligence UI: Settings page for RAG configuration, channel connection, sync status
- Topic Suggestions component: Display 3-5 AI-generated topic ideas based on RAG analysis
- Quick Production Progress UI: Real-time status during pipeline execution
- Error handling for domain API failures with clear messages

### FR Coverage Map

**Epic 6 FR Coverage:**

| FR | Story | Status |
|----|-------|--------|
| FR-2.7.01-02 | 6.3 (YouTube Channel Sync) | ✅ Complete |
| FR-2.7.03 | 6.3 (Caption Scraping) | ✅ Complete |
| FR-2.7.04 | 6.3 (Competitor Sync) | ✅ Complete |
| FR-2.7.05-06 | 6.4 (News & Trends) | ✅ Complete |
| FR-2.7.07-08 | 6.1 (RAG Infrastructure) | ✅ Complete |
| FR-2.7.09 | 6.4 (Military Sources) | ✅ Complete |
| FR-2.7.10-11 | 6.5 (RAG Retrieval) | ✅ Complete |
| FR-2.7.12 | 6.6 (RAG Script Gen) | ✅ Complete |
| FR-2.7.13-14 | 6.7 (CI UI) | ✅ Complete |
| FR-2.9.QPF.01-08 | 6.8a/6.8b (QPF) | ✅ Complete |
| FR-2.9.01-08 | 6.9-6.11 (Web Scraping MCP Providers) | ⚠️ **DEFERRED** - See Future Work |

**Deferred Requirements (Feature 2.9 - Domain-Specific Content APIs):**
- FR-2.9.01-08 will be implemented in a future epic focused on MCP-based video provider servers (DVIDS, NASA, etc.)

## Epic List

---

## Epic 6: Channel Intelligence & Content Research (RAG-Powered)

**Goal:** Enable VidIQ-style intelligence by syncing with YouTube channels, analyzing competitors, monitoring trends, and generating scripts informed by the user's niche and content style using RAG (Retrieval-Augmented Generation).

**Features Included:**
- Feature 2.7: Channel Intelligence & Content Research (RAG-Powered)
- Feature 2.9: Automated Video Production Pipeline with Web Scraping MCP Servers

**User Value:** Creators get data-driven content recommendations based on real channel performance, competitor analysis, and trend data. The system learns the user's niche and style, enabling one-click video creation with authentic, domain-specific footage.

**Story Count:** 11 stories total
- ✅ **Implemented:** 8 stories (6.1-6.8b)
- ⚠️ **Deferred:** 3 stories (6.9-6.11) - MCP Web Scraping Servers (Future Epic)

**Dependencies:**
- Core Epics 1-5 (Complete ✅)
- RAG infrastructure dependencies (ChromaDB, sentence-transformers, youtube-transcript-api)

**Acceptance:**
- Users can sync their YouTube channel or declare a niche for new channels
- System ingests and indexes content from user's channel, competitors, and news sources
- RAG provides contextual topic suggestions and enhances script generation
- One-click video creation from topic suggestions using YouTube API for visual sourcing
- ⚠️ **Deferred:** Web scraping MCP servers (DVIDS, NASA) for domain-specific footage - planned for future epic

---

## Stories

### Story 6.9: MCP Video Provider Client Architecture

**Status:** ⚠️ **DEFERRED - Future Work**

**As a** developer,
**I want** an MCP client architecture for connecting to local video provider MCP servers,
**So that** the app can use our custom scraping MCP servers without implementing web scraping directly.

> **DEFERRATION NOTE (2025-12-03):** This story is part of Feature 2.9 (Domain-Specific Content APIs) and has been deferred to a future Epic. The current Epic 6 implementation (Stories 6.1-6.8b) uses YouTube API for visual sourcing. MCP-based web scraping servers (DVIDS, NASA) will be implemented in a separate epic focused on domain-specific content providers.

**Acceptance Criteria:**

- **Given** the project has the MCP client library installed
- **When** the VideoProviderClient architecture is implemented
- **Then** the system shall provide:
  - `VideoProviderClient` class for connecting to local MCP servers via stdio transport
  - Configuration schema in `config/mcp_servers.json` for provider commands and priorities
  - Provider registry pattern for managing multiple video sources
  - Interface methods: `search_videos(query, duration)`, `download_video(video_id)`, `get_video_details(video_id)`
  - Error handling for MCP-specific failures (connection errors, timeout, server unavailable)
- **And** the architecture shall support local MCP servers (DVIDS, NASA scrapers) that run as stdio processes
- **And** unit tests shall validate the client interface with mock MCP servers

**Requirements Fulfilled:** FR-2.9.03 (MCP server layer access), Additional Requirements (MCP client architecture)

---

### Story 6.10: DVIDS Web Scraping MCP Server

**Status:** ⚠️ **DEFERRED - Future Work**

**As a** content creator in the military niche,
**I want** an MCP server that scrapes military videos from DVIDS website,
**So that** I can use authentic DVIDS content in my videos without API keys.

> **DEFERRATION NOTE (2025-12-03):** This story is part of Feature 2.9 (Domain-Specific Content APIs) and has been deferred to a future Epic. DVIDS web scraping MCP server will be implemented alongside the MCP Video Provider Client in a separate epic focused on domain-specific content providers.

**As a** developer,
**I want** to build a DVIDS scraping MCP server that caches content locally,
**So that** we minimize requests to DVIDS and have offline access.

**Acceptance Criteria:**

**Part A: DVIDS Web Scraping Implementation**

- **Given** the MCP Video Provider Client architecture is implemented
- **When** the DVIDS scraping MCP server is built
- **Then** the system shall:
  - Implement `DVIDSScrapingMCPServer` class using the MCP Python SDK with stdio transport
  - Expose MCP tool: `search_videos(query, duration)` that searches DVIDS website and returns results
  - Expose MCP tool: `download_video(video_id)` that downloads video from DVIDS to local cache
  - Expose MCP tool: `get_video_details(video_id)` that retrieves video metadata from DVIDS
  - Scrape DVIDS website (dvidshub.net) using HTTP requests and HTML parsing
  - Extract video metadata: title, description, duration, format, resolution, download URL, public domain confirmation
  - Implement rate limiting (1 request per 30 seconds) to respect DVIDS server load
  - Detect HTTP 429/503 responses and implement exponential backoff: `base_backoff × 2^attempt` (capped at 60s)
  - NOT use DVIDS API or require API credentials (web scraping only)
  - Be runnable via: `python -m mcp_servers.dvids_scraping_server`
  - Log all scrape operations and errors for monitoring

**Part B: Video Caching**

- **Given** downloading from DVIDS on every request is inefficient
- **When** videos are downloaded
- **Then** the system shall:
  - Use the `VideoCache` class from `mcp_servers/cache.py` (created in Part E of this story)
  - Configure cache with provider-specific settings: provider_name="dvids", default_ttl=30 days
  - Call `cache.get(video_id, fetch_fn)` to automatically check cache before scraping
  - Call `cache.invalidate(video_id)` for manual cache invalidation when needed
  - Store DVIDS videos in `assets/cache/dvids/` subdirectory (handled automatically by cache module)
  - NOT duplicate caching logic - use the shared module

**Part C: Client Integration**

- **Given** the DVIDS scraping MCP server is implemented
- **When** the VideoProviderClient connects to the server
- **Then** the system shall:
  - Configure DVIDS scraping MCP server in `config/mcp_servers.json` as local stdio process
  - Support automatic visual selection using algorithm: `combinedScore = (durationFit × 0.6) + (relevanceScore × 0.4)`
  - Handle MCP server connection failures (server not running, startup errors)
  - Display progress during scraping: "Searching DVIDS...", "Downloading video..."
  - Display error message if DVIDS unavailable: "DVIDS scraping server unavailable"

**Part D: Testing**

- **And** unit tests shall validate web scraping logic with mocked HTML responses
- **And** unit tests shall validate rate limiting and backoff behavior
- **And** unit tests shall validate cache hit/miss logic
- **And** integration tests shall validate MCP tool calls with real DVIDS website (careful with rate limits)

**Part E: Shared Caching Module**

- **Given** both DVIDS and NASA scraping servers will need caching functionality
- **When** the shared caching module is created
- **Then** the system shall:
  - Implement `VideoCache` class in `mcp_servers/cache.py` as shared infrastructure
  - Provide methods: `get(video_id, fetch_fn)`, `is_cached(video_id)`, `invalidate(video_id)`
  - Store cache metadata in `assets/cache/metadata.json` (video_id, provider, cached_date, ttl, file_path)
  - Store video files in provider-specific subdirectories: `assets/cache/{provider}/{video_id}.{ext}`
  - Check cache before fetching: if cached and within TTL, return cached file
  - Implement TTL validation: re-fetch if cached item is older than `ttl` parameter
  - Support manual invalidation via `invalidate(video_id)` method
  - Provide cache statistics: `get_cache_size()`, `get_cache_count()`, `get_cache_age(video_id)`
  - Be usable by both DVIDS and NASA scraping servers with same interface
- **And** the caching module shall be tested independently with mock fetch functions
- **And** Story 6.11 shall use this shared module instead of duplicating caching logic

**Requirements Fulfilled:** FR-2.9.02 (Domain-specific content APIs - DVIDS via scraping), FR-2.9.04 (Rate limiting), FR-2.9.05 (Auto-selection), FR-2.9.08 (Extensible providers)

**Legal Note:** This server scrapes public DVIDS website content. Ensure compliance with DVIDS terms of service and robots.txt.

---

### Story 6.11: NASA Web Scraping MCP Server & Pipeline Integration

**Status:** ⚠️ **DEFERRED - Future Work**

**As a** content creator in any niche,
**I want** an MCP server that scrapes space videos from NASA website,
**So that** I can use authentic NASA content in my videos without API keys.

> **DEFERRATION NOTE (2025-12-03):** This story is part of Feature 2.9 (Domain-Specific Content APIs) and has been deferred to a future Epic. NASA web scraping MCP server will be implemented alongside the MCP Video Provider Client in a separate epic focused on domain-specific content providers.

**As a** developer,
**I want** to build a NASA scraping MCP server and integrate it into the video pipeline,
**So that** the video production system can use multiple scraping providers.

**Acceptance Criteria:**

**Part A: NASA Web Scraping Implementation**

- **Given** the DVIDS scraping MCP Server is implemented
- **When** the NASA scraping MCP server is built
- **Then** the system shall:
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

**Part B: Video Caching**

- **Given** the shared caching module was created in Story 6.10
- **When** the NASA scraping server caches videos
- **Then** the system shall:
  - Use the `VideoCache` class from `mcp_servers/cache.py` (shared with DVIDS server)
  - Configure cache with provider-specific settings: provider_name="nasa", default_ttl=30 days
  - Call `cache.get(video_id, fetch_fn)` to automatically check cache before scraping
  - Call `cache.invalidate(video_id)` for manual cache invalidation when needed
  - Store NASA videos in `assets/cache/nasa/` subdirectory (handled automatically by cache module)
  - NOT duplicate caching logic - reuse the shared module

**Part C: Pipeline Integration**

- **Given** both DVIDS and NASA scraping MCP servers are implemented
- **When** the Quick Production Flow is executed
- **Then** the system shall:
  - Update the Quick Production Flow (Stories 6.8a/6.8b) to use VideoProviderClient instead of direct YouTube search
  - Configure provider priority order in `config/mcp_servers.json` (e.g., DVIDS first for military niche, NASA as fallback)
  - Implement provider fallback logic: try each provider in priority order, skip failures, try next
  - Display real-time progress UI showing which provider is being queried: "Searching DVIDS...", "Searching NASA..."
  - Display progress during downloads: "Downloading video (45%)..."
  - Store provider usage logs for each video production job (provider used, search terms, results count, duration)
  - Support auto-selection algorithm: `combinedScore = (durationFit × 0.6) + (relevanceScore × 0.4)`
- **And** the provider registry shall support dynamic provider registration via config changes (no code changes required)

**Part D: Testing**

- **And** unit tests shall validate web scraping logic with mocked HTML responses
- **And** unit tests shall validate rate limiting and backoff behavior for both servers
- **And** unit tests shall validate cache hit/miss logic for both servers
- **And** integration tests shall validate MCP tool calls with real websites (careful with rate limits)
- **And** end-to-end tests shall validate complete Quick Production Flow with both providers

**Requirements Fulfilled:** FR-2.9.01 (Automated video production from RAG), FR-2.9.07 (Real-time progress UI), FR-2.9.08 (Extensible providers)

**Legal Note:** This server scrapes public NASA website content. NASA content is generally public domain 