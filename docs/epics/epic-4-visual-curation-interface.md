# Epic 4: Visual Curation Interface

**Goal:** Provide an intuitive UI for creators to review scripts, preview suggested clips, and finalize visual selections.

**Features Included:**
- 1.6. Visual Curation UI

**User Value:** Creators maintain creative control through an easy-to-use interface for selecting the perfect visuals.

**Story Count:** 6 stories

**Dependencies:**
- Epic 2 (displays script)
- Epic 3 (displays suggested clips)

**Acceptance:**
- All scenes display with text and clip suggestions
- Video clips can be previewed in-browser
- Users can select one clip per scene
- Assembly trigger only activates when all scenes have selections
- Data passes correctly to assembly module

---

### Epic 4 Stories

#### Story 4.1: Scene-by-Scene UI Layout & Script Display
**Goal:** Create the foundational UI structure for the visual curation page with scene-by-scene layout

**Tasks:**
- Create VisualCuration.tsx page component at /projects/[id]/visual-curation
- Implement scene-by-scene layout with numbered sections (Scene 1, Scene 2, etc.)
- Display script text for each scene from database (scenes table)
- Add navigation to visual curation page after Epic 3 visual sourcing completes
- Implement loading states for fetching scenes and suggestions
- Add responsive design for desktop and tablet viewing
- Create GET /api/projects/[id]/scenes endpoint to retrieve all scenes with text and audio
- Implement error handling for missing scenes or failed data retrieval

**Acceptance Criteria:**
- VisualCuration page displays after visual sourcing completes (projects.current_step = 'visual-curation')
- All scenes displayed in sequential order (Scene 1, Scene 2, Scene 3...)
- Each scene section shows scene number and complete script text
- Scene data loads from database via GET /api/projects/[id]/scenes endpoint
- Loading indicator displays while fetching scene data
- Error messages display if scenes cannot be loaded
- Layout is responsive and readable on desktop (1920px) and tablet (768px) screens
- Empty state displays if no scenes exist for project

**References:**
- PRD Feature 1.6 AC1 (Scene and Clip Display) lines 263-266
- Epic 3 Story 3.5 (visual_suggestions database) lines 758-809

---

#### Story 4.2: Visual Suggestions Display & Gallery
**Goal:** Display AI-generated video clip suggestions for each scene with thumbnails and metadata

**Tasks:**
- Create VisualSuggestionGallery.tsx component
- Fetch visual suggestions per scene from GET /api/projects/[id]/visual-suggestions endpoint
- Display 5-8 suggested video clips per scene in grid layout
- Show YouTube thumbnail for each suggestion
- Display video metadata: title, channel, duration
- Add visual indicator for download status (pending, downloading, complete, error)
- Implement empty state for scenes with no suggestions (YouTube returned 0 results)
- Add retry functionality for failed visual sourcing
- Handle loading states for suggestions still being processed

**Acceptance Criteria:**
- Each scene section displays its suggested video clips in a gallery grid (2-3 columns)
- Each suggestion card shows: YouTube thumbnail, video title, channel name, duration
- Suggestions ordered by rank (1-8) from Story 3.4 filtering
- Download status indicator visible per suggestion (pending/downloading/complete/error icon)
- **Empty State (Epic 3 Story 3.5 AC6):** If scene has 0 suggestions, display message: "No clips found for this scene. The script may be too abstract or specific. Try editing the script text."
- **Retry Functionality (Epic 3 Story 3.5 AC7):** If visual sourcing failed, "Retry Visual Sourcing" button appears
- Loading skeleton displays while suggestions are being fetched
- Graceful degradation if thumbnails fail to load (show placeholder image)

**References:**
- PRD Feature 1.6 AC1 (Scene and Clip Display) lines 263-266
- Epic 3 Story 3.5 (visual_suggestions table) lines 760-809
- Epic 3 Story 3.4 (ranking and filtering) lines 703-756

---

#### Story 4.3: Video Preview & Playback Functionality
**Goal:** Enable users to preview suggested video clips directly in the browser using downloaded segments

**Tasks:**
- Implement VideoPreviewPlayer.tsx component with HTML5 video player
- Load default video segment from default_segment_path (downloaded in Epic 3 Story 3.6)
- Add play/pause controls, progress bar, and volume controls
- Implement click-to-preview: clicking a suggestion opens preview modal/inline player
- Display video title and channel in preview mode
- Add "Close Preview" functionality to return to gallery view
- Implement fallback to YouTube embed iframe if segment download failed (download_status = 'error')
- Add keyboard shortcuts (Space = play/pause, Esc = close preview)
- Optimize video loading (lazy load segments, preload on hover)

**Acceptance Criteria:**
- Clicking a suggestion card opens video preview player
- **Default Segment Playback (Epic 3 Story 3.6):** Video plays downloaded segment from `.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`
- **Instant Playback (PRD Feature 1.5 AC7):** Video starts immediately without additional downloads
- Play/pause, progress bar, and volume controls functional
- **Fallback for Failed Downloads:** If default_segment_path is NULL or download_status = 'error', player embeds YouTube iframe instead
- Keyboard shortcuts work (Space = play/pause, Esc = close)
- Multiple previews can be watched sequentially (no need to reload page)
- Video player responsive and works on desktop and tablet

**References:**
- PRD Feature 1.6 AC1 (Scene and Clip Display) lines 263-266
- PRD Feature 1.5 AC7 (Instant Preview) lines 239-242
- Epic 3 Story 3.6 (default segment download) lines 812-867

---

#### Story 4.4: Clip Selection Mechanism & State Management
**Goal:** Allow users to select exactly one video clip per scene and persist selections

**Tasks:**
- Implement clip selection logic in curation-store.ts (Zustand state management)
- Add visual selection indicator (checkmark, border highlight, or "Selected" badge) to chosen clip
- Enforce one selection per scene (selecting new clip deselects previous)
- Persist selections in state during session
- Create POST /api/projects/[id]/select-clip endpoint to save selections to database
- Add selected_clip_id column to scenes table (foreign key to visual_suggestions)
- Update selection state immediately on user click (optimistic UI update)
- Save selection to database asynchronously
- Display selection count progress (e.g., "3/5 scenes selected")

**Acceptance Criteria:**
- Clicking a suggestion card marks it as "Selected" with visual indicator (checkmark icon, blue border)
- Selecting a different clip for the same scene deselects the previous one automatically
- Selection state persists during page session (stored in Zustand store)
- POST /api/projects/[id]/select-clip saves selection to database (scenes.selected_clip_id)
- Selection count indicator displays: "Scenes Selected: 3/5" at top of page
- Optimistic UI update (selection appears immediately, saved in background)
- Error handling: if save fails, show toast notification and revert UI state
- All scenes default to "No selection" state initially

**References:**
- PRD Feature 1.6 AC2 (Clip Selection) lines 267-270
- Epic 2 Story 2.2 (scenes table schema) lines 372-396

---

#### Story 4.5: Assembly Trigger & Validation Workflow
**Goal:** Provide "Assemble Video" button that validates all selections and triggers video assembly

**Tasks:**
- Create AssemblyTrigger.tsx component with "Assemble Video" button
- Implement selection validation (check all scenes have selected_clip_id)
- Disable button if incomplete selections (show tooltip: "Select clips for all X scenes")
- Enable button only when all scenes have selections
- Add confirmation modal: "Ready to assemble? This will create your final video with the selected clips."
- Create POST /api/projects/[id]/assemble endpoint to trigger Epic 5 assembly process
- Update projects.current_step = 'editing' (or 'export') when assembly starts
- Display assembly progress indicator (placeholder for Epic 5 implementation)
- Navigate to assembly status page after trigger
- Implement error handling for assembly trigger failures

**Acceptance Criteria:**
- "Assemble Video" button displays at bottom of page (sticky footer)
- **Incomplete Selection (PRD Feature 1.6 AC4):** Button disabled if any scene missing selection, tooltip shows: "Select clips for all 5 scenes to continue"
- **Complete Selection (PRD Feature 1.6 AC3):** Button enabled when all scenes have selections
- Clicking enabled button shows confirmation modal with scene count and selections summary
- **Assembly Trigger (PRD Feature 1.6 AC3):** Confirming modal calls POST /api/projects/[id]/assemble with complete scene data:
  - scene_number, script text, selected clip video_id, voiceover audio_file_path, clip duration
- Assembly endpoint updates projects.current_step and returns assembly job ID
- User navigated to assembly status/progress page (placeholder until Epic 5)
- Error toast displays if assembly trigger fails
- Button shows loading spinner while assembly request processes

**References:**
- PRD Feature 1.6 AC3 (Finalization Trigger) lines 271-274
- PRD Feature 1.6 AC4 (Incomplete Selection Prevention) lines 275-277
- Epic 5 (Video Assembly & Output) lines 893-917

---

#### Story 4.6: Visual Curation Workflow Integration & Error Recovery
**Goal:** Integrate visual curation page into project workflow with error recovery and edge case handling

**Tasks:**
- Update project navigation flow: Voiceover Preview (Epic 2) → Visual Sourcing (Epic 3) → Visual Curation
- Implement "Continue to Visual Curation" button in Epic 2 Story 2.6 script preview
- Add direct navigation to visual curation from project page if projects.current_step = 'visual-curation'
- Implement "Back to Script Preview" navigation for users to review script again
- Add "Regenerate Visuals" option to re-run Epic 3 visual sourcing if unsatisfied with suggestions
- Implement session persistence: save scroll position and preview state in localStorage
- Add project save reminder if user navigates away with incomplete selections
- Handle edge cases: script modified after visual sourcing, deleted suggestions, missing audio files
- Implement progress tracking in projects table (current_step workflow validation)

**Acceptance Criteria:**
- After Epic 2 voiceover generation, "Continue to Visual Curation" button appears and navigates to /projects/[id]/visual-curation
- Direct URL access to /projects/[id]/visual-curation works if projects.current_step = 'visual-curation'
- If user accesses page with wrong workflow step (e.g., current_step = 'voice'), redirect to correct step with warning
- "Back to Script Preview" link navigates to Epic 2 Story 2.6 preview page
- "Regenerate Visuals" button triggers POST /api/projects/[id]/generate-visuals (Epic 3 Story 3.5)
- Scroll position and open preview state persist across page reloads (localStorage)
- Warning modal appears if user navigates away with incomplete selections: "You haven't selected clips for all scenes. Progress will be saved."
- Edge case handling: if scene has no audio_file_path, display error message with option to regenerate voiceovers
- Breadcrumb navigation shows: Project → Script → Voiceover → Visual Curation

**References:**
- PRD Feature 1.6 (Visual Curation UI) lines 244-277
- Epic 2 Story 2.6 (Script Preview) lines 530-558
- Epic 3 Story 3.5 (Workflow Integration) lines 758-809

---
