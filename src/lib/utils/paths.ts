/**
 * Path Utilities
 *
 * Provides cross-platform path normalization and transformation utilities.
 * Addresses Windows vs Unix path handling issues identified in Epic 5 retrospective.
 *
 * Key functions:
 * - normalizePath: Convert any path to forward slashes
 * - toWebPath: Convert filesystem path to web-servable URL path
 * - toRelativePath: Extract relative path from absolute path
 * - getPublicPath: Extract public-servable path segment
 *
 * @module lib/utils/paths
 */

import path from 'path';

/**
 * Normalize path separators to forward slashes
 *
 * Converts Windows backslashes to forward slashes for consistent handling.
 * Safe to call on already-normalized paths.
 *
 * @param inputPath - Path with potentially mixed separators
 * @returns Path with all forward slashes
 *
 * @example
 * ```typescript
 * normalizePath('D:\\project\\public\\videos\\123\\final.mp4');
 * // Returns: 'D:/project/public/videos/123/final.mp4'
 *
 * normalizePath('/unix/path/file.mp4');
 * // Returns: '/unix/path/file.mp4' (unchanged)
 * ```
 */
export function normalizePath(inputPath: string): string {
  if (!inputPath) return '';
  return inputPath.replace(/\\/g, '/');
}

/**
 * Convert filesystem path to web-servable URL path
 *
 * Extracts the portion of a path that can be served via HTTP.
 * Looks for 'public' segment and returns everything after it.
 *
 * @param filesystemPath - Full filesystem path (absolute or relative)
 * @returns Web-servable path starting with '/'
 *
 * @example
 * ```typescript
 * toWebPath('D:\\project\\public\\videos\\123\\final.mp4');
 * // Returns: '/videos/123/final.mp4'
 *
 * toWebPath('public/videos/123/thumbnail.jpg');
 * // Returns: '/videos/123/thumbnail.jpg'
 *
 * toWebPath('/videos/123/final.mp4');
 * // Returns: '/videos/123/final.mp4' (already web path)
 * ```
 */
export function toWebPath(filesystemPath: string): string {
  if (!filesystemPath) return '';

  // Normalize to forward slashes first
  const normalized = normalizePath(filesystemPath);

  // Find 'public' segment
  const publicIndex = normalized.indexOf('public');

  if (publicIndex !== -1) {
    // Extract everything after 'public/'
    const afterPublic = normalized.substring(publicIndex + 'public'.length);
    // Ensure it starts with /
    return afterPublic.startsWith('/') ? afterPublic : '/' + afterPublic;
  }

  // If no 'public' found, check if already a web path
  if (normalized.startsWith('/') && !normalized.match(/^\/[a-zA-Z]:/)) {
    return normalized;
  }

  // Fallback: prepend / if needed
  return normalized.startsWith('/') ? normalized : '/' + normalized;
}

/**
 * Extract relative path from project root
 *
 * Given an absolute path, extracts the portion relative to the project root.
 * Useful for storing paths in database.
 *
 * @param absolutePath - Full absolute filesystem path
 * @param projectRoot - Project root directory (defaults to process.cwd())
 * @returns Relative path from project root
 *
 * @example
 * ```typescript
 * toRelativePath('D:/project/public/videos/123/final.mp4', 'D:/project');
 * // Returns: 'public/videos/123/final.mp4'
 * ```
 */
export function toRelativePath(
  absolutePath: string,
  projectRoot: string = process.cwd()
): string {
  if (!absolutePath) return '';

  const normalizedPath = normalizePath(absolutePath);
  const normalizedRoot = normalizePath(projectRoot);

  // Check if path starts with project root
  if (normalizedPath.startsWith(normalizedRoot)) {
    let relative = normalizedPath.substring(normalizedRoot.length);
    // Remove leading slash
    if (relative.startsWith('/')) {
      relative = relative.substring(1);
    }
    return relative;
  }

  // Path doesn't start with root, return as-is
  return normalizedPath;
}

/**
 * Get the public-relative path for storage
 *
 * Extracts the path starting from 'public/' for consistent database storage.
 * Use this when saving file paths to the database.
 *
 * @param filesystemPath - Any filesystem path containing 'public'
 * @returns Path starting with 'public/' or original if no public segment
 *
 * @example
 * ```typescript
 * getPublicPath('D:\\project\\public\\videos\\123\\final.mp4');
 * // Returns: 'public/videos/123/final.mp4'
 *
 * getPublicPath('/home/user/project/public/videos/123/thumb.jpg');
 * // Returns: 'public/videos/123/thumb.jpg'
 * ```
 */
export function getPublicPath(filesystemPath: string): string {
  if (!filesystemPath) return '';

  const normalized = normalizePath(filesystemPath);
  const publicIndex = normalized.indexOf('public');

  if (publicIndex !== -1) {
    return normalized.substring(publicIndex);
  }

  return normalized;
}

/**
 * Check if path is absolute
 *
 * Handles both Windows (C:\, D:\) and Unix (/) absolute paths.
 *
 * @param inputPath - Path to check
 * @returns true if path is absolute
 *
 * @example
 * ```typescript
 * isAbsolutePath('D:\\project\\file.mp4');  // true
 * isAbsolutePath('/home/user/file.mp4');    // true
 * isAbsolutePath('public/videos/file.mp4'); // false
 * ```
 */
export function isAbsolutePath(inputPath: string): boolean {
  if (!inputPath) return false;

  // Windows absolute path: C:\ or D:/ etc.
  if (/^[a-zA-Z]:[\\/]/.test(inputPath)) {
    return true;
  }

  // Unix absolute path: starts with /
  if (inputPath.startsWith('/')) {
    return true;
  }

  return false;
}

/**
 * Ensure path uses correct separator for current platform
 *
 * Use when you need platform-native paths (e.g., for fs operations).
 * For web/database storage, prefer normalizePath() instead.
 *
 * @param inputPath - Path with any separators
 * @returns Path with platform-appropriate separators
 *
 * @example
 * ```typescript
 * // On Windows:
 * toPlatformPath('public/videos/123/final.mp4');
 * // Returns: 'public\\videos\\123\\final.mp4'
 *
 * // On Unix:
 * toPlatformPath('public\\videos\\123\\final.mp4');
 * // Returns: 'public/videos/123/final.mp4'
 * ```
 */
export function toPlatformPath(inputPath: string): string {
  if (!inputPath) return '';

  // First normalize to forward slashes
  const normalized = normalizePath(inputPath);

  // On Windows, convert to backslashes
  if (path.sep === '\\') {
    return normalized.replace(/\//g, '\\');
  }

  return normalized;
}

/**
 * Join path segments with forward slashes
 *
 * Alternative to path.join() that always uses forward slashes.
 * Useful for constructing web paths or database storage paths.
 *
 * @param segments - Path segments to join
 * @returns Joined path with forward slashes
 *
 * @example
 * ```typescript
 * joinPath('public', 'videos', projectId, 'final.mp4');
 * // Returns: 'public/videos/abc123/final.mp4'
 * ```
 */
export function joinPath(...segments: string[]): string {
  return segments
    .filter(Boolean)
    .map(s => normalizePath(s))
    .join('/')
    .replace(/\/+/g, '/');  // Remove duplicate slashes
}
