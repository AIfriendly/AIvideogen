# 3. Visual Foundation

### 3.1 Color System

**Theme Direction: Professional Creator Workspace**

**Primary Palette:**
- **Primary:** `#6366f1` (Indigo 500) - Actions, selected states, CTAs
  - Usage: "Assemble Video" button, selected clips, active project, primary actions
- **Secondary:** `#8b5cf6` (Violet 500) - Accent, hover states
  - Usage: Hover effects, secondary actions, highlights
- **Success:** `#10b981` (Emerald 500) - Completed scenes, success states
  - Usage: Completed scenes, success toasts, checkmarks
- **Warning:** `#f59e0b` (Amber 500) - Incomplete selections, warnings
  - Usage: Pending states, warning notifications
- **Error:** `#ef4444` (Red 500) - Errors, destructive actions
  - Usage: Error states, delete actions, error toasts

**Neutral Palette (Dark Mode Optimized):**
- **Background:** `#0f172a` (Slate 900) - Main background, main content area
- **Surface:** `#1e293b` (Slate 800) - Cards, elevated surfaces, sidebar background
- **Surface Elevated:** `#334155` (Slate 700) - Hover states, borders, dividers
- **Text Primary:** `#f8fafc` (Slate 50) - Main text, headings
- **Text Secondary:** `#cbd5e1` (Slate 300) - Supporting text, captions
- **Text Tertiary:** `#94a3b8` (Slate 400) - Placeholder text, disabled states

**Rationale:**
- Dark interface reduces eye strain during extended creative sessions
- High contrast ensures video thumbnails and text stand out
- Indigo/violet conveys creativity + professionalism
- Inspired by video editing tools (Premiere, DaVinci) and ChatGPT's interface
- Dark theme aligns with content creator workflow (often working in low-light)

### 3.2 Typography System

**Font Families:**
- **Headings:** Inter (weight: 600-700) - Clean, modern, professional
- **Body:** Inter (weight: 400-500) - Excellent readability
- **Monospace:** JetBrains Mono (for technical info if needed, rarely used)

**Type Scale:**
- **h1:** 2.25rem (36px) - Main page title (rarely used)
- **h2:** 1.5rem (24px) - Section headers ("Select Your Clips")
- **h3:** 1.25rem (20px) - Scene headers, project names
- **Body:** 1rem (16px) - Chat messages, script text, UI labels
- **Small:** 0.875rem (14px) - Captions, timestamps, secondary info
- **Tiny:** 0.75rem (12px) - Badges, metadata

**Line Heights:**
- Headings: 1.2 (tight, more impact)
- Body: 1.6 (comfortable reading)
- Chat messages: 1.5 (balanced for conversation flow)

### 3.3 Spacing & Layout

**Base unit:** 4px (Tailwind's default spacing scale)

**Spacing scale:**
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px

**Layout:**
- **Max content width:** 1400px (main content area for curation)
- **Max chat width:** 800px (centered for optimal reading)
- **Sidebar width:** 280px (fixed on desktop)
- **Grid system:** CSS Grid for scene cards, Flexbox for component layouts
- **Responsive:** Tailwind's responsive utilities

### 3.4 Touch Targets & Responsive Design

**Touch Target Policy:**
- **Minimum Size:** 44px x 44px (WCAG 2.2 Level AAA)
- **Applies to:** All buttons, links, form controls, interactive elements
- **Implementation:** Padding can extend beyond visual boundary to meet minimum
- **Exception:** Inline text links (use increased line-height/padding)

**Critical Touch Targets:**
- **Audio Player Button:** 44px x 44px (increased from 36px)
- **Close Buttons (X):** 44px x 44px
- **Play/Preview Buttons:** 44px x 44px minimum
- **Scene Status Badges:** If interactive, 44px height minimum
- **Project List Items:** 72px height minimum

**Responsive Breakpoints:**
- **Desktop:** 1024px+ (full sidebar, 3-column grids)
- **Tablet:** 768-1023px (collapsible sidebar, 2-column grids)
- **Mobile:** <768px (overlay sidebar, 1-column grids)

**Responsive Grid Adaptation Table:**

| Component | Desktop (1024px+) | Tablet (768-1023px) | Mobile (<768px) |
|-----------|-------------------|---------------------|-----------------|
| **Sidebar** | 280px fixed, always visible | Collapsible, hamburger toggle | Overlay (full-screen modal) |
| **Voice Selection Cards** | 3 columns, ~320px each | 2 columns, ~340px each | 1 column, full width |
| **Visual Curation Clip Grid** | 3 columns, 200px thumbnails | 2 columns, 220px thumbnails | 1 column, full width thumbnails |
| **Scene Cards** | Full width, inline clip grid | Full width, 2-col clip grid | Stacked, 1-col clip grid |
| **Export Layout** | 2fr/1fr (Video 66%, Thumbnail 33%) | Single column, video full width | Single column, all stacked |
| **Chat Interface** | Max 800px, centered | Max 800px, centered | Full width with 16px padding |
| **Progress Tracker** | Inline with header, 200px bar | Below header, full width | Below header, full width |
| **Assembly Progress List** | Max 600px, centered | Max 600px, centered | Full width with 16px padding |
| **Metadata Card** | Single row, flex wrap | Two rows | Vertical stack |
| **Action Buttons** | Inline row, space-between | Inline row | Stacked, full width each |

**Grid Gap Adjustments:**
- **Desktop:** 24px (lg) gaps between grid items
- **Tablet:** 16px (md) gaps between grid items
- **Mobile:** 12px (sm) gaps between grid items

**Container Width Behavior:**
- **Desktop:** Max-width containers (1400px curation, 800px chat, 600px modals)
- **Tablet:** Max-width preserved but with reduced padding (24px → 16px)
- **Mobile:** Full width with 16px side padding, no max-width constraints

---
