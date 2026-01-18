# Epic Technical Specification: Visual Curation Interface

Date: 2025-11-18
Author: master
Epic ID: 4
Status: Draft

---

## Overview

Epic 4 delivers the Visual Curation Interface, a critical user-facing component that bridges the automated content generation pipeline (Epic 2-3) with final video assembly (Epic 5). This epic implements a scene-by-scene review and selection interface where users examine their generated script alongside AI-sourced YouTube clip suggestions, preview downloaded video segments instantly without additional downloads, and finalize their creative vision by selecting exactly one clip per scene.

The interface is built on Next.js 15.5 with shadcn/ui components (per UX specifications), implements instant video preview using pre-downloaded segments from Epic 3 Story 3.6, and maintains strict workflow validation to ensure complete scene coverage before assembly. The system leverages the visual_suggestions table from Epic 3, introduces a selected_clip_id foreign key to the scenes table, and provides robust error recovery for edge cases like missing suggestions or failed downloads.

## Objectives and Scope

**In Scope:**
- Scene-by-scene UI layout displaying script text with numbered sections (Story 4.1)
- Visual suggestion gallery showing 5-8 AI-sourced clips per scene with thumbnails, metadata, and download status (Story 4.2)
- HTML5 video preview player with instant playback of pre-downloaded segments, keyboard shortcuts, and YouTube iframe fallback (Story 4.3)
- Clip selection mechanism enforcing exactly one selection per scene with optimistic UI updates and database persistence (Story 4.4)
- "Assemble Video" button with validation, progress tracking, and confirmation modal (Story 4.5)
- Workflow integration connecting Epic 2 preview → Epic 3 sourcing → Epic 4 curation, with navigation, session persistence, and error recovery (Story 4.6)
- Empty state handling for scenes with zero suggestions
- Retry functionality for failed visual sourcing API calls
- Responsive design for desktop (1920px) and tablet (768px) viewports

**Out of Scope (Post-MVP / Other Epics):**
- Manual video search within the UI (PRD Feature 2.3 - Future Enhancement)
- Script editing and voiceover regeneration per scene (PRD Feature 2.5 - Future Enhancement)
- Text overlay functionality (PRD Feature 2.4 - Future Enhancement)
- Custom segment trimming or advanced video editing
- Mobile-optimized responsive design (desktop-first per architecture)
- Video assembly implementation itself (Epic 5)

## System Architecture Alignment

**Core Components Referenced:**
- **Frontend Framework:** Next.js 15.5 App Router (`app/projects/[id]/visual-curation`)
- **Component Library:** shadcn/ui for buttons, cards, dialogs, progress indicators (per architecture decision table)
- **Video Player:** Plyr library for accessible, lightweight HTML5 video playback (per UX specification)
- **State Management:** Zustand 5.0.8 via `stores/curation-store.ts` for clip selection state
- **Database:** SQLite via better-sqlite3 (`scenes` table, `visual_suggestions` table)
- **API Layer:** Next.js API Routes for scene retrieval, suggestion fetching, clip selection, assembly trigger

**Database Schema Extensions:**
- Extends `scenes` table with `selected_clip_id` foreign key → `visual_suggestions(id)`
- Utilizes existing `visual_suggestions` table fields: `default_segment_path`, `download_status`, `duration`, `rank` (from Epic 3)

**Integration Points:**
- **Epic 2 Integration:** Reads `scenes.text`, `scenes.audio_file_path`, `scenes.duration` for display
- **Epic 3 Integration:** Consumes `visual_suggestions` data (videoId, title, thumbnail, duration, download status, segment paths)
- **Epic 5 Integration (UPDATED 2025-11-25):** Full pipeline integration via `/api/projects/[id]/assemble` endpoint
  - Orchestrates VideoAssembler (Story 5.1), Trimmer (Story 5.2), and Concatenator (Story 5.3)
  - Implements YouTube download stage before video processing
  - Returns `assemblyJobId` for async job tracking
  - Final output: `public/videos/{projectId}/final.mp4`

**Constraints from Architecture:**
- Desktop-first responsive design (1920px primary, 768px tablet minimum)
- No external dependencies beyond current stack (Next.js, Tailwind, shadcn/ui, Plyr)
- Local file storage pattern: `.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`
- Follows established API design patterns (REST-style Next.js routes with standard error responses)

## Detailed Design

### Services and Modules

| Module/Component | Responsibility | Inputs | Outputs | Owner/Story |
|------------------|---------------|--------|---------|-------------|
| **VisualCuration.tsx** | Main page component, orchestrates layout | projectId (URL param) | Scene sections with galleries | Story 4.1 |
| **SceneCard.tsx** | Individual scene section with script text | Scene object (id, number, text, duration) | Rendered scene header + text | Story 4.1 |
| **VisualSuggestionGallery.tsx** | Grid display of video suggestions | sceneId, suggestions array | Gallery of suggestion cards | Story 4.2 |
| **VideoPreviewPlayer.tsx** | HTML5 player for segment preview | suggestionId, segmentPath, videoId | Video playback UI with controls | Story 4.3 |
| **ClipSelectionCard.tsx** | Individual clickable suggestion | suggestion object, isSelected boolean | Interactive card with selection state | Story 4.4 |
| **AssemblyTriggerButton.tsx** | Sticky footer validation button | projectId, selections state | Assembly trigger API call | Story 4.5 |
| **ProgressTracker.tsx** | Scene completion counter | totalScenes, selectedCount | "3/5 scenes selected" indicator | Story 4.1, 4.5 |
| **EmptyClipState.tsx** | Fallback UI for zero suggestions | sceneNumber | Empty state message + retry button | Story 4.2 |
| **NavigationBreadcrumb.tsx** | Workflow progress breadcrumb | currentStep | Breadcrumb trail with links | Story 4.6 |
| **ConfirmationModal.tsx** | Assembly confirmation dialog | projectId, sceneCount | Confirm/cancel actions | Story 4.5 |
| **curation-store.ts** (Zustand) | Clip selection state management | projectId | selections map, actions (selectClip, clearSelections) | Story 4.4 |
| **GET /api/projects/[id]/scenes** | Retrieve all scenes for project | projectId | Array of scene objects with text, audio, duration | Story 4.1 |
| **GET /api/projects/[id]/visual-suggestions** | Retrieve suggestions per scene | projectId | Nested array: sceneId → suggestions[] | Story 4.2 |
| **POST /api/projects/[id]/select-clip** | Save clip selection to database | projectId, sceneId, suggestionId | Success/error response | Story 4.4 |
| **POST /api/projects/[id]/assemble** | Trigger video assembly | projectId, selections data | assemblyJobId, status | Story 4.5 |

### Data Models and Contracts

**Database Schema Extensions:**

```sql
-- Extend scenes table with selected clip tracking (Story 4.4)
ALTER TABLE scenes ADD COLUMN selected_clip_id TEXT REFERENCES visual_suggestions(id);
CREATE INDEX idx_scenes_selected_clip ON scenes(selected_clip_id);

-- No changes to visual_suggestions table (reuses Epic 3 schema)
-- Fields used: id, scene_id, video_id, title, thumbnail_url, channel_title,
--              duration, default_segment_path, download_status, rank
```

**TypeScript Interfaces:**

```typescript
// Scene data model (extends Epic 2)
interface Scene {
  id: string;
  project_id: string;
  scene_number: number;
  text: string;
  audio_file_path: string;
  duration: number;  // seconds
  selected_clip_id?: string | null;  // NEW: foreign key to visual_suggestions
  created_at: string;
}

// Visual suggestion model (from Epic 3, consumed here)
interface VisualSuggestion {
  id: string;
  scene_id: string;
  video_id: string;  // YouTube video ID
  title: string;
  thumbnail_url: string;
  channel_title: string;
  embed_url: string;
  rank: number;  // 1-8
  duration: number;  // seconds
  default_segment_path: string | null;  // Path to .cache/videos/ file
  download_status: 'pending' | 'downloading' | 'complete' | 'error';
  created_at: string;
}

// Curation store state (Story 4.4)
interface CurationState {
  projectId: string | null;
  selections: Map<string, string>;  // sceneId → suggestionId
  selectClip: (sceneId: string, suggestionId: string) => void;
  clearSelections: () => void;
  getSelectionCount: () => number;
  isSceneComplete: (sceneId: string) => boolean;
  getAllSelected: () => boolean;  // true if all scenes have selections
}

// Assembly request payload (Story 4.5)
interface AssemblyRequest {
  projectId: string;
  scenes: {
    sceneId: string;
    sceneNumber: number;
    scriptText: string;
    audioFilePath: string;
    selectedClipId: string;
    videoId: string;
    clipDuration: number;
  }[];
}
```

### APIs and Interfaces

**API Endpoint Specifications:**

1. **GET /api/projects/[id]/scenes** (Story 4.1)
   - **Purpose:** Fetch all scenes for visual curation display
   - **Auth:** None (local single-user app)
   - **Request:** `GET /api/projects/abc123/scenes`
   - **Response 200:**
     ```json
     {
       "scenes": [
         {
           "id": "scene-1",
           "project_id": "abc123",
           "scene_number": 1,
           "text": "Picture this: A million humans living on Mars by 2050...",
           "audio_file_path": ".cache/audio/abc123/scene-1.mp3",
           "duration": 12.5,
           "selected_clip_id": null
         }
       ]
     }
     ```
   - **Error 404:** Project not found
   - **Error 500:** Database query failure

2. **GET /api/projects/[id]/visual-suggestions** (Story 4.2)
   - **Purpose:** Fetch all visual suggestions grouped by scene
   - **Request:** `GET /api/projects/abc123/visual-suggestions`
   - **Response 200:**
     ```json
     {
       "suggestions": {
         "scene-1": [
           {
             "id": "sugg-1",
             "scene_id": "scene-1",
             "video_id": "dQw4w9WgXcQ",
             "title": "Mars Colony Visualization",
             "thumbnail_url": "https://i.ytimg.com/...",
             "channel_title": "Space Channel",
             "duration": 45,
             "default_segment_path": ".cache/videos/abc123/scene-1-default.mp4",
             "download_status": "complete",
             "rank": 1
           }
         ]
       }
     }
     ```

3. **POST /api/projects/[id]/select-clip** (Story 4.4)
   - **Purpose:** Save user's clip selection to database
   - **Request:**
     ```json
     {
       "sceneId": "scene-1",
       "suggestionId": "sugg-1"
     }
     ```
   - **Response 200:**
     ```json
     {
       "success": true,
       "sceneId": "scene-1",
       "selectedClipId": "sugg-1"
     }
     ```
   - **Error 400:** Invalid sceneId or suggestionId
   - **Error 409:** Suggestion does not belong to specified scene

4. **POST /api/projects/[id]/assemble** (Story 4.5 - UPDATED INTEGRATION 2025-11-25)
   - **Purpose:** Trigger Epic 5 video assembly process with full pipeline orchestration
   - **Implementation Details:**
     - Validates all scenes have clip selections (INNER JOIN scenes + visual_suggestions)
     - Creates async assembly job via VideoAssembler (Epic 5 Story 5.1)
     - Downloads YouTube videos using yt-dlp with retry logic (added download stage)
     - Trims videos to match audio duration via Trimmer (Epic 5 Story 5.2)
     - Concatenates scenes and overlays audio via Concatenator (Epic 5 Story 5.3)
   - **Request:** No body required (pulls data from database)
   - **Response 200:**
     ```json
     {
       "assemblyJobId": "d5557468-f23c-4040-baa4-28f76c2e92ff",
       "status": "processing",
       "message": "Video assembly started - processing in background",
       "sceneCount": 4
     }
     ```
   - **Error 400:** Incomplete scene selections
   - **Database:** Migration 009 adds 'downloading' stage to assembly_jobs
   - **Output:** Final video at `public/videos/{projectId}/final.mp4`

### Workflows and Sequencing

**Primary User Flow: Scene Review → Clip Selection → Assembly Trigger**

```
1. User Navigation
   [Epic 2 Script Preview] → Click "Continue to Visual Curation"
   ↓
   Navigate to /projects/[id]/visual-curation
   ↓
   projects.current_step = 'visual-curation' (validation check)

2. Page Load & Data Fetching (Story 4.1, 4.2)
   GET /api/projects/[id]/scenes → Load scene data
   ↓
   GET /api/projects/[id]/visual-suggestions → Load suggestions
   ↓
   Initialize curation-store with projectId
   ↓
   Render VisualCuration page with SceneCard[] and VisualSuggestionGallery[]

3. Clip Preview (Story 4.3)
   User clicks suggestion card
   ↓
   Open VideoPreviewPlayer component
   ↓
   IF download_status == 'complete':
      Load video from default_segment_path (local cache)
      → Instant playback (no network delay)
   ELSE IF download_status == 'error':
      Fallback to YouTube iframe embed
      → Streaming playback
   ↓
   User closes preview or selects clip

4. Clip Selection (Story 4.4)
   User clicks "Select" on suggestion card
   ↓
   curation-store.selectClip(sceneId, suggestionId)
   ↓
   Optimistic UI update (card shows checkmark immediately)
   ↓
   POST /api/projects/[id]/select-clip (background)
   ↓
   Update scenes.selected_clip_id in database
   ↓
   Update ProgressTracker: "X/Y scenes selected"

5. Assembly Trigger (Story 4.5)
   User reviews all selections (progress = 5/5 scenes)
   ↓
   "Assemble Video" button enabled
   ↓
   User clicks button → Open ConfirmationModal
   ↓
   User confirms → Gather all scene + selection data
   ↓
   POST /api/projects/[id]/assemble with complete payload
   ↓
   Navigate to /projects/[id]/assembly (Epic 5 placeholder)
```

**Error Recovery Flows (Story 4.6):**

```
Empty Suggestions Recovery:
IF scene has zero suggestions (Epic 3 returned 0 results):
   → Display EmptyClipState component
   → Show message: "No clips found for this scene..."
   → Provide "Retry Visual Sourcing" button
   → On retry: POST /api/projects/[id]/generate-visuals for that scene

Download Failure Recovery:
IF default_segment_path is NULL OR download_status == 'error':
   → VideoPreviewPlayer uses YouTube iframe fallback
   → User can still preview and select clip (streaming instead of local)
   → Selection workflow continues normally

Incomplete Selection Prevention:
IF user navigates away with incomplete selections:
   → Warning modal: "You haven't selected clips for all scenes..."
   → Selections persist in database (not lost)
   → User can return via NavigationBreadcrumb

Workflow Step Validation:
IF user accesses /visual-curation with wrong current_step:
   → Redirect to correct step based on projects.current_step
   → Show warning toast: "Please complete [step name] first"
```

## Non-Functional Requirements

### Performance

**Page Load Targets:**
- Initial page render: <2 seconds from navigation (desktop 1920px, Chrome)
- Scene data API (`GET /scenes`): <500ms (typical 3-5 scenes)
- Suggestions API (`GET /visual-suggestions`): <1 second (30-40 suggestions total)
- Video segment loading: <100ms initial playback (pre-downloaded files)
- Clip selection persistence: <200ms roundtrip (POST /select-clip)

**Rendering Performance:**
- Smooth 60fps scrolling through scenes (no layout thrashing)
- Lazy load video thumbnails (Intersection Observer pattern)
- Debounce rapid clip selections (300ms) to reduce database writes
- Virtual scrolling not required for MVP (typical 3-5 scenes per project)

**Video Playback Performance:**
- Instant playback (<100ms) for downloaded segments (Epic 3 default downloads)
- Fallback to YouTube iframe: <3 seconds initial stream start
- Plyr player initialization: <50ms per player instance
- Support simultaneous preview of multiple clips (user can open/close players rapidly)

**Database Query Optimization:**
- Indexed queries on `scenes.project_id`, `visual_suggestions.scene_id`, `scenes.selected_clip_id`
- Single JOIN query for scene + selection data (avoid N+1 queries)
- Prepared statements for repeated queries (better-sqlite3 pattern)

### Security

**Local Application Security:**
- No authentication required (single-user local app per architecture)
- No sensitive data transmitted over network (all operations local)
- File system access limited to `.cache/` directory (sandboxed file operations)
- No user-uploaded files (content sourced from YouTube API only)

**Input Validation:**
- Validate `projectId` format (alphanumeric, max 64 chars) before database queries
- Validate `sceneId` and `suggestionId` existence before UPDATE operations
- Sanitize all database inputs (use parameterized queries via better-sqlite3)
- Prevent SQL injection via prepared statements (no string concatenation)

**YouTube Content Safety:**
- Display unmodified YouTube metadata (title, channel, thumbnail URLs from API)
- No content filtering beyond Epic 3 implementation (licensing, view counts, spam detection)
- User responsible for reviewing suggested content before selection
- YouTube iframe embed respects YouTube's CSP and embed policies

**Privacy:**
- All data stored locally in SQLite (no cloud sync)
- No telemetry or analytics tracking
- User's video selections never leave local machine
- No PII collected or stored

### Reliability/Availability

**Error Handling Strategy:**
- Graceful degradation for missing video segments (YouTube iframe fallback)
- Empty state UI for scenes with zero suggestions (retry functionality)
- Toast notifications for API failures (non-blocking, user-dismissible)
- Optimistic UI updates with rollback on failure (selection state management)

**Data Integrity:**
- Foreign key constraints: `scenes.selected_clip_id` → `visual_suggestions(id)`
- Cascade behavior: If suggestion deleted, `selected_clip_id` set to NULL (safe failure)
- Database transaction support for multi-step operations (selection + metadata update)
- Atomic writes for selection persistence (no partial state)

**Failure Scenarios:**
- **Missing audio file:** Display error message, provide "Regenerate Voiceover" button
- **Zero suggestions for scene:** Show empty state with "Retry Visual Sourcing" action
- **Failed segment download:** Use YouTube iframe fallback (streaming preview)
- **Database lock/busy:** Retry with exponential backoff (3 attempts, 100ms/200ms/400ms delays)
- **Network failure (YouTube thumbnails):** Display placeholder image, retry on next load

**Session Persistence:**
- Selections saved to database immediately (survive browser refresh)
- Scroll position and preview state stored in localStorage (UX continuity)
- Project ID tracked in URL param (shareable link within local app)

### Observability

**Frontend Logging:**
- Console logging for development (all API calls, state changes)
- Error boundary component for React render failures (display fallback UI)
- Performance monitoring via React DevTools and Chrome Lighthouse
- Log levels: ERROR (API failures, unexpected states), WARN (fallbacks triggered), INFO (major state transitions)

**API Logging:**
- Request logging: Method, path, projectId, timestamp (Next.js built-in)
- Error logging: Stack trace, request body, database query details
- Performance logging: Query execution time, API response time
- Log file location: Console output (stdout/stderr) for development

**Metrics to Track:**
- Page load performance (Time to Interactive, Largest Contentful Paint)
- API latency (p50, p95, p99 for each endpoint)
- Video playback success rate (local segment vs YouTube fallback ratio)
- Selection completion rate (% of users completing all scene selections)
- Database query performance (slow query log for >500ms queries)

**Debugging Tools:**
- React DevTools for component tree and state inspection
- Zustand DevTools for curation-store state tracking
- SQLite CLI for direct database inspection (`sqlite3 database.db`)
- Network tab for API request/response debugging
- Video element events logged (canplay, error, loadedmetadata) for playback issues

## Dependencies and Integrations

**External Dependencies (from package.json):**

| Dependency | Version | Purpose | Epic 4 Usage |
|------------|---------|---------|--------------|
| **next** | 16.0.1 | Framework | App Router pages, API routes, server components |
| **react** | 19.2.0 | UI library | Component rendering, hooks (useState, useEffect) |
| **react-dom** | 19.2.0 | DOM rendering | Hydration, client-side rendering |
| **zustand** | 5.0.8 | State management | curation-store for clip selection state |
| **better-sqlite3** | 12.4.1 | Database | Read scenes, visual_suggestions; write selected_clip_id |
| **plyr** | 3.8.3 | Video player | HTML5 video playback UI (Story 4.3) |
| **@radix-ui/react-dialog** | 1.1.15 | Dialog primitive | ConfirmationModal (Story 4.5) |
| **@radix-ui/react-scroll-area** | 1.2.10 | Scroll container | Scene list scrolling |
| **lucide-react** | 0.552.0 | Icon library | Checkmark, play button, close icons |
| **tailwindcss** | 4 (dev) | CSS framework | Responsive styling, component design |
| **clsx** + **tailwind-merge** | Latest | Class utility | Conditional class names, style merging |

**Internal Dependencies (Other Epics):**

| Epic/Module | Dependency Type | What We Consume | Impact if Changed |
|-------------|----------------|-----------------|-------------------|
| **Epic 2 (Content Generation)** | Data dependency | scenes table (text, audio_file_path, duration) | Breaking: Cannot display script or scene metadata |
| **Epic 3 (Visual Sourcing)** | Data + API dependency | visual_suggestions table, default_segment_path, download_status | Breaking: No clips to display; must regenerate |
| **Epic 5 (Video Assembly)** | Integration point | Assembly API consumes our selected_clip_id | Breaking: Assembly cannot retrieve user selections |
| **Database Schema** | Critical dependency | scenes, visual_suggestions tables with specific columns | Breaking: Missing columns cause SQL errors |
| **File System** | Runtime dependency | .cache/videos/{projectId}/ directory with segment files | Degraded: Fallback to YouTube iframe if files missing |

**Integration Contracts:**

1. **Epic 2 → Epic 4 Contract:**
   - Epic 2 MUST populate: `scenes.text`, `scenes.audio_file_path`, `scenes.duration`
   - Epic 4 assumes: All scenes have non-null text and valid audio paths
   - Break condition: If `audio_file_path` is NULL, Epic 4 displays error state

2. **Epic 3 → Epic 4 Contract:**
   - Epic 3 MUST populate: `visual_suggestions` with 5-8 suggestions per scene (ideally)
   - Epic 3 MUST download: Default segments to `.cache/videos/` with `default_segment_path` recorded
   - Epic 4 graceful degradation: If 0 suggestions, show empty state; if download failed, use YouTube iframe

3. **Epic 4 → Epic 5 Contract:**
   - Epic 4 MUST populate: `scenes.selected_clip_id` for ALL scenes before assembly trigger
   - Epic 4 MUST provide: Complete scene data (sceneId, videoId, clipDuration, audioFilePath) in assembly request
   - Epic 5 assumes: All selected clips exist in visual_suggestions table

**External Service Integrations:**
- **YouTube (indirect):** Epic 4 uses YouTube thumbnail URLs and videoIds from Epic 3 data
  - No direct YouTube API calls in Epic 4
  - Fallback to YouTube iframe embed for failed segment downloads
- **File System:** Reads pre-downloaded video segments from `.cache/videos/{projectId}/`
  - No write operations (read-only access to Epic 3's downloaded files)

## Acceptance Criteria (Authoritative)

**Epic 4 High-Level Acceptance Criteria (from PRD Feature 1.6):**

### AC1: Scene and Clip Display
- **Given:** System has generated a 3-scene script with 4 suggested clips per scene
- **When:** User opens the Visual Curation UI
- **Then:** UI must display 3 distinct sections, one for each scene, with each section showing the scene's text and its 4 suggested video clips

### AC2: Clip Selection
- **Given:** User is viewing the suggestions for Scene 1
- **When:** User clicks on the second suggested video clip
- **Then:** That clip must be visually marked as "selected" for Scene 1

### AC3: Finalization Trigger
- **Given:** User has selected one clip for every scene in the script
- **When:** User clicks the "Assemble Video" button
- **Then:** System must trigger the video assembly process with the user's selections

### AC4: Incomplete Selection Prevention
- **Given:** Script has 3 scenes and user has only selected clips for 2 of them
- **Then:** "Assemble Video" button must be disabled or inactive

**Story-Level Acceptance Criteria:**

### Story 4.1: Scene-by-Scene UI Layout
1. VisualCuration page displays after visual sourcing completes (projects.current_step = 'visual-curation')
2. All scenes displayed in sequential order (Scene 1, Scene 2, Scene 3...)
3. Each scene section shows scene number and complete script text
4. Scene data loads from database via GET /api/projects/[id]/scenes endpoint
5. Loading indicator displays while fetching scene data
6. Error messages display if scenes cannot be loaded
7. Layout is responsive and readable on desktop (1920px) and tablet (768px) screens
8. Empty state displays if no scenes exist for project

### Story 4.2: Visual Suggestions Gallery
1. Each scene section displays its suggested video clips in a gallery grid (2-3 columns)
2. Each suggestion card shows: YouTube thumbnail, video title, channel name, duration
3. Suggestions ordered by rank (1-8) from Epic 3 Story 3.4 filtering
4. Download status indicator visible per suggestion (pending/downloading/complete/error icon)
5. **Empty State:** If scene has 0 suggestions, display message: "No clips found for this scene..."
6. **Retry Functionality:** If visual sourcing failed, "Retry Visual Sourcing" button appears
7. Loading skeleton displays while suggestions are being fetched
8. Graceful degradation if thumbnails fail to load (show placeholder image)

### Story 4.3: Video Preview Player
1. Clicking a suggestion card opens video preview player
2. **Default Segment Playback:** Video plays downloaded segment from `.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`
3. **Instant Playback:** Video starts immediately without additional downloads
4. Play/pause, progress bar, and volume controls functional
5. **Fallback for Failed Downloads:** If default_segment_path is NULL or download_status = 'error', player embeds YouTube iframe instead
6. Keyboard shortcuts work (Space = play/pause, Esc = close)
7. Multiple previews can be watched sequentially (no need to reload page)
8. Video player responsive and works on desktop and tablet

### Story 4.4: Clip Selection Mechanism
1. Clicking a suggestion card marks it as "Selected" with visual indicator (checkmark icon, blue border)
2. Selecting a different clip for the same scene deselects the previous one automatically
3. Selection state persists during page session (stored in Zustand store)
4. POST /api/projects/[id]/select-clip saves selection to database (scenes.selected_clip_id)
5. Selection count indicator displays: "Scenes Selected: 3/5" at top of page
6. Optimistic UI update (selection appears immediately, saved in background)
7. Error handling: if save fails, show toast notification and revert UI state
8. All scenes default to "No selection" state initially

### Story 4.5: Assembly Trigger & Validation
1. "Assemble Video" button displays at bottom of page (sticky footer)
2. **Incomplete Selection:** Button disabled if any scene missing selection, tooltip shows: "Select clips for all 5 scenes to continue"
3. **Complete Selection:** Button enabled when all scenes have selections
4. Clicking enabled button shows confirmation modal with scene count and selections summary
5. **Assembly Trigger:** Confirming modal calls POST /api/projects/[id]/assemble with complete scene data
6. Assembly endpoint updates projects.current_step and returns assembly job ID
7. User navigated to assembly status/progress page (placeholder until Epic 5)
8. Error toast displays if assembly trigger fails
9. Button shows loading spinner while assembly request processes

### Story 4.6: Workflow Integration & Error Recovery
1. After Epic 2 voiceover generation, "Continue to Visual Curation" button appears and navigates to /projects/[id]/visual-curation
2. Direct URL access to /projects/[id]/visual-curation works if projects.current_step = 'visual-curation'
3. If user accesses page with wrong workflow step (e.g., current_step = 'voice'), redirect to correct step with warning
4. "Back to Script Preview" link navigates to Epic 2 Story 2.6 preview page
5. "Regenerate Visuals" button triggers POST /api/projects/[id]/generate-visuals (Epic 3 Story 3.5)
6. Scroll position and open preview state persist across page reloads (localStorage)
7. Warning modal appears if user navigates away with incomplete selections
8. Edge case handling: if scene has no audio_file_path, display error message with option to regenerate voiceovers
9. Breadcrumb navigation shows: Project → Script → Voiceover → Visual Curation

## Traceability Mapping

| Acceptance Criterion | Spec Section(s) | Component(s)/API(s) | Test Idea |
|---------------------|----------------|---------------------|-----------|
| **PRD AC1: Scene and Clip Display** | Services & Modules (lines 66-82), Workflows (lines 267-274) | VisualCuration.tsx, SceneCard.tsx, VisualSuggestionGallery.tsx, GET /api/projects/[id]/scenes, GET /api/projects/[id]/visual-suggestions | Integration test: Load project with 3 scenes × 4 suggestions, verify DOM contains 3 SceneCards with 12 total suggestion cards |
| **PRD AC2: Clip Selection** | Data Models (lines 129-138), APIs (lines 207-225), Workflows (lines 290-301) | ClipSelectionCard.tsx, curation-store.ts, POST /api/projects/[id]/select-clip | Unit test: Click suggestion card, verify optimistic UI update + API call + database write |
| **PRD AC3: Finalization Trigger** | APIs (lines 227-253), Workflows (lines 303-315) | AssemblyTriggerButton.tsx, ConfirmationModal.tsx, POST /api/projects/[id]/assemble | E2E test: Select all clips, click Assemble, verify modal → API call → navigation |
| **PRD AC4: Incomplete Selection Prevention** | Services & Modules (line 74), NFR Reliability (lines 401-405) | AssemblyTriggerButton.tsx (disabled state logic) | Unit test: Verify button disabled when selections.size < totalScenes |
| **Story 4.1 AC1-8** | Services & Modules (lines 68-69), Data Models (lines 101-111) | VisualCuration.tsx, SceneCard.tsx, ProgressTracker.tsx, GET /scenes | Component test: Mock scenes API, verify scene sections render with correct text/numbers |
| **Story 4.2 AC1-8** | Services & Modules (lines 70, 75), Data Models (lines 114-127), Workflows (lines 320-325) | VisualSuggestionGallery.tsx, EmptyClipState.tsx, GET /visual-suggestions | Component test: Mock empty suggestions array, verify EmptyClipState rendered |
| **Story 4.3 AC1-8** | Services & Modules (line 71), NFR Performance (lines 362-366), Workflows (lines 276-288) | VideoPreviewPlayer.tsx (Plyr integration) | Integration test: Test both local segment playback AND YouTube iframe fallback paths |
| **Story 4.4 AC1-8** | Data Models (lines 129-138), APIs (lines 207-225), NFR Reliability (lines 401-405) | ClipSelectionCard.tsx, curation-store.ts, POST /select-clip | State test: Verify optimistic update + rollback on API failure |
| **Story 4.5 AC1-9** | Services & Modules (lines 73-74, 77), APIs (lines 227-253), Workflows (lines 303-315) | AssemblyTriggerButton.tsx, ConfirmationModal.tsx, POST /assemble | E2E test: Full selection flow → assembly trigger → verify payload structure |
| **Story 4.6 AC1-9** | Services & Modules (line 76), NFR Reliability (lines 413-418), Workflows (lines 317-343) | NavigationBreadcrumb.tsx, localStorage persistence, workflow validation middleware | Integration test: Navigate away with incomplete selection → verify warning modal + data persistence |
| **Epic 3 Integration (Default Segments)** | Dependencies (lines 472-477), Data Models (line 124), NFR Performance (line 363) | VideoPreviewPlayer.tsx reads default_segment_path from Epic 3 | Integration test: Verify instant playback (<100ms) when segment exists locally |
| **Epic 2 Integration (Scene Data)** | Dependencies (lines 467-470), Data Models (lines 101-111) | GET /scenes reads Epic 2's scenes.text, scenes.audio_file_path | Integration test: Verify scene text and audio paths loaded correctly |
| **Epic 5 Integration (Assembly Handoff)** | Dependencies (lines 478-481), APIs (lines 227-253) | POST /assemble passes selected_clip_id to Epic 5 | Contract test: Verify assembly request payload matches Epic 5 expected schema |

## Risks, Assumptions, Open Questions

### Risks

**R1: Epic 3 Incomplete Data (HIGH)**
- **Risk:** If Epic 3 visual sourcing fails or returns zero suggestions for a scene, Epic 4 cannot complete workflow
- **Mitigation:** Empty state UI with retry functionality (Story 4.2 AC5-6), allow user to regenerate visuals or manually trigger sourcing
- **Impact:** Workflow blocked until user resolves; potential user frustration

**R2: Video Segment Download Failures (MEDIUM)**
- **Risk:** Default segment downloads may fail due to network issues, yt-dlp errors, or YouTube restrictions
- **Mitigation:** YouTube iframe fallback (Story 4.3 AC5), user can still preview and select clips via streaming
- **Impact:** Degraded UX (slower preview loading), but workflow not blocked

**R3: Database Lock Contention (LOW)**
- **Risk:** Rapid clip selections may cause SQLite write lock contention (single-writer database)
- **Mitigation:** Debounce selection API calls (300ms), retry with exponential backoff (NFR Reliability), optimistic UI prevents perceived lag
- **Impact:** Temporary error toasts, selections eventually persist

**R4: Large Project Performance (MEDIUM)**
- **Risk:** Projects with 10+ scenes and 80+ suggestions may experience rendering performance issues
- **Mitigation:** Virtual scrolling (deferred to post-MVP if needed), lazy load thumbnails via Intersection Observer, paginated API responses
- **Impact:** Page load >2s for large projects; acceptable for MVP (typical 3-5 scenes)

**R5: Epic 5 Assembly API Changes (MEDIUM)**
- **Risk:** If Epic 5 changes expected payload structure, assembly trigger breaks
- **Mitigation:** Contract testing (test assembly request payload schema), version API endpoints if breaking changes needed
- **Impact:** Assembly fails; requires Epic 4 code update to match Epic 5 contract

### Assumptions

**A1:** Epic 2 always generates valid scenes with non-null text and audio_file_path before Epic 4 is accessible
**A2:** Epic 3 attempts to source at least 1 suggestion per scene (may return 0 if YouTube returns no results, but sourcing always runs)
**A3:** User has functional internet connection for YouTube thumbnail loading and iframe fallback (local segments work offline)
**A4:** Browser supports HTML5 video element and modern JavaScript (ES2020+, no IE11 support)
**A5:** SQLite database is not corrupted and foreign key constraints are enforced (better-sqlite3 default)
**A6:** `.cache/videos/` directory exists and has write permissions for Epic 3 downloads
**A7:** User understands "Assemble Video" is final action and cannot undo after triggering (no edit mode in MVP)

### Open Questions

**Q1: What happens if user wants to change selection after assembly starts?**
- **Answer:** MVP does not support re-selection once assembly triggered. Post-MVP feature: Allow editing before assembly completes.
- **Decision:** Accept limitation for MVP; document in user guidance

**Q2: Should we auto-select the #1 ranked suggestion by default?**
- **Answer:** No. User must explicitly select to maintain creative control and avoid accidental selections.
- **Decision:** All scenes start with "No selection" state (Story 4.4 AC8)

**Q3: How do we handle scenes where user is unsatisfied with all suggestions?**
- **Answer:** Provide "Regenerate Visuals" button (Story 4.6 AC5) to re-run Epic 3 sourcing with potentially different results.
- **Decision:** Implemented in Story 4.6 as retry functionality

**Q4: Should video preview auto-play on card click or require play button click?**
- **Answer:** Auto-play on card click for faster UX. User can pause immediately if needed.
- **Decision:** VideoPreviewPlayer auto-plays when opened (Story 4.3)

## Test Strategy Summary

### Test Levels & Frameworks

**Unit Tests (Vitest):**
- Component logic: ClipSelectionCard, AssemblyTriggerButton validation, ProgressTracker calculations
- State management: curation-store actions (selectClip, clearSelections, getAllSelected)
- Utility functions: Input validation for projectId/sceneId, selection count logic
- Coverage target: >80% for state management and validation logic

**Component Tests (Vitest + Testing Library):**
- Visual rendering: SceneCard, VisualSuggestionGallery, EmptyClipState
- User interactions: Click selection, preview video, dismiss modal
- Loading/error states: Skeleton loaders, error messages, retry buttons
- Responsive layout: Desktop 1920px vs tablet 768px viewports
- Coverage target: >70% for UI components

**Integration Tests (Vitest + Testing Library):**
- API contracts: GET /scenes, GET /visual-suggestions, POST /select-clip, POST /assemble
- Epic integration: Verify Epic 2 scene data consumption, Epic 3 suggestion data consumption
- Workflow flows: Page load → data fetch → render → selection → assembly trigger
- Database operations: Read scenes/suggestions, write selected_clip_id, verify foreign key constraints
- Coverage target: 100% critical paths (selection + assembly trigger)

**End-to-End Tests (Vitest or Playwright - deferred to Epic 5):**
- Full user journey: Navigate to curation → select clips for all scenes → trigger assembly → verify Epic 5 handoff
- Error recovery: Test empty state retry, YouTube fallback, incomplete selection warning
- Cross-browser: Chrome (primary), Firefox (secondary), Safari (tertiary)
- Coverage target: 3-5 critical user paths

### Test Cases by Acceptance Criterion

**AC1 (Scene and Clip Display):**
- Test: Load project with 3 scenes, verify 3 SceneCard components rendered
- Test: Verify scene text matches database scenes.text value
- Test: Load 4 suggestions per scene, verify 12 total ClipSelectionCard components
- Test: Verify thumbnail URLs rendered correctly from visual_suggestions.thumbnail_url

**AC2 (Clip Selection):**
- Test: Click suggestion card, verify checkmark icon appears immediately (optimistic UI)
- Test: Verify POST /select-clip called with correct sceneId + suggestionId
- Test: Verify database scenes.selected_clip_id updated after API success
- Test: Select different clip for same scene, verify previous selection deselected

**AC3 (Finalization Trigger):**
- Test: Select clips for all 5 scenes, verify "Assemble Video" button enabled
- Test: Click button, verify ConfirmationModal opens with correct scene count
- Test: Confirm modal, verify POST /assemble called with complete scene data payload
- Test: Verify navigation to Epic 5 assembly page after successful trigger

**AC4 (Incomplete Selection Prevention):**
- Test: Select clips for 2/3 scenes, verify button disabled
- Test: Hover disabled button, verify tooltip displays "Select clips for all 3 scenes to continue"
- Test: Complete 3rd selection, verify button immediately enables

**Edge Cases & Error Scenarios:**
- Test: Scene with 0 suggestions displays EmptyClipState with retry button
- Test: Segment download failed (download_status = 'error') uses YouTube iframe fallback
- Test: API failure (POST /select-clip 500 error) reverts optimistic UI update and shows error toast
- Test: User navigates away with incomplete selections, verify warning modal and data persistence
- Test: Wrong workflow step (current_step = 'voice') redirects to correct step with warning
- Test: Database lock error retries with exponential backoff (3 attempts)

### Coverage of NFRs

**Performance Testing:**
- Measure page load time with Lighthouse (target: <2s on desktop)
- Measure API response times (scenes <500ms, suggestions <1s)
- Measure video playback start time (local segment <100ms, YouTube iframe <3s)
- Stress test: 10 scenes with 80 suggestions (expected degradation, but functional)

**Security Testing:**
- Verify projectId validation prevents SQL injection
- Verify parameterized queries used for all database operations
- Verify YouTube URLs not executed as JavaScript (XSS prevention)

**Reliability Testing:**
- Test optimistic UI rollback on API failure
- Test session persistence across browser refresh
- Test foreign key constraint enforcement (delete suggestion → selected_clip_id becomes NULL)

**Usability Testing:**
- Manual test: Complete selection workflow in <2 minutes
- Manual test: Verify responsive layout on 1920px and 768px viewports
- Manual test: Keyboard navigation (Tab, Space, Esc) works for all interactions

---

## Integration Notes (Added 2025-11-25)

### Epic 5 Integration Completed

The `/api/projects/[id]/assemble` endpoint (Story 4.5) has been fully integrated with the Epic 5 video assembly pipeline. This integration bridges the Visual Curation Interface (Epic 4) with the Video Assembly Pipeline (Epic 5), enabling end-to-end video generation from clip selection to final output.

**Key Integration Changes:**

1. **Assembly Endpoint Enhancement:**
   - Endpoint no longer creates placeholder jobs
   - Now orchestrates full Epic 5 pipeline (Stories 5.1, 5.2, 5.3)
   - Implements async job processing with progress tracking

2. **YouTube Download Stage:**
   - Added download stage before video trimming
   - Uses yt-dlp with retry logic and error classification
   - Security-hardened path validation prevents traversal attacks
   - Downloads to `.cache/videos/{projectId}/scene-{sceneNumber}-source.mp4`

3. **Data Contract Updates:**
   - AssemblyScene interface includes `defaultSegmentPath` for Trimmer compatibility
   - Added backward-compatible aliases for field names
   - INNER JOIN ensures data integrity (scenes + visual_suggestions)

4. **Database Migration:**
   - Migration 009: Added 'downloading' to assembly_jobs stages
   - Updated AssemblyStage TypeScript type
   - Maintains backward compatibility with existing jobs

5. **Error Handling:**
   - Retryable vs permanent error classification
   - Exponential backoff (1s, 2s, 4s) for network failures
   - Proper cleanup of temp directories on failure

**Integration Testing Requirements:**

```typescript
// Full pipeline integration test
it('should complete assembly from clip selection to final video', async () => {
  // Setup project with selected clips
  const projectId = await setupProjectWithSelections();

  // Trigger assembly
  const response = await fetch(`/api/projects/${projectId}/assemble`, {
    method: 'POST'
  });
  const { assemblyJobId } = await response.json();

  // Wait for completion
  await waitForJobCompletion(assemblyJobId);

  // Verify final output
  const videoPath = `public/videos/${projectId}/final.mp4`;
  expect(fs.existsSync(videoPath)).toBe(true);
});
```

**Verified Output:**
- Successfully assembled 4-scene video (53.2MB)
- Downloaded scenes: 131s, 72s, 57s, 50s
- Trimming with looping for short clips
- Final output: `public/videos/{projectId}/final.mp4`

**Future Considerations:**
- Parallel download optimization for multiple scenes
- Stream processing for large videos
- CDN integration for final video distribution
- Analytics for clip selection patterns
