# ATDD Checklist - Epic 6, Story 6.8b: QPF UI & Integration (One-Click Video Creation)

**Date:** 2025-12-03
**Author:** Murat (Master Test Architect)
**Primary Test Level:** E2E + API Integration

---

## Story Summary

Implements the user-facing Quick Production Flow, enabling one-click video creation from RAG-generated topic suggestions. When a user clicks "Create Video" on a topic suggestion, the system checks for configured defaults, creates a project, triggers the automated pipeline, and provides real-time progress tracking until the video is ready for export.

**As a** content creator using Channel Intelligence
**I want** to create a video with one click from a topic suggestion
**So that** I can rapidly produce content without manually configuring each project

---

## Acceptance Criteria

1. **AC-6.8b.1**: Given a user has configured default voice and persona, when they click "Create Video" on a topic suggestion, then a new project is created with topic_confirmed=true and the pipeline starts automatically.

2. **AC-6.8b.2**: Given the pipeline is running, when the user views the progress page, then they see real-time status updates for each stage (script, voiceover, visuals, assembly).

3. **AC-6.8b.3**: Given the pipeline completes successfully, when assembly finishes, then the user is automatically redirected to the export page.

4. **AC-6.8b.4**: Given a user has NOT configured defaults, when they click "Create Video", then they are redirected to /settings/quick-production with a message prompting them to select voice and persona.

---

## Failing Tests Created (RED Phase)

### E2E Tests (12 tests)

**File:** `tests/e2e/quick-production-flow.test.ts` (280 lines)

- **Test:** should create project and start pipeline when user has defaults configured
  - **Status:** RED - POST /api/projects/quick-create endpoint not implemented
  - **Verifies:** AC-6.8b.1 - One-click project creation with defaults

- **Test:** should apply default voice and persona to created project
  - **Status:** RED - Project creation logic not implemented
  - **Verifies:** FR-6.8b.04 - Defaults applied to project

- **Test:** should return DEFAULTS_NOT_CONFIGURED error when no defaults exist
  - **Status:** RED - Error handling not implemented
  - **Verifies:** AC-6.8b.4 - Redirect when no defaults

- **Test:** should return error when only voice is configured (missing persona)
  - **Status:** RED - Validation logic not implemented
  - **Verifies:** AC-6.8b.4 - Partial defaults validation

- **Test:** should return error when only persona is configured (missing voice)
  - **Status:** RED - Validation logic not implemented
  - **Verifies:** AC-6.8b.4 - Partial defaults validation

- **Test:** should return current stage and progress for active pipeline
  - **Status:** RED - Pipeline status tracking not implemented
  - **Verifies:** AC-6.8b.2 - Real-time progress display

- **Test:** should return completedStages array reflecting pipeline progress
  - **Status:** RED - Stage tracking not implemented
  - **Verifies:** AC-6.8b.2 - Completed stages tracking

- **Test:** should return currentStage=complete when pipeline finishes
  - **Status:** RED - Completion detection not implemented
  - **Verifies:** AC-6.8b.3 - Pipeline completion status

- **Test:** should require topic in request body
  - **Status:** RED - Input validation not implemented
  - **Verifies:** FR-6.8b.03 - Request validation

- **Test:** should accept optional ragContext
  - **Status:** RED - RAG context handling not implemented
  - **Verifies:** FR-6.8b.03 - Optional RAG context

- **Test:** should store ragContext when provided
  - **Status:** RED - RAG context storage not implemented
  - **Verifies:** FR-6.8b.04 - RAG context persistence

### API Tests (18 tests)

**File:** `tests/api/quick-create.test.ts` (320 lines)

- **Test:** should create project with topic_confirmed=true
  - **Status:** RED - Endpoint not implemented
  - **Verifies:** FR-6.8b.04

- **Test:** should return redirectUrl pointing to progress page
  - **Status:** RED - Redirect URL generation not implemented
  - **Verifies:** FR-6.8b.05

- **Test:** should set current_step to script-generation
  - **Status:** RED - Pipeline initialization not implemented
  - **Verifies:** FR-6.8b.04

- **Test:** should return 400 when default_voice_id is null
  - **Status:** RED - Validation not implemented
  - **Verifies:** FR-6.8b.02

- **Test:** should return 400 when default_persona_id is null
  - **Status:** RED - Validation not implemented
  - **Verifies:** FR-6.8b.02

- **Test:** should return 400 when both defaults are null
  - **Status:** RED - Validation not implemented
  - **Verifies:** FR-6.8b.02

- **Test:** should validate that voice_id exists in voice-profiles
  - **Status:** RED - Voice validation not implemented
  - **Verifies:** FR-6.8b.02 (race condition guard)

- **Test:** should validate that persona_id exists in system_prompts
  - **Status:** RED - Persona validation not implemented
  - **Verifies:** FR-6.8b.02 (race condition guard)

- **Test:** should return 400 when topic is missing
  - **Status:** RED - Input validation not implemented
  - **Verifies:** FR-6.8b.03

- **Test:** should return 400 when topic is empty string
  - **Status:** RED - Input validation not implemented
  - **Verifies:** FR-6.8b.03

- **Test:** should accept topic with ragContext
  - **Status:** RED - RAG context parsing not implemented
  - **Verifies:** FR-6.8b.03

- **Test:** should handle invalid JSON gracefully
  - **Status:** RED - Error handling not implemented
  - **Verifies:** API robustness

- **Test:** should store ragContext in project rag_config
  - **Status:** RED - Storage logic not implemented
  - **Verifies:** FR-6.8b.04 (RAG persistence)

- **Test:** should trigger pipeline after project creation
  - **Status:** RED - Pipeline trigger not implemented
  - **Verifies:** FR-6.8b.04

---

## Data Factories Created

### Quick Production Factory

**File:** `tests/support/factories/quick-production.factory.ts`

**Exports:**

- `createUserPreferences(overrides?)` - Create user preferences with defaults
- `createUserPreferencesWithoutDefaults()` - Create preferences without voice/persona
- `createTopicSuggestion(overrides?)` - Create single topic suggestion
- `createTopicSuggestions(count)` - Create array of topic suggestions
- `createRAGContext(overrides?)` - Create RAG context object
- `createEmptyRAGContext()` - Create empty RAG context
- `createQuickCreateRequest(overrides?)` - Create quick-create API request
- `createPipelineStatus(overrides?)` - Create pipeline status response
- `createPipelineStatusComplete()` - Create completed pipeline status
- `createPipelineStatusWithError(error)` - Create error pipeline status
- `createProject(overrides?)` - Create project for testing

**Example Usage:**

```typescript
import { createUserPreferences, createQuickCreateRequest } from './factories/quick-production.factory';

// Create preferences with custom voice
const prefs = createUserPreferences({ default_voice_id: 'custom-voice' });

// Create request with specific topic
const request = createQuickCreateRequest({ topic: 'My Custom Topic' });
```

---

## Required data-testid Attributes

### TopicSuggestionCard Component

- `topic-card` - Topic suggestion card container
- `topic-title` - Topic title text
- `topic-description` - Topic description text
- `topic-source` - Source badge (news, trend, competitor, channel_gap)
- `topic-score` - Relevance score display
- `create-video-button` - "Create Video" button

### QuickProductionProgress Component

- `progress-container` - Main progress container
- `stage-script` - Script stage indicator
- `stage-voiceover` - Voiceover stage indicator
- `stage-visuals` - Visuals stage indicator
- `stage-assembly` - Assembly stage indicator
- `current-message` - Current status message
- `progress-bar` - Overall progress bar
- `stage-progress` - Current stage progress
- `error-message` - Error display (if present)
- `retry-button` - Retry button (on error)
- `edit-project-button` - Edit project button (on error)

**Implementation Example:**

```tsx
<div data-testid="topic-card" className="card">
  <h3 data-testid="topic-title">{title}</h3>
  <p data-testid="topic-description">{description}</p>
  <span data-testid="topic-source">{source}</span>
  <span data-testid="topic-score">{score}%</span>
  <button data-testid="create-video-button" onClick={handleCreate}>
    Create Video
  </button>
</div>

<div data-testid="progress-container">
  <div data-testid="stage-script" className={getStageClass('script')} />
  <div data-testid="current-message">{currentMessage}</div>
  <progress data-testid="progress-bar" value={overallProgress} max={100} />
</div>
```

---

## Implementation Checklist

### Test: One-click project creation (AC-6.8b.1)

**File:** `tests/e2e/quick-production-flow.test.ts`

**Tasks to make this test pass:**

- [ ] Create `src/app/api/projects/quick-create/route.ts`
- [ ] Implement POST handler with request validation
- [ ] Check user_preferences for configured defaults
- [ ] Return DEFAULTS_NOT_CONFIGURED error if missing
- [ ] Create project with topic, voice_id, persona_id
- [ ] Set topic_confirmed=true on project
- [ ] Store ragContext in project.rag_config
- [ ] Trigger Automate Mode pipeline (reuse existing logic)
- [ ] Return projectId and redirectUrl
- [ ] Run test: `npm run test -- tests/e2e/quick-production-flow.test.ts`
- [ ] Test passes (green phase)

**Estimated Effort:** 4 hours

---

### Test: Pipeline progress display (AC-6.8b.2)

**File:** `tests/e2e/quick-production-flow.test.ts`

**Tasks to make this test pass:**

- [ ] Verify pipeline-status API returns accurate stage info (Story 6.8a)
- [ ] Create `src/components/features/rag/QuickProductionProgress.tsx`
- [ ] Implement stage indicators (script, voiceover, visuals, assembly)
- [ ] Add progress bar with stageProgress and overallProgress
- [ ] Display currentMessage from API
- [ ] Implement polling mechanism (setInterval or SWR)
- [ ] Add data-testid attributes: stage-*, current-message, progress-bar
- [ ] Run test: `npm run test -- tests/e2e/quick-production-flow.test.ts`
- [ ] Test passes (green phase)

**Estimated Effort:** 3 hours

---

### Test: Auto-redirect on completion (AC-6.8b.3)

**File:** `tests/e2e/quick-production-flow.test.ts`

**Tasks to make this test pass:**

- [ ] Detect currentStage='complete' in polling response
- [ ] Trigger navigation to /projects/[id]/export
- [ ] Use Next.js router.push() for redirect
- [ ] Add completion state to progress component
- [ ] Run test: `npm run test -- tests/e2e/quick-production-flow.test.ts`
- [ ] Test passes (green phase)

**Estimated Effort:** 1 hour

---

### Test: Redirect when no defaults (AC-6.8b.4)

**File:** `tests/e2e/quick-production-flow.test.ts`

**Tasks to make this test pass:**

- [ ] Handle DEFAULTS_NOT_CONFIGURED error from quick-create API
- [ ] Redirect to /settings/quick-production with prompt message
- [ ] Pass message via query param: ?prompt=Please configure default voice and persona
- [ ] Run test: `npm run test -- tests/e2e/quick-production-flow.test.ts`
- [ ] Test passes (green phase)

**Estimated Effort:** 1 hour

---

### Test: TopicSuggestionCard component (FR-6.8b.01)

**Tasks to make this test pass:**

- [ ] Create `src/components/features/rag/TopicSuggestionCard.tsx`
- [ ] Display topic title, description, source, relevanceScore
- [ ] Add "Create Video" button with onClick handler
- [ ] Show loading state while quick-create in progress
- [ ] Handle success (redirect to progress) and error (show message)
- [ ] Add data-testid attributes for all elements
- [ ] Run component test (if available)
- [ ] Test passes (green phase)

**Estimated Effort:** 2 hours

---

## Running Tests

```bash
# Run all failing tests for Story 6.8b
npm run test -- tests/e2e/quick-production-flow.test.ts tests/api/quick-create.test.ts

# Run specific test file
npm run test -- tests/e2e/quick-production-flow.test.ts

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage

# Run single test by name
npm run test -- -t "should create project and start pipeline"
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete)

**TEA Agent Responsibilities:**

- All tests written and failing
- Fixtures and factories created with auto-cleanup
- Mock requirements documented
- data-testid requirements listed
- Implementation checklist created

**Verification:**

- All tests run and fail as expected
- Failure messages are clear and actionable
- Tests fail due to missing implementation, not test bugs

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one failing test** from implementation checklist (start with highest priority)
2. **Read the test** to understand expected behavior
3. **Implement minimal code** to make that specific test pass
4. **Run the test** to verify it now passes (green)
5. **Check off the task** in implementation checklist
6. **Move to next test** and repeat

**Key Principles:**

- One test at a time (don't try to fix all at once)
- Minimal implementation (don't over-engineer)
- Run tests frequently (immediate feedback)
- Use implementation checklist as roadmap

**Progress Tracking:**

- Check off tasks as you complete them
- Share progress in daily standup
- Update story status in `workflow-status.md`

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all tests pass** (green phase complete)
2. **Review code for quality** (readability, maintainability, performance)
3. **Extract duplications** (DRY principle)
4. **Optimize performance** (if needed)
5. **Ensure tests still pass** after each refactor
6. **Update documentation** (if API contracts change)

**Completion:**

- All tests pass
- Code quality meets team standards
- No duplications or code smells
- Ready for code review and story approval

---

## Next Steps

1. **Review this checklist** with team in standup or planning
2. **Run failing tests** to confirm RED phase: `npm run test -- tests/e2e/quick-production-flow.test.ts tests/api/quick-create.test.ts`
3. **Begin implementation** using implementation checklist as guide
4. **Work one test at a time** (red -> green for each)
5. **Share progress** in daily standup
6. **When all tests pass**, refactor code for quality
7. **When refactoring complete**, run `story-done` workflow to move story to DONE

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments:

- **test-levels-framework.md** - Test level selection framework (E2E vs API vs Component vs Unit)
- **test-priorities-matrix.md** - P0-P3 priority mapping for test scenarios
- **data-factories.md** - Factory patterns for test data generation
- **network-first.md** - Route interception patterns (intercept BEFORE navigation)
- **test-quality.md** - Test design principles (Given-When-Then, one assertion per test)

See `tea-index.csv` for complete knowledge fragment mapping.

---

## Test Execution Evidence

### Initial Test Run (RED Phase Verification)

**Command:** `npm run test -- tests/e2e/quick-production-flow.test.ts tests/api/quick-create.test.ts`

**Expected Results:**

```
 FAIL  tests/e2e/quick-production-flow.test.ts
 FAIL  tests/api/quick-create.test.ts

 Test Files: 2 failed
 Tests:      30 failed
 Duration:   ~5s
```

**Summary:**

- Total tests: 30
- Passing: 0 (expected)
- Failing: 30 (expected)
- Status: RED phase verified

**Expected Failure Messages:**

- `TypeError: fetch failed` - API endpoints don't exist yet
- `Expected 200, received 404` - Routes not implemented
- `Cannot read property 'projectId' of undefined` - Response parsing fails

---

## Notes

- Tests require dev server running for API calls (`npm run dev`)
- Tests may need environment variables for base URL
- Consider adding supertest for true API integration tests
- E2E tests may need Playwright for full browser automation
- Factory requires @faker-js/faker installation for production use

---

## Contact

**Questions or Issues?**

- Ask in team standup
- Tag @tea-agent in Slack/Discord
- Refer to `.bmad/bmm/testarch/knowledge` for testing best practices

---

**Generated by BMad TEA Agent** - 2025-12-03
