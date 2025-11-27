'use client';

/**
 * Assembly Client Component - Epic 5
 *
 * Displays real-time assembly progress and provides download button when complete.
 * Polls the assembly-status API every 2 seconds while processing.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Download, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { AssemblyJobResponse, AssemblyStage } from '@/types/assembly';

interface AssemblyClientProps {
  projectId: string;
  jobId?: string;
}

/**
 * Stage display names for user-friendly progress messages
 */
const STAGE_LABELS: Record<AssemblyStage, string> = {
  initializing: 'Initializing...',
  downloading: 'Downloading source videos...',
  trimming: 'Trimming video clips...',
  concatenating: 'Joining video clips...',
  audio_overlay: 'Adding voiceover audio...',
  thumbnail: 'Generating thumbnail...',
  finalizing: 'Finalizing video...',
};

export function AssemblyClient({ projectId, jobId }: AssemblyClientProps) {
  const [job, setJob] = useState<AssemblyJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  /**
   * Fetch current job status
   */
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/assembly-status`);
      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'JOB_NOT_FOUND') {
          setError('No assembly job found. Please start assembly from the visual curation page.');
        } else {
          setError(data.error || 'Failed to fetch assembly status');
        }
        setIsLoading(false);
        return;
      }

      setJob(data);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      console.error('[AssemblyClient] Error fetching status:', err);
      setError('Failed to connect to server');
      setIsLoading(false);
    }
  }, [projectId]);

  /**
   * Poll for status updates while job is processing
   */
  useEffect(() => {
    fetchStatus();

    // Poll every 2 seconds while not complete/error
    const interval = setInterval(() => {
      if (job?.status === 'pending' || job?.status === 'processing' || !job) {
        fetchStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchStatus, job?.status]);

  /**
   * Handle video download
   */
  const handleDownload = async () => {
    if (!job || job.status !== 'complete') return;

    setIsDownloading(true);
    try {
      // Construct video path from project ID - served from public/videos/
      const videoPath = `/videos/${projectId}/final.mp4`;
      const response = await fetch(videoPath);

      if (!response.ok) {
        throw new Error('Video file not found');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${projectId}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('[AssemblyClient] Download error:', err);
      setError('Failed to download video. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Retry failed assembly
   */
  const handleRetry = () => {
    // Redirect back to visual curation to restart
    window.location.href = `/projects/${projectId}/visual-curation`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-3 text-slate-300">Loading assembly status...</span>
      </div>
    );
  }

  // Error state (no job found)
  if (error && !job) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <XCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-semibold text-slate-100">No Assembly Job</h2>
        </div>
        <p className="text-slate-300 mb-4">{error}</p>
        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Go to Visual Curation
        </Button>
      </div>
    );
  }

  // Job completed successfully
  if (job?.status === 'complete') {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-green-700">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-6 w-6 text-green-500" />
          <h2 className="text-xl font-semibold text-slate-100">Video Complete!</h2>
        </div>

        <p className="text-slate-300 mb-6">
          Your video has been successfully assembled and is ready for download.
        </p>

        {/* Video Preview */}
        <div className="mb-6 rounded-lg overflow-hidden bg-black">
          <video
            src={`/videos/${projectId}/final.mp4`}
            controls
            className="w-full max-h-[400px]"
            poster={`/videos/${projectId}/thumbnail.jpg`}
          />
        </div>

        {/* Download Button */}
        <div className="flex gap-4">
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Download Video
              </>
            )}
          </Button>
        </div>

        {error && (
          <p className="mt-4 text-red-400 text-sm">{error}</p>
        )}

        {/* Job Details */}
        <div className="mt-6 pt-4 border-t border-slate-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Job ID:</span>
              <code className="ml-2 text-indigo-400 font-mono">{job.id}</code>
            </div>
            <div>
              <span className="text-slate-400">Scenes:</span>
              <span className="ml-2 text-slate-300">{job.totalScenes}</span>
            </div>
            {job.completedAt && (
              <div className="col-span-2">
                <span className="text-slate-400">Completed:</span>
                <span className="ml-2 text-slate-300">
                  {new Date(job.completedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Job failed
  if (job?.status === 'error') {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-red-700">
        <div className="flex items-center gap-3 mb-4">
          <XCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-semibold text-slate-100">Assembly Failed</h2>
        </div>

        <p className="text-slate-300 mb-4">
          An error occurred during video assembly.
        </p>

        {job.errorMessage && (
          <div className="bg-red-900/30 rounded p-4 mb-4 border border-red-800">
            <p className="text-sm text-red-300 font-mono">{job.errorMessage}</p>
          </div>
        )}

        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // Job in progress (pending or processing)
  const currentStage = job?.currentStage;
  const stageLabel = currentStage ? STAGE_LABELS[currentStage] : 'Starting...';
  const progress = job?.progress ?? 0;

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center gap-3 mb-4">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        <h2 className="text-xl font-semibold text-slate-100">Assembly in Progress</h2>
      </div>

      <p className="text-slate-300 mb-6">
        Your video is being assembled. This may take a few minutes depending on the number of scenes.
      </p>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">{stageLabel}</span>
          <span className="text-indigo-400">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Current Scene */}
      {job?.currentScene && job.totalScenes > 0 && (
        <div className="text-sm text-slate-400 mb-4">
          Processing scene {job.currentScene} of {job.totalScenes}
        </div>
      )}

      {/* Job Details */}
      <div className="bg-slate-900 rounded p-4 mt-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Job ID:</span>
            <code className="ml-2 text-slate-400 font-mono text-xs">{job?.id || jobId}</code>
          </div>
          <div>
            <span className="text-slate-500">Status:</span>
            <span className="ml-2 text-indigo-400 capitalize">{job?.status || 'pending'}</span>
          </div>
        </div>
      </div>

      {/* Pipeline stages indicator */}
      <div className="mt-6 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          Pipeline: Download → Trim → Concatenate → Audio Overlay → Thumbnail → Finalize
        </p>
      </div>
    </div>
  );
}
