/**
 * ExportSummary Component - Story 5.5
 *
 * Displays video metadata: duration, file size, resolution, topic, and scene count.
 * UX spec: Section 7.7 - Metadata Card
 */

interface ExportSummaryProps {
  duration: number;
  fileSize: number;
  resolution: string;
  title: string;
  sceneCount: number;
}

/**
 * Format duration from seconds to mm:ss
 */
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size from bytes to human readable
 */
function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0 MB';

  const mb = bytes / (1024 * 1024);

  if (mb < 1) {
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  }

  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  }

  return `${mb.toFixed(1)} MB`;
}

export function ExportSummary({
  duration,
  fileSize,
  resolution,
  title,
  sceneCount,
}: ExportSummaryProps) {
  return (
    <div className="exp-summary bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-wrap justify-center gap-x-8 gap-y-3">
      {/* Duration */}
      <div className="exp-summary-item text-sm flex items-center gap-2">
        <span className="text-slate-400">Duration:</span>
        <span className="text-slate-50 font-medium">{formatDuration(duration)}</span>
      </div>

      {/* File Size */}
      <div className="exp-summary-item text-sm flex items-center gap-2">
        <span className="text-slate-400">Size:</span>
        <span className="text-slate-50 font-medium">{formatFileSize(fileSize)}</span>
      </div>

      {/* Resolution */}
      <div className="exp-summary-item text-sm flex items-center gap-2">
        <span className="text-slate-400">Resolution:</span>
        <span className="text-slate-50 font-medium">{resolution}</span>
      </div>

      {/* Topic/Title */}
      <div className="exp-summary-item text-sm flex items-center gap-2">
        <span className="text-slate-400">Topic:</span>
        <span className="text-slate-50 font-medium truncate max-w-[200px]" title={title}>
          {title}
        </span>
      </div>

      {/* Scene Count */}
      <div className="exp-summary-item text-sm flex items-center gap-2">
        <span className="text-slate-400">Scenes:</span>
        <span className="text-slate-50 font-medium">{sceneCount}</span>
      </div>
    </div>
  );
}
