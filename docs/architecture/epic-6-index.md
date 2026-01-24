# Epic 6 Architecture Index

**Epic:** Channel Intelligence & Content Research (RAG-Powered + Quick Production Flow)
**Status:** ✅ Complete (Stories 6.1-6.8b)
**Date:** 2025-12-03

---

## Overview

Epic 6 implements a VidIQ-style intelligence system that syncs with YouTube channels, analyzes competitors, monitors trends, and generates scripts informed by the user's niche and style using RAG (Retrieval-Augmented Generation).

### Epic Scope

| Component | Status | Notes |
|-----------|--------|-------|
| RAG Infrastructure (Story 6.1) | ✅ Complete | ChromaDB, local embeddings |
| Background Job Queue (Story 6.2) | ✅ Complete | SQLite-backed, cron scheduler |
| YouTube Channel Sync (Story 6.3) | ✅ Complete | Caption scraping via youtube-transcript-api |
| News & Trends (Story 6.4) | ✅ Complete | RSS feeds, trend monitoring |
| RAG Retrieval (Story 6.5) | ✅ Complete | Semantic search, context building |
| RAG Script Generation (Story 6.6) | ✅ Complete | Context-augmented LLM generation |
| Channel Intelligence UI (Story 6.7) | ✅ Complete | Setup wizard, topic suggestions |
| QPF Infrastructure (Story 6.8a) | ✅ Complete | User preferences, pipeline status API |
| QPF UI Integration (Story 6.8b) | ✅ Complete | One-click video creation |
| **MCP Video Providers (Stories 6.9-6.11)** | ⚠️ **Deferred** | See Future Work section |

---

## Architecture Documents

### Core Architecture

| Document | Description | Link |
|----------|-------------|------|
| RAG Architecture | Channel Intelligence & RAG pipeline | [feature-27-channel-intelligence-rag-architecture.md](feature-27-channel-intelligence-rag-architecture.md) |
| Background Job Queue | Job processing, cron scheduling | [background-job-queue-architecture.md](background-job-queue-architecture.md) |
| Quick Production Flow | One-click video creation | [feature-27-channel-intelligence-rag-architecture.md](#quick-production-flow-architecture) |
| State Management | Zustand + SQLite hybrid | [state-management-architecture.md](state-management-architecture.md) |
| Cross-Epic Integration | Integration patterns between epics | [cross-epic-integration-architecture.md](cross-epic-integration-architecture.md) |
| Deployment | Local single-user deployment | [deployment-architecture.md](deployment-architecture.md) |

### Architecture Decision Records (ADRs)

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-009 | ChromaDB for Vector Database | ✅ Accepted |
| ADR-010 | all-MiniLM-L6-v2 for Local Embeddings | ✅ Accepted |
| ADR-011 | SQLite-Backed Job Queue | ✅ Accepted |
| ADR-012 | youtube-transcript-api for Caption Scraping | ✅ Accepted |
| ADR-013 | Playwright for MCP Video Provider Servers | ⚠️ Accepted (Revised 2026-01-24) |

---

## Technology Stack

### RAG Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Vector Database | ChromaDB (Apache 2.0) | Local embeddings storage |
| Embeddings | sentence-transformers | Local text embeddings (384-dim) |
| Model | all-MiniLM-L6-v2 | Embedding generation |
| Caption Scraping | youtube-transcript-api | YouTube transcript extraction |

### Background Processing

| Component | Technology | Purpose |
|-----------|------------|---------|
| Job Queue Backend | SQLite | Persistent job storage |
| Scheduler | node-cron | Cron-based job triggering |
| Concurrency Control | Custom processor | Max 2 concurrent jobs |

### Quick Production Flow

| Component | Technology | Purpose |
|-----------|------------|---------|
| User Preferences | SQLite (user_preferences table) | Store default voice/persona |
| Pipeline Orchestration | Reuses Automate Mode | One-click video creation |
| Progress Tracking | Real-time status API | Pipeline progress polling |

---

## Database Schema (Epic 6 Additions)

### New Tables

```sql
-- RAG Infrastructure (Migration 013)
channels                    -- Synced YouTube channels
channel_videos              -- Videos with embeddings
news_sources                -- RSS feed configurations
news_articles               -- Fetched articles with embeddings
background_jobs             -- Job queue storage
cron_schedules              -- Recurring job definitions

-- Quick Production Flow (Migration 015-016)
user_preferences            -- Default voice, persona, duration
```

### Table Extensions

```sql
-- Projects table (RAG configuration)
ALTER TABLE projects ADD COLUMN rag_enabled BOOLEAN;
ALTER TABLE projects ADD COLUMN rag_config TEXT;
ALTER TABLE projects ADD COLUMN rag_last_sync TEXT;
ALTER TABLE projects ADD COLUMN niche TEXT;
```

---

## API Endpoints (Epic 6)

### RAG Setup & Sync

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rag/setup` | POST | Initialize RAG configuration |
| `/api/rag/sync` | POST | Trigger manual sync |
| `/api/rag/status` | GET | Get RAG sync status |

### Background Jobs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/jobs` | GET | List jobs (with filters) |
| `/api/jobs/{id}` | GET | Get job status |
| `/api/jobs/{id}` | DELETE | Cancel pending job |

### Quick Production Flow

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects/quick-create` | POST | One-click project creation |
| `/api/user-preferences` | GET | Get user defaults |
| `/api/user-preferences` | PUT | Update user defaults |
| `/api/projects/{id}/pipeline-status` | GET | Get pipeline progress |
| `/api/rag/topic-suggestions` | GET | Get RAG topic suggestions |

---

## Component Locations

### Frontend Components

```
components/features/rag/
├── ChannelIntelligencePage.tsx     # Main CI page (Story 6.7)
├── TopicSuggestions.tsx             # Topic suggestions display (6.7)
├── TopicSuggestionCard.tsx          # Individual topic card (6.8b)
└── QuickProductionProgress.tsx      # Pipeline progress page (6.8b)

app/settings/
├── channel-intelligence/page.tsx    # CI setup wizard (6.7)
└── quick-production/page.tsx        # QPF settings (6.8a)
```

### Backend Modules

```
lib/rag/
├── vector-db/chroma-client.ts       # ChromaDB wrapper (6.1)
├── embeddings/local-embeddings.ts   # Embedding generation (6.1)
├── ingestion/youtube-captions.ts    # Caption scraping (6.3)
├── ingestion/news-sources.ts        # RSS feed parsing (6.4)
├── retrieval/semantic-search.ts     # RAG retrieval (6.5)
└── generation/rag-script-generator.ts # RAG-augmented scripts (6.6)

lib/jobs/
├── queue.ts                         # Job queue (6.2)
├── processor.ts                     # Job processor (6.2)
└── scheduler.ts                     # Cron scheduler (6.2)
```

---

## Configuration Files

### Environment Variables

```bash
# RAG Configuration
RAG_ENABLED=true
RAG_SYNC_SCHEDULE="0 6 * * *"        # Daily at 6 AM
CHROMA_PATH=.cache/chroma
EMBEDDING_PROVIDER=local              # local | gemini
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Background Jobs
JOB_CONCURRENCY=2
JOB_POLL_INTERVAL_MS=1000
JOB_DEFAULT_MAX_ATTEMPTS=3
```

### MCP Server Configuration (Future)

```json
// config/mcp_servers.json (Stories 6.9-6.11)
// Updated 2026-01-24: Playwright-based servers (not HTTP scraping)
{
  "providers": [
    {
      "name": "dvids",
      "command": "python",
      "args": ["-m", "mcp_servers.dvids_playwright_server"],
      "priority": 1,
      "rateLimitMs": 30000,
      "enabled": true,
      "browser": {
        "headless": true,
        "stealth": true,
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "viewport": { "width": 1920, "height": 1080 }
      }
    },
    {
      "name": "nasa",
      "command": "python",
      "args": ["-m", "mcp_servers.nasa_playwright_server"],
      "priority": 2,
      "rateLimitMs": 10000,
      "enabled": true,
      "browser": {
        "headless": true,
        "stealth": true
      }
    }
  ]
}
```

---

## Integration Points

### Epic 6 → Epic 2 (Script Generation)

RAG context injected into script generation prompts:
```typescript
// lib/rag/generation/rag-script-generator.ts
const ragContext = await retrieveRAGContext(topic, projectId);
const augmentedPrompt = buildRAGPrompt(topic, ragContext);
const script = await llm.generate(augmentedPrompt);
```

### Epic 6 → Epic 5 (Video Assembly)

Quick Production Flow triggers automated pipeline:
```typescript
// One-click video creation from topic suggestion
const project = await quickCreateProject(topic, ragContext);
await triggerAutomatedPipeline(project.id);
```

---

## Future Work (Deferred Stories)

### Stories 6.9-6.11: MCP Video Provider Architecture

**Status:** ⚠️ Deferred to future epic (with technology pivot 2026-01-24)

These stories implement Playwright-based web scraping MCP servers for domain-specific video content:

| Story | Description | Domain |
|-------|-------------|--------|
| 6.9 | MCP Video Provider Client Architecture | Client infrastructure |
| 6.10 | DVIDS Playwright MCP Server | Military videos |
| 6.11 | NASA Playwright MCP Server | Space videos |

**Technology Pivot (2026-01-24):**
HTTP scraping (`httpx` + `BeautifulSoup`) failed on DVIDS because the website uses JavaScript rendering. Now using **Playwright headless browser automation** instead.

**Rationale for Deferral:**
- Epic 6 focus: RAG infrastructure and Quick Production Flow
- YouTube API provides sufficient visual sourcing for MVP
- MCP servers add complexity that can be addressed in a dedicated epic
- Allows for proper architectural planning for extensible provider system

**See Also:**
- [ADR-013: Playwright for MCP Video Provider Servers](architecture-decision-records.md#adr-013-playwright-headless-browser-for-mcp-video-provider-servers)
- [_bmad-output/planning-artifacts/epics.md](../../_bmad-output/planning-artifacts/epics.md) (Stories 6.9-6.11)

---

## Validation & Testing

### Test Coverage (Epic 6)

| Story | Unit Tests | Integration Tests | E2E Tests |
|-------|------------|-------------------|-----------|
| 6.1 RAG Infrastructure | ✅ | ✅ | - |
| 6.2 Background Jobs | ✅ | ✅ | - |
| 6.3 YouTube Sync | ✅ | ✅ | - |
| 6.4 News & Trends | ✅ | ✅ | - |
| 6.5 RAG Retrieval | ✅ | ✅ | - |
| 6.6 RAG Scripts | ✅ | ✅ | - |
| 6.7 CI UI | - | - | ✅ |
| 6.8a QPF Infra | ✅ | ✅ | - |
| 6.8b QPF UI | ✅ | - | ✅ |

### Critical Test Scenarios

1. **RAG Context Assembly:** Verify all 4 collections queried correctly
2. **Job Retry Logic:** Exponential backoff (2s, 4s, 8s)
3. **Channel Sync Recovery:** Resume from last successful video
4. **QPF Defaults Validation:** Redirect to settings if no defaults configured
5. **Pipeline Progress Updates:** Real-time status during automated production

---

## References

| Document | Location |
|----------|----------|
| Epic 6 Tech Spec | [docs/sprint-artifacts/tech-spec-epic-6.md](../../sprint-artifacts/tech-spec-epic-6.md) |
| Epic 6 Stories | [docs/stories/stories-epic-6/](../../stories/stories-epic-6/) |
| Sprint Status | [docs/sprint-artifacts/sprint-status.yaml](../../sprint-artifacts/sprint-status.yaml) |
| PRD | [docs/prd.md](../../prd.md) |

---

**Last Updated:** 2026-01-24 (Playwright pivot)
**Next Review:** Upon completion of Stories 6.9-6.11 (Future Epic)
