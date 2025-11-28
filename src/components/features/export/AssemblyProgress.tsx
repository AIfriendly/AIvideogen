/**
 * AssemblyProgress Component - Story 5.5
 *
 * Displays assembly progress when video is being processed.
 * Shows stage label, progress bar, and scene counter.
 * UX spec: Section 7.6 - Assembly Progress UI
 */

import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AssemblyProgressProps {
  status: {
    status: string;
    progress: number;
    currentStage: string;
    currentScene?: number;
    totalScenes?: number;
  };
}

/**
 * Human-readable stage labels
 */
const STAGE_LABELS: Record<string, string> = {
  initializing: 'Initializing...',
  downloading: 'Downloading source videos...',
  trimming: 'Trimming video clips...',
  concatenating: 'Joining video clips...',
  audio_overlay: 'Adding voiceover audio...',
  thumbnail: 'Generating thumbnail...',
  finalizing: 'Finalizing video...',
};

export function AssemblyProgress({ status }: AssemblyProgressProps) {
  const stageLabel = STAGE_LABELS[status.currentStage] || status.currentStage || 'Processing...';
  const progress = Math.min(100, Math.max(0, status.progress || 0));

  return (
    <div className="exp-progress bg-slate-800 rounded-lg p-8 border border-slate-700">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        <h2 className="text-xl font-semibold text-slate-100">
          Assembling Your Video...
        </h2>
      </div>

      {/* Description */}
      <p className="text-slate-300 mb-6">
        Your video is being assembled. This may take a few minutes depending on the number of scenes.
      </p>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">{stageLabel}</span>
          <span className="text-indigo-400 font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress
          value={progress}
          className="h-3"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Scene Counter */}
      {status.currentScene && status.totalScenes && status.totalScenes > 0 && (
        <p className="text-sm text-slate-400 mb-4">
          Processing scene {status.currentScene} of {status.totalScenes}
        </p>
      )}

      {/* Stage Pipeline */}
      <div className="mt-6 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          Pipeline: Initialize &rarr; Download &rarr; Trim &rarr; Concatenate &rarr; Audio &rarr; Thumbnail &rarr; Finalize
        </p>
      </div>

      {/* Accessibility */}
      <div className="sr-only" role="status" aria-live="polite">
        Assembling video, {Math.round(progress)}% complete. {stageLabel}
      </div>
    </div>
  );
}
