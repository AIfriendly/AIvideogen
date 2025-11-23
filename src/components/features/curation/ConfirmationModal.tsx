/**
 * ConfirmationModal Component - Epic 4, Story 4.5
 *
 * Modal dialog for confirming video assembly action.
 * Displays scene count and selection summary before triggering assembly.
 *
 * Features:
 * - Uses shadcn/ui Dialog component
 * - Displays scene count confirmation
 * - Cancel and Confirm buttons with loading states
 * - Disables actions while loading
 */

'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';
import { type ClipSelection } from '@/lib/stores/curation-store';

/**
 * Props for ConfirmationModal component
 */
export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  sceneCount: number;
  selections: Map<string, ClipSelection>;
}

/**
 * ConfirmationModal Component
 *
 * Displays a confirmation dialog before triggering video assembly.
 * Shows the number of scenes and prompts user to confirm their selections.
 *
 * @param isOpen - Whether the modal is visible
 * @param onClose - Callback to close the modal
 * @param onConfirm - Callback to confirm assembly
 * @param isLoading - Whether assembly is in progress
 * @param sceneCount - Number of scenes to be assembled
 * @param selections - Map of scene selections
 * @returns Confirmation modal dialog
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  sceneCount,
  selections,
}: ConfirmationModalProps) {
  // Handle dialog close - prevent closing while loading
  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Ready to Assemble?</DialogTitle>
          <DialogDescription className="text-slate-400">
            This will create your final video with the selected clips.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-slate-300">
            <strong className="text-white">{sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}</strong> will be assembled with your selected clips.
          </p>

          {/* Selection summary */}
          {selections.size > 0 && (
            <p className="text-xs text-slate-400 mt-2">
              All {selections.size} clip selections have been saved and will be used in the final video.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Assembling...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Confirm Assembly
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
