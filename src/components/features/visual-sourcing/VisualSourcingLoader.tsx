/**
 * Visual Sourcing Loader Component
 *
 * Loading screen displayed during visual content sourcing process.
 * Shows progress indicator and real-time status as YouTube videos are searched and filtered.
 *
 * Story 3.5: Visual Suggestions Database & Workflow Integration
 */

'use client';

import { useEffect, useState } from 'react';

interface VisualSourcingLoaderProps {
  projectId: string;
  totalScenes: number;
  onComplete: () => void;
  onError?: (error: string) => void;
}

export function VisualSourcingLoader({
  projectId,
  totalScenes,
  onComplete,
  onError
}: VisualSourcingLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function generateVisuals() {
      try {
        setIsLoading(true);
        setError(null);

        console.log(`[VisualSourcingLoader] Starting visual generation for project ${projectId}`);

        const response = await fetch(`/api/projects/${projectId}/generate-visuals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to generate visual suggestions');
        }

        if (result.success) {
          console.log('[VisualSourcingLoader] Visual generation complete:', result);
          setProgress(100);
          setTimeout(() => {
            onComplete();
          }, 500); // Brief delay to show 100% completion
        } else {
          const errorMsg = result.errors?.join(', ') || 'Visual generation failed';
          throw new Error(errorMsg);
        }
      } catch (err: any) {
        console.error('[VisualSourcingLoader] Error:', err);
        const errorMessage = err.message || 'An unexpected error occurred';
        setError(errorMessage);
        setIsLoading(false);
        if (onError) {
          onError(errorMessage);
        }
      }
    }

    generateVisuals();
  }, [projectId, onComplete, onError]);

  // Simulate progress for better UX (since we don't have real-time progress yet)
  useEffect(() => {
    if (isLoading && !error) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev; // Cap at 90% until actual completion
          return prev + 10;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isLoading, error]);

  const handleRetry = () => {
    setError(null);
    setProgress(0);
    setIsLoading(true);
    // Trigger re-render which will call the effect again
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Sourcing Visual Content
            </h2>
            <p className="text-gray-600">
              Searching YouTube for the best video clips for your scenes...
            </p>
          </div>

          {/* Progress Indicator */}
          {isLoading && !error && (
            <div className="mb-6">
              {/* Progress Bar */}
              <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden mb-4">
                <div
                  className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Progress Text */}
              <div className="text-lg font-semibold text-gray-900 mb-2">
                {progress}% Complete
              </div>

              {/* Status Text */}
              <div className="text-sm text-gray-600">
                {progress < 30 && 'Analyzing scenes...'}
                {progress >= 30 && progress < 60 && 'Searching YouTube...'}
                {progress >= 60 && progress < 90 && 'Filtering and ranking results...'}
                {progress >= 90 && 'Finalizing suggestions...'}
              </div>

              {/* Spinner */}
              <div className="mt-6 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>

              {/* Scene Count Info */}
              <div className="mt-6 text-sm text-gray-500">
                Processing {totalScenes} scene{totalScenes !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-red-800 mb-1">
                      Visual Sourcing Failed
                    </h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>

              {/* Retry Button */}
              <button
                onClick={handleRetry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Retry Visual Sourcing
              </button>

              {/* Skip Button */}
              <button
                onClick={onComplete}
                className="w-full mt-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Continue Without Visuals
              </button>
            </div>
          )}

          {/* Note */}
          {!error && (
            <div className="mt-6 text-xs text-gray-500">
              This may take 30-60 seconds depending on the number of scenes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
