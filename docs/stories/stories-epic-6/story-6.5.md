# Story 6.5: RAG Retrieval & Context Building

**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
**Story:** 6.5 - RAG Retrieval & Context Building
**Status:** Done
**Created:** 2025-12-01
**Completed:** 2025-12-01
**Architect Review:** Approved

---

## Story Description

Implement semantic search and context assembly for RAG-augmented generation. This story creates the retrieval layer that queries ChromaDB collections (channel_content, news_articles) and builds a structured RAGContext object that can be injected into script generation prompts.

**User Value:** When generating scripts, the LLM will have access to relevant content from the user's channel, competitor channels, and recent news articles, producing more informed and niche-aware scripts that reference the creator's established style and current events.

---

## Acceptance Criteria

### AC-6.5.1: Semantic Search Core
- **Given** a query string and collection name
- **When** queryRelevantContent() is called
- **Then** the function returns top 5 most relevant documents from that collection
- **And** results include document id, content, metadata, and similarity score
- **And** results are sorted by relevance (highest score first)

### AC-6.5.2: Metadata Filtering
- **Given** a semantic search query with filters
- **When** queryRelevantContent() is called with metadata filters
- **Then** results are correctly narrowed by niche, channelId, or date range
- **And** filtering happens before relevance ranking (only matching documents ranked)

### AC-6.5.3: RAGContext Assembly
- **Given** a project with RAG enabled and a topic query
- **When** retrieveRAGContext() is called
- **Then** RAGContext is assembled with content from all applicable collections:
  - channelContent[] (user's channel if established mode)
  - competitorContent[] (competitor channels)
  - newsArticles[] (recent news in niche)
- **And** each category contains top 5 relevant documents

### AC-6.5.4: Token Limit Management
- **Given** retrieved documents from multiple collections
- **When** building the final context string
- **Then** total context is truncated to stay under 4000 tokens
- **And** truncation prioritizes most relevant content (by score)
- **And** truncation preserves complete document entries (no mid-document cuts)

### AC-6.5.5: Graceful Degradation
- **Given** one or more ChromaDB collections are empty
- **When** retrieveRAGContext() is called
- **Then** empty collections return empty arrays (don't fail)
- **And** context assembly continues with available content
- **And** ChromaDB connection failures are caught and logged

### AC-6.5.6: Performance
- **Given** typical ChromaDB collections with <1000 documents each
- **When** semantic search is performed
- **Then** retrieval completes within 500ms
- **And** embedding generation for query is cached for repeated queries (5-minute TTL)

---

## Tasks

### Task 1: Create Semantic Search Service
- [x] Create `lib/rag/retrieval/semantic-search.ts`
- [x] Implement queryRelevantContent(query: string, collection: string, options?: SearchOptions): Promise<RetrievedDocument[]>
- [x] Options interface: { topK?: number, filters?: MetadataFilters }
- [x] Generate query embedding using local-embeddings service (Story 6.1)
- [x] Query ChromaDB collection with embedding and filters
- [x] Map ChromaDB results to RetrievedDocument interface
- [x] Sort results by score (descending)
- [x] Add error handling for ChromaDB connection failures

### Task 2: Implement Metadata Filtering
- [x] Create MetadataFilters interface: { niche?: string, channelId?: string, dateRange?: { start: string, end: string } }
- [x] Translate filters to ChromaDB where clause format
- [x] Implement date range filtering (publishedAt >= start AND publishedAt <= end)
- [x] Test filters with various combinations (niche only, channelId only, combined)

### Task 3: Create RAG Context Builder
- [x] Create `lib/rag/retrieval/context-builder.ts`
- [x] Implement retrieveRAGContext(projectId: string, query: string): Promise<RAGContext>
- [x] Load project RAG config (rag_enabled, rag_config from projects table)
- [x] For established mode: Query channel_content for user's channel
- [x] For all modes: Query channel_content for competitor channels (if configured)
- [x] Query news_articles filtered by project niche and last 7 days
- [x] Assemble RAGContext object with all categories

### Task 4: Token Management & Truncation
- [x] Create `lib/rag/retrieval/token-counter.ts`
- [x] Implement countTokens(text: string): number (approximate: chars / 4)
- [x] Create truncateContext(context: RAGContext, maxTokens: number): RAGContext
- [x] Truncation strategy: Remove lowest-scored documents first
- [x] Never cut documents mid-content (remove whole entries)
- [x] Target max 4000 tokens total (configurable)

### Task 5: Query Caching
- [x] Create simple in-memory cache for query embeddings
- [x] Key: hash of query string
- [x] Value: embedding vector
- [x] TTL: 5 minutes (300 seconds)
- [x] Implement cache.get(query) and cache.set(query, embedding)
- [x] Auto-expire old entries

### Task 6: Database Query Functions
- [x] Add getProjectRAGConfig(projectId: string): RAGConfig | null to queries.ts
- [x] Helper to check if RAG is enabled for project
- [x] Helper to get user channel ID and competitor channels from config

### Task 7: API Endpoint for RAG Context Preview
- [x] Create GET /api/projects/[id]/rag-context?query={query}
- [x] Returns RAGContext for preview/debugging purposes
- [x] Include document counts and token usage in response
- [x] Useful for Story 6.6 (RAG-augmented script generation)

### Task 8: Test Automation
- [x] Unit tests for semantic search with mocked ChromaDB
- [x] Unit tests for metadata filtering
- [x] Unit tests for token counting and truncation
- [x] Unit tests for query caching (TTL behavior)
- [x] Integration tests for RAGContext assembly
- [x] Test graceful degradation (empty collections, connection failures)
- [x] Performance test: verify <500ms retrieval time

---

## Technical Notes

### Architecture References
- **Architecture:** Section 19 - RAG Retrieval Layer
- **Tech Spec:** Epic 6 - Story 6.5 Acceptance Criteria
- **Database:** projects.rag_enabled, projects.rag_config (Migration 013)

### Dependencies
- **Existing:** ChromaDB client (from Story 6.1)
- **Existing:** Local embeddings service (from Story 6.1)
- **Existing:** channel_content and news_articles collections (Stories 6.3, 6.4)

### RetrievedDocument Interface

```typescript
interface RetrievedDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
}
```

### RAGContext Interface

```typescript
interface RAGContext {
  channelContent: RetrievedDocument[];     // User's channel (established mode)
  competitorContent: RetrievedDocument[];  // Competitor channels
  newsArticles: RetrievedDocument[];       // Recent news in niche
}
```

### SearchOptions Interface

```typescript
interface SearchOptions {
  topK?: number;                           // Default: 5
  filters?: MetadataFilters;
}

interface MetadataFilters {
  niche?: string;
  channelId?: string;
  dateRange?: {
    start: string;  // ISO 8601
    end: string;    // ISO 8601
  };
}
```

### ChromaDB Query Pattern

```typescript
// Example ChromaDB query with filters
const results = await collection.query({
  queryEmbeddings: [queryEmbedding],
  nResults: topK,
  where: {
    niche: { $eq: 'military' },
    published_at: { $gte: '2025-11-24' }
  }
});
```

### Token Counting Strategy

Simple approximation: 1 token ≈ 4 characters. For production accuracy, consider using tiktoken or similar, but for MVP this approximation is sufficient.

```typescript
function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
```

### Performance Targets

- Embedding generation for query: <100ms (cached after first call)
- ChromaDB query: <200ms per collection
- Total RAGContext assembly: <500ms
- Cache hit rate target: 80%+ for repeated topics

---

## Definition of Done

- [x] All acceptance criteria pass
- [x] queryRelevantContent() returns top-K documents with scores
- [x] Metadata filtering works for niche, channelId, date range
- [x] RAGContext assembles from all collections
- [x] Token truncation keeps context under 4000 tokens
- [x] Empty collections return empty arrays (graceful degradation)
- [x] Query caching reduces embedding generation calls
- [x] GET /api/projects/[id]/rag-context endpoint works
- [x] Unit tests written and passing (58 tests)
- [x] Integration tests written and passing
- [x] Performance: retrieval <500ms
- [x] No TypeScript/ESLint errors
- [x] Build passes successfully

---

## Story Points

**Estimate:** 5 points (Medium)

**Justification:**
- Builds on existing ChromaDB and embeddings infrastructure (Story 6.1)
- Core semantic search is straightforward with ChromaDB
- Main complexity is context assembly and token management
- Caching adds some complexity but is bounded
- Well-defined interfaces from tech spec

---

## References

- PRD: Feature 2.7 - Channel Intelligence & Content Research (RAG-Powered)
- Epic File: docs/epics.md - Epic 6 Story 6.5
- Tech Spec: docs/sprint-artifacts/tech-spec-epic-6.md
- Architecture: docs/architecture.md - Section 19 (RAG Architecture)
- Story 6.1: RAG Infrastructure Setup (ChromaDB, embeddings)
- Story 6.3: YouTube Channel Sync (channel_content collection)
- Story 6.4: News Source Ingestion (news_articles collection)
