/**
 * ConfirmationModal Component Tests - Epic 4, Story 4.5
 * Test ID Prefix: 4.5-UNIT-xxx
 * Priority: P1/P2
 *
 * Tests for the ConfirmationModal component that displays
 * assembly confirmation dialog with selection summary.
 *
 * Following TEA test-quality.md best practices:
 * - BDD format (Given-When-Then)
 * - Test IDs for traceability
 * - Priority markers for triage
 * - Explicit assertions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmationModal } from '@/components/features/curation/ConfirmationModal';
import { type ClipSelection } from '@/lib/stores/curation-store';

describe('[4.5-UNIT] ConfirmationModal Component Tests', () => {
  const defaultOnClose = vi.fn();
  const defaultOnConfirm = vi.fn();

  const createSelections = (count: number): Map<string, ClipSelection> => {
    const selections = new Map<string, ClipSelection>();
    for (let i = 1; i <= count; i++) {
      selections.set(`scene-${i}`, {
        sceneId: `scene-${i}`,
        suggestionId: `sugg-${i}`,
        videoId: `vid-${i}`,
      });
    }
    return selections;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('[4.5-UNIT-005] [P1] Modal Rendering', () => {
    it('should render modal when isOpen is true', () => {
      // Given: Modal is open
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={defaultOnClose}
          onConfirm={defaultOnConfirm}
          isLoading={false}
          sceneCount={5}
          selections={createSelections(5)}
        />
      );

      // Then: Modal title and description are visible
      expect(screen.getByText('Ready to Assemble?')).toBeInTheDocument();
      expect(screen.getByText(/This will create your final video/i)).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      // Given: Modal is closed
      render(
        <ConfirmationModal
          isOpen={false}
          onClose={defaultOnClose}
          onConfirm={defaultOnConfirm}
          isLoading={false}
          sceneCount={5}
          selections={createSelections(5)}
        />
      );

      // Then: Modal content is not visible
      expect(screen.queryByText('Ready to Assemble?')).not.toBeInTheDocument();
    });

    it('should display scene count correctly', () => {
      // Given: Modal with 7 scenes
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={defaultOnClose}
          onConfirm={defaultOnConfirm}
          isLoading={false}
          sceneCount={7}
          selections={createSelections(7)}
        />
      );

      // Then: Shows "7 scenes"
      expect(screen.getByText('7 scenes')).toBeInTheDocument();
    });
  });

  describe('[4.5-UNIT-006] [P1] Cancel Button', () => {
    it('should trigger onClose when Cancel is clicked', () => {
      // Given: Modal is open
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={defaultOnClose}
          onConfirm={defaultOnConfirm}
          isLoading={false}
          sceneCount={3}
          selections={createSelections(3)}
        />
      );

      // When: Click Cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Then: onClose is called
      expect(defaultOnClose).toHaveBeenCalledTimes(1);
    });

    it('should be disabled during loading', () => {
      // Given: Modal is loading
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={defaultOnClose}
          onConfirm={defaultOnConfirm}
          isLoading={true}
          sceneCount={3}
          selections={createSelections(3)}
        />
      );

      // Then: Cancel button is disabled
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('[4.5-UNIT-007] [P1] Confirm Button', () => {
    it('should trigger onConfirm when Confirm Assembly is clicked', () => {
      // Given: Modal is open
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={defaultOnClose}
          onConfirm={defaultOnConfirm}
          isLoading={false}
          sceneCount={3}
          selections={createSelections(3)}
        />
      );

      // When: Click Confirm Assembly button
      const confirmButton = screen.getByRole('button', { name: /confirm assembly/i });
      fireEvent.click(confirmButton);

      // Then: onConfirm is called
      expect(defaultOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('should be disabled during loading', () => {
      // Given: Modal is loading
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={defaultOnClose}
          onConfirm={defaultOnConfirm}
          isLoading={true}
          sceneCount={3}
          selections={createSelections(3)}
        />
      );

      // Then: Confirm button is disabled
      const confirmButton = screen.getByRole('button', { name: /assembling/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should show loading state with "Assembling..." text', () => {
      // Given: Modal is loading
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={defaultOnClose}
          onConfirm={defaultOnConfirm}
          isLoading={true}
          sceneCount={3}
          selections={createSelections(3)}
        />
      );

      // Then: Shows "Assembling..." text
      expect(screen.getByText('Assembling...')).toBeInTheDocument();
    });
  });

  describe('[4.5-UNIT-008] [P2] Selection Summary', () => {
    it('should display selection summary when selections exist', () => {
      // Given: Modal with 5 selections
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={defaultOnClose}
          onConfirm={defaultOnConfirm}
          isLoading={false}
          sceneCount={5}
          selections={createSelections(5)}
        />
      );

      // Then: Shows selection summary
      expect(screen.getByText(/All 5 clip selections have been saved/i)).toBeInTheDocument();
    });

    it('should not show summary when no selections', () => {
      // Given: Modal with empty selections
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={defaultOnClose}
          onConfirm={defaultOnConfirm}
          isLoading={false}
          sceneCount={0}
          selections={new Map()}
        />
      );

      // Then: Summary not shown
      expect(screen.queryByText(/clip selections have been saved/i)).not.toBeInTheDocument();
    });
  });

  describe('[4.5-UNIT-009] [P2] Edge Cases', () => {
    it('should handle single scene correctly', () => {
      // Given: Modal with 1 scene
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={defaultOnClose}
          onConfirm={defaultOnConfirm}
          isLoading={false}
          sceneCount={1}
          selections={createSelections(1)}
        />
      );

      // Then: Shows "1 scenes" (singular/plural handled by UI)
      expect(screen.getByText('1 scenes')).toBeInTheDocument();
    });

    it('should handle large scene counts', () => {
      // Given: Modal with 20 scenes
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={defaultOnClose}
          onConfirm={defaultOnConfirm}
          isLoading={false}
          sceneCount={20}
          selections={createSelections(20)}
        />
      );

      // Then: Shows "20 scenes"
      expect(screen.getByText('20 scenes')).toBeInTheDocument();
    });
  });
});
