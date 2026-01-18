# Test Design: Story 3.3 - YouTube Video Search & Result Retrieval

**Date:** 2025-11-16
**Author:** master (TEA Agent - Murat)
**Story:** 3.3
**Epic:** 3 - Visual Content Sourcing (YouTube API)
**Status:** Draft
**Test Coverage**: 0% (NO TESTS IMPLEMENTED - Critical Issue)

---

## Executive Summary

**Scope:** Comprehensive test design for Story 3.3 (YouTube Video Search & Result Retrieval) with risk-based priority classification

**Critical Finding:** Story 3.3 was marked COMPLETED without any automated tests. This test design document specifies the minimum test coverage required before the story can be considered truly DONE.

**Risk Summary:**

- Total risks identified: **12**
- High-priority risks (≥6): **5** (CRITICAL)
- Medium-priority risks (3-5): **4**
- Low-priority risks (1-2): **3**
- Critical categories: DATA, SEC, TECH, PERF

**Coverage Summary:**

- **P0 scenarios**: 12 tests (24 hours)
- **P1 scenarios**: 10 tests (10 hours)
- **P2 scenarios**: 8 tests (4 hours)
- **P3 scenarios**: 4 tests (1 hour)
- **Total effort**: **39 hours (~5 days)** for Story 3.3 test implementation

**Test Level Distribution:**
- Unit Tests: 7 (multi-query search, duration parsing, deduplication)
- API Integration Tests: 15 (POST/GET endpoints, error handling)
- Database Tests: 7 (schema validation, persistence, cascade deletes)
- E2E Integration Tests: 5 (full workflow, Story 3.1/3.2 integration)

---

## Risk Assessment

### High-Priority Risks (Score ≥6) - IMMEDIATE MITIGATION REQUIRED

| Risk ID | Category | Description                                       | Probability | Impact | Score | Mitigation                                          | Owner | Timeline  |
| ------- | -------- | ------------------------------------------------- | ----------- | ------ | ----- | --------------------------------------------------- | ----- | --------- |
| R-001   | DATA     | Database schema mismatch breaks persistence       | 3 (Likely)  | 3      | **9** | Database schema validation tests                    | Dev   | Day 1     |
| R-002   | TECH     | Multi-query deduplication logic fails             | 2 (Possible) | 3     | **6** | Unit tests for deduplication algorithm              | Dev   | Day 1     |
| R-003   | SEC      | YouTube API quota exceeded breaks app             | 2 (Possible) | 3     | **6** | Error handling tests for quota scenarios            | Dev   | Day 2     |
| R-004   | DATA     | Duration field not populated, Story 3.4 breaks    | 2 (Possible) | 3     | **6** | Integration tests for duration retrieval            | Dev   | Day 1     |
| R-005   | TECH     | Zero results scenario crashes visual selection UI | 2 (Possible) | 3     | **6** | Integration test for empty results handling         | Dev   | Day 2     |

**Priority Justification:**
- **R-001 (Score 9)**: Database is production critical. Schema errors = data loss. HIGHEST PRIORITY.
- **R-002, R-004 (Score 6)**: Core functionality failures. Duplicate videos or missing duration breaks user experience.
- **R-003 (Score 6)**: Quota exceeded is COMMON in free tier. Must handle gracefully.
- **R-005 (Score 6)**: Zero results is EXPECTED scenario (obscure search queries). Cannot crash.

### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description                                     | Probability | Impact | Score | Mitigation                         | Owner |
| ------- | -------- | ----------------------------------------------- | ----------- | ------ | ----- | ---------------------------------- | ----- |
| R-006   | TECH     | Partial failure recovery doesn't resume         | 2 (Possible) | 2     | **4** | API tests for partial success      | Dev   |
| R-007   | PERF     | Network retry logic delays user unacceptably    | 2 (Possible) | 2     | **4** | Performance tests for retry timing | Dev   |
| R-008   | DATA     | Rank ordering incorrect, best videos not shown  | 1 (Unlikely) | 3     | **3** | Database tests for rank validation | Dev   |
| R-009   | TECH     | Integration with Story 3.1/3.2 breaks silently  | 1 (Unlikely) | 3     | **3** | E2E integration tests              | QA    |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description                                     | Probability | Impact | Score | Action                       |
| ------- | -------- | ----------------------------------------------- | ----------- | ------ | ----- | ---------------------------- |
| R-010   | OPS      | Response format changes break Epic 4 UI         | 1 (Unlikely) | 2     | **2** | API contract tests           |
| R-011   | PERF     | Large project (20+ scenes) times out            | 1 (Unlikely) | 2     | **2** | Performance benchmark        |
| R-012   | BUS      | Invalid query format returns irrelevant results | 1 (Unlikely) | 1     | **1** | Monitor, add query sanitization |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## Test Coverage Plan

### P0 (Critical) - Run on every commit, BLOCKS MERGE

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Test ID     | Requirement                                              | Test Level | Risk Link | Owner | Effort | Notes                           |
| ----------- | -------------------------------------------------------- | ---------- | --------- | ----- | ------ | ------------------------------- |
| 3.3-UT-001  | searchWithMultipleQueries aggregates results             | Unit       | R-002     | Dev   | 2h     | Deduplication logic critical    |
| 3.3-UT-002  | searchWithMultipleQueries deduplicates by videoId        | Unit       | R-002     | Dev   | 2h     | Prevents duplicate videos       |
| 3.3-UT-003  | searchVideos retrieves duration from videos.list         | Unit       | R-004     | Dev   | 2h     | Story 3.4 depends on duration   |
| 3.3-UT-004  | Duration parsing converts ISO 8601 to seconds            | Unit       | R-004     | Dev   | 2h     | "PT4M13S" → 253 seconds         |
| 3.3-API-001 | POST /generate-visuals completes full workflow           | API        | R-001     | Dev   | 3h     | E2E orchestration test          |
| 3.3-API-002 | POST /generate-visuals handles quota exceeded gracefully | API        | R-003     | Dev   | 2h     | Return 503, don't crash         |
| 3.3-API-003 | POST /generate-visuals handles zero results              | API        | R-005     | Dev   | 2h     | Empty array is valid outcome    |
| 3.3-DB-001  | visual_suggestions table has correct schema              | Database   | R-001     | Dev   | 2h     | SQLite types, all fields        |
| 3.3-DB-002  | saveVisualSuggestions batch inserts with rank            | Database   | R-001     | Dev   | 2h     | Rank values 1, 2, 3, ...        |
| 3.3-DB-003  | Foreign key cascade deletes suggestions with scene       | Database   | R-001     | Dev   | 2h     | Referential integrity           |
| 3.3-INT-001 | End-to-end: scene text → suggestions in database         | E2E        | R-009     | QA    | 3h     | Integration with Stories 3.1/3.2 |
| 3.3-INT-002 | Zero results scenario doesn't crash visual UI            | E2E        | R-005     | QA    | 2h     | AC7 integration test            |

**Total P0**: 12 tests, **24 hours** (~3 days)

**P0 Acceptance Criteria Coverage:**
- ✅ AC1: searchVideos() Implementation (3.3-UT-003, 3.3-UT-004)
- ✅ AC2: Multi-Query Search and Deduplication (3.3-UT-001, 3.3-UT-002)
- ✅ AC3: POST /api/projects/[id]/generate-visuals Endpoint (3.3-API-001)
- ✅ AC4: Database Persistence (3.3-DB-001, 3.3-DB-002, 3.3-DB-003)
- ✅ AC6: Error Handling - Quota & Zero Results (3.3-API-002, 3.3-API-003)
- ✅ AC7: Integration Test - Zero Results (3.3-INT-002)

---

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-5) + Common workflows

| Test ID     | Requirement                                              | Test Level | Risk Link | Owner | Effort | Notes                           |
| ----------- | -------------------------------------------------------- | ---------- | --------- | ----- | ------ | ------------------------------- |
| 3.3-UT-005  | searchWithMultipleQueries handles partial failures       | Unit       | R-006     | Dev   | 1h     | Alternative query fails         |
| 3.3-UT-006  | searchWithMultipleQueries preserves relevance ordering   | Unit       | R-002     | Dev   | 1h     | Primary results first           |
| 3.3-UT-007  | Quota tracking updates correctly (101 units per search)  | Unit       | R-003     | Dev   | 1h     | search.list + videos.list       |
| 3.3-API-004 | POST /generate-visuals returns correct counts            | API        | R-006     | Dev   | 1h     | scenesProcessed, suggestionsGenerated |
| 3.3-API-005 | POST /generate-visuals updates visuals_generated flag    | API        | R-001     | Dev   | 1h     | Database state transition       |
| 3.3-API-006 | POST /generate-visuals processes all scenes on partial failure | API | R-006     | Dev   | 1h     | Collect errors[], continue      |
| 3.3-API-007 | GET /visual-suggestions returns simplified response      | API        | R-010     | Dev   | 1h     | Only { suggestions: [] }        |
| 3.3-API-008 | GET /visual-suggestions orders by scene then rank        | API        | R-008     | Dev   | 1h     | Scene 1 before Scene 2          |
| 3.3-DB-004  | getVisualSuggestions returns results ordered by rank ASC | Database   | R-008     | Dev   | 1h     | Rank 1, 2, 3 order              |
| 3.3-INT-003 | Story 3.2 integration: analyzeSceneForVisuals called     | E2E        | R-009     | QA    | 1h     | Scene text → search queries     |

**Total P1**: 10 tests, **10 hours** (~1.5 days)

**P1 Acceptance Criteria Coverage:**
- ✅ AC2: Multi-Query Search - Partial Failures (3.3-UT-005)
- ✅ AC3: POST Endpoint - Response Structure (3.3-API-004, 3.3-API-005)
- ✅ AC5: GET Endpoint - Response Format (3.3-API-007, 3.3-API-008)
- ✅ AC6: Error Handling - Partial Failures (3.3-API-006)

---

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Test ID     | Requirement                                                    | Test Level | Risk Link | Owner | Effort | Notes                           |
| ----------- | -------------------------------------------------------------- | ---------- | --------- | ----- | ------ | ------------------------------- |
| 3.3-API-009 | POST /generate-visuals handles network errors with retry       | API        | R-007     | Dev   | 0.5h   | Exponential backoff (max 3)     |
| 3.3-API-010 | POST /generate-visuals handles invalid query gracefully        | API        | R-012     | Dev   | 0.5h   | Log warning, skip query         |
| 3.3-API-011 | GET /visual-suggestions returns empty array when no suggestions | API       | R-005     | Dev   | 0.5h   | Empty state (not error)         |
| 3.3-DB-005  | Schema does NOT include removed fields (project_id, description) | Database | R-001     | Dev   | 0.5h   | Normalized design validation    |
| 3.3-DB-006  | Duration field stores integer (seconds), not string            | Database   | R-004     | Dev   | 0.5h   | Type validation                 |
| 3.3-DB-007  | Index on scene_id exists for query performance                 | Database   | R-011     | Dev   | 0.5h   | Schema index validation         |
| 3.3-INT-004 | Story 3.1 integration: YouTubeAPIClient quota tracking         | E2E        | R-003     | QA    | 0.5h   | Quota incremented correctly     |
| 3.3-INT-005 | Performance: 5-scene project completes < 30 seconds            | E2E        | R-011     | QA    | 0.5h   | Performance benchmark           |

**Total P2**: 8 tests, **4 hours** (~0.5 days)

**P2 Acceptance Criteria Coverage:**
- ✅ AC4: Database Schema - Removed Fields Validation (3.3-DB-005)
- ✅ AC4: Database Schema - Field Types (3.3-DB-006)
- ✅ AC4: Database Schema - Indexes (3.3-DB-007)
- ✅ AC6: Error Handling - Network Errors, Invalid Query (3.3-API-009, 3.3-API-010)

---

### P3 (Low) - Run on-demand or exploratory

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Test ID     | Requirement                                              | Test Level | Owner | Effort | Notes                           |
| ----------- | -------------------------------------------------------- | ---------- | ----- | ------ | ------------------------------- |
| 3.3-API-012 | POST /generate-visuals handles database errors           | API        | Dev   | 0.25h  | Transaction rollback test       |
| 3.3-DB-008  | Missing optional fields handled gracefully               | Database   | Dev   | 0.25h  | Nullable fields                 |
| 3.3-INT-006 | Large project (20 scenes) completes successfully         | E2E        | QA    | 0.25h  | Stress test                     |
| 3.3-INT-007 | Concurrent requests don't corrupt data                   | E2E        | QA    | 0.25h  | Concurrency test                |

**Total P3**: 4 tests, **1 hour**

---

## Execution Order

### Smoke Tests (<2 min) - Fast Feedback

**Purpose**: Catch build-breaking issues immediately after commit

- [ ] **3.3-UT-001**: Multi-query aggregation works (15s)
- [ ] **3.3-DB-001**: Database schema is correct (30s)
- [ ] **3.3-API-001**: POST /generate-visuals completes successfully (45s)

**Total**: 3 scenarios, ~90 seconds

---

### P0 Tests (<10 min) - Critical Path Validation

**Purpose**: Validate all high-risk scenarios before merge

**Unit Tests (4 tests, ~3 min):**
- 3.3-UT-001: Multi-query aggregation
- 3.3-UT-002: Deduplication by videoId
- 3.3-UT-003: Duration retrieval
- 3.3-UT-004: ISO 8601 parsing

**API Integration Tests (4 tests, ~4 min):**
- 3.3-API-001: Full workflow
- 3.3-API-002: Quota exceeded handling
- 3.3-API-003: Zero results handling
- 3.3-API-007: GET endpoint (P1 promoted to smoke)

**Database Tests (3 tests, ~2 min):**
- 3.3-DB-001: Schema validation
- 3.3-DB-002: Batch insert with ranking
- 3.3-DB-003: Cascade deletes

**E2E Tests (2 tests, ~3 min):**
- 3.3-INT-001: End-to-end integration
- 3.3-INT-002: Zero results scenario

**Total**: 13 scenarios (12 P0 + 1 P1), ~10 minutes

---

### P1 Tests (<20 min) - Important Feature Coverage

**Purpose**: Validate important workflows and medium-risk scenarios

**All P1 Tests**: Run remaining 9 P1 tests

**Total**: 9 scenarios, ~10 minutes

**Cumulative**: 22 scenarios, ~20 minutes

---

### P2/P3 Tests (<30 min) - Full Regression Coverage

**Purpose**: Edge cases, performance, stress testing

**P2 Tests**: 8 scenarios (~4 min)
**P3 Tests**: 4 scenarios (~1 min)

**Total**: 12 scenarios, ~5 minutes

**Cumulative (Full Suite)**: 34 scenarios, ~25 minutes

---

## Resource Estimates

### Test Development Effort

| Priority  | Count   | Hours/Test | Total Hours | Notes                                        |
| --------- | ------- | ---------- | ----------- | -------------------------------------------- |
| P0        | 12      | 2.0        | **24**      | Complex setup, database mocks, error scenarios |
| P1        | 10      | 1.0        | **10**      | Standard coverage, API contracts             |
| P2        | 8       | 0.5        | **4**       | Simple edge cases, validation                |
| P3        | 4       | 0.25       | **1**       | Exploratory, performance benchmarks          |
| **Total** | **34**  | **-**      | **39**      | **~5 days** (assuming 1 developer)           |

### Prerequisites

**Test Data Factories:**

Create `tests/factories/visual-suggestions.factory.ts`:
- `createVideoResult(overrides)` - Factory for VideoResult objects with faker
- `createVideoResults(count, overrides)` - Batch factory
- `createVisualSuggestion(overrides)` - Factory for VisualSuggestion database rows
- `createSceneAnalysis(overrides)` - Factory for SceneAnalysis responses
- **Estimated Effort**: 1 hour

**Test Fixtures:**

Create `tests/fixtures/database.fixture.ts`:
- `cleanDb` fixture - Clean database state per test
- `testProject` fixture - Pre-created project
- `testScene` fixture - Pre-created scene with text
- **Estimated Effort**: 2 hours

**Tooling:**

- **Vitest** - Test runner (already installed)
- **MSW (Mock Service Worker)** - Mock YouTube API responses (install needed)
- **faker.js** - Realistic test data generation (install needed)
- **better-sqlite3** - Database mocking (already installed)

**Environment:**

- SQLite test database (ephemeral, in-memory)
- Mock YouTube API client (MSW or vi.mock)
- Mock LLM provider for scene analysis (vi.mock)
- Test environment variables (YOUTUBE_API_KEY=test-key)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: **100%** (ABSOLUTE - no exceptions, blocks merge)
- **P1 pass rate**: ≥**95%** (waivers required for failures, must be documented)
- **P2/P3 pass rate**: ≥**90%** (informational, can proceed with documented issues)
- **High-risk mitigations** (R-001 through R-005): **100%** complete

### Coverage Targets

- **Story 3.3 new code**: ≥**90%** (searchWithMultipleQueries, POST/GET endpoints, database persistence)
- **Critical paths** (full workflow): **100%** (P0 tests cover all paths)
- **Error scenarios** (quota, network, zero results): **100%** (6 error tests)
- **Database operations**: **100%** (schema, insert, retrieve, cascade)

### Non-Negotiable Requirements

- [ ] **All 12 P0 tests pass** (no exceptions)
- [ ] **All 5 high-risk items (R-001 to R-005) mitigated with passing tests**
- [ ] **Database schema validation test passes** (R-001 - Score 9 - CRITICAL)
- [ ] **Zero results scenario test passes** (AC7 requirement)
- [ ] **Test coverage ≥90% for Story 3.3 code**
- [ ] **No console errors or warnings during test execution**

**Merge Blocked If:**
- Any P0 test fails
- Test coverage < 90% for new code
- High-risk item (score ≥6) lacks passing test

---

## Mitigation Plans

### R-001: Database Schema Mismatch Breaks Persistence (Score: 9)

**Mitigation Strategy:**

1. **Implement Schema Validation Test** (3.3-DB-001):
   ```typescript
   test('3.3-DB-001: visual_suggestions table should have correct schema', () => {
     const tableInfo = db.prepare("PRAGMA table_info(visual_suggestions)").all();

     // Verify all required fields exist
     expect(fields).toContain('id', 'scene_id', 'video_id', 'title',
                              'thumbnail_url', 'channel_title', 'embed_url',
                              'rank', 'duration', 'default_segment_path',
                              'download_status', 'created_at');

     // Verify removed fields NOT present (normalized design)
     expect(fields).not.toContain('project_id', 'description', 'relevance_score');

     // Verify SQLite-compatible types
     expect(idField.type).toBe('TEXT'); // NOT UUID
     expect(rankField.type).toBe('INTEGER');
   });
   ```

2. **Implement Persistence Test** (3.3-DB-002):
   - Test batch insert with rank values (1, 2, 3, ...)
   - Verify all fields persisted correctly
   - Verify duration stored as INTEGER (seconds)

3. **Implement Cascade Delete Test** (3.3-DB-003):
   - Create scene with suggestions
   - Delete scene
   - Verify suggestions cascade deleted

**Owner:** Dev
**Timeline:** Day 1 (CRITICAL PRIORITY)
**Status:** Planned
**Verification:** All 3 database tests pass (3.3-DB-001, 3.3-DB-002, 3.3-DB-003)

---

### R-002: Multi-Query Deduplication Logic Fails (Score: 6)

**Mitigation Strategy:**

1. **Implement Deduplication Unit Test** (3.3-UT-002):
   ```typescript
   test('3.3-UT-002: should deduplicate by videoId', async () => {
     const duplicateVideo = createVideoResult({ videoId: 'duplicate123' });

     // Primary query returns 5 videos (including duplicate123)
     mockSearchVideos.mockResolvedValueOnce([duplicateVideo, ...createVideoResults(4)]);

     // Alternative query returns 5 videos (including same duplicate123)
     mockSearchVideos.mockResolvedValueOnce([duplicateVideo, ...createVideoResults(4)]);

     const results = await searchWithMultipleQueries([primaryQuery, altQuery]);

     // Should have 9 unique videos (not 10 with duplicate)
     expect(results).toHaveLength(9);
     expect(results.filter(v => v.videoId === 'duplicate123')).toHaveLength(1);
   });
   ```

2. **Implement Aggregation Test** (3.3-UT-001):
   - Test primary + alternative queries combined
   - Verify all unique results included

3. **Implement Ordering Test** (3.3-UT-006 - P1):
   - Verify primary query results appear before alternatives

**Owner:** Dev
**Timeline:** Day 1
**Status:** Planned
**Verification:** 3.3-UT-001, 3.3-UT-002, 3.3-UT-006 pass

---

### R-003: YouTube API Quota Exceeded Breaks App (Score: 6)

**Mitigation Strategy:**

1. **Implement Quota Error Handling Test** (3.3-API-002):
   ```typescript
   test('3.3-API-002: should handle YouTube API quota exceeded gracefully', async () => {
     // Mock quota exceeded error
     mockYouTubeClient.searchVideos.mockRejectedValue(
       new YouTubeError('Quota exceeded', YouTubeErrorCode.QUOTA_EXCEEDED)
     );

     const response = await fetch(`/api/projects/${projectId}/generate-visuals`, {
       method: 'POST'
     });

     expect(response.status).toBe(503); // Service Unavailable
     const result = await response.json();
     expect(result.error).toContain('YouTube API quota exceeded');
     expect(result.error).toContain('Try again tomorrow'); // Actionable guidance
   });
   ```

2. **Implement Quota Tracking Test** (3.3-UT-007 - P1):
   - Verify quota incremented by 101 units (search.list + videos.list)
   - Test quota tracking accuracy

**Owner:** Dev
**Timeline:** Day 2
**Status:** Planned
**Verification:** 3.3-API-002, 3.3-UT-007 pass

---

### R-004: Duration Field Not Populated, Story 3.4 Breaks (Score: 6)

**Mitigation Strategy:**

1. **Implement Duration Retrieval Test** (3.3-UT-003):
   ```typescript
   test('3.3-UT-003: should retrieve duration from videos.list API', async () => {
     // Mock search.list response (no duration in search.list)
     mockSearchList.mockResolvedValue({ items: [{ id: { videoId: 'abc123' } }] });

     // Mock videos.list response with contentDetails.duration
     mockVideosList.mockResolvedValue({
       items: [{ contentDetails: { duration: 'PT4M13S' } }]
     });

     const results = await client.searchVideos('test query');

     expect(mockVideosList).toHaveBeenCalledWith({ part: 'contentDetails', id: 'abc123' });
     expect(results[0].duration).toBe('253'); // Converted to seconds
   });
   ```

2. **Implement ISO 8601 Parsing Test** (3.3-UT-004):
   ```typescript
   test('3.3-UT-004: should parse ISO 8601 duration to seconds', () => {
     expect(parseISO8601Duration('PT4M13S')).toBe(253);
     expect(parseISO8601Duration('PT1H30M')).toBe(5400);
     expect(parseISO8601Duration('PT45S')).toBe(45);
   });
   ```

3. **Implement Database Duration Storage Test** (3.3-DB-006 - P2):
   - Verify duration stored as INTEGER (not string)

**Owner:** Dev
**Timeline:** Day 1 (CRITICAL - Story 3.4 dependency)
**Status:** Planned
**Verification:** 3.3-UT-003, 3.3-UT-004, 3.3-DB-006 pass

---

### R-005: Zero Results Scenario Crashes Visual Selection UI (Score: 6)

**Mitigation Strategy:**

1. **Implement Zero Results API Test** (3.3-API-003):
   ```typescript
   test('3.3-API-003: should handle zero results for query without error', async () => {
     // Mock YouTube returns empty results
     mockYouTubeClient.searchVideos.mockResolvedValue([]);

     const response = await fetch(`/api/projects/${projectId}/generate-visuals`, {
       method: 'POST'
     });
     const result = await response.json();

     expect(result.success).toBe(true); // NOT an error
     expect(result.suggestionsGenerated).toBe(0);
     expect(result.errors).toHaveLength(0); // Empty results are valid
   });
   ```

2. **Implement Zero Results E2E Test** (3.3-INT-002 - AC7):
   ```typescript
   test('3.3-INT-002: zero results scenario doesn\'t crash visual UI', async () => {
     // Create scene with nonsense text (guaranteed zero results)
     const scene = await saveScene({
       project_id: projectId,
       text: 'zxcvbnmasdfghjkl' // No YouTube videos match this
     });

     // Generate visuals
     await fetch(`/api/projects/${projectId}/generate-visuals`, { method: 'POST' });

     // Verify database state
     const suggestions = await getVisualSuggestions(scene.id);
     expect(suggestions).toHaveLength(0);

     // Verify UI doesn't crash (Story 3.5 integration)
     // This will be tested in Story 3.5, but validate API contract here
   });
   ```

3. **Implement GET Empty State Test** (3.3-API-011 - P2):
   - Verify GET /visual-suggestions returns empty array (not error)

**Owner:** Dev (API tests), QA (E2E test)
**Timeline:** Day 2
**Status:** Planned
**Verification:** 3.3-API-003, 3.3-INT-002, 3.3-API-011 pass

---

## Assumptions and Dependencies

### Assumptions

1. **YouTube Data API v3 remains stable** - API responses don't change breaking structure
2. **SQLite database is available** for test environment (in-memory mode)
3. **LLM provider (Story 3.2)** is mockable for integration tests
4. **Test data factories** will use faker.js for realistic data
5. **MSW or vi.mock** sufficient for mocking YouTube API (no actual API calls in tests)
6. **5-day effort estimate** assumes single developer, 8-hour days
7. **P0 tests blocking merge** is enforced by CI/CD pipeline

### Dependencies

1. **Data Factories** - Must be created before test implementation - **Day 0** (1 hour)
2. **Test Fixtures** - Required for database tests - **Day 0** (2 hours)
3. **MSW Installation** - For mocking HTTP requests - **Day 0** (0.5 hour)
4. **faker.js Installation** - For test data generation - **Day 0** (0.5 hour)
5. **Story 3.1 Code** - YouTubeAPIClient must be working for integration tests
6. **Story 3.2 Code** - analyzeSceneForVisuals must be working for E2E tests
7. **CI/CD Pipeline** - Must be configured to run tests and block merge on P0 failures

### Risks to Test Plan

- **Risk**: Test environment setup takes longer than 4 hours (factories + fixtures + tools)
  - **Impact**: Delays test implementation start
  - **Contingency**: Pre-create factories/fixtures in parallel with Story 3.3 code

- **Risk**: YouTube API mocking proves difficult (complex response structure)
  - **Impact**: Integration tests delayed
  - **Contingency**: Use simpler mock approach (vi.mock instead of MSW)

- **Risk**: Database in-memory mode doesn't replicate SQLite file behavior
  - **Impact**: Schema validation tests may not catch all issues
  - **Contingency**: Use file-based test database (slower but accurate)

---

## Test Implementation Checklist

### Day 0: Setup (4 hours)

- [ ] Create `tests/factories/visual-suggestions.factory.ts` (1h)
- [ ] Create `tests/fixtures/database.fixture.ts` (2h)
- [ ] Install MSW and faker.js (0.5h)
- [ ] Configure test environment variables (0.5h)

### Day 1: P0 Critical Tests (8 hours)

**High Priority: Database & Duration (R-001, R-004)**
- [ ] 3.3-DB-001: Schema validation (2h) - **HIGHEST PRIORITY**
- [ ] 3.3-DB-002: Batch insert with ranking (2h)
- [ ] 3.3-DB-003: Cascade deletes (2h)
- [ ] 3.3-UT-003: Duration retrieval (1h)
- [ ] 3.3-UT-004: ISO 8601 parsing (1h)

### Day 2: P0 API & Deduplication (8 hours)

**High Priority: Deduplication & Error Handling (R-002, R-003, R-005)**
- [ ] 3.3-UT-001: Multi-query aggregation (2h)
- [ ] 3.3-UT-002: Deduplication (2h)
- [ ] 3.3-API-001: Full workflow (3h)
- [ ] 3.3-API-002: Quota exceeded (1h)

### Day 3: P0 Integration & P1 Tests (8 hours)

- [ ] 3.3-API-003: Zero results (2h)
- [ ] 3.3-INT-001: E2E integration (3h)
- [ ] 3.3-INT-002: Zero results E2E (2h)
- [ ] Start P1 tests (3.3-UT-005, 3.3-UT-006, 3.3-UT-007) (1h partial)

### Day 4: P1 & P2 Tests (8 hours)

- [ ] Complete P1 tests (7 remaining) (7h)
- [ ] Start P2 tests (4 tests) (1h partial)

### Day 5: P2/P3 Tests & Review (8 hours)

- [ ] Complete P2 tests (4 remaining) (3h)
- [ ] P3 tests (4 tests) (1h)
- [ ] Run full test suite, verify coverage ≥90% (2h)
- [ ] TEA test review re-run (2h)

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: __________ Date: __________
- [ ] Tech Lead: __________ Date: __________
- [ ] QA Lead (TEA): Murat Date: 2025-11-16 ✅

**Critical Blocker:**

Story 3.3 was marked COMPLETED without implementing this test plan. **This approval is CONDITIONAL on test implementation.**

**Approval Conditions:**
1. All 12 P0 tests implemented and passing
2. Test coverage ≥90% for Story 3.3 code
3. All 5 high-risk items (R-001 to R-005) mitigated with passing tests
4. TEA re-review achieves score ≥70/100

**Comments:**

> Test design is comprehensive and risk-based. The 5-day effort estimate is reasonable for 34 test scenarios covering unit, API, database, and E2E levels. **CRITICAL:** Story cannot be marked DONE until this test plan is fully implemented. Current status: 0% coverage is unacceptable for production.
>
> Priority order is correct: Database tests first (R-001 - Score 9), then duration tests (R-004 - Story 3.4 dependency), then error handling (R-003, R-005), then deduplication (R-002).
>
> Recommend starting Day 0 setup immediately, then implementing P0 tests in parallel with any remaining Story 3.3 code fixes.

---

## Appendix

### Knowledge Base References

This test design consulted the following knowledge base fragments:

- **`risk-governance.md`** - Risk classification framework (6 categories: TECH, SEC, PERF, DATA, BUS, OPS)
- **`probability-impact.md`** - Probability × impact matrix for risk scoring (625 lines)
- **`test-levels-framework.md`** - E2E vs API vs Component vs Unit decision matrix (467 lines)
- **`test-priorities-matrix.md`** - P0-P3 prioritization criteria with risk-based mapping (389 lines)
- **`test-quality.md`** - Definition of Done for tests (deterministic, isolated, <300 lines, <1.5 min)
- **`data-factories.md`** - Factory functions with faker.js, overrides, API-first setup (498 lines)
- **`fixture-architecture.md`** - Pure function → Fixture → mergeTests pattern (406 lines)

### Related Documents

- **PRD**: [PRD.md](../prd.md) - Feature 1.5 (Visual Sourcing) lines 179-242
- **Epic**: [epics.md](../epics.md) - Epic 3 definition lines 545-805
- **Architecture**: [architecture.md](../architecture.md) - System design section
- **Tech Spec**: [tech-spec-epic-3.md](tech-spec-epic-3.md) - Epic 3 technical specification v2.0
- **Story**: [story-3.3.md](../stories/story-3.3.md) - Story 3.3 with 7 acceptance criteria
- **Story Context**: [story-context-3.3.xml](../stories/story-context-3.3.xml) - Implementation context
- **Test Review**: [test-review-story-3.3-2025-11-16.md](../test-review-story-3.3-2025-11-16.md) - Critical findings

### Test File Structure

**Recommended Organization:**

```
ai-video-generator/
├── tests/
│   ├── unit/
│   │   └── youtube-client.test.ts  [EXTEND - add Story 3.3 tests]
│   │       ├── 3.3-UT-001: Multi-query aggregation
│   │       ├── 3.3-UT-002: Deduplication
│   │       ├── 3.3-UT-003: Duration retrieval
│   │       ├── 3.3-UT-004: ISO 8601 parsing
│   │       ├── 3.3-UT-005: Partial failures (P1)
│   │       ├── 3.3-UT-006: Relevance ordering (P1)
│   │       └── 3.3-UT-007: Quota tracking (P1)
│   │
│   ├── api/
│   │   ├── generate-visuals.test.ts  [NEW - POST endpoint tests]
│   │   │   ├── 3.3-API-001: Full workflow (P0)
│   │   │   ├── 3.3-API-002: Quota exceeded (P0)
│   │   │   ├── 3.3-API-003: Zero results (P0)
│   │   │   ├── 3.3-API-004: Correct counts (P1)
│   │   │   ├── 3.3-API-005: Flag update (P1)
│   │   │   ├── 3.3-API-006: Partial failure (P1)
│   │   │   ├── 3.3-API-009: Network retry (P2)
│   │   │   ├── 3.3-API-010: Invalid query (P2)
│   │   │   └── 3.3-API-012: Database error (P3)
│   │   │
│   │   └── visual-suggestions.test.ts  [NEW - GET endpoint tests]
│   │       ├── 3.3-API-007: Response format (P1)
│   │       ├── 3.3-API-008: Ordering (P1)
│   │       └── 3.3-API-011: Empty array (P2)
│   │
│   ├── db/
│   │   └── visual-suggestions.test.ts  [NEW - database tests]
│   │       ├── 3.3-DB-001: Schema validation (P0)
│   │       ├── 3.3-DB-002: Batch insert (P0)
│   │       ├── 3.3-DB-003: Cascade deletes (P0)
│   │       ├── 3.3-DB-004: Rank ordering (P1)
│   │       ├── 3.3-DB-005: Removed fields (P2)
│   │       ├── 3.3-DB-006: Duration type (P2)
│   │       ├── 3.3-DB-007: Index exists (P2)
│   │       └── 3.3-DB-008: Nullable fields (P3)
│   │
│   ├── integration/
│   │   └── visual-generation.integration.test.ts  [NEW - E2E tests]
│   │       ├── 3.3-INT-001: E2E workflow (P0)
│   │       ├── 3.3-INT-002: Zero results E2E (P0)
│   │       ├── 3.3-INT-003: Story 3.2 integration (P1)
│   │       ├── 3.3-INT-004: Story 3.1 integration (P2)
│   │       ├── 3.3-INT-005: Performance benchmark (P2)
│   │       ├── 3.3-INT-006: Large project (P3)
│   │       └── 3.3-INT-007: Concurrency (P3)
│   │
│   └── factories/
│       └── visual-suggestions.factory.ts  [NEW - data factories]
│           ├── createVideoResult()
│           ├── createVideoResults()
│           ├── createVisualSuggestion()
│           └── createSceneAnalysis()
```

**Total Files:**
- **1 extended file** (youtube-client.test.ts - add 7 tests)
- **5 new files** (generate-visuals.test.ts, visual-suggestions.test.ts, visual-suggestions.test.ts [db], visual-generation.integration.test.ts, visual-suggestions.factory.ts)

---

**Generated by**: BMad TEA Agent - Test Architect Module (Murat)
**Workflow**: `.bmad/bmm/workflows/testarch/test-design`
**Version**: 4.0 (BMad v6)
**Date**: 2025-11-16
