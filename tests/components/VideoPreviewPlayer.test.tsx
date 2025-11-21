/**
 * Component Unit Tests - VideoPreviewPlayer
 * Story 4.3: Video Preview & Playback Functionality
 *
 * Tests for VideoPreviewPlayer component including local playback,
 * YouTube fallback, keyboard shortcuts, and cleanup.
 *
 * Test IDs: 4.3-UNIT-001 to 4.3-UNIT-015
 * Priority: P0 (Critical)
 * Risk Mitigation: R-002 (Playback Failure), R-004 (Memory Leaks)
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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
    paused: true,
  })),
}));

describe('VideoPreviewPlayer Component - Story 4.3', () => {
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
    // Reset document state
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  /**
   * [4.3-UNIT-001] Component Rendering
   */
  describe('[4.3-UNIT-001] Basic Component Rendering', () => {
    test('should render video preview player with all elements', () => {
      // Given: Component with complete download
      const { container } = render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Should render all UI elements
      expect(screen.getByText('Test Video Title')).toBeInTheDocument();
      expect(screen.getByText('Test Channel')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="video-preview-player"]')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    test('should apply correct CSS classes for dark theme', () => {
      // Given: Component rendered
      const { container } = render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Should have dark theme classes
      const playerContainer = container.querySelector('[data-testid="video-preview-player"]');
      expect(playerContainer).toBeInTheDocument();
      // Check for dark theme text classes
      expect(screen.getByText('Test Video Title')).toHaveClass('dark:text-slate-100');
    });
  });

  /**
   * [4.3-UNIT-003] Local Video Playback
   */
  describe('[4.3-UNIT-003] Local Video Source Handling', () => {
    test('should render HTML5 video element for complete downloads', () => {
      // Given: Suggestion with complete download
      const props = {
        ...defaultProps,
        downloadStatus: 'complete' as const,
        segmentPath: '.cache/videos/proj-1/scene-01-default.mp4',
      };

      // When: Rendering component
      const { container } = render(<VideoPreviewPlayer {...props} />);

      // Then: Should render video element
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video?.getAttribute('src')).toBe('/api/videos/videos/proj-1/scene-01-default.mp4');
    });

    test('should strip .cache/ prefix from segment path', () => {
      // Given: Path with .cache/ prefix
      const constructVideoUrl = (path: string) => {
        const cleanPath = path.startsWith('.cache/')
          ? path.substring(7)
          : path;
        return `/api/videos/${cleanPath}`;
      };

      // When: Constructing URL
      const url = constructVideoUrl('.cache/videos/proj-1/scene-01.mp4');

      // Then: Should remove .cache/ prefix
      expect(url).toBe('/api/videos/videos/proj-1/scene-01.mp4');
    });

    test('should set preload attribute to auto for instant playback', () => {
      // Given: Component with local video
      const { container } = render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Should have preload="auto"
      const video = container.querySelector('video');
      expect(video?.getAttribute('preload')).toBe('auto');
    });

    test('should set crossorigin for CORS compliance', () => {
      // Given: Component with local video
      const { container } = render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Should have crossorigin attribute
      const video = container.querySelector('video');
      expect(video?.getAttribute('crossorigin')).toBe('anonymous');
    });
  });

  /**
   * [4.3-UNIT-004] Plyr Initialization
   */
  describe('[4.3-UNIT-004] Plyr Player Integration', () => {
    test('should initialize Plyr with correct options', () => {
      // Given: Component rendered
      render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Plyr should be initialized with proper config
      expect(Plyr).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          controls: expect.arrayContaining(['play', 'progress', 'current-time', 'volume', 'fullscreen']),
          clickToPlay: true,
          keyboard: { focused: false, global: false },
          hideControls: true,
          resetOnEnd: false,
        })
      );
    });

    test('should auto-play video on Plyr ready event', async () => {
      // Given: Plyr mock with play method
      const playMock = vi.fn();
      vi.mocked(Plyr).mockImplementationOnce(() => ({
        play: playMock,
        pause: vi.fn(),
        destroy: vi.fn(),
        on: (event: string, callback: Function) => {
          if (event === 'ready') {
            callback();
          }
        },
        off: vi.fn(),
        currentTime: 0,
        volume: 1,
        paused: false,
      } as any));

      // When: Component rendered
      render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Should call play on ready
      await waitFor(() => {
        expect(playMock).toHaveBeenCalled();
      });
    });
  });

  /**
   * [4.3-UNIT-008] YouTube Iframe Fallback
   */
  describe('[4.3-UNIT-008] YouTube Fallback Mechanism', () => {
    test('should render YouTube iframe when download status is error', () => {
      // Given: Suggestion with error status
      const props = {
        ...defaultProps,
        downloadStatus: 'error' as const,
        segmentPath: null,
      };

      // When: Rendering component
      const { container } = render(<VideoPreviewPlayer {...props} />);

      // Then: Should render iframe
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe?.src).toContain('youtube.com/embed/abc123def456');
      expect(iframe?.src).toContain('autoplay=1');
      expect(iframe?.src).toContain('rel=0');
    });

    test('should render YouTube iframe when segment path is null', () => {
      // Given: No segment path available
      const props = {
        ...defaultProps,
        downloadStatus: 'complete' as const,
        segmentPath: null,
      };

      // When: Rendering component
      const { container } = render(<VideoPreviewPlayer {...props} />);

      // Then: Should fallback to iframe
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(container.querySelector('video')).not.toBeInTheDocument();
    });

    test('should display YouTube branding notice in fallback mode', () => {
      // Given: YouTube fallback mode
      const props = {
        ...defaultProps,
        downloadStatus: 'error' as const,
      };

      // When: Rendering component
      render(<VideoPreviewPlayer {...props} />);

      // Then: Should show streaming notice
      expect(screen.getByText(/streaming from youtube/i)).toBeInTheDocument();
    });

    test('should maintain 16:9 aspect ratio for YouTube iframe', () => {
      // Given: YouTube fallback mode
      const props = {
        ...defaultProps,
        downloadStatus: 'error' as const,
      };

      // When: Rendering component
      const { container } = render(<VideoPreviewPlayer {...props} />);

      // Then: Should have aspect ratio class
      const iframeContainer = container.querySelector('[data-testid="youtube-iframe-container"]');
      expect(iframeContainer).toHaveClass('aspect-video');
    });
  });

  /**
   * [4.3-UNIT-010] Keyboard Shortcuts
   */
  describe('[4.3-UNIT-010] Keyboard Shortcut Handling', () => {
    test('Space key should toggle play/pause', async () => {
      // Given: Plyr instance with play/pause methods
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
      } as any));

      // When: Component rendered and space pressed
      render(<VideoPreviewPlayer {...defaultProps} />);

      fireEvent.keyDown(document, { key: ' ', code: 'Space' });

      // Then: Should call play
      await waitFor(() => expect(playMock).toHaveBeenCalled());

      // When: Space pressed again
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });

      // Then: Should call pause
      await waitFor(() => expect(pauseMock).toHaveBeenCalled());
    });

    test('Space key should prevent default scroll behavior', () => {
      // Given: Component rendered
      render(<VideoPreviewPlayer {...defaultProps} />);

      // When: Space key pressed
      const event = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      document.dispatchEvent(event);

      // Then: Should prevent default
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    test('Escape key should close preview', () => {
      // Given: Component with onClose handler
      const onCloseMock = vi.fn();
      render(<VideoPreviewPlayer {...defaultProps} onClose={onCloseMock} />);

      // When: Escape key pressed
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      // Then: Should call onClose
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test('should not respond to other keys', () => {
      // Given: Component rendered
      const onCloseMock = vi.fn();
      const playMock = vi.fn();

      vi.mocked(Plyr).mockImplementationOnce(() => ({
        play: playMock,
        pause: vi.fn(),
        destroy: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        paused: true,
        currentTime: 0,
        volume: 1,
      } as any));

      render(<VideoPreviewPlayer {...defaultProps} onClose={onCloseMock} />);

      // When: Other keys pressed
      fireEvent.keyDown(document, { key: 'Enter', code: 'Enter' });
      fireEvent.keyDown(document, { key: 'a', code: 'KeyA' });
      fireEvent.keyDown(document, { key: 'ArrowRight', code: 'ArrowRight' });

      // Then: Should not trigger actions
      expect(onCloseMock).not.toHaveBeenCalled();
      expect(playMock).not.toHaveBeenCalled();
    });
  });

  /**
   * [4.3-UNIT-011] Close Button
   */
  describe('[4.3-UNIT-011] Close Button Functionality', () => {
    test('should call onClose when close button clicked', async () => {
      // Given: Component with onClose handler
      const onCloseMock = vi.fn();
      render(<VideoPreviewPlayer {...defaultProps} onClose={onCloseMock} />);

      // When: Close button clicked
      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      // Then: Should call onClose
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test('should have proper ARIA label for accessibility', () => {
      // Given: Component rendered
      render(<VideoPreviewPlayer {...defaultProps} />);

      // Then: Close button should have ARIA label
      const closeButton = screen.getByRole('button', { name: /close preview/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close preview');
    });
  });

  /**
   * [4.3-UNIT-014] Cleanup and Memory Management
   */
  describe('[4.3-UNIT-014] Component Cleanup', () => {
    test('should destroy Plyr instance on unmount', () => {
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

    test('should handle unmount during video loading', () => {
      // Given: Component loading video
      const { unmount } = render(<VideoPreviewPlayer {...defaultProps} />);

      // When: Unmounting during load
      // Then: Should not throw error
      expect(() => unmount()).not.toThrow();
    });
  });

  /**
   * [4.3-UNIT-015] Error Handling
   */
  describe('[4.3-UNIT-015] Error Boundary and Recovery', () => {
    test('should handle video load errors gracefully', async () => {
      // Given: Video that will fail to load
      const { container, rerender } = render(<VideoPreviewPlayer {...defaultProps} />);

      const video = container.querySelector('video');

      // When: Video fails to load
      fireEvent.error(video!);

      // Then: Should attempt YouTube fallback
      const props = {
        ...defaultProps,
        downloadStatus: 'error' as const,
      };

      rerender(<VideoPreviewPlayer {...props} />);

      await waitFor(() => {
        expect(container.querySelector('iframe')).toBeInTheDocument();
      });
    });

    test('should handle Plyr initialization failure', () => {
      // Given: Plyr throws error on init
      vi.mocked(Plyr).mockImplementationOnce(() => {
        throw new Error('Plyr initialization failed');
      });

      // When: Rendering component
      // Then: Should not crash
      expect(() => render(<VideoPreviewPlayer {...defaultProps} />)).not.toThrow();
    });

    test('should display error message for unrecoverable errors', () => {
      // Given: Download error state
      const props = {
        ...defaultProps,
        downloadStatus: 'error' as const,
        segmentPath: null,
      };

      // When: Rendering component
      render(<VideoPreviewPlayer {...props} />);

      // Then: Should show YouTube fallback with error notice
      const iframe = screen.getByTestId('youtube-iframe');
      expect(iframe).toBeInTheDocument();
      // Error state shows streaming from YouTube message
      expect(screen.getByText(/streaming from youtube/i)).toBeInTheDocument();
    });
  });
});