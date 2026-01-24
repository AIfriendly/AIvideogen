# 7.6. Video Assembly Progress UI (Epic 5, Stories 5.1-5.4)

### 7.6.1 Overview

**Purpose:** Provide detailed progress feedback during video assembly process, keeping users informed while their video is being created.

**User Value:** Transparency builds trust - creators see exactly what's happening with their video at each stage. Detailed progress reduces anxiety and sets accurate expectations for completion time.

**Key Features:**
- Scene-by-scene progress tracking
- Detailed stage messages for each processing phase
- Overall progress bar with percentage
- Estimated time remaining
- Error handling with retry mechanism
- Auto-navigation to Export page on completion

### 7.6.2 Visual Design

**Video Assembly Progress Screen:**

```
┌─────────────────────────────────────┐
│                                     │
│     Assembling Your Video           │  <- Main header
│                                     │
│     ━━━━━━━━━━━━━━━━━━━━━ 67%       │  <- Overall progress bar
│     Estimated: 1:23 remaining       │  <- ETA
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Scene 1         ✓ Complete  │   │  <- Scene progress cards
│  │ Scene 2         ✓ Complete  │   │
│  │ Scene 3         ⏳ Processing│   │  <- Current scene
│  │   └── Overlaying audio...   │   │  <- Stage detail
│  │ Scene 4         ○ Pending   │   │
│  │ Scene 5         ○ Pending   │   │
│  └─────────────────────────────┘   │
│                                     │
│     Generating thumbnail...         │  <- Final stage
│                                     │
└─────────────────────────────────────┘
```

**Assembly Progress Container:**
- **Position:** Full-screen modal overlay OR dedicated page at `/projects/:id/assembly`
- **Background:** `#0f172a` (Slate 900)
- **Display:** Flex, center aligned
- **Max Width:** 600px (centered)
- **Padding:** 48px

**Main Header:**
- **Text:** "Assembling Your Video"
- **Font Size:** 1.5rem (24px)
- **Font Weight:** 600 (semi-bold)
- **Color:** `#f8fafc` (Slate 50)
- **Margin Bottom:** 24px (lg)
- **Text Align:** Center

**Overall Progress Bar:**
- **Width:** 100%
- **Height:** 8px
- **Background:** `#334155` (Slate 700)
- **Border Radius:** 4px
- **Fill:** Linear gradient (`#6366f1` → `#8b5cf6`)
- **Animation:** Smooth width transition (0.3s ease)

**Percentage Display:**
- **Position:** Right of progress bar
- **Font Size:** 1.125rem (18px)
- **Font Weight:** 600
- **Color:** `#6366f1` (Indigo 500)
- **Format:** "67%"

**Estimated Time Remaining:**
- **Font Size:** 0.875rem (14px)
- **Color:** `#94a3b8` (Slate 400)
- **Margin Top:** 8px
- **Format:** "Estimated: 1:23 remaining" or "Less than a minute remaining"
- **Icon:** Clock icon (⏱) optional

**Scene Progress List:**
- **Background:** `#1e293b` (Slate 800)
- **Border:** 1px solid `#334155` (Slate 700)
- **Border Radius:** 12px
- **Padding:** 16px
- **Margin:** 24px 0
- **Max Height:** 300px (scrollable if many scenes)

**Scene Progress Item:**
- **Display:** Flex row, space-between
- **Padding:** 12px 0
- **Border Bottom:** 1px solid `#334155` (Slate 700) - except last

**Scene Progress Item Content:**
- **Left:** Scene name ("Scene 1", "Scene 2", etc.)
  - Font Size: 0.875rem (14px)
  - Color: `#f8fafc` (Slate 50)
- **Right:** Status indicator

**Status Indicators:**

**✓ Complete:**
- **Icon:** Green checkmark (✓)
- **Color:** `#10b981` (Emerald 500)
- **Text:** "Complete"

**⏳ Processing:**
- **Icon:** Spinning loader or hourglass
- **Color:** `#6366f1` (Indigo 500)
- **Text:** "Processing"
- **Animation:** Spinner rotation

**○ Pending:**
- **Icon:** Empty circle (○)
- **Color:** `#94a3b8` (Slate 400)
- **Text:** "Pending"

**Stage Detail (for current scene):**
- **Display:** Indented below scene name
- **Font Size:** 0.75rem (12px)
- **Color:** `#cbd5e1` (Slate 300)
- **Icon:** └── arrow indicator
- **Text:** Current operation ("Trimming video...", "Overlaying audio...", etc.)
- **Animation:** Subtle pulse or dots animation

**Stage Messages (Cycle for each scene):**
1. "Downloading clip..." (if needed)
2. "Trimming to voiceover duration..."
3. "Overlaying audio..."
4. "Encoding scene..."

**Final Stages (after all scenes):**
1. "Concatenating scenes..."
2. "Rendering final video..."
3. "Generating thumbnail..."
4. "Finalizing..."

**Thumbnail Generation Indicator:**
- **Position:** Below scene list
- **Text:** "Generating thumbnail..."
- **Font Size:** 0.875rem (14px)
- **Color:** `#cbd5e1` (Slate 300)
- **Icon:** Image icon (🖼) or spinner
- **Visibility:** Only shown during thumbnail generation phase

### 7.6.3 Interaction Patterns

**Assembly Progress Flow:**
1. User clicks "Assemble Video" from Visual Curation (Section 7.5)
2. System navigates to Assembly Progress page
3. Overall progress bar starts at 0%
4. Each scene processes sequentially:
   a. Scene status changes from Pending → Processing
   b. Stage detail shows current operation
   c. Scene completes → status changes to Complete (✓)
   d. Progress bar updates (e.g., 20% per scene for 5 scenes)
5. After all scenes: "Concatenating scenes..." → "Generating thumbnail..."
6. Progress reaches 100%
7. Brief success animation (optional: checkmark, confetti)
8. Auto-navigate to Export Page (Section 7.7) after 1 second delay

**No User Interaction (Read-Only):**
- Assembly screen is informational only
- No cancel button (process is automatic and cannot be interrupted safely)
- User can navigate away (assembly continues in background)
- Return shows current progress state

**ETA Calculation:**
- Initial estimate based on scene count and average processing time
- Updates dynamically as scenes complete (learns actual pace)
- Minimum display: "Less than a minute remaining"

### 7.6.4 States

**Processing (Normal):**
- Progress bar advancing
- Scenes completing sequentially
- ETA updating
- Stage messages cycling

**Processing (Final Stage):**
- All scenes complete (✓)
- "Concatenating scenes..." or "Generating thumbnail..."
- Progress bar at 80-99%
- ETA: "Almost done..."

**Success (Completion):**
- Progress bar at 100%
- All scenes show ✓ Complete
- Success message: "Your video is ready!"
- Checkmark animation (green, centered)
- Auto-navigate to Export Page after 1 second

**Error States (Comprehensive):**

**Scenario 1: FFmpeg Encoding Failure (Single Scene)**
- **Trigger:** FFmpeg fails to process a specific scene (codec issue, corrupt file)
- **Progress Bar:** Stops at current percentage
- **Failed Scene Status:** Red error icon (✗), "Encoding failed"
- **Other Scenes:** Completed scenes remain ✓, pending scenes remain ○
- **Main Message:** "Assembly Error: Scene {N} Failed"
- **Error Detail:** "FFmpeg couldn't process Scene {N}. The video clip may be corrupted."
- **Recovery Options:**
  - **"Retry Scene"** (Primary button): Re-attempts only the failed scene
  - **"Skip Scene"** (Secondary button): Continues assembly without this scene
  - **"Change Clip"** (Ghost button): Returns to Visual Curation to select different clip
- **Toast Notification:** Error toast with "Scene {N} encoding failed" (persistent until dismissed)

**Scenario 2: FFmpeg Concatenation Failure**
- **Trigger:** FFmpeg fails during final video concatenation (incompatible formats, disk space)
- **Progress Bar:** Stops at ~85-95%
- **All Scenes:** Show ✓ Complete (individual scenes succeeded)
- **Main Message:** "Assembly Error: Final Video Creation Failed"
- **Error Detail:** "Couldn't combine scenes into final video. This may be due to disk space or format incompatibility."
- **Recovery Options:**
  - **"Retry Assembly"** (Primary button): Re-attempts concatenation only (not scene encoding)
  - **"Back to Visual Curation"** (Ghost button): Return to re-select clips
- **Technical Detail:** Show expandable "Technical Details" with FFmpeg error output (for advanced users)

**Scenario 3: Disk Space Error**
- **Trigger:** Insufficient disk space during assembly
- **Progress Bar:** Stops at failure point
- **Main Message:** "Assembly Error: Insufficient Storage"
- **Error Detail:** "Not enough disk space to complete video assembly. Free up at least 500MB and try again."
- **Icon:** Storage/disk icon (orange warning)
- **Recovery Options:**
  - **"Check Storage"** (Primary button): Opens system storage info (if possible) or provides guidance
  - **"Retry Assembly"** (Secondary button): Re-attempts after user frees space
- **No "Skip" Option:** Storage issue affects entire process

**Scenario 4: Voiceover File Missing**
- **Trigger:** Voiceover audio file not found for a scene during assembly
- **Progress Bar:** Stops when reaching affected scene
- **Failed Scene Status:** Orange warning icon (⚠), "Audio missing"
- **Main Message:** "Assembly Error: Missing Audio"
- **Error Detail:** "Voiceover file for Scene {N} is missing. Regenerate voiceovers or return to script preview."
- **Recovery Options:**
  - **"Regenerate Voiceovers"** (Primary button): Navigate to Epic 2 voiceover generation
  - **"Skip Scene"** (Secondary button): Continues without this scene
  - **"Back to Script Preview"** (Ghost button): Return to review/regenerate

**Scenario 5: Video Clip File Missing or Corrupt**
- **Trigger:** Selected video clip file not found or corrupted
- **Progress Bar:** Stops when reaching affected scene
- **Failed Scene Status:** Red error icon (✗), "Video clip unavailable"
- **Main Message:** "Assembly Error: Missing Video Clip"
- **Error Detail:** "The selected clip for Scene {N} couldn't be loaded. Re-download or select a different clip."
- **Recovery Options:**
  - **"Re-download Clip"** (Primary button): Re-triggers download for this clip
  - **"Change Clip"** (Secondary button): Navigate to Visual Curation for this scene
  - **"Skip Scene"** (Ghost button): Continues without this scene

**Scenario 6: Partial Failure (Multiple Scenes)**
- **Trigger:** Some scenes fail while others succeed
- **Progress Bar:** Shows partial completion (e.g., 60% if 3/5 scenes succeeded)
- **Scene Status:** Mix of ✓ Complete, ✗ Failed
- **Main Message:** "Assembly Partially Complete"
- **Error Detail:** "{X} of {N} scenes assembled successfully. {Y} scenes failed."
- **Recovery Options:**
  - **"Retry Failed Scenes"** (Primary button): Re-attempts only failed scenes
  - **"Continue with Partial Video"** (Secondary button): Creates video with only successful scenes
  - **"Back to Visual Curation"** (Ghost button): Return to fix problematic clips

**Scenario 7: Thumbnail Generation Failure**
- **Trigger:** FFmpeg fails to generate thumbnail after video assembly succeeds
- **Progress Bar:** 100% complete
- **All Scenes:** ✓ Complete
- **Main Message:** "Video Ready! (Thumbnail Failed)"
- **Error Detail:** "Your video was created successfully, but thumbnail generation failed. You can download the video or retry thumbnail."
- **Recovery Options:**
  - **"Download Video Anyway"** (Primary button): Navigate to Export page without thumbnail
  - **"Retry Thumbnail"** (Secondary button): Re-attempts thumbnail extraction
- **Note:** Non-blocking error - user can proceed to download video

**Scenario 8: Server/API Error**
- **Trigger:** Backend API returns 500 error or assembly service unavailable
- **Progress Bar:** Stops at current position
- **Main Message:** "Server Error"
- **Error Detail:** "Our servers encountered an issue. Your progress is saved. Please try again in a few minutes."
- **Recovery Options:**
  - **"Retry Assembly"** (Primary button): Re-attempts from where it stopped
  - **"Contact Support"** (Link): Opens support/help page
- **Auto-Retry:** System attempts automatic retry after 30 seconds (up to 3 attempts)
- **Progress Preservation:** Completed scenes are saved, assembly resumes from failure point

**Network/Connection Error:**
- **Trigger:** Network disconnection during assembly
- **Progress Bar:** Pauses at current position (grayed out)
- **Main Message:** "Connection Lost"
- **Error Detail:** "Assembly paused. Will resume automatically when connection is restored."
- **Icon:** Wi-Fi disconnect icon (orange)
- **Behavior:**
  - Spinner shows "Reconnecting..." animation
  - Optimistic retry every 5 seconds
  - Auto-resumes when connection restored
  - After 60 seconds: Show "Retry Connection" button
- **Recovery Options:**
  - **"Retry Now"** (Primary button): Manually trigger reconnection attempt
  - **"Download Later"** (Ghost button): Save progress and exit (can resume from project page)

**Error State Visual Design:**

**Error Container:**
- **Background:** `#1e293b` (Slate 800) with red-tinted border (`#ef4444` 20% opacity)
- **Border:** 1px solid `#ef4444` (Red 500)
- **Border Radius:** 12px
- **Padding:** 24px
- **Margin:** 16px 0

**Error Icon:**
- **Size:** 48px
- **Color:** `#ef4444` (Red 500) for errors, `#f59e0b` (Amber 500) for warnings
- **Position:** Centered above error message

**Error Message:**
- **Main Message:** 1.25rem (20px), `#f8fafc` (Slate 50), font-weight 600
- **Error Detail:** 0.875rem (14px), `#cbd5e1` (Slate 300), font-weight 400
- **Technical Detail:** 0.75rem (12px), `#94a3b8` (Slate 400), monospace font, collapsible

**Error Buttons:**
- **Layout:** Flex row, center-aligned, 12px gap
- **Primary:** Indigo 500 background (same as normal primary)
- **Secondary:** Transparent with Indigo border
- **Ghost:** Transparent, Slate 300 text

### 7.6.5 Accessibility

- **ARIA Live Region:** `aria-live="polite"` for progress updates
- **Screen Reader Announcements:**
  - "Assembling video, 20% complete, Scene 1 finished"
  - "Scene 3 processing, trimming video"
  - "Video assembly complete, navigating to download page"
- **Progress Bar:** `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- **Focus Management:** Focus on error message/retry button if error occurs

---
