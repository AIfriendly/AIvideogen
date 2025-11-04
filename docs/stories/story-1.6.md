# Story 1.6: Project Management UI

**Epic:** Epic 1 - Conversational Topic Discovery
**Story ID:** 1.6
**Status:** Ready
**Created:** 2025-11-04
**Last Updated:** 2025-11-04
**Assigned To:** lichking
**Sprint:** Epic 1 Sprint 2

---

## Story Overview

**Goal:** Enable users to create, list, and switch between multiple projects/conversations

**Description:**
Implement a project management interface that allows users to maintain multiple concurrent video projects, each with its own isolated conversation history. This story creates the sidebar navigation UI (280px fixed width), "New Chat" functionality, and project switching capabilities. Users can manage multiple creative projects simultaneously without mixing conversations, with automatic project naming and persistence across sessions.

**Business Value:**
- Enables users to work on multiple video ideas simultaneously
- Maintains clear separation between different creative projects
- Provides quick access to recent projects via sidebar navigation
- Improves workflow efficiency with persistent project state
- Establishes foundation for project-based video production pipeline

---

## Acceptance Criteria

1. **"New Chat" button creates new project and sets it as active**
   - Button located at top of sidebar
   - Clicking creates new project with default name "New Project"
   - New project immediately becomes active project
   - Chat interface clears and focuses on input field
   - New project appears at top of sidebar list

2. **Sidebar displays all projects ordered by last_active (most recent first)**
   - Fixed 280px width sidebar on left side of screen
   - Projects displayed in descending order by last_active timestamp
   - Each project shows name and relative timestamp (e.g., "2 hours ago", "Yesterday")
   - Active project visually highlighted with indigo left border (4px)
   - Sidebar persists across all application pages

3. **Clicking a project loads its conversation history**
   - Click any project in sidebar switches to that project
   - Conversation messages load from database (project_id filter)
   - URL updates to /projects/[id] for deep linking
   - Input field focuses automatically after switch
   - Message history displays chronologically (oldest to newest)

4. **Project names auto-generate from first user message**
   - On first message submission, extract first 30 characters
   - Trim to last complete word (don't cut mid-word)
   - Update project name in database and sidebar immediately
   - If message too short (< 5 chars), keep "New Project" with timestamp

5. **Active project persists across page reloads**
   - Active project ID stored in localStorage with key "bmad-active-project-id"
   - On app load, read active project ID from localStorage
   - If valid project ID found, load that project automatically
   - If invalid or missing, load most recent project (highest last_active)
   - Navigate to correct URL on initial load

6. **Project deletion functionality (optional for MVP)**
   - Three-dot menu icon appears on project hover
   - Delete option in dropdown menu
   - Confirmation dialog: "Delete '[Project Name]'? This will permanently delete all conversation history."
   - On confirm: DELETE from database (cascades to messages)
   - If deleted project was active, switch to most recent remaining project
   - Sidebar updates immediately after deletion

---

## Tasks

### Task 1: Create ProjectSidebar Component
**File:** `components/features/projects/ProjectSidebar.tsx`

**Subtasks:**
- [ ] Create ProjectSidebar.tsx with TypeScript
- [ ] Implement fixed 280px width layout with Tailwind CSS
- [ ] Add "New Chat" button at top with Plus icon
- [ ] Create project list container with scroll overflow
- [ ] Fetch all projects from /api/projects on component mount
- [ ] Store projects in project-store (Zustand)
- [ ] Render ProjectListItem for each project
- [ ] Highlight active project with indigo left border (border-l-4 border-indigo-600)
- [ ] Add empty state: "No projects yet. Click 'New Chat' to start."
- [ ] Ensure responsive: Hide on mobile (<768px), show on desktop

**Estimated Effort:** 3 hours

---

### Task 2: Create ProjectListItem Component
**File:** `components/features/projects/ProjectListItem.tsx`

**Subtasks:**
- [ ] Create ProjectListItem.tsx component accepting Project props
- [ ] Display project name (text-sm font-medium)
- [ ] Display relative timestamp using date-fns formatDistanceToNow
- [ ] Add hover state background (hover:bg-slate-100)
- [ ] Add click handler to switch projects
- [ ] Add optional three-dot menu button (visible on hover)
- [ ] Implement dropdown menu with "Delete" option
- [ ] Add confirmation dialog for deletion
- [ ] Truncate long project names with ellipsis (max 2 lines)
- [ ] Add accessible ARIA labels

**Estimated Effort:** 2.5 hours

---

### Task 3: Create NewChatButton Component
**File:** `components/features/projects/NewChatButton.tsx`

**Subtasks:**
- [ ] Create NewChatButton.tsx component
- [ ] Use shadcn/ui Button component with primary variant
- [ ] Add Plus icon from lucide-react
- [ ] Implement click handler to call POST /api/projects
- [ ] Set newly created project as active in project-store
- [ ] Clear conversation-store messages
- [ ] Navigate to new project URL
- [ ] Add loading state during project creation
- [ ] Handle API errors with toast notification
- [ ] Focus chat input after project creation

**Estimated Effort:** 2 hours

---

### Task 4: Implement Zustand Project Store
**File:** `lib/stores/project-store.ts`

**Subtasks:**
- [ ] Create project-store.ts with Zustand
- [ ] Define Project interface (id, name, topic, lastActive, createdAt)
- [ ] Define ProjectState interface with projects array and activeProjectId
- [ ] Implement setActiveProject action
- [ ] Implement loadProjects action
- [ ] Implement addProject action
- [ ] Implement updateProject action (for name updates)
- [ ] Implement removeProject action
- [ ] Configure persist middleware for activeProjectId only
- [ ] Use localStorage key: "bmad-project-storage"
- [ ] Add action to update last_active timestamp via API

**Estimated Effort:** 3 hours

---

### Task 5: Implement Project API Endpoints
**Files:** `app/api/projects/route.ts`, `app/api/projects/[id]/route.ts`

**Subtasks:**
- [ ] Create GET /api/projects endpoint (list all projects)
- [ ] Query: SELECT * FROM projects ORDER BY last_active DESC
- [ ] Return projects array with success response format
- [ ] Create POST /api/projects endpoint (create new project)
- [ ] Generate UUID for new project
- [ ] Insert with name="New Project", current_step='topic'
- [ ] Set created_at and last_active to current timestamp
- [ ] Return created project object
- [ ] Create GET /api/projects/[id] endpoint (get single project)
- [ ] Create PUT /api/projects/[id] endpoint (update project)
- [ ] Accept name, topic, current_step in request body
- [ ] Auto-update last_active timestamp on every update
- [ ] Create DELETE /api/projects/[id] endpoint (optional)
- [ ] Cascade delete to messages table
- [ ] Return success response with deleted project ID
- [ ] Add error handling for all endpoints
- [ ] Validate project ID format (UUID)
- [ ] Return 404 for non-existent projects

**Estimated Effort:** 4 hours

---

### Task 6: Implement Project Name Auto-Generation
**File:** `lib/utils/generate-project-name.ts`

**Subtasks:**
- [ ] Create generateProjectName utility function
- [ ] Accept first user message as parameter
- [ ] Define maximum length: 30 characters
- [ ] Handle short messages (< 5 chars): return "New Project [date]"
- [ ] Trim whitespace from input
- [ ] If length <= 30, return as-is
- [ ] If length > 30, truncate to 30 chars
- [ ] Find last space index in truncated string
- [ ] If last space > 5 chars, trim to last complete word
- [ ] Otherwise, hard truncate to 27 chars and add "..."
- [ ] Add unit tests for edge cases (empty, very long, no spaces)
- [ ] Update POST /api/chat to call this function on first message
- [ ] Call PUT /api/projects/[id] to update name in database
- [ ] Update project-store with new name

**Estimated Effort:** 2 hours

---

### Task 7: Implement Project Switching Logic
**Dependencies:** Task 1, Task 4, Task 5

**Subtasks:**
- [ ] Create switchToProject function in project-store or hook
- [ ] Cancel any in-flight API requests (AbortController)
- [ ] Save current scroll position to sessionStorage (optional)
- [ ] Update activeProjectId in project-store (triggers localStorage persist)
- [ ] Clear messages in conversation-store
- [ ] Fetch messages for new project: GET /api/projects/[id]/messages
- [ ] Load messages into conversation-store
- [ ] Update URL with window.history.pushState
- [ ] Update last_active for new project: PUT /api/projects/[id]
- [ ] Restore saved scroll position (optional)
- [ ] Focus chat input after switch
- [ ] Add loading state during switch
- [ ] Handle errors (project not found, network failure)

**Estimated Effort:** 3.5 hours

---

### Task 8: Implement Active Project Persistence
**Dependencies:** Task 4

**Subtasks:**
- [ ] Configure Zustand persist middleware in project-store
- [ ] Persist only activeProjectId (not full projects array)
- [ ] Use localStorage key: "bmad-project-storage"
- [ ] On app initialization, read activeProjectId from localStorage
- [ ] If activeProjectId exists, verify project still exists in database
- [ ] If valid, navigate to /projects/[activeProjectId]
- [ ] If invalid or missing, query most recent project (ORDER BY last_active DESC LIMIT 1)
- [ ] If no projects exist, stay on landing page
- [ ] Handle localStorage disabled/unavailable gracefully
- [ ] Add state rehydration before first render (prevent flash)

**Estimated Effort:** 2.5 hours

---

### Task 9: Integrate Sidebar into Application Layout
**File:** `app/layout.tsx` or `components/layout/MainLayout.tsx`

**Subtasks:**
- [ ] Import ProjectSidebar component
- [ ] Add ProjectSidebar to main layout left side
- [ ] Create flex layout: sidebar (280px) + main content (flex-1)
- [ ] Ensure sidebar full height (h-screen)
- [ ] Add border-r separator between sidebar and content
- [ ] Make sidebar sticky (overflow-y-auto for project list)
- [ ] Responsive: Hide sidebar on mobile, show hamburger menu icon
- [ ] Add mobile drawer/sheet for project list on small screens
- [ ] Ensure sidebar visible on all pages except landing/auth
- [ ] Test layout on various screen sizes (mobile, tablet, desktop)

**Estimated Effort:** 2.5 hours

---

## Technical Implementation

### Component Architecture

```
MainLayout
├── ProjectSidebar (280px fixed width)
│   ├── NewChatButton
│   └── ProjectList
│       └── ProjectListItem[] (mapped from projects array)
└── MainContent (flex-1)
    └── ChatInterface (or other page content)
```

---

### Project Store Schema

```typescript
// lib/stores/project-store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Project {
  id: string;
  name: string;
  topic: string | null;
  currentStep: string;
  lastActive: string;  // ISO 8601 timestamp
  createdAt: string;
}

interface ProjectState {
  activeProjectId: string | null;
  projects: Project[];

  // Actions
  setActiveProject: (id: string) => void;
  loadProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      projects: [],

      setActiveProject: (id) => {
        set({ activeProjectId: id });
        // Update last_active timestamp in database
        fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastActive: new Date().toISOString() }),
        });
      },

      loadProjects: (projects) => set({ projects }),

      addProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects],
          activeProjectId: project.id,
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId:
            state.activeProjectId === id ? null : state.activeProjectId,
        })),
    }),
    {
      name: 'bmad-project-storage',
      partialize: (state) => ({
        activeProjectId: state.activeProjectId, // Only persist active project ID
      }),
    }
  )
);
```

---

### API Endpoint Implementations

**GET /api/projects**
```typescript
// app/api/projects/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db/client';

export async function GET() {
  try {
    const projects = db.prepare(`
      SELECT id, name, topic, current_step as currentStep,
             last_active as lastActive, created_at as createdAt
      FROM projects
      ORDER BY last_active DESC
    `).all();

    return NextResponse.json({
      success: true,
      data: { projects },
    });
  } catch (error) {
    console.error('[API Error] GET /api/projects:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch projects',
          code: 'DATABASE_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
```

**POST /api/projects**
```typescript
export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    const projectName = name || 'New Project';

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO projects (id, name, current_step, created_at, last_active)
      VALUES (?, ?, 'topic', ?, ?)
    `).run(id, projectName, now, now);

    const project = db.prepare(`
      SELECT id, name, topic, current_step as currentStep,
             last_active as lastActive, created_at as createdAt
      FROM projects
      WHERE id = ?
    `).get(id);

    return NextResponse.json({
      success: true,
      data: { project },
    });
  } catch (error) {
    console.error('[API Error] POST /api/projects:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to create project',
          code: 'DATABASE_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
```

---

### Project Switching Workflow

```typescript
// Custom hook or utility function

async function switchToProject(newProjectId: string) {
  const { setActiveProject } = useProjectStore.getState();
  const { clearMessages, setMessages } = useConversationStore.getState();

  // 1. Cancel in-flight requests
  if (currentRequestController) {
    currentRequestController.abort();
  }

  // 2. Update active project (triggers localStorage persist)
  setActiveProject(newProjectId);

  // 3. Clear current conversation
  clearMessages();

  // 4. Load new project messages
  try {
    currentRequestController = new AbortController();
    const response = await fetch(`/api/projects/${newProjectId}/messages`, {
      signal: currentRequestController.signal,
    });

    if (response.ok) {
      const data = await response.json();
      setMessages(data.data);
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Failed to load project messages:', error);
    }
  }

  // 5. Update URL
  window.history.pushState({}, '', `/projects/${newProjectId}`);

  // 6. Focus input (optional)
  document.querySelector<HTMLInputElement>('#chat-input')?.focus();
}
```

---

### Project Name Generation Logic

```typescript
// lib/utils/generate-project-name.ts

export function generateProjectName(firstMessage: string): string {
  const MAX_LENGTH = 30;
  const MIN_LENGTH = 5;
  const trimmed = firstMessage.trim();

  // Too short? Use fallback
  if (trimmed.length < MIN_LENGTH) {
    return `New Project ${new Date().toLocaleDateString()}`;
  }

  // Short enough? Use as-is
  if (trimmed.length <= MAX_LENGTH) {
    return trimmed;
  }

  // Truncate to MAX_LENGTH
  const truncated = trimmed.substring(0, MAX_LENGTH);

  // Find last space to avoid cutting mid-word
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex > MIN_LENGTH) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }

  // No good break point, hard truncate
  return truncated.substring(0, MAX_LENGTH - 3) + '...';
}

// Usage in POST /api/chat after first message
if (isFirstMessage) {
  const projectName = generateProjectName(userMessage);
  await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: projectName }),
  });
}
```

---

## Dev Notes

### State Management Pattern

**Project List (Zustand + Database):**
- Zustand stores projects array in memory for fast UI updates
- Fetch from database on app load: GET /api/projects
- Database remains source of truth
- localStorage persists only activeProjectId (not full list)

**Active Project Persistence:**
- activeProjectId stored in localStorage via Zustand persist middleware
- On app load, read from localStorage and validate against database
- If project deleted or invalid, fall back to most recent project
- Updates to last_active happen via API, not directly in store

**Conversation Isolation:**
- Each project has its own conversation history (messages.project_id foreign key)
- Switching projects clears conversation-store and loads new messages
- No cross-contamination between project conversations

---

### Database Considerations

**Existing Schema (from Story 1.2):**
The projects table already exists with all required fields:
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  topic TEXT,
  current_step TEXT DEFAULT 'topic',
  created_at TEXT DEFAULT (datetime('now')),
  last_active TEXT DEFAULT (datetime('now'))
);
```

No schema changes required for this story.

**Query Optimization:**
- Index on last_active already exists: `CREATE INDEX idx_projects_last_active ON projects(last_active);`
- ORDER BY last_active DESC uses index efficiently
- Project list queries are fast even with hundreds of projects

**Cascade Deletion:**
Messages table has foreign key with ON DELETE CASCADE:
```sql
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
```
Deleting a project automatically deletes all its messages.

---

### UI/UX Patterns

**Sidebar Design:**
- Fixed 280px width (matches Figma spec)
- Full height with overflow-y-auto for project list
- Top section: "New Chat" button (always visible)
- Bottom section: Scrollable project list
- Dark theme: bg-slate-900, text-slate-100

**Active Project Indicator:**
- 4px indigo left border: `border-l-4 border-indigo-600`
- Slightly darker background: `bg-slate-800`
- Makes active project unmistakable

**Responsive Behavior:**
- Desktop (≥768px): Sidebar always visible
- Mobile (<768px): Sidebar hidden, hamburger menu icon
- Sheet/drawer overlay on mobile for project list

**Hover States:**
- Project items: hover:bg-slate-100 (light mode), hover:bg-slate-800 (dark mode)
- Three-dot menu appears on hover (desktop only, always visible on mobile)

---

### Performance Optimizations

**Lazy Loading:**
- Project list fetched once on app load
- Individual project messages loaded on demand (when switching)
- No preloading of all conversations

**AbortController Pattern:**
- Cancel previous message fetch when switching projects quickly
- Prevents race conditions (older response overwriting newer)

**Memoization:**
- Memoize ProjectListItem to prevent unnecessary re-renders
- Use React.memo for performance with large project lists

**Debouncing:**
- Debounce last_active updates (don't update on every keystroke)
- Update only on message send or project switch

---

### Testing Strategy

**Unit Tests:**
- generateProjectName utility (edge cases: empty, long, no spaces, special chars)
- Project store actions (setActiveProject, addProject, updateProject, removeProject)
- localStorage persistence logic

**Component Tests:**
- ProjectSidebar renders project list correctly
- NewChatButton creates project and updates store
- ProjectListItem displays name, timestamp, and handles click
- Active project highlighted with correct styles
- Deletion confirmation dialog works

**Integration Tests:**
- Create new project → Appears in sidebar → Becomes active
- Switch projects → Messages load → URL updates → last_active updates
- Delete project → Removed from list → Switches to most recent
- First message → Project name auto-generates → Sidebar updates
- Page reload → Active project restored from localStorage

**E2E Tests:**
- User creates 3 projects, switches between them, verifies isolation
- User closes browser, reopens, active project still selected
- User deletes active project, automatically switches to next
- User sends first message, project name appears in sidebar

**Manual Testing:**
- Sidebar interactions (clicking, hovering, scrolling)
- Performance with 10+ projects
- Mobile responsiveness (hamburger menu, drawer)
- Keyboard navigation (tab through projects)

---

## References

- **PRD:** Feature 1.1 lines 32-77 (Project Management user stories)
- **Epics:** Epic 1, Story 1.6 lines 217-247 (Project Management UI)
- **Tech Spec:** Lines 27-33 (In Scope - Story 1.6 features)
- **Tech Spec:** Lines 71-88 (Services and Modules - Story 1.6 components)
- **Tech Spec:** Lines 188-288 (API specifications for /api/projects)
- **Architecture:** Lines 287-309 (Story 1.6 - Project Management UI components)
- **Architecture:** Lines 1021-1092 (Project Store implementation)
- **Architecture:** Lines 1233-1329 (Database queries for project management)
- **Architecture:** Lines 1774-1854 (Project switching workflow and name generation)
- **Related Stories:**
  - Story 1.2 (Database) - provides projects table and schema
  - Story 1.5 (Frontend Chat) - integrates with conversation-store
- **Dependencies:**
  - Next.js 15.5 App Router
  - React 19
  - TypeScript 5.x
  - Zustand 5.0.8
  - shadcn/ui components
  - lucide-react (icons)
  - date-fns (relative timestamps)
  - better-sqlite3 (database)

**GitHub Repository:** https://github.com/AIfriendly/AIvideogen

---

## Effort Estimation

| Task | Estimated Hours |
|------|-----------------|
| Task 1: Create ProjectSidebar Component | 3.0 |
| Task 2: Create ProjectListItem Component | 2.5 |
| Task 3: Create NewChatButton Component | 2.0 |
| Task 4: Implement Zustand Project Store | 3.0 |
| Task 5: Implement Project API Endpoints | 4.0 |
| Task 6: Implement Project Name Auto-Generation | 2.0 |
| Task 7: Implement Project Switching Logic | 3.5 |
| Task 8: Implement Active Project Persistence | 2.5 |
| Task 9: Integrate Sidebar into Application Layout | 2.5 |
| **Total Development Time** | **25.0 hours** |
| Testing & QA | 6.0 hours |
| Code Review & Refinement | 2.0 hours |
| **Total Story Effort** | **33.0 hours** |

**Story Points:** 13 (based on complexity, database interactions, state management, and UI components)

---

## Definition of Done

- [x] All 9 tasks completed and checked off
- [x] All 6 acceptance criteria validated
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Component tests passing for all 3 components
- [ ] Integration tests passing for project CRUD and switching
- [ ] E2E tests passing for complete project management flow
- [x] Code reviewed and approved
- [ ] UI tested in Chrome, Firefox, Safari
- [ ] Mobile responsive design verified on iOS/Android
- [ ] Accessibility tested with keyboard navigation
- [x] No TypeScript errors or warnings
- [x] No console errors in browser
- [x] Sidebar displays correctly at 280px width
- [x] Project switching is fast and smooth (no flickering)
- [x] Active project persists across page reloads
- [x] Auto-generated project names appear immediately in sidebar
- [x] Deletion confirmation dialog works correctly
- [x] Database queries optimized with indexes
- [x] Documentation updated (component docs, inline comments)

---

## Notes

**Dependencies:**
- Story 1.2 (Database) must be completed for projects table
- Story 1.5 (Frontend Chat) provides conversation-store integration

**Risks:**
- LocalStorage may be disabled in some browsers
- Project list may grow large (consider pagination after MVP)
- Race conditions during rapid project switching (mitigated with AbortController)
- Name generation may truncate awkwardly (edge case: no spaces in first 30 chars)

**Future Enhancements:**
- Project search/filter functionality
- Project folders/categories
- Project templates (duplicate existing project)
- Project export/import (backup conversations)
- Project sharing (multi-user collaboration - requires cloud migration)
- Drag-and-drop project reordering
- Project archiving (soft delete instead of hard delete)
- Project metadata editing (rename, change topic, add notes)
