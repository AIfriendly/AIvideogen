'use client';

/**
 * VideoDownload Component - Story 5.5
 *
 * Primary download button for the final video.
 * Sanitizes filename for safe filesystem usage.
 */

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoDownloadProps {
  videoPath: string;
  title: string;
  className?: string;
}

/**
 * Sanitize filename for safe filesystem usage
 * Removes special characters, converts spaces to hyphens, truncates
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')          // Spaces to hyphens
    .replace(/-+/g, '-')           // Multiple hyphens to single
    .substring(0, 50)              // Truncate to 50 chars
    .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens
}

export function VideoDownload({ videoPath, title, className }: VideoDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      // Fetch the video file
      const response = await fetch(videoPath);

      if (!response.ok) {
        throw new Error('Video file not found');
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const filename = sanitizeFilename(title) + '.mp4';

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error('[VideoDownload] Error:', err);
      setError('Failed to download video. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        onClick={handleDownload}
        disabled={isDownloading}
        className="exp-download-video w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg"
        size="lg"
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            <Download className="w-5 h-5 mr-2" />
            Download Video
          </>
        )}
      </Button>

      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
