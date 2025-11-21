/**
 * AssemblyTriggerButton Component - Epic 4, Story 4.5
 *
 * Sticky footer button that triggers video assembly.
 * Displays selection progress and validates all scenes have selections.
 *
 * Features:
 * - Fixed position sticky footer
 * - Disabled state when selections incomplete
 * - Tooltip via title attribute for disabled state
 * - Loading state with spinner
 * - Selection progress indicator
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Film, Loader2 } from 'lucide-react';
import { useCurationStore } from '@/lib/stores/curation-store';

/**
 * Props for AssemblyTriggerButton component
 */
export interface AssemblyTriggerButtonProps {
  onAssembleClick: () => void;
  isLoading: boolean;
}

/**
 * AssemblyTriggerButton Component
 *
 * Displays a sticky footer with the "Assemble Video" button.
 * Shows selection progress and enables/disables based on completion status.
 *
 * @param onAssembleClick - Callback when button is clicked
 * @param isLoading - Whether assembly is in progress
 * @returns Sticky footer with assembly trigger button
 */
export function AssemblyTriggerButton({
  onAssembleClick,
  isLoading,
}: AssemblyTriggerButtonProps) {
  // Get selection state from store
  const selections = useCurationStore((state) => state.selections);
  const totalScenes = useCurationStore((state) => state.totalScenes);

  const selectionCount = selections.size;
  const allSelected = selectionCount === totalScenes && totalScenes > 0;
  const missingCount = totalScenes - selectionCount;

  // Tooltip message for disabled state
  const tooltipMessage = !allSelected
    ? `Select clips for all ${totalScenes} scenes to continue`
    : undefined;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-700 p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Selection progress indicator */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300">
            <strong className="text-white">{selectionCount}/{totalScenes}</strong> scenes selected
          </span>
          {!allSelected && missingCount > 0 && (
            <span className="text-xs text-slate-400">
              ({missingCount} remaining)
            </span>
          )}
        </div>

        {/* Assemble button with tooltip via title attribute */}
        <Button
          disabled={!allSelected || isLoading}
          onClick={onAssembleClick}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:opacity-50"
          title={tooltipMessage}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Assembling...
            </>
          ) : (
            <>
              <Film className="h-4 w-4" />
              Assemble Video
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
