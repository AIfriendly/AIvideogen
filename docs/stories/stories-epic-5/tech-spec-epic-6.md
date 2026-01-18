# Epic Technical Specification: Channel Intelligence & Content Research (RAG-Powered)

Date: 2025-12-03
Author: master
Epic ID: 6
Status: Draft
Version: 1.2

**Recent Changes (v1.2 - 2025-12-03):**
- Split Story 6.8 into 6.8a (Infrastructure) and 6.8b (UI & Integration)
- Story 6.8a: user_preferences table, settings page, pipeline-status API
- Story 6.8b: TopicSuggestionCard, quick-create API, QuickProductionProgress
- Updated traceability matrix with split story ACs

**Previous Changes (v1.1 - 2025-12-03):**
- Added Quick Production Flow (One-Click Video Creation)
- Added user_preferences database schema for default voice/persona
- Added API endpoints: /api/projects/quick-create, /api/user-preferences
- Added UI components: TopicSuggestionCard, QuickProductionProgress
- Added FRs and ACs for QPF
- Completed traceability matrix for all acceptance criteria
- Aligned with PRD v3.3 (2025-12-03) Quick Production Flow addition

---

## Overview

Epic 6 implements a VidIQ-style intelligence system that syncs with YouTube channels, analyzes competitors, monitors trends, and generates scripts informed by the user's niche and content style. Using Retrieval-Augmented Generation (RAG), the system provides the LLM with full context from channel content, competitor videos, trending topics, and news sources when generating scripts.

This epic transforms the AI Video Generator from a generic script generator into a channel-aware content creation assistant that understands the creator's established style, monitors their competitive landscape, and incorporates real-time news and trends into content suggestions.

**PRD Reference:** Feature 2.7 - Channel Intelligence & Content Research (RAG-Powered), including Quick Production Flow (PRD v3.3)

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
- **Quick Production Flow:** One-click video creation from RAG topic suggestions with user default preferences

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
| `app/api/user-preferences/route.ts` | User preferences CRUD | Preference data | Stored preferences | Story 6.8a |
| `app/settings/quick-production/page.tsx` | QPF settings page | User input | Default voice/persona config | Story 6.8a |
| `app/api/projects/[id]/pipeline-status/route.ts` | Pipeline status API | Project ID | Stage, progress, message | Story 6.8a |
| `lib/rag/quick-production/orchestrator.ts` | Quick Production Flow pipeline orchestration | Topic, defaults | Project ID, pipeline status | Story 6.8b |
| `app/api/projects/quick-create/route.ts` | Quick create API endpoint | Topic, RAG context | Project + pipeline trigger | Story 6.8b |
| `components/features/rag/TopicSuggestionCard.tsx` | Topic card with "Create Video" button | Topic data | User action | Story 6.8b |
| `components/features/rag/QuickProductionProgress.tsx` | Pipeline progress display | Project ID | Real-time status | Story 6.8b |

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

-- Quick Production Flow: User preferences table (Migration 015)
-- Stores default voice, persona, and duration for one-click video creation
-- Note: default_voice_id has no FK because voices are defined in TypeScript (voice-profiles.ts)
-- Voice validation happens at the API layer via getVoiceById()
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_voice_id TEXT,                    -- No FK: voices defined in TypeScript
  default_persona_id TEXT,
  quick_production_enabled INTEGER DEFAULT 1,  -- SQLite uses INTEGER for BOOLEAN
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (default_persona_id) REFERENCES system_prompts(id) ON DELETE SET NULL
);

-- Insert default row (single-user app)
INSERT OR IGNORE INTO user_preferences (id) VALUES ('default');

-- Migration 016: Add default_duration column
-- Stores target video duration in minutes (1-20 range, default 2)
ALTER TABLE user_preferences ADD COLUMN default_duration INTEGER DEFAULT 2;
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

// lib/rag/quick-production/types.ts (Story 6.8 - Quick Production Flow)
export interface UserPreferences {
  id: string;
  default_voice_id: string | null;
  default_persona_id: string | null;
  default_duration: number;            // Video duration in minutes (1-20, default 2)
  quick_production_enabled: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  voice_name?: string;
  persona_name?: string;
}

export interface QuickCreateRequest {
  topic: string;
  ragContext?: RAGContext;
}

export interface QuickCreateResponse {
  success: boolean;
  data?: {
    projectId: string;
    redirectUrl: string;
  };
  error?: string;
  message?: string;
}

export type PipelineStage = 'script' | 'voiceover' | 'visuals' | 'assembly' | 'complete';

export interface PipelineStatus {
  projectId: string;
  topic: string;
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  stageProgress: number;       // 0-100 for current stage
  overallProgress: number;     // 0-100 overall
  currentMessage: string;
  error?: string;
}

export interface TopicSuggestion {
  id: string;
  title: string;
  description: string;
  source: 'news' | 'trend' | 'competitor' | 'channel_gap';
  relevanceScore: number;      // 0-100
  ragContext: RAGContext;      // Pre-assembled context for this topic
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

#### Quick Production Flow APIs (Story 6.8)

```typescript
// POST /api/projects/quick-create
// One-click project creation from topic suggestion
Request: {
  topic: string;                       // Video topic from suggestion
  ragContext?: RAGContext;             // Pre-assembled RAG context
}
Response: {
  success: boolean;
  data?: {
    projectId: string;                 // Created project ID
    redirectUrl: string;               // /projects/{id}/progress
  };
  error?: 'DEFAULTS_NOT_CONFIGURED' | 'PIPELINE_FAILED';
  message?: string;
}

// GET /api/user-preferences
// Get user's Quick Production defaults
Response: {
  success: boolean;
  data: {
    id: string;
    default_voice_id: string | null;
    default_persona_id: string | null;
    default_duration: number;          // Video duration in minutes (1-20, default 2)
    quick_production_enabled: boolean;
    voice_name?: string;               // Joined from voice-profiles.ts
    persona_name?: string;             // Joined from system_prompts table
  }
}

// PUT /api/user-preferences
// Update user's Quick Production defaults
Request: {
  default_voice_id?: string;
  default_persona_id?: string;
  default_duration?: number;           // Must be 1-20 minutes
  quick_production_enabled?: boolean;
}
Response: {
  success: boolean;
}

// GET /api/projects/{id}/pipeline-status
// Get real-time pipeline status for Quick Production progress page
Response: {
  success: boolean;
  data: {
    projectId: string;
    topic: string;
    currentStage: 'script' | 'voiceover' | 'visuals' | 'assembly' | 'complete';
    completedStages: string[];
    stageProgress: number;             // 0-100 for current stage
    overallProgress: number;           // 0-100 overall
    currentMessage: string;            // "Generating scene 3 of 5..."
    error?: string;
  }
}

// GET /api/rag/topic-suggestions
// Get RAG-generated topic suggestions for Quick Production
Response: {
  success: boolean;
  data: {
    suggestions: TopicSuggestion[];    // 3-5 topic suggestions
    hasDefaults: boolean;              // Whether user has configured defaults
  }
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

#### Quick Production Flow (Story 6.8)

```
1. User views Topic Suggestions in Channel Intelligence UI
2. System displays RAG-generated topic cards with "Create Video" button
3. User clicks "Create Video" on a topic suggestion
4. System checks user_preferences for defaults:
   a. If default_voice_id AND default_persona_id exist → proceed
   b. If missing → redirect to /settings/quick-production with message
5. System calls POST /api/projects/quick-create with:
   - topic: selected topic title
   - ragContext: pre-assembled RAG context from suggestion
6. API creates project:
   a. Generate project ID
   b. Insert into projects table with topic_confirmed=true
   c. Apply default_voice_id and default_persona_id
   d. Store ragContext in project
   e. Set current_step='script-generation'
7. API triggers automated pipeline (reuses Automate Mode from Feature 1.12):
   a. Script generation with RAG context injection
   b. Voiceover generation with default voice
   c. Visual sourcing with auto-selection
   d. Video assembly
8. API returns projectId and redirectUrl
9. Frontend redirects to /projects/{id}/progress
10. Progress page polls GET /api/projects/{id}/pipeline-status
11. On completion (currentStage='complete'):
    - Auto-redirect to /projects/{id}/export
```

#### Quick Production Flow - Error Handling

```
1. If defaults not configured:
   - Return error: DEFAULTS_NOT_CONFIGURED
   - Frontend redirects to /settings/quick-production
   - Show message: "Please configure default voice and persona"

2. If pipeline stage fails:
   - Update pipeline status with error message
   - Show error on progress page
   - Offer options: Retry | Edit Project | Cancel

3. If RAG context is empty (no suggestions):
   - Still allow creation, but warn user
   - Script generates without RAG augmentation
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

### Story 6.8a: QPF Infrastructure (User Preferences & Pipeline Status)

**PRD Reference:** Feature 2.7 - Quick Production Flow (FR-2.7.QPF.02, FR-2.7.QPF.08)

**Overview:** Establishes the backend infrastructure for Quick Production Flow, including the user preferences system for storing default voice/persona/duration and the pipeline status API for tracking progress.

**Scope:**
- `user_preferences` database table (Migration 015)
- `default_duration` column (Migration 016)
- GET/PUT `/api/user-preferences` endpoints
- Settings page `/settings/quick-production`
- GET `/api/projects/[id]/pipeline-status` endpoint
- Navigation links (ProjectSidebar, TopicSuggestions)

**Functional Requirements:**

- **FR-6.8a.01:** The system shall store user default preferences (default_voice_id, default_persona_id, default_duration, quick_production_enabled) in the user_preferences table.
- **FR-6.8a.02:** The system shall provide GET `/api/user-preferences` to retrieve current defaults with joined voice/persona names.
- **FR-6.8a.03:** The system shall provide PUT `/api/user-preferences` to update default voice, persona, duration, and enabled status.
- **FR-6.8a.04:** The system shall provide a settings page at `/settings/quick-production` with dropdowns for voice/persona selection and duration selector with presets (1,2,3,5,10,15,20 min) and slider.
- **FR-6.8a.05:** The system shall provide GET `/api/projects/[id]/pipeline-status` returning current stage, progress percentage, and status message.
- **FR-6.8a.06:** The system shall provide navigation to Quick Production settings via ProjectSidebar and TopicSuggestions.

**Acceptance Criteria:**

- **AC-6.8a.1:** Given the database is initialized, when Migrations 015 and 016 run, then the user_preferences table exists with default row (id='default') and default_duration column (default 2 minutes).
- **AC-6.8a.2:** Given a user visits `/settings/quick-production`, when they select a voice, persona, and duration and click save, then the preferences are persisted to the database.
- **AC-6.8a.2b:** Given a user is anywhere in the application, when they look at the sidebar, then they see a "Quick Production" link below "Channel Intelligence" that navigates to settings.
- **AC-6.8a.3:** Given preferences are saved, when GET `/api/user-preferences` is called, then it returns the stored defaults including default_duration with voice_name and persona_name.
- **AC-6.8a.4:** Given a project is in pipeline execution, when GET `/api/projects/[id]/pipeline-status` is called, then it returns currentStage, stageProgress, overallProgress, and currentMessage.

**UI Components:**

| Component | Description | Location |
|-----------|-------------|----------|
| `QuickProductionSettings` | Settings page for configuring default voice, persona, and duration | /settings/quick-production |
| `ProjectSidebar` | Sidebar with Quick Production navigation link | All pages with sidebar |
| `TopicSuggestions` | Settings button always visible with dynamic label | Channel Intelligence page |

---

### Story 6.8b: QPF UI & Integration (One-Click Video Creation)

**PRD Reference:** Feature 2.7 - Quick Production Flow (FR-2.7.QPF.01, FR-2.7.QPF.03-07)

**Overview:** Implements the user-facing Quick Production Flow, including the "Create Video" button on topic suggestions, the quick-create API, progress tracking UI, and automatic navigation.

**Scope:**
- `TopicSuggestionCard` component with "Create Video" button
- POST `/api/projects/quick-create` endpoint
- `QuickProductionProgress` component
- Navigation flow (progress → export)
- Integration with Automate Mode pipeline

**Dependencies:** Story 6.8a (user_preferences, pipeline-status API)

**Functional Requirements:**

- **FR-6.8b.01:** The system shall display a "Create Video" button on each topic suggestion card in the Channel Intelligence UI.
- **FR-6.8b.02:** When "Create Video" is clicked, the system shall check user_preferences for configured defaults.
- **FR-6.8b.03:** If defaults exist, the system shall call POST `/api/projects/quick-create` with topic and RAG context.
- **FR-6.8b.04:** The quick-create API shall create a project with topic_confirmed=true, apply defaults, and trigger the Automate Mode pipeline.
- **FR-6.8b.05:** The system shall redirect to `/projects/[id]/progress` showing real-time pipeline status.
- **FR-6.8b.06:** Upon pipeline completion, the system shall automatically redirect to `/projects/[id]/export`.
- **FR-6.8b.07:** If no defaults are configured, the system shall redirect to `/settings/quick-production` with a prompt message.

**Acceptance Criteria:**

- **AC-6.8b.1:** Given a user has configured default voice and persona, when they click "Create Video" on a topic suggestion, then a new project is created with topic_confirmed=true and the pipeline starts automatically.
- **AC-6.8b.2:** Given the pipeline is running, when the user views the progress page, then they see real-time status updates for each stage (script, voiceover, visuals, assembly).
- **AC-6.8b.3:** Given the pipeline completes successfully, when assembly finishes, then the user is automatically redirected to the export page.
- **AC-6.8b.4:** Given a user has NOT configured defaults, when they click "Create Video", then they are redirected to /settings/quick-production with a message prompting them to select voice and persona.

**UI Components:**

| Component | Description | Location |
|-----------|-------------|----------|
| `TopicSuggestionCard` | Topic card with title, description, source, relevance score, and "Create Video" button | Channel Intelligence page |
| `QuickProductionProgress` | Pipeline progress display with stages, progress bar, and current message | /projects/{id}/progress |

**Integration with Automate Mode (Feature 1.12):**

Quick Production Flow reuses the Automate Mode pipeline from Feature 1.12. The key differences:

| Aspect | Automate Mode (1.12) | Quick Production Flow (6.8b) |
|--------|---------------------|----------------------------|
| Entry Point | Chat → Confirm Topic → Enable Automate | Topic Suggestion → Click "Create Video" |
| Configuration | Per-project toggle | Global user_preferences table |
| Voice Selection | Before automation starts | Pre-configured default |
| Persona Selection | Project-level setting | Pre-configured default |
| RAG Context | Optional | Always included (from suggestion) |
| Pipeline | Same orchestration logic | Same orchestration logic (reused) |

---

## Traceability Mapping

| AC ID | Spec Section | Component/API | Test Idea |
|-------|--------------|---------------|-----------|
| **Story 6.1: RAG Infrastructure** |
| AC-6.1.1 | Data Models | chroma-client.ts | Integration test: verify 3 collections created |
| AC-6.1.2 | Embeddings | local-embeddings.ts | Unit test: verify 384-dim output |
| AC-6.1.3 | Data Models | background_jobs table | Unit test: verify table schema |
| AC-6.1.4 | Data Models | cron_schedules table | Unit test: verify table schema |
| AC-6.1.5 | APIs | /api/rag/status | API test: verify health check returns status |
| AC-6.1.6 | Dependencies | requirements.txt | Integration test: pip install succeeds |
| **Story 6.2: Background Job Queue** |
| AC-6.2.1 | Job Queue | queue.ts | Integration test: restart app, verify jobs persist |
| AC-6.2.2 | Job Queue | processor.ts | Unit test: mock failure, verify retry timing (2s, 4s, 8s) |
| AC-6.2.3 | Job Queue | processor.ts | Unit test: verify max 2 concurrent jobs |
| AC-6.2.4 | Job Queue | scheduler.ts | Integration test: cron triggers job at configured time |
| AC-6.2.5 | APIs | /api/jobs | API test: verify status filtering works |
| AC-6.2.6 | APIs | /api/jobs/{id} | API test: verify progress updates during job |
| AC-6.2.7 | APIs | DELETE /api/jobs/{id} | API test: cancel pending job, verify status |
| **Story 6.3: YouTube Channel Sync** |
| AC-6.3.1 | Ingestion | youtube-captions.ts | Integration test: scrape known channel |
| AC-6.3.2 | Ingestion | youtube-captions.ts | Integration test: verify Python youtube-transcript-api call |
| AC-6.3.3 | Ingestion | chroma-client.ts | Integration test: verify metadata stored correctly |
| AC-6.3.4 | Ingestion | youtube-captions.ts | Unit test: verify 500ms delay between requests |
| AC-6.3.5 | Ingestion | youtube-captions.ts | Unit test: only process videos after last_sync |
| AC-6.3.6 | Ingestion | youtube-captions.ts | Unit test: log warning for missing captions, don't fail |
| AC-6.3.7 | Performance | youtube-captions.ts | Performance test: 50 videos < 5 minutes |
| **Story 6.4: News Source Ingestion** |
| AC-6.4.1 | Ingestion | news-sources.ts | Unit test: verify MILITARY_NEWS_SOURCES array has 7 sources |
| AC-6.4.2 | Ingestion | news-sources.ts | Unit test: RSS parser extracts headline, summary, URL |
| AC-6.4.3 | Ingestion | chroma-client.ts | Integration test: news articles embedded with metadata |
| AC-6.4.4 | Ingestion | news-sources.ts | Unit test: duplicate URL skipped |
| AC-6.4.5 | Ingestion | news-sources.ts | Unit test: articles > 7 days pruned |
| AC-6.4.6 | Job Queue | scheduler.ts | Integration test: news fetch job runs every 4 hours |
| AC-6.4.7 | Ingestion | news-sources.ts | Unit test: one source failure doesn't stop others |
| AC-6.4.8 | Performance | news-sources.ts | Performance test: all sources < 2 minutes |
| **Story 6.5: RAG Retrieval** |
| AC-6.5.1 | Retrieval | semantic-search.ts | Integration test: query returns top 5 documents |
| AC-6.5.2 | Retrieval | semantic-search.ts | Unit test: metadata filters narrow results |
| AC-6.5.3 | Retrieval | rag-script-generator.ts | Unit test: RAGContext has all 4 categories |
| AC-6.5.4 | Retrieval | rag-script-generator.ts | Unit test: verify token count < 4000 |
| AC-6.5.5 | Retrieval | semantic-search.ts | Unit test: empty collection returns empty array |
| AC-6.5.6 | Performance | semantic-search.ts | Performance test: retrieval < 500ms |
| **Story 6.6: RAG-Augmented Script Generation** |
| AC-6.6.1 | Generation | /api/projects/[id]/generate-script | API test: rag_enabled param accepted |
| AC-6.6.2 | Generation | rag-script-generator.ts | Unit test: RAG context injected into prompt |
| AC-6.6.3 | Generation | rag-script-generator.ts | Unit test: channel style referenced in output |
| AC-6.6.4 | Generation | rag-script-generator.ts | Unit test: news angles incorporated |
| AC-6.6.5 | Generation | /api/projects/[id]/generate-script | API test: response includes context summary |
| AC-6.6.6 | Generation | /api/projects/[id]/generate-script | API test: without RAG still works |
| AC-6.6.7 | Performance | rag-script-generator.ts | Performance test: RAG adds < 3s |
| **Story 6.7: Channel Intelligence UI** |
| AC-6.7.1 | UI | channel-intelligence/page.tsx | E2E test: complete setup wizard |
| AC-6.7.2 | UI | channel-intelligence/page.tsx | E2E test: established mode validates URL |
| AC-6.7.3 | UI | channel-intelligence/page.tsx | E2E test: cold start suggests 5 channels |
| AC-6.7.4 | UI | channel-intelligence/page.tsx | E2E test: add/remove competitor channels |
| AC-6.7.5 | UI | channel-intelligence/page.tsx | E2E test: verify sync status display |
| AC-6.7.6 | UI | channel-intelligence/page.tsx | E2E test: manual sync triggers job |
| AC-6.7.7 | UI | channel-intelligence/page.tsx | E2E test: RAG health status displayed |
| AC-6.7.8 | UI | channel-intelligence/page.tsx | E2E test: 3-5 topic suggestions displayed |
| **Story 6.8a: QPF Infrastructure** |
| AC-6.8a.1 | Data Models | user_preferences table | Unit test: migration creates table with default row |
| AC-6.8a.2 | UI | QuickProductionSettings.tsx | E2E test: save voice and persona preferences |
| AC-6.8a.3 | APIs | GET /api/user-preferences | API test: returns stored defaults with names |
| AC-6.8a.4 | APIs | GET /api/projects/[id]/pipeline-status | API test: returns stage, progress, message |
| **Story 6.8b: QPF UI & Integration** |
| AC-6.8b.1 | QPF APIs | /api/projects/quick-create | API test: project created with defaults applied |
| AC-6.8b.2 | UI | QuickProductionProgress.tsx | E2E test: real-time status updates displayed |
| AC-6.8b.3 | UI | QuickProductionProgress.tsx | E2E test: redirect to export on completion |
| AC-6.8b.4 | UI | TopicSuggestionCard.tsx | E2E test: redirect to settings when no defaults |

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
8. **Quick Production Flow:** E2E test complete one-click video creation from topic suggestion to export

### Quick Production Flow Test Scenarios (Story 6.8)

| Scenario | Test Type | Expected Outcome |
|----------|-----------|------------------|
| User with defaults clicks "Create Video" | E2E | Project created, pipeline starts, redirect to progress page |
| User without defaults clicks "Create Video" | E2E | Redirect to /settings/quick-production |
| Pipeline completes successfully | E2E | Auto-redirect to export page |
| Pipeline fails mid-execution | E2E | Error displayed on progress page with retry option |
| Progress page shows real-time updates | API | Status polling returns current stage and progress |
| User configures defaults | E2E | Preferences saved, "Create Video" now works |
| Topic suggestion with empty RAG context | API | Project created, script generates without RAG |

### Edge Cases

- Channel with no videos
- Videos with no auto-captions
- RSS feed returns 0 articles
- ChromaDB connection failure during generation
- Job queue at max concurrency
- Network timeout during sync
- Invalid YouTube channel URL format
- **QPF: User deletes voice/persona after setting defaults**
- **QPF: Pipeline stage timeout**
- **QPF: Multiple simultaneous quick-create requests**
- **QPF: Browser closes during pipeline execution**
