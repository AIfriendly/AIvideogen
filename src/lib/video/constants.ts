/**
 * Video Assembly Configuration Constants - Story 5.1
 *
 * Configuration for FFmpeg-based video assembly operations.
 */

export const VIDEO_ASSEMBLY_CONFIG = {
  // Output formats
  VIDEO_CODEC: 'libx264',
  AUDIO_CODEC: 'aac',
  CONTAINER: 'mp4',

  // Quality settings
  VIDEO_BITRATE: '2M',
  AUDIO_BITRATE: '128k',
  CRF: 23, // Constant Rate Factor (lower = better quality)

  // Resolution
  MAX_WIDTH: 1280,
  MAX_HEIGHT: 720,

  // Thumbnail settings
  THUMBNAIL_WIDTH: 1920,
  THUMBNAIL_HEIGHT: 1080,
  THUMBNAIL_FORMAT: 'jpg' as const,
  THUMBNAIL_QUALITY: 85,

  // Paths
  TEMP_DIR: '.cache/assembly',
  OUTPUT_DIR: 'public/videos',

  // Timeouts (in milliseconds)
  FFMPEG_TIMEOUT: 600000, // 10 minutes
  PROBE_TIMEOUT: 30000, // 30 seconds

  // Progress stages
  STAGES: ['initializing', 'trimming', 'concatenating', 'audio_overlay', 'thumbnail', 'finalizing'] as const,
} as const;

export const ASSEMBLY_JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const;

/**
 * FFmpeg preset configurations for different quality levels
 */
export const FFMPEG_PRESETS = {
  fast: {
    preset: 'ultrafast',
    crf: 28,
  },
  balanced: {
    preset: 'medium',
    crf: 23,
  },
  quality: {
    preset: 'slow',
    crf: 18,
  },
} as const;

/**
 * Supported input video formats
 */
export const SUPPORTED_VIDEO_FORMATS = [
  '.mp4',
  '.webm',
  '.mkv',
  '.avi',
  '.mov',
] as const;

/**
 * Supported input audio formats
 */
export const SUPPORTED_AUDIO_FORMATS = [
  '.mp3',
  '.wav',
  '.aac',
  '.ogg',
  '.m4a',
] as const;
