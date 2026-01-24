# 7.7. Export Page UI (Epic 5, Story 5.5)

### 7.7.1 Overview

**Purpose:** Display completed video and thumbnail with download options, celebrating the user's completed creation.

**User Value:** Clear, satisfying conclusion to the video creation workflow. Easy access to final outputs with all relevant metadata. Encourages users to create more videos.

**Key Features:**
- Large video player showcasing final output
- Thumbnail preview in sidebar
- Download buttons for video and thumbnail
- Video metadata display (duration, size, resolution)
- Project summary
- "Create New Video" CTA for retention

### 7.7.2 Visual Design

**Export Page Layout (Showcase Style):**

```
┌─────────────────────────────────────────────────────┐
│  🎉 Your Video is Ready!                            │  <- Header
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────┐  ┌───────────────┐  │
│  │                           │  │               │  │
│  │                           │  │  Thumbnail    │  │
│  │      Video Player         │  │   Preview     │  │
│  │       (16:9)              │  │               │  │
│  │                           │  │ [Download]    │  │
│  │                           │  │               │  │
│  └───────────────────────────┘  └───────────────┘  │
│                                                     │
│  [▼ Download Video]                                 │  <- Primary CTA
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ Duration: 2:34  |  Size: 45 MB  |  720p     │   │  <- Metadata
│  │ Topic: Mars Colonization  |  5 Scenes       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [+ Create New Video]        [← Back to Curation]  │  <- Actions
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Export Page Container:**
- **URL:** `/projects/:id/export`
- **Max Width:** 1200px (centered)
- **Padding:** 32px (lg)
- **Background:** `#0f172a` (Slate 900)

**Header:**
- **Text:** "🎉 Your Video is Ready!"
- **Font Size:** 1.5rem (24px)
- **Font Weight:** 600 (semi-bold)
- **Color:** `#f8fafc` (Slate 50)
- **Margin Bottom:** 24px (lg)
- **Icon:** Party popper emoji (🎉) for celebration

**Main Content Layout:**
- **Display:** CSS Grid
- **Columns:** `2fr 1fr` (Video 66%, Thumbnail 33%)
- **Gap:** 24px (lg)
- **Margin Bottom:** 24px

**Video Player Section:**
- **Aspect Ratio:** 16:9
- **Background:** `#000000` (pure black for video contrast)
- **Border Radius:** 12px
- **Box Shadow:** 0 4px 12px rgba(0,0,0,0.4)
- **Overflow:** Hidden

**Video Player Controls:**
- **Type:** HTML5 video with native controls
- **Controls:** Play/pause, progress bar, volume, fullscreen
- **Autoplay:** No (user initiates playback)
- **Poster:** First frame of video or generated thumbnail

**Thumbnail Preview Section:**
- **Background:** `#1e293b` (Slate 800)
- **Border:** 1px solid `#334155` (Slate 700)
- **Border Radius:** 12px
- **Padding:** 16px
- **Display:** Flex column

**Thumbnail Image:**
- **Aspect Ratio:** 16:9
- **Border Radius:** 8px
- **Max Width:** 100%
- **Object Fit:** Cover
- **Box Shadow:** 0 2px 8px rgba(0,0,0,0.3)

**Thumbnail Label:**
- **Text:** "Thumbnail"
- **Font Size:** 0.875rem (14px)
- **Font Weight:** 600
- **Color:** `#cbd5e1` (Slate 300)
- **Margin Bottom:** 12px

**Thumbnail Download Button:**
- **Style:** Secondary button (full width)
- **Background:** Transparent
- **Border:** 1px solid `#6366f1` (Indigo 500)
- **Color:** `#6366f1` (Indigo 500)
- **Padding:** 8px 16px
- **Border Radius:** 6px
- **Margin Top:** 12px
- **Icon:** Download icon (↓) before text
- **Text:** "Download Thumbnail"
- **Hover:** Background `#334155` (Slate 700, 30% opacity)

**Primary Download Button (Video):**
- **Position:** Below video player, full width of video section
- **Style:** Primary button (large)
- **Background:** `#6366f1` (Indigo 500)
- **Color:** White
- **Padding:** 14px 32px
- **Border Radius:** 8px
- **Font Size:** 1rem (16px)
- **Font Weight:** 600
- **Icon:** Download icon (↓) before text
- **Text:** "Download Video"
- **Hover:** Darker indigo (`#4f46e5`)
- **Box Shadow:** 0 4px 12px rgba(99, 102, 241, 0.3)

**Metadata Card:**
- **Background:** `#1e293b` (Slate 800)
- **Border:** 1px solid `#334155` (Slate 700)
- **Border Radius:** 8px
- **Padding:** 16px
- **Margin Top:** 24px
- **Display:** Flex row, wrap, justify center
- **Gap:** 24px

**Metadata Items:**
- **Format:** Icon + Label + Value
- **Font Size:** 0.875rem (14px)
- **Color:** Label `#94a3b8` (Slate 400), Value `#f8fafc` (Slate 50)
- **Items:**
  - **Duration:** ⏱ "Duration: 2:34"
  - **File Size:** 📁 "Size: 45 MB"
  - **Resolution:** 🖥 "Resolution: 1280x720"
  - **Topic:** 📝 "Topic: Mars Colonization"
  - **Scenes:** 🎬 "Scenes: 5"

**Action Buttons (Bottom):**
- **Display:** Flex row, space-between
- **Margin Top:** 32px

**"Create New Video" Button:**
- **Style:** Primary button
- **Background:** `#6366f1` (Indigo 500)
- **Color:** White
- **Padding:** 10px 24px
- **Border Radius:** 6px
- **Icon:** Plus icon (+) before text
- **Text:** "Create New Video"
- **Action:** Creates new project, navigates to empty chat

**"Back to Curation" Button:**
- **Style:** Ghost button
- **Background:** Transparent
- **Color:** `#cbd5e1` (Slate 300)
- **Padding:** 10px 24px
- **Border Radius:** 6px
- **Icon:** Arrow left (←) before text
- **Text:** "Back to Curation"
- **Action:** Returns to Visual Curation page (for re-selection if needed)

### 7.7.3 Interaction Patterns

**Arriving at Export Page:**
1. User auto-navigated from Assembly Progress after completion
2. Video player loads with final video (not autoplaying)
3. Thumbnail preview loads
4. Metadata populated from project/video data
5. Download buttons active immediately

**Downloading Video:**
1. User clicks "Download Video" button
2. Browser initiates download
3. Filename: `{video-title}-sanitized.mp4` (e.g., "mars-colonization.mp4")
4. File saves to user's Downloads folder
5. Success toast: "Video downloaded successfully"

**Downloading Thumbnail:**
1. User clicks "Download Thumbnail" button
2. Browser initiates download
3. Filename: `{video-title}-thumbnail.jpg`
4. Success toast: "Thumbnail downloaded successfully"

**Filename Sanitization:**
- Replace spaces with hyphens
- Remove special characters (!@#$%^&*()+=)
- Lowercase all characters
- Truncate to 50 characters
- Example: "The Best Mars Facts! (2024)" → "the-best-mars-facts-2024.mp4"

**Creating New Video:**
1. User clicks "Create New Video"
2. System creates new project in database
3. System navigates to `/projects/:newId` (empty chat)
4. Sidebar updates with new project at top

**Returning to Curation:**
1. User clicks "Back to Curation"
2. System navigates to `/projects/:id/visual-curation`
3. User can change clip selections and re-assemble

### 7.7.4 States

**Normal (Loaded):**
- Video player ready with final video
- Thumbnail preview loaded
- All metadata displayed
- Download buttons enabled
- Action buttons visible

**Loading:**
- Skeleton loaders for video player and thumbnail
- Metadata shows "Loading..."
- Download buttons disabled
- Loading spinner in place of content

**Download in Progress:**
- Button shows loading spinner
- Button text changes to "Downloading..."
- Button disabled until download initiates
- Progress indication (browser-native)

**Error (Video Not Found):**
- Video player shows error state: "Video file not found"
- Download button disabled
- Error message: "Assembly may have failed. Return to Visual Curation?"
- Retry assembly button

**Error (Thumbnail Not Found):**
- Thumbnail preview shows placeholder: "Thumbnail unavailable"
- Thumbnail download button disabled
- Video download still works

### 7.7.5 Accessibility

- **Video Player:** Native HTML5 controls (accessible by default)
- **Keyboard Navigation:**
  - Tab to video player controls
  - Tab to download buttons
  - Tab to action buttons
- **ARIA Labels:**
  - Download Video: `aria-label="Download video file, 45 megabytes"`
  - Download Thumbnail: `aria-label="Download thumbnail image"`
  - Video Player: `aria-label="Final video preview, duration 2 minutes 34 seconds"`
- **Screen Reader Announcements:**
  - On page load: "Your video is ready. Press Tab to navigate to download options."
  - On download: "Video download started"
- **Focus:** Auto-focus on "Download Video" button on page load
- **Alt Text:** Thumbnail image: `alt="{video-title} thumbnail, 1920 by 1080 pixels"`

### 7.7.6 Responsive Design

**Desktop (1024px+):**
- Two-column layout (Video + Thumbnail sidebar)
- Video player 66% width
- Metadata in single row

**Tablet (768-1023px):**
- Single column layout
- Video player full width
- Thumbnail below video (smaller, 50% width, centered)
- Metadata in two rows

**Mobile (<768px):**
- Single column, stacked layout
- Video player full width
- Thumbnail full width below
- Metadata stacked vertically
- Buttons full width, stacked

---
