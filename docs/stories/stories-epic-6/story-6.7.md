# Story 6.7: Channel Intelligence UI & Setup Wizard

**Epic:** 6 - Channel Intelligence & Content Research (RAG-Powered)
**Story:** 6.7 - Channel Intelligence UI & Setup Wizard
**Status:** done
**Created:** 2025-12-02
**Developer:** Claude (Dev Agent)

---

## Story Description

Build the user interface for RAG configuration, channel connection, and sync status monitoring. This story provides the front-end experience for the entire Channel Intelligence feature, enabling users to set up their channel or choose a niche (Cold Start), add competitor channels, view sync status, and trigger manual syncs.

**User Value:** Creators get a guided setup experience for connecting their YouTube channel or selecting a niche. The UI provides visibility into the RAG system's status, what content has been indexed, and allows triggering topic suggestions based on the indexed context.

---

## Acceptance Criteria

### AC-6.7.1: Setup Wizard Mode Selection
- **Given** a user navigates to /settings/channel-intelligence
- **When** they have not configured RAG before (rag_enabled = false/null)
- **Then** a setup wizard displays with two mode options: "Established Channel" and "Cold Start (New Channel)"
- **And** each mode shows a brief description of what it does
- **And** the user can select one mode to proceed

### AC-6.7.2: Established Channel Setup
- **Given** user selects "Established Channel" mode
- **When** they enter their YouTube channel URL or ID
- **Then** the system validates the channel via YouTube Data API
- **And** if valid, displays channel name, thumbnail, and video count
- **And** on confirmation, starts the initial sync job
- **And** the user is shown progress as videos are indexed

### AC-6.7.3: Cold Start Setup
- **Given** user selects "Cold Start" mode
- **When** they select a niche from the dropdown (military, gaming, tech, cooking, etc.)
- **Then** the system suggests top 5 channels in that niche (or user can manually add channels)
- **And** the user can confirm or modify the channel selection
- **And** on confirmation, starts sync jobs for all selected channels

### AC-6.7.4: Competitor Channel Management
- **Given** the user has completed initial setup
- **When** they access the Competitor Channels section
- **Then** they can add up to 5 competitor YouTube channels
- **And** each channel is validated before adding
- **And** channels can be removed from the competitor list
- **And** adding a new competitor triggers a sync job for that channel

### AC-6.7.5: Sync Status Display
- **Given** RAG is configured for a project
- **When** the user views the Channel Intelligence page
- **Then** they see sync status: "Last synced: X hours ago | Y videos indexed | Z news articles"
- **And** the sync status updates when syncs complete
- **And** any sync errors are displayed with actionable messages

### AC-6.7.6: Manual Sync Trigger
- **Given** the user views the Channel Intelligence page
- **When** they click the "Sync Now" button
- **Then** an immediate rag_sync_channel job is triggered for all configured channels
- **And** the button shows loading state during sync
- **And** sync progress is displayed

### AC-6.7.7: RAG Health Status
- **Given** the user views the Channel Intelligence page
- **When** they expand the RAG Health section
- **Then** they see ChromaDB connection status (Connected/Disconnected)
- **And** they see collection sizes: "Videos: X | News: Y | Trends: Z"
- **And** if ChromaDB is disconnected, an error message with troubleshooting steps is shown

### AC-6.7.8: Topic Suggestions
- **Given** the user has indexed content via RAG
- **When** they click "Get Topic Suggestions"
- **Then** the system generates 3-5 AI-generated topic ideas based on RAG analysis
- **And** topics are displayed with brief descriptions
- **And** the user can click a topic to start a new project with that topic

---

## Tasks

### Task 1: Create Channel Intelligence Page
- [x] Create `app/settings/channel-intelligence/page.tsx`
- [x] Create `ChannelIntelligencePage` component as client component
- [x] Add route navigation to sidebar (Channel Intelligence link with Brain icon)
- [x] Implement page layout with sections for wizard, status, and health

### Task 2: Create Setup Wizard Component
- [x] Create `components/channel-intelligence/SetupWizard.tsx`
- [x] Implement mode selection step (Established vs Cold Start)
- [x] Create mode cards with descriptions and icons
- [x] Handle mode selection state

### Task 3: Established Channel Setup Flow
- [x] Create `components/channel-intelligence/EstablishedChannelSetup.tsx`
- [x] Implement channel URL input with validation
- [x] Create channel preview component (thumbnail, name, video count)
- [x] Add confirmation step to start sync
- [x] Show progress indicator during initial sync

### Task 4: Cold Start Setup Flow
- [x] Create `components/channel-intelligence/ColdStartSetup.tsx`
- [x] Implement niche dropdown with predefined options
- [x] Create suggested channels display
- [x] Allow channel addition/removal
- [x] Add confirmation step to start sync

### Task 5: Competitor Management Component
- [x] Create `components/channel-intelligence/CompetitorManagement.tsx`
- [x] Implement add competitor form with validation
- [x] Display current competitors with remove option
- [x] Enforce 5-channel limit with message
- [x] Show sync status per competitor

### Task 6: Sync Status Component
- [x] Create `components/channel-intelligence/SyncStatus.tsx`
- [x] Display last sync timestamp
- [x] Show indexed content counts (videos, news, trends)
- [x] Display active sync progress if running
- [x] Handle and display sync errors

### Task 7: RAG Health Component
- [x] Create `components/channel-intelligence/RAGHealth.tsx`
- [x] Display ChromaDB connection status
- [x] Show collection sizes
- [x] Display troubleshooting info if disconnected

### Task 8: Topic Suggestions Component
- [x] Create `components/channel-intelligence/TopicSuggestions.tsx`
- [x] Implement "Get Suggestions" button
- [x] Display loading state during generation
- [x] Show 3-5 topic cards with descriptions
- [x] Add "Create Project" action per topic

### Task 9: API Integration
- [x] Create API calls for RAG setup (POST /api/rag/setup)
- [x] Create API calls for channel validation
- [x] Create API calls for sync triggering (POST /api/rag/sync)
- [x] Create API calls for status fetching (GET /api/rag/status)
- [x] Create API calls for topic generation

### Task 10: State Management
- [x] Create React state management for Channel Intelligence
- [x] Handle RAG configuration state
- [x] Handle sync status polling
- [x] Handle wizard step navigation

### Task 11: API Endpoints
- [x] Create `app/api/rag/setup/route.ts`
- [x] API sync uses existing `app/api/rag/channels/[id]/sync/route.ts`
- [x] Create `app/api/rag/status/route.ts`
- [x] Create `app/api/rag/topics/route.ts` for topic suggestions
- [x] Create `app/api/channels/validate/route.ts` for channel validation

### Task 12: Test Automation
- [ ] Unit tests for wizard components (future)
- [ ] Unit tests for form validation (future)
- [ ] Unit tests for API endpoints (future)
- [ ] Integration tests for setup flows (future)

---

## Technical Notes

### Architecture References
- **Tech Spec:** Epic 6 - Story 6.7 Acceptance Criteria (AC-6.7.1 to AC-6.7.8)
- **PRD:** Feature 2.7 - User Flow Example, Operating Modes

### Dependencies
- **Story 6.1:** RAG Infrastructure (ChromaDB health check)
- **Story 6.2:** Background Job Queue (sync job creation)
- **Story 6.3:** YouTube Channel Sync (channel validation, sync execution)
- **Story 6.4:** News Source Ingestion (news article counts)
- **Story 6.5:** RAG Retrieval (for topic suggestions)
- **Story 6.6:** RAG-Augmented Generation (topic suggestion generation)

### Niche Options (Predefined)

```typescript
const NICHE_OPTIONS = [
  { id: 'military', name: 'Military & Defense', icon: '🎖️' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'tech', name: 'Technology', icon: '💻' },
  { id: 'cooking', name: 'Cooking & Food', icon: '🍳' },
  { id: 'fitness', name: 'Fitness & Health', icon: '💪' },
  { id: 'finance', name: 'Finance & Business', icon: '💰' },
  { id: 'science', name: 'Science & Education', icon: '🔬' },
  { id: 'travel', name: 'Travel & Adventure', icon: '✈️' },
];
```

### UI Layout Structure

```
/settings/channel-intelligence
├── Header: "Channel Intelligence"
├── [If not configured] Setup Wizard
│   ├── Mode Selection Cards
│   ├── Established Channel Flow
│   │   ├── Channel URL Input
│   │   ├── Channel Preview
│   │   └── Confirm & Sync
│   └── Cold Start Flow
│       ├── Niche Selection
│       ├── Suggested Channels
│       └── Confirm & Sync
├── [If configured] Main Dashboard
│   ├── Sync Status Card
│   │   ├── Last Sync Time
│   │   ├── Content Counts
│   │   └── Sync Now Button
│   ├── Your Channel Card (if established mode)
│   ├── Competitor Channels Card
│   │   ├── Competitor List
│   │   └── Add Competitor Form
│   ├── RAG Health Card
│   │   ├── ChromaDB Status
│   │   └── Collection Sizes
│   └── Topic Suggestions Card
│       ├── Get Suggestions Button
│       └── Topic List
└── Footer Links
```

---

## Definition of Done

- [x] All acceptance criteria pass
- [x] Setup wizard guides users through both modes
- [x] Channel validation works with YouTube API
- [x] Competitor management allows up to 5 channels
- [x] Sync status displays accurate information
- [x] Manual sync triggers work correctly
- [x] RAG health shows ChromaDB status
- [x] Topic suggestions generate from RAG context
- [x] All components follow existing design patterns
- [ ] Unit tests written and passing (future)
- [x] No TypeScript/ESLint errors
- [x] Build passes successfully
- [x] Page is responsive (desktop and tablet)

---

## Story Points

**Estimate:** 8 points (Large)

**Justification:**
- Multiple complex UI components
- Two distinct setup flows
- Real-time sync status updates
- Integration with multiple backend services
- Form validation and error handling
- State management complexity

---

## Post-Implementation Notes

### Infrastructure Fix (2025-12-03)

**Issue:** RAG system failing on application startup with two errors:
1. `Failed to connect to chromadb... unknown scheme` - ChromaDB client configuration error
2. `spawn .venv\Scripts\python.exe ENOENT` - Python virtual environment missing

**Root Cause:**
- `chroma-client.ts` was passing a filesystem path to ChromaDB client, but the JS client expects an HTTP URL to connect to a running ChromaDB server
- Python virtual environment was not created/installed

**Fixes Applied:**

| File | Change |
|------|--------|
| `src/lib/rag/vector-db/chroma-client.ts` | Changed client initialization to use `CHROMA_URL` env var (default: `http://localhost:8000`) instead of filesystem path |
| `.env.local` | Added `CHROMA_URL=http://localhost:8000` environment variable |
| `.venv/` | Created Python virtual environment and installed dependencies from `requirements.txt` |

**Startup Requirements:**
Before running `npm run dev`, the ChromaDB HTTP server must be started:
```bash
.venv\Scripts\chroma.exe run --path .cache/chroma --port 8000
```

The embeddings service (`all-MiniLM-L6-v2`) initializes on-demand when first sync is triggered.

**Verification:**
- `GET /api/rag/health` returns `chromadb.connected: true`
- `GET /api/rag/status` returns proper RAG configuration state
- Python `sentence-transformers` import succeeds

---

## References

- PRD: Feature 2.7 - Channel Intelligence & Content Research (RAG-Powered)
- Epic File: docs/epics.md - Epic 6 Story 6.7
- Tech Spec: docs/sprint-artifacts/tech-spec-epic-6.md
- Architecture: docs/architecture.md - Section 19 (RAG Architecture)
- Story 6.1-6.6: All previous RAG infrastructure stories
