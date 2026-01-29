# AI Video Generator - Development Epics

## Table of Contents

- [AI Video Generator - Development Epics](#table-of-contents)
  - [Epic 1: Conversational Topic Discovery](#epic-1-conversational-topic-discovery)
  - [Epic 2: Content Generation Pipeline](#epic-2-content-generation-pipeline)
  - [Epic 3: Visual Content Sourcing (YouTube API)](#epic-3-visual-content-sourcing-youtube-api)
  - [Epic 4: Visual Curation Interface](#epic-4-visual-curation-interface)
  - [Epic 5: Video Assembly & Output](#epic-5-video-assembly-output)
  - [Epic 6: Channel Intelligence & Content Research (RAG-Powered)](#epic-6-channel-intelligence-content-research-rag-powered)
  - [Epic 7: LLM Provider Enhancement (Groq Integration)](#epic-7-llm-provider-enhancement-groq-integration)
  - [Epic 8: DVIDS Video Provider API Integration](#epic-8-dvids-video-provider-api-integration)
  - [Epic 9: NASA Video Provider API Integration](#epic-9-nasa-video-provider-api-integration)
  - [Epic Summary](#epic-summary)
  - [Epic 6 Architecture Documentation](#epic-6-architecture-documentation)
  - [Future Epics](#future-epics)

---

## Epic 1: Conversational Topic Discovery

**File:** [epic-1-conversational-topic-discovery.md](./epic-1-conversational-topic-discovery.md)

**Status:** Complete
**Stories:** 8
**Phase:** Foundation

---

## Epic 2: Content Generation Pipeline

**File:** [epic-2-content-generation-pipeline.md](./epic-2-content-generation-pipeline.md)

**Status:** Complete
**Stories:** 6
**Phase:** Core

---

## Epic 3: Visual Content Sourcing (YouTube API)

**File:** [epic-3-visual-content-sourcing-youtube-api.md](./epic-3-visual-content-sourcing-youtube-api.md)

**Status:** Complete
**Stories:** 9
**Phase:** Core

---

## Epic 4: Visual Curation Interface

**File:** [epic-4-visual-curation-interface.md](./epic-4-visual-curation-interface.md)

**Status:** Complete
**Stories:** 6
**Phase:** Core

---

## Epic 5: Video Assembly & Output

**File:** [epic-5-video-assembly-output.md](./epic-5-video-assembly-output.md)

**Status:** Complete
**Stories:** 5
**Phase:** Delivery

---

## Epic 6: Channel Intelligence & Content Research (RAG-Powered)

**File:** [epic-6-channel-intelligence-content-research-rag-powered.md](./epic-6-channel-intelligence-content-research-rag-powered.md)

**Status:** Complete
**Stories:** 9
**Phase:** Enhancement

---

## Epic 7: LLM Provider Enhancement (Groq Integration)

**File:** [epic-7-llm-provider-enhancement-groq-integration.md](./epic-7-llm-provider-enhancement-groq-integration.md)

**Status:** Complete
**Stories:** 3
**Phase:** Enhancement

**Description:** Implements pluggable LLM provider architecture with Groq integration for ultra-fast inference. Adds provider selection UI and rate limiting.

---

## Epic 8: DVIDS Video Provider API Integration

**File:** [epic-8-dvids-api-integration.md](./epic-8-dvids-api-integration.md)

**Status:** Complete
**Stories:** 5
**Phase:** Enhancement

**Description:** Migrates DVIDS video provider from web scraping to official DVIDS Search API. Includes HLS video download with FFmpeg, video selection diversity, connection pooling, and cross-platform filename compatibility.

---

## Epic 9: NASA Video Provider API Integration

**File:** [epic-9-nasa-api-integration.md](./epic-9-nasa-api-integration.md)

**Status:** Planned
**Stories:** 5
**Phase:** Enhancement

**Description:** Migrates NASA video provider from Playwright web scraping to official NASA Image and Video Library API. Maximally reuses Epic 8 infrastructure (connection pooling, diversity tracking, filename handling) for 16-point implementation.

**Key Features:**
- NASA Search API Integration (30-second rate limiting)
- Direct MP4 video download (simpler than DVIDS - no FFmpeg required)
- Video selection diversity (reuses Epic 8 Story 8.3)
- Connection pooling (reuses Epic 8 Story 8.4)
- Cross-platform filename compatibility (reuses Epic 8 Story 8.5)

---

## Epic Summary

**File:** [epic-summary.md](./epic-summary.md)

Complete overview of all epics with story counts, dependencies, and development order.

---

## Epic 6 Architecture Documentation

**File:** [epic-6-architecture-documentation.md](./epic-6-architecture-documentation.md)

Technical architecture documentation for Epic 6 (RAG-Powered Channel Intelligence).

---

## Future Epics

**File:** [future-epics.md](./future-epics.md)

Planned future enhancements and domain-specific content providers.
