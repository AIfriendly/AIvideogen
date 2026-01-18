# Test Design: Story 6.8b - QPF UI & Integration (One-Click Video Creation)

**Date:** 2025-12-03
**Author:** Murat (Master Test Architect)
**Status:** Draft
**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
**Story:** 6.8b

---

## Executive Summary

**Scope:** Full test design for Story 6.8b - Quick Production Flow UI & Integration

**Risk Summary:**

- Total risks identified: 8
- High-priority risks (>=6): 3
- Critical categories: BUS (Business Impact), TECH (Technical), DATA (Data Integrity)

**Coverage Summary:**

- P0 scenarios: 6 (12 hours)
- P1 scenarios: 8 (8 hours)
- P2 scenarios: 4 (2 hours)
- P3 scenarios: 2 (0.5 hours)
- **Total effort**: 22.5 hours (~3 days)

---

## Risk Assessment

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | BUS | Pipeline fails after project creation, leaving orphaned project | 2 | 3 | 6 | Implement pipeline failure cleanup; show error with retry/edit/cancel options | Dev | Before release |
| R-002 | TECH | Defaults validation race condition - user deletes voice/persona after setting defaults | 2 | 3 | 6 | Re-validate defaults at pipeline start; fallback to settings page if invalid | Dev | Before release |
| R-003 | DATA | RAG context not properly persisted to project, causing degraded script quality | 2 | 3 | 6 | Validate ragContext storage; add logging for RAG context injection | Dev | Before release |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | Progress page polling causes performance issues with many concurrent users | 2 | 2 | 4 | Implement exponential backoff on polling; limit poll frequency | Dev |
| R-005 | BUS | Auto-redirect to export fails, user doesn't see completed video | 2 | 2 | 4 | Add "View Video" button fallback; persist completion state | Dev |
| R-006 | OPS | Browser closes during pipeline execution, losing user context | 2 | 2 | 4 | Pipeline continues server-side; user can return to progress page | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-007 | BUS | TopicSuggestionCard renders slowly with many suggestions | 1 | 2 | 2 | Monitor performance; implement virtualization if needed |
| R-008 | OPS | Multiple simultaneous quick-create requests from same user | 1 | 2 | 2 | Implement request debouncing on button click |

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

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC-6.8b.1: One-click project creation with defaults | E2E | R-001, R-002 | 2 | QA | Core user journey |
| AC-6.8b.4: Redirect to settings when no defaults | E2E | - | 1 | QA | Error handling path |
| FR-6.8b.04: quick-create API creates project + triggers pipeline | API | R-001, R-003 | 2 | QA | Pipeline integration |
| Defaults validation at pipeline start | API | R-002 | 1 | QA | Race condition guard |

**Total P0**: 6 tests, 12 hours

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC-6.8b.2: Real-time progress display | E2E | R-004 | 2 | QA | Status polling |
| AC-6.8b.3: Auto-redirect on completion | E2E | R-005 | 1 | QA | Navigation flow |
| FR-6.8b.01: "Create Video" button renders on topic cards | Component | - | 1 | Dev | UI component |
| FR-6.8b.02: Check user_preferences for defaults | API | - | 1 | QA | Preference lookup |
| FR-6.8b.05: Redirect to progress page | E2E | - | 1 | QA | Navigation |
| FR-6.8b.06: Auto-redirect to export | E2E | R-005 | 1 | QA | Completion flow |
| TopicSuggestionCard loading state | Component | - | 1 | Dev | UI state |

**Total P1**: 8 tests, 8 hours

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Progress page shows stage names correctly | Unit | - | 1 | Dev | UI mapping |
| Pipeline status calculation (stageProgress, overallProgress) | Unit | - | 1 | Dev | Progress math |
| TopicSuggestionCard displays all fields (title, description, source, score) | Component | R-007 | 1 | Dev | Rendering |
| Error state display on progress page | Component | - | 1 | Dev | Error UX |

**Total P2**: 4 tests, 2 hours

### P3 (Low) - Run on-demand

**Criteria**: Nice-to-have + Exploratory + Edge cases

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Browser close during pipeline (resilience) | E2E | 1 | QA | R-006 edge case |
| Multiple rapid clicks on "Create Video" | E2E | 1 | QA | R-008 edge case |

**Total P3**: 2 tests, 0.5 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] quick-create API returns 400 when topic missing (30s)
- [ ] quick-create API returns error when no defaults configured (30s)
- [ ] Progress page loads without error (30s)

**Total**: 3 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical path validation

- [ ] E2E: User with defaults clicks "Create Video" -> project created -> pipeline starts (E2E)
- [ ] E2E: User without defaults clicks "Create Video" -> redirected to settings (E2E)
- [ ] API: POST /api/projects/quick-create creates project with correct fields (API)
- [ ] API: POST /api/projects/quick-create triggers Automate Mode pipeline (API)
- [ ] API: quick-create validates defaults exist before pipeline start (API)
- [ ] API: quick-create stores ragContext in project (API)

**Total**: 6 scenarios

### P1 Tests (<30 min)

**Purpose**: Important feature coverage

- [ ] E2E: Progress page shows real-time stage updates (E2E)
- [ ] E2E: Progress page updates currentMessage during pipeline (E2E)
- [ ] E2E: Auto-redirect to export when currentStage='complete' (E2E)
- [ ] Component: TopicSuggestionCard renders with "Create Video" button (Component)
- [ ] Component: TopicSuggestionCard shows loading state on click (Component)
- [ ] API: GET /api/user-preferences returns defaults (API)
- [ ] E2E: Clicking "Create Video" redirects to /projects/[id]/progress (E2E)
- [ ] E2E: Export page accessible after pipeline completion (E2E)

**Total**: 8 scenarios

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage

- [ ] Unit: Pipeline stage mapping returns correct stage names (Unit)
- [ ] Unit: Progress percentage calculation is accurate (Unit)
- [ ] Component: TopicSuggestionCard displays all metadata fields (Component)
- [ ] Component: Progress page shows error state correctly (Component)
- [ ] E2E: Pipeline continues after browser close (E2E)
- [ ] E2E: Rapid clicks don't create multiple projects (E2E)

**Total**: 6 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 6 | 2.0 | 12 | Complex setup, pipeline integration |
| P1 | 8 | 1.0 | 8 | Standard coverage |
| P2 | 4 | 0.5 | 2 | Simple scenarios |
| P3 | 2 | 0.25 | 0.5 | Exploratory |
| **Total** | **20** | **-** | **22.5** | **~3 days** |

### Prerequisites

**Test Data:**

- UserPreferences factory (faker-based, auto-cleanup)
- TopicSuggestion factory (mock RAG context)
- Project factory (for testing existing projects)

**Tooling:**

- Playwright for E2E tests
- Vitest for Unit and API tests
- React Testing Library for Component tests (or Playwright CT)

**Environment:**

- Dev server running with SQLite database
- ChromaDB optional (tests should work without RAG)
- User preferences table initialized with default row

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: >=95% (waivers required for failures)
- **P2/P3 pass rate**: >=90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths**: >=80% (quick-create -> progress -> export)
- **API endpoints**: 100% (quick-create, pipeline-status, user-preferences)
- **UI components**: >=70% (TopicSuggestionCard, QuickProductionProgress)
- **Error handling**: >=80% (no defaults, pipeline failure, validation errors)

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] No high-risk (>=6) items unmitigated
- [ ] Quick-create API validates defaults before pipeline start
- [ ] Progress page shows accurate stage information
- [ ] Auto-redirect to export works reliably

---

## Mitigation Plans

### R-001: Pipeline fails after project creation (Score: 6)

**Mitigation Strategy:** Implement comprehensive error handling in quick-create API. If pipeline stage fails:
1. Update project status to 'error' with error message
2. Progress page shows error state with options: Retry | Edit Project | Cancel
3. User can retry from failed stage or switch to manual mode

**Owner:** Dev
**Timeline:** Before release
**Status:** Planned
**Verification:** E2E test: Pipeline failure shows recovery options

### R-002: Defaults validation race condition (Score: 6)

**Mitigation Strategy:** Re-validate defaults at the START of pipeline execution (not just at API call):
1. quick-create API checks defaults exist
2. Pipeline orchestrator re-checks defaults before each stage
3. If defaults became invalid, halt pipeline with clear error

**Owner:** Dev
**Timeline:** Before release
**Status:** Planned
**Verification:** API test: Delete default voice -> quick-create returns DEFAULTS_NOT_CONFIGURED

### R-003: RAG context not persisted (Score: 6)

**Mitigation Strategy:**
1. Add explicit ragContext column to projects table (or verify rag_config stores it)
2. Log RAG context injection during script generation
3. Add API test validating ragContext stored and retrieved correctly

**Owner:** Dev
**Timeline:** Before release
**Status:** Planned
**Verification:** API test: POST quick-create with ragContext -> GET project shows ragContext

---

## Assumptions and Dependencies

### Assumptions

1. Story 6.8a (user_preferences, pipeline-status API) is complete and functional
2. Automate Mode pipeline from Feature 1.12 is stable and reusable
3. Topic suggestions are available from existing RAG system (Story 6.5+)
4. Browser supports standard polling (setInterval, no WebSocket required)

### Dependencies

1. **Story 6.8a** - user_preferences table and APIs - Required before 6.8b
2. **Feature 1.12** - Automate Mode pipeline - Required for pipeline orchestration
3. **Story 6.7** - Topic suggestions UI - Required for "Create Video" button placement

### Risks to Plan

- **Risk**: RAG system not generating topic suggestions
  - **Impact**: "Create Video" button has nothing to click
  - **Contingency**: Allow manual topic entry in Quick Production flow

- **Risk**: Automate Mode pipeline not integrated
  - **Impact**: Quick Production cannot trigger video creation
  - **Contingency**: Create dedicated QPF pipeline (code duplication risk)

---

## Test Scenarios Detail

### AC-6.8b.1: One-Click Project Creation (P0, E2E)

```typescript
// tests/e2e/quick-production/one-click-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Quick Production - One-Click Creation', () => {
  test.beforeEach(async ({ request }) => {
    // Ensure defaults are configured
    await request.put('/api/user-preferences', {
      data: {
        default_voice_id: 'af_nova',
        default_persona_id: 'scientific-analyst'
      }
    });
  });

  test('creates project and starts pipeline when defaults configured', async ({ page }) => {
    // Navigate to Channel Intelligence with topic suggestions
    await page.goto('/settings/channel-intelligence');

    // Click "Create Video" on first topic suggestion
    const createButton = page.locator('[data-testid="topic-card"]').first()
      .locator('button:has-text("Create Video")');
    await createButton.click();

    // Should redirect to progress page
    await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+\/progress/);

    // Verify pipeline started
    await expect(page.getByText(/Generating script|voiceover|visuals|assembly/i)).toBeVisible();
  });
});
```

### AC-6.8b.4: Redirect to Settings (P0, E2E)

```typescript
test('redirects to settings when no defaults configured', async ({ page, request }) => {
  // Clear defaults
  await request.put('/api/user-preferences', {
    data: {
      default_voice_id: null,
      default_persona_id: null
    }
  });

  await page.goto('/settings/channel-intelligence');

  const createButton = page.locator('[data-testid="topic-card"]').first()
    .locator('button:has-text("Create Video")');
  await createButton.click();

  // Should redirect to quick-production settings
  await expect(page).toHaveURL('/settings/quick-production');

  // Should show prompt message
  await expect(page.getByText(/configure.*default.*voice.*persona/i)).toBeVisible();
});
```

### API: POST /api/projects/quick-create (P0, API)

```typescript
// tests/api/quick-create.spec.ts
import { test, expect } from '@playwright/test';

test.describe('POST /api/projects/quick-create', () => {
  test('creates project with correct defaults applied', async ({ request }) => {
    // Setup: Configure defaults
    await request.put('/api/user-preferences', {
      data: {
        default_voice_id: 'af_nova',
        default_persona_id: 'scientific-analyst'
      }
    });

    // Act: Create project via quick-create
    const response = await request.post('/api/projects/quick-create', {
      data: {
        topic: 'Test Topic for Quick Production',
        ragContext: { channelContent: [], newsArticles: [] }
      }
    });

    // Assert: Success response
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.projectId).toBeTruthy();
    expect(body.data.redirectUrl).toMatch(/\/projects\/[a-z0-9-]+\/progress/);

    // Verify project created with defaults
    const projectResponse = await request.get(`/api/projects/${body.data.projectId}`);
    const project = await projectResponse.json();
    expect(project.data.voice_id).toBe('af_nova');
    expect(project.data.system_prompt_id).toBe('scientific-analyst');
    expect(project.data.topic_confirmed).toBe(true);
  });

  test('returns DEFAULTS_NOT_CONFIGURED when no defaults', async ({ request }) => {
    // Clear defaults
    await request.put('/api/user-preferences', {
      data: {
        default_voice_id: null,
        default_persona_id: null
      }
    });

    const response = await request.post('/api/projects/quick-create', {
      data: { topic: 'Test Topic' }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('DEFAULTS_NOT_CONFIGURED');
  });

  test('validates topic is required', async ({ request }) => {
    const response = await request.post('/api/projects/quick-create', {
      data: {}
    });

    expect(response.status()).toBe(400);
  });
});
```

### AC-6.8b.2: Real-Time Progress Display (P1, E2E)

```typescript
test('displays real-time progress updates', async ({ page }) => {
  // Trigger quick-create and navigate to progress page
  // ... setup code ...

  await expect(page).toHaveURL(/\/progress/);

  // Verify stage indicators
  await expect(page.getByTestId('stage-script')).toBeVisible();
  await expect(page.getByTestId('stage-voiceover')).toBeVisible();
  await expect(page.getByTestId('stage-visuals')).toBeVisible();
  await expect(page.getByTestId('stage-assembly')).toBeVisible();

  // Verify progress updates (wait for stage change)
  const initialMessage = await page.getByTestId('current-message').textContent();
  await page.waitForTimeout(3000); // Allow pipeline progress

  // Either message changed OR we moved to next stage
  const progressBar = page.getByRole('progressbar');
  await expect(progressBar).toHaveAttribute('aria-valuenow', /[1-9][0-9]?/);
});
```

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: _____________ Date: _______
- [ ] Tech Lead: _____________ Date: _______
- [ ] QA Lead: _____________ Date: _______

**Comments:**

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (6 categories)
- `probability-impact.md` - Risk scoring methodology (1-9 scale)
- `test-levels-framework.md` - Test level selection (E2E, API, Unit, Component)
- `test-priorities-matrix.md` - P0-P3 prioritization criteria

### Related Documents

- PRD: Feature 2.7 - Quick Production Flow (FR-2.7.QPF.01-08, AC-QPF.1-4)
- Epic: docs/epics.md - Epic 6, Story 6.8b
- Architecture: docs/architecture.md
- Tech Spec: docs/sprint-artifacts/tech-spec-epic-6.md - Story 6.8b section
- Story File: docs/stories/stories-epic-6/story-6.8b.md

### Traceability Matrix

| AC ID | FR Reference | Test ID | Test Level | Priority |
|-------|--------------|---------|------------|----------|
| AC-6.8b.1 | FR-6.8b.03, FR-6.8b.04 | 6.8b-E2E-001 | E2E | P0 |
| AC-6.8b.2 | FR-6.8b.05 | 6.8b-E2E-002 | E2E | P1 |
| AC-6.8b.3 | FR-6.8b.06 | 6.8b-E2E-003 | E2E | P1 |
| AC-6.8b.4 | FR-6.8b.07 | 6.8b-E2E-004 | E2E | P0 |
| - | FR-6.8b.01 | 6.8b-CMP-001 | Component | P1 |
| - | FR-6.8b.02 | 6.8b-API-001 | API | P0 |
| - | FR-6.8b.04 | 6.8b-API-002 | API | P0 |

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `.bmad/bmm/testarch/test-design`
**Version**: 4.0 (BMad v6)
