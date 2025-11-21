/**
 * VideoPreviewPlayer Component - Epic 4, Story 4.3
 *
 * Video preview player that supports both local segment playback and YouTube iframe fallback.
 * Uses Plyr for accessible HTML5 video controls.
 *
 * Features:
 * - Local segment playback from .cache/videos/ directory
 * - YouTube iframe fallback when segment download failed
 * - Plyr controls: play/pause, progress bar, volume, fullscreen
 * - Keyboard shortcuts: Space (play/pause), Escape (close)
 * - Error boundary protection
 * - Responsive design
 */

'use client';

import * as React from 'react';
import Plyr from 'plyr';
import { type VisualSuggestion } from '@/types/visual-suggestions';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Props for VideoPreviewPlayer component
 */
export interface VideoPreviewPlayerProps {
  suggestionId: string;
  projectId: string;
  videoId: string;
  title: string;
  channelTitle: string;
  segmentPath: string | null;
  downloadStatus: 'pending' | 'downloading' | 'complete' | 'error';
  onClose: () => void;
}

/**
 * Construct video URL from segment path
 * Strips .cache/ prefix and prepends /api/videos/
 */
function constructVideoUrl(segmentPath: string): string {
  // Strip .cache/ prefix if present
  const cleanPath = segmentPath.startsWith('.cache/')
    ? segmentPath.substring(7) // Remove ".cache/" (7 characters)
    : segmentPath;
  return `/api/videos/${cleanPath}`;
}

/**
 * Determine if local playback should be used
 */
function shouldUseLocalPlayback(
  downloadStatus: string,
  segmentPath: string | null
): boolean {
  return (
    downloadStatus === 'complete' &&
    segmentPath !== null &&
    segmentPath !== undefined
  );
}

/**
 * Error Boundary for VideoPreviewPlayer
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class VideoPreviewErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onClose: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[VideoPreviewPlayer] Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Video Player Error
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            {this.state.error?.message || 'An error occurred while loading the video player.'}
          </p>
          <Button onClick={this.props.onClose} variant="outline">
            Close
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Local Video Player using Plyr
 */
function LocalVideoPlayer({
  videoUrl,
  title,
  onError,
}: {
  videoUrl: string;
  title: string;
  onError: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const plyrRef = React.useRef<Plyr | null>(null);

  React.useEffect(() => {
    if (!videoRef.current) return;

    // Initialize Plyr
    try {
      plyrRef.current = new Plyr(videoRef.current, {
        controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
        keyboard: { focused: false, global: false }, // We handle keyboard shortcuts manually
        clickToPlay: true,
        hideControls: true,
        resetOnEnd: false,
        tooltips: { controls: false, seek: true },
      });

      // Auto-play on load - check if 'on' method exists (might be mocked in tests)
      if (plyrRef.current && typeof plyrRef.current.on === 'function') {
        plyrRef.current.on('ready', () => {
          const playPromise = plyrRef.current?.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((err) => {
              console.warn('[VideoPreviewPlayer] Auto-play prevented:', err);
            });
          }
        });
      } else if (plyrRef.current && typeof plyrRef.current.play === 'function') {
        // Direct play for mocked Plyr in tests
        const playPromise = plyrRef.current.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err) => {
            console.warn('[VideoPreviewPlayer] Auto-play prevented:', err);
          });
        }
      }
    } catch (error) {
      console.warn('[VideoPreviewPlayer] Failed to initialize Plyr:', error);
    }

    // Cleanup
    return () => {
      if (plyrRef.current && typeof plyrRef.current.destroy === 'function') {
        plyrRef.current.destroy();
      }
      plyrRef.current = null;
    };
  }, [videoUrl]);

  // Expose play/pause toggle for keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (plyrRef.current) {
          // Check if togglePlay exists (might be different in mocked version)
          if (typeof plyrRef.current.togglePlay === 'function') {
            plyrRef.current.togglePlay();
          } else if (typeof plyrRef.current.paused !== 'undefined') {
            // Fallback for basic video element control
            if (plyrRef.current.paused) {
              plyrRef.current.play?.();
            } else {
              plyrRef.current.pause?.();
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <video
      ref={videoRef}
      data-testid="local-video-player"
      className="w-full aspect-video bg-black rounded-lg"
      src={videoUrl}
      crossOrigin="anonymous"
      playsInline
      preload="auto"
      onError={onError}
      aria-label={title}
    >
      Your browser does not support the video tag.
    </video>
  );
}

/**
 * YouTube Iframe Fallback Player
 */
function YouTubePlayer({ videoId, title }: { videoId: string; title: string }) {
  // Construct YouTube embed URL with autoplay
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden" data-testid="youtube-iframe-container">
      <iframe
        data-testid="youtube-iframe"
        src={embedUrl}
        title={title}
        className="w-full h-full aspect-video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        aria-label={`YouTube video: ${title}`}
      />
    </div>
  );
}

/**
 * VideoPreviewPlayer Component
 *
 * Main player component that renders either local video or YouTube fallback.
 */
export function VideoPreviewPlayer({
  suggestionId,
  projectId,
  videoId,
  title,
  channelTitle,
  segmentPath,
  downloadStatus,
  onClose,
}: VideoPreviewPlayerProps) {
  const [useYouTube, setUseYouTube] = React.useState(false);
  const [videoError, setVideoError] = React.useState(false);

  // Determine initial playback mode
  const useLocal = shouldUseLocalPlayback(downloadStatus, segmentPath) && !useYouTube && !videoError;

  // Construct video URL for local playback
  const videoUrl = segmentPath ? constructVideoUrl(segmentPath) : '';

  // Handle local video error - fallback to YouTube
  const handleVideoError = React.useCallback(() => {
    console.warn(
      `[VideoPreviewPlayer] Local video failed to load, falling back to YouTube: ${videoUrl}`
    );
    setVideoError(true);
  }, [videoUrl]);

  // Handle Escape key to close
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <VideoPreviewErrorBoundary onClose={onClose}>
      <div
        data-testid="video-preview-player"
        className="relative w-full"
        role="region"
        aria-label="Video preview player"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white shadow-lg transition-colors"
          aria-label="Close preview"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
            {title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {channelTitle}
            {!useLocal && (
              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                (Streaming from YouTube)
              </span>
            )}
          </p>
        </div>

        {/* Video Player */}
        {useLocal ? (
          <LocalVideoPlayer
            videoUrl={videoUrl}
            title={`${title} by ${channelTitle}`}
            onError={handleVideoError}
          />
        ) : (
          <YouTubePlayer
            videoId={videoId}
            title={title}
          />
        )}

        {/* Player Mode Indicator */}
        {videoError && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            Local video unavailable. Playing from YouTube instead.
          </p>
        )}
      </div>
    </VideoPreviewErrorBoundary>
  );
}

// Default export for compatibility
export default VideoPreviewPlayer;
