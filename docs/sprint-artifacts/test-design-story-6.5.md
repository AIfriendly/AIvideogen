# Test Design: Story 6.5 - RAG Retrieval & Context Building

**Date:** 2025-12-01
**Author:** TEA (Test Architect)
**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
**Story:** 6.5 - RAG Retrieval & Context Building
**Status:** Draft

---

## Executive Summary

Story 6.5 implements the semantic search and context assembly layer for RAG-augmented generation. This is a **medium-risk** story with **high business value** as it directly enables the AI to produce informed, niche-aware scripts.

**Key Components:**
- Semantic search service (`semantic-search.ts`)
- Context builder (`context-builder.ts`)
- Token counter & truncation (`token-counter.ts`)
- Query embedding cache
- API endpoint for RAG context preview

**Test Strategy:**
- **Unit tests:** 70% (pure functions, token counting, truncation logic)
- **Integration tests:** 25% (ChromaDB queries, database interactions)
- **API tests:** 5% (endpoint validation)

---

## Risk Assessment Matrix

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-001 | PERF | ChromaDB query latency exceeds 500ms target | 2 | 2 | 4 | Performance tests, index optimization | Dev |
| R-002 | DATA | Token truncation loses critical context | 2 | 3 | 6 | Priority-weighted truncation, keep highest-scored | QA |
| R-003 | TECH | ChromaDB connection failures during retrieval | 2 | 2 | 4 | Graceful degradation, empty arrays fallback | Dev |
| R-004 | TECH | Embedding cache memory exhaustion | 1 | 2 | 2 | TTL expiry (5 min), size limits | Dev |
| R-005 | DATA | Metadata filter returns zero results | 2 | 2 | 4 | Fallback to broader query, log warnings | QA |
| R-006 | BUS | RAGContext assembly returns incomplete data | 2 | 3 | 6 | Test all collection combinations | QA |
| R-007 | PERF | Embedding generation latency slows queries | 2 | 2 | 4 | Query caching with 5-min TTL | Dev |
| R-008 | TECH | Invalid project RAG config parsing | 2 | 2 | 4 | JSON validation, graceful fallback | Dev |

**High-Priority Risks (Score >= 6):**
- R-002: Token truncation loses critical context
- R-006: RAGContext assembly returns incomplete data

---

## Test Coverage Plan

### AC-6.5.1: Semantic Search Core

**Tests Required:**

| Test ID | Test Level | Priority | Description | Status |
|---------|------------|----------|-------------|--------|
| 6.5-UNIT-001 | Unit | P0 | queryRelevantContent returns top 5 documents by default | EXISTS |
| 6.5-UNIT-002 | Unit | P0 | Results sorted by relevance score (highest first) | EXISTS |
| 6.5-UNIT-003 | Unit | P0 | Results include id, content, metadata, score | EXISTS |
| 6.5-UNIT-004 | Unit | P1 | Distance-to-similarity score conversion accurate | EXISTS |
| 6.5-UNIT-005 | Unit | P1 | topK parameter respected in query | EXISTS |
| 6.5-UNIT-006 | Unit | P1 | Query embedding generated from search text | EXISTS |
| 6.5-INT-001 | Integration | P1 | ChromaDB query returns actual documents | NEW |
| 6.5-PERF-001 | Performance | P1 | Query completes within 500ms | NEW |

### AC-6.5.2: Metadata Filtering

**Tests Required:**

| Test ID | Test Level | Priority | Description | Status |
|---------|------------|----------|-------------|--------|
| 6.5-UNIT-007 | Unit | P0 | Niche filter correctly applied to where clause | EXISTS |
| 6.5-UNIT-008 | Unit | P0 | ChannelId filter correctly applied | EXISTS |
| 6.5-UNIT-009 | Unit | P0 | Date range filter with start and end dates | EXISTS |
| 6.5-UNIT-010 | Unit | P1 | Combined filters work together (AND logic) | EXISTS |
| 6.5-UNIT-011 | Unit | P2 | Empty filters return unfiltered results | NEW |
| 6.5-UNIT-012 | Unit | P2 | Partial date range (start only, end only) | NEW |

### AC-6.5.3: RAGContext Assembly

**Tests Required:**

| Test ID | Test Level | Priority | Description | Status |
|---------|------------|----------|-------------|--------|
| 6.5-UNIT-013 | Unit | P0 | retrieveRAGContext returns empty when RAG disabled | EXISTS |
| 6.5-UNIT-014 | Unit | P0 | Established mode queries user's channel_content | EXISTS |
| 6.5-UNIT-015 | Unit | P0 | Cold start mode skips channel content query | EXISTS |
| 6.5-UNIT-016 | Unit | P1 | Competitor channels queried with correct filters | NEW |
| 6.5-UNIT-017 | Unit | P1 | News articles queried with niche and 7-day filter | EXISTS |
| 6.5-UNIT-018 | Unit | P1 | Trending topics queried when enabled | EXISTS |
| 6.5-UNIT-019 | Unit | P1 | All collection queries run in parallel | NEW |
| 6.5-INT-002 | Integration | P0 | Full RAGContext assembled from all collections | NEW |

### AC-6.5.4: Token Limit Management

**Tests Required:**

| Test ID | Test Level | Priority | Description | Status |
|---------|------------|----------|-------------|--------|
| 6.5-UNIT-020 | Unit | P0 | countTokens approximates chars/4 | EXISTS |
| 6.5-UNIT-021 | Unit | P0 | truncateRAGContext keeps under 4000 tokens | EXISTS |
| 6.5-UNIT-022 | Unit | P0 | Truncation removes lowest-scored documents first | EXISTS |
| 6.5-UNIT-023 | Unit | P0 | No mid-document cuts (whole entries only) | EXISTS |
| 6.5-UNIT-024 | Unit | P1 | Priority weights favor channel content | EXISTS |
| 6.5-UNIT-025 | Unit | P1 | Context unchanged if already under limit | EXISTS |
| 6.5-UNIT-026 | Unit | P2 | Custom max tokens parameter works | NEW |
| 6.5-UNIT-027 | Unit | P2 | Custom priority weights respected | NEW |

### AC-6.5.5: Graceful Degradation

**Tests Required:**

| Test ID | Test Level | Priority | Description | Status |
|---------|------------|----------|-------------|--------|
| 6.5-UNIT-028 | Unit | P0 | Empty collections return empty arrays | EXISTS |
| 6.5-UNIT-029 | Unit | P0 | ChromaDB errors caught and logged | EXISTS |
| 6.5-UNIT-030 | Unit | P0 | Context assembly continues after partial failure | EXISTS |
| 6.5-UNIT-031 | Unit | P1 | Invalid project RAG config handled gracefully | EXISTS |
| 6.5-UNIT-032 | Unit | P1 | Missing niche uses project niche fallback | EXISTS |
| 6.5-INT-003 | Integration | P1 | System functions when ChromaDB unavailable | NEW |

### AC-6.5.6: Performance

**Tests Required:**

| Test ID | Test Level | Priority | Description | Status |
|---------|------------|----------|-------------|--------|
| 6.5-UNIT-033 | Unit | P0 | Query embeddings cached after first call | EXISTS |
| 6.5-UNIT-034 | Unit | P1 | Cache TTL expires after 5 minutes | NEW |
| 6.5-UNIT-035 | Unit | P1 | Cache stats tracked (size, age) | EXISTS |
| 6.5-UNIT-036 | Unit | P2 | Cache cleared via clearEmbeddingCache() | EXISTS |
| 6.5-PERF-002 | Performance | P1 | Retrieval completes within 500ms | NEW |
| 6.5-PERF-003 | Performance | P2 | Cache hit rate >= 80% for repeated queries | NEW |

### API Endpoint Tests

**Tests Required:**

| Test ID | Test Level | Priority | Description | Status |
|---------|------------|----------|-------------|--------|
| 6.5-API-001 | API | P1 | GET /api/projects/[id]/rag-context returns context | NEW |
| 6.5-API-002 | API | P1 | Query parameter required | NEW |
| 6.5-API-003 | API | P2 | Response includes document counts | NEW |
| 6.5-API-004 | API | P2 | Response includes token usage | NEW |
| 6.5-API-005 | API | P2 | Invalid project ID returns 404 | NEW |

### Database Query Tests

**Tests Required:**

| Test ID | Test Level | Priority | Description | Status |
|---------|------------|----------|-------------|--------|
| 6.5-UNIT-037 | Unit | P0 | getProjectRAGConfig returns correct structure | EXISTS |
| 6.5-UNIT-038 | Unit | P0 | isProjectRAGEnabled returns boolean | EXISTS |
| 6.5-UNIT-039 | Unit | P1 | getProjectUserChannelId extracts channel ID | EXISTS |
| 6.5-UNIT-040 | Unit | P1 | getProjectCompetitorChannels returns array | EXISTS |
| 6.5-UNIT-041 | Unit | P1 | getProjectNiche returns niche string | EXISTS |
| 6.5-UNIT-042 | Unit | P2 | getRAGContextStats calculates statistics | EXISTS |

---

## Test Priority Summary

| Priority | Count | Coverage Target | Run Frequency |
|----------|-------|-----------------|---------------|
| P0 (Critical) | 18 | 100% | Every commit |
| P1 (High) | 22 | 95% | Every PR |
| P2 (Medium) | 12 | 90% | Nightly |
| P3 (Low) | 0 | - | On demand |
| **Total** | **52** | **95%+** | - |

---

## Existing Test Analysis

**Files Found:**
1. `tests/unit/rag/semantic-search.test.ts` - 13 tests
2. `tests/unit/rag/context-builder.test.ts` - 18 tests
3. `tests/unit/rag/token-counter.test.ts` - 12 tests

**Total Existing:** 43 tests

**Coverage Assessment:**
- AC-6.5.1 (Semantic Search): 8/8 tests - EXCELLENT
- AC-6.5.2 (Metadata Filtering): 5/6 tests - GOOD (missing partial date range)
- AC-6.5.3 (RAGContext Assembly): 6/8 tests - GOOD (missing competitor/parallel)
- AC-6.5.4 (Token Management): 6/8 tests - GOOD (missing custom params)
- AC-6.5.5 (Graceful Degradation): 5/6 tests - GOOD (missing ChromaDB unavailable)
- AC-6.5.6 (Performance): 4/6 tests - ACCEPTABLE (missing TTL expiry, perf)
- API Endpoint: 0/5 tests - MISSING
- Database Queries: 6/6 tests - COMPLETE

**Gap Summary:**
- 9 new tests needed for complete coverage
- API endpoint tests not yet implemented
- Performance tests not yet implemented

---

## Execution Order

### Smoke Tests (< 2 min)

1. countTokens returns positive integer for text
2. queryRelevantContent returns array
3. retrieveRAGContext returns valid structure
4. getProjectRAGConfig returns config object

### P0 Tests (< 5 min)

1. Semantic search returns top 5 sorted by score
2. Metadata filters applied correctly
3. RAGContext assembly for established mode
4. Token truncation under 4000 limit
5. Empty collections return empty arrays
6. ChromaDB errors handled gracefully
7. Query embedding cache works

### P1 Tests (< 10 min)

1. All metadata filter combinations
2. RAGContext for cold start mode
3. Competitor channel queries
4. News article date filtering
5. Trending topics query
6. Priority weights in truncation
7. Cache TTL expiry
8. API endpoint returns context
9. Performance < 500ms

### P2/P3 Tests (< 20 min)

1. Partial date range filters
2. Custom max tokens
3. Custom priority weights
4. API response includes stats
5. Cache hit rate validation

---

## Test Data Requirements

### Mock Data

```typescript
// Mock RetrievedDocument
const mockDocument: RetrievedDocument = {
  id: 'doc-123',
  content: 'Sample video transcript about military technology...',
  metadata: {
    niche: 'military',
    channel_id: 'UC123',
    published_at: '2025-11-25T10:00:00Z'
  },
  score: 0.85
};

// Mock RAGConfig
const mockRAGConfig: RAGConfig = {
  mode: 'established',
  userChannelId: 'UC123',
  competitorChannels: ['UC456', 'UC789'],
  niche: 'military',
  newsEnabled: true,
  trendsEnabled: false,
  syncFrequency: 'daily'
};

// Mock RAGContext
const mockRAGContext: RAGContext = {
  channelContent: [mockDocument],
  competitorContent: [],
  newsArticles: [],
  trendingTopics: []
};
```

### Test Fixtures

- `fixtures/rag/project-established.json` - Project with established mode config
- `fixtures/rag/project-cold-start.json` - Project with cold start config
- `fixtures/rag/context-full.json` - RAGContext with all categories populated
- `fixtures/rag/documents-mixed-scores.json` - Documents for truncation testing

---

## Quality Gate Criteria

### Pass Criteria

- [ ] All P0 tests pass (100%)
- [ ] P1 tests pass rate >= 95%
- [ ] No high-risk (score >= 6) items unmitigated
- [ ] Performance: retrieval < 500ms
- [ ] Token truncation keeps context under 4000 tokens

### Gate Decision Rules

| Condition | Decision |
|-----------|----------|
| All P0 pass, P1 >= 95%, risks mitigated | PASS |
| P0 >= 95%, P1 >= 90%, 1 medium risk open | PASS with CONCERNS |
| P0 < 95% OR high risk unmitigated | FAIL |

---

## Implementation Notes

### Mocking Strategy

**ChromaDB Client:**
```typescript
vi.mock('@/lib/rag/vector-db/chroma-client', () => ({
  getChromaClientIfEnabled: vi.fn()
}));
```

**Database Client:**
```typescript
vi.mock('@/lib/db/client', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      all: vi.fn()
    }))
  }
}));
```

**Embeddings Service:**
```typescript
vi.mock('@/lib/rag/embeddings/local-embeddings', () => ({
  generateEmbedding: vi.fn()
}));
```

### Edge Cases to Test

1. Empty query string
2. Query with special characters
3. Project with no RAG config
4. Collection with 0 documents
5. Collection with exactly 5 documents
6. Token count exactly at 4000 limit
7. All documents have same score (truncation order)
8. Date range spanning year boundary

---

## References

- Story: `docs/stories/stories-epic-6/story-6.5.md`
- Tech Spec: `docs/sprint-artifacts/tech-spec-epic-6.md`
- Architecture: `docs/architecture.md` - Section 19 (RAG Architecture)
- Story 6.1: RAG Infrastructure (ChromaDB, embeddings)
- Story 6.3: YouTube Channel Sync (channel_content collection)
- Story 6.4: News Source Ingestion (news_articles collection)

---

**Generated by:** BMad TEA Agent - Test Architect Module
**Workflow:** `.bmad/bmm/testarch/test-design`
**Version:** 4.0 (BMad v6)
