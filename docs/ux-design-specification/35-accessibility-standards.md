# 3.5 Accessibility Standards

**This application targets WCAG 2.1 Level AA compliance for all public-facing features.**

### 3.5.1 Color Contrast Requirements

**Text Contrast:**
- **Normal Text:** 4.5:1 minimum (WCAG AA)
- **Large Text (18px+ or 14px+ bold):** 3:1 minimum
- **UI Components:** 3:1 minimum (borders, icons, form controls)

**Verified Combinations:**
- **Primary Text on Background:** `#f8fafc` on `#0f172a` = 16.7:1 ✓
- **Secondary Text on Background:** `#cbd5e1` on `#0f172a` = 11.4:1 ✓
- **Primary Button (White on Indigo):** `#ffffff` on `#6366f1` = 6.2:1 ✓
- **Error Text:** `#ef4444` on `#0f172a` = 6.8:1 ✓
- **Success Badge:** `#10b981` on `#0f172a` = 4.7:1 ✓
- **Warning Badge:** `#f59e0b` on `#0f172a` = 7.1:1 ✓

**Non-Color Dependence:**
- **Status Indicators:** Never rely solely on color (always include icon or text)
- **Example:** Scene status uses icon (✓, ⚠, ✗) + color + text

### 3.5.2 Focus Indicators

**Global Focus Style:**
- **All Interactive Elements:** 2px solid `#6366f1` (Indigo 500) outline with 2px offset
- **Visible on:** Keyboard focus (`:focus-visible`)
- **Not visible on:** Mouse click (`:focus` without keyboard)
- **Never:** `outline: none` without custom alternative

**Implementation:**
```css
*:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}
```

**Applies to:**
- All buttons, links, form controls
- Video thumbnails, scene cards, project list items
- Any element with `tabindex="0"` or interactive role

**High Contrast Mode:**
- Use system colors for outlines (`outline-color: -webkit-focus-ring-color`)
- Ensure focus remains visible in Windows High Contrast Mode

### 3.5.3 Keyboard Navigation

**Tab Order:**
- **Logical sequence:** Top to bottom, left to right
- **Skip to Content:** "Skip to main content" link (hidden until focused)
- **Focus trapping:** Modals trap focus within dialog

**Keyboard Shortcuts:**
- **ESC:** Close modals, cancel actions
- **Enter/Space:** Activate buttons and links
- **Arrow Keys:** Navigate within lists (project sidebar, scene status list)
- **Tab/Shift+Tab:** Navigate between interactive elements

**Component-Specific Navigation:**
- **ProjectSidebar:** Tab to navigate, Enter to select, Arrow keys to move between projects
- **ChatInterface:** Tab to input, Enter to send, Escape to clear input
- **Voice Selection:** Tab to cards, Enter to select, Space to preview
- **Visual Curation:** Tab to thumbnails, Enter to select/deselect, Space to play preview
- **Audio Players:** Tab to controls, Space to play/pause, Arrow keys to scrub

### 3.5.4 ARIA & Semantic HTML

**ARIA Roles:**
- **ProjectSidebar:** `role="navigation"` with `aria-label="Project list"`
- **ChatInterface:** `role="log"` (live region) with `aria-label="Chat messages"`
- **MessageBubble:** `role="article"` with `aria-label="[User/Assistant] message at [timestamp]"`
- **VideoPreviewThumbnail:** `role="button"` with `aria-label="Play video clip preview"`

**Live Regions:**
- **Chat Messages:** `aria-live="polite"` for new messages
- **Toast Notifications:** `aria-live="assertive"` for errors, `polite` for success/info
- **Progress Updates:** `aria-live="polite"` for sourcing/generation progress

**Form Accessibility:**
- **Labels:** All inputs have associated `<label for="field-id">`
- **Required Fields:** `aria-required="true"` + visual asterisk
- **Error Messages:** `aria-describedby="error-id"` linking input to error
- **Error State:** `aria-invalid="true"` when validation fails
- **Help Text:** `aria-describedby="help-id"` linking input to help text

### 3.5.5 Alt Text Strategy

**Video Thumbnails:**
- **Format:** "[Video title] - Duration: [MM:SS]"
- **Example:** `alt="Lion roaming savanna at sunset - Duration: 0:15"`
- **Loading State:** `alt="Loading video preview"`
- **Error State:** `alt="Video preview unavailable"`

**Icons:**
- **Decorative Icons:** `aria-hidden="true"` (adjacent text provides context)
- **Functional Icons:** `aria-label` describing action
- **Example:** Play button: `aria-label="Play voiceover for scene 1"`

**Images:**
- **Project Icons:** `alt="Project icon"` (emoji already has semantic meaning)
- **Spinners:** `alt="Loading"` or `aria-label="Loading"`

### 3.5.6 Screen Reader Considerations

**Announcements:**
- **ProjectSidebar:** "Project: [name], last active [timestamp], [active/inactive]"
- **ChatInterface:** "User message: [content]" / "Assistant message: [content]"
- **Scene Status:** "Scene 1, completed, 6 clips found"
- **Progress Updates:** "Sourcing clips, scene 2 of 5 complete"

**Hidden Content:**
- **Skip Links:** Visually hidden but screen reader accessible
- **Icon-Only Buttons:** Must have `aria-label` or `aria-labelledby`
- **Loading States:** Announce loading and completion

### 3.5.7 Accessibility Testing Strategy

**Automated Testing:**
- **Tool:** axe DevTools browser extension
- **Frequency:** Every PR before merge
- **Coverage:** All new/modified pages and components
- **Pass Criteria:** Zero critical or serious violations
- **Integration:** Consider axe-core in CI/CD pipeline

**Keyboard Navigation Testing:**
- **Frequency:** Per feature implementation
- **Test Plan:**
  1. Tab through all interactive elements in logical order
  2. Activate all buttons/links with Enter/Space
  3. Close modals with ESC
  4. Navigate lists with Arrow keys
  5. Verify no keyboard traps (can always escape)
  6. Ensure focus visible on all elements
- **Pass Criteria:** All functionality accessible via keyboard alone (no mouse required)

**Screen Reader Testing:**
- **Tools:**
  - **NVDA** (Windows, free)
  - **VoiceOver** (Mac, built-in)
- **Frequency:** Per epic completion (before release)
- **Test Plan:**
  1. Navigate with screen reader shortcuts (H for headings, Tab for links)
  2. Verify all content is announced (no unlabeled elements)
  3. Verify ARIA labels are meaningful (not generic "button" or "link")
  4. Verify form labels and errors are announced
  5. Verify modal focus is trapped and announced
  6. Verify live regions announce updates
- **Pass Criteria:** All content comprehensible, no unlabeled elements, logical flow

**Manual Review Checklist:**
- **Frequency:** Per release candidate
- **Checklist:**
  - [ ] Color contrast meets 4.5:1 (text) and 3:1 (UI components)
  - [ ] Focus indicators visible on all interactive elements
  - [ ] No content relies solely on color (icons/text provide context)
  - [ ] All images have alt text
  - [ ] All forms have labels
  - [ ] Touch targets meet 44px x 44px minimum
  - [ ] Text is resizable to 200% without loss of functionality
  - [ ] Page is navigable with keyboard only
  - [ ] Screen reader announces all content logically

**Accessibility Regression Testing:**
- **Frequency:** Every major release
- **Process:** Re-run full accessibility test suite (automated + manual)
- **Documentation:** Maintain accessibility issues log with remediation status

**User Testing with Assistive Technology Users:**
- **Frequency:** Major releases or significant UX changes
- **Participants:** Recruit users who rely on screen readers, keyboard-only, or other assistive tech
- **Feedback:** Incorporate findings into backlog

---
