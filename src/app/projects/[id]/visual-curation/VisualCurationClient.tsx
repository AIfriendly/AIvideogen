/**
 * Visual Curation Client Component - Epic 4, Story 4.1
 *
 * Client-side component for the visual curation page.
 * Handles data fetching, loading states, error handling, and scene display.
 *
 * Features:
 * - Fetches scenes from API
 * - Loading state with skeleton components
 * - Error handling with retry button
 * - Empty state when no scenes
 * - Responsive container layout
 * - Scene-by-scene card display
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { type Project, type Scene } from '@/lib/db/queries';
import { type VisualSuggestion } from '@/types/visual-suggestions';
import { SceneCard } from '@/components/features/curation/SceneCard';
import { VideoPreviewPlayer } from '@/components/features/curation/VideoPreviewPlayer';
import { AssemblyTriggerButton } from '@/components/features/curation/AssemblyTriggerButton';
import { ConfirmationModal } from '@/components/features/curation/ConfirmationModal';
import { NavigationBreadcrumb } from '@/components/features/curation/NavigationBreadcrumb';
import { UnsavedChangesModal } from '@/components/features/curation/UnsavedChangesModal';
import { useSessionPersistence } from '@/lib/hooks/useSessionPersistence';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, ArrowLeft, RefreshCw, AlertTriangle, Loader2, Download } from 'lucide-react';
import { useCurationStore, type ClipSelection } from '@/lib/stores/curation-store';
import { toast } from '@/hooks/use-toast';

/**
 * Props for VisualCurationClient
 */
interface VisualCurationClientProps {
  project: Project;
}

/**
 * API Response type for scenes endpoint
 */
interface ScenesApiResponse {
  success: boolean;
  data?: {
    scenes: Scene[];
  };
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Loading Skeleton Component
 *
 * Displays skeleton placeholders while scenes are loading.
 * Shows 3 skeleton cards to indicate loading state.
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 md:w-10 md:h-10 rounded-full" />
              <Skeleton className="w-24 h-6 md:w-32 md:h-7" />
            </div>
            <Skeleton className="w-12 h-5 md:w-16 md:h-6" />
          </div>
          <Skeleton className="w-full h-16 md:h-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty State Component
 *
 * Displays a message when no scenes are found for the project.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 px-4">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-6 md:p-8 mb-4 md:mb-6">
        <svg
          className="w-12 h-12 md:w-16 md:h-16 text-slate-400 dark:text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        No Scenes Found
      </h3>
      <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 text-center max-w-md">
        This project doesn't have any scenes yet. Please generate a script first to create scenes.
      </p>
    </div>
  );
}

/**
 * Error State Component
 *
 * Displays error message with retry button when scene fetching fails.
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 px-4">
      <div className="bg-red-50 dark:bg-red-900/20 rounded-full p-6 md:p-8 mb-4 md:mb-6">
        <svg
          className="w-12 h-12 md:w-16 md:h-16 text-red-600 dark:text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Failed to Load Scenes
      </h3>
      <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 text-center max-w-md mb-6">
        {message}
      </p>
      <Button onClick={onRetry} className="bg-blue-600 hover:bg-blue-700">
        Try Again
      </Button>
    </div>
  );
}

/**
 * Visual Curation Client Component
 *
 * Main client component for visual curation page.
 * Fetches and displays scenes with loading/error states.
 *
 * @param project - Project data from server
 * @returns Visual curation interface
 */
export function VisualCurationClient({ project }: VisualCurationClientProps) {
  const router = useRouter();
  const [scenes, setScenes] = React.useState<Scene[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = React.useState<VisualSuggestion | null>(null);

  // Assembly modal state
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [isAssembling, setIsAssembling] = React.useState(false);

  // Story 4.6: Navigation and session state
  const [showUnsavedModal, setShowUnsavedModal] = React.useState(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = React.useState(false);

  // Download selected clips state
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Get curation store state and actions
  const {
    selections,
    setProject,
    setTotalScenes,
    loadSelections,
    getSelectionCount,
  } = useCurationStore();

  const selectionCount = getSelectionCount();
  const allSelected = scenes.length > 0 && selectionCount >= scenes.length;

  // Story 4.6: Check for scenes with missing audio
  const scenesWithMissingAudio = scenes.filter((scene) => !scene.audio_file_path);
  const hasMissingAudio = scenesWithMissingAudio.length > 0;

  // Story 4.6: Session persistence
  const {
    saveScrollPosition,
    restoreState,
  } = useSessionPersistence(project.id);

  // Handle assemble button click - open modal
  const handleAssembleClick = React.useCallback(() => {
    setShowConfirmModal(true);
  }, []);

  // Handle assembly confirmation
  const handleConfirmAssembly = React.useCallback(async () => {
    setIsAssembling(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/assemble`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Assembly failed');
      }

      const data = await response.json();

      // Success toast
      toast({
        title: 'Video assembly started!',
        description: `Job ${data.assemblyJobId} has been queued for processing.`,
      });

      // Navigate to assembly status page
      router.push(`/projects/${project.id}/assembly?jobId=${data.assemblyJobId}`);
    } catch (error) {
      console.error('Assembly failed:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to start assembly';

      // Error toast with retry action
      toast({
        variant: 'destructive',
        title: 'Assembly Failed',
        description: errorMessage,
      });
    } finally {
      setIsAssembling(false);
      setShowConfirmModal(false);
    }
  }, [project.id, router]);

  // Handle suggestion click - open preview
  const handleSuggestionClick = React.useCallback((suggestion: VisualSuggestion) => {
    setSelectedSuggestion(suggestion);
  }, []);

  // Handle closing preview
  const handleClosePreview = React.useCallback(() => {
    setSelectedSuggestion(null);
  }, []);

  // Story 4.6: Handle back to script preview navigation
  const handleBackToScriptPreview = React.useCallback(() => {
    if (!allSelected && selectionCount > 0) {
      setPendingNavigation(`/projects/${project.id}/voiceover-preview`);
      setShowUnsavedModal(true);
    } else {
      router.push(`/projects/${project.id}/voiceover-preview`);
    }
  }, [allSelected, selectionCount, project.id, router]);

  // Story 4.6: Handle breadcrumb navigation
  const handleBreadcrumbNavigate = React.useCallback((href: string) => {
    if (!allSelected && selectionCount > 0) {
      setPendingNavigation(href);
      setShowUnsavedModal(true);
    } else {
      router.push(href);
    }
  }, [allSelected, selectionCount, router]);

  // Story 4.6: Handle regenerate visuals
  const handleRegenerateVisuals = React.useCallback(async () => {
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
  }, [project.id]);

  // Handle download selected clips
  const handleDownloadSelected = React.useCallback(async () => {
    if (selectionCount === 0) {
      toast({
        variant: 'destructive',
        title: 'No Clips Selected',
        description: 'Please select at least one clip before downloading.',
      });
      return;
    }

    setIsDownloading(true);
    try {
      // Get selected suggestion IDs from the store
      const suggestionIds = Array.from(selections.values()).map((s) => s.suggestionId);

      const response = await fetch(`/api/projects/${project.id}/download-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start downloads');
      }

      const data = await response.json();

      toast({
        title: 'Downloads Started',
        description: `Downloading ${data.queued} selected clip${data.queued !== 1 ? 's' : ''}. This may take a moment.`,
      });

      // Refresh scene data after a delay to show updated download status
      setTimeout(() => {
        fetchScenes();
      }, 3000);
    } catch (error) {
      console.error('Download selected clips failed:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download clips',
      });
    } finally {
      setIsDownloading(false);
    }
  }, [project.id, selectionCount, selections]);

  // Story 4.6: Handle navigation confirmation from modal
  const handleConfirmLeave = React.useCallback(() => {
    setShowUnsavedModal(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, router]);

  // Initialize curation store with project
  React.useEffect(() => {
    setProject(project.id);
  }, [project.id, setProject]);

  // Update total scenes when scenes are loaded
  React.useEffect(() => {
    if (scenes.length > 0) {
      setTotalScenes(scenes.length);

      // Load existing selections from database
      const selectionsFromDB: ClipSelection[] = scenes
        .filter((scene) => scene.selected_clip_id)
        .map((scene) => ({
          sceneId: scene.id,
          suggestionId: scene.selected_clip_id!,
          videoId: '', // Will be populated when suggestions are loaded
        }));

      if (selectionsFromDB.length > 0) {
        loadSelections(selectionsFromDB);
      }
    }
  }, [scenes, setTotalScenes, loadSelections]);

  /**
   * Fetch scenes from API
   */
  const fetchScenes = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${project.id}/scenes`);
      const data: ScenesApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to fetch scenes');
      }

      setScenes(data.data?.scenes || []);
    } catch (err) {
      console.error('Error fetching scenes:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  // Fetch scenes on mount
  React.useEffect(() => {
    fetchScenes();
  }, [fetchScenes]);

  // Story 4.6: Scroll position tracking with debounce
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

  // Story 4.6: Restore scroll position on mount
  React.useEffect(() => {
    if (scenes.length === 0) return;

    const state = restoreState();
    if (state && state.scrollPosition > 0) {
      setTimeout(() => {
        window.scrollTo(0, state.scrollPosition);
      }, 100);
    }
  }, [scenes.length, restoreState]);

  // Story 4.6: Browser beforeunload warning
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

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background dark:bg-slate-900 sticky top-0 z-10">
        <div className="container flex flex-col gap-2 px-4 md:px-6 lg:px-8 py-3">
          {/* Story 4.6: Breadcrumb */}
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

      {/* Main Content - pb-24 accounts for sticky footer */}
      <main className="flex flex-1 flex-col p-4 md:p-6 lg:p-8 pb-24 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto w-full">
          {/* Story 4.6: Navigation Actions */}
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

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadSelected}
                  disabled={isDownloading || selectionCount === 0}
                  className="flex items-center gap-2"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download Selected ({selectionCount})
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
            </div>
          )}

          {/* Story 4.6: Missing Audio Alert */}
          {!loading && !error && hasMissingAudio && (
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
                  onClick={() => {
                    router.push(`/projects/${project.id}/voiceover-preview?regenerate=true`);
                  }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Voiceovers
                </Button>
              </div>
            </Alert>
          )}

          {/* Loading State */}
          {loading && <LoadingSkeleton />}

          {/* Error State */}
          {!loading && error && <ErrorState message={error} onRetry={fetchScenes} />}

          {/* Empty State */}
          {!loading && !error && scenes.length === 0 && <EmptyState />}

          {/* Scenes List */}
          {!loading && !error && scenes.length > 0 && (
            <div className="space-y-4 md:space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-blue-800 dark:text-blue-300">
                  <strong>Review each scene below.</strong> Browse the AI-suggested video clips for each scene.
                  Click on a clip to preview it, then select your favorite to include in the final video.
                </p>
              </div>

              {scenes.map((scene) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  projectId={project.id}
                  onSuggestionClick={handleSuggestionClick}
                />
              ))}

              <div className="pt-4 md:pt-6 border-t">
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 text-center">
                  Total Scenes: <strong>{scenes.length}</strong> | Total Duration:{' '}
                  <strong>
                    {Math.floor(
                      scenes.reduce((sum, s) => sum + (s.duration || 0), 0)
                    )}s
                  </strong>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Video Preview Dialog - Story 4.3 */}
      <Dialog
        open={selectedSuggestion !== null}
        onOpenChange={(open) => {
          if (!open) {
            handleClosePreview();
          }
        }}
      >
        <DialogContent className="max-w-[800px] w-[95vw] p-6 bg-slate-800 border-slate-700">
          <DialogTitle className="sr-only">
            {selectedSuggestion?.title || 'Video Preview'}
          </DialogTitle>
          {selectedSuggestion && (
            <VideoPreviewPlayer
              suggestionId={selectedSuggestion.id}
              projectId={project.id}
              videoId={selectedSuggestion.videoId}
              title={selectedSuggestion.title}
              channelTitle={selectedSuggestion.channelTitle || ''}
              segmentPath={selectedSuggestion.defaultSegmentPath || null}
              downloadStatus={selectedSuggestion.downloadStatus}
              onClose={handleClosePreview}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Assembly Trigger Button - Story 4.5 */}
      {!loading && !error && scenes.length > 0 && (
        <AssemblyTriggerButton
          onAssembleClick={handleAssembleClick}
          isLoading={isAssembling}
        />
      )}

      {/* Confirmation Modal - Story 4.5 */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmAssembly}
        isLoading={isAssembling}
        sceneCount={scenes.length}
        selections={selections}
      />

      {/* Story 4.6: Unsaved Changes Modal */}
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
    </div>
  );
}
