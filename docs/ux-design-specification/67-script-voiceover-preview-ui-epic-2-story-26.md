# 6.7. Script & Voiceover Preview UI (Epic 2, Story 2.6)

### 6.7.1 Overview

**Purpose:** Display generated script scene-by-scene with voiceover preview audio players, allowing users to review before proceeding to visual sourcing.

**User Value:** Transparency and confidence - users can review AI-generated script, preview voiceover quality, and confirm readiness before committing to visual curation.

**Key Features:**
- Scene-by-scene script display with text and audio preview
- Audio player for each scene voiceover
- Total video duration display
- Progressive loading (scenes appear as voiceovers generate)
- "Continue to Visual Sourcing" trigger when all ready
- (Post-MVP: Edit script capability, regenerate voiceover per scene)

### 6.7.2 Visual Design

**Script Preview Interface Layout:**

```
┌─────────────────────────────────────┐
│  Review Your Script                 │  <- Header
│  Total Duration: 2:45  [Continue]   │  <- Duration + CTA
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Scene 1            0:15     │   │  <- Scene card
│  │ "Picture this: A million    │   │
│  │ humans living on Mars..."   │   │  <- Script text
│  │ [▶ Play] ━━━━━━━━━━ 0:15    │   │  <- Audio player
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Scene 2            0:18     │   │
│  │ "The red planet, once just  │   │
│  │ a distant dream, is now..." │   │
│  │ [▶ Play] ━━━━━━━━━━ 0:18    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Scene 3         [Loading]   │   │  <- Scene still generating
│  │ "SpaceX and NASA are..."    │   │
│  │ [⏳ Generating voiceover]    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ↓ (scroll) ↓                       │
└─────────────────────────────────────┘
```

**Script Preview Container:**
- **Max Width:** 900px (centered in main content area)
- **Padding:** 32px (lg) on sides
- **Background:** `#0f172a` (Slate 900)

**Header:**
- **Background:** `#1e293b` (Slate 800), sticky at top (optional)
- **Padding:** 20px 32px
- **Border Bottom:** 1px solid `#334155` (Slate 700)
- **Display:** Flex row, space-between alignment
- **Contents:**
  - Left: Page title "Review Your Script" (h2, 1.5rem)
  - Center: Total Duration Display
  - Right: "Continue to Visual Sourcing" button

**Total Duration Display:**
- **Format:** "Total Duration: MM:SS" (e.g., "Total Duration: 2:45")
- **Font Size:** 1rem (16px)
- **Font Weight:** 500 (medium)
- **Color:** `#cbd5e1` (Slate 300)
- **Icon:** Clock icon (⏱) before text (optional)
- **Background:** `#334155` (Slate 700, 30% opacity) pill shape
- **Padding:** 8px 16px
- **Border Radius:** 20px

**"Continue to Visual Sourcing" Button:**
- **Style:** Primary button (large)
- **Background:** `#6366f1` (Indigo 500)
- **Color:** White
- **Padding:** 10px 32px
- **Border Radius:** 8px
- **Font Size:** 0.875rem (14px)
- **Font Weight:** 600
- **State (disabled):** Gray background (#475569), cursor not-allowed, opacity 0.5
  - Disabled when: Not all scenes have voiceovers generated
- **State (enabled):** Indigo background, hover darker (#4f46e5)
  - Enabled when: All scenes complete with audio
- **Icon:** Arrow right (→) after text (optional)

**Scene Cards Container:**
- **Display:** Flex column
- **Gap:** 20px (md) between scene cards
- **Margin Top:** 24px (lg)
- **Padding Bottom:** 48px (for scroll space)

**Scene Preview Card:**
- **Background:** `#1e293b` (Slate 800)
- **Border:** 1px solid `#334155` (Slate 700)
- **Border Radius:** 12px
- **Padding:** 20px
- **Box Shadow:** 0 2px 8px rgba(0,0,0,0.2)
- **Transition:** All 0.2s ease

**Scene Preview Card (Hover):**
- **Box Shadow:** 0 4px 12px rgba(0,0,0,0.3)
- **Transform:** translateY(-2px) (subtle lift)

**Scene Header:**
- **Display:** Flex row, space-between
- **Margin Bottom:** 12px (sm)
- **Contents:**
  - Left: Scene number badge
  - Right: Duration badge

**Scene Number Badge:**
- **Background:** `#6366f1` (Indigo 500)
- **Color:** White
- **Padding:** 4px 12px
- **Border Radius:** 6px
- **Font Size:** 0.875rem (14px)
- **Font Weight:** 700 (bold)
- **Text:** "Scene 1", "Scene 2", etc.

**Duration Badge:**
- **Background:** `#334155` (Slate 700)
- **Color:** `#cbd5e1` (Slate 300)
- **Padding:** 4px 12px
- **Border Radius:** 6px
- **Font Size:** 0.875rem (14px)
- **Font Weight:** 600
- **Text:** "0:15", "0:18", etc. (scene duration)

**Scene Script Text:**
- **Color:** `#f8fafc` (Slate 50)
- **Font Size:** 1rem (16px)
- **Line Height:** 1.6
- **Margin Bottom:** 16px (md)
- **Max Height:** None (full text shown, no truncation for MVP)
- **Word Break:** break-word (prevents overflow)
- **White Space:** pre-wrap (preserves formatting)

**Scene Audio Player:**
- **Display:** Flex row
- **Align Items:** Center
- **Gap:** 12px (sm)
- **Padding:** 12px
- **Background:** `#0f172a` (Slate 900)
- **Border Radius:** 8px
- **Margin Top:** 12px (sm)

**Audio Player Components:**

**1. Play/Pause Button:**
- **Size:** 44px x 44px (meets WCAG 2.2 Level AAA touch target requirements)
- **Background:** `#6366f1` (Indigo 500)
- **Border Radius:** 50% (circle)
- **Color:** White
- **Icon:** Play ▶ (default), Pause ⏸ (when playing)
- **Hover:** Darker indigo (#4f46e5), slight scale (1.05)
- **Active:** Press animation (scale 0.95)
- **Cursor:** Pointer

**2. Progress Bar:**
- **Width:** Flexible (fills remaining space)
- **Height:** 6px
- **Background:** `#334155` (Slate 700)
- **Border Radius:** 3px
- **Cursor:** Pointer (scrubbing enabled)

**Progress Bar Fill:**
- **Background:** `#6366f1` (Indigo 500)
- **Height:** 6px
- **Border Radius:** 3px
- **Width:** Dynamic based on playback position (e.g., 45% if 45% played)

**Progress Bar Scrubber (on hover/drag):**
- **Handle:** White circle, 14px diameter
- **Position:** At current playback position
- **Box Shadow:** 0 2px 4px rgba(0,0,0,0.3)
- **Drag:** Allows scrubbing to any position

**3. Current Time Display:**
- **Format:** "MM:SS / MM:SS" (e.g., "0:08 / 0:15")
- **Font Size:** 0.75rem (12px)
- **Color:** `#cbd5e1` (Slate 300)
- **Font Weight:** 500
- **Min Width:** 80px (prevents layout shift)

**4. Volume Control (Optional Enhancement):**
- **Icon:** Speaker icon 🔊
- **Size:** 20px
- **Color:** `#cbd5e1` (Slate 300)
- **Hover:** Shows volume slider
- **Volume Slider:** Vertical slider (0-100%) on hover

**5. Playback Speed (Optional Enhancement):**
- **Text:** "1x" (default)
- **Options:** 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
- **Style:** Dropdown or cycle button
- **Font Size:** 0.75rem (12px)
- **Color:** `#cbd5e1` (Slate 300)

### 6.7.3 Interaction Patterns

**Reviewing Script:**
1. User arrives from script generation loading screen (Section 6.6)
2. System displays all scenes with script text
3. Scenes with completed voiceovers show audio player
4. Scenes still generating show loading indicator
5. User scrolls through scenes, reads script
6. User can preview any scene's voiceover by clicking play

**Playing Scene Audio:**
1. User clicks play button on Scene 1 audio player
2. Play icon changes to pause icon
3. Progress bar starts filling left-to-right
4. Current time updates (e.g., "0:03 / 0:15")
5. If user clicks play on Scene 2 while Scene 1 playing → Scene 1 auto-pauses, Scene 2 starts
6. Audio completes → Play button resets, progress bar returns to start
7. User can scrub by dragging progress bar handle to any position

**Progressive Loading (Async Voiceover Generation):**
1. Script generation completes → User navigates to Script Preview UI
2. Initially, some scenes may still be generating voiceovers
3. Scene cards display immediately with script text
4. Scenes without audio show "Generating voiceover..." with loading spinner
5. As each voiceover completes → Audio player appears for that scene (real-time update)
6. Total duration updates as more scenes complete
7. "Continue" button enables only when ALL scenes have audio

**Continuing to Visual Sourcing:**
1. All scenes have voiceovers generated
2. "Continue to Visual Sourcing" button enabled (Indigo, prominent)
3. Total duration displayed (e.g., "Total Duration: 2:45")
4. User clicks "Continue"
5. System saves current_step = 'visual-sourcing' to database
6. System navigates to Visual Sourcing Loading UI (Section 6.8)

### 6.7.4 States

**Landing State (All Scenes Loaded):**
- User arrives from script generation
- All scenes displayed with script text and audio players
- Total duration calculated and displayed
- "Continue" button enabled
- All audio players ready to play

**Progressive Loading State:**
- Some scenes have audio players (voiceovers complete)
- Some scenes show loading indicator (voiceovers generating)
- Total duration shows "Calculating..." or partial duration
- "Continue" button disabled (gray)
- Real-time updates as voiceovers complete

**Audio Playing State:**
- One scene's audio player active (pause button, progress filling)
- Other audio players paused/idle
- User can switch between scenes (auto-pause previous)

**All Complete State:**
- All scenes have voiceovers
- Total duration displayed accurately
- "Continue" button enabled and prominent
- Success message (optional): "✓ Your script is ready for visual sourcing"

**Error State (Scene Voiceover Failed):**
- Scene card shows error indicator
- Error message: "Voiceover generation failed"
- **Retry Button** on scene card:
  - Style: Secondary button, small
  - Text: "Retry"
  - Action: Regenerates voiceover for this scene only
- Other scenes remain unaffected
- "Continue" button remains disabled until all scenes succeed

**Loading (Audio Preview):**
- Spinner on play button if audio file takes time to load
- Scene card remains visible
- Other scenes remain interactable

---
