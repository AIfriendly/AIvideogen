# Story 6.4: News Feed Aggregation & Embedding

**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
**Story:** 6.4 - News Feed Aggregation & Embedding
**Status:** DONE
**Created:** 2025-12-01
**Completed:** 2025-12-01
**Architect Review:** Addressed

---

## Story Description

Implement news source ingestion for niche awareness by fetching articles from configured RSS feeds and storing their embeddings in ChromaDB. This story extends the RAG system to include real-time news content, enabling the LLM to generate scripts that incorporate current events and trending topics in the user's niche.

**User Value:** Creators receive scripts that reference current news and events in their niche, making content more timely and relevant. For example, a military content creator's scripts can reference recent defense news, policy changes, or geopolitical events.

---

## Acceptance Criteria

### AC-6.4.1: Pre-configured News Sources
- **Given** the system is initialized
- **When** the news sources are loaded
- **Then** 7 military news sources are pre-configured (per Migration 013):
  - The War Zone
  - Military.com
  - Defense News
  - Breaking Defense
  - Defense One
  - Military Times
  - Janes Defence News
- **And** each source has name, URL, niche, and fetch_method defined

### AC-6.4.2: RSS Feed Parsing
- **Given** a valid RSS feed URL
- **When** the news fetcher processes the feed
- **Then** articles are parsed for headline, summary, URL, and publishedAt
- **And** invalid or malformed individual entries are skipped gracefully (item-level error handling)
- **And** valid items in a partially malformed feed are still processed

### AC-6.4.3: Embedding Storage in ChromaDB
- **Given** a news article has been parsed
- **When** embedding generation completes
- **Then** the embedding is stored in ChromaDB news_articles collection
- **And** metadata includes sourceId, niche, publishedAt, and URL

### AC-6.4.4: Deduplication
- **Given** the news fetcher processes multiple RSS feeds
- **When** an article URL has already been indexed
- **Then** the article is skipped without re-embedding
- **And** no duplicate entries exist in the vector store

### AC-6.4.5: Automatic Pruning (7-Day Retention)
- **Given** news articles exist in the database
- **When** a prune operation runs (at end of each news fetch job)
- **Then** articles older than 7 days are removed from both SQLite and ChromaDB
- **And** pruning does not affect articles within the 7-day window

### AC-6.4.6: Cron Scheduling
- **Given** the system has started
- **When** the cron scheduler initializes
- **Then** a news fetch job is scheduled to run every 4 hours
- **And** the schedule persists across application restarts (no duplicate schedules created)

### AC-6.4.7: Error Isolation
- **Given** multiple news sources are being processed
- **When** one source fails (network error, invalid RSS, etc.)
- **Then** other sources continue processing successfully
- **And** the failure is logged with source details

### AC-6.4.8: Performance
- **Given** all 7 news sources are enabled
- **When** a full news fetch job runs
- **Then** the job completes within 2 minutes
- **And** progress updates are emitted during processing

---

## Tasks

### Task 1: Database Migration - Add embedding_status Column
- [x] Create migration 014 to add `embedding_status` column to `news_articles` table
- [x] Column definition: `embedding_status TEXT DEFAULT 'pending' CHECK(embedding_status IN ('pending', 'processing', 'embedded', 'error'))`
- [x] Add index on `embedding_status` for efficient queries
- [x] Test migration runs successfully on existing database

### Task 2: Create News Source Configuration
- [x] Create `lib/rag/ingestion/news-sources.ts`
- [x] Define NewsSource interface (id, name, url, niche, fetchMethod, enabled)
- [x] Reference MILITARY_NEWS_SOURCES from Migration 013 (already seeded):
  - The War Zone (warzone)
  - Military.com (military-com)
  - Defense News (defense-news)
  - Breaking Defense (breaking-defense)
  - Defense One (defense-one)
  - Military Times (military-times)
  - Janes Defence News (janes)
- [x] Create getNicheNewsSources(niche: string) helper function
- [x] Create getEnabledNewsSources() helper function (reads from database)

### Task 3: Install RSS Parser Dependency
- [x] Install rss-parser npm package: `npm install rss-parser`
- [x] Add type definitions if needed
- [x] Verify compatibility with existing dependencies

### Task 4: Create News Fetcher Service
- [x] Create `lib/rag/ingestion/news-fetcher.ts`
- [x] Implement RSSFetcher class with fetch() method
- [x] Parse RSS feed into NewsArticle objects (headline, summary, url, publishedAt)
- [x] **Item-level error handling:** Parse each RSS item in try-catch; log malformed items but continue with remaining items
- [x] Implement timeout handling (10s per source)
- [x] Add error handling for network failures and malformed RSS at source level
- [x] Extract article summary from RSS description or content:encoded fields
- [x] Normalize dates to ISO 8601 format
- [x] Truncate summary to 500 characters

### Task 5: Database Query Functions for News
- [x] Create `lib/db/queries-news.ts` (following queries-channels.ts pattern)
- [x] Implement getNewsSources(), getNewsSourceById(), getNewsSourcesByNiche()
- [x] Implement updateNewsSourceLastFetch(id, timestamp, articleCount)
- [x] Implement createNewsArticle(), getNewsArticleByUrl(), updateNewsArticle()
- [x] Implement getNewsArticlesByNiche(niche, limit)
- [x] Implement deleteOldNewsArticles(olderThanDate: string) for pruning
- [x] Implement getUnembeddedArticles() for incremental processing
- [x] Implement updateArticleEmbeddingStatus(id, status, embeddingId?)

### Task 6: News Embedding Service
- [x] Create `lib/rag/ingestion/news-embedding.ts`
- [x] Implement embedNewsArticle(article: NewsArticle) function
- [x] Concatenate headline + summary for embedding text
- [x] Call local-embeddings.ts service (from Story 6.1)
- [x] Store embedding in ChromaDB news_articles collection
- [x] Update article.embedding_id and embedding_status in database
- [x] Implement batch embedding for efficiency (process up to 10 at once)

### Task 7: News Sync Job Handler
- [x] Create `lib/jobs/handlers/news-fetch.ts`
- [x] Implement handleNewsFetch(job: Job) function
- [x] Process each enabled news source in sequence
- [x] For each source:
  1. Fetch RSS feed
  2. Parse articles (with item-level error handling)
  3. Deduplicate by URL
  4. Store new articles in database
  5. Generate embeddings for new articles
- [x] Emit progress updates (e.g., "Processing source 3/7...")
- [x] Track success/failure counts per source
- [x] **Call pruneOldNews() at end of job before returning result** (pruning integration)
- [x] Store job result with summary (articles added, skipped, failed, pruned)
- [x] Integrate with job queue from Story 6.2

### Task 8: Deduplication Logic
- [x] Check article URL against existing records before inserting
- [x] Use getNewsArticleByUrl() to detect duplicates
- [x] Skip embedding generation for existing articles
- [x] Log skipped articles count for job summary

### Task 9: Pruning Service
- [x] Add pruneOldNews(retentionDays: number = 7) function to news-fetcher.ts
- [x] Delete articles older than retention period from SQLite using deleteOldNewsArticles()
- [x] Delete corresponding embeddings from ChromaDB by embedding_id
- [x] Log pruned article count
- [x] **Integration point:** Called at end of handleNewsFetch() job handler (Task 7)

### Task 10: Cron Schedule Setup
- [x] Add news fetch schedule to cron_schedules table on app startup
- [x] Schedule: every 4 hours (cron: "0 */4 * * *")
- [x] Use INSERT OR IGNORE to prevent duplicate schedules on restart
- [x] Create POST /api/rag/news/sync endpoint for manual trigger
- [x] Register schedule in lib/jobs/init.ts

### Task 11: API Endpoints
- [x] Create `app/api/rag/news/route.ts` for GET (list sources)
- [x] Create `app/api/rag/news/[id]/route.ts` for GET, PATCH (toggle enabled)
- [x] Create `app/api/rag/news/sync/route.ts` for POST (trigger manual sync)
- [x] Return news sync status and statistics

### Task 12: Test Automation
- [x] Unit tests for RSS parsing (valid feed, empty feed, malformed feed)
- [x] Unit tests for item-level error handling (feed with mix of valid/invalid items)
- [x] Unit tests for deduplication logic
- [x] Unit tests for pruning logic
- [x] Integration tests for news source CRUD operations
- [x] Integration tests for embedding storage
- [x] Test error isolation (one source failure doesn't stop others)
- [x] **Test cron persistence:** Schedule created on first startup, not duplicated on subsequent startups

---

## Technical Notes

### Architecture References
- **Architecture:** Section 19 - Feature 2.7 RAG Architecture
- **Tech Spec:** Epic 6 - Story 6.4 Acceptance Criteria
- **Database:** news_sources and news_articles tables (Migration 013 from Story 6.1)

### Dependencies
- **Node.js:** rss-parser (new dependency)
- **Existing:** ChromaDB client (from Story 6.1)
- **Existing:** Local embeddings service (from Story 6.1)
- **Existing:** Job queue (from Story 6.2)

### Pre-configured Military News Sources (from Migration 013)

| ID | Source | RSS URL |
|----|--------|---------|
| warzone | The War Zone | https://www.thedrive.com/the-war-zone/feed |
| military-com | Military.com | https://www.military.com/rss-feeds |
| defense-news | Defense News | https://www.defensenews.com/arc/outboundfeeds/rss/ |
| breaking-defense | Breaking Defense | https://breakingdefense.com/feed/ |
| defense-one | Defense One | https://www.defenseone.com/rss/all/ |
| military-times | Military Times | https://www.militarytimes.com/arc/outboundfeeds/rss/ |
| janes | Janes Defence News | https://www.janes.com/feeds/news |

### NewsArticle Interface

```typescript
interface NewsArticle {
  id: string;
  sourceId: string;
  headline: string;
  summary: string;
  url: string;
  publishedAt: string;
  niche: string;
  embeddingId?: string;
  embeddingStatus: 'pending' | 'processing' | 'embedded' | 'error';
  createdAt: string;
}
```

### RSS Parsing Strategy

1. Fetch RSS feed with 10-second timeout
2. Parse XML using rss-parser library
3. For each item (in try-catch for item-level error handling):
   - `headline`: item.title
   - `summary`: item.contentSnippet || item.content || item.description (truncate to 500 chars)
   - `url`: item.link (use as unique identifier)
   - `publishedAt`: item.pubDate or item.isoDate (normalize to ISO 8601)
4. Skip items missing required fields (headline, url) - log and continue
5. Malformed items logged but don't stop processing of valid items

### Error Handling Matrix

| Error | Handling |
|-------|----------|
| Network timeout | Log and skip source, continue with others |
| Invalid RSS (parse error) | Log and skip source, continue with others |
| Empty feed (0 items) | Log warning, continue with others |
| Malformed RSS item | Log and skip item, continue with other items |
| Duplicate URL | Skip embedding, log as "skipped" |
| Embedding failure | Mark article as 'error', continue with others |
| ChromaDB unavailable | Fail job with clear error message |

### Performance Targets

- RSS fetch: <5s per source (with 10s timeout)
- Embedding generation: <500ms per article
- Full 7-source sync: <2 minutes
- Pruning: <10s for typical 7-day window (~500 articles)

### Job Handler Flow

```
handleNewsFetch(job):
  1. Get enabled news sources from database
  2. For each source:
     a. Update progress (e.g., 1/7 sources)
     b. Fetch RSS feed (try-catch for source-level errors)
     c. Parse articles (try-catch per item)
     d. Deduplicate by URL
     e. Store new articles
     f. Generate embeddings
  3. Call pruneOldNews(7) // 7-day retention
  4. Return job result summary
```

---

## Definition of Done

- [x] All acceptance criteria pass
- [x] Migration 014 adds embedding_status column
- [x] 7 military news sources work correctly
- [x] RSS feeds parse correctly (including partial feeds)
- [x] Articles stored in database with metadata
- [x] Embeddings stored in ChromaDB
- [x] Deduplication prevents duplicate embeddings
- [x] 7-day pruning removes old articles
- [x] Cron schedule triggers every 4 hours (no duplicates)
- [x] Error isolation ensures one failure doesn't stop sync
- [x] API endpoints work for news management
- [x] Unit tests written and passing (27 tests)
- [x] Integration tests written and passing
- [x] No TypeScript/ESLint errors
- [x] Build passes successfully

---

## Story Points

**Estimate:** 5 points (Medium)

**Justification:**
- RSS parsing is straightforward with rss-parser library
- Follows patterns established in Story 6.3 for embedding storage
- Reuses existing job queue and ChromaDB infrastructure
- 7 pre-configured sources already seeded in Migration 013
- Main complexity is error handling and isolation

---

## Architect Review Notes

**Addressed Issues:**
1. Added Task 1 for Migration 014 to add `embedding_status` column
2. Aligned news sources with Migration 013 (using already-seeded sources)
3. Task 5 explicitly creates `queries-news.ts` following established pattern
4. Task 4 includes item-level error handling for RSS parsing
5. Task 9 specifies pruning integration point (called from Task 7 job handler)
6. Task 12 includes cron persistence test

---

## References

- PRD: Feature 2.7 - Channel Intelligence & Content Research (RAG-Powered)
- Epic File: docs/epics.md - Epic 6 Story 6.4
- Tech Spec: docs/sprint-artifacts/tech-spec-epic-6.md
- Architecture: docs/architecture.md - Section 19 (RAG Architecture)
- Story 6.1: RAG Infrastructure Setup (ChromaDB, embeddings)
- Story 6.2: Background Job Queue (job handlers, cron)
- Story 6.3: YouTube Channel Sync (pattern for ingestion services)
