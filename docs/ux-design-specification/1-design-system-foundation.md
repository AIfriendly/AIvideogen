# 1. Design System Foundation

### 1.1 Design System Choice

**Selected: shadcn/ui (Tailwind-based)**

**Rationale:**
- Modern, customizable component library perfect for FOSS requirements
- Built on Radix UI primitives (accessibility built-in)
- Tailwind CSS provides rapid styling and responsive design
- Highly themeable for unique brand identity
- Excellent for media-heavy applications (video preview interfaces)
- Active community, well-documented
- Copy-paste components (no dependency bloat)

**What it provides:**
- Button, Card, Dialog/Modal, Form inputs, Select/Dropdown components
- Tabs, Accordion, Progress indicators
- Toast notifications for feedback
- Scroll Area (smooth scrolling for long content)
- Accessibility (WCAG AA compliant out of box)
- Dark/Light mode support

**Custom components needed:**
- ProjectSidebar (project list navigation)
- ChatInterface (message display + input)
- MessageBubble (user/assistant message rendering)
- VideoPreviewThumbnail (video clip preview component)
- SceneCard (scene script + clip grid container)
- ProgressTracker (scene completion indicator)
- VisualSuggestionGallery (clip suggestions grid with thumbnails, metadata, download status) **[Epic 4]**
- VideoPreviewPlayer (HTML5 video player with controls, keyboard shortcuts, fallback to YouTube) **[Epic 4]**
- AssemblyTriggerButton (sticky "Assemble Video" button with validation and confirmation modal) **[Epic 4]**

### 1.2 UX Pattern Consistency Rules

**These patterns ensure consistent UX across the entire application.**

#### 1.2.1 Button Hierarchy

**Primary Button:**
- **Background:** `#6366f1` (Indigo 500)
- **Color:** White
- **Usage:** Main actions ("Continue", "Assemble Video", "Send")
- **Hover:** Darker indigo (`#4f46e5`)
- **Disabled:** Gray background (`#475569`), opacity 0.5, cursor not-allowed

**Secondary Button:**
- **Background:** Transparent
- **Border:** 1px solid `#6366f1` (Indigo 500)
- **Color:** `#6366f1` (Indigo 500)
- **Usage:** Alternative actions ("Preview", "Back")
- **Hover:** Background `#334155` (Slate 700, 30% opacity)

**Destructive Button:**
- **Background:** `#ef4444` (Red 500)
- **Color:** White
- **Usage:** Delete actions, irreversible operations
- **Hover:** Darker red (`#dc2626`)

**Ghost Button:**
- **Background:** Transparent
- **Border:** None
- **Color:** `#cbd5e1` (Slate 300)
- **Usage:** Tertiary actions, cancel
- **Hover:** Background `#334155` (Slate 700, 20% opacity)

#### 1.2.2 Form Validation Patterns

**Validation Timing:**
- **On blur:** Validate individual fields when user leaves the field
- **On submit:** Validate entire form when user clicks submit
- **Real-time:** Only for password strength or character count

**Error Message Display:**
- **Location:** Below the field
- **Color:** `#ef4444` (Red 500)
- **Font Size:** 0.875rem (14px)
- **Icon:** ⚠ icon before text
- **Animation:** Fade in (0.2s)

**Error State Styling:**
- **Border:** 2px solid `#ef4444` (Red 500)
- **Background:** `#0f172a` (Slate 900) - unchanged
- **Focus:** Red border remains, no indigo

**Success State Styling:**
- **Border:** 2px solid `#10b981` (Emerald 500) - optional, brief
- **Icon:** ✓ checkmark (Emerald) - shown briefly

**Help Text:**
- **Location:** Below field (above error message if both present)
- **Color:** `#94a3b8` (Slate 400)
- **Font Size:** 0.875rem (14px)
- **Format:** Plain text, concise

**Required Fields:**
- **Indicator:** Asterisk (*) after label, red color
- **Label Format:** "Email Address *"
- **ARIA:** `aria-required="true"` attribute

**Field Labels:**
- **Position:** Above field
- **Font Weight:** 500 (medium)
- **Color:** `#f8fafc` (Slate 50)
- **Font Size:** 0.875rem (14px)
- **Association:** `<label for="field-id">` with matching input `id`

#### 1.2.3 Modal Patterns

**Modal Structure:**
- **Backdrop:** `#0f172a` (Slate 900, 80% opacity), blur 4px
- **Modal Container:** `#1e293b` (Slate 800)
- **Max Width:** 500px (small), 700px (medium), 900px (large)
- **Border Radius:** 16px
- **Box Shadow:** 0 8px 24px rgba(0,0,0,0.4)
- **Padding:** 24px (lg)

**Dismiss Behavior:**
- **ESC key:** Always closes modal (unless critical confirmation)
- **Click outside (backdrop):** Closes modal for non-critical modals
- **Close button (X):** Top-right corner, always visible
  - **Size:** 32px x 32px
  - **Icon:** X or close icon
  - **Color:** `#94a3b8` (Slate 400)
  - **Hover:** `#cbd5e1` (Slate 300)

**Focus Trapping:**
- **On open:** Focus moves to first interactive element (or close button if no other)
- **Tab navigation:** Cycles through modal elements only
- **On close:** Focus returns to element that triggered modal

**Modal Stacking:**
- **Rule:** Avoid multiple modals simultaneously
- **If needed:** Use nested content or multi-step modal
- **Z-index:** Base modal: 9998, nested: 9999

**Modal Types:**

**Confirmation Modal:**
- **Title:** Question format ("Delete this project?")
- **Description:** Consequences explanation
- **Primary Action:** Action verb ("Delete", "Confirm", "Continue")
- **Secondary Action:** "Cancel"

**Information Modal:**
- **Title:** Noun format ("About This Feature")
- **Description:** Information content
- **Primary Action:** "Got it" or "Close"

**Form Modal:**
- **Title:** Action format ("Add New Project")
- **Content:** Form fields
- **Primary Action:** "Save" or "Create"
- **Secondary Action:** "Cancel"

#### 1.2.4 Confirmation Patterns

**When to Use Confirmation:**
- **Destructive actions:** Delete project, discard changes
- **Irreversible operations:** Final video assembly (can't undo)
- **Significant state changes:** Switching projects with unsaved work

**When to Use Undo Instead:**
- **Non-destructive changes:** Selection changes (clip selection, voice selection)
- **Easily reversible:** Preferences, settings
- **Frequent actions:** Scene navigation, project switching

**Confirmation Dialog Structure:**
- **Title:** Clear question ("Delete 'Mars Colonization' project?")
- **Description:**
  - Explain consequences
  - Mention what will be lost
  - 1-2 sentences maximum
- **Primary Action Button:**
  - Destructive actions: Red background, action verb ("Delete")
  - Non-destructive: Indigo background, action verb ("Continue")
- **Secondary Action Button:**
  - Always "Cancel" (neutral, ghost style)
  - Position: Left of primary (or below on mobile)

**Example Confirmation Dialogs:**

**Delete Project:**
```
Title: Delete 'Mars Colonization' project?
Description: This will permanently delete all conversations, scripts, and settings for this project. This action cannot be undone.
Primary: [Delete] (Red)
Secondary: [Cancel] (Ghost)
```

**Assembly with Incomplete Scenes:**
```
Title: Assemble video with 3 of 5 scenes?
Description: 2 scenes don't have clips selected. The final video will only include the 3 completed scenes.
Primary: [Assemble Anyway] (Indigo)
Secondary: [Cancel] (Ghost)
```

#### 1.2.5 Notification Patterns (Toast)

**Placement:** Top-right corner
- **Position:** Fixed, 16px from top, 16px from right
- **Z-index:** 10000 (above modals)

**Duration:**
- **Success:** 5 seconds auto-dismiss
- **Info:** 5 seconds auto-dismiss
- **Warning:** 8 seconds auto-dismiss
- **Error:** Persistent (requires manual dismiss) or 15 seconds

**Stacking:**
- **Direction:** Stack vertically, newest on top
- **Gap:** 8px between toasts
- **Max Visible:** 3 toasts
- **Overflow:** Oldest toasts auto-dismiss when limit reached

**Toast Structure:**
- **Width:** 360px
- **Padding:** 16px
- **Border Radius:** 8px
- **Box Shadow:** 0 4px 12px rgba(0,0,0,0.3)
- **Animation:** Slide in from right (0.3s), fade out (0.2s)

**Toast Types:**

**Success Toast:**
- **Background:** `#10b981` (Emerald 500)
- **Color:** White
- **Icon:** ✓ checkmark (left side)
- **Example:** "Voice selection saved successfully"

**Error Toast:**
- **Background:** `#ef4444` (Red 500)
- **Color:** White
- **Icon:** ✗ or ! icon (left side)
- **Dismiss Button:** X (right side, white)
- **Example:** "Failed to load clips. Check your connection."

**Warning Toast:**
- **Background:** `#f59e0b` (Amber 500)
- **Color:** White
- **Icon:** ⚠ icon (left side)
- **Example:** "YouTube API quota approaching limit"

**Info Toast:**
- **Background:** `#6366f1` (Indigo 500)
- **Color:** White
- **Icon:** ℹ icon (left side)
- **Example:** "Script generation will take about 30 seconds"

**Toast Content:**
- **Title:** Bold, 0.875rem (14px) - optional
- **Message:** Regular, 0.875rem (14px) - required
- **Max Lines:** 2-3 lines, ellipsis if longer

#### 1.2.6 Empty State Patterns

**Structure:**
- **Container:** Center-aligned, padding 48px
- **Icon:** Large icon or illustration (64px+), gray color
- **Primary Text:** Clear message ("No projects yet")
- **Secondary Text:** Actionable guidance ("Click 'New Chat' to start")
- **CTA Button:** Primary action if applicable

**Contexts:**
- **First Use:** "Start your first video project!"
- **No Results:** "No clips found for this scene"
- **Cleared Content:** "Chat cleared. Start a new conversation?"

#### 1.2.7 Date/Time Patterns

**Format:** Relative time with fallback to absolute
- **< 1 minute:** "Just now"
- **< 1 hour:** "X minutes ago"
- **< 24 hours:** "Today, 2:34 PM"
- **Yesterday:** "Yesterday, 3:15 PM"
- **< 7 days:** "Monday, 1:20 PM"
- **> 7 days:** "Dec 28, 2024"

**Implementation:** `Intl.DateTimeFormat` for localization

**Tooltip on Hover:** Show full timestamp ("December 28, 2024 at 1:20:35 PM")

#### 1.2.8 Loading State Patterns

**This section consolidates all loading state specifications for consistency across the application.**

**Loading Pattern Types:**

**1. Spinner (Indeterminate Progress)**
- **Usage:** Unknown duration tasks, API calls, content fetching
- **Size Options:**
  - Small: 16px (inline, buttons)
  - Medium: 24px (component-level)
  - Large: 64px (full-screen overlays)
- **Style:** Circular ring with gradient (Indigo 500 → Violet 500)
- **Animation:** Smooth rotation, 1.2s duration, infinite loop
- **Background:** Semi-transparent overlay when blocking content

**2. Progress Bar (Determinate Progress)**
- **Usage:** Known duration tasks, multi-step processes, file downloads
- **Height:** 4px (compact), 6px (standard), 8px (prominent)
- **Background:** `#334155` (Slate 700)
- **Fill:** Linear gradient (`#6366f1` → `#8b5cf6`)
- **Border Radius:** Half of height (rounded ends)
- **Animation:** Smooth width transition (0.3s ease)
- **Percentage Display:** Optional, right-aligned or above bar

**3. Skeleton Loader**
- **Usage:** Content placeholders, list items, cards, images
- **Background:** `#334155` (Slate 700)
- **Animation:** Shimmer effect (lighter gradient sweeping left-to-right)
- **Shimmer Color:** `#475569` (Slate 600) at peak
- **Animation Duration:** 1.5s, infinite loop
- **Border Radius:** Match content shape (8px for cards, 4px for text lines)

**4. Typing Indicator (Chat-Specific)**
- **Usage:** AI response loading in chat interface
- **Style:** Three animated dots in assistant message bubble
- **Dot Size:** 8px diameter
- **Dot Color:** `#94a3b8` (Slate 400)
- **Animation:** Sequential bounce, 0.6s cycle

**5. Browser-Based Loading (Playwright Providers - Feature 2.9)**
- **Usage:** Headless browser automation for video sourcing (DVIDS, NASA)
- **Characteristics:** Longer startup time (2-3 seconds), multi-stage loading
- **Spinner:** Large (64px), same as full-screen overlay
- **Stage Messages:** Dynamic, browser lifecycle-specific
  - "Starting browser..." (first request only, 2-3 seconds)
  - "Rendering page..." (1-2 seconds per request)
  - "Intercepting video URLs..." (0.5-1 second)
  - "Extracting video metadata..." (0.5-1 second)
- **Provider Badge:** Small badge showing provider type (API vs Browser)
  - API-based: Fast, ~100ms startup
  - Browser-based: Slower, 2-3 second startup, ~200MB RAM usage
- **Progress Bar:** Slower progression, extended estimated time
  - Formula: `(num_scenes × 7.5 seconds) + 3 seconds` (includes browser startup)
  - API comparison: `num_scenes × 3.5 seconds`
- **Error States:** Browser-specific errors
  - Browser not installed
  - Stealth detection / bot blocking
  - Page render timeout
- **See Also:** Section 6.8 (Visual Sourcing Loading UI) for complete browser-based provider specifications

**Loading State Specifications by Context:**

**Full-Screen Loading Overlay:**
- **Background:** `#0f172a` (Slate 900, 95% opacity)
- **Backdrop Blur:** 8px
- **Z-Index:** 9999
- **Content:** Centered box (Slate 800, 16px border-radius)
- **Elements:** Large spinner + main message + stage message
- **Stage Message Animation:** Fade transition (0.3s) between stages

**Component-Level Loading:**
- **Overlay:** Semi-transparent background on component
- **Spinner:** Medium (24px), centered
- **Text:** "Loading..." (optional, Slate 400)
- **Interaction:** Component disabled during load

**Button Loading State:**
- **Spinner:** Small (16px), replaces icon or before text
- **Text:** Changes to action verb + "..." (e.g., "Saving...", "Assembling...")
- **Background:** Same as enabled state (Indigo 500)
- **Interaction:** Button disabled, cursor: not-allowed

**List/Grid Loading:**
- **Skeleton Count:** 3-5 items for lists, 6-9 for grids
- **Staggered Animation:** Optional 0.1s delay between items
- **Shape:** Match expected content shape

**Error Recovery from Loading:**
- **Error Icon:** Red circle with X or ! icon
- **Error Message:** Clear, actionable (e.g., "Failed to load. Check your connection.")
- **Retry Button:** Secondary style, positioned below error message
- **Transition:** Smooth fade from loading to error state

**Accessibility for Loading States:**
- **ARIA:** `aria-busy="true"` on loading container
- **ARIA Live:** `aria-live="polite"` for stage message updates
- **Screen Reader:** Announce loading start and completion
- **Focus:** Maintain or trap focus appropriately during load

---
