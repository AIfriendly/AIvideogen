/**
 * Component Tests - VideoPreviewPlayer Silent Video Indicator
 * Story 3.7: Computer Vision Content Filtering
 *
 * Tests for silent video indicator (AC54-57):
 * - Mute indicator display
 * - Tooltip with explanation
 * - No volume controls
 * - No volume keyboard shortcuts
 *
 * Test IDs: 3.7-UNIT-031 to 3.7-UNIT-040
 * Priority: P0 (Critical)
 * Risk Mitigation: R-004 (User Experience)
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoPreviewPlayer } from '@/components/features/curation/VideoPreviewPlayer';
import type { VideoPreviewPlayerProps } from '@/components/features/curation/VideoPreviewPlayer';
import Plyr from 'plyr';

// Mock Plyr library
vi.mock('plyr', () => ({
  default: vi.fn().mockImplementation(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    currentTime: 0,
    volume: 1,
    muted: false,
    paused: true,
  })),
}));

describe('VideoPreviewPlayer Silent Video Indicator - Story 3.7', () => {
  const defaultProps: VideoPreviewPlayerProps = {
    suggestionId: 'test-sug-123',
    projectId: 'test-proj-456',
    videoId: 'abc123def456',
    title: 'Test Video Title',
    channelTitle: 'Test Channel',
    segmentPath: '.cache/videos/test-proj-456/scene-01-default.mp4',
    downloadStatus: 'complete',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // AC54: Mute Indicator Display
  // ==========================================================================

  /**
   * [3.7-UNIT-031] Mute indicator visible
   */
  describe('[3.7-UNIT-031] Mute Indicator Display (AC54)', () => {
    test('should display mute indicator icon for local video playback', () => {
      // Given: Component with downloaded segment
      const { container } = render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Should show mute indicator (VolumeX icon)
      const muteIndicator = container.querySelector('[aria-hidden="true"]');
      expect(muteIndicator).toBeInTheDocument();
    });

    test('should display "Audio removed for preview" text', () => {
      // Given: Component rendered
      render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Should show audio removed text
      expect(screen.getByText('Audio removed for preview')).toBeInTheDocument();
    });

    test('should have aria-label for accessibility', () => {
      // Given: Component rendered
      render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Should have accessible label
      const label = screen.getByLabelText('Audio removed for preview');
      expect(label).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // AC55: Tooltip with Explanation
  // ==========================================================================

  /**
   * [3.7-UNIT-032] Tooltip on indicator
   */
  describe('[3.7-UNIT-032] Tooltip Display (AC55)', () => {
    test('should have title attribute with explanation', () => {
      // Given: Component rendered
      const { container } = render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Should have title for tooltip
      const indicatorContainer = container.querySelector('[title="Audio removed for preview"]');
      expect(indicatorContainer).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // AC56: No Volume Controls
  // ==========================================================================

  /**
   * [3.7-UNIT-033] No volume slider
   */
  describe('[3.7-UNIT-033] No Volume Controls (AC56)', () => {
    test('should NOT include volume in Plyr controls', () => {
      // Given: Component rendered
      render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Plyr should be initialized WITHOUT volume control
      expect(Plyr).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          controls: expect.not.arrayContaining(['volume', 'mute']),
        })
      );
    });

    test('should only include play, progress, current-time, fullscreen controls', () => {
      // Given: Component rendered
      render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Should have limited controls
      expect(Plyr).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          controls: expect.arrayContaining(['play', 'progress', 'current-time', 'fullscreen']),
        })
      );
    });

    test('should NOT render mute button', () => {
      // Given: Component rendered
      render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: No mute button should exist
      const muteButton = screen.queryByRole('button', { name: /mute/i });
      expect(muteButton).not.toBeInTheDocument();
    });

    test('should NOT render unmute option', () => {
      // Given: Component rendered
      render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: No unmute option should exist
      const unmuteButton = screen.queryByRole('button', { name: /unmute/i });
      expect(unmuteButton).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // AC57: No Volume Keyboard Shortcuts
  // ==========================================================================

  /**
   * [3.7-UNIT-034] M key disabled
   */
  describe('[3.7-UNIT-034] M Key Disabled (AC57)', () => {
    test('should NOT respond to M key for mute toggle', () => {
      // Given: Plyr instance
      let volumeChanged = false;
      const plyrMock = {
        play: vi.fn(),
        pause: vi.fn(),
        destroy: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        get muted() { return false; },
        set muted(value: boolean) { volumeChanged = true; },
        paused: true,
        currentTime: 0,
        volume: 1,
      };
      vi.mocked(Plyr).mockImplementationOnce(() => plyrMock as any);

      // When: Component rendered and M key pressed
      render(<VideoPreviewPlayer {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'M', code: 'KeyM' });

      // Then: Volume should not change
      expect(volumeChanged).toBe(false);
    });

    test('should NOT respond to m (lowercase) key', () => {
      // Given: Component rendered
      const onCloseMock = vi.fn();
      render(<VideoPreviewPlayer {...defaultProps} onClose={onCloseMock} />);

      // When: m key pressed
      fireEvent.keyDown(document, { key: 'm', code: 'KeyM' });

      // Then: Should not trigger any volume action
      // (and should not close - that's Escape only)
      expect(onCloseMock).not.toHaveBeenCalled();
    });
  });

  /**
   * [3.7-UNIT-035] Arrow keys disabled for volume
   */
  describe('[3.7-UNIT-035] Arrow Keys Disabled for Volume (AC57)', () => {
    test('should NOT respond to ArrowUp for volume increase', () => {
      // Given: Plyr instance with volume tracking
      let volumeValue = 0.5;
      const plyrMock = {
        play: vi.fn(),
        pause: vi.fn(),
        destroy: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        get volume() { return volumeValue; },
        set volume(value: number) { volumeValue = value; },
        paused: true,
        currentTime: 0,
        muted: false,
      };
      vi.mocked(Plyr).mockImplementationOnce(() => plyrMock as any);

      // When: Component rendered and ArrowUp pressed
      render(<VideoPreviewPlayer {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'ArrowUp', code: 'ArrowUp' });

      // Then: Volume should not change
      expect(volumeValue).toBe(0.5);
    });

    test('should NOT respond to ArrowDown for volume decrease', () => {
      // Given: Plyr instance with volume tracking
      let volumeValue = 0.5;
      const plyrMock = {
        play: vi.fn(),
        pause: vi.fn(),
        destroy: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        get volume() { return volumeValue; },
        set volume(value: number) { volumeValue = value; },
        paused: true,
        currentTime: 0,
        muted: false,
      };
      vi.mocked(Plyr).mockImplementationOnce(() => plyrMock as any);

      // When: Component rendered and ArrowDown pressed
      render(<VideoPreviewPlayer {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown' });

      // Then: Volume should not change
      expect(volumeValue).toBe(0.5);
    });
  });

  // ==========================================================================
  // Supported Keyboard Shortcuts Still Work
  // ==========================================================================

  /**
   * [3.7-UNIT-036] Space key still works
   */
  describe('[3.7-UNIT-036] Supported Shortcuts Still Work', () => {
    test('Space key should still toggle play/pause', async () => {
      // Given: Plyr instance
      const playMock = vi.fn();
      const pauseMock = vi.fn();
      let paused = true;

      vi.mocked(Plyr).mockImplementationOnce(() => ({
        play: playMock.mockImplementation(() => { paused = false; }),
        pause: pauseMock.mockImplementation(() => { paused = true; }),
        destroy: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        get paused() { return paused; },
        currentTime: 0,
        volume: 1,
        muted: false,
      } as any));

      // When: Component rendered and space pressed
      render(<VideoPreviewPlayer {...defaultProps} />);
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });

      // Then: Should call play
      expect(playMock).toHaveBeenCalled();
    });

    test('Escape key should still close preview', () => {
      // Given: Component with onClose handler
      const onCloseMock = vi.fn();
      render(<VideoPreviewPlayer {...defaultProps} onClose={onCloseMock} />);

      // When: Escape key pressed
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      // Then: Should call onClose
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // YouTube Fallback Mode
  // ==========================================================================

  /**
   * [3.7-UNIT-037] YouTube fallback shows streaming notice
   */
  describe('[3.7-UNIT-037] YouTube Fallback Mode', () => {
    test('should show streaming notice instead of mute indicator for YouTube fallback', () => {
      // Given: YouTube fallback mode (error status)
      const props = {
        ...defaultProps,
        downloadStatus: 'error' as const,
        segmentPath: null,
      };

      // When: Rendering component
      render(<VideoPreviewPlayer {...props} />);

      // Then: Should show streaming notice
      expect(screen.getByText(/streaming from youtube/i)).toBeInTheDocument();
    });

    test('should NOT show mute indicator for YouTube fallback', () => {
      // Given: YouTube fallback mode
      const props = {
        ...defaultProps,
        downloadStatus: 'error' as const,
        segmentPath: null,
      };

      // When: Rendering component
      render(<VideoPreviewPlayer {...props} />);

      // Then: Should not show "Audio removed" text
      expect(screen.queryByText('Audio removed for preview')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Visual Indicator Styling
  // ==========================================================================

  /**
   * [3.7-UNIT-038] Indicator styling
   */
  describe('[3.7-UNIT-038] Visual Indicator Styling', () => {
    test('should display indicator in muted/subtle color', () => {
      // Given: Component rendered
      const { container } = render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Should have muted styling class
      const indicator = container.querySelector('.text-muted-foreground');
      expect(indicator).toBeInTheDocument();
    });

    test('should display icon in slate color', () => {
      // Given: Component rendered
      const { container } = render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Icon should have slate color class
      const icon = container.querySelector('.text-slate-400');
      expect(icon).toBeInTheDocument();
    });

    test('should display text in small size', () => {
      // Given: Component rendered
      const { container } = render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Text should be small
      const text = container.querySelector('.text-xs');
      expect(text).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  /**
   * [3.7-UNIT-039] Accessibility compliance
   */
  describe('[3.7-UNIT-039] Accessibility', () => {
    test('should have aria-hidden on decorative icon', () => {
      // Given: Component rendered
      const { container } = render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Icon should be hidden from screen readers
      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    test('should have descriptive aria-label on text', () => {
      // Given: Component rendered
      render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Should have accessible label
      const label = screen.getByLabelText('Audio removed for preview');
      expect(label).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Component Integration
  // ==========================================================================

  /**
   * [3.7-UNIT-040] Component cleanup
   */
  describe('[3.7-UNIT-040] Component Cleanup', () => {
    test('should cleanup Plyr on unmount', () => {
      // Given: Plyr instance with destroy method
      const destroyMock = vi.fn();
      vi.mocked(Plyr).mockImplementationOnce(() => ({
        play: vi.fn(),
        pause: vi.fn(),
        destroy: destroyMock,
        on: vi.fn(),
        off: vi.fn(),
        paused: true,
        currentTime: 0,
        volume: 1,
        muted: false,
      } as any));

      // When: Component mounted and unmounted
      const { unmount } = render(<VideoPreviewPlayer {...defaultProps} />);
      unmount();

      // Then: Should call destroy
      expect(destroyMock).toHaveBeenCalledTimes(1);
    });

    test('should remove keyboard event listeners on unmount', () => {
      // Given: Component with event listeners
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      // When: Component mounted and unmounted
      const { unmount } = render(<VideoPreviewPlayer {...defaultProps} />);
      unmount();

      // Then: Should remove keydown listener
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });
});
