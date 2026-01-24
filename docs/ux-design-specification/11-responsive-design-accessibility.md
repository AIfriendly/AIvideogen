# 11. Responsive Design & Accessibility

### 11.1 Responsive Strategy

**Target Devices:** Desktop-first (primary), Tablet (secondary support), Mobile (limited)

**Breakpoints:**
- **Desktop:** 1024px+ → Full layout (280px sidebar + main content)
- **Tablet:** 768px-1023px → Collapsible sidebar, 2-column clip grid
- **Mobile:** <768px → Overlay sidebar, 1-column clip grid (basic support)

**Adaptation Patterns:**

**Sidebar:**
- Desktop: Always visible, 280px fixed width
- Tablet: Collapsible with hamburger button, slides in/out
- Mobile: Hidden by default, full-screen overlay when opened

**Chat Interface:**
- Desktop: 800px max width, centered
- Tablet: 700px max width, padding reduced
- Mobile: Full width, padding minimal, input area smaller

**Clip Grid (Curation):**
- Desktop: 3 columns (optimal for thumbnail size)
- Tablet: 2 columns (still allows comparison)
- Mobile: 1 column (stacked, full width)

**Scene Cards:**
- All sizes: Full width, stacked vertically

**Navigation:**
- Desktop: Sidebar always visible
- Tablet: Hamburger menu in top-left corner
- Mobile: Hamburger menu + "Back" button in header

**Video Preview:**
- Desktop: Inline playback within thumbnail grid
- Tablet: Lightbox/modal playback (less space for inline)
- Mobile: Full-screen playback (tap to play)

**Touch Targets:**
- Minimum 44x44px for all interactive elements (buttons, thumbnails, project items)
- Increased spacing between interactive elements on touch devices
- Larger input fields on mobile (16px font to prevent zoom)

### 11.2 Accessibility Strategy

**Compliance Target:** WCAG 2.1 Level AA

**Key Requirements:**

**Color Contrast:**
- Text on background: 4.5:1 minimum
  - `#f8fafc` (Slate 50) on `#0f172a` (Slate 900) = 16:1 ✓
  - `#cbd5e1` (Slate 300) on `#1e293b` (Slate 800) = 7:1 ✓
- UI components: 3:1 minimum
  - Indigo 500 button on Slate 900 = 4.5:1 ✓
  - Border colors meet requirements ✓

**Keyboard Navigation:**
- All interactive elements accessible via Tab key
- Enter or Space activates buttons, selects clips, sends messages
- Arrow keys navigate within component groups (project list, clip grid)
- ESC closes modals, cancels actions
- No keyboard traps (can always navigate away)

**Focus Indicators:**
- 2px solid ring in Indigo 500 (`#6366f1`)
- Visible on all interactive elements when focused
- Contrasts with both light and dark backgrounds
- Never hidden or removed with CSS

**ARIA Labels & Roles:**
- Meaningful labels for screen readers on all interactive elements
- ARIA roles: `navigation` (sidebar), `log` (chat), `button` (actions), `article` (scenes), `progressbar`
- ARIA attributes: `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-valuenow` (progress)
- Live regions: Chat message list announces new messages

**Alt Text & Descriptions:**
- Video thumbnails: Descriptive alt text (e.g., "City sunrise time-lapse, 15 seconds")
- Icons: ARIA labels (e.g., Play icon = "Play video preview")
- Project icons: ARIA labels (e.g., "🎬" = "Video project")

**Form Labels:**
- All inputs have visible or ARIA labels
- Message input: "Type your message"
- Topic confirmation input: "Video topic"
- Error messages associated with fields via `aria-describedby`

**Error Identification:**
- Clear error messages with recovery actions
- Error toasts describe problem and suggest fix
- Form errors shown inline with red border + message below
- Screen readers announce errors immediately (ARIA live region)

**Testing Strategy:**
- **Automated:** Lighthouse accessibility audit (target 95+ score), axe DevTools
- **Manual:** Keyboard-only navigation testing, tab order verification
- **Screen Reader:** NVDA (Windows) / JAWS testing with real users
- **Color Blindness:** Contrast checker, never rely on color alone
- **Zoom:** Test at 200% zoom (WCAG requirement)

---
