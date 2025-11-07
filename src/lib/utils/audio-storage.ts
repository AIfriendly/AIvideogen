/**
 * Audio File Storage Utilities
 *
 * This module provides path management and validation for TTS-generated audio files.
 * All paths are RELATIVE from project root for portability across environments.
 *
 * Directory Structure:
 * - .cache/audio/previews/ - Voice preview samples (never deleted)
 * - .cache/audio/projects/{projectId}/ - Scene audio files (deleted after 30 days)
 * - .cache/audio/temp/ - Temporary audio files
 *
 * @module lib/utils/audio-storage
 */

import { join, normalize, resolve, isAbsolute } from 'path';
import { mkdirSync, existsSync } from 'fs';

/**
 * Audio storage configuration
 */
const AUDIO_CONFIG = {
  /** Base cache directory (relative to project root) */
  cacheDir: '.cache',
  /** Audio subdirectory */
  audioDir: 'audio',
  /** Preview audio subdirectory */
  previewsDir: 'previews',
  /** Project audio subdirectory */
  projectsDir: 'projects',
  /** Temporary audio subdirectory */
  tempDir: 'temp',
};

/**
 * Get relative path for voice preview audio
 *
 * Preview audio is shared across all projects and never deleted.
 * Used for voice selection UI.
 *
 * @param voiceId - Voice profile ID (e.g., 'sarah', 'james')
 * @returns Relative path from project root
 *
 * @example
 * ```typescript
 * const path = getPreviewAudioPath('sarah');
 * // Result: ".cache/audio/previews/sarah.mp3"
 * ```
 */
export function getPreviewAudioPath(voiceId: string): string {
  return join(
    AUDIO_CONFIG.cacheDir,
    AUDIO_CONFIG.audioDir,
    AUDIO_CONFIG.previewsDir,
    `${voiceId}.mp3`
  );
}

/**
 * Get relative path for scene audio file
 *
 * Scene audio is isolated per project and deleted after 30 days of inactivity.
 * Scene numbers are 1-indexed (scene-1.mp3, scene-2.mp3, etc.)
 *
 * @param projectId - Project identifier
 * @param sceneNumber - Scene number (1-indexed, must be positive integer)
 * @returns Relative path from project root
 * @throws Error if sceneNumber is invalid
 *
 * @example
 * ```typescript
 * const path = getSceneAudioPath('proj-123', 1);
 * // Result: ".cache/audio/projects/proj-123/scene-1.mp3"
 * ```
 */
export function getSceneAudioPath(
  projectId: string,
  sceneNumber: number
): string {
  // Validate inputs
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Invalid projectId: must be non-empty string');
  }

  if (!Number.isInteger(sceneNumber) || sceneNumber < 1) {
    throw new Error('Invalid sceneNumber: must be positive integer (1-indexed)');
  }

  return join(
    AUDIO_CONFIG.cacheDir,
    AUDIO_CONFIG.audioDir,
    AUDIO_CONFIG.projectsDir,
    projectId,
    `scene-${sceneNumber}.mp3`
  );
}

/**
 * Get relative path for temporary audio file
 *
 * Temporary audio is used during generation and cleaned up automatically.
 *
 * @param filename - Filename (with extension)
 * @returns Relative path from project root
 *
 * @example
 * ```typescript
 * const path = getTempAudioPath('temp-123.mp3');
 * // Result: ".cache/audio/temp/temp-123.mp3"
 * ```
 */
export function getTempAudioPath(filename: string): string {
  return join(
    AUDIO_CONFIG.cacheDir,
    AUDIO_CONFIG.audioDir,
    AUDIO_CONFIG.tempDir,
    filename
  );
}

/**
 * Get absolute path from relative audio path
 *
 * Resolves relative path to absolute path for file operations.
 * Database stores relative paths, but file I/O needs absolute paths.
 *
 * @param relativePath - Relative path from project root
 * @returns Absolute path
 *
 * @example
 * ```typescript
 * const relative = ".cache/audio/projects/proj-123/scene-1.mp3";
 * const absolute = getAbsoluteAudioPath(relative);
 * // Result: "D:\\BMAD video generator\\.cache\\audio\\projects\\proj-123\\scene-1.mp3"
 * ```
 */
export function getAbsoluteAudioPath(relativePath: string): string {
  return resolve(process.cwd(), relativePath);
}

/**
 * Validate audio file path for security
 *
 * Prevents directory traversal attacks and ensures path is within
 * the allowed .cache/audio/ directory.
 *
 * Security checks:
 * - Path must start with .cache/audio/
 * - Path must not contain directory traversal (..)
 * - Path must be relative (not absolute)
 *
 * @param filePath - Path to validate
 * @returns true if valid
 * @throws Error if path is invalid (security violation)
 *
 * @example
 * ```typescript
 * // Valid paths
 * validateAudioPath('.cache/audio/previews/sarah.mp3');  // ✅
 * validateAudioPath('.cache/audio/projects/abc/scene-1.mp3');  // ✅
 *
 * // Invalid paths (throws Error)
 * validateAudioPath('../../../etc/passwd');  // ❌
 * validateAudioPath('C:\\Windows\\System32\\file.mp3');  // ❌
 * validateAudioPath('.cache/audio/../../secrets.txt');  // ❌
 * ```
 */
export function validateAudioPath(filePath: string): boolean {
  // Normalize path to resolve any relative segments
  const normalized = normalize(filePath);

  // Check if path is absolute (not allowed)
  if (isAbsolute(normalized)) {
    throw new Error(
      'Invalid audio path: absolute paths not allowed. Use relative paths from project root.'
    );
  }

  // Check if path starts with allowed directory
  const allowedPrefix = join(AUDIO_CONFIG.cacheDir, AUDIO_CONFIG.audioDir);
  if (!normalized.startsWith(allowedPrefix)) {
    throw new Error(
      `Invalid audio path: must start with "${allowedPrefix}/". Got: ${normalized}`
    );
  }

  // Check for directory traversal attempts
  if (normalized.includes('..')) {
    throw new Error(
      'Invalid audio path: directory traversal detected. Path cannot contain ".."'
    );
  }

  return true;
}

/**
 * Ensure all audio directories exist
 *
 * Creates directory structure if it doesn't exist:
 * - .cache/audio/previews/
 * - .cache/audio/projects/
 * - .cache/audio/temp/
 *
 * This should be called during application startup to ensure
 * directory structure is ready for audio generation.
 *
 * @returns Promise resolving when directories are created
 *
 * @example
 * ```typescript
 * // During app initialization
 * await ensureAudioDirectories();
 * ```
 */
export async function ensureAudioDirectories(): Promise<void> {
  const directories = [
    // Preview audio directory
    join(
      AUDIO_CONFIG.cacheDir,
      AUDIO_CONFIG.audioDir,
      AUDIO_CONFIG.previewsDir
    ),
    // Project audio directory (subdirectories created per-project)
    join(
      AUDIO_CONFIG.cacheDir,
      AUDIO_CONFIG.audioDir,
      AUDIO_CONFIG.projectsDir
    ),
    // Temporary audio directory
    join(AUDIO_CONFIG.cacheDir, AUDIO_CONFIG.audioDir, AUDIO_CONFIG.tempDir),
  ];

  for (const dir of directories) {
    const absolutePath = resolve(process.cwd(), dir);
    if (!existsSync(absolutePath)) {
      mkdirSync(absolutePath, { recursive: true });
      console.log(`[Audio Storage] Created directory: ${dir}`);
    }
  }
}

/**
 * Ensure project audio directory exists
 *
 * Creates directory for specific project's audio files.
 * Called before generating scene audio for a project.
 *
 * @param projectId - Project identifier
 * @returns Promise resolving when directory is created
 *
 * @example
 * ```typescript
 * await ensureProjectAudioDirectory('proj-123');
 * // Creates: .cache/audio/projects/proj-123/
 * ```
 */
export async function ensureProjectAudioDirectory(
  projectId: string
): Promise<void> {
  const projectDir = join(
    AUDIO_CONFIG.cacheDir,
    AUDIO_CONFIG.audioDir,
    AUDIO_CONFIG.projectsDir,
    projectId
  );

  const absolutePath = resolve(process.cwd(), projectDir);
  if (!existsSync(absolutePath)) {
    mkdirSync(absolutePath, { recursive: true });
    console.log(`[Audio Storage] Created project directory: ${projectDir}`);
  }
}

/**
 * Get project audio directory path
 *
 * @param projectId - Project identifier
 * @returns Relative path to project audio directory
 *
 * @example
 * ```typescript
 * const dir = getProjectAudioDirectory('proj-123');
 * // Result: ".cache/audio/projects/proj-123"
 * ```
 */
export function getProjectAudioDirectory(projectId: string): string {
  return join(
    AUDIO_CONFIG.cacheDir,
    AUDIO_CONFIG.audioDir,
    AUDIO_CONFIG.projectsDir,
    projectId
  );
}

/**
 * Check if audio file exists
 *
 * @param relativePath - Relative path to audio file
 * @returns true if file exists
 *
 * @example
 * ```typescript
 * const exists = audioFileExists('.cache/audio/previews/sarah.mp3');
 * if (!exists) {
 *   // Generate preview audio
 * }
 * ```
 */
export function audioFileExists(relativePath: string): boolean {
  const absolutePath = getAbsoluteAudioPath(relativePath);
  return existsSync(absolutePath);
}

/**
 * Audio storage statistics
 */
export interface AudioStorageStats {
  /** Preview audio directory exists */
  previewsExists: boolean;
  /** Projects audio directory exists */
  projectsExists: boolean;
  /** Temp audio directory exists */
  tempExists: boolean;
}

/**
 * Get audio storage statistics
 *
 * @returns Storage statistics
 *
 * @example
 * ```typescript
 * const stats = getAudioStorageStats();
 * console.log('Directories ready:', stats.previewsExists && stats.projectsExists);
 * ```
 */
export function getAudioStorageStats(): AudioStorageStats {
  return {
    previewsExists: existsSync(
      resolve(
        process.cwd(),
        AUDIO_CONFIG.cacheDir,
        AUDIO_CONFIG.audioDir,
        AUDIO_CONFIG.previewsDir
      )
    ),
    projectsExists: existsSync(
      resolve(
        process.cwd(),
        AUDIO_CONFIG.cacheDir,
        AUDIO_CONFIG.audioDir,
        AUDIO_CONFIG.projectsDir
      )
    ),
    tempExists: existsSync(
      resolve(
        process.cwd(),
        AUDIO_CONFIG.cacheDir,
        AUDIO_CONFIG.audioDir,
        AUDIO_CONFIG.tempDir
      )
    ),
  };
}
