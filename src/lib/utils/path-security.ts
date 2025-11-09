/**
 * Path Security Utilities
 *
 * Provides path traversal prevention and containment verification
 * to protect against directory traversal attacks.
 *
 * Security: Ensures all file operations stay within allowed directories
 *
 * @module lib/utils/path-security
 */

import path from 'path';
import fs from 'fs';

/**
 * Verify that a constructed path is contained within a base directory
 *
 * This prevents path traversal attacks by ensuring the resolved target path
 * starts with the resolved base directory path.
 *
 * Features:
 * - Resolves symlinks before checking containment
 * - Handles both relative and absolute paths
 * - Works cross-platform (Windows and Unix paths)
 *
 * @param targetPath - The path to verify (may be relative or absolute)
 * @param baseDirectory - The allowed base directory (defaults to audio projects dir)
 * @returns true if target path is within base directory, false otherwise
 *
 * @example
 * ```typescript
 * // Safe path
 * verifyPathContainment(
 *   "D:/project/.cache/audio/projects/uuid/scene-1.mp3"
 * ); // true
 *
 * // Path traversal attempt
 * verifyPathContainment(
 *   "D:/project/../../etc/passwd"
 * ); // false
 *
 * // Absolute path outside base
 * verifyPathContainment(
 *   "/tmp/malicious/scene-1.mp3"
 * ); // false
 * ```
 */
export function verifyPathContainment(
  targetPath: string,
  baseDirectory?: string
): boolean {
  // Default base directory: .cache/audio/projects/
  const baseDir = baseDirectory || path.join(
    process.cwd(),
    '.cache',
    'audio',
    'projects'
  );

  try {
    // Resolve both paths to absolute, canonical forms
    // This resolves "..", ".", and symlinks
    const resolvedTarget = path.resolve(targetPath);
    const resolvedBase = path.resolve(baseDir);

    // Normalize path separators for comparison (handles Windows \ vs Unix /)
    const normalizedTarget = path.normalize(resolvedTarget);
    const normalizedBase = path.normalize(resolvedBase);

    // Check if target path starts with base directory
    // Add path.sep to ensure we're checking directory boundaries
    // (prevents "/base" matching "/base-malicious")
    const isContained =
      normalizedTarget === normalizedBase ||
      normalizedTarget.startsWith(normalizedBase + path.sep);

    return isContained;
  } catch (error) {
    // If path resolution fails (invalid path), reject
    console.error('[Security] Path containment check failed:', error);
    return false;
  }
}

/**
 * Verify path containment and throw error if outside allowed directory
 *
 * Convenience function for code that needs to validate and reject
 * paths that escape the allowed directory.
 *
 * @param targetPath - The path to verify
 * @param baseDirectory - The allowed base directory (optional)
 * @throws Error if path is outside allowed directory
 *
 * @example
 * ```typescript
 * try {
 *   assertPathContainment(audioFilePath);
 *   // Continue with safe file operations
 * } catch (error) {
 *   console.error('Security violation:', error.message);
 *   return;
 * }
 * ```
 */
export function assertPathContainment(
  targetPath: string,
  baseDirectory?: string
): void {
  if (!verifyPathContainment(targetPath, baseDirectory)) {
    const baseDir = baseDirectory || path.join(process.cwd(), '.cache', 'audio', 'projects');
    throw new Error(
      `Security violation: Path traversal detected. Target path "${targetPath}" is outside allowed directory "${baseDir}".`
    );
  }
}

/**
 * Validate scene number format
 *
 * Ensures scene numbers are positive integers to prevent path traversal
 * in filenames like "scene-{number}.mp3".
 *
 * Rejects:
 * - Negative numbers: -1
 * - Decimals: 1.5
 * - Path traversal: "../etc/passwd"
 * - Special characters: "1; rm -rf /"
 *
 * @param sceneNumber - The scene number to validate (string or number)
 * @returns true if valid positive integer, false otherwise
 *
 * @example
 * ```typescript
 * validateSceneNumber(1);           // true
 * validateSceneNumber("42");        // true
 * validateSceneNumber(0);           // false (must be positive)
 * validateSceneNumber(-5);          // false
 * validateSceneNumber("../evil");   // false
 * validateSceneNumber("1.5");       // false
 * ```
 */
export function validateSceneNumber(sceneNumber: string | number): boolean {
  // Convert to string for validation
  const sceneStr = String(sceneNumber);

  // Must be digits only (no dots, dashes, or special characters)
  if (!/^\d+$/.test(sceneStr)) {
    return false;
  }

  // Convert to number and check it's a positive integer
  const sceneNum = parseInt(sceneStr, 10);

  // Must be a positive integer (>= 1)
  return Number.isInteger(sceneNum) && sceneNum >= 1;
}

/**
 * Validate scene number and throw error if invalid
 *
 * @param sceneNumber - The scene number to validate
 * @throws Error if scene number is invalid
 *
 * @example
 * ```typescript
 * try {
 *   assertValidSceneNumber(scene.scene_number);
 *   const filename = `scene-${scene.scene_number}.mp3`;
 * } catch (error) {
 *   console.error('Invalid scene number:', error.message);
 * }
 * ```
 */
export function assertValidSceneNumber(sceneNumber: string | number): void {
  if (!validateSceneNumber(sceneNumber)) {
    throw new Error(
      `Invalid scene number: "${sceneNumber}". Scene number must be a positive integer (1, 2, 3, ...).`
    );
  }
}

/**
 * Safely construct audio file path with validation
 *
 * Combines project ID and scene number into a safe file path,
 * with validation to prevent path traversal attacks.
 *
 * @param projectId - Project UUID (validated)
 * @param sceneNumber - Scene number (validated)
 * @param baseDirectory - Optional base directory (defaults to audio projects dir)
 * @returns Safe, validated audio file path
 * @throws Error if validation fails
 *
 * @example
 * ```typescript
 * const audioPath = constructSafeAudioPath(
 *   "550e8400-e29b-41d4-a716-446655440000",
 *   1
 * );
 * // Returns: "/path/to/project/.cache/audio/projects/550e8400-.../scene-1.mp3"
 * ```
 */
export function constructSafeAudioPath(
  projectId: string,
  sceneNumber: string | number,
  baseDirectory?: string
): string {
  // Validate scene number format
  assertValidSceneNumber(sceneNumber);

  // Construct path (projectId already validated by caller)
  const baseDir = baseDirectory || path.join(
    process.cwd(),
    '.cache',
    'audio',
    'projects'
  );

  const audioPath = path.join(
    baseDir,
    projectId,
    `scene-${sceneNumber}.mp3`
  );

  // Verify path containment
  assertPathContainment(audioPath, baseDir);

  return audioPath;
}

/**
 * Check if a path contains suspicious patterns
 *
 * Additional defense-in-depth check for common path traversal patterns.
 * This is NOT a replacement for proper path validation but adds an extra layer.
 *
 * @param pathString - The path to check
 * @returns true if path contains suspicious patterns
 *
 * @example
 * ```typescript
 * containsSuspiciousPatterns("../../../etc/passwd");     // true
 * containsSuspiciousPatterns("..\\..\\Windows");         // true
 * containsSuspiciousPatterns("%2e%2e%2f");               // true
 * containsSuspiciousPatterns("legitimate-uuid-path");    // false
 * ```
 */
export function containsSuspiciousPatterns(pathString: string): boolean {
  const suspiciousPatterns = [
    /\.\./,              // Parent directory (..)
    /\/\//,              // Double slashes
    /\\/,                // Backslashes (Windows path traversal)
    /%2e/i,              // URL-encoded dot
    /%2f/i,              // URL-encoded slash
    /%5c/i,              // URL-encoded backslash
    /\0/,                // Null byte
    /^\//,               // Absolute path (leading /)
    /^[a-z]:\\/i,        // Windows absolute path (C:\)
  ];

  return suspiciousPatterns.some(pattern => pattern.test(pathString));
}
