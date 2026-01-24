# 12. Implementation Guidance

### 12.1 Technical Stack Recommendation

**Frontend Framework:** Next.js 15+ (App Router, Server Components, React 19)
**Styling:** Tailwind CSS 4+ + shadcn/ui components
**Video Player:** Plyr or Video.js (FOSS, accessible, customizable, Plyr recommended for simplicity)
**State Management:** Zustand 5+ (lightweight, simple API, perfect for this scope)
**Database:** SQLite via better-sqlite3 (local, FOSS, fast, no server needed)
**LLM Provider:** Ollama (local, FOSS, privacy-first, no API costs)
**API:** Next.js API routes (REST-style, simple, co-located with app)

### 12.2 Key Implementation Notes

**1. Sidebar State Management:**
- Store active project ID in Zustand store + localStorage
- Sync project list from database on mount
- Update project `last_active` timestamp on any activity
- Debounce project list refresh to avoid excessive queries

**2. Chat Message Handling:**
- Stream AI responses for better UX (show typing, then stream text)
- Store messages in database immediately after sending/receiving
- Use Zustand for real-time message list state
- Auto-scroll logic: Disable when user scrolls up, re-enable when within 100px of bottom

**3. Video Preview Performance:**
- Lazy load thumbnails (only load visible ones via Intersection Observer)
- Use low-res preview videos for hover playback (YouTube API provides multiple qualities)
- Consider loading only first frame as image, play video on explicit click
- Cache thumbnail images in browser (set appropriate Cache-Control headers)

**4. Selection State Persistence:**
- Store clip selections in database on selection (auto-save)
- Use Zustand for immediate UI state updates
- Handle concurrent editing (last-write-wins for MVP, conflict resolution future)
- Allow offline selections with sync on reconnect (future enhancement)

**5. Responsive Video Thumbnails:**
- Use CSS `aspect-ratio: 16/9` for consistent sizing
- Ensure videos encoded for web (H.264 for compatibility, VP9 for efficiency)
- Provide fallback poster image if video fails to load

**6. Accessibility Implementation:**
- Use semantic HTML (`<nav>`, `<article>`, `<section>`, `<button>`)
- Test keyboard navigation in every PR (required review checklist item)
- Include ARIA attributes on all custom components
- Run axe DevTools in CI/CD pipeline, fail build if critical issues found

**7. Project Switching:**
- Cancel any in-flight requests when switching projects (AbortController)
- Save scroll position before switching, restore after loading
- Show loading skeleton while loading project to avoid blank screen

**8. URL Routing:**
- Use Next.js App Router dynamic routes (`/projects/[id]/page.tsx`)
- Update URL on project switch (pushState, not replace for back button support)
- Handle direct URL access (deep linking) - load project from ID in URL

**9. Error Handling:**
- Wrap API calls in try/catch, show user-friendly error toasts
- Log errors to console (or error tracking service future)
- Provide retry mechanisms for transient failures (network errors)
- Graceful degradation: If LLM unavailable, show clear message + offline mode (future)

**10. Browser-Based Video Providers (Feature 2.9 - Playwright):**
- **Provider Type Indication:** Show provider badge (API vs Browser) in loading UI
- **Extended Loading Times:** Account for 2-3 second browser startup on first request
- **Browser Lifecycle Stages:** Display specific stage messages for browser operations
  - "Starting browser..." (first request only)
  - "Rendering page..." (JavaScript execution)
  - "Intercepting video URLs..." (network interception)
  - "Extracting video metadata..." (HTML parsing)
- **Progress Bar Calculation:** Adjust estimated time for browser-based providers
  - Formula: `(num_scenes × 7.5 seconds) + 3 seconds` (browser startup)
  - API comparison: `num_scenes × 3.5 seconds`
- **Browser-Specific Errors:** Handle Playwright-specific error states
  - Browser not installed → Show installation command
  - Stealth detection → Retry with anti-detection measures
  - Render timeout → Extend timeout or suggest alternative provider
- **Resource Management:** Display browser resource usage (~200MB RAM per instance)
- **Browser Reuse:** Show "Reusing browser instance" for faster subsequent requests
- **See Also:** Section 6.8 (Visual Sourcing Loading UI) for complete specifications

### 12.3 Component Architecture Recommendations

**File Structure:**
```
app/
├── layout.tsx                      # Root layout with sidebar
├── page.tsx                        # Home page (redirects to recent project)
├── projects/
│   └── [id]/
│       ├── page.tsx                # Chat interface for project
│       └── curation/
│           └── page.tsx            # Visual curation for project
components/
├── sidebar/
│   ├── ProjectSidebar.tsx          # Main sidebar component
│   ├── ProjectListItem.tsx         # Individual project item
│   └── NewChatButton.tsx           # New chat action button
├── chat/
│   ├── ChatInterface.tsx           # Chat container
│   ├── MessageList.tsx             # Scrollable message list
│   ├── MessageBubble.tsx           # Individual message
│   └── MessageInput.tsx            # Input area with send button
├── curation/
│   ├── CurationInterface.tsx       # Main curation container
│   ├── CurationHeader.tsx          # Header with progress + button
│   ├── SceneCard.tsx               # Scene card component
│   ├── ClipGrid.tsx                # Grid of video thumbnails
│   └── VideoPreviewThumbnail.tsx   # Individual clip thumbnail
└── shared/
    ├── ProgressTracker.tsx         # Progress bar component
    └── LoadingSpinner.tsx          # Loading states
lib/
├── db/
│   ├── client.ts                   # Database connection
│   └── queries.ts                  # Database query functions
├── llm/
│   ├── provider.ts                 # LLM provider interface
│   ├── ollama-provider.ts          # Ollama implementation
│   └── prompts/
│       └── default-system-prompt.ts
└── stores/
    ├── project-store.ts            # Project state (Zustand)
    ├── chat-store.ts               # Chat state (Zustand)
    └── curation-store.ts           # Curation selections (Zustand)
```

**State Management Strategy:**
- **Zustand stores:** Client-side UI state (active project, message list, clip selections)
- **Database:** Persistent state (projects, messages, selections)
- **Server Components:** Fetch initial data, pass to client components
- **API Routes:** Mutations (create project, send message, save selections)

**Data Flow:**
1. Server Component fetches initial data from database
2. Passes data to Client Component as props
3. Client Component hydrates Zustand store with initial data
4. User interactions update Zustand store (optimistic UI)
5. API calls persist changes to database
6. On success, confirm state; on error, rollback Zustand + show error

---
