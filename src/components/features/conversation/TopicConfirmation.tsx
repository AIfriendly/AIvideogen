/**
 * TopicConfirmation Dialog Component - Story 1.7
 *
 * Modal dialog for confirming or editing the detected video topic.
 * Displays extracted topic and provides Confirm/Edit actions.
 *
 * User Stories:
 * - AC1: Dialog appears when video creation command detected
 * - AC2: Topic displayed clearly for user review
 * - AC3: Confirm button triggers database update and navigation
 * - AC4: Edit button closes dialog and returns to conversation
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

/**
 * TopicConfirmation component props
 */
export interface TopicConfirmationProps {
  /**
   * Controls dialog visibility
   */
  isOpen: boolean;

  /**
   * Extracted topic text to display
   * If null or empty, shows placeholder message
   */
  topic: string | null;

  /**
   * Callback when user confirms topic
   * Should handle database update and navigation
   */
  onConfirm: () => void | Promise<void>;

  /**
   * Callback when user wants to edit/refine topic
   * Should close dialog and focus chat input
   */
  onEdit: () => void;

  /**
   * Optional loading state during confirmation
   * Disables buttons and shows spinner
   */
  isLoading?: boolean;
}

/**
 * TopicConfirmation Dialog Component
 *
 * Displays a modal dialog with the extracted video topic.
 * Prevents backdrop dismissal - user must choose Confirm or Edit.
 *
 * @param props - Component props
 * @returns Dialog component with topic confirmation UI
 *
 * @example
 * ```tsx
 * <TopicConfirmation
 *   isOpen={showDialog}
 *   topic="Mars colonization"
 *   onConfirm={handleConfirm}
 *   onEdit={handleEdit}
 *   isLoading={isConfirming}
 * />
 * ```
 */
export function TopicConfirmation({
  isOpen,
  topic,
  onConfirm,
  onEdit,
  isLoading = false,
}: TopicConfirmationProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  // Handle Escape key to trigger Edit behavior
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isConfirming && !isLoading) {
        e.preventDefault();
        onEdit();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isConfirming, isLoading, onEdit]);

  /**
   * Handle confirm button click
   * Supports both sync and async onConfirm callbacks
   */
  const handleConfirmClick = async () => {
    setIsConfirming(true);
    try {
      await Promise.resolve(onConfirm());
    } finally {
      setIsConfirming(false);
    }
  };

  /**
   * Handle edit button click
   */
  const handleEditClick = () => {
    onEdit();
  };

  // Determine display text
  const displayTopic = topic && topic.trim()
    ? topic.trim()
    : 'Video topic not clear from conversation';

  const hasValidTopic = topic && topic.trim().length > 0;
  const buttonsDisabled = isConfirming || isLoading;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Prevent closing via backdrop or X button
        // User must use Confirm or Edit buttons
        if (!open && !buttonsDisabled) {
          onEdit();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-[500px]"
        aria-labelledby="topic-confirmation-title"
        aria-describedby="topic-confirmation-description"
        onPointerDownOutside={(e) => {
          // Prevent backdrop click dismissal
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Prevent default Escape behavior (we handle it manually)
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle
            id="topic-confirmation-title"
            className="text-2xl font-semibold"
          >
            Confirm Video Topic
          </DialogTitle>
          <DialogDescription id="topic-confirmation-description">
            Review the topic extracted from your conversation. Click Confirm to
            proceed to voice selection, or Edit to refine the topic through
            continued conversation.
          </DialogDescription>
        </DialogHeader>

        {/* Topic Display Section */}
        <div
          className="my-6 rounded-lg border border-border bg-muted/50 p-6"
          data-testid="topic-display"
        >
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Video Topic:
          </p>
          <p
            className={`text-2xl font-semibold leading-relaxed ${
              hasValidTopic ? 'text-foreground' : 'text-muted-foreground italic'
            }`}
            data-testid="topic-text"
          >
            {displayTopic}
          </p>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleEditClick}
            disabled={buttonsDisabled}
            data-testid="edit-button"
            aria-label="Edit topic through conversation"
          >
            Edit Topic
          </Button>
          <Button
            onClick={handleConfirmClick}
            disabled={buttonsDisabled || !hasValidTopic}
            data-testid="confirm-button"
            aria-label="Confirm topic and proceed to voice selection"
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isConfirming || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
