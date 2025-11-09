/**
 * AudioPlayer Component
 *
 * Reusable audio player that streams audio files from API endpoint.
 * Displays loading state while audio metadata loads and error state if audio fails to load.
 */

'use client';

import { useState } from 'react';

interface AudioPlayerProps {
  projectId: string;
  sceneNumber: number;
  className?: string;
}

export default function AudioPlayer({ projectId, sceneNumber, className = '' }: AudioPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const audioSrc = `/api/projects/${projectId}/scenes/${sceneNumber}/audio`;

  return (
    <div className={`mt-3 ${className}`}>
      {loading && !error && (
        <div className="animate-pulse h-12 bg-slate-200 dark:bg-slate-700 rounded" />
      )}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Audio not available
        </div>
      )}
      {!error && (
        <audio
          controls
          preload="metadata"
          src={audioSrc}
          onLoadedMetadata={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError('Failed to load audio');
          }}
          className="w-full"
          style={{ display: loading ? 'none' : 'block' }}
        />
      )}
    </div>
  );
}
