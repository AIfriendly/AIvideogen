# Test Design: Story 6.4 - News Feed Aggregation & Embedding

**Date:** 2025-12-01
**Author:** master
**Status:** Draft
**Story:** 6.4 - News Feed Aggregation & Embedding
**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)

---

## Executive Summary

**Scope:** Full test design for Story 6.4 - News Feed Aggregation & Embedding

**Story Value:** Creators receive scripts that reference current news and events in their niche, making content more timely and relevant.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (score >=6): 2
- Critical categories: DATA, PERF, TECH

**Coverage Summary:**

- P0 scenarios: 12 tests (6 hours)
- P1 scenarios: 18 tests (9 hours)
- P2 scenarios: 14 tests (3.5 hours)
- P3 scenarios: 8 tests (1 hour)
- **Total**: 52 tests, 19.5 hours (~2.5 days)

---

## Acceptance Criteria Analysis

| AC ID | Acceptance Criteria | Testability | Priority |
|-------|---------------------|-------------|----------|
| AC-6.4.1 | Pre-configured News Sources (7 military sources) | High | P1 |
| AC-6.4.2 | RSS Feed Parsing (headline, summary, URL, publishedAt) | High | P0 |
| AC-6.4.3 | Embedding Storage in ChromaDB | High | P0 |
| AC-6.4.4 | Deduplication (by URL) | High | P0 |
| AC-6.4.5 | Automatic Pruning (7-day retention) | High | P1 |
| AC-6.4.6 | Cron Scheduling (every 4 hours, no duplicates) | Medium | P1 |
| AC-6.4.7 | Error Isolation (one source failure doesn't stop others) | High | P0 |
| AC-6.4.8 | Performance (completes within 2 minutes) | High | P1 |

---

## Risk Assessment

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|------|--------|-------|------------|-------|----------|
| R-001 | DATA | RSS parsing may corrupt or lose article data due to malformed feeds | 2 | 3 | 6 | Implement item-level error handling; validate each RSS item before storage; log skipped items | DEV | Story 6.4 |
| R-002 | PERF | ChromaDB embedding storage may cause bottleneck during batch operations | 2 | 3 | 6 | Implement batch embedding (10 at a time); add progress tracking; timeout protection | DEV | Story 6.4 |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Prob | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|------|--------|-------|------------|-------|
| R-003 | TECH | RSS feed URLs may change or become unavailable | 2 | 2 | 4 | Graceful failure per source; log unavailable sources; continue with remaining | DEV |
| R-004 | TECH | Cron scheduler may create duplicate schedules on app restart | 2 | 2 | 4 | Use INSERT OR IGNORE for schedule creation; unique constraint on schedule name | DEV |
| R-005 | DATA | Deduplication by URL may miss semantically duplicate articles | 2 | 2 | 4 | URL-based deduplication as primary; log potential duplicates for review | DEV |
| R-006 | PERF | Network timeout during RSS fetch may block entire sync | 2 | 2 | 4 | 10s timeout per source; parallel source processing if safe; progress updates | DEV |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Prob | Impact | Score | Action |
|---------|----------|-------------|------|--------|-------|--------|
| R-007 | OPS | Migration 014 may fail on existing databases | 1 | 2 | 2 | Test migration on existing db; rollback plan |
| R-008 | BUS | Truncated summaries may lose important context | 1 | 2 | 2 | 500 char limit is reasonable; log truncation |
| R-009 | TECH | rss-parser library may have compatibility issues | 1 | 2 | 2 | Monitor for errors; fallback to manual parsing |
| R-010 | OPS | Pruning may accidentally delete recent articles | 1 | 2 | 2 | Test boundary conditions; use >= 7 days |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## Test Coverage Plan

### P0 (Critical) - Run on every commit

**Criteria**: Core RSS parsing + Data integrity + Error isolation

| Test ID | Requirement | Test Level | Risk Link | Description | Owner |
|---------|-------------|------------|-----------|-------------|-------|
| 6.4-UNIT-001 | AC-6.4.2 | Unit | R-001 | Parse valid RSS feed with all fields present | DEV |
| 6.4-UNIT-002 | AC-6.4.2 | Unit | R-001 | Parse RSS feed with missing optional fields | DEV |
| 6.4-UNIT-003 | AC-6.4.2 | Unit | R-001 | Skip malformed RSS items, continue with valid items | DEV |
| 6.4-UNIT-004 | AC-6.4.2 | Unit | R-001 | Handle empty RSS feed (0 items) | DEV |
| 6.4-UNIT-005 | AC-6.4.4 | Unit | R-005 | Detect duplicate article by URL | DEV |
| 6.4-UNIT-006 | AC-6.4.4 | Unit | R-005 | Skip embedding generation for existing articles | DEV |
| 6.4-UNIT-007 | AC-6.4.7 | Unit | - | One source failure does not stop other sources | DEV |
| 6.4-UNIT-008 | AC-6.4.7 | Unit | R-003 | Network timeout handled gracefully per source | DEV |
| 6.4-INT-001 | AC-6.4.3 | Integration | R-002 | Store embedding in ChromaDB news_articles collection | QA |
| 6.4-INT-002 | AC-6.4.3 | Integration | R-002 | Embedding metadata includes sourceId, niche, publishedAt, URL | QA |
| 6.4-INT-003 | AC-6.4.4 | Integration | R-005 | No duplicate entries in ChromaDB after re-fetch | QA |
| 6.4-INT-004 | AC-6.4.7 | Integration | - | Error isolated: 1 failing source, 6 succeed | QA |

**Total P0**: 12 tests, 6 hours

### P1 (High) - Run on PR to main

**Criteria**: Configuration + Pruning + Scheduling + Performance

| Test ID | Requirement | Test Level | Risk Link | Description | Owner |
|---------|-------------|------------|-----------|-------------|-------|
| 6.4-UNIT-009 | AC-6.4.1 | Unit | - | 7 military news sources pre-configured | DEV |
| 6.4-UNIT-010 | AC-6.4.1 | Unit | - | Each source has name, URL, niche, fetch_method | DEV |
| 6.4-UNIT-011 | AC-6.4.1 | Unit | - | getEnabledNewsSources returns only enabled sources | DEV |
| 6.4-UNIT-012 | AC-6.4.1 | Unit | - | getNicheNewsSources filters by niche | DEV |
| 6.4-UNIT-013 | AC-6.4.5 | Unit | R-010 | Prune articles older than 7 days | DEV |
| 6.4-UNIT-014 | AC-6.4.5 | Unit | R-010 | Preserve articles within 7-day window | DEV |
| 6.4-UNIT-015 | AC-6.4.2 | Unit | R-001 | Normalize dates to ISO 8601 format | DEV |
| 6.4-UNIT-016 | AC-6.4.2 | Unit | R-008 | Truncate summary to 500 characters | DEV |
| 6.4-INT-005 | AC-6.4.5 | Integration | R-010 | Pruning removes from both SQLite and ChromaDB | QA |
| 6.4-INT-006 | AC-6.4.6 | Integration | R-004 | Cron schedule created on first startup | QA |
| 6.4-INT-007 | AC-6.4.6 | Integration | R-004 | No duplicate schedules on subsequent startups | QA |
| 6.4-INT-008 | AC-6.4.6 | Integration | - | Schedule triggers every 4 hours (cron expression) | QA |
| 6.4-INT-009 | AC-6.4.5 | Integration | - | Pruning called at end of news fetch job | QA |
| 6.4-PERF-001 | AC-6.4.8 | Performance | R-002 | Full 7-source sync completes within 2 minutes | QA |
| 6.4-PERF-002 | AC-6.4.8 | Performance | R-006 | Progress updates emitted during processing | QA |
| 6.4-API-001 | API | API | - | GET /api/rag/news returns list of sources | QA |
| 6.4-API-002 | API | API | - | PATCH /api/rag/news/[id] toggles enabled flag | QA |
| 6.4-API-003 | API | API | - | POST /api/rag/news/sync triggers manual sync | QA |

**Total P1**: 18 tests, 9 hours

### P2 (Medium) - Run nightly/weekly

**Criteria**: Database queries + Edge cases + Error handling details

| Test ID | Requirement | Test Level | Risk Link | Description | Owner |
|---------|-------------|------------|-----------|-------------|-------|
| 6.4-UNIT-017 | DB Queries | Unit | - | createNewsArticle inserts record correctly | DEV |
| 6.4-UNIT-018 | DB Queries | Unit | - | getNewsArticleByUrl returns existing article | DEV |
| 6.4-UNIT-019 | DB Queries | Unit | - | getNewsArticlesByNiche filters and limits | DEV |
| 6.4-UNIT-020 | DB Queries | Unit | - | deleteOldNewsArticles removes expired articles | DEV |
| 6.4-UNIT-021 | DB Queries | Unit | - | getUnembeddedArticles returns pending articles | DEV |
| 6.4-UNIT-022 | DB Queries | Unit | - | updateArticleEmbeddingStatus updates status | DEV |
| 6.4-UNIT-023 | DB Queries | Unit | - | updateNewsSourceLastFetch updates timestamp | DEV |
| 6.4-UNIT-024 | AC-6.4.2 | Unit | R-001 | Parse contentSnippet when description missing | DEV |
| 6.4-UNIT-025 | AC-6.4.2 | Unit | R-001 | Parse content:encoded when description missing | DEV |
| 6.4-UNIT-026 | AC-6.4.2 | Unit | - | Skip items missing headline (title) | DEV |
| 6.4-UNIT-027 | AC-6.4.2 | Unit | - | Skip items missing URL (link) | DEV |
| 6.4-INT-010 | Migration | Integration | R-007 | Migration 014 adds embedding_status column | QA |
| 6.4-INT-011 | Migration | Integration | R-007 | Index on embedding_status created | QA |
| 6.4-INT-012 | AC-6.4.3 | Integration | - | Embedding uses headline + summary concatenation | QA |

**Total P2**: 14 tests, 3.5 hours

### P3 (Low) - Run on-demand

**Criteria**: Exploratory + Boundary conditions + Documentation

| Test ID | Requirement | Test Level | Description | Owner |
|---------|-------------|------------|-------------|-------|
| 6.4-UNIT-028 | Edge Case | Unit | Empty headline after trimming | DEV |
| 6.4-UNIT-029 | Edge Case | Unit | URL with special characters | DEV |
| 6.4-UNIT-030 | Edge Case | Unit | Summary exactly 500 characters (boundary) | DEV |
| 6.4-UNIT-031 | Edge Case | Unit | Article published exactly 7 days ago (boundary) | DEV |
| 6.4-INT-013 | Load | Integration | Process 100+ articles in single batch | QA |
| 6.4-INT-014 | Load | Integration | Concurrent news fetch jobs | QA |
| 6.4-PERF-003 | Benchmark | Performance | Embedding generation <500ms per article | QA |
| 6.4-PERF-004 | Benchmark | Performance | Pruning <10s for 500 articles | QA |

**Total P3**: 8 tests, 1 hour

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] RSS parser loads without error (30s)
- [ ] ChromaDB connection succeeds (30s)
- [ ] News sources configuration loads (30s)
- [ ] Migration 014 applies cleanly (1min)
- [ ] rss-parser dependency resolves (30s)

**Total**: 5 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical path validation - RSS parsing, embedding, deduplication, error isolation

- [ ] 6.4-UNIT-001: Parse valid RSS feed (Unit)
- [ ] 6.4-UNIT-003: Skip malformed items (Unit)
- [ ] 6.4-UNIT-005: Detect duplicate by URL (Unit)
- [ ] 6.4-UNIT-007: Error isolation between sources (Unit)
- [ ] 6.4-INT-001: Store embedding in ChromaDB (Integration)
- [ ] 6.4-INT-004: Error isolated across sources (Integration)

**Total**: 12 scenarios

### P1 Tests (<30 min)

**Purpose**: Important feature coverage - configuration, pruning, scheduling

- [ ] 6.4-UNIT-009: 7 military sources configured (Unit)
- [ ] 6.4-UNIT-013: Prune old articles (Unit)
- [ ] 6.4-INT-006: Cron schedule created (Integration)
- [ ] 6.4-INT-007: No duplicate schedules (Integration)
- [ ] 6.4-PERF-001: 2-minute completion (Performance)
- [ ] 6.4-API-001: GET news sources (API)

**Total**: 18 scenarios

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage - database queries, edge cases

- [ ] 6.4-UNIT-017-027: Database query functions (Unit)
- [ ] 6.4-INT-010-012: Migration and embedding details (Integration)
- [ ] 6.4-PERF-003-004: Benchmark tests (Performance)

**Total**: 22 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 12 | 0.5 | 6 | Core parsing, data integrity |
| P1 | 18 | 0.5 | 9 | Configuration, scheduling |
| P2 | 14 | 0.25 | 3.5 | Database queries, edge cases |
| P3 | 8 | 0.125 | 1 | Exploratory, benchmarks |
| **Total** | **52** | **-** | **19.5** | **~2.5 days** |

### Prerequisites

**Test Data:**

- `NewsSourceFactory` - Creates mock news source records
- `NewsArticleFactory` - Creates mock article records with faker
- `RSSFeedFixture` - Mock RSS feed XML responses
- `MalformedRSSFixture` - Invalid RSS feed scenarios

**Tooling:**

- Vitest for unit and integration tests
- MSW (Mock Service Worker) for RSS feed mocking
- ChromaDB test collection (isolated)
- SQLite in-memory for database tests

**Environment:**

- Node.js 18+
- Python 3.10+ (for embedding generation)
- rss-parser npm package installed
- ChromaDB server running (or mock)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: >=95% (waivers required for failures)
- **P2/P3 pass rate**: >=90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **RSS Parsing (AC-6.4.2)**: >=90% - Core functionality
- **Deduplication (AC-6.4.4)**: 100% - Data integrity critical
- **Error Isolation (AC-6.4.7)**: 100% - Reliability critical
- **Database Queries**: >=80% - Supporting functionality

### Non-Negotiable Requirements

- [ ] All P0 tests pass (12/12)
- [ ] No high-risk (>=6) items unmitigated
- [ ] RSS parsing handles malformed feeds gracefully
- [ ] Deduplication prevents duplicate embeddings
- [ ] Error isolation verified (one failure doesn't stop others)
- [ ] Performance target met (<2 min for 7 sources)

---

## Mitigation Plans

### R-001: RSS Parsing Data Loss (Score: 6)

**Mitigation Strategy:**
1. Implement try-catch per RSS item (not per feed)
2. Validate required fields (headline, url) before processing
3. Log skipped items with reason for debugging
4. Continue processing valid items after error
5. Return partial success with error count in job result

**Owner:** DEV
**Timeline:** Story 6.4 implementation
**Status:** Planned
**Verification:** 6.4-UNIT-003 (Skip malformed items, continue with valid)

### R-002: ChromaDB Embedding Bottleneck (Score: 6)

**Mitigation Strategy:**
1. Batch embeddings (10 articles at a time)
2. Add progress tracking during batch operations
3. 30-second timeout per embedding batch
4. Async embedding generation with queue
5. Graceful degradation if ChromaDB unavailable

**Owner:** DEV
**Timeline:** Story 6.4 implementation
**Status:** Planned
**Verification:** 6.4-PERF-001 (2-minute completion), 6.4-INT-001 (ChromaDB storage)

---

## Test Scenarios Detail

### AC-6.4.2: RSS Feed Parsing

```typescript
// 6.4-UNIT-001: Parse valid RSS feed
describe('RSS Feed Parsing', () => {
  it('should parse valid RSS feed with all fields', async () => {
    // Given: Valid RSS feed with headline, summary, url, pubDate
    const mockFeed = createValidRSSFeed();

    // When: Parser processes the feed
    const articles = await parseRSSFeed(mockFeed);

    // Then: All articles extracted with correct fields
    expect(articles).toHaveLength(10);
    expect(articles[0]).toMatchObject({
      headline: expect.any(String),
      summary: expect.any(String),
      url: expect.stringMatching(/^https?:\/\//),
      publishedAt: expect.stringMatching(/\d{4}-\d{2}-\d{2}/)
    });
  });

  // 6.4-UNIT-003: Skip malformed items
  it('should skip malformed items and continue with valid', async () => {
    // Given: Feed with mix of valid and malformed items
    const mockFeed = createPartiallyMalformedFeed();

    // When: Parser processes the feed
    const result = await parseRSSFeed(mockFeed);

    // Then: Valid items processed, malformed skipped
    expect(result.articles).toHaveLength(7); // 3 malformed skipped
    expect(result.errors).toHaveLength(3);
    expect(result.errors[0].reason).toContain('missing headline');
  });
});
```

### AC-6.4.4: Deduplication

```typescript
// 6.4-UNIT-005: Detect duplicate by URL
describe('Deduplication', () => {
  it('should detect existing article by URL', async () => {
    // Given: Article already exists in database
    const existingUrl = 'https://defensenews.com/article-123';
    await createNewsArticle({ url: existingUrl });

    // When: Checking for duplicate
    const isDuplicate = await isArticleDuplicate(existingUrl);

    // Then: Duplicate detected
    expect(isDuplicate).toBe(true);
  });

  // 6.4-UNIT-006: Skip embedding for duplicates
  it('should skip embedding generation for existing articles', async () => {
    // Given: Article already indexed
    const existingArticle = await createNewsArticle({ embeddingStatus: 'embedded' });

    // When: News fetch encounters same URL
    const result = await processArticle({ url: existingArticle.url });

    // Then: Embedding skipped, logged as duplicate
    expect(result.action).toBe('skipped');
    expect(result.reason).toBe('duplicate');
  });
});
```

### AC-6.4.7: Error Isolation

```typescript
// 6.4-UNIT-007: Error isolation between sources
describe('Error Isolation', () => {
  it('should continue processing when one source fails', async () => {
    // Given: 7 sources, 1 will fail
    const sources = createMockSources(7);
    mockSourceToFail(sources[2], 'NETWORK_ERROR');

    // When: Sync job runs
    const result = await handleNewsFetch({ sources });

    // Then: 6 sources succeed, 1 logged as failed
    expect(result.succeeded).toBe(6);
    expect(result.failed).toBe(1);
    expect(result.errors[0].sourceId).toBe(sources[2].id);
  });
});
```

---

## Assumptions and Dependencies

### Assumptions

1. rss-parser npm package correctly handles common RSS 2.0 and Atom feeds
2. Military news sources maintain stable RSS feed URLs
3. ChromaDB performance is sufficient for 500+ embeddings
4. Python embedding service (from Story 6.1) is available
5. Job queue (from Story 6.2) handles news fetch jobs correctly

### Dependencies

1. **Migration 013 (Story 6.1)** - news_sources and news_articles tables exist
2. **ChromaDB client (Story 6.1)** - Vector storage available
3. **Local embeddings service (Story 6.1)** - Embedding generation works
4. **Job queue (Story 6.2)** - Background job execution works
5. **rss-parser package** - npm install required

### Risks to Plan

- **Risk**: RSS feed structure changes break parsing
  - **Impact**: News ingestion fails for affected source
  - **Contingency**: Graceful failure, manual source update

- **Risk**: ChromaDB unavailable during tests
  - **Impact**: Integration tests fail
  - **Contingency**: Mock ChromaDB for unit tests, skip integration in CI if unavailable

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: __________ Date: __________
- [ ] Tech Lead: __________ Date: __________
- [ ] QA Lead: __________ Date: __________

**Comments:**

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (6 categories)
- `probability-impact.md` - Risk scoring methodology (1-9 scale)
- `test-levels-framework.md` - Test level selection (Unit/Integration/E2E)
- `test-priorities-matrix.md` - P0-P3 prioritization criteria

### Related Documents

- PRD: Feature 2.7 - Channel Intelligence & Content Research (RAG-Powered)
- Epic: docs/epics.md - Epic 6 Story 6.4
- Architecture: docs/architecture.md - Section 19 (RAG Architecture)
- Tech Spec: docs/sprint-artifacts/tech-spec-epic-6.md

### Pre-configured Military News Sources (from Migration 013)

| ID | Source | RSS URL | Expected Items |
|----|--------|---------|----------------|
| warzone | The War Zone | https://www.thedrive.com/the-war-zone/feed | 20-50 |
| military-com | Military.com | https://www.military.com/rss-feeds | 20-50 |
| defense-news | Defense News | https://www.defensenews.com/arc/outboundfeeds/rss/ | 20-50 |
| breaking-defense | Breaking Defense | https://breakingdefense.com/feed/ | 20-50 |
| defense-one | Defense One | https://www.defenseone.com/rss/all/ | 20-50 |
| military-times | Military Times | https://www.militarytimes.com/arc/outboundfeeds/rss/ | 20-50 |
| janes | Janes Defence News | https://www.janes.com/feeds/news | 10-30 |

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `.bmad/bmm/testarch/test-design`
**Version**: 4.0 (BMad v6)
