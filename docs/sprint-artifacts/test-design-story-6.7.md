# Test Design: Story 6.7 - Channel Intelligence UI & Setup Wizard

**Date:** 2025-12-02
**Author:** Murat (TEA Agent)
**Status:** Draft

---

## Executive Summary

**Scope:** Full test design for Story 6.7 - Channel Intelligence UI & Setup Wizard

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 4
- Critical categories: BUS (Business Impact), TECH (Technical), SEC (Security)

**Coverage Summary:**

- P0 scenarios: 12 tests (~24 hours)
- P1 scenarios: 18 tests (~18 hours)
- P2 scenarios: 14 tests (~7 hours)
- **Total effort**: ~49 hours (~6 days)

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-6.7.01 | BUS | Setup wizard fails to save RAG config, user loses setup progress | 2 | 3 | 6 | Implement transactional save with rollback, show clear error messages | Dev |
| R-6.7.02 | TECH | YouTube channel validation fails silently, user proceeds with invalid channel | 2 | 3 | 6 | Add robust validation with retry logic, show validation status indicators | Dev |
| R-6.7.03 | BUS | Sync status displays stale/incorrect data, misleading user about RAG state | 2 | 3 | 6 | Implement polling with cache invalidation, display last-updated timestamp | Dev |
| R-6.7.04 | SEC | Invalid/malicious YouTube URLs could trigger injection or API abuse | 2 | 3 | 6 | Sanitize all URL inputs, validate format before API calls, rate limit | Dev |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-6.7.05 | TECH | ChromaDB health check returns false positive (connected but not working) | 2 | 2 | 4 | Add deep health check with actual query test, not just connection ping | Dev |
| R-6.7.06 | BUS | Topic suggestions fail to generate or return empty results | 2 | 2 | 4 | Add loading states, error handling, fallback message for empty results | Dev |
| R-6.7.07 | TECH | Competitor channel limit (5) bypass via direct API manipulation | 1 | 3 | 3 | Validate limit server-side in API endpoint, not just UI | Dev |
| R-6.7.08 | BUS | Manual sync button triggers duplicate jobs if clicked rapidly | 2 | 2 | 4 | Debounce button clicks, show loading state, prevent concurrent syncs | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-6.7.09 | OPS | Niche dropdown missing expected options | 1 | 1 | 1 | Unit test niche options array |
| R-6.7.10 | BUS | Cold Start suggested channels list is empty for obscure niches | 1 | 2 | 2 | Show graceful empty state, allow manual entry |

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

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Test ID | Requirement (AC) | Test Level | Risk Link | Description | Owner |
|---------|-----------------|------------|-----------|-------------|-------|
| 6.7-E2E-001 | AC-6.7.1 | E2E | R-6.7.01 | Setup wizard displays when RAG not configured | QA |
| 6.7-E2E-002 | AC-6.7.1 | E2E | R-6.7.01 | Mode selection cards show descriptions and allow selection | QA |
| 6.7-E2E-003 | AC-6.7.2 | E2E | R-6.7.02 | Established Channel: validates YouTube channel URL/ID | QA |
| 6.7-E2E-004 | AC-6.7.2 | E2E | R-6.7.02 | Established Channel: displays channel preview (name, thumbnail, video count) | QA |
| 6.7-E2E-005 | AC-6.7.2 | E2E | R-6.7.01 | Established Channel: confirmation starts initial sync job | QA |
| 6.7-E2E-006 | AC-6.7.3 | E2E | R-6.7.01 | Cold Start: niche selection shows suggested channels | QA |
| 6.7-E2E-007 | AC-6.7.5 | E2E | R-6.7.03 | Sync status displays last sync time and indexed counts | QA |
| 6.7-INT-001 | AC-6.7.2 | API | R-6.7.02, R-6.7.04 | POST /api/channels/validate validates YouTube channel | QA |
| 6.7-INT-002 | AC-6.7.6 | API | R-6.7.08 | POST /api/rag/sync triggers sync job correctly | QA |
| 6.7-INT-003 | AC-6.7.1 | API | R-6.7.01 | POST /api/rag/setup persists RAG configuration | QA |
| 6.7-INT-004 | AC-6.7.5 | API | R-6.7.03 | GET /api/rag/status returns accurate sync status | QA |
| 6.7-UNIT-001 | AC-6.7.2 | Unit | R-6.7.04 | YouTube URL/ID validation sanitizes malicious input | DEV |

**Total P0**: 12 tests, ~24 hours

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Test ID | Requirement (AC) | Test Level | Risk Link | Description | Owner |
|---------|-----------------|------------|-----------|-------------|-------|
| 6.7-E2E-008 | AC-6.7.3 | E2E | - | Cold Start: user can modify suggested channel selection | QA |
| 6.7-E2E-009 | AC-6.7.3 | E2E | - | Cold Start: confirmation starts sync for all selected channels | QA |
| 6.7-E2E-010 | AC-6.7.4 | E2E | R-6.7.07 | Competitor Management: add competitor channel with validation | QA |
| 6.7-E2E-011 | AC-6.7.4 | E2E | R-6.7.07 | Competitor Management: enforces 5-channel limit with message | QA |
| 6.7-E2E-012 | AC-6.7.4 | E2E | - | Competitor Management: remove competitor from list | QA |
| 6.7-E2E-013 | AC-6.7.6 | E2E | R-6.7.08 | Manual Sync: button shows loading state during sync | QA |
| 6.7-E2E-014 | AC-6.7.7 | E2E | R-6.7.05 | RAG Health: displays ChromaDB connection status | QA |
| 6.7-E2E-015 | AC-6.7.7 | E2E | R-6.7.05 | RAG Health: shows collection sizes (Videos, News, Trends) | QA |
| 6.7-E2E-016 | AC-6.7.8 | E2E | R-6.7.06 | Topic Suggestions: generates and displays topic ideas | QA |
| 6.7-E2E-017 | AC-6.7.8 | E2E | - | Topic Suggestions: click topic navigates to new project | QA |
| 6.7-INT-005 | AC-6.7.4 | API | R-6.7.07 | POST /api/rag/competitors enforces 5-channel limit server-side | QA |
| 6.7-INT-006 | AC-6.7.7 | API | R-6.7.05 | GET /api/rag/health performs deep ChromaDB health check | QA |
| 6.7-INT-007 | AC-6.7.8 | API | R-6.7.06 | GET /api/rag/topics returns AI-generated topic suggestions | QA |
| 6.7-UNIT-002 | AC-6.7.3 | Unit | R-6.7.09 | NICHE_OPTIONS contains all expected niche values | DEV |
| 6.7-UNIT-003 | AC-6.7.5 | Unit | R-6.7.03 | Sync status calculation handles all status states correctly | DEV |
| 6.7-UNIT-004 | AC-6.7.7 | Unit | R-6.7.05 | ChromaDB health check correctly parses response | DEV |
| 6.7-COMP-001 | AC-6.7.1 | Component | - | SetupWizard: renders mode selection cards correctly | DEV |
| 6.7-COMP-002 | AC-6.7.5 | Component | R-6.7.03 | SyncStatus: displays formatted last sync time | DEV |

**Total P1**: 18 tests, ~18 hours

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Test ID | Requirement (AC) | Test Level | Risk Link | Description | Owner |
|---------|-----------------|------------|-----------|-------------|-------|
| 6.7-E2E-018 | AC-6.7.2 | E2E | - | Established Channel: shows progress during initial sync | QA |
| 6.7-E2E-019 | AC-6.7.4 | E2E | - | Competitor: adding channel triggers sync job | QA |
| 6.7-E2E-020 | AC-6.7.5 | E2E | - | Sync status: updates when sync completes | QA |
| 6.7-E2E-021 | AC-6.7.5 | E2E | - | Sync status: displays actionable error messages on failure | QA |
| 6.7-E2E-022 | AC-6.7.7 | E2E | - | RAG Health: shows troubleshooting steps when disconnected | QA |
| 6.7-E2E-023 | AC-6.7.8 | E2E | - | Topic Suggestions: shows loading state during generation | QA |
| 6.7-INT-008 | AC-6.7.2 | API | - | Channel validation handles invalid URL formats gracefully | QA |
| 6.7-INT-009 | AC-6.7.2 | API | - | Channel validation handles YouTube API rate limits | QA |
| 6.7-INT-010 | AC-6.7.3 | API | R-6.7.10 | Cold Start: returns empty suggested channels gracefully | QA |
| 6.7-COMP-003 | AC-6.7.2 | Component | - | EstablishedChannelSetup: channel preview displays correctly | DEV |
| 6.7-COMP-004 | AC-6.7.3 | Component | - | ColdStartSetup: niche dropdown renders all options | DEV |
| 6.7-COMP-005 | AC-6.7.4 | Component | - | CompetitorManagement: remove button confirms before delete | DEV |
| 6.7-COMP-006 | AC-6.7.7 | Component | - | RAGHealth: collapsible section expands correctly | DEV |
| 6.7-COMP-007 | AC-6.7.8 | Component | - | TopicSuggestions: topic cards display description | DEV |

**Total P2**: 14 tests, ~7 hours

### P3 (Low) - Run on-demand

**Criteria**: Nice-to-have + Exploratory + Edge cases

| Test ID | Requirement | Test Level | Description | Owner |
|---------|-------------|------------|-------------|-------|
| 6.7-E2E-024 | - | E2E | Responsive layout: page displays correctly on tablet | QA |
| 6.7-E2E-025 | - | E2E | Accessibility: keyboard navigation through wizard steps | QA |
| 6.7-UNIT-005 | - | Unit | Channel URL parser handles various YouTube URL formats | DEV |
| 6.7-UNIT-006 | - | Unit | Sync status formatting handles edge cases (null, undefined) | DEV |

**Total P3**: 4 tests, ~2 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] 6.7-E2E-001: Setup wizard displays when RAG not configured (45s)
- [ ] 6.7-INT-003: POST /api/rag/setup persists RAG configuration (30s)
- [ ] 6.7-INT-004: GET /api/rag/status returns accurate sync status (30s)

**Total**: 3 scenarios

### P0 Tests (<15 min)

**Purpose**: Critical path validation

- [ ] 6.7-E2E-001: Setup wizard displays when RAG not configured (E2E)
- [ ] 6.7-E2E-002: Mode selection cards show descriptions (E2E)
- [ ] 6.7-E2E-003: Established Channel validates YouTube channel (E2E)
- [ ] 6.7-E2E-004: Established Channel displays channel preview (E2E)
- [ ] 6.7-E2E-005: Established Channel confirmation starts sync (E2E)
- [ ] 6.7-E2E-006: Cold Start niche selection shows suggested channels (E2E)
- [ ] 6.7-E2E-007: Sync status displays last sync and counts (E2E)
- [ ] 6.7-INT-001: Channel validation API validates YouTube channel (API)
- [ ] 6.7-INT-002: Sync API triggers sync job correctly (API)
- [ ] 6.7-INT-003: Setup API persists RAG configuration (API)
- [ ] 6.7-INT-004: Status API returns accurate sync status (API)
- [ ] 6.7-UNIT-001: YouTube URL validation sanitizes input (Unit)

**Total**: 12 scenarios

### P1 Tests (<30 min)

**Purpose**: Important feature coverage

- [ ] 6.7-E2E-008 through 6.7-E2E-017 (E2E)
- [ ] 6.7-INT-005 through 6.7-INT-007 (API)
- [ ] 6.7-UNIT-002 through 6.7-UNIT-004 (Unit)
- [ ] 6.7-COMP-001 through 6.7-COMP-002 (Component)

**Total**: 18 scenarios

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage

- [ ] 6.7-E2E-018 through 6.7-E2E-025 (E2E)
- [ ] 6.7-INT-008 through 6.7-INT-010 (API)
- [ ] 6.7-COMP-003 through 6.7-COMP-007 (Component)
- [ ] 6.7-UNIT-005 through 6.7-UNIT-006 (Unit)

**Total**: 18 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 12 | 2.0 | 24 | Complex E2E setup, API validation |
| P1 | 18 | 1.0 | 18 | Standard coverage |
| P2 | 14 | 0.5 | 7 | Simpler scenarios |
| P3 | 4 | 0.25 | 1 | Exploratory |
| **Total** | **48** | **-** | **~50** | **~6 days** |

### Prerequisites

**Test Data:**

- `createRAGConfig` factory (mode, niche, channels)
- `createChannel` factory (channelId, name, videoCount)
- `createSyncStatus` factory (lastSync, videosIndexed, newsArticles)

**Mocks:**

- YouTube Data API mock (channel validation, metadata fetch)
- ChromaDB mock (health check, collection queries)
- Background job queue mock (job creation, status)

**Environment:**

- Test database with RAG schema (migration 013)
- Mocked YouTube API responses
- Mocked ChromaDB connection

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths**: ≥80% (Setup wizard flows, sync operations)
- **Security scenarios**: 100% (URL validation, input sanitization)
- **Business logic**: ≥70% (State management, status calculations)
- **Edge cases**: ≥50% (Empty states, error handling)

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] No high-risk (≥6) items unmitigated
- [ ] Security tests (R-6.7.04) pass 100%
- [ ] Setup wizard completes both flows (Established + Cold Start)

---

## Mitigation Plans

### R-6.7.01: Setup Wizard Config Save Failure (Score: 6)

**Mitigation Strategy:** Implement transactional save with automatic rollback on failure. Show clear error toast with retry option. Persist wizard step progress to localStorage as backup.
**Owner:** Dev
**Status:** Planned
**Verification:** 6.7-E2E-005, 6.7-INT-003

### R-6.7.02: YouTube Channel Validation Silent Failure (Score: 6)

**Mitigation Strategy:** Add explicit validation status indicators (loading, success, error). Implement retry logic with exponential backoff. Show validation errors with specific error messages from YouTube API.
**Owner:** Dev
**Status:** Planned
**Verification:** 6.7-E2E-003, 6.7-INT-001

### R-6.7.03: Stale Sync Status Display (Score: 6)

**Mitigation Strategy:** Implement 30-second polling interval for sync status. Display "Last updated: X seconds ago" timestamp. Auto-refresh on sync completion webhook. Cache invalidation on manual sync trigger.
**Owner:** Dev
**Status:** Planned
**Verification:** 6.7-E2E-007, 6.7-INT-004, 6.7-COMP-002

### R-6.7.04: URL Injection/API Abuse (Score: 6)

**Mitigation Strategy:** Sanitize all URL inputs with strict YouTube URL/ID pattern validation. Rate limit channel validation API (5 req/min). Log suspicious patterns for monitoring.
**Owner:** Dev
**Status:** Planned
**Verification:** 6.7-UNIT-001, 6.7-INT-001

---

## Assumptions and Dependencies

### Assumptions

1. YouTube Data API quota is sufficient for validation calls during testing
2. ChromaDB is running locally on test environment
3. Background job queue infrastructure from Story 6.2 is functional
4. RAG database schema (migration 013) is applied

### Dependencies

1. **Story 6.1:** RAG Infrastructure (ChromaDB health check endpoint)
2. **Story 6.2:** Background Job Queue (sync job creation)
3. **Story 6.3:** YouTube Channel Sync (channel validation, sync execution)
4. **Story 6.5:** RAG Retrieval (for topic suggestions)
5. **Story 6.6:** RAG-Augmented Generation (topic suggestion generation)

### Risks to Plan

- **Risk**: YouTube API rate limits may affect E2E test stability
  - **Impact**: Flaky tests, false failures
  - **Contingency**: Use mocked YouTube responses for most tests, reserve real API for integration smoke tests

---

## Test Scenarios Detail

### AC-6.7.1: Setup Wizard Mode Selection

```gherkin
Scenario: 6.7-E2E-001 - Setup wizard displays when RAG not configured
  Given a user has not configured RAG (rag_enabled = false/null)
  When the user navigates to /settings/channel-intelligence
  Then a setup wizard should be displayed
  And the wizard should show two mode options: "Established Channel" and "Cold Start"
  And each mode should display a brief description

Scenario: 6.7-E2E-002 - Mode selection cards interaction
  Given the setup wizard is displayed
  When the user clicks on "Established Channel" mode card
  Then the card should show selected state
  And a "Continue" or "Next" button should be enabled
```

### AC-6.7.2: Established Channel Setup

```gherkin
Scenario: 6.7-E2E-003 - YouTube channel URL validation
  Given user selected "Established Channel" mode
  When user enters a valid YouTube channel URL "https://youtube.com/c/TechChannel"
  And clicks validate/submit
  Then system should call YouTube Data API to validate
  And display validation loading state
  And on success, display channel name, thumbnail, and video count

Scenario: 6.7-E2E-004 - Invalid channel URL handling
  Given user selected "Established Channel" mode
  When user enters invalid URL "not-a-youtube-url"
  And clicks validate
  Then system should display error message "Invalid YouTube channel URL"
  And not proceed to confirmation step

Scenario: 6.7-E2E-005 - Confirmation starts sync job
  Given user has validated their YouTube channel
  When user clicks "Confirm & Start Sync"
  Then system should create RAG config in database
  And trigger rag_sync_channel background job
  And display sync progress indicator
```

### AC-6.7.3: Cold Start Setup

```gherkin
Scenario: 6.7-E2E-006 - Cold Start niche selection
  Given user selected "Cold Start" mode
  When user selects "Military & Defense" from niche dropdown
  Then system should display top 5 suggested channels in that niche
  And each channel should show name and thumbnail
  And user should be able to modify selection

Scenario: 6.7-E2E-008 - Cold Start channel modification
  Given user sees suggested channels for niche
  When user removes one suggested channel
  And adds a custom channel URL
  Then the channel list should update accordingly
  And show 5 total channels maximum
```

### AC-6.7.4: Competitor Channel Management

```gherkin
Scenario: 6.7-E2E-010 - Add competitor channel
  Given user has completed initial RAG setup
  When user enters competitor channel URL in the add form
  And clicks "Add Competitor"
  Then system should validate the channel
  And add it to competitor list
  And trigger sync job for that channel

Scenario: 6.7-E2E-011 - 5-channel limit enforcement
  Given user already has 5 competitor channels
  When user tries to add a 6th competitor
  Then system should display message "Maximum 5 competitor channels allowed"
  And not allow adding the channel
```

### AC-6.7.5: Sync Status Display

```gherkin
Scenario: 6.7-E2E-007 - Sync status display
  Given RAG is configured and has synced content
  When user views the Channel Intelligence page
  Then sync status should display "Last synced: X hours ago"
  And show "Y videos indexed | Z news articles"
  And status should auto-update on page load

Scenario: 6.7-E2E-021 - Sync error display
  Given a sync job has failed
  When user views the Channel Intelligence page
  Then sync status should display error message
  And provide actionable troubleshooting steps
```

### AC-6.7.6: Manual Sync Trigger

```gherkin
Scenario: 6.7-INT-002 - Manual sync triggers job
  Given RAG is configured
  When user clicks "Sync Now" button
  Then POST /api/rag/sync should be called
  And a new rag_sync_channel job should be created
  And button should show loading state until job is queued

Scenario: 6.7-E2E-013 - Debounce rapid clicks
  Given user is on Channel Intelligence page
  When user clicks "Sync Now" button multiple times rapidly
  Then only one sync job should be created
  And button should remain in loading state
```

### AC-6.7.7: RAG Health Status

```gherkin
Scenario: 6.7-E2E-014 - ChromaDB connected status
  Given ChromaDB is running and connected
  When user expands RAG Health section
  Then status should show "Connected" indicator
  And display collection sizes: "Videos: X | News: Y | Trends: Z"

Scenario: 6.7-E2E-022 - ChromaDB disconnected handling
  Given ChromaDB is not running
  When user expands RAG Health section
  Then status should show "Disconnected" indicator
  And display troubleshooting steps to resolve
```

### AC-6.7.8: Topic Suggestions

```gherkin
Scenario: 6.7-E2E-016 - Generate topic suggestions
  Given user has indexed content via RAG
  When user clicks "Get Topic Suggestions"
  Then system should generate 3-5 AI topic ideas
  And display topics with brief descriptions
  And show loading state during generation

Scenario: 6.7-E2E-017 - Topic creates new project
  Given topic suggestions are displayed
  When user clicks on a topic card
  Then system should navigate to new project creation
  And pre-populate topic field with selected topic
```

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: _____________ Date: _________
- [ ] Tech Lead: _____________ Date: _________
- [ ] QA Lead: _____________ Date: _________

**Comments:**

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization

### Related Documents

- PRD: Feature 2.7 - Channel Intelligence & Content Research (RAG-Powered)
- Epic: docs/epics.md - Epic 6 Story 6.7
- Architecture: docs/architecture.md - Section 19 (RAG Architecture)
- Tech Spec: docs/sprint-artifacts/tech-spec-epic-6.md

### AC to Test Mapping

| Acceptance Criteria | Test IDs |
|---------------------|----------|
| AC-6.7.1 | 6.7-E2E-001, 6.7-E2E-002, 6.7-INT-003, 6.7-COMP-001 |
| AC-6.7.2 | 6.7-E2E-003, 6.7-E2E-004, 6.7-E2E-005, 6.7-E2E-018, 6.7-INT-001, 6.7-INT-008, 6.7-INT-009, 6.7-UNIT-001, 6.7-COMP-003 |
| AC-6.7.3 | 6.7-E2E-006, 6.7-E2E-008, 6.7-E2E-009, 6.7-INT-010, 6.7-UNIT-002, 6.7-COMP-004 |
| AC-6.7.4 | 6.7-E2E-010, 6.7-E2E-011, 6.7-E2E-012, 6.7-E2E-019, 6.7-INT-005, 6.7-COMP-005 |
| AC-6.7.5 | 6.7-E2E-007, 6.7-E2E-020, 6.7-E2E-021, 6.7-INT-004, 6.7-UNIT-003, 6.7-COMP-002 |
| AC-6.7.6 | 6.7-E2E-013, 6.7-INT-002 |
| AC-6.7.7 | 6.7-E2E-014, 6.7-E2E-015, 6.7-E2E-022, 6.7-INT-006, 6.7-UNIT-004, 6.7-COMP-006 |
| AC-6.7.8 | 6.7-E2E-016, 6.7-E2E-017, 6.7-E2E-023, 6.7-INT-007, 6.7-COMP-007 |

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `.bmad/bmm/testarch/test-design`
**Version**: 4.0 (BMad v6)
