cd/# Story 6.8b: QPF UI & Integration (One-Click Video Creation)

## Story Info
- **Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
- **Status:** Done
- **Priority:** P1 (High)
- **Points:** 8
- **Dependencies:** Story 6.8a (User Preferences & Pipeline Status)
- **Created:** 2025-12-03
- **Updated:** 2025-12-03

## User Story

**As a** content creator using the Channel Intelligence system,
**I want** to click "Create Video" on a RAG-generated topic suggestion,
**So that** I can go from topic idea to video production with a single click, without manual setup steps.

## Description

This story implements the user-facing Quick Production Flow (QPF), enabling one-click video creation directly from RAG-generated topic suggestions. Users click "Create Video" on a topic card, and the system automatically creates a project with pre-configured defaults (voice + persona) and triggers the full video production pipeline.

### Technical Overview

- **TopicSuggestionCard** component with "Create Video" button
- **POST `/api/projects/quick-create`** endpoint for project creation + pipeline trigger
- **QuickProductionProgress** component for real-time pipeline status display
- **Progress page** at `/projects/[id]/progress` with stage tracking
- **Navigation flow**: Progress page → Export page on completion
- **Integration** with existing Automate Mode pipeline (Feature 1.12)

### PRD References

- **Feature 2.7** - Quick Production Flow (FR-2.7.QPF.01, FR-2.7.QPF.03-07)
- **AC-QPF.1** through **AC-QPF.4**

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-6.8b.01 | The system shall display a "Create Video" button on each topic suggestion card in the Channel Intelligence UI. |
| FR-6.8b.02 | When "Create Video" is clicked, the system shall check user_preferences for configured defaults. |
| FR-6.8b.03 | If defaults exist, the system shall call POST `/api/projects/quick-create` with topic and RAG context. |
| FR-6.8b.04 | The quick-create API shall create a project with topic_confirmed=true, apply defaults, and trigger the Automate Mode pipeline. |
| FR-6.8b.05 | The system shall redirect to `/projects/[id]/progress` showing real-time pipeline status. |
| FR-6.8b.06 | Upon pipeline completion, the system shall automatically redirect to `/projects/[id]/export`. |
| FR-6.8b.07 | If no defaults are configured, the system shall redirect to `/settings/quick-production` with a prompt message. |

---

## Acceptance Criteria

### AC-6.8b.1: One-Click Project Creation

**Given** a user has configured default voice and persona in user_preferences
**When** they click "Create Video" on a topic suggestion
**Then** a new project is created with:
- topic = selected topic title
- topic_confirmed = true
- voice_id = user's default_voice_id
- system_prompt_id = user's default_persona_id
- rag_context stored in project

**And** the Automate Mode pipeline starts automatically (script → voiceover → visuals → assembly)

### AC-6.8b.2: Real-Time Progress Display

**Given** the Quick Production pipeline is running
**When** the user views the progress page at `/projects/[id]/progress`
**Then** they see real-time status updates including:
- Current stage (script, voiceover, visuals, assembly)
- Stage progress percentage (0-100)
- Overall progress percentage (0-100)
- Current message (e.g., "Generating scene 3 of 5...")
- Completed stages checkmarks

### AC-6.8b.3: Auto-Redirect on Completion

**Given** the Quick Production pipeline completes successfully
**When** assembly finishes and currentStage becomes 'complete'
**Then** the user is automatically redirected to `/projects/[id]/export`
**And** the completed video is ready for download

### AC-6.8b.4: Defaults Not Configured Handling

**Given** a user has NOT configured default voice or persona
**When** they click "Create Video" on a topic suggestion
**Then** they are redirected to `/settings/quick-production`
**And** a message is displayed: "Please configure your default voice and persona to use Quick Production"

---

## Technical Design

### API: POST /api/projects/quick-create

```typescript
// Request
{
  topic: string;                       // Video topic from suggestion
  ragContext?: RAGContext;             // Pre-assembled RAG context
}

// Response (Success)
{
  success: true,
  data: {
    projectId: string;                 // Created project ID
    redirectUrl: string;               // /projects/{id}/progress
  }
}

// Response (Error: No Defaults)
{
  success: false,
  error: 'DEFAULTS_NOT_CONFIGURED',
  message: 'Please configure default voice and persona'
}

// Response (Error: Pipeline Failed)
{
  success: false,
  error: 'PIPELINE_FAILED',
  message: string
}
```

### Component: TopicSuggestionCard

```typescript
interface TopicSuggestionCardProps {
  suggestion: TopicSuggestion;
  hasDefaults: boolean;
  onCreateVideo: (topic: string, ragContext: RAGContext) => void;
}

// TopicSuggestion interface (from tech spec)
interface TopicSuggestion {
  id: string;
  title: string;
  description: string;
  source: 'news' | 'trend' | 'competitor' | 'channel_gap';
  relevanceScore: number;              // 0-100
  ragContext: RAGContext;              // Pre-assembled context
}
```

### Component: QuickProductionProgress

```typescript
interface QuickProductionProgressProps {
  projectId: string;
  onComplete: (projectId: string) => void;
}

// Polls GET /api/projects/{id}/pipeline-status every 2 seconds
// Displays:
// - Stage progress bar with 4 stages
// - Current stage indicator
// - Current message
// - Error state with retry option
```

### Progress Page: /projects/[id]/progress

New route that displays QuickProductionProgress component and handles:
- Auto-redirect to export page on completion
- Error display with retry/edit/cancel options
- Browser close warning during pipeline execution

### Pipeline Integration

Quick Production Flow reuses Automate Mode pipeline from Feature 1.12:

| Aspect | Automate Mode (1.12) | Quick Production (6.8b) |
|--------|---------------------|-------------------------|
| Entry Point | Chat → Confirm Topic | Topic Suggestion → Click |
| Configuration | Per-project toggle | Global user_preferences |
| Voice Selection | Before automation | Pre-configured default |
| Persona Selection | Project-level | Pre-configured default |
| RAG Context | Optional | Always included |
| Pipeline | Same orchestration | Same orchestration |

---

## Tasks

### Task 1: Create TopicSuggestionCard Component
- [x] Create `components/features/rag/TopicSuggestionCard.tsx`
- [x] Display topic title, description, source badge, relevance score
- [x] Add "Create Video" button with loading state
- [x] Handle hasDefaults prop to enable/disable button
- [x] Style consistent with existing card components

### Task 2: Create POST /api/projects/quick-create Endpoint
- [x] Create `app/api/projects/quick-create/route.ts`
- [x] Validate request body (topic required)
- [x] Check user_preferences for defaults
- [x] If no defaults, return DEFAULTS_NOT_CONFIGURED error
- [x] Create project with topic_confirmed=true
- [x] Apply default_voice_id and default_persona_id
- [x] Store ragContext in project (if provided)
- [x] Trigger Automate Mode pipeline
- [x] Return projectId and redirectUrl

### Task 3: Create QuickProductionProgress Component
- [x] Create `components/features/rag/QuickProductionProgress.tsx`
- [x] Poll pipeline-status API every 2 seconds
- [x] Display 4-stage progress indicator (script, voiceover, visuals, assembly)
- [x] Show current stage with animation
- [x] Display stage progress and overall progress
- [x] Show current message
- [x] Handle error state with retry option
- [x] Call onComplete when currentStage = 'complete'

### Task 4: Create Progress Page Route
- [x] Create `app/projects/[id]/progress/page.tsx`
- [x] Render QuickProductionProgress component
- [x] Handle auto-redirect to export on completion
- [x] Add beforeunload warning during pipeline
- [x] Handle error states with retry/edit/cancel options

### Task 5: Update Channel Intelligence Page
- [x] Add TopicSuggestionCard to topic suggestions section
- [x] Integrate with GET /api/rag/topic-suggestions
- [x] Handle "Create Video" click → call quick-create API
- [x] Handle redirect to progress page on success
- [x] Handle redirect to settings on DEFAULTS_NOT_CONFIGURED

### Task 5b: Settings Navigation Enhancement (Sprint Change 2025-12-03)
- [x] Update TopicSuggestions to always show settings button (not only when unconfigured)
- [x] Dynamic button label: "Setup Quick Production" when no defaults, "QPF Settings" when configured
- [x] Ensures users can modify voice/persona/duration settings at any time

### Task 6: Integration Testing
- [x] Test one-click flow with configured defaults
- [x] Test redirect to settings when no defaults
- [x] Test progress page updates during pipeline
- [x] Test auto-redirect to export on completion
- [x] Test error handling and retry functionality

---

## Test Cases

### Unit Tests

| Test ID | Component | Description |
|---------|-----------|-------------|
| 6.8b-UT-001 | TopicSuggestionCard | Renders topic title, description, and source |
| 6.8b-UT-002 | TopicSuggestionCard | "Create Video" button disabled when hasDefaults=false |
| 6.8b-UT-003 | TopicSuggestionCard | Calls onCreateVideo with correct params on click |
| 6.8b-UT-004 | QuickProductionProgress | Displays correct stage based on currentStage |
| 6.8b-UT-005 | QuickProductionProgress | Shows progress bar at correct percentage |
| 6.8b-UT-006 | QuickProductionProgress | Calls onComplete when stage is 'complete' |

### API Tests

| Test ID | Endpoint | Description |
|---------|----------|-------------|
| 6.8b-API-001 | POST /quick-create | Returns DEFAULTS_NOT_CONFIGURED when no defaults |
| 6.8b-API-002 | POST /quick-create | Creates project with correct defaults applied |
| 6.8b-API-003 | POST /quick-create | Returns projectId and redirectUrl on success |
| 6.8b-API-004 | POST /quick-create | Validates topic is required |
| 6.8b-API-005 | POST /quick-create | Stores ragContext in project |

### E2E Tests

| Test ID | Scenario | Description |
|---------|----------|-------------|
| 6.8b-E2E-001 | One-click creation | User with defaults clicks Create Video → pipeline starts |
| 6.8b-E2E-002 | No defaults flow | User without defaults → redirected to settings |
| 6.8b-E2E-003 | Progress tracking | Progress page shows real-time updates |
| 6.8b-E2E-004 | Completion redirect | Auto-redirect to export on pipeline completion |

---

## Definition of Done

- [x] All Acceptance Criteria verified and passing
- [x] TopicSuggestionCard component created and functional
- [x] POST /api/projects/quick-create endpoint implemented
- [x] QuickProductionProgress component created and functional
- [x] Progress page route created at /projects/[id]/progress
- [x] Channel Intelligence page updated with topic suggestion cards
- [x] Integration with Automate Mode pipeline verified
- [x] Unit tests written and passing
- [x] API tests written and passing
- [x] No TypeScript errors
- [x] Code reviewed and approved
- [x] Documentation updated

---

## Notes

- **Depends on 6.8a:** This story requires the user_preferences table and pipeline-status API from Story 6.8a
- **Reuses Automate Mode:** Leverages existing pipeline orchestration from Feature 1.12
- **RAG Context:** The ragContext from topic suggestions is passed through to script generation for better results
- **Error Recovery:** Pipeline failures should offer retry, edit, and cancel options
- **Sprint Change (2025-12-03):** TopicSuggestions settings button now always visible with dynamic label for better settings accessibility
