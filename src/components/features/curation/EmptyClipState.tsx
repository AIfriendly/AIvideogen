/**
 * EmptyClipState Component - Epic 4, Story 4.2
 *
 * Displays an empty state message when a scene has zero visual suggestions.
 * Provides guidance to the user and a retry button to re-run visual sourcing.
 *
 * Features:
 * - Informative message about why suggestions might be missing
 * - Retry button to trigger visual sourcing again
 * - Centered layout with icon
 * - Responsive design
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

/**
 * Props for EmptyClipState component
 */
interface EmptyClipStateProps {
  sceneNumber: number;
  onRetry: () => void;
  className?: string;
}

/**
 * EmptyClipState Component
 *
 * Displays when a scene has no visual suggestions.
 * Provides user guidance and retry functionality.
 *
 * @param sceneNumber - Scene number for display
 * @param onRetry - Callback function for retry button
 * @param className - Optional additional CSS classes
 * @returns Empty state component
 */
export function EmptyClipState({
  sceneNumber,
  onRetry,
  className,
}: EmptyClipStateProps) {
  return (
    <Card className={`border-dashed ${className || ''}`}>
      <CardContent className="flex flex-col items-center justify-center py-8 md:py-12 px-4">
        {/* Icon */}
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-full p-4 md:p-6 mb-4">
          <AlertCircle className="w-10 h-10 md:w-12 md:h-12 text-orange-600 dark:text-orange-400" />
        </div>

        {/* Title */}
        <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 text-center">
          No clips found for Scene {sceneNumber}
        </h3>

        {/* Message */}
        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 text-center max-w-md mb-6">
          No clips found for this scene. The script may be too abstract or specific. Try
          editing the script text.
        </p>

        {/* Retry Button */}
        <Button
          onClick={onRetry}
          variant="outline"
          className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          Retry Visual Sourcing
        </Button>
      </CardContent>
    </Card>
  );
}
