# Epic 6: Channel Intelligence & Content Research (RAG-Powered)

**Goal:** Enable VidIQ-style intelligence by syncing with YouTube channels, analyzing competitors, monitoring trends, and generating scripts informed by the user's niche and content style using RAG (Retrieval-Augmented Generation).

**Features Included:**
- 2.7. Channel Intelligence & Content Research (RAG-Powered)

**User Value:** Creators get AI-powered topic suggestions based on their channel's content, competitor analysis, trending topics, and current news in their niche. Scripts are generated with full awareness of the creator's style and what works in their space.

**Technical Approach:**
- Vector database (ChromaDB) for semantic search across channel content
- Local embeddings (all-MiniLM-L6-v2) for FOSS compliance
- YouTube caption scraping via youtube-transcript-api
- Background job queue for daily sync operations
- RAG-augmented script generation with context injection

**Story Count:** 7 stories

**Dependencies:**
- Epic 1 (LLM provider abstraction)
- Epic 2 (script generation pipeline)

**Acceptance:**
- Users can connect their YouTube channel or declare a niche (Cold Start mode)
- System syncs channel content daily via background jobs
- Up to 5 competitor channels can be tracked
- News sources fetched and embedded for niche awareness
- Script generation uses RAG context for informed output
- Channel Intelligence UI shows sync status and recommendations

---

### Epic 6 Stories

#### Story 6.1: RAG Infrastructure Setup
**Goal:** Set up ChromaDB, sentence-transformers, and youtube-transcript-api dependencies with database migrations

**Tasks:**
- Install Python dependencies: chromadb, sentence-transformers, youtube-transcript-api
- Create ChromaDB client wrapper (lib/rag/vector-db/chroma-client.ts)
- Initialize vector collections: channel_content, news_articles, trending_topics
- Create embeddings service (lib/rag/embeddings/local-embeddings.ts) calling Python
- Add database migration 013: background_jobs and cron_schedules tables
- Create environment variables for RAG configuration (.env.local)
- Implement ChromaDB persistence in .cache/chroma directory
- Add health check endpoint for RAG system status

**Acceptance Criteria:**
- ChromaDB initializes successfully with 3 collections
- Embeddings service generates 384-dimensional vectors using all-MiniLM-L6-v2
- background_jobs table created with status, priority, retry logic columns
- cron_schedules table created for recurring job definitions
- Environment variables documented: RAG_ENABLED, CHROMA_PATH, EMBEDDING_PROVIDER
- Health check returns ChromaDB connection status and collection counts
- All dependencies install without conflicts with existing Python packages

**References:**
- Architecture Section 19: Feature 2.7 RAG Architecture
- Architecture ADR-009: ChromaDB for Vector Database
- Architecture ADR-010: all-MiniLM-L6-v2 for Local Embeddings

---

#### Story 6.2: Background Job Queue & Cron Scheduler
**Goal:** Implement SQLite-backed job queue with cron scheduling for daily sync operations

**Tasks:**
- Create JobQueue class (lib/jobs/queue.ts) with enqueue, dequeue, complete, fail methods
- Implement retry logic with exponential backoff (2s, 4s, 8s delays)
- Create JobProcessor class (lib/jobs/processor.ts) with concurrency control (max 2 jobs)
- Implement CronScheduler (lib/jobs/scheduler.ts) using node-cron
- Register default cron schedules: daily channel sync (6 AM), news fetch (every 4 hours)
- Create job status API endpoints: GET /api/jobs, GET /api/jobs/[id], DELETE /api/jobs/[id]
- Implement job progress tracking (0-100%)
- Add startup initialization for job system (lib/jobs/init.ts)
- Create job type handlers structure (lib/jobs/handlers/)

**Acceptance Criteria:**
- Jobs persist in SQLite and survive application restarts
- Failed jobs retry up to 3 times with exponential backoff
- Concurrent job limit prevents resource exhaustion (max 2 parallel)
- Cron scheduler triggers jobs at configured times
- Job status API returns pending, running, completed, failed jobs
- Progress updates visible via API during long-running jobs
- Job system initializes automatically on application startup
- Cancelling a pending job sets status to 'cancelled'

**References:**
- Architecture Section 20: Background Job Queue Architecture
- Architecture ADR-011: SQLite-Backed Job Queue

---

#### Story 6.3: YouTube Channel Sync & Caption Scraping
**Goal:** Implement channel content ingestion via YouTube API and caption scraping

**Tasks:**
- Create scrapeVideoTranscript() function using youtube-transcript-api (Python)
- Implement scrapeChannelTranscripts() to fetch all video transcripts for a channel
- Create channel metadata fetcher using YouTube Data API v3
- Implement rate limiting (2 requests/second for caption scraping)
- Generate embeddings for each video transcript
- Store embeddings in ChromaDB channel_content collection with metadata
- Create rag_sync_channel job handler (lib/jobs/handlers/rag-sync.ts)
- Implement incremental sync (only fetch new videos since last sync)
- Track last sync timestamp per channel
- Handle missing captions gracefully (some videos have none)

**Acceptance Criteria:**
- Given a YouTube channel ID, system fetches all video transcripts (up to 50 most recent)
- Transcripts scraped via youtube-transcript-api Python library
- Each transcript embedded and stored in ChromaDB with channelId, videoId, title, publishedAt metadata
- Rate limiting prevents API abuse (max 15 requests/second)
- Incremental sync only processes videos published after last sync
- Videos without captions logged but don't fail the sync
- Sync job updates progress (10%, 30%, 60%, 80%, 100%)
- Channel sync completes within 5 minutes for 50 videos

**References:**
- Architecture Section 19: YouTube Caption Scraping
- Architecture ADR-012: youtube-transcript-api for Caption Scraping
- PRD Feature 2.7: Channel Intelligence

---

#### Story 6.4: News Source Ingestion & Trend Monitoring
**Goal:** Fetch and embed news articles from configured sources for niche awareness

**Tasks:**
- Create NewsSource interface and MILITARY_NEWS_SOURCES constant (lib/rag/ingestion/news-sources.ts)
- Implement RSS feed fetcher for news sources
- Create news article parser (headline, summary, URL, publishedAt)
- Generate embeddings for news articles
- Store in ChromaDB news_articles collection with niche, sourceId metadata
- Create rag_sync_news job handler (lib/jobs/handlers/news-fetch.ts)
- Implement deduplication (don't re-embed same article)
- Add configurable news sources per niche (military, gaming, tech, etc.)
- Implement 7-day retention (remove old news embeddings)
- Create getNicheNewsSources() helper function

**Acceptance Criteria:**
- 7 military news sources pre-configured (The War Zone, Military.com, Defense News, etc.)
- RSS feeds parsed successfully for headline, summary, URL
- News articles embedded and stored with niche and source metadata
- Deduplication prevents duplicate embeddings (check by URL)
- News older than 7 days automatically pruned from vector store
- News fetch job runs every 4 hours via cron scheduler
- Each source fetch isolated (one failure doesn't stop others)
- News fetch completes within 2 minutes for all sources

**References:**
- Architecture Section 19: News Source Ingestion
- PRD Feature 2.7: Pre-configured Military News Sources

---

#### Story 6.5: RAG Retrieval & Context Building
**Goal:** Implement semantic search and context assembly for RAG-augmented generation

**Tasks:**
- Create queryRelevantContent() function for semantic search across collections
- Implement metadata filtering (by niche, channelId, date range)
- Create retrieveRAGContext() function that queries all collections
- Build RAGContext interface: channelContent[], competitorContent[], newsArticles[], trendingTopics[]
- Implement relevance scoring and top-K retrieval (default K=5 per collection)
- Create context truncation logic (limit total context tokens)
- Add caching for frequently accessed queries (5-minute TTL)
- Implement fallback for empty collections (graceful degradation)

**Acceptance Criteria:**
- Semantic search returns top 5 most relevant documents per collection
- Metadata filters correctly narrow results (e.g., only user's channel, only last 7 days news)
- RAGContext assembled with content from all 4 categories
- Context truncation prevents exceeding LLM token limits (keep under 4000 tokens)
- Empty collections return empty arrays (don't fail)
- Query caching reduces repeated embedding generation
- Retrieval completes within 500ms for typical queries

**References:**
- Architecture Section 19: RAG Retrieval Layer
- Architecture Section 19: Vector Database Integration

---

#### Story 6.6: RAG-Augmented Script Generation
**Goal:** Integrate RAG context into script generation for informed, niche-aware scripts

**Tasks:**
- Create buildRAGPrompt() function that injects context into generation prompt
- Modify script generation endpoint to optionally use RAG context
- Create getProjectRAGConfig() helper to check if RAG enabled for project
- Implement context formatting (channel style, competitor analysis, news angles, trends)
- Add RAG toggle to script generation API (rag_enabled parameter)
- Create comparison mode: generate with and without RAG for A/B testing
- Update script generation prompts to leverage injected context
- Add RAG context preview in script generation loading state

**Acceptance Criteria:**
- Script generation endpoint accepts optional rag_enabled parameter
- When enabled, RAG context retrieved and injected into prompt
- Generated scripts reference channel style (if established channel mode)
- Generated scripts incorporate recent news angles when relevant
- Scripts differentiate from competitor content while learning patterns
- RAG context displayed to user during generation ("Using context from 5 videos, 3 news articles...")
- Non-RAG generation still works (backwards compatible)
- RAG-augmented generation adds <3 seconds to total generation time

**References:**
- Architecture Section 19: RAG-Augmented Script Generation
- PRD Feature 2.7: Informed Script Generation

---

#### Story 6.7: Channel Intelligence UI & Setup Wizard
**Goal:** Build UI for RAG configuration, channel connection, and sync status monitoring

**Tasks:**
- Create ChannelIntelligence.tsx page at /settings/channel-intelligence
- Implement setup wizard with two modes: Established Channel vs Cold Start
- Build channel connection flow (enter channel URL/ID, validate via YouTube API)
- Create competitor channel management (add up to 5 channels)
- Display sync status: last sync time, videos indexed, news articles count
- Add manual sync trigger button
- Create niche selector for Cold Start mode (military, gaming, tech, cooking, etc.)
- Display RAG health status (ChromaDB connection, collection sizes)
- Add news source configuration (enable/disable sources)
- Create topic suggestions based on RAG analysis

**Acceptance Criteria:**
- Setup wizard guides user through mode selection (Established vs Cold Start)
- Established Channel mode: user enters channel URL, system validates and starts sync
- Cold Start mode: user selects niche, system auto-indexes top 5 channels in niche
- Competitor management allows adding/removing up to 5 channels
- Sync status shows: "Last synced: 2 hours ago | 47 videos indexed | 23 news articles"
- Manual sync button triggers immediate rag_sync_channel job
- Niche selector includes pre-configured options with appropriate news sources
- RAG health shows: "ChromaDB: Connected | Videos: 142 | News: 89 | Trends: 12"
- Topic suggestions display 3-5 AI-generated topic ideas based on RAG analysis

**References:**
- PRD Feature 2.7: User Flow Example
- PRD Feature 2.7: Operating Modes
- Architecture Section 19: API Endpoints

---

#### Story 6.8a: QPF Infrastructure (User Preferences & Pipeline Status)
**Goal:** Establish backend infrastructure for Quick Production Flow with user preferences and pipeline status tracking

**PRD Reference:** Feature 2.7 - Quick Production Flow (FR-2.7.QPF.02, FR-2.7.QPF.08)

**Tasks:**
- Create database migration 014: user_preferences table with default_voice_id, default_persona_id, quick_production_enabled
- Implement GET /api/user-preferences endpoint returning defaults with joined voice/persona names
- Implement PUT /api/user-preferences endpoint for updating preferences
- Create QuickProductionSettings.tsx page at /settings/quick-production
- Build voice and persona dropdown selectors using existing voices and system_prompts tables
- Implement GET /api/projects/[id]/pipeline-status endpoint for real-time progress tracking
- Add pipeline_stage and pipeline_progress columns to projects table (or use existing current_step)

**Acceptance Criteria:**
- **AC-6.8a.1:** Given the database is initialized, when Migration 014 runs, then the user_preferences table exists with default row (id='default').
- **AC-6.8a.2:** Given a user visits `/settings/quick-production`, when they select a voice and persona and click save, then the preferences are persisted to the database.
- **AC-6.8a.3:** Given preferences are saved, when GET `/api/user-preferences` is called, then it returns the stored defaults with voice_name and persona_name.
- **AC-6.8a.4:** Given a project is in pipeline execution, when GET `/api/projects/[id]/pipeline-status` is called, then it returns currentStage, stageProgress, overallProgress, and currentMessage.

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_voice_id TEXT,
  default_persona_id TEXT,
  quick_production_enabled BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (default_voice_id) REFERENCES voices(id),
  FOREIGN KEY (default_persona_id) REFERENCES system_prompts(id)
);
INSERT OR IGNORE INTO user_preferences (id) VALUES ('default');
```

**References:**
- Tech Spec Epic 6 v1.2, Story 6.8a
- PRD Feature 2.7 Quick Production Flow
- Architecture Section 21: Quick Production Flow

---

#### Story 6.8b: QPF UI & Integration (One-Click Video Creation)
**Goal:** Implement one-click video creation from topic suggestions with automatic pipeline execution

**PRD Reference:** Feature 2.7 - Quick Production Flow (FR-2.7.QPF.01, FR-2.7.QPF.03-07)

**Dependencies:** Story 6.8a (user_preferences, pipeline-status API)

**Tasks:**
- Create TopicSuggestionCard.tsx component with "Create Video" button
- Implement defaults check before quick-create (redirect to settings if missing)
- Create POST /api/projects/quick-create endpoint that:
  - Validates user has configured defaults
  - Creates project with topic_confirmed=true
  - Applies default_voice_id and default_persona_id
  - Triggers Automate Mode pipeline (reuse from Feature 1.12)
  - Returns projectId and redirectUrl
- Create QuickProductionProgress.tsx component at /projects/[id]/progress
- Implement real-time status polling using pipeline-status API
- Add auto-redirect to /projects/[id]/export on pipeline completion
- Handle pipeline errors with retry/edit options

**Acceptance Criteria:**
- **AC-6.8b.1:** Given a user has configured default voice and persona, when they click "Create Video" on a topic suggestion, then a new project is created with topic_confirmed=true and the pipeline starts automatically.
- **AC-6.8b.2:** Given the pipeline is running, when the user views the progress page, then they see real-time status updates for each stage (script, voiceover, visuals, assembly).
- **AC-6.8b.3:** Given the pipeline completes successfully, when assembly finishes, then the user is automatically redirected to the export page.
- **AC-6.8b.4:** Given a user has NOT configured defaults, when they click "Create Video", then they are redirected to /settings/quick-production with a message prompting them to select voice and persona.

**Integration with Automate Mode (Feature 1.12):**

| Aspect | Automate Mode (1.12) | Quick Production Flow (6.8b) |
|--------|---------------------|----------------------------|
| Entry Point | Chat → Confirm Topic → Enable Automate | Topic Suggestion → Click "Create Video" |
| Configuration | Per-project toggle | Global user_preferences table |
| Voice Selection | Before automation starts | Pre-configured default |
| Persona Selection | Project-level setting | Pre-configured default |
| RAG Context | Optional | Always included (from suggestion) |
| Pipeline | Same orchestration logic | Same orchestration logic (reused) |

**References:**
- Tech Spec Epic 6 v1.2, Story 6.8b
- PRD Feature 2.7 Quick Production Flow
- PRD Feature 1.12 Automate Mode (pipeline reuse)

---
