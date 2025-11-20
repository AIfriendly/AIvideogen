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
import { type Project, type Scene } from '@/lib/db/queries';
import { type VisualSuggestion } from '@/types/visual-suggestions';
import { SceneCard } from '@/components/features/curation/SceneCard';
import { VideoPreviewPlayer } from '@/components/features/curation/VideoPreviewPlayer';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [scenes, setScenes] = React.useState<Scene[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = React.useState<VisualSuggestion | null>(null);

  // Handle suggestion click - open preview
  const handleSuggestionClick = React.useCallback((suggestion: VisualSuggestion) => {
    setSelectedSuggestion(suggestion);
  }, []);

  // Handle closing preview
  const handleClosePreview = React.useCallback(() => {
    setSelectedSuggestion(null);
  }, []);

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

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background dark:bg-slate-900 sticky top-0 z-10">
        <div className="container flex h-16 items-center gap-4 px-4 md:px-6 lg:px-8">
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100">
              {project.name}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
              Visual Curation - Select clips for each scene
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col p-4 md:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto w-full">
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
              suggestion={selectedSuggestion}
              projectId={project.id}
              onClose={handleClosePreview}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
