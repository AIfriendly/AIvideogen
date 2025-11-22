'use client';

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

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLeave: () => void;
  selectionCount: number;
  totalScenes: number;
}

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
            You haven&apos;t selected clips for all scenes.
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
