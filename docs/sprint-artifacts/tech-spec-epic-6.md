# Epic Technical Specification: Channel Intelligence & Content Research (RAG-Powered)

Date: 2025-11-30
Author: master
Epic ID: 6
Status: Draft

---

## Overview

Epic 6 implements a VidIQ-style intelligence system that syncs with YouTube channels, analyzes competitors, monitors trends, and generates scripts informed by the user's niche and content style. Using Retrieval-Augmented Generation (RAG), the system provides the LLM with full context from channel content, competitor videos, trending topics, and news sources when generating scripts.

This epic transforms the AI Video Generator from a generic script generator into a channel-aware content creation assistant that understands the creator's established style, monitors their competitive landscape, and incorporates real-time news and trends into content suggestions.

**PRD Reference:** Feature 2.7 - Channel Intelligence & Content Research (RAG-Powered)

## Objectives and Scope

### In Scope

- **RAG Infrastructure:** ChromaDB vector database with 3 collections (channels, news, trends)
- **Local Embeddings:** sentence-transformers with all-MiniLM-L6-v2 (384-dimensional vectors)
- **Background Job Queue:** SQLite-backed job queue with cron scheduling for daily sync operations
- **YouTube Channel Sync:** Auto-caption scraping via youtube-transcript-api (Python)
- **News Source Ingestion:** RSS feed parsing for 7 pre-configured military news sources
- **RAG Retrieval:** Semantic similarity search with metadata filtering
- **RAG-Augmented Script Generation:** Context injection into existing script generation pipeline
- **Channel Intelligence UI:** Setup wizard with two modes (Established Channel vs Cold Start)
- **Competitor Tracking:** Index up to 5 competitor channels per project
- **Trend Monitoring:** YouTube trends detection in user's niche

### Out of Scope

- Real-time WebSocket notifications for sync status
- Advanced analytics dashboard (view counts, engagement metrics over time)
- Multi-language support for captions and news
- Cloud-based vector database (ChromaDB local only for MVP)
- Custom embedding model training
- Full transcript editing UI
- Integration with external project management tools

## System Architecture Alignment

### Components Referenced

| Component | Integration Point | Purpose |
|-----------|------------------|---------|
| **ChromaDB** | Vector Database | Store embeddings for channels, news, trends |
| **sentence-transformers** | Embedding Generation | Generate 384-dim vectors locally (FOSS) |
| **youtube-transcript-api** | Caption Scraping | Extract video transcripts from YouTube |
| **node-cron** | Job Scheduling | Schedule daily sync operations |
| **SQLite** | Job Queue Backend | Persist background jobs and cron schedules |
| **LLM Provider** | Script Generation | Ollama/Gemini for RAG-augmented generation |

### Architecture Constraints

1. **FOSS-First:** All core components must be open-source (ChromaDB, sentence-transformers, youtube-transcript-api)
2. **Local Processing:** Embeddings generated locally using Python bridge
3. **Python Integration:** youtube-transcript-api and sentence-transformers require Python subprocess calls
4. **No New Cloud Dependencies:** Reuses existing YouTube Data API v3 (already configured)
5. **Graceful Degradation:** System functions without RAG if ChromaDB unavailable

---

## Detailed Design

### Services and Modules

| Module | Responsibility | Inputs | Outputs | Owner |
|--------|---------------|--------|---------|-------|
| `lib/rag/vector-db/chroma-client.ts` | ChromaDB connection and collection management | Embeddings, metadata | Query results | Story 6.1 |
| `lib/rag/embeddings/local-embeddings.ts` | Generate embeddings via Python bridge | Text strings | 384-dim vectors | Story 6.1 |
| `lib/jobs/queue.ts` | Job queue CRUD operations | Job payloads | Job IDs, status | Story 6.2 |
| `lib/jobs/processor.ts` | Job execution with concurrency control | Queued jobs | Completed jobs | Story 6.2 |
| `lib/jobs/scheduler.ts` | Cron-based job scheduling | Cron expressions | Scheduled jobs | Story 6.2 |
| `lib/rag/ingestion/youtube-captions.ts` | Scrape YouTube video transcripts | Video IDs | Transcript objects | Story 6.3 |
| `lib/rag/ingestion/news-sources.ts` | Fetch news from RSS feeds | Source configs | News articles | Story 6.4 |
| `lib/rag/retrieval/semantic-search.ts` | Query vector DB with filters | Query embedding, filters | Relevant documents | Story 6.5 |
| `lib/rag/generation/rag-script-generator.ts` | Build RAG context and augment prompts | Topic, project ID | Augmented script | Story 6.6 |
| `app/settings/channel-intelligence/page.tsx` | Channel Intelligence UI | User input | RAG configuration | Story 6.7 |

### Data Models and Contracts

#### New Database Tables (Migration 013)

```sql
-- Channels table (tracks synced YouTube channels)
CREATE TABLE channels (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL UNIQUE,  -- YouTube channel ID
  name TEXT NOT NULL,
  description TEXT,
  subscriber_count INTEGER,
  video_count INTEGER,
  is_user_channel BOOLEAN DEFAULT false,
  is_competitor BOOLEAN DEFAULT false,
  niche TEXT,
  last_sync TEXT,
  sync_status TEXT DEFAULT 'pending',  -- pending, syncing, synced, error
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_channels_channel_id ON channels(channel_id);
CREATE INDEX idx_channels_niche ON channels(niche);

-- Channel videos table (tracks individual videos and their embeddings)
CREATE TABLE channel_videos (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,           -- FK to channels.channel_id
  video_id TEXT NOT NULL UNIQUE,      -- YouTube video ID
  title TEXT NOT NULL,
  description TEXT,
  published_at TEXT,
  duration_seconds INTEGER,
  view_count INTEGER,
  transcript TEXT,                    -- Full transcript text
  embedding_id TEXT,                  -- ChromaDB document ID
  embedding_status TEXT DEFAULT 'pending',  -- pending, processing, embedded, error
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE
);

CREATE INDEX idx_channel_videos_channel ON channel_videos(channel_id);
CREATE INDEX idx_channel_videos_published ON channel_videos(published_at);

-- News sources table (configurable news feeds)
CREATE TABLE news_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  niche TEXT NOT NULL,
  fetch_method TEXT DEFAULT 'rss',    -- rss, scrape
  enabled BOOLEAN DEFAULT true,
  last_fetch TEXT,
  article_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- News articles table (fetched articles with embeddings)
CREATE TABLE news_articles (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT,
  url TEXT NOT NULL UNIQUE,
  published_at TEXT,
  niche TEXT,
  embedding_id TEXT,                  -- ChromaDB document ID
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES news_sources(id) ON DELETE CASCADE
);

CREATE INDEX idx_news_articles_source ON news_articles(source_id);
CREATE INDEX idx_news_articles_published ON news_articles(published_at);
CREATE INDEX idx_news_articles_niche ON news_articles(niche);

-- Background jobs table
CREATE TABLE background_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                 -- rag_sync_channel, rag_sync_news, embedding_gen
  status TEXT DEFAULT 'pending',      -- pending, running, completed, failed, cancelled
  priority INTEGER DEFAULT 5,         -- 1 (highest) to 10 (lowest)
  payload TEXT,                       -- JSON job-specific data
  result TEXT,                        -- JSON result or error
  progress INTEGER DEFAULT 0,         -- 0-100
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
  cron_expression TEXT NOT NULL,      -- e.g., "0 6 * * *"
  payload TEXT,
  enabled BOOLEAN DEFAULT true,
  last_run TEXT,
  next_run TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Projects table extension
ALTER TABLE projects ADD COLUMN rag_enabled BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN rag_config TEXT;            -- JSON RAG configuration
ALTER TABLE projects ADD COLUMN rag_last_sync TEXT;
ALTER TABLE projects ADD COLUMN niche TEXT;
```

#### TypeScript Interfaces

```typescript
// lib/rag/types.ts
export interface RAGConfig {
  mode: 'established' | 'cold_start';
  userChannelId?: string;           // For established mode
  competitorChannels: string[];     // Up to 5
  niche: string;
  newsEnabled: boolean;
  trendsEnabled: boolean;
  syncFrequency: 'daily' | 'weekly';
}

export interface RAGContext {
  channelContent: RetrievedDocument[];
  competitorContent: RetrievedDocument[];
  newsArticles: RetrievedDocument[];
  trendingTopics: RetrievedDocument[];
}

export interface RetrievedDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
}

export interface VideoTranscript {
  videoId: string;
  channelId: string;
  title: string;
  description: string;
  transcript: TranscriptSegment[];
  fullText: string;
  publishedAt: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface NewsArticle {
  id: string;
  sourceId: string;
  headline: string;
  summary: string;
  url: string;
  publishedAt: string;
  niche: string;
}

// lib/jobs/types.ts
export type JobType =
  | 'rag_sync_channel'
  | 'rag_sync_news'
  | 'rag_sync_trends'
  | 'embedding_generation'
  | 'cache_cleanup';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: number;
  payload: any;
  result?: any;
  progress: number;
  attempt: number;
  maxAttempts: number;
  projectId?: string;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
}
```

### APIs and Interfaces

#### RAG Setup API

```typescript
// POST /api/rag/setup
// Initialize RAG configuration for a project
Request: {
  projectId: string;
  mode: 'established' | 'cold_start';
  config: {
    userChannelId?: string;          // Required for established mode
    competitorChannels?: string[];   // Optional, up to 5
    niche: string;                   // Required for cold_start
    newsEnabled: boolean;
    trendsEnabled: boolean;
  }
}
Response: {
  success: boolean;
  jobIds: string[];                  // Background job IDs for initial sync
}
```

#### RAG Sync API

```typescript
// POST /api/rag/sync
// Trigger manual sync for a project
Request: {
  projectId: string;
  syncType?: 'channel' | 'news' | 'trends' | 'all';
}
Response: {
  success: boolean;
  jobId: string;
}
```

#### RAG Status API

```typescript
// GET /api/rag/status?projectId={id}
// Get RAG sync status and stats
Response: {
  success: boolean;
  data: {
    ragEnabled: boolean;
    ragConfig: RAGConfig;
    lastSync: string;
    stats: {
      videosIndexed: number;
      newsArticles: number;
      pendingJobs: number;
    }
  }
}
```

#### Jobs API

```typescript
// GET /api/jobs?projectId={id}
// List jobs for a project
Response: {
  success: boolean;
  jobs: Job[];
}

// GET /api/jobs/{id}
// Get single job status
Response: {
  success: boolean;
  job: Job;
}

// DELETE /api/jobs/{id}
// Cancel a pending job
Response: {
  success: boolean;
}
```

### Workflows and Sequencing

#### RAG Setup Flow (Established Channel)

```
1. User enters Channel Intelligence settings
2. User selects "Established Channel" mode
3. User enters their YouTube channel URL
4. System validates channel via YouTube Data API
5. System creates RAG config in projects table
6. System enqueues rag_sync_channel job for user channel
7. User optionally adds up to 5 competitor channels
8. System enqueues rag_sync_channel jobs for competitors
9. System schedules daily cron job for incremental sync
10. Background processor executes sync jobs:
    a. Fetch video list via YouTube Data API
    b. Scrape transcripts via youtube-transcript-api
    c. Generate embeddings via sentence-transformers
    d. Store in ChromaDB channels collection
11. System updates sync status and last_sync timestamp
```

#### RAG Setup Flow (Cold Start)

```
1. User enters Channel Intelligence settings
2. User selects "Cold Start" mode
3. User selects niche from dropdown (military, gaming, tech, etc.)
4. System searches YouTube for top 5 channels in niche
5. User confirms or modifies channel selection
6. System creates RAG config in projects table
7. System enqueues rag_sync_channel jobs for all 5 channels
8. System loads niche-specific news sources (e.g., military news)
9. System enqueues rag_sync_news job
10. System schedules daily cron jobs
11. Background processor executes all sync jobs
```

#### RAG-Augmented Script Generation Flow

```
1. User triggers script generation (Epic 2 Story 2.4)
2. System checks if project has rag_enabled = true
3. If RAG enabled:
   a. Generate query embedding from topic
   b. Query ChromaDB for relevant channel content (top 5)
   c. Query ChromaDB for competitor content (top 5)
   d. Query ChromaDB for recent news (last 7 days, top 5)
   e. Query ChromaDB for trending topics (top 3)
4. Build RAGContext object
5. Inject context into script generation prompt
6. Call LLM with augmented prompt
7. Parse and return structured script
```

---

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Embedding generation | <500ms per video | Python subprocess timing |
| ChromaDB query | <100ms for top-10 retrieval | Query profiling |
| RAG context assembly | <3s total | End-to-end timing |
| Channel sync (50 videos) | <5 minutes | Job completion time |
| News fetch (all sources) | <2 minutes | Job completion time |
| Concurrent job limit | 2 jobs max | Processor configuration |

**PRD Reference:** SC-7 (Visual sourcing <60s per scene), applied to RAG retrieval

### Security

| Requirement | Implementation |
|-------------|----------------|
| API Key Protection | YouTube API key stored in .env.local, never exposed to client |
| No PII Storage | Transcripts stored locally, no user data sent to external services |
| Rate Limiting | youtube-transcript-api: 2 req/s; YouTube API: existing quota limits |
| Job Isolation | Each job runs in isolated context, errors don't affect other jobs |
| Input Validation | All user inputs (channel URLs, niche) validated before processing |

### Reliability/Availability

| Requirement | Implementation |
|-------------|----------------|
| Job Retry Logic | Exponential backoff: 2s, 4s, 8s; max 3 attempts |
| Graceful Degradation | Script generation works without RAG if ChromaDB unavailable |
| Partial Sync Recovery | Sync jobs track progress; resume from last successful video |
| Stale Data Handling | News articles older than 7 days auto-pruned |
| ChromaDB Persistence | Data stored in .cache/chroma directory |

### Observability

| Signal | Type | Purpose |
|--------|------|---------|
| `rag.sync.started` | Event | Track sync job initiation |
| `rag.sync.completed` | Event | Track successful sync |
| `rag.sync.failed` | Event | Track sync failures with error details |
| `rag.query.latency` | Metric | Monitor retrieval performance |
| `rag.embedding.latency` | Metric | Monitor embedding generation time |
| `jobs.queue.depth` | Metric | Monitor pending job count |
| `jobs.processing.time` | Metric | Monitor job execution duration |

---

## Dependencies and Integrations

### New Python Dependencies

```bash
# requirements.txt additions
youtube-transcript-api>=0.6.0    # Caption scraping
sentence-transformers>=2.2.0      # Local embeddings
chromadb>=0.5.0                   # Vector database
```

### New Node.js Dependencies

```json
{
  "node-cron": "^3.0.3",          // Cron scheduling
  "rss-parser": "^3.13.0",        // RSS feed parsing
  "chromadb": "^1.8.1"            // ChromaDB JavaScript client
}
```

### Existing Dependencies (Reused)

| Dependency | Version | Usage |
|------------|---------|-------|
| `googleapis` | 166.0.0 | YouTube Data API v3 |
| `ollama` | 0.6.2 | LLM for RAG-augmented generation |
| `@google/generative-ai` | 0.24.1 | Optional Gemini embeddings |
| `better-sqlite3` | 12.4.1 | Job queue persistence |

### Integration Points

| System | Integration | Data Flow |
|--------|-------------|-----------|
| YouTube Data API v3 | Channel/video metadata | Inbound |
| youtube-transcript-api | Video captions | Inbound |
| ChromaDB | Vector storage | Bidirectional |
| sentence-transformers | Embedding generation | Local processing |
| Existing LLM Provider | RAG-augmented generation | Outbound |
| Existing Script Generation | Context injection | Internal |

---

## Acceptance Criteria (Authoritative)

### Story 6.1: RAG Infrastructure Setup
- **AC-6.1.1:** ChromaDB initializes successfully with 3 collections (channel_content, news_articles, trending_topics)
- **AC-6.1.2:** Embeddings service generates 384-dimensional vectors using all-MiniLM-L6-v2
- **AC-6.1.3:** background_jobs table created with status, priority, retry logic columns
- **AC-6.1.4:** cron_schedules table created for recurring job definitions
- **AC-6.1.5:** Health check endpoint returns ChromaDB connection status and collection counts
- **AC-6.1.6:** All Python dependencies install without conflicts

### Story 6.2: Background Job Queue & Cron Scheduler
- **AC-6.2.1:** Jobs persist in SQLite and survive application restarts
- **AC-6.2.2:** Failed jobs retry up to 3 times with exponential backoff (2s, 4s, 8s)
- **AC-6.2.3:** Concurrent job limit of 2 prevents resource exhaustion
- **AC-6.2.4:** Cron scheduler triggers jobs at configured times
- **AC-6.2.5:** Job status API returns pending, running, completed, failed jobs
- **AC-6.2.6:** Progress updates visible via API during long-running jobs
- **AC-6.2.7:** Cancelling a pending job sets status to 'cancelled'

### Story 6.3: YouTube Channel Sync & Caption Scraping
- **AC-6.3.1:** Given a YouTube channel ID, system fetches up to 50 most recent video transcripts
- **AC-6.3.2:** Transcripts scraped via youtube-transcript-api Python library
- **AC-6.3.3:** Each transcript embedded and stored in ChromaDB with channelId, videoId, title, publishedAt metadata
- **AC-6.3.4:** Rate limiting prevents API abuse (max 2 requests/second for caption scraping)
- **AC-6.3.5:** Incremental sync only processes videos published after last sync
- **AC-6.3.6:** Videos without captions logged but don't fail the sync
- **AC-6.3.7:** Channel sync completes within 5 minutes for 50 videos

### Story 6.4: News Source Ingestion & Trend Monitoring
- **AC-6.4.1:** 7 military news sources pre-configured (The War Zone, Military.com, Defense News, etc.)
- **AC-6.4.2:** RSS feeds parsed successfully for headline, summary, URL
- **AC-6.4.3:** News articles embedded and stored with niche and source metadata
- **AC-6.4.4:** Deduplication prevents duplicate embeddings (check by URL)
- **AC-6.4.5:** News older than 7 days automatically pruned from vector store
- **AC-6.4.6:** News fetch job runs every 4 hours via cron scheduler
- **AC-6.4.7:** Each source fetch isolated (one failure doesn't stop others)
- **AC-6.4.8:** News fetch completes within 2 minutes for all sources

### Story 6.5: RAG Retrieval & Context Building
- **AC-6.5.1:** Semantic search returns top 5 most relevant documents per collection
- **AC-6.5.2:** Metadata filters correctly narrow results (niche, channelId, date range)
- **AC-6.5.3:** RAGContext assembled with content from all 4 categories
- **AC-6.5.4:** Context truncation prevents exceeding LLM token limits (<4000 tokens)
- **AC-6.5.5:** Empty collections return empty arrays (don't fail)
- **AC-6.5.6:** Retrieval completes within 500ms for typical queries

### Story 6.6: RAG-Augmented Script Generation
- **AC-6.6.1:** Script generation endpoint accepts optional rag_enabled parameter
- **AC-6.6.2:** When enabled, RAG context retrieved and injected into prompt
- **AC-6.6.3:** Generated scripts reference channel style (if established channel mode)
- **AC-6.6.4:** Generated scripts incorporate recent news angles when relevant
- **AC-6.6.5:** RAG context displayed to user during generation ("Using context from 5 videos, 3 news articles...")
- **AC-6.6.6:** Non-RAG generation still works (backwards compatible)
- **AC-6.6.7:** RAG-augmented generation adds <3 seconds to total generation time

### Story 6.7: Channel Intelligence UI & Setup Wizard
- **AC-6.7.1:** Setup wizard guides user through mode selection (Established vs Cold Start)
- **AC-6.7.2:** Established Channel mode: user enters channel URL, system validates and starts sync
- **AC-6.7.3:** Cold Start mode: user selects niche, system suggests top 5 channels
- **AC-6.7.4:** Competitor management allows adding/removing up to 5 channels
- **AC-6.7.5:** Sync status shows: "Last synced: 2 hours ago | 47 videos indexed | 23 news articles"
- **AC-6.7.6:** Manual sync button triggers immediate rag_sync_channel job
- **AC-6.7.7:** RAG health shows ChromaDB connection status and collection sizes
- **AC-6.7.8:** Topic suggestions display 3-5 AI-generated topic ideas based on RAG analysis

---

## Traceability Mapping

| AC ID | Spec Section | Component/API | Test Idea |
|-------|--------------|---------------|-----------|
| AC-6.1.1 | Data Models | ChromaDB client | Integration test: verify 3 collections created |
| AC-6.1.2 | Embeddings | local-embeddings.ts | Unit test: verify 384-dim output |
| AC-6.2.1 | Job Queue | queue.ts | Integration test: restart app, verify jobs persist |
| AC-6.2.2 | Job Queue | processor.ts | Unit test: mock failure, verify retry timing |
| AC-6.3.1 | Ingestion | youtube-captions.ts | Integration test: scrape known channel |
| AC-6.3.4 | Ingestion | youtube-captions.ts | Unit test: verify 500ms delay between requests |
| AC-6.4.1 | Ingestion | news-sources.ts | Unit test: verify MILITARY_NEWS_SOURCES array |
| AC-6.5.1 | Retrieval | semantic-search.ts | Integration test: query known documents |
| AC-6.5.4 | Retrieval | rag-script-generator.ts | Unit test: verify token count <4000 |
| AC-6.6.1 | Generation | /api/projects/[id]/generate-script | API test: with rag_enabled param |
| AC-6.6.6 | Generation | /api/projects/[id]/generate-script | API test: without RAG, verify works |
| AC-6.7.1 | UI | channel-intelligence/page.tsx | E2E test: complete setup wizard |
| AC-6.7.5 | UI | channel-intelligence/page.tsx | E2E test: verify sync status display |

---

## Risks, Assumptions, Open Questions

### Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R1 | youtube-transcript-api rate limiting by YouTube | Medium | High | Implement conservative rate limiting (2 req/s), retry with exponential backoff |
| R2 | ChromaDB performance degrades with large collections | Low | Medium | Implement pagination, limit to 1000 videos per channel |
| R3 | Python subprocess overhead for embeddings | Medium | Low | Batch embeddings, cache model in long-running Python process |
| R4 | RSS feeds change structure or become unavailable | Medium | Low | Graceful failure per source, fallback to empty results |
| R5 | Users enter invalid YouTube channel URLs | High | Low | Validate via YouTube Data API before proceeding |

### Assumptions

| ID | Assumption | Validation Method |
|----|------------|-------------------|
| A1 | Python 3.10+ is available on user's system | Check during setup, provide installation instructions |
| A2 | Users have sufficient disk space for ChromaDB (~500MB per 1000 videos) | Display disk usage in UI |
| A3 | YouTube auto-captions are available for most videos | Handle missing captions gracefully |
| A4 | sentence-transformers model downloads successfully on first run | Cache model in .cache directory |
| A5 | Military niche is representative; other niches follow same pattern | Implement generic niche system |

### Open Questions

| ID | Question | Owner | Due Date |
|----|----------|-------|----------|
| Q1 | Should we support Gemini embeddings as optional cloud alternative? | Architect | Before Story 6.1 |
| Q2 | What is the optimal number of videos to index per channel (50 vs 100)? | PM | Before Story 6.3 |
| Q3 | Should news sources be user-configurable or only preset by niche? | PM | Before Story 6.4 |
| Q4 | How should we handle channels with 1000+ videos (pagination strategy)? | Dev | Before Story 6.3 |

---

## Test Strategy Summary

### Test Levels

| Level | Framework | Coverage |
|-------|-----------|----------|
| Unit Tests | Vitest | All services, utilities, data transformations |
| Integration Tests | Vitest + SQLite | Database operations, ChromaDB interactions |
| API Tests | Vitest + supertest | All new API endpoints |
| E2E Tests | Playwright (future) | Channel Intelligence UI setup wizard |

### Critical Test Scenarios

1. **RAG Infrastructure:** Verify ChromaDB initializes with correct collections and embeddings generate correctly
2. **Job Queue Reliability:** Test job persistence across restarts, retry logic, concurrent limits
3. **Caption Scraping:** Test with real YouTube channel, verify transcript extraction and embedding
4. **News Ingestion:** Test RSS parsing, deduplication, 7-day pruning
5. **RAG Retrieval:** Test semantic search accuracy with known documents
6. **Script Generation:** Compare output with/without RAG context, verify context injection
7. **UI Wizard:** E2E test complete setup flow for both modes

### Edge Cases

- Channel with no videos
- Videos with no auto-captions
- RSS feed returns 0 articles
- ChromaDB connection failure during generation
- Job queue at max concurrency
- Network timeout during sync
- Invalid YouTube channel URL format
