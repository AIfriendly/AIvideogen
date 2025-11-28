'use client';

/**
 * ThumbnailPreview Component - Story 5.5
 *
 * Displays the auto-generated thumbnail with download option.
 * UX spec: Section 7.7 - Thumbnail Preview Section
 */

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThumbnailPreviewProps {
  thumbnailPath: string;
  title: string;
}

/**
 * Sanitize filename for safe filesystem usage
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
    .replace(/^-|-$/g, '');
}

export function ThumbnailPreview({ thumbnailPath, title }: ThumbnailPreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      // Fetch the thumbnail file
      const response = await fetch(thumbnailPath);

      if (!response.ok) {
        throw new Error('Thumbnail file not found');
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const filename = sanitizeFilename(title) + '-thumbnail.jpg';

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error('[ThumbnailPreview] Download error:', err);
      setError('Failed to download thumbnail.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="exp-thumbnail bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col">
      {/* Label */}
      <span className="exp-thumbnail-label text-sm font-semibold text-slate-300 mb-3">
        Thumbnail
      </span>

      {/* Thumbnail Image */}
      <div className="exp-thumbnail-wrapper aspect-video rounded-lg overflow-hidden shadow-md bg-slate-900">
        <img
          src={thumbnailPath}
          alt={`Thumbnail for ${title}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Download Button */}
      <Button
        onClick={handleDownload}
        disabled={isDownloading}
        variant="outline"
        className="mt-3 w-full border-indigo-500 text-indigo-400 hover:bg-slate-700/30"
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Download Thumbnail
          </>
        )}
      </Button>

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
