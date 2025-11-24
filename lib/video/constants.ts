// Video Assembly Configuration Constants
// STUB: Created for Story 5.2 development - Story 5.1 owns this file

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
  THUMBNAIL_FORMAT: 'jpg',
  THUMBNAIL_QUALITY: 85,

  // Paths
  TEMP_DIR: '.cache/assembly',
  OUTPUT_DIR: 'public/videos',

  // Timeouts
  FFMPEG_TIMEOUT: 600000, // 10 minutes

  // Progress stages
  STAGES: ['trimming', 'concatenating', 'audio_overlay', 'thumbnail', 'finalizing'] as const,
};

export const ASSEMBLY_JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const;
