/**
 * Assembly Type Definitions - Story 5.1
 *
 * Shared TypeScript types for video assembly operations.
 * Used across Stories 5.1-5.5 in Epic 5.
 */

// ============================================================================
// Assembly Job Types
// ============================================================================

/**
 * Assembly job status constants
 */
export type AssemblyJobStatus = 'pending' | 'processing' | 'complete' | 'error';

/**
 * Assembly job processing stages
 */
export type AssemblyStage =
  | 'initializing'
  | 'downloading'
  | 'trimming'
  | 'concatenating'
  | 'audio_overlay'
  | 'thumbnail'
  | 'finalizing';

/**
 * Assembly job entity (database format)
 */
export interface AssemblyJob {
  id: string;
  project_id: string;
  status: AssemblyJobStatus;
  progress: number;
  current_stage: AssemblyStage | null;
  current_scene: number | null;
  total_scenes: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * Assembly job entity (camelCase for API responses)
 */
export interface AssemblyJobResponse {
  id: string;
  projectId: string;
  status: AssemblyJobStatus;
  progress: number;
  currentStage: AssemblyStage | null;
  currentScene: number | null;
  totalScenes: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

// ============================================================================
// Assembly Request/Response Types
// ============================================================================

/**
 * Scene data for assembly request
 *
 * IMPORTANT - Duration Field Clarification (Epic 5 Retrospective):
 *
 * This interface has TWO duration fields that are often confused:
 *
 * - `audioDuration`: The length of the TTS voiceover audio (seconds)
 *   USE THIS for: trimming videos, calculating audio start times
 *   Source: scenes.duration in database
 *   Typical values: 5-30 seconds
 *
 * - `clipDuration`: The total length of the source YouTube video (seconds)
 *   DO NOT USE for assembly calculations
 *   Source: visual_suggestions.duration (YouTube API metadata)
 *   Typical values: 60-600 seconds (1-10 minutes)
 *
 * BUG HISTORY: Using clipDuration instead of audioDuration caused:
 * - BUG-001 (Story 5.2): Videos trimmed to wrong duration
 * - BUG-002 (Story 5.3): Audio started at wrong times
 */
export interface AssemblyScene {
  sceneId: string;
  sceneNumber: number;
  scene_number: number; // Alias for backward compatibility with stubs
  scriptText: string;
  script_text?: string; // Alias for backward compatibility
  audioFilePath: string;
  audio_path: string; // Alias for backward compatibility
  video_path: string; // Alias for backward compatibility
  selectedClipId: string;
  videoId: string;

  /**
   * YouTube source video duration in seconds.
   * DO NOT USE for assembly - use audioDuration instead.
   * @see audioDuration
   */
  clipDuration: number;

  duration: number; // Alias for backward compatibility

  /**
   * TTS voiceover duration in seconds.
   * USE THIS for: trimming videos, calculating audio timing.
   * This is what determines the actual video segment length.
   */
  audioDuration: number;

  defaultSegmentPath?: string;
}

/**
 * Assembly initiation request
 */
export interface AssemblyRequest {
  scenes: AssemblyScene[];
}

/**
 * Assembly initiation response
 */
export interface AssemblyInitResponse {
  jobId: string;
  status: AssemblyJobStatus;
  message: string;
  sceneCount: number;
}

/**
 * Assembly result (final output)
 */
export interface AssemblyResult {
  jobId: string;
  projectId: string;
  videoPath: string;
  thumbnailPath: string;
  totalDuration: number;
  fileSize: number;
}

// ============================================================================
// FFmpeg Types
// ============================================================================

/**
 * FFprobe result for media files
 */
export interface FFProbeResult {
  format: {
    filename: string;
    duration: number;
    size: number;
    bit_rate: number;
    format_name: string;
  };
  streams: Array<{
    codec_type: 'video' | 'audio';
    codec_name: string;
    width?: number;
    height?: number;
    duration?: number;
    bit_rate?: number;
    channels?: number;
    sample_rate?: number;
  }>;
}

/**
 * FFmpeg progress callback data
 */
export interface FFmpegProgress {
  frame: number;
  fps: number;
  time: number;
  bitrate: number;
  size: number;
  speed: number;
}

// ============================================================================
// Thumbnail Types
// ============================================================================

/**
 * Thumbnail generation options
 */
export interface ThumbnailOptions {
  width: number;
  height: number;
  quality: number;
  format: 'jpg' | 'png';
  timestamp?: number;
  overlayText?: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Assembly error codes
 */
export type AssemblyErrorCode =
  | 'INVALID_REQUEST'
  | 'PROJECT_NOT_FOUND'
  | 'SCENE_NOT_FOUND'
  | 'FILE_NOT_FOUND'
  | 'FFMPEG_ERROR'
  | 'FFMPEG_NOT_INSTALLED'
  | 'JOB_NOT_FOUND'
  | 'JOB_ALREADY_EXISTS'
  | 'DATABASE_ERROR';

/**
 * Assembly error structure
 */
export interface AssemblyError {
  success: false;
  error: string;
  code: AssemblyErrorCode;
  details?: Record<string, unknown>;
}

/**
 * Job progress update interface (for backward compatibility with stubs)
 */
export interface JobProgressUpdate {
  stage: AssemblyStage;
  progress: number;
  current_scene?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform AssemblyJob (snake_case) to AssemblyJobResponse (camelCase)
 */
export function transformAssemblyJob(job: AssemblyJob): AssemblyJobResponse {
  return {
    id: job.id,
    projectId: job.project_id,
    status: job.status,
    progress: job.progress,
    currentStage: job.current_stage,
    currentScene: job.current_scene,
    totalScenes: job.total_scenes,
    errorMessage: job.error_message,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    createdAt: job.created_at,
  };
}
