# Test Design: Epic 6.3 - YouTube Channel Sync & Caption Scraping

**Date:** 2025-12-01
**Author:** master
**Status:** Draft
**Mode:** Epic-Level (Phase 4)

---

## Executive Summary

**Scope:** Full test design for Story 6.3 - YouTube Channel Sync & Caption Scraping
**Story Status:** Done (Completed 2025-11-30)

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (score >=6): 3
- Critical categories: TECH, PERF, DATA, OPS

**Coverage Summary:**

- P0 scenarios: 8 (~16 hours)
- P1 scenarios: 12 (~12 hours)
- P2/P3 scenarios: 10 (~5 hours)
- **Total effort**: 33 hours (~4.5 days)

**Current Test Status:**

Story 6.3 reports 66 tests passing:
- Python bridge tests: 8 tests
- Channel service tests: 7 tests
- Channel sync service tests: 9 tests
- Database query tests: 18 tests
- RAG infrastructure tests: 24 tests

---

## Risk Assessment

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-6.3-001 | TECH | Python subprocess bridge failure - youtube-transcript-api subprocess may hang, crash, or return malformed JSON | 2 | 3 | 6 | Add timeout handling (30s max), JSON validation, subprocess health checks | Dev | Before release |
| R-6.3-002 | PERF | Channel sync exceeds 5-minute target for 50 videos - Rate limiting (500ms delay) + transcript scraping + embedding generation may cascade | 2 | 3 | 6 | Profile sync pipeline, parallel transcript batching where safe, progress checkpointing | Dev | Before release |
| R-6.3-003 | DATA | Transcript data loss during ChromaDB storage - Embeddings stored but metadata or transcript text lost | 2 | 3 | 6 | Atomic transaction pattern, verification after storage, rollback on partial failure | Dev | Before release |

### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-6.3-004 | OPS | Rate limiting by YouTube/youtube-transcript-api | 3 | 2 | 6 | Exponential backoff (2s, 4s, 8s), configurable delay, retry logic | Dev |
| R-6.3-005 | TECH | Invalid channel identifier formats not properly handled | 2 | 2 | 4 | URL parsing for channel/handle/@/c/ formats, validation before API call | Dev |
| R-6.3-006 | DATA | Incremental sync misses videos (publishedAfter filter edge cases) | 2 | 2 | 4 | Overlap window (1 hour buffer), deduplication on upsert | Dev |
| R-6.3-007 | BUS | Videos without captions silently fail without user feedback | 2 | 2 | 4 | Clear embedding_status values, progress reporting with skip counts | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-6.3-008 | OPS | Python dependency version conflicts | 1 | 2 | 2 | Pin youtube-transcript-api version, document requirements.txt | Monitor |
| R-6.3-009 | TECH | ISO 8601 duration parsing edge cases (very long videos) | 1 | 1 | 1 | Unit tests for duration parsing regex | Monitor |
| R-6.3-010 | BUS | Channel metadata changes between syncs | 1 | 1 | 1 | Upsert pattern handles updates | Monitor |

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

**Criteria**: Blocks core journey + High risk (>=6) + No workaround

| Test ID | Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|---------|-------------|------------|-----------|------------|-------|-------|
| 6.3-UNIT-001 | AC-6.3.2: Python bridge returns valid transcript JSON | Unit | R-6.3-001 | 3 | QA | Test valid output, empty array, malformed response |
| 6.3-UNIT-002 | AC-6.3.4: Rate limiting enforces 500ms minimum delay | Unit | R-6.3-004 | 2 | Dev | Verify delay between calls, retry on RATE_LIMITED |
| 6.3-INT-001 | AC-6.3.1: Channel videos fetched via YouTube API | Integration | R-6.3-005 | 3 | QA | Test channel ID, @handle, URL formats |
| 6.3-INT-002 | AC-6.3.3: Embedding stored in ChromaDB with metadata | Integration | R-6.3-003 | 2 | QA | Verify metadata: channelId, videoId, title, publishedAt |
| 6.3-INT-003 | AC-6.3.5: Incremental sync uses publishedAfter filter | Integration | R-6.3-006 | 2 | QA | Verify only new videos processed |
| 6.3-API-001 | AC-6.3.1: Channel sync job handler processes channel | API | R-6.3-002 | 2 | QA | POST /api/rag/channels/[id]/sync |

**Total P0**: 14 tests, 16 hours

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-5) + Common workflows

| Test ID | Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|---------|-------------|------------|-----------|------------|-------|-------|
| 6.3-UNIT-003 | AC-6.3.6: Videos without captions set embedding_status='no_captions' | Unit | R-6.3-007 | 2 | Dev | Test NO_CAPTIONS, VIDEO_UNAVAILABLE, AGE_RESTRICTED |
| 6.3-UNIT-004 | Error code to embedding status mapping | Unit | R-6.3-007 | 2 | Dev | All 10 TranscriptErrorCode values |
| 6.3-UNIT-005 | isRecoverableError identifies retry-able errors | Unit | R-6.3-004 | 2 | Dev | RATE_LIMITED, TIMEOUT vs NO_CAPTIONS |
| 6.3-INT-004 | Channel CRUD operations (create, read, update, delete) | Integration | - | 4 | QA | Database query functions |
| 6.3-INT-005 | Channel video CRUD operations | Integration | - | 4 | QA | upsert, getByYouTubeId, getUnprocessed |
| 6.3-INT-006 | getVideosNeedingEmbedding returns correct videos | Integration | R-6.3-003 | 2 | QA | Pending status filter |
| 6.3-API-002 | Channel management API endpoints | API | - | 4 | QA | GET/POST /api/rag/channels |
| 6.3-API-003 | Channel detail API endpoints | API | - | 3 | QA | GET/DELETE /api/rag/channels/[id] |

**Total P1**: 23 tests, 12 hours

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Test ID | Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|---------|-------------|------------|-----------|------------|-------|-------|
| 6.3-UNIT-006 | ISO 8601 duration parsing (PT5M30S, PT1H30M, PT45S) | Unit | R-6.3-009 | 3 | Dev | Regex pattern coverage |
| 6.3-UNIT-007 | Channel identifier resolution (URL, handle, ID) | Unit | R-6.3-005 | 3 | Dev | Various YouTube URL formats |
| 6.3-INT-007 | getChannelVideoCount and getEmbeddedVideoCount | Integration | - | 2 | Dev | Count aggregation queries |
| 6.3-INT-008 | getLatestVideoDate for incremental sync | Integration | R-6.3-006 | 2 | Dev | Null handling, date format |

**Total P2**: 10 tests, 4 hours

### P3 (Low) - Run on-demand

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Test ID | Requirement | Test Level | Test Count | Owner | Notes |
|---------|-------------|------------|------------|-------|-------|
| 6.3-PERF-001 | AC-6.3.7: 50-video sync completes within 5 minutes | Performance | 3 | QA | Full sync, incremental, with embeddings |
| 6.3-PERF-002 | Progress events emitted at milestones | Performance | 2 | Dev | Event timing and milestone verification |
| 6.3-PERF-003 | Rate limiting and scalability | Performance | 3 | Dev | Rate limits, large channels, concurrency |

**Total P3**: 8 tests, 2 hours

**Test File**: `tests/integration/rag/channel-sync-performance.test.ts` (IMPLEMENTED)

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [x] Python bridge returns valid JSON for empty input (30s)
- [x] Database client connects successfully (15s)
- [x] ChromaDB client initializes (30s)

**Total**: 3 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical path validation

- [x] 6.3-UNIT-001: Python bridge transcript parsing (Unit)
- [x] 6.3-UNIT-002: Rate limiting delay enforcement (Unit)
- [x] 6.3-INT-001: YouTube channel resolution (Integration)
- [x] 6.3-INT-002: ChromaDB embedding storage (Integration)
- [x] 6.3-INT-003: Incremental sync filtering (Integration)
- [x] 6.3-API-001: Sync job handler (API)

**Total**: 14 scenarios

### P1 Tests (<30 min)

**Purpose**: Important feature coverage

- [x] 6.3-UNIT-003: Graceful caption handling (Unit)
- [x] 6.3-UNIT-004: Error code mapping (Unit)
- [x] 6.3-UNIT-005: Recoverable error detection (Unit)
- [x] 6.3-INT-004-006: Database CRUD operations (Integration)
- [x] 6.3-API-002-003: Channel management APIs (API)

**Total**: 23 scenarios

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage

- [x] 6.3-UNIT-006-007: Parsing and resolution edge cases (Unit)
- [x] 6.3-INT-007-008: Count and date queries (Integration)
- [ ] 6.3-PERF-001-002: Performance benchmarks (Performance)

**Total**: 12 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 14 | 1.0 | 14 | Critical paths, complex setup |
| P1 | 23 | 0.5 | 11.5 | Standard coverage |
| P2 | 10 | 0.4 | 4 | Simple scenarios |
| P3 | 2 | 0.5 | 1 | Performance benchmarks |
| **Total** | **49** | **-** | **30.5** | **~4 days** |

### Prerequisites

**Test Data:**

- `createMockChannel()` factory (faker-based, auto-cleanup)
- `createMockVideo()` factory with transcript variants
- `createMockTranscriptResult()` for Python bridge output
- RAG fixtures from `tests/fixtures/rag-fixtures.ts`

**Tooling:**

- Vitest for unit/integration tests
- MSW or vi.mock for YouTube API mocking
- SQLite in-memory for database tests
- ChromaDB test collection isolation

**Environment:**

- Python 3.10+ with youtube-transcript-api>=0.6.0
- Node.js subprocess spawn capability
- Write access to .cache/chroma test directory

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: >=95% (waivers required for failures)
- **P2/P3 pass rate**: >=90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths**: >=80% (channel sync pipeline)
- **Error handling**: 100% (all 10 TranscriptErrorCode values)
- **Database queries**: >=90% (all CRUD operations)
- **API endpoints**: 100% (all 4 endpoints)

### Non-Negotiable Requirements

- [x] All P0 tests pass
- [x] No high-risk (>=6) items unmitigated
- [x] Python bridge error handling tested 100%
- [x] Rate limiting behavior verified
- [x] Incremental sync logic covered

---

## Mitigation Plans

### R-6.3-001: Python subprocess bridge failure (Score: 6)

**Mitigation Strategy:**
1. Add 30-second timeout per video transcript request
2. Validate JSON output before parsing
3. Implement subprocess health check before batch operations
4. Log subprocess stderr for debugging

**Owner:** Dev
**Status:** Implemented (Story 6.3 completed)
**Verification:** 6.3-UNIT-001 tests timeout and error handling

### R-6.3-002: Channel sync exceeds 5-minute target (Score: 6)

**Mitigation Strategy:**
1. Profile each pipeline stage (fetch, scrape, embed, store)
2. Implement progress checkpointing for resume-on-failure
3. Consider parallel transcript processing (respecting rate limits)
4. Emit progress events for user feedback

**Owner:** Dev
**Status:** Implemented (AC-6.3.7 verified)
**Verification:** 6.3-PERF-001 benchmarks full sync

### R-6.3-003: Transcript data loss during ChromaDB storage (Score: 6)

**Mitigation Strategy:**
1. Store transcript in SQLite BEFORE embedding generation
2. Update embedding_status to 'embedded' only after ChromaDB confirms
3. Implement verification query after storage
4. Log discrepancies for monitoring

**Owner:** Dev
**Status:** Implemented
**Verification:** 6.3-INT-002 verifies metadata persistence

---

## Acceptance Criteria Traceability

| AC ID | Description | Test Coverage | Status |
|-------|-------------|---------------|--------|
| AC-6.3.1 | Channel video fetching (up to 50 videos) | 6.3-INT-001, 6.3-UNIT-007 | Covered |
| AC-6.3.2 | Transcript scraping via Python | 6.3-UNIT-001, python-bridge.test.ts | Covered |
| AC-6.3.3 | Embedding storage in ChromaDB | 6.3-INT-002 | Covered |
| AC-6.3.4 | Rate limiting (500ms minimum delay) | 6.3-UNIT-002 | Covered |
| AC-6.3.5 | Incremental sync logic | 6.3-INT-003, channel-sync.test.ts | Covered |
| AC-6.3.6 | Graceful caption handling | 6.3-UNIT-003, 6.3-UNIT-004 | Covered |
| AC-6.3.7 | Sync performance (<5 min for 50 videos) | 6.3-PERF-001 | Planned |

---

## Existing Test Analysis

### Current Test Files (74 tests total)

| File | Tests | Coverage |
|------|-------|----------|
| `tests/unit/rag/python-bridge.test.ts` | 8 | Error handling, recoverable errors, embedding status mapping |
| `tests/unit/rag/youtube-channel.test.ts` | 7 | Duration parsing, identifier resolution |
| `tests/unit/rag/channel-sync.test.ts` | 9 | addChannel, syncChannel, incremental sync |
| `tests/unit/rag/queries-channels.test.ts` | 18 | All CRUD operations |
| `tests/integration/rag/channel-sync-performance.test.ts` | 8 | **NEW** AC-6.3.7 performance, progress events, scalability |
| RAG infrastructure tests | 24 | ChromaDB, embeddings, job queue |

### Coverage Gaps Identified

1. ~~**Performance benchmarks** - AC-6.3.7 sync time not automated~~ **RESOLVED**
2. ~~**Progress event verification** - Events emitted but not tested~~ **RESOLVED**
3. **Full integration with real YouTube API** - Only mocked (acceptable)
4. **ChromaDB collection verification** - Metadata completeness not verified

### Recommendations

1. ~~Add `6.3-PERF-001` test for 50-video sync benchmark~~ **DONE** - `channel-sync-performance.test.ts`
2. ~~Add progress event emission test in channel-sync.test.ts~~ **DONE** - Included in performance tests
3. Consider integration test with ChromaDB verifying stored metadata

---

## Assumptions and Dependencies

### Assumptions

1. Python 3.10+ is available on the development/CI environment
2. youtube-transcript-api maintains current API compatibility
3. YouTube Data API quota is sufficient for test runs
4. ChromaDB local persistence works reliably

### Dependencies

1. youtube-transcript-api>=0.6.0 - Required for transcript scraping
2. ChromaDB>=0.5.0 - Required for vector storage
3. googleapis - Required for YouTube Data API

### Risks to Plan

- **Risk**: YouTube API quota exhaustion in CI
  - **Impact**: Integration tests fail
  - **Contingency**: Mock API responses in CI, run real API tests manually

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
- `test-priorities-matrix.md` - P0-P3 prioritization

### Related Documents

- PRD: Feature 2.7 - Channel Intelligence & Content Research (RAG-Powered)
- Epic: docs/epics.md - Epic 6
- Architecture: docs/architecture.md - Section 19 (RAG Architecture)
- Tech Spec: docs/sprint-artifacts/tech-spec-epic-6.md

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `.bmad/bmm/testarch/test-design`
**Version**: 4.0 (BMad v6)
