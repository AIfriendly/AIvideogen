# 8. Component Library

### 8.1 Component Strategy

**From shadcn/ui:**
- Button (Primary, Secondary, Destructive, Ghost variants)
- Card (for scene containers, message bubbles)
- Progress (bar for completion tracking)
- Dialog/Modal (confirmation, topic confirmation, lightbox)
- Badge (scene status, project metadata)
- Scroll Area (smooth scrolling for chat, sidebar)
- Toast (notifications for feedback)
- Input/Textarea (message input, search)
- Avatar (user/assistant icons, optional)

**Custom Components:**

### 8.2 ProjectSidebar Component

**Purpose:** Display list of projects with "New Chat" button and project switching

**Anatomy:**
- "New Chat" button (top, sticky)
- Project list (scrollable)
- Each project item: Icon, Name, Timestamp
- Active state indicator (left border highlight)

**States:**
- **Default:** List visible, no project selected
- **Active Project:** One project highlighted with indigo left border
- **Hover:** Project item background changes to Slate 700
- **Loading:** Skeleton loaders for project items
- **Empty:** "No projects yet" message + "New Chat" button prominent
- **Error:** "Failed to load projects" + Retry button

**Variants:**
- Desktop: 280px fixed width
- Tablet: Collapsible with hamburger toggle
- Mobile: Overlay (full-screen modal)

**Behavior:**
- Click "New Chat" → Creates new project, switches to it
- Click project item → Loads project, switches main content area
- Hover project → Shows three-dot menu for actions (delete, rename)
- Auto-updates when project activity occurs (new message, etc.)

**Accessibility:**
- ARIA role: `navigation`
- ARIA label: "Project list"
- Keyboard: Tab to navigate, Enter to select, Arrow keys to move between projects
- Screen reader: "Project: [name], last active [timestamp], [active/inactive]"

### 8.3 ChatInterface Component

**Purpose:** Display conversation history and message input for AI brainstorming

**Anatomy:**
- Message list (scrollable, auto-scroll to bottom)
- Message bubbles (user + assistant)
- Message input area (textarea + send button)
- Loading indicator (typing dots)

**States:**
- **Empty:** Welcome message from AI
- **Conversation:** Multiple messages visible, scrollable
- **Loading:** Typing indicator while AI responds, input disabled
- **Error:** Error message bubble, retry option

**Variants:**
- Full-width (when used alone in main content area)
- Constrained (max 800px width, centered)

**Behavior:**
- Auto-scroll to bottom on new message
- Disable auto-scroll when user scrolls up (resume when back at bottom)
- Enter key sends message (Shift+Enter for new line)
- Input expands vertically up to 5 lines
- Disable input while AI responding

**Accessibility:**
- ARIA role: `log` for message list (live region)
- ARIA label: "Chat messages"
- Keyboard: Tab to input, Enter to send, Escape to clear input
- Screen reader: "User message: [content]", "Assistant message: [content]"

### 8.4 MessageBubble Component

**Purpose:** Display individual chat message (user or assistant)

**Anatomy:**
- Avatar/icon (optional, left for assistant)
- Message text (word-wrapped)
- Timestamp (shown on hover)
- Background bubble shape

**States:**
- **User:** Right-aligned, indigo background, white text
- **Assistant:** Left-aligned, slate background, white text
- **Typing (loading):** Animated dots in assistant bubble
- **Error:** Red background or icon indicating failed message

**Variants:**
- User message (right-aligned, indigo)
- Assistant message (left-aligned, slate)
- System message (centered, gray, for workflow transitions)

**Behavior:**
- Hover → Shows timestamp
- Long text → Word-wraps, no horizontal scroll
- Links → Clickable, open in new tab
- Code blocks → Monospace font, syntax highlighting (future)

**Accessibility:**
- ARIA role: `article`
- ARIA label: "[User/Assistant] message at [timestamp]"
- Keyboard: Tab to focus (if links inside)
- Screen reader: Reads message content with role context

### 8.5 VideoPreviewThumbnail Component

**Purpose:** Display video clip thumbnail with play-on-hover preview and selection

**Anatomy:**
- Thumbnail image (16:9 aspect ratio)
- Play icon overlay (center)
- Duration badge (bottom-right corner)
- Selection state (border + checkmark)

**States:**
- **Default:** Thumbnail with subtle border, play icon visible
- **Hover:** Slight scale (1.02), border color changes to indigo, play icon prominent
- **Playing:** Video plays inline or in lightbox, controls visible
- **Selected:** Indigo border (3px), checkmark icon top-right, glow effect
- **Loading:** Skeleton placeholder with shimmer animation
- **Error:** Gray placeholder with error icon, "Retry" text

**Variants:**
- Size: Small (160px), Medium (220px), Large (300px)
- Aspect ratio: 16:9 (default), 9:16 (portrait), 1:1 (square)

**Behavior:**
- Hover → Scale animation, border highlight
- Click (not playing) → Toggle selection
- Click (playing) → Pause/Play
- Double-click → Open full-screen lightbox (future)

**Accessibility:**
- ARIA role: `button`
- ARIA label: "Video clip option {number}, {duration}, {selected/not selected}"
- Keyboard: Enter or Space to select/play, Tab to navigate
- Screen reader: Announces selection state changes

### 8.6 SceneCard Component

**Purpose:** Container for scene script text and clip selection grid

**Anatomy:**
- Scene number badge (top-left)
- Status badge (top-right: Complete/Pending)
- Script text (full or truncated with expand)
- Clip grid (2x2, 2x3, or 3x2 depending on count)
- Collapse/Expand toggle (optional future enhancement)

**States:**
- **Default:** Expanded, no clip selected, pending status
- **In Progress:** User hovering/reviewing clips
- **Completed:** Clip selected, green checkmark, script can collapse
- **Collapsed:** Shows only scene number + selected clip + script preview (future)

**Variants:**
- Expanded (default, shows full grid)
- Collapsed (compact, shows only selection - future enhancement)

**Behavior:**
- Click script → Expand full text if truncated (future)
- Select clip → Status updates to "Complete", badge turns green
- Deselect/change clip → Updates selection, maintains Complete status
- Collapse → Minimizes to show selection only (future)

**Accessibility:**
- ARIA role: `article`
- ARIA label: "Scene {number}, {completion status}"
- Keyboard: Tab to focus, arrow keys to navigate clips within scene
- Screen reader: "Scene {number}, {script text}, {completion status}, {clip count} options"

### 8.7 ProgressTracker Component

**Purpose:** Show overall curation progress (scenes completed)

**Anatomy:**
- Progress bar (visual, linear)
- Text: "3 / 10 scenes complete"
- Optional: Mini scene checklist (scene numbers with checkmarks - future)

**States:**
- **0% Complete:** Gray progress bar, "Get started" message
- **In Progress (1-99%):** Indigo progress bar filling, "{X/N} scenes complete"
- **100% Complete:** Green progress bar, "Ready to assemble!" message

**Variants:**
- Compact (just bar + text, used in header)
- Detailed (includes scene checklist - future enhancement)

**Behavior:**
- Updates live as user selects clips
- Smooth animation when progress changes
- Color shifts from indigo (in progress) to green (complete)

**Accessibility:**
- ARIA role: `progressbar`
- ARIA attributes: `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="{N}"`
- ARIA label: "Curation progress: {X} out of {N} scenes complete"
- Screen reader: Announces progress percentage on update

### 8.8 VoiceSelectionCard Component (Epic 2)

**Purpose:** Display individual voice option with metadata and audio preview capability

**Anatomy:**
- Voice avatar/icon (gradient circle with microphone icon)
- Voice name (centered, prominent)
- Voice metadata (gender, accent, tone stacked vertically)
- Preview button (play/pause with waveform visualization)
- Selection indicator (checkmark, border highlight, glow)

**States:**
- **Default:** Slate 800 background, Slate 700 border, preview button ready
- **Hover:** Indigo 500 border, scale 1.02, subtle shadow
- **Selected:** Indigo 500 border (3px), checkmark icon top-right, glow effect
- **Playing Preview:** Violet 500 border with pulse animation, "Playing..." text
- **Loading:** Spinner on preview button, "Loading preview..." text
- **Error:** "Preview Unavailable" message, card still selectable

**Variants:**
- Standard (180px min height)
- Compact (reduced padding for smaller screens)

**Behavior:**
- Click card (not preview button) → Select voice
- Click preview button → Play/pause audio sample
- Auto-deselect previous selection when new voice selected
- Auto-pause previous preview when new preview starts
- Waveform progress bar fills during playback (optional)

**Accessibility:**
- ARIA role: `button`
- ARIA label: "Voice option {name}, {gender}, {accent}, {tone}. {selected/not selected}. Preview voice sample."
- Keyboard: Tab to focus, Enter/Space to select, arrow keys to navigate between cards
- Screen reader: Announces selection state changes, playback state changes
- ARIA live region for playback status

### 8.9 ScriptGenerationLoader Component (Epic 2)

**Purpose:** Full-screen loading indicator during AI script generation with progress feedback

**Anatomy:**
- Full-screen modal overlay (glassmorphism effect)
- Centered content box (Slate 800 with border)
- Circular spinner (indigo gradient, 64px)
- Main message ("Generating Your Script...")
- Stage message (dynamic, cyclingthrough generation phases)
- Progress bar (optional, indeterminate or determinate)
- Quality retry message (conditional, appears if quality check fails)
- Error state (retry button, error icon)

**States:**
- **Loading (Normal):** Spinner rotating, stage messages cycling, smooth progress
- **Loading (Quality Retry):** Quality check message displayed in amber, spinner continues
- **Error:** Spinner stops, error icon (red X), error message, retry button appears
- **Success (Transition):** Progress bar completes, brief success animation, auto-navigate

**Variants:**
- Standard (with progress bar)
- Minimal (spinner + messages only)

**Behavior:**
- Auto-displays on navigation from voice selection
- Stage messages cycle every 3-5 seconds or based on actual progress
- No user interaction (no cancel, no dismiss)
- Auto-navigates to script preview on completion
- If error → Show retry button, allow user to restart generation

**Accessibility:**
- ARIA role: `alert` for modal, `status` for stage messages
- ARIA label: "Script generation in progress"
- ARIA live region: `polite` for stage message updates
- ARIA busy: `true` during loading
- Screen reader: Announces stage transitions
- Focus trap: Keeps focus within modal (though no interactive elements in normal state)

### 8.10 ScenePreviewCard Component (Epic 2)

**Purpose:** Display individual scene with script text and voiceover audio player for preview

**Anatomy:**
- Scene header (scene number badge + duration badge)
- Script text (full scene narration, readable formatting)
- Audio player (play/pause, progress bar, time display, controls)
- Loading indicator (for scenes still generating voiceovers)
- Error state (retry button for failed voiceovers)

**States:**
- **Default:** Scene text visible, audio player ready, play button idle
- **Playing:** Audio playing, pause button visible, progress bar filling, time updating
- **Loading:** Scene text visible, "Generating voiceover..." with spinner instead of audio player
- **Complete:** Audio player ready, scene fully loaded
- **Error:** Error message displayed, retry button available, other scenes unaffected

**Variants:**
- Standard (with full audio controls)
- Compact (minimal audio controls for mobile)

**Behavior:**
- Click play → Start audio playback, change to pause icon
- Audio playing → Progress bar fills, time updates
- Click pause → Pause audio, change to play icon
- Scrub progress bar → Seek to specific timestamp
- Scene audio plays → Auto-pause other scenes' audio
- Voiceover completes generation → Audio player appears with smooth transition
- Real-time updates as voiceovers generate progressively

**Accessibility:**
- ARIA role: `article` for scene card, `region` for audio player
- ARIA label: "Scene {number}: {first 50 chars of script}, duration {duration}"
- Audio player: Native HTML5 audio controls with custom styling
- ARIA live region for loading/completion status updates
- Keyboard: Tab to audio player controls, Space/Enter to play/pause, arrow keys to scrub
- Screen reader: Announces scene number, script content, playback state, time remaining
- Audio player labeled: "Scene {number} voiceover preview"

### 8.11 SceneAudioPlayer Component (Epic 2)

**Purpose:** Custom audio playback control for scene voiceover preview

**Anatomy:**
- Play/Pause button (circular, indigo)
- Progress bar (horizontal, scrubbing enabled)
- Progress bar scrubber handle (appears on hover)
- Current time display ("MM:SS / MM:SS")
- Volume control (optional, icon + slider on hover)
- Playback speed control (optional, dropdown or cycle button)

**States:**
- **Idle:** Play icon, progress bar empty, time "0:00 / [duration]"
- **Playing:** Pause icon, progress bar filling, time updating
- **Paused:** Play icon, progress bar at current position, time at pause point
- **Loading:** Spinner on play button, progress bar disabled
- **Error:** Error icon, "Audio unavailable", optional retry button
- **Scrubbing:** Progress handle visible, time updates on drag
- **Buffering:** Loading indicator on progress bar if buffering

**Variants:**
- Full (all controls: play, progress, time, volume, speed)
- Standard (play, progress, time only)
- Minimal (play and progress only)

**Behavior:**
- Click play → Start playback from current position
- Click pause → Pause at current position
- Drag progress bar → Seek to timestamp (scrubbing)
- Audio completes → Reset to start, play button returns
- Volume hover → Show volume slider
- Playback speed → Cycle through speeds (0.5x, 1x, 1.5x, 2x)

**Accessibility:**
- ARIA role: `group` with label "Audio player"
- ARIA label for play/pause: "Play" / "Pause audio"
- ARIA label for progress: "Audio progress, {percentage}% played"
- ARIA live region for time display
- Keyboard: Tab to controls, Space/Enter for play/pause, arrow keys for scrubbing
- Screen reader: Announces playback state, time remaining, volume level
- Focus indicators visible on all controls

### 8.12 VisualSuggestionGallery Component (Epic 4, Story 4.2)

**Purpose:** Display grid of AI-suggested video clips for each scene with thumbnails, metadata, and download status indicators

**Anatomy:**
- Grid container (CSS Grid, responsive columns)
- Suggestion cards (5-8 per scene)
- Each card contains:
  - YouTube thumbnail image (16:9 aspect ratio)
  - Video metadata overlay (title, channel, duration)
  - Download status indicator badge (pending/downloading/complete/error icon)
  - Play icon overlay (centered)
  - Rank indicator (optional, top-left: #1, #2, etc.)
  - Selection state (checkmark, border highlight, glow)
- Loading skeleton placeholders
- Empty state message (if 0 suggestions)
- Retry button (if visual sourcing failed)

**States:**
- **Loading:** Skeleton placeholders (5-8 cards) with shimmer animation
- **Loaded:** All suggestion cards visible with thumbnails, metadata, download status
- **Empty (No Suggestions):** Empty state message: "No clips found for this scene. The script may be too abstract or specific. Try editing the script text." + "Retry Visual Sourcing" button
- **Error (Failed Load):** Error message + "Retry" button
- **Partial (Some Downloaded):** Mix of complete/downloading/pending status indicators

**Download Status Indicators:**
- **Pending:** Gray icon (⏳ hourglass), tooltip: "Queued for download"
- **Downloading:** Indigo spinner icon, tooltip: "Downloading segment... X%"
- **Complete:** Green checkmark icon (✓), tooltip: "Ready to preview"
- **Error:** Red warning icon (⚠), tooltip: "Download failed. Will use YouTube embed."

**Variants:**
- Grid: 3 columns (desktop 1024px+), 2 columns (tablet 768px+), 1 column (mobile)
- Card size: Standard (220px width), Compact (180px width for smaller screens)

**Behavior:**
- On mount → Fetch visual suggestions from GET /api/projects/[id]/visual-suggestions?scene={sceneNumber}
- Loading → Show skeleton placeholders
- Loaded → Render suggestion cards ordered by rank (1-8)
- Hover card → Scale 1.02, border highlight, play icon prominent
- Click card → Toggle selection (if not playing video)
- Download status updates → Real-time badge updates as segments download
- Empty state → Show message + "Retry Visual Sourcing" button
- Click retry → Call POST /api/projects/[id]/generate-visuals to re-run Epic 3

**Accessibility:**
- ARIA role: `grid` with label "Video clip suggestions for scene {number}"
- Each card: ARIA role `gridcell`, ARIA label: "Video option {rank}, {title}, {duration}, download status: {status}, {selected/not selected}"
- Keyboard: Tab to navigate cards, Enter/Space to select, arrow keys to move between cards
- Screen reader: Announces selection state changes, download status updates
- Download status badge: ARIA live region (polite) for status updates

### 8.13 VideoPreviewPlayer Component (Epic 4, Story 4.3)

**Purpose:** HTML5 video player for previewing downloaded video segments with controls and keyboard shortcuts

**Anatomy:**
- Video container (16:9 aspect ratio, responsive)
- HTML5 `<video>` element
- Custom controls overlay:
  - Play/Pause button (center, large)
  - Progress bar (bottom, scrubbing enabled)
  - Time display (current / total)
  - **Silent video indicator (🔇 icon with tooltip - audio intentionally stripped)**
  - Fullscreen toggle (optional)
- Video metadata header (title, channel name)
- Close button (top-right, X icon)
- Loading spinner (while video loads)
- Error state (fallback to YouTube embed)

**Note:** Volume control removed - all preview videos have audio stripped at download time (Story 3.7). Silent indicator communicates this is intentional, not a bug.

**States:**
- **Idle (Not Playing):** Large play icon in center, controls hidden
- **Playing:** Play icon hidden, controls appear on hover, progress bar updating
- **Paused:** Pause icon visible, controls visible, progress bar at current position
- **Loading:** Spinner overlay, controls disabled, "Loading video..."
- **Error (Fallback):** YouTube iframe embed instead of HTML5 player, message: "Using YouTube preview (download unavailable)"
- **Fullscreen:** Video fills screen, controls at bottom, ESC to exit

**Video Source Logic:**
- **Primary:** Load downloaded segment from `default_segment_path` (`.cache/videos/{projectId}/scene-{sceneNumber}-default.mp4`)
- **Fallback:** If `download_status = 'error'` OR `default_segment_path` is NULL → Embed YouTube iframe with `video_id`

**Controls Specification:**
- **Play/Pause Button:**
  - Size: 64px diameter (center overlay when idle), 44px (bottom controls when playing)
  - Icon: ▶ (play) / ⏸ (pause)
  - Background: Indigo 500 with opacity 0.9, white icon
  - Hover: Indigo 600, scale 1.05
- **Progress Bar:**
  - Height: 6px (8px on hover for easier scrubbing)
  - Background: Slate 700 (`#334155`)
  - Fill: Indigo 500 (`#6366f1`)
  - Scrubber handle: 14px circle, appears on hover
  - Tooltip: Shows timestamp on hover
- **Silent Video Indicator:**
  - Icon: 🔇 (static mute icon - not interactive)
  - Position: Bottom-left of controls bar, before time display
  - Size: 16px, matching other control icons
  - Color: `text-muted-foreground` (Slate 400, `#94a3b8`) - not alarming
  - Tooltip: "Audio removed for preview" (appears on hover)
  - No slider or unmute option (audio permanently stripped)
  - Purpose: Communicates that silence is intentional, not broken playback
- **Time Display:**
  - Format: "MM:SS / MM:SS"
  - Color: Slate 300 (`#cbd5e1`)
  - Font size: 0.875rem (14px)

**Keyboard Shortcuts:**
- **Space:** Play/Pause toggle
- **Esc:** Close preview player, return to gallery
- **Left/Right Arrow:** Rewind/Forward 5 seconds
- **F:** Fullscreen toggle

**Note:** Volume shortcuts (M, Up/Down for volume) removed - audio is permanently stripped from all preview videos.

**Interaction Patterns:**
- Click suggestion card → Open preview player modal/lightbox
- Video loads → Show spinner, then auto-play on load
- Hover video → Show controls (play/pause, progress bar, volume)
- Click outside player OR press ESC → Close preview, return to gallery
- Video completes → Pause at end, show replay button
- Error loading → Show fallback YouTube embed with iframe

**Behavior:**
- **Lazy Loading:** Only load video when user clicks to preview (not on page load)
- **Preload on Hover (Optional):** Start loading video segment when user hovers suggestion card for >500ms
- **Auto-Pause Previous:** If user opens new preview while another is playing → pause/close previous player
- **Session Tracking:** Track which clips user previewed (analytics, optional)

**Accessibility:**
- ARIA role: `region` with label "Video preview player"
- ARIA label for video: "{title} by {channel}, duration {duration}"
- ARIA label for play/pause: "Play video" / "Pause video"
- ARIA label for progress bar: "Video progress, {percentage}% played"
- ARIA label for silent indicator: "Audio removed for preview"
- ARIA live region for time display, playback state
- Keyboard: Tab to controls, Space/Enter for play/pause, arrow keys for scrubbing
- Screen reader: Announces playback state, time remaining, silent audio status
- Focus indicators visible on all controls
- Closed captions support (if available in video metadata)

**Note:** Volume-related accessibility features removed as audio is permanently stripped from preview videos.

**Responsive Design:**
- **Desktop (1024px+):** Player opens in lightbox modal (max-width 800px, centered)
- **Tablet (768-1023px):** Player opens fullscreen with close button top-right
- **Mobile (<768px):** Player opens fullscreen, touch-optimized controls, larger touch targets (44px minimum)

### 8.14 AssemblyTriggerButton Component (Epic 4, Story 4.5)

**Purpose:** Sticky "Assemble Video" button with validation, confirmation modal, and assembly trigger


**Anatomy:**
- Sticky footer container (fixed at bottom of viewport)
- Primary button: "Assemble Video"
- Validation tooltip (disabled state)
- Confirmation modal (triggered on click when enabled)
- Loading spinner (during assembly request)
- Error toast (if assembly fails)

**States:**
- **Disabled (Incomplete Selections):** Gray background (#475569 Slate 600), opacity 0.6, cursor not-allowed, tooltip: "Select clips for all X scenes to continue"
- **Enabled (All Selections Complete):** Indigo 500 background, white text, cursor pointer, hover: Indigo 600
- **Loading (Assembly Request Processing):** Indigo 500 background, white spinner icon, text: "Assembling...", button disabled
- **Error (Assembly Failed):** Button returns to enabled state, error toast appears: "Failed to start assembly. Please try again."

**Button Specification:**
- **Size:** Large (padding 16px 48px, height 56px)
- **Font Size:** 1.125rem (18px)
- **Font Weight:** 600 (semibold)
- **Border Radius:** 8px
- **Box Shadow:** 0 4px 12px rgba(99, 102, 241, 0.4) when enabled
- **Icon:** Optional video assembly icon (🎬) before text
- **Position:** Fixed at bottom of viewport, z-index 100
- **Width:** auto (centered with padding)
- **Animation:** Smooth transition between states (0.2s ease)

**Sticky Footer Container:**
- **Background:** `#1e293b` (Slate 800) with slight blur (backdrop-filter: blur(8px))
- **Border Top:** 1px solid `#334155` (Slate 700)
- **Padding:** 16px 32px
- **Display:** Flex row, center alignment
- **Height:** 88px
- **Sticky:** position: sticky, bottom: 0
- **Z-index:** 100 (above page content)

**Confirmation Modal:**
- **Trigger:** Click enabled "Assemble Video" button
- **Background:** Glassmorphism overlay (rgba(15, 23, 42, 0.9) with blur)
- **Modal Container:**
  - Background: Slate 800 (`#1e293b`)
  - Border: 1px solid Slate 700 (`#334155`)
  - Border Radius: 12px
  - Padding: 32px
  - Max Width: 500px
  - Center aligned
- **Modal Content:**
  - **Icon:** Video assembly icon (🎬) or checkmark circle (large, indigo)
  - **Heading:** "Ready to Assemble Your Video?" (h2, 1.5rem)
  - **Summary:** "You've selected clips for all {N} scenes. This will create your final video with synchronized voiceovers."
  - **Scene Count Display:** "{N} scenes • ~{total duration} estimated"
  - **Action Buttons:**
    - **Cancel:** Secondary ghost button, "Not Yet", closes modal
    - **Confirm:** Primary button, "Assemble Video", triggers assembly
- **Modal Behavior:**
  - ESC key → Close modal (cancel)
  - Click outside → Close modal (cancel)
  - Click "Confirm" → Call POST /api/projects/[id]/assemble, show loading spinner, navigate to assembly status page

**Validation Logic:**
- On mount → Check all scenes have `selected_clip_id` in Zustand store
- On selection change → Re-validate, update button state
- **Enabled conditions:**
  - All scenes have selected_clip_id (non-null)
  - OR all incomplete scenes are marked as "skipped"
- **Disabled conditions:**
  - ANY scene missing selected_clip_id AND not marked as skipped
- **Tooltip content:**
  - "Select clips for all {X} scenes to continue" (shows missing scene count)

**Assembly Trigger Flow:**
1. User clicks enabled "Assemble Video" button
2. Confirmation modal appears
3. User clicks "Assemble Video" in modal
4. Button shows loading spinner, text: "Assembling..."
5. POST /api/projects/[id]/assemble with scene data:
   - `scene_number`, `script_text`, `selected_clip_id`, `voiceover_audio_path`, `clip_duration`
6. **Success Response:**
   - Update `projects.current_step = 'assembly'` (or 'export')
   - Navigate to assembly status page: `/projects/{id}/assembly-status`
   - Show success toast: "Video assembly started! This may take a few minutes."
7. **Error Response:**
   - Button returns to enabled state
   - Show error toast: "Failed to start assembly. Please try again."
   - Keep user on curation page

**Accessibility:**
- ARIA role: `button`
- ARIA label: "Assemble video with {N} selected clips" (enabled) / "Assemble video disabled, select clips for all scenes first" (disabled)
- ARIA disabled: `true` when validation fails
- ARIA live region for tooltip message
- Keyboard: Tab to focus, Enter/Space to trigger (if enabled)
- Screen reader: Announces button state, validation message, modal content
- Focus indicator: 2px solid Indigo 500 outline with 2px offset
- Tooltip: ARIA describedby pointing to validation message element

**Responsive Design:**
- **Desktop (1024px+):** Sticky footer, button centered with padding
- **Tablet (768-1023px):** Full-width sticky footer, button spans 90% width
- **Mobile (<768px):** Full-width sticky footer, button full width with 16px side padding, larger touch target (56px height)

---
