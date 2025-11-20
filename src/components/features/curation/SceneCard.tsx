/**
 * SceneCard Component - Epic 4, Story 4.1 & 4.2
 *
 * Displays a single scene with its script text and metadata.
 * Used in the visual curation page to show scenes in a scene-by-scene layout.
 *
 * Features:
 * - Scene number badge
 * - Script text display
 * - Duration display (formatted from seconds)
 * - Visual suggestion gallery (Story 4.2)
 * - Responsive text sizing
 * - Card-based layout using shadcn/ui
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Scene } from '@/lib/db/queries';
import { type VisualSuggestion } from '@/types/visual-suggestions';
import { VisualSuggestionGallery } from './VisualSuggestionGallery';

/**
 * Props for SceneCard component
 */
interface SceneCardProps {
  scene: Scene;
  projectId: string; // Added in Story 4.2 for VisualSuggestionGallery
  className?: string;
  onSuggestionClick?: (suggestion: VisualSuggestion) => void; // Story 4.3
}

/**
 * Format duration from seconds to human-readable format
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "5.2s", "1m 23s")
 */
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) {
    return 'No audio';
  }

  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * SceneCard Component
 *
 * Displays a single scene with its number, text, duration, and visual suggestions.
 * Designed for the visual curation workflow.
 *
 * @param scene - Scene data from database
 * @param projectId - Project identifier for fetching visual suggestions
 * @param className - Optional additional CSS classes
 * @returns Scene card component
 */
export function SceneCard({ scene, projectId, className, onSuggestionClick }: SceneCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600 text-white text-sm md:text-base font-bold">
              {scene.scene_number}
            </span>
            <span className="text-slate-900 dark:text-slate-100">
              Scene {scene.scene_number}
            </span>
          </CardTitle>
          <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
            {formatDuration(scene.duration)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          {scene.text}
        </p>

        {/* Visual Separator and Suggestion Gallery - Story 4.2 */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <VisualSuggestionGallery
            projectId={projectId}
            sceneId={scene.id}
            sceneNumber={scene.scene_number}
            onSuggestionClick={onSuggestionClick}
          />
        </div>
      </CardContent>
    </Card>
  );
}
