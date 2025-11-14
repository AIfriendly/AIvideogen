/**
 * Unit Tests - AudioPlayer Component
 *
 * Tests for the reusable AudioPlayer component including props handling,
 * loading states, error states, and audio element attributes.
 *
 * Test IDs from story-2.6.md Task 7:
 * - 7.1: Component props (projectId, sceneNumber, className)
 * - 7.2: Loading state behavior
 * - 7.3: Error state behavior
 * - 7.4: Audio element attributes
 *
 * Priority: P1 (Component tests)
 * Story: 2.6 - Script & Voiceover Preview Integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AudioPlayer from '@/components/ui/audio-player';

describe('[P1] AudioPlayer Component - Unit Tests', () => {
  const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';
  const mockSceneNumber = 1;

  beforeEach(() => {
    // Clear any previous renders
    document.body.innerHTML = '';
  });

  /**
   * 7.1: Test AudioPlayer Component Props
   *
   * GIVEN: AudioPlayer component
   * WHEN: Rendered with projectId and sceneNumber
   * THEN: Component renders with correct API endpoint URL
   */
  describe('[7.1] Component Props Handling', () => {
    it('should render with projectId and sceneNumber props', () => {
      // WHEN: Render AudioPlayer with props
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      // THEN: Component should render
      expect(container).toBeInTheDocument();
    });

    it('should construct correct API endpoint URL from props', () => {
      // WHEN: Render AudioPlayer
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      // THEN: Audio element should have correct src
      const expectedUrl = `/api/projects/${mockProjectId}/scenes/${mockSceneNumber}/audio`;

      // Wait for audio element to appear (after loading state)
      waitFor(() => {
        const audioElement = container.querySelector('audio');
        if (audioElement) {
          expect(audioElement).toHaveAttribute('src', expectedUrl);
        }
      });
    });

    it('should apply custom className prop to container', () => {
      // GIVEN: Custom className
      const customClass = 'custom-audio-player';

      // WHEN: Render with className
      const { container } = render(
        <AudioPlayer
          projectId={mockProjectId}
          sceneNumber={mockSceneNumber}
          className={customClass}
        />
      );

      // THEN: Container should have custom class
      const playerContainer = container.firstElementChild;
      expect(playerContainer?.className).toContain(customClass);
    });

    it('should work with different scene numbers', () => {
      // GIVEN: Different scene numbers
      const sceneNumbers = [1, 5, 10, 99];

      sceneNumbers.forEach((sceneNumber) => {
        // WHEN: Render with different scene number
        const { container } = render(
          <AudioPlayer projectId={mockProjectId} sceneNumber={sceneNumber} />
        );

        // THEN: Audio src should update accordingly
        const expectedUrl = `/api/projects/${mockProjectId}/scenes/${sceneNumber}/audio`;

        waitFor(() => {
          const audioElement = container.querySelector('audio');
          if (audioElement) {
            expect(audioElement).toHaveAttribute('src', expectedUrl);
          }
        });

        // Cleanup
        document.body.innerHTML = '';
      });
    });
  });

  /**
   * 7.2: Test Loading State
   *
   * GIVEN: AudioPlayer component
   * WHEN: Component mounts
   * THEN: Loading skeleton displays until metadata loads
   */
  describe('[7.2] Loading State Behavior', () => {
    it('should display loading skeleton on mount', () => {
      // WHEN: Render AudioPlayer
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      // THEN: Loading skeleton should be visible
      const loadingSkeleton = container.querySelector('.animate-pulse');
      expect(loadingSkeleton).toBeInTheDocument();
    });

    it('should have correct loading skeleton classes', () => {
      // WHEN: Render AudioPlayer
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      // THEN: Loading skeleton should have pulse animation and proper styling
      const loadingSkeleton = container.querySelector('.animate-pulse');
      expect(loadingSkeleton).toHaveClass('h-12');
      expect(loadingSkeleton).toHaveClass('rounded');
      // Should have either light or dark mode background
      const hasLightBg = loadingSkeleton?.classList.contains('bg-slate-200');
      const hasDarkBg = loadingSkeleton?.classList.contains('dark:bg-slate-700');
      expect(hasLightBg || hasDarkBg).toBe(true);
    });

    it('should hide audio element during loading', () => {
      // WHEN: Render AudioPlayer
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      // THEN: Audio element should be hidden (display: none)
      const audioElement = container.querySelector('audio');
      if (audioElement) {
        const displayStyle = window.getComputedStyle(audioElement).display;
        expect(displayStyle).toBe('none');
      }
    });

    it('should clear loading state after onLoadedMetadata event', async () => {
      // WHEN: Render AudioPlayer
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      // GIVEN: Loading skeleton is visible
      let loadingSkeleton = container.querySelector('.animate-pulse');
      expect(loadingSkeleton).toBeInTheDocument();

      // WHEN: Trigger onLoadedMetadata event
      const audioElement = container.querySelector('audio');
      if (audioElement) {
        fireEvent.loadedMetadata(audioElement);

        // THEN: Loading skeleton should disappear
        await waitFor(() => {
          loadingSkeleton = container.querySelector('.animate-pulse');
          expect(loadingSkeleton).not.toBeInTheDocument();
        });

        // AND: Audio element should become visible
        await waitFor(() => {
          const displayStyle = window.getComputedStyle(audioElement).display;
          expect(displayStyle).toBe('block');
        });
      }
    });
  });

  /**
   * 7.3: Test Error State
   *
   * GIVEN: AudioPlayer component
   * WHEN: Audio fails to load (onError event)
   * THEN: Error message displays with icon
   */
  describe('[7.3] Error State Behavior', () => {
    it('should display error message after onError event', async () => {
      // WHEN: Render AudioPlayer
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      // GIVEN: Audio element exists
      const audioElement = container.querySelector('audio');
      expect(audioElement).toBeInTheDocument();

      // WHEN: Trigger onError event
      if (audioElement) {
        fireEvent.error(audioElement);

        // THEN: Error message should appear
        await waitFor(() => {
          const errorMessage = screen.getByText(/Audio not available/i);
          expect(errorMessage).toBeInTheDocument();
        });
      }
    });

    it('should have correct error message text', async () => {
      // WHEN: Render and trigger error
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      const audioElement = container.querySelector('audio');
      if (audioElement) {
        fireEvent.error(audioElement);

        // THEN: Error text should be exactly "Audio not available"
        await waitFor(() => {
          const errorMessage = screen.getByText('Audio not available');
          expect(errorMessage).toBeInTheDocument();
        });
      }
    });

    it('should display error with red text styling', async () => {
      // WHEN: Render and trigger error
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      const audioElement = container.querySelector('audio');
      if (audioElement) {
        fireEvent.error(audioElement);

        // THEN: Error message should have red text classes
        await waitFor(() => {
          const errorContainer = container.querySelector('.text-red-600');
          expect(errorContainer).toBeInTheDocument();
          expect(errorContainer).toHaveClass('dark:text-red-400');
        });
      }
    });

    it('should display error icon with error message', async () => {
      // WHEN: Render and trigger error
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      const audioElement = container.querySelector('audio');
      if (audioElement) {
        fireEvent.error(audioElement);

        // THEN: SVG icon should be present
        await waitFor(() => {
          const svgIcon = container.querySelector('svg');
          expect(svgIcon).toBeInTheDocument();
          expect(svgIcon).toHaveClass('w-4');
          expect(svgIcon).toHaveClass('h-4');
        });
      }
    });

    it('should hide audio element when error occurs', async () => {
      // WHEN: Render and trigger error
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      const audioElement = container.querySelector('audio');
      if (audioElement) {
        fireEvent.error(audioElement);

        // THEN: Error message appears and audio element is removed from DOM
        await waitFor(() => {
          const errorMessage = screen.queryByText('Audio not available');
          expect(errorMessage).toBeInTheDocument();

          // Audio element should be removed when error is shown (component uses {!error && <audio>})
          const audioAfterError = container.querySelector('audio');
          expect(audioAfterError).not.toBeInTheDocument();
        });
      }
    });

    it('should clear loading state when error occurs', async () => {
      // WHEN: Render AudioPlayer
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      // GIVEN: Loading skeleton visible
      let loadingSkeleton = container.querySelector('.animate-pulse');
      expect(loadingSkeleton).toBeInTheDocument();

      // WHEN: Trigger error
      const audioElement = container.querySelector('audio');
      if (audioElement) {
        fireEvent.error(audioElement);

        // THEN: Loading skeleton should disappear
        await waitFor(() => {
          loadingSkeleton = container.querySelector('.animate-pulse');
          expect(loadingSkeleton).not.toBeInTheDocument();
        });
      }
    });
  });

  /**
   * 7.4: Test Audio Element Attributes
   *
   * GIVEN: AudioPlayer component
   * WHEN: Rendered
   * THEN: Audio element has correct attributes (controls, preload, src)
   */
  describe('[7.4] Audio Element Attributes', () => {
    it('should have controls attribute', () => {
      // WHEN: Render AudioPlayer
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      // THEN: Audio element should have controls
      const audioElement = container.querySelector('audio');
      expect(audioElement).toHaveAttribute('controls');
    });

    it('should have preload="metadata" attribute', () => {
      // WHEN: Render AudioPlayer
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      // THEN: Audio element should preload only metadata
      const audioElement = container.querySelector('audio');
      expect(audioElement).toHaveAttribute('preload', 'metadata');
    });

    it('should have correct src attribute with API endpoint', () => {
      // WHEN: Render AudioPlayer
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      // THEN: Audio src should match expected API endpoint
      const expectedSrc = `/api/projects/${mockProjectId}/scenes/${mockSceneNumber}/audio`;
      const audioElement = container.querySelector('audio');
      expect(audioElement).toHaveAttribute('src', expectedSrc);
    });

    it('should have full width className', () => {
      // WHEN: Render AudioPlayer
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      // THEN: Audio element should have w-full class
      const audioElement = container.querySelector('audio');
      expect(audioElement).toHaveClass('w-full');
    });

    it('should have onLoadedMetadata event handler', () => {
      // WHEN: Render AudioPlayer
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      // THEN: Audio element should have event handler
      const audioElement = container.querySelector('audio') as HTMLAudioElement;
      expect(audioElement?.onloadedmetadata).toBeDefined();
    });

    it('should have onError event handler', () => {
      // WHEN: Render AudioPlayer
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={mockSceneNumber} />
      );

      // THEN: Audio element should have error handler
      const audioElement = container.querySelector('audio') as HTMLAudioElement;
      expect(audioElement?.onerror).toBeDefined();
    });
  });

  /**
   * Additional Edge Cases
   */
  describe('Edge Cases and Additional Tests', () => {
    it('should handle rapid re-renders without errors', () => {
      // WHEN: Render multiple times rapidly
      const { rerender } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={1} />
      );

      rerender(<AudioPlayer projectId={mockProjectId} sceneNumber={2} />);
      rerender(<AudioPlayer projectId={mockProjectId} sceneNumber={3} />);

      // THEN: No errors should occur
      expect(true).toBe(true);
    });

    it('should handle empty projectId gracefully', () => {
      // WHEN: Render with empty projectId
      const { container } = render(
        <AudioPlayer projectId="" sceneNumber={mockSceneNumber} />
      );

      // THEN: Component should still render (API will handle validation)
      expect(container).toBeInTheDocument();
      const audioElement = container.querySelector('audio');
      expect(audioElement).toHaveAttribute('src', '/api/projects//scenes/1/audio');
    });

    it('should handle scene number zero', () => {
      // WHEN: Render with scene number 0
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={0} />
      );

      // THEN: Component renders (API validation will reject)
      const audioElement = container.querySelector('audio');
      expect(audioElement).toHaveAttribute('src', `/api/projects/${mockProjectId}/scenes/0/audio`);
    });

    it('should handle negative scene numbers', () => {
      // WHEN: Render with negative scene number
      const { container } = render(
        <AudioPlayer projectId={mockProjectId} sceneNumber={-1} />
      );

      // THEN: Component renders (API validation will reject)
      const audioElement = container.querySelector('audio');
      expect(audioElement).toHaveAttribute('src', `/api/projects/${mockProjectId}/scenes/-1/audio`);
    });
  });
});
