/**
 * VisualSuggestionGallery Component - Epic 4, Story 4.2
 *
 * Displays AI-generated visual suggestions for a specific scene in a responsive grid layout.
 * Fetches suggestions from the API, handles loading/error states, and shows empty state when needed.
 *
 * Features:
 * - Fetches suggestions for a specific scene from API
 * - Displays suggestions in a 2-3 column responsive grid
 * - Loading state with skeleton placeholders
 * - Error handling with retry functionality
 * - Empty state when no suggestions exist
 * - Suggestions sorted by rank (1-8)
 */

'use client';

import * as React from 'react';
import {
  type VisualSuggestion,
  filterSuggestionsByCVScore,
  getFilteredSuggestionsCount
} from '@/types/visual-suggestions';
import { SuggestionCard } from './SuggestionCard';
import { EmptyClipState } from './EmptyClipState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, EyeOff } from 'lucide-react';
import { useCurationStore } from '@/lib/stores/curation-store';
import { toast } from '@/hooks/use-toast';

/**
 * Props for VisualSuggestionGallery component
 */
interface VisualSuggestionGalleryProps {
  projectId: string;
  sceneId: string;
  sceneNumber: number;
  className?: string;
  onSuggestionClick?: (suggestion: VisualSuggestion) => void;
}

/**
 * API Response type for visual suggestions endpoint
 */
interface VisualSuggestionsApiResponse {
  suggestions: VisualSuggestion[];
  totalScenes: number;
  scenesWithSuggestions: number;
}

/**
 * Loading Skeleton Component
 *
 * Displays skeleton placeholders in grid layout while suggestions are loading.
 * Shows 6 skeleton cards to match typical suggestion count.
 */
function LoadingSkeleton() {
  return (
    <div>
      <div className="mb-3">
        <Skeleton className="w-40 h-5" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-3">
            {/* Thumbnail skeleton */}
            <Skeleton className="w-full aspect-video rounded-lg" />
            {/* Title skeleton */}
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-3/4 h-4" />
            {/* Metadata skeleton */}
            <div className="flex justify-between items-center">
              <Skeleton className="w-20 h-3" />
              <Skeleton className="w-12 h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Error State Component
 *
 * Displays error message with retry button when suggestion fetching fails.
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 md:py-12 px-4 border border-dashed rounded-lg bg-red-50/50 dark:bg-red-900/10">
      <div className="bg-red-50 dark:bg-red-900/20 rounded-full p-4 md:p-6 mb-4">
        <AlertCircle className="w-10 h-10 md:w-12 md:h-12 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 text-center">
        Failed to Load Video Suggestions
      </h3>
      <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 text-center max-w-md mb-6">
        {message}
      </p>
      <Button
        onClick={onRetry}
        variant="outline"
        className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        Retry
      </Button>
    </div>
  );
}

/**
 * Filtered Suggestions Info Component
 *
 * Story 3.7b AC66: Displays count of filtered low-quality videos
 * Shows a subtle indicator when videos have been hidden due to low CV scores
 */
function FilteredSuggestionsInfo({ filteredCount }: { filteredCount: number }) {
  if (filteredCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <EyeOff className="w-3 h-3" aria-hidden="true" />
      <span>
        {filteredCount} low-quality video{filteredCount !== 1 ? 's' : ''} filtered
      </span>
    </div>
  );
}

/**
 * VisualSuggestionGallery Component
 *
 * Main gallery component that fetches and displays visual suggestions for a scene.
 * Handles all loading, error, and empty states.
 *
 * @param projectId - Project identifier for API calls
 * @param sceneId - Scene identifier for filtering suggestions
 * @param sceneNumber - Scene number for display
 * @param className - Optional additional CSS classes
 * @returns Visual suggestion gallery component
 */
export function VisualSuggestionGallery({
  projectId,
  sceneId,
  sceneNumber,
  className,
  onSuggestionClick,
}: VisualSuggestionGalleryProps) {
  const [suggestions, setSuggestions] = React.useState<VisualSuggestion[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Get selection state from store
  const { selections, selectClip } = useCurationStore();
  const currentSelection = selections.get(sceneId);

  /**
   * Handle clip selection with toast notifications
   */
  const handleSelectClip = React.useCallback((suggestion: VisualSuggestion) => {
    selectClip(
      sceneId,
      suggestion.id,
      suggestion.videoId,
      (error) => {
        // Error callback for toast notification
        toast({
          variant: 'destructive',
          title: 'Selection Failed',
          description: error.message || 'Failed to save selection. Please try again.',
        });
      }
    );

    // Optimistic success toast
    toast({
      title: 'Clip Selected',
      description: `Selected "${suggestion.title}" for Scene ${sceneNumber}`,
    });
  }, [sceneId, sceneNumber, selectClip]);

  /**
   * Fetch suggestions from API
   */
  const fetchSuggestions = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/visual-suggestions?sceneId=${sceneId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
      }

      const data: VisualSuggestionsApiResponse = await response.json();

      // Filter suggestions for this specific scene and sort by rank
      const sceneSuggestions = (data.suggestions || [])
        .filter((s) => s.sceneId === sceneId)
        .sort((a, b) => a.rank - b.rank);

      setSuggestions(sceneSuggestions);
      console.log(
        `[VisualSuggestionGallery] Loaded ${sceneSuggestions.length} suggestions for scene ${sceneNumber}`
      );
    } catch (err) {
      console.error('[VisualSuggestionGallery] Error fetching suggestions:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load video suggestions. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, sceneId, sceneNumber]);

  /**
   * Handle retry for visual sourcing
   * Note: Full implementation in Story 4.6 (regenerate endpoint)
   * For now, just re-fetch existing suggestions and show toast
   */
  const handleRetry = React.useCallback(async () => {
    console.log(
      `[VisualSuggestionGallery] Retry requested for scene ${sceneNumber} (placeholder for Story 4.6)`
    );

    // TODO Story 4.6: Call POST /api/projects/[projectId]/scenes/[sceneId]/regenerate-visuals
    // For now, just refetch existing suggestions
    await fetchSuggestions();
  }, [sceneNumber, fetchSuggestions]);

  // Fetch suggestions on mount
  React.useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return (
    <div className={className}>
      {/* Loading State */}
      {loading && <LoadingSkeleton />}

      {/* Error State */}
      {!loading && error && <ErrorState message={error} onRetry={fetchSuggestions} />}

      {/* Empty State */}
      {!loading && !error && suggestions.length === 0 && (
        <EmptyClipState sceneNumber={sceneNumber} onRetry={handleRetry} />
      )}

      {/* Suggestions Grid */}
      {!loading && !error && suggestions.length > 0 && (() => {
        // Story 3.7b: Filter suggestions by CV score (AC64, AC65)
        const visibleSuggestions = filterSuggestionsByCVScore(suggestions);
        const filteredCount = getFilteredSuggestionsCount(suggestions);

        return (
          <div>
            {/* Header with filtered count */}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Suggested Video Clips ({visibleSuggestions.length})
              </h3>
              {/* Story 3.7b AC66: Show filtered count */}
              <FilteredSuggestionsInfo filteredCount={filteredCount} />
            </div>

            {/* Grid - only show visible (filtered) suggestions */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  isSelected={currentSelection?.suggestionId === suggestion.id}
                  onSelect={() => handleSelectClip(suggestion)}
                  onClick={() => onSuggestionClick?.(suggestion)}
                />
              ))}
            </div>

            {/* Show empty state if all suggestions were filtered */}
            {visibleSuggestions.length === 0 && filteredCount > 0 && (
              <div className="py-8 text-center">
                <EyeOff className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  All {filteredCount} suggestion{filteredCount !== 1 ? 's were' : ' was'} filtered due to low quality.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Try regenerating visuals for better results.
                </p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
