# 2. Application Architecture & Layout

### 2.1 Overall Application Structure

**Layout Pattern:** Sidebar + Main Content Area (persistent across all workflows)

```
┌─────────────────────────────────────────┐
│  [Logo]  AI Video Generator             │  Top Bar (if needed)
├──────────┬──────────────────────────────┤
│          │                              │
│  Project │                              │
│  Sidebar │     Main Content Area        │
│          │   (Chat / Curation / etc.)   │
│  [+New]  │                              │
│          │                              │
│  Project │                              │
│  List    │                              │
│          │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

**Layout Specifications:**
- **Sidebar Width:** 280px (fixed on desktop)
- **Main Content Area:** Flexible, max-width 1400px
- **Sidebar Background:** `#1e293b` (Slate 800)
- **Main Area Background:** `#0f172a` (Slate 900)
- **Border Between:** 1px solid `#334155` (Slate 700)

**Responsive Behavior:**
- **Desktop (1024px+):** Sidebar always visible (280px fixed width)
- **Tablet (768-1023px):** Sidebar collapsible with hamburger menu
- **Mobile (<768px):** Sidebar hidden by default, accessible via overlay

### 2.2 Navigation Patterns

**Primary Navigation:** Project switching via sidebar
**Secondary Navigation:** Workflow progression (Chat → Voice Selection → Curation → Assembly)
**Tertiary Navigation:** Within-workflow actions (scene navigation in curation)

**URL Structure:**
- `/` - Redirects to most recent project or new chat
- `/projects/:projectId` - Chat interface for specific project
- `/projects/:projectId/curation` - Visual curation for specific project
- `/projects/:projectId/assembly` - Video assembly progress

**Navigation Rules:**
- Clicking project in sidebar loads its current workflow step
- Browser back/forward work naturally with URL routing
- Active project visually highlighted in sidebar
- Current workflow step indicated in main content area

---
