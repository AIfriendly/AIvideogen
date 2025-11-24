# UX Specification Validation Report: Segment Selection Features

**Date:** 2025-11-15
**Validator:** Sally (UX Designer)
**Scope:** Validate UX specification against updated PRD Feature 1.6 and Epic 4 Stories 4.1-4.4

---

## Executive Summary

The current UX specification (ux-design-specification.md) provides solid foundations for Visual Curation UI but **lacks critical design specifications** for the newly added timeline scrubber and custom segment download features defined in PRD Feature 1.6 and Epic 4.

**Status:** ⚠️ **Incomplete** - Requires updates to Section 7 and new components in Section 8

**Impact:** Without these UX specs, Epic 4 Stories 4.2 and 4.3 cannot be implemented consistently with the rest of the application.

---

## Gap Analysis

### GAP 1: Timeline Scrubber Component (Critical)

**PRD Requirement:** Feature 1.6 - "UI must provide a timeline scrubber interface for segment selection"

**Epic 4 Requirement:** Story 4.2 - "Video Preview & Timeline Scrubber"

**Current UX Spec Status:** ❌ **Missing entirely**

**What's Needed:**

#### Component Specification: TimelineScrubber

**Purpose:** Allow users to select precise start timestamp for video segment by dragging timeline handle

**Visual Design:**
```
┌────────────────────────────────────────────┐
│ Video: Lion in Savanna (2:45 total)       │
│                                            │
│ ┌────────────────────────────────────┐    │
│ │ [Video Preview Player - 16:9]       │    │
│ │                                     │    │
│ └────────────────────────────────────┘    │
│                                            │
│ Timeline (select start point):            │
│ 0:00 ━━━━━━━●━━━━━━━━━━━━━━━━━━ 2:45     │
│           ╰──────────╯                     │
│        Selected: 1:23 to 1:33 (10s)       │
│                                            │
│ [Use Default (0:00-0:10)]  [Use Custom]   │
└────────────────────────────────────────────┘
```

**Anatomy:**
- Video preview player (HTML5 video element)
- Timeline rail (horizontal bar representing total duration)
- Draggable handle (circular thumb at current position)
- Start/end time labels (0:00 and total duration)
- Selected segment highlight (colored bar showing selected range)
- Segment info display ("Selected: 1:23 to 1:33 (10s)")
- Action buttons ("Use Default" / "Use Custom")

**Design Tokens:**

**Timeline Rail:**
- Height: 8px
- Background: `#334155` (Slate 700)
- Border radius: 4px
- Width: 100% of container (min 300px, max 600px)

**Draggable Handle:**
- Diameter: 20px
- Background: `#6366f1` (Indigo 500)
- Border: 2px solid white
- Box shadow: 0 2px 8px rgba(0,0,0,0.3)
- Cursor: grab (default), grabbing (dragging)
- Z-index: 10

**Selected Segment Highlight:**
- Height: 8px (same as rail)
- Background: `#818cf8` (Indigo 400, semi-transparent 0.6)
- Position: Absolute, overlaid on rail
- Left: Start timestamp position
- Width: Scene duration (e.g., 10 seconds worth of pixels)

**Time Labels:**
- Font size: 0.75rem (12px)
- Color: `#cbd5e1` (Slate 300)
- Position: Below rail, aligned left (0:00) and right (total)

**Segment Info Display:**
- Font size: 0.875rem (14px)
- Color: `#e2e8f0` (Slate 200)
- Font weight: 600
- Text align: center
- Margin top: 8px
- Example: "Selected: 1:23 to 1:33 (10 seconds)"

**Action Buttons:**
- "Use Default": Secondary style (ghost), border `#6366f1`
- "Use Custom": Primary style, background `#6366f1`
- Padding: 10px 24px
- Margin top: 16px
- Display: Flex row, gap 12px, justify center

**Interaction Patterns:**

1. **Initial Load:**
   - Video loads from default_segment_path (first N seconds)
   - Timeline displays total video duration (from metadata)
   - Handle positioned at 0:00
   - Selected segment shows 0:00 to scene_duration

2. **Dragging Handle:**
   - User clicks handle → Cursor changes to "grabbing"
   - User drags left/right → Handle moves along rail
   - Video preview jumps to handle position in real-time
   - Segment info updates dynamically: "Selected: X to Y (Zs)"
   - Handle snaps to 1-second increments (can be configured)

3. **Keyboard Controls:**
   - Arrow Left/Right: Move handle by 1 second
   - Shift + Arrow: Move by 5 seconds
   - Home: Jump to 0:00
   - End: Jump to maximum valid start time

4. **Edge Case Handling:**
   - If handle dragged beyond valid range: Prevent drag, show warning
   - Valid range: 0 to (total_duration - scene_duration)
   - Example: 2:45 video, 10s scene → Max start = 2:35
   - Invalid selection: Handle won't move past 2:35, tooltip "Not enough video remaining"

5. **Segment Preview Loop:**
   - While handle paused: Video loops selected segment
   - Example: Handle at 1:23, scene 10s → Video loops 1:23-1:33
   - Play/Pause button controls loop

6. **Action Confirmation:**
   - "Use Default" clicked → Keep existing default segment, no download
   - "Use Custom" clicked → Trigger download (Story 4.3), show progress

**States:**

- **Default (not scrubbing):** Handle at 0:00, video shows default segment
- **Dragging:** Handle following cursor, video updating in real-time
- **Invalid Position:** Handle at boundary, tooltip explaining limitation
- **Segment Selected:** User released handle, preview looping selected segment
- **Downloading:** "Use Custom" clicked, progress bar shown, buttons disabled
- **Download Complete:** Custom segment loaded, checkmark displayed

**Accessibility:**
- ARIA role: `slider`
- ARIA label: "Select video start timestamp"
- ARIA valuemin: 0
- ARIA valuemax: (total_duration - scene_duration)
- ARIA valuenow: Current handle position in seconds
- ARIA valuetext: "1 minute 23 seconds"
- Keyboard: Arrow keys (as specified above)
- Screen reader: Announces position changes: "Start time: 1 minute 23 seconds, segment 1:23 to 1:33"

**Responsive Design:**
- Desktop (>1024px): Timeline 600px wide, video player 640px
- Tablet (768-1024px): Timeline 450px wide, video player 480px
- Mobile (<768px): Timeline 90vw, video player full width

---

### GAP 2: Duration Badge Color-Coding

**PRD Requirement:** Feature 1.6 AC1 - "Duration badges color-coded: green (1x-2x scene duration), yellow (2x-3x), red (>3x)"

**Epic 4 Requirement:** Story 4.1 - "Duration badges color-coded"

**Current UX Spec Status:** ⚠️ **Partially specified** (badge exists but no color logic)

**Current Spec Reference:** Lines 1463-1466, 2228 mention duration badge

**What's Missing:**

**Duration Badge Color Logic:**

```typescript
// Color coding based on video duration vs scene duration ratio
function getBadgeColor(videoDuration: number, sceneDuration: number) {
  const ratio = videoDuration / sceneDuration;

  if (ratio >= 1 && ratio <= 2) {
    // Ideal range: 1x-2x scene duration
    return {
      background: '#10b981',  // Emerald 500 (green)
      text: '#ffffff',
      label: 'Ideal length'
    };
  } else if (ratio > 2 && ratio <= 3) {
    // Acceptable range: 2x-3x scene duration
    return {
      background: '#f59e0b',  // Amber 500 (yellow)
      text: '#000000',
      label: 'Acceptable'
    };
  } else {
    // Too long: >3x scene duration
    return {
      background: '#ef4444',  // Red 500
      text: '#ffffff',
      label: 'Long video'
    };
  }
}
```

**Visual Examples:**

For a scene with 10-second voiceover:
- **0:15 video → Green badge** "0:15" (1.5x ratio)
- **0:25 video → Yellow badge** "0:25" (2.5x ratio)
- **1:30 video → Red badge** "1:30" (9x ratio)

**Badge Design:**
- Position: Bottom-right corner of thumbnail, 8px margin
- Padding: 4px 8px
- Border radius: 4px
- Font size: 0.75rem (12px)
- Font weight: 700 (bold)
- Box shadow: 0 1px 3px rgba(0,0,0,0.5) for visibility
- Z-index: 2 (above thumbnail)

**Tooltip on Hover:**
- Green: "Ideal length for this scene"
- Yellow: "Acceptable length - some trimming needed"
- Red: "Long video - consider shorter alternatives"

**Update Required:** Add color-coding logic to Section 8.5 (VideoPreviewThumbnail Component)

---

### GAP 3: Custom Segment Download Progress UI

**PRD Requirement:** Feature 1.6 - "Display download progress during segment download"

**Epic 4 Requirement:** Story 4.3 - "Implement download progress tracking"

**Current UX Spec Status:** ❌ **Missing entirely**

**What's Needed:**

#### Download Progress Overlay Component

**Purpose:** Show real-time progress when user selects custom segment download

**Visual Design:**

**Inline Progress (within scene card):**
```
┌─────────────────────────────────────┐
│ Scene 2                    ⏳ Downloading│
│ "The camera pans across..."         │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ [Selected Thumbnail]         │    │
│ │ ━━━━━━━━━━━━━━⬜⬜⬜⬜ 65%  │    │  <- Progress bar overlay
│ │ Downloading segment...       │    │
│ └─────────────────────────────┘    │
│                                     │
│ Other thumbnails grayed out         │
└─────────────────────────────────────┘
```

**Anatomy:**
- Semi-transparent overlay on selected thumbnail
- Progress bar (horizontal, animated)
- Percentage text ("65%")
- Status message ("Downloading segment...")
- Spinner/loading icon (optional)

**Design Tokens:**

**Overlay:**
- Background: `rgba(15, 23, 42, 0.85)` (Slate 900, 85% opacity)
- Backdrop filter: blur(4px)
- Z-index: 50

**Progress Bar:**
- Height: 6px
- Background (rail): `#334155` (Slate 700)
- Fill: `#6366f1` (Indigo 500)
- Border radius: 3px
- Width: 80% of thumbnail width, centered
- Animation: Indeterminate (sliding) if percentage unknown

**Percentage Text:**
- Font size: 1.25rem (20px)
- Color: White
- Font weight: 700
- Text align: center
- Position: Center of overlay

**Status Message:**
- Font size: 0.875rem (14px)
- Color: `#cbd5e1` (Slate 300)
- Text align: center
- Position: Below progress bar
- Margin top: 8px

**States:**

1. **Initiating (0%):** Spinner, "Preparing download..."
2. **In Progress (1-99%):** Progress bar animating, percentage updating
3. **Completing (100%):** "Processing...", brief pause
4. **Success:** Green checkmark, "Download complete!", fade out after 1s
5. **Error:** Red X icon, "Download failed", "Retry" button

**Interaction:**
- User cannot select other clips while download in progress
- Other thumbnails in same scene: Opacity 0.4, cursor not-allowed
- User can cancel download: Small X button in overlay top-right
- Cancel confirmation: "Cancel download? You'll need to reselect."

**Accessibility:**
- ARIA role: `progressbar`
- ARIA label: "Downloading video segment"
- ARIA valuenow: Current percentage
- ARIA valuemin: 0
- ARIA valuemax: 100
- ARIA live: "polite" (announces progress at intervals)
- Screen reader: "Downloading 45%, 60%, 75%..." (throttled updates)

**Update Required:** Add new component to Section 8 (Component Library)

---

### GAP 4: "Use Default" vs "Use Custom" Decision Flow

**PRD Requirement:** Feature 1.6 AC4 - "User confirms selection without using timeline scrubber → use existing default segment"

**Epic 4 Requirement:** Story 4.2 - "Use Default and Use Custom Segment buttons"

**Current UX Spec Status:** ❌ **Missing entirely**

**What's Needed:**

#### Segment Selection Modal/Dialog

**Purpose:** When user clicks a thumbnail, present options: preview default segment OR select custom segment

**User Flow:**

**Option A: User satisfied with default segment (0:00 start)**
```
1. User clicks thumbnail
2. Modal opens showing:
   - Video preview playing default segment (0:00 to scene_duration)
   - "This clip starts at 0:00. Use this?" message
   - [Use This Clip] button (primary)
   - [Choose Different Part] button (secondary)
3. User clicks [Use This Clip]
4. Modal closes, thumbnail marked as selected (checkmark)
5. No download triggered (default segment already downloaded)
```

**Option B: User wants different part of video**
```
1. User clicks thumbnail
2. Modal opens (same as above)
3. User clicks [Choose Different Part]
4. Timeline scrubber appears (GAP 1 component)
5. User drags to select start timestamp
6. User clicks [Use Custom Segment]
7. Download triggers (GAP 3 progress UI)
8. On success: Modal closes, thumbnail marked as selected
```

**Modal Design:**

**Size:**
- Width: 800px (desktop), 90vw (tablet/mobile)
- Max height: 90vh
- Centered on screen
- Background overlay: `rgba(0, 0, 0, 0.7)`

**Header:**
- Title: "Preview Clip" or "Select Segment"
- Close button (X) top-right
- Scene context: "Scene 2: The camera pans..."

**Body:**
- Video player (16:9 aspect ratio, max width 640px)
- Default state: Playing default segment (0:00 to scene_duration) on loop
- Custom state: Timeline scrubber visible (GAP 1 component)

**Footer:**
- Left: Video metadata (title, channel, duration badge)
- Right: Action buttons
  - Default state: [Use This Clip] [Choose Different Part]
  - Custom state: [Cancel] [Use Custom Segment]

**Accessibility:**
- ARIA role: `dialog`
- ARIA label: "Video clip preview and selection"
- Focus trap: Tab cycles within modal
- Escape key: Close modal
- Initial focus: Video player

**Update Required:** Add to Section 7.3 (Interaction Patterns)

---

## Recommended UX Spec Updates

### Priority 1: Critical for Epic 4 Implementation

1. **Add Section 8.7: TimelineScrubber Component** (from GAP 1)
2. **Add Section 8.8: SegmentDownloadProgress Component** (from GAP 3)
3. **Add Section 8.9: SegmentSelectionModal Component** (from GAP 4)
4. **Update Section 8.5: VideoPreviewThumbnail** - Add duration badge color-coding (from GAP 2)

### Priority 2: Enhanced User Guidance

5. **Update Section 7.3: Interaction Patterns** - Add full segment selection flow
6. **Add Section 7.5: Performance Feedback** - Download time expectations, error recovery
7. **Update Section 3.5.3: Keyboard Shortcuts** - Add timeline scrubber keyboard controls

### Priority 3: Polish & Edge Cases

8. **Add Section 7.6: Edge Case Handling** - What happens if download fails, network issues, invalid segments
9. **Update Section 9: Responsive Design** - Timeline scrubber mobile adaptations
10. **Update Section 10: User Testing Scripts** - Add segment selection task flows

---

## Validation Checklist

### PRD Feature 1.6 Coverage

- [ ] Duration badges on thumbnails ⚠️ (exists but needs color-coding)
- [ ] Timeline scrubber interface ❌ (missing)
- [ ] Segment range display ❌ (missing)
- [ ] Segment preview before confirmation ❌ (missing)
- [ ] Custom segment download ❌ (missing)
- [ ] Download progress display ❌ (missing)
- [ ] "Use Default" vs "Use Custom" workflow ❌ (missing)

### Epic 4 Story Coverage

**Story 4.1: Scene-by-Scene Curation UI Layout**
- [x] Scene cards ✅ (Section 7.2, 8.6)
- [x] Video suggestion grid ✅ (Section 7.2)
- [ ] Duration badges with color-coding ⚠️ (partial)

**Story 4.2: Video Preview & Timeline Scrubber**
- [x] Video preview component ✅ (Section 8.5)
- [ ] Timeline scrubber ❌ (missing)
- [ ] Keyboard controls ❌ (missing)
- [ ] Segment preview loop ❌ (missing)

**Story 4.3: Custom Segment Download Integration**
- [ ] Download progress UI ❌ (missing)
- [ ] Error handling UI ❌ (missing)
- [ ] Retry mechanism ❌ (missing)

**Story 4.4: Selection Confirmation & Assembly Workflow**
- [x] Selection tracking ✅ (Section 7.3, 7.4)
- [x] "Assemble Video" button ✅ (Section 7.2)
- [x] Progress indicators ✅ (Section 7.2)

**Overall Epic 4 Coverage:** 50% ⚠️

---

## Action Items

**For UX Designer (Sally):**
1. Create detailed component specs for GAP 1-4 (TimelineScrubber, Download Progress, Segment Modal, Duration Color-Coding)
2. Add components to Section 8 (Component Library) in ux-design-specification.md
3. Update Section 7.3 (Interaction Patterns) with segment selection flow
4. Create Figma mockups for timeline scrubber and segment modal
5. Define error states and recovery flows

**For PM (John):**
1. Review and approve proposed UX additions
2. Verify alignment with PRD acceptance criteria
3. Confirm user value propositions match product vision

**For Architect (Winston):**
1. Review technical feasibility of timeline scrubber design
2. Confirm yt-dlp integration supports proposed UX (progress tracking, cancellation)
3. Validate segment preview loop implementation approach

**For Scrum Master (Bob):**
1. Estimate UX design work required (component specs + Figma)
2. Determine if UX updates should be done before or during Epic 4 development
3. Update Story 4.2 and 4.3 acceptance criteria to reference UX spec sections once created

---

## Conclusion

The UX specification requires **significant updates** to support the timeline scrubber and custom segment download features added to PRD Feature 1.6 and Epic 4.

**Estimated UX Design Effort:** 8-12 hours
- Component specifications: 4-6 hours
- Interaction flow documentation: 2-3 hours
- Figma mockups: 2-3 hours

**Recommendation:** Complete UX spec updates **before** starting Epic 4 Story 4.2 development to ensure consistent implementation.

**Next Steps:**
1. Sally: Draft component specs for GAP 1-4 (2-3 days)
2. Team review: Validate specs against technical constraints (1 day)
3. Sally: Create Figma mockups (1-2 days)
4. Dev team: Use completed specs for Story 4.2 and 4.3 implementation

---

**Validation Completed By:** Sally (UX Designer)
**Date:** 2025-11-15
**Status:** ⚠️ **Incomplete - Updates Required**
