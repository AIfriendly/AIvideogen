# ATDD Checklist: Story 6.7 - Channel Intelligence UI & Setup Wizard

**Date:** 2025-12-02
**Author:** Murat (TEA Agent)
**Phase:** RED (Tests written, implementation pending)
**Status:** Tests in failing state - ready for DEV implementation

---

## Story Summary

**Story ID:** 6.7
**Title:** Channel Intelligence UI & Setup Wizard
**Epic:** Epic 6 - Channel Intelligence & RAG

**Overview:** Create the user interface for Channel Intelligence including a setup wizard (Established Channel + Cold Start modes), competitor management, sync status dashboard, RAG health monitoring, and AI-generated topic suggestions.

---

## Acceptance Criteria Breakdown

| AC ID | Description | Test Level | Tests Created |
|-------|-------------|------------|---------------|
| AC-6.7.1 | Setup wizard displays when RAG not configured | E2E | 6.7-E2E-001, 6.7-E2E-002 |
| AC-6.7.2 | Established Channel setup with validation | E2E, API, Unit | 6.7-E2E-003, 004, 005, 018, 6.7-INT-001, 008, 009, 6.7-UNIT-001 |
| AC-6.7.3 | Cold Start setup with niche selection | E2E, API | 6.7-E2E-006, 008, 009, 6.7-INT-010 |
| AC-6.7.4 | Competitor channel management | E2E, API | 6.7-E2E-010, 011, 012, 019, 6.7-INT-005 |
| AC-6.7.5 | Sync status display | E2E, API | 6.7-E2E-007, 020, 021, 6.7-INT-004 |
| AC-6.7.6 | Manual sync trigger | E2E, API | 6.7-E2E-013, 6.7-INT-002 |
| AC-6.7.7 | RAG health status | E2E, API | 6.7-E2E-014, 015, 022, 6.7-INT-006 |
| AC-6.7.8 | Topic suggestions | E2E, API | 6.7-E2E-016, 017, 023, 6.7-INT-007 |

---

## Test Files Created

### E2E Tests (Playwright)

| File | Tests | Status |
|------|-------|--------|
| `tests/e2e/channel-intelligence/setup-wizard.spec.ts` | 9 tests | RED |
| `tests/e2e/channel-intelligence/dashboard.spec.ts` | 16 tests | RED |

### API Tests (Vitest)

| File | Tests | Status |
|------|-------|--------|
| `tests/api/rag/setup.test.ts` | 19 tests | RED |

### Unit Tests (Vitest)

| File | Tests | Status |
|------|-------|--------|
| `tests/unit/youtube/validate-channel.test.ts` | 35+ tests | PARTIAL GREEN |

---

## Data Factories Created

**Location:** `tests/factories/rag-factories.ts`

### New Factories for Story 6.7

| Factory | Purpose |
|---------|---------|
| `createSyncStatus()` | Sync status for dashboard display |
| `createActiveSyncStatus()` | Sync in progress state |
| `createErrorSyncStatus()` | Sync with errors |
| `createRAGHealthStatus()` | ChromaDB connected health |
| `createDisconnectedRAGHealth()` | ChromaDB disconnected state |
| `createTopicSuggestion()` | Single topic suggestion |
| `createTopicSuggestions(count)` | Multiple topic suggestions |
| `createChannelPreview()` | Channel validation preview |
| `createNicheSuggestions(niche, count)` | Suggested channels for niche |
| `createEstablishedSetupState()` | Setup wizard state (established) |
| `createColdStartSetupState(niche)` | Setup wizard state (cold start) |

### Test Constants

| Constant | Purpose |
|----------|---------|
| `VALID_CHANNEL_URLS` | Valid YouTube URL formats for testing |
| `INVALID_CHANNEL_URLS` | Invalid/malicious URLs for security testing |
| `NICHE_OPTIONS` | Available niche options matching UI |

---

## Security Module Created

**Location:** `src/lib/youtube/validate-channel.ts`

### Functions

| Function | Purpose | Risk Mitigation |
|----------|---------|-----------------|
| `validateChannelInput()` | Validate/sanitize YouTube URL/ID | R-6.7.04 |
| `validateMultipleChannels()` | Batch validation with limit | R-6.7.04, R-6.7.07 |
| `sanitizeForLogging()` | Safe logging of user input | R-6.7.04 |
| `isChannelId()` | Type guard for channel ID | - |
| `isHandle()` | Type guard for handle | - |

### Security Features

- Length limit (256 chars) - DoS prevention
- Strict regex patterns - format validation
- Dangerous pattern detection - injection prevention
- Protocol validation - http/https only
- No query params/fragments - URL manipulation prevention

---

## Required data-testid Attributes

### Setup Wizard Page

```
setup-wizard                    - Main wizard container
mode-established-channel        - Established channel mode card
mode-cold-start                 - Cold start mode card
wizard-continue-btn             - Continue button
```

### Established Channel Setup

```
channel-url-input              - YouTube URL input field
validate-channel-btn           - Validate button
validation-loading             - Loading indicator
validation-success             - Success indicator
validation-error               - Error indicator
channel-preview-name           - Channel name display
channel-preview-thumbnail      - Channel thumbnail image
channel-preview-video-count    - Video count display
confirm-setup-btn              - Confirm & Start Sync button
sync-progress                  - Sync progress indicator
sync-progress-bar              - Progress bar element
sync-progress-message          - Status message
```

### Cold Start Setup

```
niche-select                   - Niche dropdown
suggested-channels             - Suggested channels container
suggested-channel-card         - Individual channel card
channel-name                   - Channel name in card
channel-thumbnail              - Channel thumbnail in card
remove-channel-btn             - Remove channel button
add-custom-channel-input       - Custom channel URL input
add-custom-channel-btn         - Add custom channel button
```

### Dashboard (Post-Setup)

```
channel-intelligence-page      - Main page container
sync-status                    - Sync status section
last-sync-time                 - Last sync timestamp
videos-indexed-count           - Videos count display
news-articles-count            - News articles count
sync-now-btn                   - Manual sync trigger
sync-error-message             - Error message display
sync-error-actions             - Error action buttons
```

### Competitor Management

```
add-competitor-input           - Competitor URL input
add-competitor-btn             - Add competitor button
competitor-validation-loading  - Validation loading
competitor-channel-card        - Competitor card
competitor-sync-status         - Competitor sync status
remove-competitor-btn          - Remove competitor button
competitor-limit-message       - 5-channel limit message
```

### RAG Health Section

```
rag-health-expand              - Expand/collapse toggle
chromadb-status                - ChromaDB connection status
chromadb-troubleshooting       - Troubleshooting steps
collection-videos-count        - Videos collection size
collection-news-count          - News collection size
collection-trends-count        - Trends collection size
```

### Topic Suggestions

```
get-topics-btn                 - Generate topics button
topics-loading                 - Loading indicator
topic-card                     - Individual topic card
topic-title                    - Topic title
topic-description              - Topic description
create-project-btn             - Create project from topic
```

---

## Implementation Checklist

### Phase 1: API Endpoints

- [ ] `POST /api/rag/setup` - Persist RAG configuration
  - Add `data-testid` for error responses
  - Run test: `npm run test tests/api/rag/setup.test.ts`
  - ✅ Test passes (green phase)

- [ ] `GET /api/rag/status` - Return sync status
  - Run test: `npm run test tests/api/rag/setup.test.ts`
  - ✅ Test passes

- [ ] `POST /api/rag/sync` - Trigger manual sync
  - Implement debounce logic
  - Run test: `npm run test tests/api/rag/setup.test.ts`
  - ✅ Test passes

- [ ] `POST /api/channels/validate` - Validate YouTube channel
  - Use `validateChannelInput()` from security module
  - Run test: `npm run test tests/api/rag/setup.test.ts`
  - ✅ Test passes

- [ ] `POST /api/rag/competitors` - Add competitor channel
  - Enforce 5-channel limit server-side
  - Run test: `npm run test tests/api/rag/setup.test.ts`
  - ✅ Test passes

- [ ] `GET /api/rag/health` - RAG health check
  - Deep ChromaDB connection test
  - Run test: `npm run test tests/api/rag/setup.test.ts`
  - ✅ Test passes

- [ ] `GET /api/rag/topics` - Generate topic suggestions
  - Run test: `npm run test tests/api/rag/setup.test.ts`
  - ✅ Test passes

- [ ] `GET /api/channels/suggestions` - Get niche suggestions
  - Run test: `npm run test tests/api/rag/setup.test.ts`
  - ✅ Test passes

### Phase 2: UI Components

- [ ] Create `/settings/channel-intelligence/page.tsx`
  - Route setup
  - ✅ 6.7-E2E-001 passes

- [ ] `SetupWizard` component
  - Mode selection cards
  - ✅ 6.7-E2E-001, 002 pass

- [ ] `EstablishedChannelSetup` component
  - URL input, validation, preview
  - ✅ 6.7-E2E-003, 004, 005 pass

- [ ] `ColdStartSetup` component
  - Niche dropdown, suggested channels
  - ✅ 6.7-E2E-006, 008, 009 pass

- [ ] `SyncStatus` component
  - Last sync, counts, progress
  - ✅ 6.7-E2E-007, 020, 021 pass

- [ ] `CompetitorManagement` component
  - Add/remove competitors
  - ✅ 6.7-E2E-010, 011, 012 pass

- [ ] `RAGHealth` component
  - ChromaDB status, collections
  - ✅ 6.7-E2E-014, 015, 022 pass

- [ ] `TopicSuggestions` component
  - Generate and display topics
  - ✅ 6.7-E2E-016, 017, 023 pass

### Phase 3: Integration

- [ ] Wire up API calls to UI components
- [ ] Add loading states and error handling
- [ ] Implement sync status polling (30s interval)
- [ ] Add navigation from topic to new project

---

## Running Tests

### Unit Tests (URL Validation)

```bash
# Run URL validation security tests
npm run test tests/unit/youtube/validate-channel.test.ts

# Run with coverage
npm run test:coverage tests/unit/youtube/validate-channel.test.ts
```

### API Tests

```bash
# Run all RAG API tests
npm run test tests/api/rag/setup.test.ts

# Run specific test
npm run test tests/api/rag/setup.test.ts -- -t "6.7-INT-001"
```

### E2E Tests

```bash
# Run all Channel Intelligence E2E tests
npx playwright test tests/e2e/channel-intelligence/

# Run setup wizard tests only
npx playwright test tests/e2e/channel-intelligence/setup-wizard.spec.ts

# Run in headed mode (see browser)
npx playwright test tests/e2e/channel-intelligence/ --headed

# Debug specific test
npx playwright test tests/e2e/channel-intelligence/ --debug -g "6.7-E2E-001"
```

### Run All Story 6.7 Tests

```bash
# All tests for Story 6.7
npm run test -- --grep "6.7-"
npx playwright test tests/e2e/channel-intelligence/
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ All E2E tests written and failing (25 tests)
- ✅ All API tests written and failing (19 tests)
- ✅ URL validation unit tests written (35+ tests)
- ✅ Data factories created
- ✅ Mock requirements documented
- ✅ Security module implemented

### GREEN Phase (DEV Team)

1. Pick one failing test
2. Implement minimal code to make it pass
3. Run test to verify green
4. Move to next test
5. Repeat until all tests pass

**Recommended order:**

1. API endpoints (foundation)
2. SetupWizard + mode selection
3. EstablishedChannelSetup
4. ColdStartSetup
5. Dashboard components (SyncStatus, Competitors, RAGHealth, Topics)

### REFACTOR Phase (DEV Team)

1. All tests passing (green)
2. Improve code quality
3. Extract shared utilities
4. Optimize re-renders
5. Ensure tests still pass

---

## Dependencies

**Story Dependencies:**

- ✅ Story 6.1: RAG Infrastructure (ChromaDB, embeddings)
- ✅ Story 6.2: Background Job Queue (sync jobs)
- ✅ Story 6.3: YouTube Channel Sync (channel validation)
- ✅ Story 6.5: RAG Retrieval (topic context)
- ✅ Story 6.6: RAG-Augmented Generation (topic generation)

**External Dependencies:**

- YouTube Data API (channel validation)
- ChromaDB (health checks, collection sizes)
- Background job queue (sync triggering)

---

## Mock Requirements

### YouTube Data API Mock

```typescript
// tests/mocks/youtube-api.mock.ts
export const mockYouTubeValidate = vi.fn().mockResolvedValue({
  valid: true,
  channel: createChannelPreview(),
});

export const mockYouTubeValidateError = vi.fn().mockRejectedValue(
  new Error('Channel not found')
);

export const mockYouTubeRateLimit = vi.fn().mockRejectedValue(
  Object.assign(new Error('Rate limit exceeded'), { status: 429 })
);
```

### ChromaDB Mock

```typescript
// Already available in tests/fixtures/rag-fixtures.ts
import { createMockChromaClient, createMockEmbeddingsService } from '../fixtures/rag-fixtures';
```

### Background Job Queue Mock

```typescript
// tests/mocks/job-queue.mock.ts
export const mockCreateJob = vi.fn().mockResolvedValue({
  id: faker.string.uuid(),
  status: 'pending',
});

export const mockGetJobStatus = vi.fn().mockResolvedValue({
  status: 'running',
  progress: 45,
});
```

---

## Quality Gate Criteria

### Pass Thresholds

- **P0 tests:** 100% pass rate (12 tests)
- **P1 tests:** ≥95% pass rate (18 tests)
- **Security tests:** 100% pass rate (35+ tests)
- **API tests:** 100% pass rate (19 tests)

### Coverage Targets

- URL validation module: >90%
- API endpoints: >80%
- UI components: >70% (E2E coverage)

### Definition of Done

- [ ] All P0 E2E tests pass
- [ ] All API tests pass
- [ ] URL validation security tests pass
- [ ] Setup wizard completes both flows
- [ ] Sync status updates correctly
- [ ] No high-risk items unmitigated
- [ ] Code review approved

---

## Notes

### Known Limitations

1. E2E tests require database seeding before some scenarios
2. YouTube API tests may need rate limit handling
3. ChromaDB health tests require running ChromaDB instance

### Test Environment Requirements

- Node.js 18+
- Playwright browsers installed
- Test database (SQLite)
- Mocked external services (YouTube API, ChromaDB)

---

**Generated by:** BMad TEA Agent - ATDD Workflow
**Knowledge Base Applied:**
- fixture-architecture.md
- data-factories.md
- network-first.md
- test-quality.md
- selector-resilience.md
