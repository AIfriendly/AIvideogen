# 7. Visual Curation UI (Epic 4)

### 7.1 Overview

**Purpose:** Scene-by-scene video clip curation interface where users review AI-generated script and select perfect B-roll clips for each scene.

**User Value:** Empowered director experience - preview multiple clip options per scene and make confident selections with full visibility of script, options, and progress.

**Key Features:**
- Display script broken into scenes
- Show 4-6 AI-suggested video clips per scene
- Video clip preview (play-on-hover or click-to-play)
- Single clip selection per scene
- Progress tracking (X/N scenes complete)
- "Assemble Video" trigger when all scenes complete

### 7.2 Visual Design

**Curation Interface Layout:**

```
┌─────────────────────────────────────┐
│  Select Your Clips    [2/5 complete]│  <- Header + progress
│  [🟦🟦⬜⬜⬜]            [Assemble]   │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Scene 1            ✓        │   │  <- Scene card
│  │ "A majestic lion roams..." │   │
│  │ [🎬] [🎬] [🎬]             │   │  <- Clip thumbnails
│  │ [🎬] [🎬] [🎬]             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Scene 2            ⚠        │   │
│  │ "The camera pans across..." │   │
│  │ [🎬] [🎬] [🎬]             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ↓ (scroll) ↓                       │
└─────────────────────────────────────┘
```

**Curation Header:**
- **Background:** `#1e293b` (Slate 800), sticky at top
- **Padding:** 20px 32px
- **Border Bottom:** 1px solid `#334155` (Slate 700)
- **Display:** Flex row, space-between alignment
- **Contents:**
  - Left: Page title "Select Your Clips" (h2, 1.5rem)
  - Center: Progress bar with text "2 / 5 scenes complete"
  - Right: "Assemble Video" button (primary, large)

**Progress Indicator:**
- **Progress Bar:** Linear progress, 200px width, 8px height
- **Background:** `#334155` (Slate 700)
- **Fill:** `#6366f1` (Indigo 500)
- **Border Radius:** 4px
- **Text:** "2 / 5 scenes complete" below bar
- **Color (incomplete):** `#cbd5e1` (Slate 300)
- **Color (complete):** `#10b981` (Emerald 500) + "Ready to assemble!"

**"Assemble Video" Button:**
- **State (disabled):** Gray background, cursor not-allowed, opacity 0.5
- **State (enabled):** Indigo 500 background, white text, hover darker
- **Size:** Large (padding 12px 32px)
- **Action:** Opens confirmation dialog, triggers video assembly workflow

**Scene Cards Container:**
- **Max Width:** 1400px
- **Padding:** 32px
- **Display:** Flex column, gap 24px (lg) between scene cards
- **Background:** `#0f172a` (Slate 900)

**Scene Card:**
- **Background:** `#1e293b` (Slate 800)
- **Border:** 1px solid `#334155` (Slate 700)
- **Border Radius:** 12px
- **Padding:** 24px (lg)
- **Box Shadow:** 0 2px 8px rgba(0,0,0,0.2)
- **Transition:** All 0.2s ease (for expand/collapse)

**Scene Header:**
- **Display:** Flex row, space-between
- **Margin Bottom:** 16px (md)
- **Contents:**
  - Left: Scene number badge (e.g., "Scene 1")
  - Right: Status badge (✓ Complete, ⚠ Pending)

**Scene Number Badge:**
- **Background:** `#6366f1` (Indigo 500)
- **Color:** White
- **Padding:** 6px 16px
- **Border Radius:** 6px
- **Font Size:** 0.875rem (14px)
- **Font Weight:** 700 (bold)

**Status Badge:**
- **Complete:** Green background (#10b981), "✓ Complete"
- **Pending:** Amber background (#f59e0b), "⚠ Pending"
- **Padding:** 6px 12px
- **Border Radius:** 6px
- **Font Size:** 0.75rem (12px)
- **Font Weight:** 600

**Scene Script Text:**
- **Color:** `#cbd5e1` (Slate 300)
- **Font Size:** 0.875rem (14px)
- **Line Height:** 1.6
- **Margin Bottom:** 16px (md)
- **Max Height:** None (full text shown)
- **Expandable:** Future enhancement if text very long

**Clip Grid:**
- **Display:** CSS Grid
- **Columns:** 3 (desktop 1024px+), 2 (tablet 768px+), 1 (mobile)
- **Gap:** 12px (sm)
- **Margin Top:** 16px (md)

**Clip Thumbnail:** (See Component Library section 8.1 for detailed spec)
- **Aspect Ratio:** 16:9 (enforced with CSS aspect-ratio)
- **Border:** 2px solid `#334155` (Slate 700)
- **Border Radius:** 8px
- **Background:** `#0f172a` (Slate 900)
- **Cursor:** Pointer
- **Hover:** Border color `#6366f1` (Indigo 500), slight scale (1.02)
- **Selected:** Border 3px solid `#6366f1`, checkmark icon top-right, glow effect

### 7.3 Interaction Patterns

**Previewing Clips:**
1. User hovers over thumbnail → Play icon appears, subtle scale animation
2. User clicks thumbnail → Video plays inline (or in lightbox on tablet)
3. Video controls appear (play/pause, scrubbing)
4. Click outside or press ESC → Video stops, returns to thumbnail

**Selecting Clip:**
1. User clicks thumbnail (while not playing)
2. System applies "selected" state: Border highlight, checkmark icon, glow
3. If previous clip selected in same scene → Deselect automatically
4. Scene status updates to "✓ Complete"
5. Progress bar updates (e.g., 2/5 → 3/5)
6. If all scenes complete → "Assemble Video" button enables

**Triggering Assembly:**
1. All scenes have clip selected
2. "Assemble Video" button enables (Indigo 500, no longer gray)
3. User clicks button
4. Confirmation dialog appears: "Ready to assemble? You've selected clips for all N scenes. This will generate your final video."
5. User confirms → Loading screen appears, assembly begins
6. User cancels → Dialog closes, stays in curation view

**Changing Selection:**
- User can click different thumbnail in same scene anytime
- No confirmation needed (easily reversible)
- Previous selection deselects automatically
- New selection applies immediately

### 7.4 States

**Landing State:**
- User arrives from chat workflow (topic confirmed, script generated)
- All scenes displayed, none have clips selected
- Progress: 0/N scenes complete
- "Assemble Video" button disabled

**In Progress:**
- Some scenes have clips selected, some don't
- Progress bar partially filled
- Can scroll and navigate freely
- "Assemble Video" button still disabled

**All Scenes Complete:**
- Every scene has ✓ Complete status
- Progress: 100% (green)
- "Assemble Video" button enabled (Indigo, prominent)
- Success message: "Ready to assemble your video!"

**Loading (Clip Preview):**
- Skeleton placeholder with shimmer while thumbnail loads
- Spinner overlay if video takes time to load

**Error State:**
- Clip fails to load → Gray placeholder + error icon + "Retry" text
- Network error → Toast notification "Failed to load clips. Check connection."

**Empty Clip State (No Clips Available):**
- **Trigger:** Scene has zero clips after Visual Sourcing (Section 6.8) completes with failure or partial failure
- **Scene Card Display:**
  - Scene number badge: "Scene 3" (Indigo)
  - Status badge: ⚠ "No clips available" (Amber background, `#f59e0b`)
  - Scene script text displayed normally
  - **Empty State Message (in place of clip grid):**
    - Icon: 🎬 or empty video icon (gray, `#64748b`)
    - Primary text: "No suitable video clips found for this scene"
    - Secondary text: "The YouTube search returned no results. Try manual search or skip this scene."
    - Background: `#0f172a` (Slate 900)
    - Border: 1px dashed `#475569` (Slate 600)
    - Border Radius: 8px
    - Padding: 32px
    - Text align: center
- **Action Buttons (within empty state):**
  - **"Search YouTube Manually" button:**
    - Style: Secondary (ghost)
    - Background: Transparent
    - Border: 1px solid `#6366f1` (Indigo 500)
    - Color: `#6366f1`
    - Icon: Search icon (🔍) before text
    - Action: Opens manual search dialog (future enhancement - post-MVP)
    - Note: For MVP, this button can be disabled with tooltip "Manual search coming soon"
  - **"Skip This Scene" toggle:**
    - Style: Checkbox with label
    - Label: "Skip this scene and continue without it"
    - Color: `#cbd5e1` (Slate 300)
    - Checked state: Scene marked as skipped, excluded from final video
    - Unchecked state: Scene remains incomplete, blocks "Assemble Video" button
- **Progress Tracking:**
  - If scene skipped: Progress counts scene as "complete" (e.g., 4/5 → 5/5 if Scene 3 skipped)
  - "Assemble Video" button enables when: All scenes complete OR incomplete scenes are skipped
- **User Flow:**
  1. User arrives at Visual Curation UI from Visual Sourcing (Section 6.8)
  2. Scene with no clips shows empty state with message + action buttons
  3. User can:
     - **Option A:** Skip the scene (toggle checkbox) → Scene excluded from video
     - **Option B:** Return to Script Preview (Section 6.7) and regenerate script with different content
     - **Option C (Future):** Use manual search to find clips for this scene

### 7.5 Workflow Integration & Navigation (Epic 4, Story 4.6)

**Purpose:** Integrate Visual Curation into project workflow with seamless navigation and error recovery

**Navigation Flow:**
```
Epic 2: Voiceover Preview → [Continue Button] → Epic 3: Visual Sourcing → [Auto-Navigate] → Epic 4: Visual Curation → [Assemble Button] → Epic 5: Video Assembly
```

**Entry Points:**

1. **From Voiceover Preview (Epic 2, Story 2.6):**
   - After voiceover generation completes
   - "Continue to Visual Curation" button appears in script preview page
   - Button navigates to `/projects/[id]/visual-curation`
   - Updates `projects.current_step = 'visual-sourcing'` first (triggers Epic 3)

2. **Auto-Navigate from Visual Sourcing (Epic 3, Story 3.5):**
   - After visual sourcing completes (all scenes processed OR partial success)
   - 0.5s delay, then auto-navigate to `/projects/[id]/visual-curation`
   - Updates `projects.current_step = 'visual-curation'`

3. **Direct URL Access:**
   - User can navigate directly to `/projects/[id]/visual-curation`
   - **Validation:** Check `projects.current_step = 'visual-curation'`
   - **If wrong step:** Redirect to correct workflow step with warning toast:
     - If `current_step = 'chat'` → Redirect to `/projects/[id]` with message: "Complete topic discussion first"
     - If `current_step = 'voice'` → Redirect to `/projects/[id]/voice-selection` with message: "Complete voice selection first"
     - If `current_step = 'script'` → Redirect to `/projects/[id]/script-preview` with message: "Review script first"
     - If `current_step = 'visual-sourcing'` → Redirect to `/projects/[id]/visual-sourcing` with message: "Visual sourcing in progress"

4. **From Project Page:**
   - If `projects.current_step = 'visual-curation'`
   - Show "Resume Visual Curation" button
   - Navigate to `/projects/[id]/visual-curation`

**Navigation Controls:**

1. **Header Breadcrumbs:**
   - Display: `Project → Script → Voiceover → Visual Curation`
   - Clickable links to previous steps (if user wants to review)
   - Current step highlighted (Indigo 500)

2. **"Back to Script Preview" Link:**
   - Located at top of page (below header, above scenes)
   - Style: Secondary ghost button with ← back arrow icon
   - Action: Navigate to `/projects/[id]/script-preview` (Epic 2, Story 2.6)
   - Tooltip: "Review script and voiceover before continuing"

3. **"Regenerate Visuals" Button:**
   - Located next to "Back to Script Preview" link
   - Style: Secondary ghost button with 🔄 refresh icon
   - Action: Trigger POST `/api/projects/[id]/generate-visuals` to re-run Epic 3
   - Confirmation modal: "Regenerate visual suggestions? This will replace current suggestions with new searches."
   - Loading state: Shows visual sourcing loading screen (Section 6.8)
   - Use case: User unsatisfied with current clip suggestions

**Session Persistence (localStorage):**

1. **Scroll Position:**
   - Save scroll position when user scrolls curation page
   - Key: `curation-scroll-${projectId}`
   - Restore scroll position on page reload
   - Clear on navigation away from page

2. **Preview State:**
   - Save which clip user last previewed (if any)
   - Key: `curation-preview-${projectId}`
   - Value: `{sceneNumber: X, suggestionId: Y}`
   - Use case: User reloads page while previewing → restore preview state (optional)

3. **Selection State:**
   - **Primary:** Selections stored in Zustand store (in-memory, session-only)
   - **Backup:** On selection change → save to localStorage
   - Key: `curation-selections-${projectId}`
   - Value: `{scene1: clipId, scene2: clipId, ...}`
   - On mount → Check localStorage, restore selections if Zustand store empty
   - Sync selections to database via POST `/api/projects/[id]/select-clip` (Story 4.4)

**Unsaved Changes Warning:**

- **Trigger:** User navigates away with incomplete selections (any scene missing clip AND not skipped)
- **Warning Modal:**
  - Heading: "You haven't selected clips for all scenes"
  - Message: "You've selected clips for {X} out of {N} scenes. Your progress will be saved, but you'll need to return to complete curation."
  - Buttons:
    - **"Stay and Continue"** (primary) → Close modal, stay on page
    - **"Leave Anyway"** (secondary ghost) → Navigate away
- **Implementation:** Use `beforeunload` event OR Next.js router change detection

**Edge Case Handling:**

1. **Scene Missing Voiceover:**
   - **Check:** `scenes.audio_file_path` is NULL
   - **Display:** Error message in scene card: "Voiceover unavailable for this scene. Regenerate voiceovers to continue."
   - **Action Button:** "Regenerate Voiceovers" → Navigate to Epic 2 voiceover generation

2. **Visual Suggestions Deleted/Expired:**
   - **Check:** GET `/api/projects/[id]/visual-suggestions` returns 0 results for scene
   - **Display:** Empty state (Section 7.4) with "Retry Visual Sourcing" button
   - **Action:** Trigger POST `/api/projects/[id]/generate-visuals` to re-run Epic 3

3. **Script Modified After Visual Sourcing:**
   - **Detection:** Compare `scenes.script_text` timestamp with `visual_suggestions.created_at`
   - **Warning:** Show info banner: "⚠ Script was modified after visual suggestions were generated. Suggestions may not match current script. Regenerate?"
   - **Action Button:** "Regenerate Visuals" to update suggestions

4. **Missing Downloaded Segments:**
   - **Check:** `visual_suggestions.download_status = 'error'` OR `default_segment_path` is NULL
   - **Display:** Download status badge shows error icon (⚠)
   - **Fallback:** VideoPreviewPlayer uses YouTube iframe embed instead (Section 8.13)
   - **User Impact:** Preview still works, but loads from YouTube (not instant)

**Workflow State Management:**

- **Current Step Tracking:** `projects.current_step` column
- **Valid Progression:**
  ```
  'chat' → 'voice' → 'script' → 'visual-sourcing' → 'visual-curation' → 'assembly' → 'complete'
  ```
- **Update Triggers:**
  - Enter Visual Curation page → Ensure `current_step = 'visual-curation'`
  - Click "Assemble Video" (Story 4.5) → Update `current_step = 'assembly'`
- **Validation:** Server-side check on API calls to prevent out-of-order workflow access

**Performance Optimizations:**

1. **Lazy Load Suggestions:** Fetch visual suggestions for visible scenes first (viewport-based)
2. **Infinite Scroll (Future):** For projects with 10+ scenes, load scenes in batches
3. **Image Optimization:** Use Next.js Image component for YouTube thumbnails with blur placeholder
4. **Debounced Selection:** Save selections to database with 500ms debounce (avoid excessive API calls)

---
