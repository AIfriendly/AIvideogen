 but# Story 6.8a: QPF Infrastructure (User Preferences & Pipeline Status)

**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
**Story:** 6.8a - QPF Infrastructure (User Preferences & Pipeline Status)
**Status:** done
**Created:** 2025-12-03
**Developer:** Claude (Dev Agent)

---

## Story Description

Establish the backend infrastructure for Quick Production Flow (QPF), including the user preferences system for storing default voice/persona/duration and the pipeline status API for tracking progress. This story creates the foundation that Story 6.8b will build upon for the full one-click video creation experience.

**User Value:** Creators can configure their default voice, persona, and video duration settings once, enabling faster video creation in the future. The pipeline status API provides real-time progress tracking for automated video production.

**PRD Reference:** Feature 2.9 - Automated Video Production Pipeline (FR-2.9.QPF.02, FR-2.9.QPF.08)

---

## Acceptance Criteria

### AC-6.8a.1: Database Migration for User Preferences
- **Given** the database is initialized
- **When** Migrations 015 and 016 run
- **Then** the `user_preferences` table exists with columns: id, default_voice_id, default_persona_id, default_duration, quick_production_enabled, created_at, updated_at
- **And** a default row exists (id='default')
- **And** default_duration defaults to 2 (minutes)
- **And** foreign key references system_prompts table for persona_id

### AC-6.8a.2: Settings Page for Quick Production
- **Given** a user visits `/settings/quick-production`
- **When** they select a voice from the dropdown
- **And** they select a persona from the dropdown
- **And** they select a duration using presets or slider (1-20 minutes)
- **And** they click save
- **Then** the preferences are persisted to the database
- **And** a success message is displayed
- **And** the page reflects the saved values on refresh

### AC-6.8a.2b: Settings Page Navigation
- **Given** a user is anywhere in the application
- **When** they look at the sidebar
- **Then** they see a "Quick Production" link below "Channel Intelligence"
- **And** clicking it navigates to `/settings/quick-production`

### AC-6.8a.3: GET User Preferences API
- **Given** preferences are saved in the database
- **When** GET `/api/user-preferences` is called
- **Then** it returns the stored defaults (default_voice_id, default_persona_id, default_duration, quick_production_enabled)
- **And** it includes joined voice_name from voice-profiles.ts
- **And** it includes joined persona_name from system_prompts table
- **And** response follows standard API envelope: `{ success: true, data: {...} }`

### AC-6.8a.4: PUT User Preferences API
- **Given** a valid request body with preference updates
- **When** PUT `/api/user-preferences` is called
- **Then** the specified fields are updated in the database
- **And** the response confirms success
- **And** partial updates are supported (e.g., only update voice or duration)
- **And** duration is validated to be between 1-20 minutes

### AC-6.8a.5: Pipeline Status API
- **Given** a project is in pipeline execution (e.g., automate mode)
- **When** GET `/api/projects/[id]/pipeline-status` is called
- **Then** it returns currentStage ('script' | 'voiceover' | 'visuals' | 'assembly' | 'complete')
- **And** it returns completedStages array
- **And** it returns stageProgress (0-100 for current stage)
- **And** it returns overallProgress (0-100 overall)
- **And** it returns currentMessage (e.g., "Generating scene 3 of 5...")

---

## Tasks

### Task 1: Database Migration (Migrations 015 & 016)
- [x] Create `src/lib/db/migrations/015_user_preferences.ts`
- [x] Create `user_preferences` table with schema from tech spec
- [x] Add foreign key constraint for persona_id (voice_id references TypeScript code)
- [x] Insert default row (id='default')
- [x] Register migration in migrations index
- [x] Create `src/lib/db/migrations/016_user_preferences_duration.ts`
- [x] Add `default_duration` column (INTEGER, default 2)

### Task 2: User Preferences Repository
- [x] Create `src/lib/db/queries-user-preferences.ts`
- [x] Implement `getUserPreferences()` with joined persona name
- [x] Implement `updateUserPreferences(data)` for partial updates
- [x] Add type definitions for UserPreferences interface
- [x] Add default_duration to all interfaces and queries

### Task 3: GET /api/user-preferences Endpoint
- [x] Create `src/app/api/user-preferences/route.ts`
- [x] Implement GET handler calling repository
- [x] Return preferences with joined names (persona from DB, voice from TS code)
- [x] Handle case where preferences don't exist (return defaults)

### Task 4: PUT /api/user-preferences Endpoint
- [x] Add PUT handler to user-preferences route
- [x] Validate request body (optional fields)
- [x] Validate voice_id exists in voice-profiles.ts
- [x] Validate persona_id exists in system_prompts table
- [x] Validate duration is between 1-20 minutes
- [x] Update database and return success

### Task 5: Quick Production Settings Page
- [x] Create `src/app/settings/quick-production/page.tsx`
- [x] Implement voice dropdown (fetch from /api/voice/list)
- [x] Implement persona dropdown (fetch from /api/system-prompts)
- [x] Implement duration selector with preset buttons (1,2,3,5,10,15,20 min) and slider
- [x] Implement save functionality
- [x] Add loading and success/error states
- [x] Created Select UI component (src/components/ui/select.tsx)
- [x] Add Current Settings Summary showing voice, persona, and duration

### Task 5b: Settings Navigation
- [x] Add "Quick Production" link to ProjectSidebar.tsx
- [x] Import Zap icon from lucide-react
- [x] Update TopicSuggestions.tsx to always show settings button (not just when unconfigured)

### Task 6: Pipeline Status API
- [x] Create `src/app/api/projects/[id]/pipeline-status/route.ts`
- [x] Implement GET handler
- [x] Query project for current_step and relevant status fields
- [x] Map project state to PipelineStatus response
- [x] Calculate stage progress and overall progress
- [x] Return appropriate stage message

### Task 7: Type Definitions
- [x] Add UserPreferences interfaces to queries-user-preferences.ts
- [x] Add PipelineStatus interface in pipeline-status route
- [x] Add PipelineStage type in pipeline-status route

### Task 8: Testing
- [x] Manual testing: migration applies cleanly
- [x] TypeScript compilation passes (no errors in src/)
- [x] ESLint passes on new files
- [x] Manual testing: settings page saves preferences
- [x] Manual testing: GET returns saved values
- [x] Manual testing: pipeline-status returns proper state

---

## Technical Notes

### Architecture References
- **Tech Spec:** Epic 6 - Story 6.8a Acceptance Criteria (AC-6.8a.1 to AC-6.8a.4)
- **PRD:** Feature 2.9 - Automated Video Production Pipeline

### Dependencies
- **Story 2.3:** Voices table and API (for voice dropdown)
- **Story 2.4:** System prompts/personas (for persona dropdown)
- **Story 1.12:** Automate mode (pipeline status integration)

### Database Schema

```sql
-- Migration 015: Create table
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_voice_id TEXT,                    -- No FK: voices defined in TypeScript
  default_persona_id TEXT,
  quick_production_enabled INTEGER DEFAULT 1,  -- SQLite uses INTEGER for BOOLEAN
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (default_persona_id) REFERENCES system_prompts(id) ON DELETE SET NULL
);

INSERT OR IGNORE INTO user_preferences (id) VALUES ('default');

-- Migration 016: Add duration column
ALTER TABLE user_preferences ADD COLUMN default_duration INTEGER DEFAULT 2;
```

### API Response Formats

**GET /api/user-preferences:**
```json
{
  "success": true,
  "data": {
    "id": "default",
    "default_voice_id": "voice-123",
    "default_persona_id": "persona-456",
    "default_duration": 5,
    "quick_production_enabled": true,
    "voice_name": "Aria (Natural)",
    "persona_name": "Military Analyst"
  }
}
```

**PUT /api/user-preferences:**
```json
// Request
{
  "default_voice_id": "voice-123",
  "default_persona_id": "persona-456",
  "default_duration": 5
}
// Response
{
  "success": true
}
```

**GET /api/projects/[id]/pipeline-status:**
```json
{
  "success": true,
  "data": {
    "projectId": "proj-123",
    "topic": "F-35 Lightning II Overview",
    "currentStage": "voiceover",
    "completedStages": ["script"],
    "stageProgress": 60,
    "overallProgress": 35,
    "currentMessage": "Generating voiceover for scene 3 of 5..."
  }
}
```

### UI Layout Structure

```
/settings/quick-production
├── Header: "Quick Production Settings"
├── Description: "Configure defaults for one-click video creation"
├── Form Card
│   ├── Default Voice Dropdown
│   │   ├── Label: "Default Voice"
│   │   └── Options: [voices from API]
│   ├── Default Persona Dropdown
│   │   ├── Label: "Default Persona"
│   │   └── Options: [personas from API]
│   ├── Default Duration Selector
│   │   ├── Label: "Default Video Duration"
│   │   ├── Preset Buttons: [1, 2, 3, 5, 10, 15, 20] minutes
│   │   ├── Slider: 1-20 minutes range
│   │   └── Current Value Display
│   └── Save Button
├── Current Settings Display (voice, persona, duration)
├── About Quick Production info card
└── Back navigation

Navigation Access:
├── Sidebar: "Quick Production" link (always visible)
└── Channel Intelligence: "QPF Settings" button (always visible)
```

---

## Definition of Done

- [x] Migration 015 applies without errors
- [x] user_preferences table created with default row
- [x] GET /api/user-preferences returns preferences with joined names
- [x] PUT /api/user-preferences updates preferences correctly
- [x] Settings page renders with voice and persona dropdowns
- [x] Saving preferences persists to database
- [x] GET /api/projects/[id]/pipeline-status returns stage info
- [x] All components follow existing design patterns
- [x] No TypeScript/ESLint errors
- [x] TypeScript compilation passes
- [x] Manual testing in dev server completed

---

## Story Points

**Estimate:** 5 points (Medium)

**Justification:**
- Database migration is straightforward
- Two API endpoints with standard CRUD
- Settings page with form fields
- Pipeline status requires mapping project state
- Limited complexity compared to full QPF flow

---

## References

- PRD: Feature 2.9 - Automated Video Production Pipeline (Quick Production Flow)
- Epic File: docs/epics.md - Epic 6 Story 6.8a
- Tech Spec: docs/sprint-artifacts/tech-spec-epic-6.md - Story 6.8a section
- Architecture: docs/architecture/feature-29-automated-video-production-pipeline.md
