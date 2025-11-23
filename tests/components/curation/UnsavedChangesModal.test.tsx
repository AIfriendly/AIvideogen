/**
 * Component Unit Tests - UnsavedChangesModal
 * Story 4.6: Visual Curation Workflow Integration & Error Recovery
 *
 * Tests for UnsavedChangesModal component including display logic,
 * button functionality, and missing selection count.
 *
 * Test IDs: 4.6-UNIT-007 to 4.6-UNIT-012
 * Priority: P0 (Critical)
 * Acceptance Criteria: AC #7
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UnsavedChangesModal } from '@/components/features/curation/UnsavedChangesModal';

describe('UnsavedChangesModal Component - Story 4.6', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirmLeave: vi.fn(),
    selectionCount: 3,
    totalScenes: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * [4.6-UNIT-007] Basic Rendering
   */
  describe('[4.6-UNIT-007] Basic Rendering', () => {
    test('should render modal when isOpen is true', () => {
      // Given: Modal is open
      render(<UnsavedChangesModal {...defaultProps} />);

      // Then: Modal content should be visible
      expect(screen.getByText('Incomplete Selections')).toBeInTheDocument();
    });

    test('should not render modal when isOpen is false', () => {
      // Given: Modal is closed
      render(<UnsavedChangesModal {...defaultProps} isOpen={false} />);

      // Then: Modal content should not be visible
      expect(screen.queryByText('Incomplete Selections')).not.toBeInTheDocument();
    });

    test('should render modal title with warning', () => {
      // Given: Modal is open
      render(<UnsavedChangesModal {...defaultProps} />);

      // Then: Should show title indicating incomplete selections
      expect(screen.getByText('Incomplete Selections')).toBeInTheDocument();
    });
  });

  /**
   * [4.6-UNIT-008] Missing Count Display
   */
  describe('[4.6-UNIT-008] Missing Selection Count', () => {
    test('should display correct missing count (singular)', () => {
      // Given: 4 of 5 scenes selected (1 missing)
      render(
        <UnsavedChangesModal
          {...defaultProps}
          selectionCount={4}
          totalScenes={5}
        />
      );

      // Then: Should show "1 scene still needs a clip selection"
      expect(screen.getByText(/1 scene still needs a clip selection/i)).toBeInTheDocument();
    });

    test('should display correct missing count (plural)', () => {
      // Given: 3 of 5 scenes selected (2 missing)
      render(<UnsavedChangesModal {...defaultProps} />);

      // Then: Should show "2 scenes still need a clip selection"
      expect(screen.getByText(/2 scenes still need a clip selection/i)).toBeInTheDocument();
    });

    test('should display message about progress being saved', () => {
      // Given: Modal is open
      render(<UnsavedChangesModal {...defaultProps} />);

      // Then: Should show progress saved message
      expect(screen.getByText(/progress will be saved/i)).toBeInTheDocument();
    });

    test('should handle zero missing selections', () => {
      // Given: All scenes selected
      render(
        <UnsavedChangesModal
          {...defaultProps}
          selectionCount={5}
          totalScenes={5}
        />
      );

      // Then: Should not show missing count text
      expect(screen.queryByText(/scenes? still need/i)).not.toBeInTheDocument();
    });

    test('should handle all scenes missing', () => {
      // Given: No scenes selected
      render(
        <UnsavedChangesModal
          {...defaultProps}
          selectionCount={0}
          totalScenes={5}
        />
      );

      // Then: Should show "5 scenes still need a clip selection"
      expect(screen.getByText(/5 scenes still need a clip selection/i)).toBeInTheDocument();
    });
  });

  /**
   * [4.6-UNIT-009] Button Functionality
   */
  describe('[4.6-UNIT-009] Button Actions', () => {
    test('should call onClose when "Stay on Page" is clicked', async () => {
      // Given: Modal is open with onClose handler
      const onCloseMock = vi.fn();
      render(<UnsavedChangesModal {...defaultProps} onClose={onCloseMock} />);

      // When: Clicking "Stay on Page"
      const stayButton = screen.getByRole('button', { name: /stay on page/i });
      await userEvent.click(stayButton);

      // Then: Should call onClose (may be called multiple times due to AlertDialog behavior)
      expect(onCloseMock).toHaveBeenCalled();
    });

    test('should call onConfirmLeave when "Leave Anyway" is clicked', async () => {
      // Given: Modal is open with onConfirmLeave handler
      const onConfirmLeaveMock = vi.fn();
      render(<UnsavedChangesModal {...defaultProps} onConfirmLeave={onConfirmLeaveMock} />);

      // When: Clicking "Leave Anyway"
      const leaveButton = screen.getByRole('button', { name: /leave anyway/i });
      await userEvent.click(leaveButton);

      // Then: Should call onConfirmLeave
      expect(onConfirmLeaveMock).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * [4.6-UNIT-010] Dialog Behavior
   */
  describe('[4.6-UNIT-010] Dialog Behavior', () => {
    test('should have proper dialog title for accessibility', () => {
      // Given: Modal is open
      render(<UnsavedChangesModal {...defaultProps} />);

      // Then: Should have dialog title
      const title = screen.getByRole('alertdialog');
      expect(title).toBeInTheDocument();
    });

    test('should render both action buttons', () => {
      // Given: Modal is open
      render(<UnsavedChangesModal {...defaultProps} />);

      // Then: Both buttons should be present
      expect(screen.getByRole('button', { name: /stay on page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /leave anyway/i })).toBeInTheDocument();
    });
  });

  /**
   * [4.6-UNIT-011] Edge Cases
   */
  describe('[4.6-UNIT-011] Edge Cases', () => {
    test('should handle large numbers correctly', () => {
      // Given: Many scenes
      render(
        <UnsavedChangesModal
          {...defaultProps}
          selectionCount={10}
          totalScenes={100}
        />
      );

      // Then: Should show "90 scenes still need"
      expect(screen.getByText(/90 scenes still need a clip selection/i)).toBeInTheDocument();
    });

    test('should handle totalScenes of 0', () => {
      // Given: No scenes
      render(
        <UnsavedChangesModal
          {...defaultProps}
          selectionCount={0}
          totalScenes={0}
        />
      );

      // Then: Should not crash and not show missing count
      expect(screen.getByText('Incomplete Selections')).toBeInTheDocument();
      expect(screen.queryByText(/scenes? still need/i)).not.toBeInTheDocument();
    });
  });

  /**
   * [4.6-UNIT-012] Accessibility
   */
  describe('[4.6-UNIT-012] Accessibility', () => {
    test('should use AlertDialog for proper semantics', () => {
      // Given: Modal is open
      render(<UnsavedChangesModal {...defaultProps} />);

      // Then: Should have alertdialog role
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    test('should have descriptive dialog description', () => {
      // Given: Modal is open
      render(<UnsavedChangesModal {...defaultProps} />);

      // Then: Should have description text
      expect(screen.getByText(/haven't selected clips for all scenes/i)).toBeInTheDocument();
    });
  });
});
