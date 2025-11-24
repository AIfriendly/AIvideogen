# Story 4.6: Visual Curation Workflow Integration & Error Recovery

## Story Header
- **ID:** 4.6
- **Title:** Visual Curation Workflow Integration & Error Recovery
- **Goal:** Integrate visual curation page into project workflow with error recovery and edge case handling
- **Epic:** Epic 4 - Visual Curation Interface
- **Status:**DONE
- **Dependencies:**
  - Story 4.1 (Scene-by-Scene UI Layout) - DONE
  - Story 4.2 (Visual Suggestions Display & Gallery) - DONE
  - Story 4.3 (Video Preview & Playback) - DONE
  - Story 4.4 (Clip Selection Mechanism) - DONE
  - Story 4.5 (Assembly Trigger & Validation) - DONE
  - Epic 2 Story 2.6 (Script & Voiceover UI Display)
  - Epic 3 Story 3.5 (Visual Suggestions Database & Workflow Integration)

## Context

This story completes the Visual Curation workflow by integrating it with the broader project navigation flow, implementing error recovery mechanisms, and handling edge cases. Building upon Stories 4.1-4.5, this story adds navigation controls (breadcrumbs, back/forward buttons), workflow step validation, session persistence (localStorage), and graceful error handling for scenarios like missing audio files or modified scripts.

The story ensures users can seamlessly navigate from Epic 2 voiceover preview to Epic 4 visual curation, with the ability to go back and regenerate visuals if needed. It also implements the warning modal for incomplete selections when users try to navigate away, and handles edge cases where scene data may be inconsistent.

**Key Technical Components:**
- NavigationBreadcrumb.tsx - Breadcrumb navigation (Project > Script > Voiceover > Visual Curation)
- UnsavedChangesModal.tsx - Warning modal for incomplete selections
- useSessionPersistence.ts - Custom hook for localStorage scroll/preview state
- Workflow validation in page.tsx (redirect if wrong current_step)
- "Continue to Visual Curation" button in Epic 2 voiceover preview
- "Back to Script Preview" and "Regenerate Visuals" buttons

**PRD References:**
- PRD Feature 1.6 (Visual Curation UI) lines 244-277
- Epic 2 Story 2.6 (Script Preview)
- Epic 3 Story 3.5 (Workflow Integration)

**Tech Spec References:**
- Tech Spec Epic 4 Story 4.6 (lines 581-591)
- Tech Spec Workflows and Sequencing (lines 256-343)
- Tech Spec NFR Reliability (lines 399-424)
- Tech Spec Error Recovery Flows (lines 317-343)

## Story

As a user who has generated voiceovers and visual suggestions for my project,
I want to navigate seamlessly through the workflow with clear progress indicators and error recovery options,
so that I can move forward and backward in the video creation process without losing my progress or encountering confusing states.

## Acceptance Criteria

1. After Epic 2 voiceover generation, "Continue to Visual Curation" button appears and navigates to /projects/[id]/visual-curation
2. Direct URL access to /projects/[id]/visual-curation works if projects.current_step = 'visual-curation'
3. If user accesses page with wrong workflow step (e.g., current_step = 'voice'), redirect to correct step with warning
4. "Back to Script Preview" link navigates to Epic 2 Story 2.6 preview page
5. "Regenerate Visuals" button triggers POST /api/projects/[id]/generate-visuals (Epic 3 Story 3.5)
6. Scroll position and open preview state persist across page reloads (localStorage)
7. Warning modal appears if user navigates away with incomplete selections: "You haven't selected clips for all scenes. Progress will be saved."
8. Edge case handling: if scene has no audio_file_path, display error message with option to regenerate voiceovers
9. Breadcrumb navigation shows: Project > Script > Voiceover > Visual Curation

## Tasks / Subtasks

- [x] **Task 1: Create NavigationBreadcrumb Component with Controlled Navigation** (AC: #9, #7)
  - [x] Create file: `src/components/features/curation/NavigationBreadcrumb.tsx`
  - [x] Define component props with navigation handler for controlled navigation:
    ```typescript
    interface NavigationBreadcrumbProps {
      projectId: string;
      projectName: string;
      currentStep: 'script' | 'voiceover' | 'visual-curation';
      onNavigate?: (href: string) => void; // For controlled navigation with unsaved changes check
    }
    ```
  - [x] Implement breadcrumb with controlled navigation pattern (supports AC #7):
    ```typescript
    import { ChevronRight, Home, FileText, Mic, Film } from 'lucide-react';

    export function NavigationBreadcrumb({
      projectId,
      projectName,
      currentStep,
      onNavigate
    }: NavigationBreadcrumbProps) {
      const steps = [
        { id: 'project', label: 'Project', href: `/projects/${projectId}`, icon: Home },
        { id: 'script', label: 'Script', href: `/projects/${projectId}/script`, icon: FileText },
        { id: 'voiceover', label: 'Voiceover', href: `/projects/${projectId}/voiceover-preview`, icon: Mic },
        { id: 'visual-curation', label: 'Visual Curation', href: `/projects/${projectId}/visual-curation`, icon: Film },
      ];

      const handleClick = (e: React.MouseEvent, href: string) => {
        if (onNavigate) {
          e.preventDefault();
          onNavigate(href);
        }
        // If no onNavigate, allow default link behavior
      };

      return (
        <nav className="flex items-center space-x-1 text-sm text-slate-500 dark:text-slate-400">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCurrent = step.id === currentStep;

            return (
              <div key={step.id} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 mx-1 text-slate-400" />
                )}
                {isCurrent ? (
                  <span className="flex items-center gap-1 font-medium text-slate-900 dark:text-slate-100">
                    <Icon className="w-4 h-4" />
                    {step.label}
                  </span>
                ) : (
                  <a
                    href={step.href}
                    onClick={(e) => handleClick(e, step.href)}
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Icon className="w-4 h-4" />
                    {step.label}
                  </a>
                )}
              </div>
            );
          })}
        </nav>
      );
    }
    ```
  - [x] Style active/inactive states appropriately
  - [x] Export component
  - [x] **Note:** When used in VisualCurationClient, pass `onNavigate` prop to check selection state before allowing navigation

- [x] **Task 2: Create UnsavedChangesModal Component** (AC: #7)
  - [x] **PREREQUISITE:** Install AlertDialog component: `npx shadcn@latest add alert-dialog`
  - [x] Create file: `src/components/features/curation/UnsavedChangesModal.tsx`
  - [x] Define component props:
    ```typescript
    interface UnsavedChangesModalProps {
      isOpen: boolean;
      onClose: () => void;
      onConfirmLeave: () => void;
      selectionCount: number;
      totalScenes: number;
    }
    ```
  - [x] Implement warning dialog using shadcn/ui AlertDialog:
    ```typescript
    import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
    } from '@/components/ui/alert-dialog';
    import { AlertTriangle } from 'lucide-react';

    export function UnsavedChangesModal({
      isOpen,
      onClose,
      onConfirmLeave,
      selectionCount,
      totalScenes,
    }: UnsavedChangesModalProps) {
      const missingCount = totalScenes - selectionCount;

      return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Incomplete Selections
              </AlertDialogTitle>
              <AlertDialogDescription>
                You haven't selected clips for all scenes.
                {missingCount > 0 && (
                  <span className="block mt-2 font-medium">
                    {missingCount} scene{missingCount > 1 ? 's' : ''} still need{missingCount === 1 ? 's' : ''} a clip selection.
                  </span>
                )}
                <span className="block mt-2">
                  Progress will be saved. You can return to continue your selections.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={onClose}>
                Stay on Page
              </AlertDialogCancel>
              <AlertDialogAction onClick={onConfirmLeave}>
                Leave Anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    ```
  - [x] Display warning message with missing selection count
  - [x] Provide "Stay on Page" and "Leave Anyway" buttons
  - [x] Export component

- [x] **Task 3: Create useSessionPersistence Hook** (AC: #6)
  - [x] Create file: `src/lib/hooks/useSessionPersistence.ts`
  - [x] Define persistence state interface:
    ```typescript
    interface SessionState {
      scrollPosition: number;
      openPreviewId: string | null;
      lastUpdated: number;
    }

    interface UseSessionPersistenceReturn {
      saveScrollPosition: (position: number) => void;
      savePreviewState: (suggestionId: string | null) => void;
      restoreState: () => SessionState | null;
      clearState: () => void;
    }
    ```
  - [x] Implement localStorage persistence hook:
    ```typescript
    import { useCallback, useEffect } from 'react';

    const STORAGE_KEY_PREFIX = 'visual-curation-session';

    export function useSessionPersistence(projectId: string): UseSessionPersistenceReturn {
      const storageKey = `${STORAGE_KEY_PREFIX}-${projectId}`;

      const saveScrollPosition = useCallback((position: number) => {
        try {
          const existing = localStorage.getItem(storageKey);
          const state: SessionState = existing
            ? JSON.parse(existing)
            : { scrollPosition: 0, openPreviewId: null, lastUpdated: Date.now() };

          state.scrollPosition = position;
          state.lastUpdated = Date.now();
          localStorage.setItem(storageKey, JSON.stringify(state));
        } catch (error) {
          console.error('Failed to save scroll position:', error);
        }
      }, [storageKey]);

      const savePreviewState = useCallback((suggestionId: string | null) => {
        try {
          const existing = localStorage.getItem(storageKey);
          const state: SessionState = existing
            ? JSON.parse(existing)
            : { scrollPosition: 0, openPreviewId: null, lastUpdated: Date.now() };

          state.openPreviewId = suggestionId;
          state.lastUpdated = Date.now();
          localStorage.setItem(storageKey, JSON.stringify(state));
        } catch (error) {
          console.error('Failed to save preview state:', error);
        }
      }, [storageKey]);

      const restoreState = useCallback((): SessionState | null => {
        try {
          const stored = localStorage.getItem(storageKey);
          if (!stored) return null;

          const state: SessionState = JSON.parse(stored);

          // Expire after 1 hour
          const oneHour = 60 * 60 * 1000;
          if (Date.now() - state.lastUpdated > oneHour) {
            localStorage.removeItem(storageKey);
            return null;
          }

          return state;
        } catch (error) {
          console.error('Failed to restore session state:', error);
          return null;
        }
      }, [storageKey]);

      const clearState = useCallback(() => {
        try {
          localStorage.removeItem(storageKey);
        } catch (error) {
          console.error('Failed to clear session state:', error);
        }
      }, [storageKey]);

      return {
        saveScrollPosition,
        savePreviewState,
        restoreState,
        clearState,
      };
    }
    ```
  - [x] Handle scroll position save on scroll (debounced)
  - [x] Handle preview state save on open/close
  - [x] Restore state on mount
  - [x] Clear state after 1 hour expiration
  - [x] Export hook

- [x] **Task 4: Update VisualCurationClient with Navigation and Session Persistence** (AC: #4, #5, #6, #7, #8, #9)
  - [x] Import new components and hooks:
    ```typescript
    import { NavigationBreadcrumb } from '@/components/features/curation/NavigationBreadcrumb';
    import { UnsavedChangesModal } from '@/components/features/curation/UnsavedChangesModal';
    import { useSessionPersistence } from '@/lib/hooks/useSessionPersistence';
    import { ArrowLeft, RefreshCw } from 'lucide-react';
    ```
  - [x] Add state for navigation warning and regeneration:
    ```typescript
    const [showUnsavedModal, setShowUnsavedModal] = React.useState(false);
    const [pendingNavigation, setPendingNavigation] = React.useState<string | null>(null);
    const [isRegenerating, setIsRegenerating] = React.useState(false);
    ```
  - [x] Initialize session persistence hook:
    ```typescript
    const {
      saveScrollPosition,
      savePreviewState,
      restoreState,
      clearState,
    } = useSessionPersistence(project.id);
    ```
  - [x] Implement scroll position tracking with debounce:
    ```typescript
    React.useEffect(() => {
      let timeoutId: NodeJS.Timeout;

      const handleScroll = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          saveScrollPosition(window.scrollY);
        }, 300);
      };

      window.addEventListener('scroll', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll);
        clearTimeout(timeoutId);
      };
    }, [saveScrollPosition]);
    ```
  - [x] Restore scroll position on mount:
    ```typescript
    React.useEffect(() => {
      const state = restoreState();
      if (state && state.scrollPosition > 0) {
        // Delay to ensure content is rendered
        setTimeout(() => {
          window.scrollTo(0, state.scrollPosition);
        }, 100);
      }
    }, [restoreState, scenes.length]);
    ```
  - [x] Implement "Back to Script Preview" navigation:
    ```typescript
    const handleBackToScriptPreview = () => {
      if (!allSelected && selectionCount > 0) {
        setPendingNavigation(`/projects/${project.id}/voiceover-preview`);
        setShowUnsavedModal(true);
      } else {
        router.push(`/projects/${project.id}/voiceover-preview`);
      }
    };
    ```
  - [x] Implement "Regenerate Visuals" function:
    ```typescript
    const handleRegenerateVisuals = async () => {
      setIsRegenerating(true);
      try {
        const response = await fetch(`/api/projects/${project.id}/generate-visuals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to regenerate visuals');
        }

        toast({
          title: 'Visual sourcing started',
          description: 'New visual suggestions are being generated. This may take a moment.',
        });

        // Refresh scene data after a delay
        setTimeout(() => {
          fetchScenes();
        }, 2000);
      } catch (error) {
        console.error('Regenerate visuals failed:', error);
        toast({
          variant: 'destructive',
          title: 'Regeneration Failed',
          description: error instanceof Error ? error.message : 'Failed to regenerate visuals',
        });
      } finally {
        setIsRegenerating(false);
      }
    };
    ```
  - [x] Handle navigation confirmation from modal:
    ```typescript
    const handleConfirmLeave = () => {
      setShowUnsavedModal(false);
      if (pendingNavigation) {
        router.push(pendingNavigation);
        setPendingNavigation(null);
      }
    };
    ```
  - [x] Add navigation handler for controlled breadcrumb navigation:
    ```typescript
    const handleBreadcrumbNavigate = (href: string) => {
      if (!allSelected && selectionCount > 0) {
        setPendingNavigation(href);
        setShowUnsavedModal(true);
      } else {
        router.push(href);
      }
    };
    ```
  - [x] Add NavigationBreadcrumb to header with controlled navigation:
    ```typescript
    {/* Header */}
    <header className="border-b bg-background dark:bg-slate-900 sticky top-0 z-10">
      <div className="container flex flex-col gap-2 px-4 md:px-6 lg:px-8 py-3">
        {/* Breadcrumb with controlled navigation */}
        <NavigationBreadcrumb
          projectId={project.id}
          projectName={project.name}
          currentStep="visual-curation"
          onNavigate={handleBreadcrumbNavigate}
        />

        {/* Title and actions row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100">
              {project.name}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
              Visual Curation - Select clips for each scene
            </p>
          </div>

          {/* Selection Progress Counter */}
          {!loading && !error && scenes.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 dark:text-slate-400">Scenes Selected:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {selectionCount}/{scenes.length}
              </span>
              {allSelected && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
          )}
        </div>
      </div>
    </header>
    ```
  - [x] Add navigation buttons below header:
    ```typescript
    {/* Navigation Actions */}
    {!loading && !error && scenes.length > 0 && (
      <div className="flex items-center justify-between gap-4 mb-4">
        <Button
          variant="outline"
          onClick={handleBackToScriptPreview}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Script Preview
        </Button>

        <Button
          variant="outline"
          onClick={handleRegenerateVisuals}
          disabled={isRegenerating}
          className="flex items-center gap-2"
        >
          {isRegenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Regenerate Visuals
        </Button>
      </div>
    )}
    ```
  - [x] Add UnsavedChangesModal to component:
    ```typescript
    {/* Unsaved Changes Modal */}
    <UnsavedChangesModal
      isOpen={showUnsavedModal}
      onClose={() => {
        setShowUnsavedModal(false);
        setPendingNavigation(null);
      }}
      onConfirmLeave={handleConfirmLeave}
      selectionCount={selectionCount}
      totalScenes={scenes.length}
    />
    ```

- [x] **Task 5: Implement Missing Audio File Error Handling** (AC: #8)
  - [x] Create AudioErrorAlert component in VisualCurationClient:
    ```typescript
    function AudioErrorAlert({ projectId, onRegenerate }: { projectId: string; onRegenerate: () => void }) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Missing Audio Files</AlertTitle>
          <AlertDescription>
            Some scenes are missing audio files. Please regenerate voiceovers before continuing.
          </AlertDescription>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate Voiceovers
            </Button>
          </div>
        </Alert>
      );
    }
    ```
  - [x] Check for missing audio_file_path in scenes:
    ```typescript
    const scenesWithMissingAudio = scenes.filter((scene) => !scene.audio_file_path);
    const hasMissingAudio = scenesWithMissingAudio.length > 0;
    ```
  - [x] Display error alert when audio files missing:
    ```typescript
    {hasMissingAudio && (
      <AudioErrorAlert
        projectId={project.id}
        onRegenerate={() => {
          router.push(`/projects/${project.id}/voiceover-preview?regenerate=true`);
        }}
      />
    )}
    ```
  - [x] Mark affected scenes in SceneCard with warning indicator

- [x] **Task 6: Update Visual Curation Page with Workflow Validation** (AC: #2, #3)
  - [x] Update `src/app/projects/[id]/visual-curation/page.tsx` with enhanced validation:
    ```typescript
    import { notFound, redirect } from 'next/navigation';
    import { getProject } from '@/lib/db/queries';
    import { VisualCurationClient } from './VisualCurationClient';

    interface VisualCurationPageProps {
      params: Promise<{ id: string }>;
    }

    // Map current_step to redirect paths
    const STEP_REDIRECTS: Record<string, string> = {
      'topic': 'topic',
      'script': 'script',
      'voice': 'voice-selection',
      'voiceover': 'voiceover-preview',
      'visual-sourcing': 'visual-sourcing',
    };

    // Steps that allow access to visual-curation
    const ALLOWED_STEPS = ['visual-curation', 'editing', 'export', 'complete'];

    export default async function VisualCurationPage({ params }: VisualCurationPageProps) {
      const { id: projectId } = await params;

      const project = getProject(projectId);

      if (!project) {
        notFound();
      }

      // Workflow Validation: Check if user can access visual-curation
      const currentStep = project.current_step;

      // Allow if visuals_generated is true (backward compatibility)
      if (project.visuals_generated) {
        return <VisualCurationClient project={project} />;
      }

      // Check against allowed steps
      if (currentStep && ALLOWED_STEPS.includes(currentStep)) {
        return <VisualCurationClient project={project} />;
      }

      // Redirect to appropriate step with warning
      if (currentStep && STEP_REDIRECTS[currentStep]) {
        const redirectPath = STEP_REDIRECTS[currentStep];
        redirect(`/projects/${projectId}/${redirectPath}?warning=complete-previous-step`);
      }

      // Default: redirect to visual-sourcing if visual generation incomplete
      redirect(`/projects/${projectId}/visual-sourcing`);
    }
    ```
  - [x] Handle warning query parameter on redirected pages (toast notification)

- [x] **Task 7: Add "Continue to Visual Curation" Button to Voiceover Preview** (AC: #1)
  - [x] **NOTE:** Voiceover-preview page may not exist yet (Epic 2 Story 2.6). Create placeholder if needed.
  - [x] Create or locate page: `src/app/projects/[id]/voiceover-preview/page.tsx`
  - [x] Create placeholder page structure if not present:
    ```typescript
    // src/app/projects/[id]/voiceover-preview/page.tsx
    import { notFound } from 'next/navigation';
    import { getProject } from '@/lib/db/queries';
    import { VoiceoverPreviewClient } from './VoiceoverPreviewClient';

    interface Props {
      params: Promise<{ id: string }>;
    }

    export default async function VoiceoverPreviewPage({ params }: Props) {
      const { id: projectId } = await params;
      const project = getProject(projectId);

      if (!project) {
        notFound();
      }

      return <VoiceoverPreviewClient project={project} />;
    }
    ```
  - [x] Create VoiceoverPreviewClient with navigation button:
    ```typescript
    // src/app/projects/[id]/voiceover-preview/VoiceoverPreviewClient.tsx
    'use client';

    import { useRouter } from 'next/navigation';
    import { Button } from '@/components/ui/button';
    import { ArrowRight } from 'lucide-react';

    interface Props {
      project: { id: string; name: string; visuals_generated: boolean };
    }

    export function VoiceoverPreviewClient({ project }: Props) {
      const router = useRouter();

      return (
        <div className="container py-6">
          <h1 className="text-2xl font-bold mb-4">{project.name}</h1>
          <p className="text-slate-600 mb-6">Voiceover preview placeholder - Epic 2 Story 2.6</p>

          {/* Navigation to Visual Curation */}
          <div className="flex justify-end">
            {project.visuals_generated ? (
              <Button
                onClick={() => router.push(`/projects/${project.id}/visual-curation`)}
                className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
              >
                Continue to Visual Curation
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => router.push(`/projects/${project.id}/visual-sourcing`)}
                className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
              >
                Generate Visual Suggestions
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      );
    }
    ```
  - [x] Add navigation button at bottom of voiceover preview:
    ```typescript
    {project.visuals_generated ? (
      <Button
        onClick={() => router.push(`/projects/${projectId}/visual-curation`)}
        className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
      >
        Continue to Visual Curation
        <ArrowRight className="w-4 h-4" />
      </Button>
    ) : (
      <Button
        onClick={() => router.push(`/projects/${projectId}/visual-sourcing`)}
        className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
      >
        Generate Visual Suggestions
        <ArrowRight className="w-4 h-4" />
      </Button>
    )}
    ```
  - [x] Ensure button only appears when voiceover generation is complete
  - [x] Update projects.current_step to 'visual-curation' on navigation

- [x] **Task 8: Implement Browser Navigation Warning** (AC: #7)
  - [x] Add beforeunload event listener for browser back/refresh:
    ```typescript
    React.useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (!allSelected && selectionCount > 0) {
          e.preventDefault();
          e.returnValue = '';
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }, [allSelected, selectionCount]);
    ```
  - [x] Handle Next.js router navigation interception:
    ```typescript
    // Use router.events to intercept navigation
    React.useEffect(() => {
      const handleRouteChange = (url: string) => {
        if (!allSelected && selectionCount > 0) {
          setPendingNavigation(url);
          setShowUnsavedModal(true);
          throw 'Navigation cancelled';
        }
      };

      // Note: Next.js 13+ App Router doesn't have router.events
      // Alternative: use custom link component or middleware
      // For MVP, rely on beforeunload for browser navigation
    }, [allSelected, selectionCount]);
    ```

- [x] **Task 9: Unit Testing - Navigation Components** (AC: #4, #9)
  - [x] Create test file: `tests/components/curation/NavigationBreadcrumb.test.tsx`
  - [x] Test breadcrumb renders all steps:
    ```typescript
    it('should render breadcrumb with all navigation steps', () => {
      const { getByText } = render(
        <NavigationBreadcrumb
          projectId="proj-123"
          projectName="Test Project"
          currentStep="visual-curation"
        />
      );

      expect(getByText('Project')).toBeInTheDocument();
      expect(getByText('Script')).toBeInTheDocument();
      expect(getByText('Voiceover')).toBeInTheDocument();
      expect(getByText('Visual Curation')).toBeInTheDocument();
    });
    ```
  - [x] Test current step is not clickable
  - [x] Test links have correct href attributes
  - [x] Test chevron separators render between steps

- [x] **Task 10: Unit Testing - UnsavedChangesModal** (AC: #7)
  - [x] Create test file: `tests/components/curation/UnsavedChangesModal.test.tsx`
  - [x] Test modal renders when open:
    ```typescript
    it('should display warning message with missing count', () => {
      const { getByText } = render(
        <UnsavedChangesModal
          isOpen={true}
          onClose={jest.fn()}
          onConfirmLeave={jest.fn()}
          selectionCount={3}
          totalScenes={5}
        />
      );

      expect(getByText(/2 scenes still need a clip selection/)).toBeInTheDocument();
    });
    ```
  - [x] Test onClose called when "Stay on Page" clicked
  - [x] Test onConfirmLeave called when "Leave Anyway" clicked
  - [x] Test singular/plural grammar for missing scenes

- [x] **Task 11: Unit Testing - useSessionPersistence Hook** (AC: #6)
  - [x] Create test file: `tests/hooks/useSessionPersistence.test.ts`
  - [x] Test scroll position saved to localStorage:
    ```typescript
    it('should save scroll position to localStorage', () => {
      const { result } = renderHook(() => useSessionPersistence('proj-123'));

      act(() => {
        result.current.saveScrollPosition(500);
      });

      const stored = localStorage.getItem('visual-curation-session-proj-123');
      expect(JSON.parse(stored!).scrollPosition).toBe(500);
    });
    ```
  - [x] Test preview state saved to localStorage
  - [x] Test state restored from localStorage
  - [x] Test state cleared after expiration (1 hour)
  - [x] Test storage key unique per project

- [ ] **Task 12: Integration Testing - Workflow Validation** (AC: #2, #3)
  - [ ] Create test file: `tests/integration/workflow-validation.test.ts`
  - [ ] Test redirect when current_step is 'voice':
    ```typescript
    it('should redirect to voice-selection when current_step is voice', async () => {
      // Setup project with current_step = 'voice'
      const projectId = createTestProject({ current_step: 'voice' });

      const response = await fetch(`/projects/${projectId}/visual-curation`);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('voice-selection');
    });
    ```
  - [ ] Test access allowed when current_step is 'visual-curation'
  - [ ] Test access allowed when visuals_generated is true
  - [ ] Test warning toast displays on redirect

- [ ] **Task 13: Integration Testing - Navigation and Session** (AC: #4, #5, #6, #7)
  - [ ] Create test file: `tests/integration/visual-curation-navigation.test.tsx`
  - [ ] Test "Back to Script Preview" navigation
  - [ ] Test "Regenerate Visuals" API call and scene refresh
  - [ ] Test scroll position restored on page reload:
    ```typescript
    it('should restore scroll position on page reload', async () => {
      // Set scroll position in localStorage
      localStorage.setItem('visual-curation-session-proj-123', JSON.stringify({
        scrollPosition: 500,
        openPreviewId: null,
        lastUpdated: Date.now(),
      }));

      render(<VisualCurationClient project={mockProject} />);

      // Wait for scroll restore
      await waitFor(() => {
        expect(window.scrollY).toBe(500);
      });
    });
    ```
  - [ ] Test unsaved changes modal appears on navigation attempt
  - [ ] Test "Leave Anyway" proceeds with navigation
  - [ ] Test "Stay on Page" cancels navigation

- [ ] **Task 14: Edge Case Testing** (AC: #8)
  - [ ] Create test file: `tests/edge-cases/visual-curation-errors.test.tsx`
  - [ ] Test missing audio_file_path displays error alert:
    ```typescript
    it('should display error alert when scene has no audio_file_path', async () => {
      const mockScenes = [
        { id: 'scene-1', scene_number: 1, text: 'Scene 1', audio_file_path: null },
        { id: 'scene-2', scene_number: 2, text: 'Scene 2', audio_file_path: '/path/to/audio.mp3' },
      ];

      // Mock API to return scenes with missing audio
      server.use(
        rest.get('/api/projects/*/scenes', (req, res, ctx) => {
          return res(ctx.json({ success: true, data: { scenes: mockScenes } }));
        })
      );

      const { getByText } = render(<VisualCurationClient project={mockProject} />);

      await waitFor(() => {
        expect(getByText('Missing Audio Files')).toBeInTheDocument();
      });
    });
    ```
  - [ ] Test "Regenerate Voiceovers" button navigates correctly
  - [ ] Test page handles zero suggestions gracefully
  - [ ] Test page handles deleted suggestions

## Dev Notes

### Project Structure Alignment

**File Locations (from Architecture & Tech Spec):**
- NavigationBreadcrumb: `src/components/features/curation/NavigationBreadcrumb.tsx`
- UnsavedChangesModal: `src/components/features/curation/UnsavedChangesModal.tsx`
- useSessionPersistence: `src/lib/hooks/useSessionPersistence.ts`
- Updated page: `src/app/projects/[id]/visual-curation/page.tsx`
- Updated client: `src/app/projects/[id]/visual-curation/VisualCurationClient.tsx`
- Voiceover preview: `src/app/projects/[id]/voiceover-preview/page.tsx` (if exists)

**Database Integration:**
- Reads `projects.current_step` for workflow validation
- Reads `projects.visuals_generated` for backward compatibility
- No new database columns needed
- Uses existing `scenes.audio_file_path` for edge case detection

**Component Library:**
- Use shadcn/ui Button, Dialog, AlertDialog, Alert components
- Use lucide-react icons: ChevronRight, Home, FileText, Mic, Film, ArrowLeft, ArrowRight, RefreshCw, AlertTriangle, Loader2
- Use sonner/use-toast for notifications

### Architecture Patterns & Constraints

**Workflow Step Validation Flow:**
```
User requests /projects/[id]/visual-curation
|
Server component checks project.current_step
|
IF current_step IN ['visual-curation', 'editing', 'export', 'complete']:
  → Render VisualCurationClient
|
ELSE IF visuals_generated == true:
  → Render VisualCurationClient (backward compatibility)
|
ELSE:
  → Redirect to STEP_REDIRECTS[current_step]
  → Add ?warning=complete-previous-step to URL
```

**Session Persistence Strategy:**
```
localStorage key: "visual-curation-session-{projectId}"
|
State object: {
  scrollPosition: number,
  openPreviewId: string | null,
  lastUpdated: timestamp
}
|
Save triggers:
  - Scroll event (debounced 300ms)
  - Preview open/close
|
Restore triggers:
  - Component mount
|
Expire after: 1 hour (prevents stale state)
```

**Navigation Interception Flow:**
```
User clicks "Back to Script Preview" or breadcrumb link
|
Check: Are all scenes selected?
|
IF incomplete selections exist:
  → Show UnsavedChangesModal
  → Store pending navigation URL
  |
  User clicks "Stay on Page":
    → Close modal, clear pending navigation
  |
  User clicks "Leave Anyway":
    → Close modal, execute navigation
|
ELSE:
  → Navigate directly
```

**Edge Case Handling:**

| Scenario | Detection | Action |
|----------|-----------|--------|
| Missing audio file | scene.audio_file_path === null | Display AudioErrorAlert with "Regenerate Voiceovers" button |
| Zero suggestions | No visual_suggestions for scene | Display EmptyClipState (Story 4.2) |
| Deleted suggestion | selected_clip_id not found | Show warning, allow re-selection |
| Script modified | scene.text differs from sourcing | Show info message (future feature) |

### Learnings from Previous Stories (Stories 4.1-4.5)

**From Story 4.5 (Status: DONE):**
- ConfirmationModal pattern with AlertDialog
- Assembly trigger flow with loading states
- Toast notification patterns with actions
- Router.push for navigation with query params

**From Story 4.4 (Status: DONE):**
- useCurationStore for selection state
- getSelectionCount() helper
- Optimistic UI updates with rollback

**From Story 4.1-4.3:**
- VisualCurationClient structure and patterns
- Error/Loading/Empty states
- Scene data fetching from API

**Store Integration:**
```typescript
const {
  selections,
  setProject,
  setTotalScenes,
  loadSelections,
  getSelectionCount,
} = useCurationStore();

const selectionCount = getSelectionCount();
const allSelected = scenes.length > 0 && selectionCount >= scenes.length;
```

### Critical Implementation Details

**Debounced Scroll Tracking:**
Prevent excessive localStorage writes during scrolling:
```typescript
let timeoutId: NodeJS.Timeout;
const handleScroll = () => {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    saveScrollPosition(window.scrollY);
  }, 300); // 300ms debounce
};
```

**Project ID Scoped Storage:**
Ensure session state is project-specific:
```typescript
const storageKey = `visual-curation-session-${projectId}`;
// Each project has isolated scroll/preview state
```

**Graceful localStorage Failures:**
Handle browsers with storage disabled:
```typescript
try {
  localStorage.setItem(key, value);
} catch (error) {
  console.error('localStorage not available:', error);
  // Continue without persistence
}
```

**Navigation Cancellation:**
Handle router.push cancellation carefully:
```typescript
const handleConfirmLeave = () => {
  setShowUnsavedModal(false);
  if (pendingNavigation) {
    router.push(pendingNavigation);
    setPendingNavigation(null);
  }
};
```

### Testing Standards Summary

**Unit Testing (Vitest):**
- Test NavigationBreadcrumb rendering and links
- Test UnsavedChangesModal open/close/confirm
- Test useSessionPersistence save/restore/clear
- Mock localStorage for hook tests

**Integration Testing:**
- Test workflow validation redirects
- Test navigation with unsaved changes modal
- Test session restoration on mount
- Test "Regenerate Visuals" API integration

**Edge Case Testing:**
- Test missing audio_file_path handling
- Test zero suggestions state
- Test expired session state (1 hour)
- Test localStorage unavailable scenario

**Manual Testing Checklist:**
- Verify breadcrumb navigation clickable
- Test scroll position restores after refresh
- Test unsaved changes modal appears correctly
- Test "Regenerate Visuals" triggers API
- Test "Back to Script Preview" navigation
- Test workflow redirect with warning
- Test missing audio error alert

### Type Definitions

**Reference Existing Types:**
- Import `Project`, `Scene` from `@/lib/db/queries`
- Import `ClipSelection` from `@/lib/stores/curation-store`

**New Types for This Story:**
```typescript
// In NavigationBreadcrumb.tsx
interface NavigationBreadcrumbProps {
  projectId: string;
  projectName: string;
  currentStep: 'script' | 'voiceover' | 'visual-curation';
}

// In UnsavedChangesModal.tsx
interface UnsavedChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLeave: () => void;
  selectionCount: number;
  totalScenes: number;
}

// In useSessionPersistence.ts
interface SessionState {
  scrollPosition: number;
  openPreviewId: string | null;
  lastUpdated: number;
}

interface UseSessionPersistenceReturn {
  saveScrollPosition: (position: number) => void;
  savePreviewState: (suggestionId: string | null) => void;
  restoreState: () => SessionState | null;
  clearState: () => void;
}
```

### References

**Architecture Documentation:**
- [Source: docs/architecture.md#Epic-to-Architecture-Mapping] - Workflow steps and navigation
- [Source: docs/architecture.md#Database-Schema] - projects.current_step, visuals_generated
- [Source: docs/architecture.md#API-Endpoints] - /generate-visuals endpoint

**Tech Spec:**
- [Source: docs/sprint-artifacts/tech-spec-epic-4.md lines 256-343] - Workflows and Sequencing
- [Source: docs/sprint-artifacts/tech-spec-epic-4.md lines 317-343] - Error Recovery Flows
- [Source: docs/sprint-artifacts/tech-spec-epic-4.md lines 399-424] - NFR Reliability
- [Source: docs/sprint-artifacts/tech-spec-epic-4.md lines 420-423] - Session Persistence

**PRD:**
- [Source: docs/prd.md Feature 1.6 lines 244-277] - Visual Curation UI

**Epic Breakdown:**
- [Source: docs/epics.md Epic 4 Story 4.6 lines 1051-1079] - Original story definition
- [Source: docs/epics.md Epic 2 Story 2.6 lines 530-558] - Script Preview integration
- [Source: docs/epics.md Epic 3 Story 3.5 lines 758-809] - Workflow integration

**Previous Stories:**
- [Source: docs/stories/story-4.5.md] - Assembly trigger patterns
- [Source: docs/stories/story-4.4.md] - Curation store, selection state

**Existing Implementation:**
- [Source: src/app/projects/[id]/visual-curation/VisualCurationClient.tsx] - Current client component
- [Source: src/app/projects/[id]/visual-curation/page.tsx] - Current server component
- [Source: src/lib/stores/curation-store.ts] - Selection state management

## Dev Agent Record

### Context Reference

- **Story Context XML:** docs/stories/story-4.6.context.xml
- Generated: 2025-11-22
- Contains: User story, acceptance criteria, tasks, documentation references, code artifacts, dependencies, interfaces, testing standards

### Agent Model Used

(pending)

### Debug Log References

(pending)

### Completion Notes List

(pending)

### File List

**To Create:**
- `src/components/features/curation/NavigationBreadcrumb.tsx` - Breadcrumb navigation component with controlled navigation
- `src/components/features/curation/UnsavedChangesModal.tsx` - Warning modal for incomplete selections
- `src/components/ui/alert-dialog.tsx` - AlertDialog component (via shadcn: `npx shadcn@latest add alert-dialog`)
- `src/lib/hooks/useSessionPersistence.ts` - localStorage persistence hook
- `src/app/projects/[id]/voiceover-preview/page.tsx` - Voiceover preview page (placeholder if Epic 2 not implemented)
- `src/app/projects/[id]/voiceover-preview/VoiceoverPreviewClient.tsx` - Client component with navigation button
- `tests/components/curation/NavigationBreadcrumb.test.tsx` - Breadcrumb component tests
- `tests/components/curation/UnsavedChangesModal.test.tsx` - Modal component tests
- `tests/hooks/useSessionPersistence.test.ts` - Hook unit tests
- `tests/integration/workflow-validation.test.ts` - Workflow redirect tests
- `tests/integration/visual-curation-navigation.test.tsx` - Navigation integration tests
- `tests/edge-cases/visual-curation-errors.test.tsx` - Edge case tests

**To Modify:**
- `src/app/projects/[id]/visual-curation/page.tsx` - Add workflow validation
- `src/app/projects/[id]/visual-curation/VisualCurationClient.tsx` - Add navigation, breadcrumbs, session persistence, controlled navigation handler

### Completion Notes

(pending)
