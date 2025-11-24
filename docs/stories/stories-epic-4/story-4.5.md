# Story 4.5: Assembly Trigger & Validation Workflow

## Story Header
- **ID:** 4.5
- **Title:** Assembly Trigger & Validation Workflow
- **Goal:** Provide "Assemble Video" button that validates all selections and triggers video assembly
- **Epic:** Epic 4 - Visual Curation Interface
- **Status:** done
- **Dependencies:**
  - Story 4.4 (Clip Selection Mechanism & State Management) - DONE
  - Story 4.2 (Visual Suggestions Display & Gallery) - DONE
  - Epic 3 Story 3.5 (visual_suggestions database) - DONE
  - scenes table with selected_clip_id column

## Context

This story implements the final step of the Visual Curation workflow - the "Assemble Video" button that validates all clip selections are complete and triggers the video assembly process (Epic 5). Building upon Story 4.4's clip selection mechanism, this story adds validation logic to ensure all scenes have selected clips before allowing assembly, a confirmation modal for user verification, and the API endpoint to trigger the assembly process.

The AssemblyTriggerButton component displays as a sticky footer at the bottom of the visual curation page. It monitors the curation-store state to determine if all scenes have selections (enabled state) or if selections are incomplete (disabled state with informative tooltip). Upon clicking the enabled button, a ConfirmationModal displays a summary of selections before the user confirms to trigger the POST /api/projects/[id]/assemble endpoint.

**Key Technical Components:**
- AssemblyTriggerButton.tsx - Sticky footer with validation and loading states
- ConfirmationModal.tsx - Assembly confirmation dialog with selection summary
- POST /api/projects/[id]/assemble endpoint - Trigger assembly and return job ID
- Integration with curation-store.ts for selection validation
- Navigation to assembly status page (placeholder until Epic 5)

**PRD References:**
- PRD Feature 1.6 AC3 (Finalization Trigger) lines 271-274
- PRD Feature 1.6 AC4 (Incomplete Selection Prevention) lines 275-277

**Tech Spec References:**
- Tech Spec Epic 4 Story 4.5 (Assembly Trigger & Validation Workflow)
- Tech Spec Epic 4 APIs lines 230-260 (POST /assemble endpoint)
- Tech Spec Epic 4 Workflows lines 302-315 (Assembly trigger flow)

## Story

As a user who has selected clips for all scenes in the visual curation interface,
I want to trigger the video assembly process with a clear confirmation step,
so that I can finalize my video production with confidence that all my selections will be used correctly.

## Acceptance Criteria

1. "Assemble Video" button displays at bottom of page (sticky footer)
2. **Incomplete Selection (PRD Feature 1.6 AC4):** Button disabled if any scene missing selection, tooltip shows: "Select clips for all 5 scenes to continue"
3. **Complete Selection (PRD Feature 1.6 AC3):** Button enabled when all scenes have selections
4. Clicking enabled button shows confirmation modal with scene count and selections summary
5. **Assembly Trigger (PRD Feature 1.6 AC3):** Confirming modal calls POST /api/projects/[id]/assemble with complete scene data:
   - scene_number, script text, selected clip video_id, voiceover audio_file_path, clip duration
6. Assembly endpoint updates projects.current_step and returns assembly job ID
7. User navigated to assembly status/progress page (placeholder until Epic 5)
8. Error toast displays if assembly trigger fails
9. Button shows loading spinner while assembly request processes

## Tasks / Subtasks

- [x] **Task 1: Create AssemblyTriggerButton Component** (AC: #1, #2, #3, #9)
  - [x] Create file: `src/components/features/curation/AssemblyTriggerButton.tsx`
  - [x] Implement sticky footer positioning:
    ```typescript
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Selection progress indicator */}
        {/* Assemble button */}
      </div>
    </div>
    ```
  - [x] Import useCurationStore and get selection state:
    ```typescript
    const { selections, totalScenes } = useCurationStore();
    const selectionCount = selections.size;
    const allSelected = selectionCount === totalScenes && totalScenes > 0;
    const missingCount = totalScenes - selectionCount;
    ```
  - [x] Implement disabled state with tooltip (using title attribute as Tooltip not installed):
    ```typescript
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            disabled={!allSelected || isLoading}
            onClick={handleAssembleClick}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Film className="h-4 w-4 mr-2" />
            )}
            Assemble Video
          </Button>
        </TooltipTrigger>
        {!allSelected && (
          <TooltipContent>
            <p>Select clips for all {totalScenes} scenes to continue</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
    ```
  - [x] Add loading state with spinner (Loader2 icon from lucide-react)
  - [x] Display selection progress: "X/Y scenes selected"
  - [x] Export component

- [x] **Task 2: Create ConfirmationModal Component** (AC: #4)
  - [x] Create file: `src/components/features/curation/ConfirmationModal.tsx`
  - [x] Use shadcn/ui Dialog component for modal:
    ```typescript
    interface ConfirmationModalProps {
      isOpen: boolean;
      onClose: () => void;
      onConfirm: () => void;
      isLoading: boolean;
      sceneCount: number;
      selections: Map<string, ClipSelection>;
    }
    ```
  - [x] Implement modal content with assembly summary:
    ```typescript
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ready to Assemble?</DialogTitle>
          <DialogDescription>
            This will create your final video with the selected clips.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-slate-300">
            <strong>{sceneCount} scenes</strong> will be assembled with your selected clips.
          </p>
          {/* Optional: List scene selections summary */}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Confirm Assembly
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    ```
  - [x] Display scene count and confirmation text
  - [x] Add Cancel and Confirm buttons with loading states
  - [x] Disable close actions while loading
  - [x] Export component

- [x] **Task 3: Create POST /api/projects/[id]/assemble Endpoint** (AC: #5, #6)
  - [x] Create file: `src/app/api/projects/[id]/assemble/route.ts`
  - [x] Define AssemblyScene and AssemblyResponse interfaces:
    ```typescript
    interface AssemblyScene {
      sceneId: string;
      sceneNumber: number;
      scriptText: string;
      audioFilePath: string;
      selectedClipId: string;
      videoId: string;
      clipDuration: number;
    }

    interface AssemblyResponse {
      assemblyJobId: string;
      status: 'queued' | 'processing' | 'complete' | 'error';
      message: string;
      sceneCount: number;
    }
    ```
  - [x] Implement POST handler with proper error handling and transaction:
    ```typescript
    export async function POST(
      request: Request,
      { params }: { params: Promise<{ id: string }> }
    ) {
      const { id: projectId } = await params;

      try {
        // Verify project exists (404 handler)
        const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
        if (!project) {
          return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        // Load all scenes with selections
        const scenes = db.prepare(`
          SELECT
            s.id as sceneId,
            s.scene_number as sceneNumber,
            s.text as scriptText,
            s.audio_file_path as audioFilePath,
            s.selected_clip_id as selectedClipId,
            vs.video_id as videoId,
            vs.duration as clipDuration
          FROM scenes s
          JOIN visual_suggestions vs ON s.selected_clip_id = vs.id
          WHERE s.project_id = ?
          ORDER BY s.scene_number
        `).all(projectId) as AssemblyScene[];

        // Validate all scenes have selections
        const totalScenes = db.prepare(`
          SELECT COUNT(*) as count FROM scenes WHERE project_id = ?
        `).get(projectId) as { count: number };

        if (scenes.length !== totalScenes.count) {
          return Response.json(
            {
              error: 'Not all scenes have clip selections',
              selectedCount: scenes.length,
              totalCount: totalScenes.count
            },
            { status: 400 }
          );
        }

        // Generate assembly job ID
        const assemblyJobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Update project status to 'editing' (valid current_step value)
        db.prepare(`
          UPDATE projects
          SET current_step = 'editing'
          WHERE id = ?
        `).run(projectId);

        // TODO: Queue assembly job for Epic 5 implementation
        // For now, return job ID as placeholder

        return Response.json({
          assemblyJobId,
          status: 'queued',
          message: 'Video assembly started',
          sceneCount: scenes.length
        } as AssemblyResponse);
      } catch (error) {
        console.error('Assembly trigger failed:', error);
        return Response.json(
          { error: 'Failed to trigger assembly' },
          { status: 500 }
        );
      }
    }
    ```
  - [x] Verify project exists before operations (404 handler)
  - [x] Validate all scenes have selections before proceeding
  - [x] Generate unique assembly job ID
  - [x] Update projects.current_step to 'editing' (valid workflow step)
  - [x] Return assemblyJobId and status
  - [x] Wrap in try-catch for database error handling

- [x] **Task 4: Integrate AssemblyTriggerButton in VisualCurationClient** (AC: #1, #7)
  - [x] Import AssemblyTriggerButton in VisualCurationClient.tsx
  - [x] Import ConfirmationModal component
  - [x] Add state for modal visibility and loading:
    ```typescript
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isAssembling, setIsAssembling] = useState(false);
    ```
  - [x] Add modal open handler from button:
    ```typescript
    const handleAssembleClick = () => {
      setShowConfirmModal(true);
    };
    ```
  - [x] Implement assembly trigger function:
    ```typescript
    const handleConfirmAssembly = async () => {
      setIsAssembling(true);
      try {
        const response = await fetch(`/api/projects/${projectId}/assemble`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Assembly failed');
        }

        const data = await response.json();
        toast.success('Video assembly started!');

        // Navigate to assembly status page
        router.push(`/projects/${projectId}/assembly?jobId=${data.assemblyJobId}`);
      } catch (error) {
        console.error('Assembly failed:', error);
        toast.error('Failed to start assembly. Please try again.');
      } finally {
        setIsAssembling(false);
        setShowConfirmModal(false);
      }
    };
    ```
  - [x] Render AssemblyTriggerButton at bottom of page:
    ```typescript
    <AssemblyTriggerButton
      onAssembleClick={handleAssembleClick}
      isLoading={isAssembling}
    />

    <ConfirmationModal
      isOpen={showConfirmModal}
      onClose={() => setShowConfirmModal(false)}
      onConfirm={handleConfirmAssembly}
      isLoading={isAssembling}
      sceneCount={scenes.length}
      selections={selections}
    />
    ```
  - [x] Add padding-bottom to main content to account for sticky footer

- [x] **Task 5: Create Assembly Status Placeholder Page** (AC: #7)
  - [x] Create file: `src/app/projects/[id]/assembly/page.tsx`
  - [x] Implement placeholder page:
    ```typescript
    export default async function AssemblyPage({
      params,
      searchParams
    }: {
      params: Promise<{ id: string }>;
      searchParams: Promise<{ jobId?: string }>;
    }) {
      const { id: projectId } = await params;
      const { jobId } = await searchParams;

      return (
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-4">Video Assembly</h1>
          <div className="bg-slate-800 rounded-lg p-6">
            <p className="text-slate-300 mb-4">
              Assembly job <code>{jobId}</code> is processing...
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>This feature will be fully implemented in Epic 5</span>
            </div>
          </div>
        </div>
      );
    }
    ```
  - [x] Display job ID from URL params
  - [x] Show placeholder progress indicator
  - [x] Add note about Epic 5 implementation

- [x] **Task 6: Implement Error Handling** (AC: #8)
  - [x] Add toast notifications for assembly errors
  - [x] Handle network failures gracefully
  - [x] Display specific error messages from API response
  - [x] Implement retry logic in ConfirmationModal:
    ```typescript
    const handleConfirmAssembly = async () => {
      try {
        // ... assembly logic
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : 'Failed to start assembly';
        toast.error(errorMessage, {
          action: {
            label: 'Retry',
            onClick: handleConfirmAssembly,
          },
        });
      }
    };
    ```
  - [x] Handle edge cases: incomplete selections after validation (race condition)

- [x] **Task 7: Unit Testing** (AC: All)
  - [x] Create test file: `tests/components/curation/AssemblyTriggerButton.test.tsx`
  - [x] Test button disabled when selections incomplete:
    ```typescript
    it('should disable button when not all scenes have selections', () => {
      // Mock store with 3/5 selections
      useCurationStore.setState({
        selections: new Map([
          ['scene-1', { sceneId: 'scene-1', suggestionId: 'sugg-1', videoId: 'vid-1' }],
          ['scene-2', { sceneId: 'scene-2', suggestionId: 'sugg-2', videoId: 'vid-2' }],
          ['scene-3', { sceneId: 'scene-3', suggestionId: 'sugg-3', videoId: 'vid-3' }],
        ]),
        totalScenes: 5,
      });

      const { getByRole } = render(<AssemblyTriggerButton />);
      const button = getByRole('button', { name: /assemble video/i });

      expect(button).toBeDisabled();
    });
    ```
  - [x] Test button enabled when all selections complete
  - [x] Test tooltip displays correct missing count
  - [x] Test loading state shows spinner
  - [x] Test click triggers onAssembleClick callback

- [x] **Task 8: Modal Testing** (AC: #4)
  - [x] Create test file: `tests/components/curation/ConfirmationModal.test.tsx`
  - [x] Test modal renders when open
  - [x] Test modal closes on cancel click
  - [x] Test confirm button triggers onConfirm callback
  - [x] Test loading state disables buttons
  - [x] Test scene count displays correctly

- [x] **Task 9: API Testing** (AC: #5, #6)
  - [x] Create test file: `tests/api/assemble.test.ts`
  - [x] Test POST returns 200 with valid project and all selections:
    ```typescript
    it('should trigger assembly when all scenes have selections', async () => {
      // Setup: Create project with 3 scenes, all with selections
      const projectId = createTestProject();
      createScenesWithSelections(projectId, 3);

      const response = await fetch(`/api/projects/${projectId}/assemble`, {
        method: 'POST',
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.assemblyJobId).toBeDefined();
      expect(data.status).toBe('queued');
      expect(data.sceneCount).toBe(3);
    });
    ```
  - [x] Test POST returns 400 when selections incomplete:
    ```typescript
    it('should return 400 when not all scenes have selections', async () => {
      // Setup: Create project with 5 scenes, only 3 with selections
      const projectId = createTestProject();
      createScenesWithPartialSelections(projectId, 5, 3);

      const response = await fetch(`/api/projects/${projectId}/assemble`, {
        method: 'POST',
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Not all scenes');
      expect(data.selectedCount).toBe(3);
      expect(data.totalCount).toBe(5);
    });
    ```
  - [x] Test projects.current_step is updated to 'editing'
  - [x] Test response includes assemblyJobId
  - [x] Test error handling for missing project

- [x] **Task 10: Integration Testing** (AC: All)
  - [x] Test full flow: Button click -> Modal -> Confirm -> API -> Navigation
  - [x] Test button state updates as selections change
  - [x] Test error toast displays on API failure
  - [x] Test navigation to assembly page with job ID
  - [x] Test modal closes after successful assembly

## Dev Notes

### Project Structure Alignment

**File Locations (from Architecture & Tech Spec):**
- AssemblyTriggerButton: `src/components/features/curation/AssemblyTriggerButton.tsx`
- ConfirmationModal: `src/components/features/curation/ConfirmationModal.tsx`
- API endpoint: `src/app/api/projects/[id]/assemble/route.ts`
- Assembly page: `src/app/projects/[id]/assembly/page.tsx`
- Updated component: `src/app/projects/[id]/visual-curation/VisualCurationClient.tsx`

**Database Integration:**
- Reads `scenes` table with `selected_clip_id` for validation
- Reads `visual_suggestions` table for clip metadata (video_id, duration)
- Updates `projects.current_step` to 'assembly' on trigger

**Component Library:**
- Use shadcn/ui Button, Dialog, Tooltip components
- Use sonner for toast notifications (already installed from Story 4.4)
- Import lucide-react icons: Film, Loader2, Check, AlertCircle

### Architecture Patterns & Constraints

**Validation Logic:**
```
User clicks "Assemble Video" button
|
Check: Are all scenes selected? (selections.size === totalScenes)
|
IF incomplete:
  - Button remains disabled
  - Tooltip shows "Select clips for all X scenes to continue"
|
IF complete:
  - Show ConfirmationModal
  |
  User clicks "Confirm Assembly"
  |
  POST /api/projects/[id]/assemble
  |
  IF success:
    - Toast success
    - Update projects.current_step to 'editing'
    - Navigate to /projects/[id]/assembly?jobId={jobId}
  |
  IF failure:
    - Toast error with retry action
```

**AssemblyRequest Payload Structure:**
```typescript
interface AssemblyRequest {
  projectId: string;
  scenes: {
    sceneId: string;
    sceneNumber: number;
    scriptText: string;
    audioFilePath: string;
    selectedClipId: string;
    videoId: string;
    clipDuration: number;
  }[];
}
```

**Assembly Response Format:**
```json
{
  "assemblyJobId": "job-xyz-123",
  "status": "queued",
  "message": "Video assembly started",
  "sceneCount": 5
}
```

**API Error Codes:**
- **400 Bad Request:** Not all scenes have selections
- **404 Not Found:** Project not found
- **500 Internal Server Error:** Database operation failed

**Visual Design Specifications:**
- **Sticky Footer:** Fixed bottom positioning with blur backdrop
- **Button:** Primary indigo color, disabled state is gray with reduced opacity
- **Tooltip:** Dark background, appears on hover over disabled button
- **Loading State:** Spinner icon with "Assembling..." text
- **Modal:** Centered dialog with title, description, and action buttons

### Learnings from Previous Stories (Story 4.4)

**From Story 4.4 (Status: DONE):**
- curation-store.ts established with selections Map and totalScenes
- useCurationStore hook available for state access
- Selection count pattern: `selections.size` and `totalScenes`
- getAllSelected() helper for checking completion
- Toast notification patterns with sonner
- Async error handling with retry actions

**Store Integration:**
```typescript
const { selections, totalScenes } = useCurationStore();
const allSelected = selections.size === totalScenes && totalScenes > 0;
```

### Critical Implementation Details

**Sticky Footer Z-Index:**
Ensure footer is above page content but below modals:
```typescript
<div className="fixed bottom-0 left-0 right-0 z-40 ...">
```

**Content Padding:**
Add bottom padding to VisualCurationClient to prevent content from being hidden behind sticky footer:
```typescript
<div className="pb-24"> {/* Account for sticky footer height */}
  {/* Page content */}
</div>
```

**Modal Portal:**
shadcn/ui Dialog uses portal by default, so modal will render above sticky footer correctly.

**Race Condition Prevention:**
The API endpoint validates selections server-side to prevent race conditions where selections might change between client validation and API call.

### Testing Standards Summary

**Unit Testing (Vitest):**
- Test AssemblyTriggerButton disabled/enabled states
- Test ConfirmationModal rendering and callbacks
- Test loading states and interactions
- Mock useCurationStore for state testing

**API Testing:**
- Test POST /api/projects/[id]/assemble endpoint
- Test validation: incomplete selections (400)
- Test successful assembly trigger (200)
- Test response format with assemblyJobId
- Test projects.current_step update

**Component Testing:**
- Test button renders with correct disabled state
- Test tooltip appears on disabled button hover
- Test modal opens on button click
- Test modal confirm triggers API call
- Test navigation after successful assembly

**Integration Testing:**
- Test full flow from button click to navigation
- Test error handling with mocked API failures
- Test state synchronization between store and UI
- Test loading states throughout the flow

**Manual Testing:**
- Verify sticky footer positioning
- Test tooltip behavior and content
- Test modal animations and focus management
- Test loading spinner visibility
- Verify navigation to assembly page

### Type Definitions

**Reference Existing Types:**
- Import `ClipSelection` from `src/lib/stores/curation-store.ts`
- Import `VisualSuggestion` from `src/types/visual-suggestions.ts`

**New Types for This Story:**
```typescript
// In AssemblyTriggerButton.tsx
interface AssemblyTriggerButtonProps {
  onAssembleClick: () => void;
  isLoading: boolean;
}

// In ConfirmationModal.tsx
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  sceneCount: number;
  selections: Map<string, ClipSelection>;
}

// In API endpoint
interface AssemblyScene {
  sceneId: string;
  sceneNumber: number;
  scriptText: string;
  audioFilePath: string;
  selectedClipId: string;
  videoId: string;
  clipDuration: number;
}

interface AssemblyResponse {
  assemblyJobId: string;
  status: 'queued' | 'processing' | 'complete' | 'error';
  message: string;
  sceneCount: number;
}
```

### References

**Architecture Documentation:**
- [Source: docs/architecture.md#Epic-to-Architecture-Mapping] - Story 4.5 API and workflow
- [Source: docs/architecture.md#Database-Schema] - projects and scenes tables
- [Source: docs/architecture.md#API-Endpoints] - /assemble endpoint specification

**Database Schema:**
- [Source: docs/architecture.md#Database-Schema Epic 2] - scenes table
- [Source: docs/architecture.md#Database-Schema Epic 3] - visual_suggestions table
- [Source: docs/architecture.md#Database-Schema Epic 1] - projects table with current_step

**Tech Spec:**
- [Source: docs/sprint-artifacts/tech-spec-epic-3.md] - API patterns and data models

**PRD:**
- [Source: docs/prd.md Feature 1.6 AC3 lines 271-274] - Finalization trigger
- [Source: docs/prd.md Feature 1.6 AC4 lines 275-277] - Incomplete selection prevention

**Epic Breakdown:**
- [Source: docs/epics.md Epic 4 Story 4.5 lines 1017-1047] - Original story definition
- [Source: docs/epics.md Epic 5 lines 1083-1106] - Video Assembly & Output (target of trigger)

**Previous Stories:**
- [Source: docs/stories/story-4.4.md] - Clip selection mechanism, curation-store patterns

**Existing Store Implementation:**
- [Source: src/lib/stores/curation-store.ts] - Selection state management

## Dev Agent Record

### Context Reference

- **Story Context XML:** docs/stories/story-4.5.context.xml
- Generated: 2025-11-21
- Contains: User story, acceptance criteria, tasks, documentation references, code artifacts, dependencies, interfaces, testing standards

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

N/A - Implementation completed successfully without debug issues

### Completion Notes List

- **Tooltip Implementation:** Used native HTML `title` attribute instead of shadcn/ui Tooltip component which was not installed. This provides equivalent functionality with proper accessibility.
- **Toast Integration:** Used existing `@/hooks/use-toast` hook from the project instead of sonner (which was mentioned in story but not installed).
- **Test Organization:** Tests placed in `tests/components/curation/` subdirectory to match existing project structure.
- **API Pattern:** Followed existing patterns from `select-clip/route.ts` for consistency.
- **Database Operations:** Used parameterized queries with better-sqlite3 for security.
- **Error Handling:** Implemented retry action in toast for assembly failures.
- **Navigation:** Uses Next.js router.push with query parameter for job ID tracking.

### File List

**Created:**
- `src/components/features/curation/AssemblyTriggerButton.tsx` - Sticky footer button with validation
- `src/components/features/curation/ConfirmationModal.tsx` - Assembly confirmation dialog
- `src/app/api/projects/[id]/assemble/route.ts` - POST endpoint to trigger assembly
- `src/app/projects/[id]/assembly/page.tsx` - Assembly status placeholder page
- `tests/components/curation/AssemblyTriggerButton.test.tsx` - Button component tests
- `tests/components/curation/ConfirmationModal.test.tsx` - Modal component tests
- `tests/api/assemble.test.ts` - API endpoint tests
- `tests/integration/assembly-trigger.test.tsx` - Full flow integration tests

**Modified:**
- `src/app/projects/[id]/visual-curation/VisualCurationClient.tsx` - Added button, modal, and handlers

### Completion Notes
**Completed:** 2025-11-22
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing

**Review Summary:**
- Multi-agent review completed (SM, Architect, Dev, TEA)
- Overall Score: 0.946
- All 38 tests passing
- 9/9 acceptance criteria covered
- Minor issues fixed during review:
  - Replaced deprecated `substr` with `substring`
  - Added INNER JOIN documentation
  - Fixed singular/plural handling in ConfirmationModal
  - Simplified toast error handling
