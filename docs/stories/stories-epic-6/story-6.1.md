# Story 6.1: RAG Infrastructure Setup

**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
**Story:** 6.1 - RAG Infrastructure Setup
**Status:** Done
**Created:** 2025-11-30

---

## Story Description

Set up ChromaDB, sentence-transformers, and youtube-transcript-api dependencies with database migrations to establish the foundation for RAG-powered content intelligence.

**User Value:** This foundational infrastructure enables the Channel Intelligence feature that will give creators VidIQ-style intelligence by syncing with their YouTube channel, analyzing competitors, and generating scripts informed by their niche and content style.

---

## Acceptance Criteria

### AC-6.1.1: ChromaDB Initialization
- **Given** the application starts with RAG_ENABLED=true in environment
- **When** the RAG system initializes
- **Then** ChromaDB successfully creates 3 collections:
  - `channel_content` - for YouTube video transcripts
  - `news_articles` - for news feed content
  - `trending_topics` - for trend data

### AC-6.1.2: Local Embeddings Service
- **Given** the embeddings service is invoked with text input
- **When** the service generates an embedding
- **Then** it produces a 384-dimensional vector using the all-MiniLM-L6-v2 model via Python bridge

### AC-6.1.3: Background Jobs Table
- **Given** database migration 013 runs
- **When** the migration completes
- **Then** the `background_jobs` table is created with:
  - id, type, status, priority, payload, result columns
  - progress, attempt, max_attempts columns
  - project_id, scheduled_for, started_at, completed_at columns
  - created_at, updated_at timestamps
  - Indexes on status, type, and scheduled_for columns

### AC-6.1.4: Cron Schedules Table
- **Given** database migration 013 runs
- **When** the migration completes
- **Then** the `cron_schedules` table is created with:
  - id, name, job_type, cron_expression columns
  - payload, enabled, last_run, next_run columns
  - created_at timestamp

### AC-6.1.5: RAG Health Check Endpoint
- **Given** the application is running with RAG infrastructure
- **When** GET /api/rag/health is called
- **Then** the response returns:
  - ChromaDB connection status (connected/disconnected)
  - Collection counts (channel_content, news_articles, trending_topics)
  - Embeddings service status
  - Overall health status

### AC-6.1.6: Python Dependencies Installation
- **Given** the Python environment setup script runs
- **When** dependencies are installed
- **Then** all packages install without conflicts:
  - chromadb>=0.5.0
  - sentence-transformers>=2.2.0
  - youtube-transcript-api>=0.6.0

---

## Tasks

### Task 1: Install Python Dependencies ✓
- [x] Create `requirements-rag.txt` with RAG-specific Python dependencies
- [x] Document Python 3.10+ requirement
- [x] Create setup script for virtual environment creation
- [x] Verify all dependencies install without conflicts

### Task 2: Create ChromaDB Client Wrapper ✓
- [x] Create `lib/rag/vector-db/chroma-client.ts`
- [x] Implement ChromaDB connection using chromadb JavaScript client
- [x] Create collection initialization for 3 collections
- [x] Implement ChromaDB persistence in `.cache/chroma` directory
- [x] Add connection error handling with graceful fallback
- [x] Add health check method

### Task 3: Create Embeddings Service ✓
- [x] Create `lib/rag/embeddings/local-embeddings.ts`
- [x] Implement Python subprocess bridge for sentence-transformers
- [x] Create `scripts/generate-embeddings.py` Python script
- [x] Handle model download on first run (cache in `.cache/models`)
- [x] Implement batch embedding support for efficiency
- [x] Add error handling for Python process failures

### Task 4: Database Migration 013 ✓
- [x] Create `lib/db/migrations/013_rag_infrastructure.ts`
- [x] Add `background_jobs` table with all required columns
- [x] Add `cron_schedules` table with all required columns
- [x] Add `channels` table for tracking synced channels
- [x] Add `channel_videos` table for video metadata and embeddings
- [x] Add `news_sources` table for configurable news feeds
- [x] Add `news_articles` table for fetched articles
- [x] Add projects table extensions (rag_enabled, rag_config, rag_last_sync, niche)
- [x] Add required indexes for performance

### Task 5: Environment Configuration ✓
- [x] Add RAG environment variables to `.env.local.example`:
  - `RAG_ENABLED=true|false`
  - `CHROMA_PATH=.cache/chroma`
  - `EMBEDDING_PROVIDER=local`
- [x] Document environment variables in README

### Task 6: Health Check API Endpoint ✓
- [x] Create `app/api/rag/health/route.ts`
- [x] Implement ChromaDB status check
- [x] Implement collection count retrieval
- [x] Implement embeddings service health check
- [x] Return comprehensive health status JSON

### Task 7: RAG System Initialization ✓
- [x] Create `lib/rag/init.ts` for system initialization
- [x] Implement graceful initialization on app startup
- [x] Handle missing Python dependencies gracefully
- [x] Log initialization status for debugging

### Task 8: Test Automation ✓
- [x] Create test factories (`tests/factories/rag-factories.ts`)
- [x] Create test fixtures (`tests/fixtures/rag-fixtures.ts`)
- [x] Unit tests for ChromaDB client (11 tests)
- [x] Unit tests for local embeddings service (13 tests)
- [x] Integration tests for RAG init (12 tests)
- [x] Integration tests for database migration (17 tests)
- [x] API tests for health endpoint (7 tests)
- [x] All 60 tests passing

---

## Technical Notes

### Architecture References
- **Tech Spec:** Epic 6 - Section "Detailed Design" - Services and Modules table
- **Architecture:** Section 19 - Feature 2.7 RAG Architecture
- **Architecture ADR-009:** ChromaDB for Vector Database
- **Architecture ADR-010:** all-MiniLM-L6-v2 for Local Embeddings

### Dependencies
- **New Python:** chromadb>=0.5.0, sentence-transformers>=2.2.0, youtube-transcript-api>=0.6.0
- **New Node.js:** chromadb@^1.8.1, node-cron@^3.0.3 (for Story 6.2)
- **Existing:** better-sqlite3@12.4.1 (for job queue persistence)

### Database Schema (Migration 013)

```sql
-- Background jobs table
CREATE TABLE background_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  payload TEXT,
  result TEXT,
  progress INTEGER DEFAULT 0,
  attempt INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  project_id TEXT,
  scheduled_for TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_jobs_status ON background_jobs(status);
CREATE INDEX idx_jobs_type ON background_jobs(type);
CREATE INDEX idx_jobs_scheduled ON background_jobs(scheduled_for);

-- Cron schedules table
CREATE TABLE cron_schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  payload TEXT,
  enabled BOOLEAN DEFAULT true,
  last_run TEXT,
  next_run TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Channels table
CREATE TABLE channels (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  subscriber_count INTEGER,
  video_count INTEGER,
  is_user_channel BOOLEAN DEFAULT false,
  is_competitor BOOLEAN DEFAULT false,
  niche TEXT,
  last_sync TEXT,
  sync_status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_channels_channel_id ON channels(channel_id);
CREATE INDEX idx_channels_niche ON channels(niche);

-- Channel videos table
CREATE TABLE channel_videos (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  video_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  published_at TEXT,
  duration_seconds INTEGER,
  view_count INTEGER,
  transcript TEXT,
  embedding_id TEXT,
  embedding_status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE
);

CREATE INDEX idx_channel_videos_channel ON channel_videos(channel_id);
CREATE INDEX idx_channel_videos_published ON channel_videos(published_at);

-- News sources table
CREATE TABLE news_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  niche TEXT NOT NULL,
  fetch_method TEXT DEFAULT 'rss',
  enabled BOOLEAN DEFAULT true,
  last_fetch TEXT,
  article_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- News articles table
CREATE TABLE news_articles (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT,
  url TEXT NOT NULL UNIQUE,
  published_at TEXT,
  niche TEXT,
  embedding_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES news_sources(id) ON DELETE CASCADE
);

CREATE INDEX idx_news_articles_source ON news_articles(source_id);
CREATE INDEX idx_news_articles_published ON news_articles(published_at);
CREATE INDEX idx_news_articles_niche ON news_articles(niche);

-- Projects table extensions
ALTER TABLE projects ADD COLUMN rag_enabled BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN rag_config TEXT;
ALTER TABLE projects ADD COLUMN rag_last_sync TEXT;
ALTER TABLE projects ADD COLUMN niche TEXT;
```

### Performance Targets
- Embedding generation: <500ms per video
- ChromaDB query: <100ms for top-10 retrieval
- Health check response: <200ms

### FOSS Compliance
- ChromaDB: Apache 2.0 License
- sentence-transformers: Apache 2.0 License
- youtube-transcript-api: MIT License
- all-MiniLM-L6-v2: Apache 2.0 License

---

## Definition of Done

- [x] All acceptance criteria pass
- [x] Database migration runs successfully
- [x] ChromaDB initializes with 3 collections
- [x] Embeddings service generates valid 384-dim vectors
- [x] Health check endpoint returns correct status
- [x] Python dependencies documented and installable
- [x] Unit tests written for core services (60 tests, all passing)
- [ ] Code reviewed and approved
- [x] No TypeScript/ESLint errors
- [x] Build passes successfully

### Test Coverage Summary

| Test File | Tests | Priority |
|-----------|-------|----------|
| `tests/unit/rag/chroma-client.test.ts` | 11 | P0-P2 |
| `tests/unit/rag/local-embeddings.test.ts` | 13 | P0-P2 |
| `tests/integration/rag/init.test.ts` | 12 | P0-P2 |
| `tests/integration/db/rag-migration.test.ts` | 17 | P0-P2 |
| `tests/api/rag/health.test.ts` | 7 | P0-P2 |
| **Total** | **60** | All passing |

**Run tests:** `npm run test -- tests/unit/rag tests/integration/rag tests/integration/db tests/api/rag`

---

## Story Points

**Estimate:** 8 points (Large)

**Justification:**
- New Python integration requiring subprocess bridge
- Database migration with multiple tables
- New service architecture (ChromaDB client, embeddings service)
- Cross-language complexity (TypeScript + Python)

---

## References

- PRD: Feature 2.7 - Channel Intelligence & Content Research (RAG-Powered)
- Epic File: docs/epics.md - Epic 6 Story 6.1
- Tech Spec: docs/sprint-artifacts/tech-spec-epic-6.md
- Architecture: docs/architecture.md - Section 19 (RAG Architecture)
