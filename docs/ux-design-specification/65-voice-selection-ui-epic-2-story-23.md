# 6.5. Voice Selection UI (Epic 2, Story 2.3)

### 6.5.1 Overview

**Purpose:** Allow users to choose an AI voice for video narration from multiple voice options before script generation.

**User Value:** Creators can personalize their videos by selecting a voice that matches their content's tone and target audience. Preview samples ensure confident selection.

**Key Features:**
- Display 20 voice options with metadata (name, gender, accent, tone)
- Voice cards displayed in 3-column grid with vertical scroll for overflow
- Audio preview playback for each voice
- Single voice selection per project
- Voice selection persists and applies to all scene voiceovers
- Smooth workflow integration between topic confirmation and script generation

### 6.5.2 Visual Design

**Voice Selection Interface Layout:**

```
┌─────────────────────────────────────┐
│  Select Your Voice                  │  <- Header
│  Choose a narrator for your video   │
├─────────────────────────────────────┤
│                                     │
│  ┌───────┐ ┌───────┐ ┌───────┐    │
│  │ Voice │ │ Voice │ │ Voice │    │  <- Voice cards (3-col grid, scrollable)
│  │   1   │ │   2   │ │   3   │    │  <- 20 total voices, ~7 rows
│  │ ▶ Play│ │ ▶ Play│ │ ▶ Play│    │  <- Preview buttons
│  └───────┘ └───────┘ └───────┘    │
│                                     │
│  ┌───────┐ ┌───────┐ ┌───────┐    │
│  │ Voice │ │ Voice │              │
│  │   4   │ │   5   │              │
│  │ ▶ Play│ │ ▶ Play│              │
│  └───────┘ └───────┘              │
│                                     │
│              [Continue]             │  <- Disabled until selection
└─────────────────────────────────────┘
```

**Voice Selection Container:**
- **Max Width:** 1000px (centered in main content area)
- **Padding:** 32px (lg) on sides
- **Background:** `#0f172a` (Slate 900)

**Header:**
- **Title:** "Select Your Voice" (h2, 1.5rem)
- **Subtitle:** "Choose a narrator for your video" (0.875rem, Slate 300)
- **Margin Bottom:** 32px (lg)

**Voice Card Grid:**
- **Display:** CSS Grid
- **Columns:** 3 (desktop 1024px+), 2 (tablet 768px+), 1 (mobile)
- **Gap:** 24px (1.5rem between cards)
- **Rows:** 7 rows (20 voices ÷ 3 columns = ~7 rows)
- **Vertical Scroll:** Container has max-height with overflow-y auto
- **Margin Bottom:** 32px (lg)

**Voice Card:**
- **Background:** `#1e293b` (Slate 800)
- **Border:** 2px solid `#334155` (Slate 700)
- **Border Radius:** 12px
- **Padding:** 20px
- **Min Height:** 180px
- **Cursor:** Pointer
- **Transition:** All 0.2s ease

**Voice Card (Hover):**
- **Border Color:** `#6366f1` (Indigo 500)
- **Transform:** scale(1.02)
- **Box Shadow:** 0 4px 12px rgba(99, 102, 241, 0.2)

**Voice Card (Selected):**
- **Border:** 3px solid `#6366f1` (Indigo 500)
- **Background:** `#1e293b` with slight indigo tint (rgba(99, 102, 241, 0.05) overlay)
- **Box Shadow:** 0 0 0 4px rgba(99, 102, 241, 0.1) (glow effect)
- **Checkmark Icon:** Top-right corner, white checkmark in indigo circle

**Voice Card (Playing Preview):**
- **Border Color:** `#8b5cf6` (Violet 500) - animated pulse
- **Waveform Animation:** Subtle animated bars indicating playback

**Voice Card Content:**

**1. Voice Avatar/Icon** (top, centered):
- **Size:** 48px circle
- **Background:** Gradient based on voice ID (indigo → violet)
- **Icon:** Microphone icon or voice waveform symbol
- **Color:** White

**2. Voice Name:**
- **Font Size:** 1.125rem (18px)
- **Font Weight:** 600 (semi-bold)
- **Color:** `#f8fafc` (Slate 50)
- **Text Align:** Center
- **Margin Top:** 12px

**3. Voice Metadata:**
- **Font Size:** 0.875rem (14px)
- **Color:** `#cbd5e1` (Slate 300)
- **Text Align:** Center
- **Line Height:** 1.6
- **Display:** Stacked labels
  - Gender: "Male" / "Female"
  - Accent: "American" / "British" / "Neutral"
  - Tone: "Professional" / "Friendly" / "Energetic"

**4. Preview Button:**
- **Position:** Bottom of card, centered
- **Style:** Secondary button (ghost style)
- **Background (default):** Transparent
- **Background (hover):** `#334155` (Slate 700, 30% opacity)
- **Border:** 1px solid `#6366f1` (Indigo 500)
- **Color:** `#6366f1` (Indigo 500)
- **Padding:** 8px 20px
- **Border Radius:** 6px
- **Icon:** Play icon ▶ (changes to pause ⏸ when playing)
- **Text:** "Preview" (or "Playing..." when active)

**Audio Playback Visualization (Optional Enhancement):**
- **Waveform Bar:** Horizontal bar below preview button
- **Width:** 80% of card width
- **Height:** 4px
- **Background:** `#334155` (Slate 700)
- **Progress Fill:** `#6366f1` (Indigo 500)
- **Animation:** Progress bar fills during playback

**"Continue" Button:**
- **Position:** Bottom center of container
- **Style:** Primary button (large)
- **Background:** `#6366f1` (Indigo 500)
- **Color:** White
- **Padding:** 12px 48px
- **Border Radius:** 8px
- **Font Size:** 1rem (16px)
- **Font Weight:** 600
- **State (disabled):** Gray background (#475569), cursor not-allowed, opacity 0.5
- **State (enabled):** Indigo background, hover darker (#4f46e5)
- **Text:** "Continue to Script Generation" or "Continue"

### 6.5.3 Interaction Patterns

**Previewing Voice:**
1. User clicks "Preview" button on voice card
2. System loads audio sample (short 10-15 second clip)
3. Preview button changes to "Playing..." with pause icon
4. Waveform visualization animates (optional)
5. Card border pulses with violet color during playback
6. If another voice preview is clicked, previous preview stops automatically
7. Audio completes → Button returns to "Preview" with play icon
8. Click pause or click preview again → Audio stops, button resets

**Selecting Voice:**
1. User clicks anywhere on voice card (not playing preview)
2. System applies "selected" state: Indigo border (3px), checkmark icon, glow effect
3. If previous voice selected → Deselect automatically (only one selection allowed)
4. "Continue" button enables (Indigo, no longer gray)
5. Selection persists even if user plays other previews (preview != selection)

**Confirming Selection:**
1. User has selected a voice (e.g., "Voice 2")
2. "Continue" button enabled
3. User clicks "Continue to Script Generation"
4. System saves voice_id to project database
5. System navigates to script generation loading screen (Section 6.6)

**Changing Selection:**
- User can click different voice card anytime before clicking "Continue"
- No confirmation needed (easily reversible)
- Previous selection deselects automatically
- New selection applies immediately

### 6.5.4 States

**Landing State:**
- User arrives from topic confirmation dialog (Story 1.7)
- All voice cards displayed, none selected
- "Continue" button disabled (gray)
- Instruction text: "Choose a narrator for your video"

**Preview Playing:**
- One voice card has "Playing..." button with pause icon
- Card border pulses with violet
- Waveform animation (optional)
- Audio plays for 10-15 seconds
- Other cards remain interactable

**Voice Selected:**
- One voice card has selected state (indigo border, checkmark, glow)
- "Continue" button enabled (Indigo, prominent)
- Can still preview other voices (selection persists)
- Can change selection by clicking different card

**Loading (Audio Preview):**
- Spinner overlay on preview button if audio takes time to load
- Card remains interactable
- Subtle loading message: "Loading preview..."

**Error State:**
- Audio preview fails to load → "Preview Unavailable" message on card
- Card remains selectable (can select without previewing if needed)
- Error toast notification: "Failed to load audio preview. You can still select this voice."
- Retry button on card (optional)

---
