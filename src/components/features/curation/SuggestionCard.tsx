/**
 * SuggestionCard Component - Epic 4, Story 4.2
 *
 * Displays an individual YouTube video suggestion with thumbnail, metadata, and download status.
 * Used in the VisualSuggestionGallery to show visual clip options for each scene.
 *
 * Features:
 * - YouTube thumbnail with fallback on error
 * - Video title, channel name, duration display
 * - Rank badge (e.g., #1, #2)
 * - Download status indicator (pending/downloading/complete/error)
 * - Hover effects for better UX
 * - 16:9 aspect ratio for thumbnails
 */

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type VisualSuggestion } from '@/types/visual-suggestions';
import {
  User,
  Clock,
  Download,
  CheckCircle,
  AlertCircle,
  Video,
} from 'lucide-react';

/**
 * Props for SuggestionCard component
 */
interface SuggestionCardProps {
  suggestion: VisualSuggestion;
  className?: string;
}

/**
 * Format duration from seconds to MM:SS format
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "03:45")
 */
function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds === 0) {
    return '--:--';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get download status badge configuration
 *
 * @param status - Download status
 * @returns Badge variant and content
 */
function getDownloadStatusBadge(status: VisualSuggestion['downloadStatus']) {
  switch (status) {
    case 'pending':
      return {
        variant: 'outline' as const,
        icon: Clock,
        text: 'Queued',
        className: 'text-slate-600 dark:text-slate-400',
      };
    case 'downloading':
      return {
        variant: 'info' as const,
        icon: Download,
        text: 'Downloading...',
        className: 'animate-pulse',
      };
    case 'complete':
      return {
        variant: 'success' as const,
        icon: CheckCircle,
        text: 'Ready',
        className: '',
      };
    case 'error':
      return {
        variant: 'error' as const,
        icon: AlertCircle,
        text: 'Failed',
        className: '',
      };
    default:
      return {
        variant: 'outline' as const,
        icon: Clock,
        text: 'Pending',
        className: '',
      };
  }
}

/**
 * SuggestionCard Component
 *
 * Displays a single visual suggestion with thumbnail, metadata, and status indicators.
 *
 * @param suggestion - Visual suggestion data
 * @param className - Optional additional CSS classes
 * @returns Suggestion card component
 */
export function SuggestionCard({ suggestion, className }: SuggestionCardProps) {
  const [thumbnailError, setThumbnailError] = React.useState(false);
  const statusBadge = getDownloadStatusBadge(suggestion.downloadStatus);
  const StatusIcon = statusBadge.icon;

  return (
    <Card
      className={`relative overflow-hidden transition-all hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-600 ${className || ''}`}
    >
      {/* Rank Badge - Top Left */}
      <div className="absolute top-2 left-2 z-10">
        <Badge
          variant="default"
          className="bg-blue-600 text-white font-bold shadow-md"
        >
          #{suggestion.rank}
        </Badge>
      </div>

      {/* Download Status Badge - Top Right */}
      <div className="absolute top-2 right-2 z-10">
        <Badge variant={statusBadge.variant} className={statusBadge.className}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusBadge.text}
        </Badge>
      </div>

      <CardContent className="p-0">
        {/* Thumbnail */}
        <div className="relative w-full aspect-video bg-slate-200 dark:bg-slate-800">
          {!thumbnailError ? (
            <Image
              src={suggestion.thumbnailUrl}
              alt={suggestion.title}
              fill
              className="object-cover"
              onError={() => setThumbnailError(true)}
              unoptimized // YouTube thumbnails are already optimized
            />
          ) : (
            // Fallback placeholder when thumbnail fails to load
            <div className="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-slate-800">
              <Video className="w-12 h-12 text-slate-400 dark:text-slate-600" />
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="p-3 space-y-2">
          {/* Video Title */}
          <h3
            className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight"
            title={suggestion.title}
          >
            {suggestion.title}
          </h3>

          {/* Channel and Duration */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
            {/* Channel */}
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <User className="w-3 h-3 flex-shrink-0" />
              <span className="truncate" title={suggestion.channelTitle}>
                {suggestion.channelTitle}
              </span>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Clock className="w-3 h-3" />
              <span className="font-medium">{formatDuration(suggestion.duration)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
