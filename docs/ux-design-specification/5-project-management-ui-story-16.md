# 5. Project Management UI (Story 1.6)

### 5.1 Overview

**Purpose:** Allow users to organize multiple video projects, switch between conversations, and resume work seamlessly.

**User Value:** Creators often work on multiple video ideas simultaneously (e.g., cooking series, gaming tutorials, travel vlogs). Project management keeps ideas organized and prevents context mixing.

**Key Features:**
- Sidebar showing all projects
- "New Chat" button to create new project
- Click project to switch/load conversation
- Auto-generated project names
- Visual highlight of active project
- Persist selected project across page reloads

### 5.2 Visual Design

**Sidebar Structure:**

```
┌────────────────────────┐
│  [+ New Chat]          │  <- Primary action button
├────────────────────────┤
│  📹 Mars colonizatio...│  <- Active project (highlighted)
│     Today, 2:34 PM     │
├────────────────────────┤
│  🎮 Gaming tutorial id │
│     Yesterday          │
├────────────────────────┤
│  🍳 Cooking recipes    │
│     Dec 28             │
├────────────────────────┤
│  ⋮ (more projects)     │
└────────────────────────┘
```

**Sidebar Specifications:**
- **Width:** 280px (fixed)
- **Background:** `#1e293b` (Slate 800)
- **Border Right:** 1px solid `#334155` (Slate 700)
- **Padding:** 16px (md)
- **Scroll:** Smooth scrolling for long project lists

**"New Chat" Button:**
- **Position:** Top of sidebar, sticky
- **Style:** Primary button (Indigo 500 background, white text)
- **Size:** Full width of sidebar minus padding
- **Icon:** Plus icon (+) on left
- **Text:** "New Chat"
- **Hover:** Darker indigo (`#4f46e5`)
- **Action:** Creates new project, switches to it, opens empty chat

**Project List Item:**
- **Height:** 72px (minimum)
- **Padding:** 12px (sm)
- **Border Radius:** 8px
- **Background (default):** Transparent
- **Background (hover):** `#334155` (Slate 700, 50% opacity)
- **Background (active):** `#334155` (Slate 700, 100% opacity) + left border 3px Indigo 500
- **Text Color:** `#f8fafc` (Slate 50) for title, `#94a3b8` (Slate 400) for timestamp
- **Cursor:** Pointer
- **Transition:** All properties 0.2s ease

**Project Item Content:**
- **Project Icon:** Emoji (🎬, 📹, 🎮, etc.) auto-assigned or user-selected (MVP: auto-assigned)
- **Project Name:** Truncated to 20 characters with ellipsis if longer
  - **Font Size:** 1rem (16px)
  - **Font Weight:** 500 (medium)
  - **Color:** `#f8fafc` (Slate 50)
- **Timestamp:** Relative time (e.g., "Today, 2:34 PM", "Yesterday", "Dec 28")
  - **Font Size:** 0.75rem (12px)
  - **Color:** `#94a3b8` (Slate 400)
  - **Format:** Uses Intl.DateTimeFormat for localization

**Project Name Generation:**
- **Source:** First user message in conversation
- **Logic:** Take first 30 characters, trim to last complete word
- **Example:** "Help me brainstorm fitness content for beginners" → "Help me brainstorm fitness..."
- **Fallback:** If first message < 5 chars, use "New Project" + timestamp

**Ordering:**
- **Sort by:** `last_active` timestamp (most recent first)
- **Update trigger:** Any activity in project (new message, selection, etc.)

### 5.3 Interaction Patterns

**Creating New Project:**
1. User clicks "New Chat" button
2. System creates new project in database (generates ID, initializes empty conversation)
3. System switches active project to new one
4. System clears main content area and shows empty chat interface
5. Sidebar updates: New project appears at top with "Just now" timestamp

**Switching Projects:**
1. User clicks project in sidebar
2. System saves current project state (if applicable)
3. System loads selected project's conversation history
4. System updates main content area with appropriate view (chat, curation, etc.)
5. Sidebar updates: Selected project highlighted, previous project unhighlighted
6. URL updates: `/projects/:newProjectId`

**Deleting Project (Optional MVP):**
1. User hovers over project → Three dots menu appears
2. User clicks three dots → Dropdown shows "Delete project"
3. User clicks "Delete" → Confirmation dialog appears
4. User confirms → Project deleted from database
5. Sidebar updates: Project removed from list
6. If deleted project was active, switch to most recent project

### 5.4 States

**Empty State (No Projects):**
- Message: "Start your first video project!"
- Subtext: "Click 'New Chat' to brainstorm your first video idea"
- Icon: 🎬 (centered)
- "New Chat" button prominent

**Loading State:**
- Skeleton loaders for project list items
- Shimmer animation
- 3-5 skeleton items shown

**Error State:**
- Message: "Failed to load projects"
- Retry button
- Error icon

---
