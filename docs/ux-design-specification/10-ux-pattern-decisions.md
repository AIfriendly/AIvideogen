# 10. UX Pattern Decisions

### 10.1 Consistency Rules

**BUTTON HIERARCHY:**
- **Primary Action:** "Assemble Video", "Send" (message), "Confirm" - Indigo 500 fill, white text, prominent
- **Secondary Action:** "Preview Selection", "New Chat" - Outline style, indigo border, indigo text
- **Tertiary Action:** "Reset Scene", "Edit" - Ghost/text button, subtle, gray text
- **Destructive Action:** "Delete", "Cancel" - Red outline or text, confirmation required

**FEEDBACK PATTERNS:**
- **Success:** Toast notification, top-right, green (#10b981), 4s duration - "Clip selected!", "Message sent!"
- **Error:** Toast notification, top-right, red (#ef4444), persistent until dismissed - "Failed to load. Retry?"
- **Warning:** Toast notification, amber (#f59e0b), 6s duration - "Remember to select clips for all scenes"
- **Info:** Toast notification, blue (Indigo 500), 5s duration - "Tip: Hover clips to preview"
- **Loading:** Skeleton loaders for content, spinner for actions, typing indicator for AI responses

**SELECTION PATTERNS:**
- **Single Selection:** Radio button behavior (clips in scene, projects in sidebar)
- **Multi-Selection:** Checkbox behavior (none currently in MVP)
- **Visual Feedback:** Border highlight + checkmark instantly on selection
- **No Confirmation:** Selection actions are immediate and easily reversible

**MODAL PATTERNS:**
- **Confirmation Dialog:** Medium size (400px), centered, semi-transparent backdrop
  - Dismiss: Click outside, ESC, or Cancel button
  - Focus: Auto-focus on primary action button
  - Example: "Assemble Video" confirmation, "Delete Project" confirmation
- **Video Lightbox:** Large/full-screen, for expanded clip preview
  - Dismiss: Click outside, ESC, or close button (×)
  - Controls: Play/pause, volume, scrub bar
- **Stacking:** Only one modal at a time (no modal on top of modal)

**NAVIGATION PATTERNS:**
- **Active State:** Indigo left border (3px) for active project in sidebar, indigo border for selected clips
- **Hover State:** Background color change (Slate 700) for sidebar items, border color for clips
- **Focus State:** 2px solid ring (Indigo 500) for keyboard navigation
- **Breadcrumbs:** Not needed (workflow is linear, use browser back)
- **Deep Linking:** URLs include project ID for resuming (`/projects/:id`)

**EMPTY STATE PATTERNS:**
- **No Projects:** "Start your first video project!" + prominent "New Chat" button
- **New Chat:** AI welcome message auto-generated as first assistant message
- **First Scene:** "Let's curate your video! Select clips for each scene below."
- **No Clips Available:** "No clips found. Try manual search." (future feature)

**CONFIRMATION PATTERNS:**
- **Irreversible Actions:** Always confirm (Delete project, Assemble video)
- **Reversible Actions:** No confirmation (Change clip selection, switch projects)
- **Leave Page:** Browser warning if unsaved work exists (future: selections not yet assembled)

**NOTIFICATION PATTERNS:**
- **Placement:** Top-right corner, stacked vertically
- **Duration:** Success/Info (3-5s auto-dismiss), Warning (6s), Error (manual dismiss only)
- **Stacking:** Max 3 visible, oldest fade out first
- **Priority:** Errors above warnings above success (visual stacking order)
- **Animation:** Slide in from right, fade out on dismiss

**LOADING PATTERNS:**
- **Skeleton Loaders:** For content loading (project list, scene cards, thumbnails)
- **Spinners:** For actions (sending message, assembling video)
- **Progress Bars:** For long operations (video assembly, script generation)
- **Typing Indicator:** For AI responses (three animated dots in assistant bubble)

---
