/**
 * Project ID Validation Utility
 *
 * Provides UUID v4 format validation for project IDs to prevent
 * path traversal attacks and ensure data integrity.
 *
 * Security: Blocks malicious inputs like "../../../etc/passwd"
 *
 * @module lib/utils/validate-project-id
 */

/**
 * UUID v4 format regex
 * Pattern: 8-4-4-4-12 hexadecimal characters
 * Version nibble: 4 (UUID v4)
 * Variant bits: 8, 9, a, or b
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate that a project ID is a valid UUID v4 format
 *
 * This prevents path traversal attacks by rejecting IDs like:
 * - "../../../etc/passwd"
 * - "/tmp/malicious"
 * - "..\\..\\Windows\\System32"
 * - "%2e%2e%2f" (URL-encoded)
 *
 * @param projectId - The project ID to validate
 * @returns true if valid UUID v4, false otherwise
 *
 * @example
 * ```typescript
 * validateProjectId("550e8400-e29b-41d4-a716-446655440000"); // true
 * validateProjectId("../../../etc/passwd"); // false
 * validateProjectId("/tmp/malicious"); // false
 * validateProjectId("not-a-uuid"); // false
 * ```
 */
export function validateProjectId(projectId: string | null | undefined): boolean {
  // Reject null, undefined, or empty strings
  if (!projectId || typeof projectId !== 'string') {
    return false;
  }

  // Reject strings that are too long (UUIDs are always 36 characters)
  if (projectId.length !== 36) {
    return false;
  }

  // Validate UUID v4 format
  return UUID_V4_REGEX.test(projectId);
}

/**
 * Validate project ID and throw descriptive error if invalid
 *
 * Convenience function for API endpoints that need to validate
 * and reject invalid project IDs with a clear error message.
 *
 * @param projectId - The project ID to validate
 * @throws Error if project ID is invalid
 *
 * @example
 * ```typescript
 * try {
 *   assertValidProjectId(req.params.id);
 *   // Continue with valid project ID
 * } catch (error) {
 *   return res.status(400).json({ error: error.message });
 * }
 * ```
 */
export function assertValidProjectId(projectId: string | null | undefined): asserts projectId is string {
  if (!validateProjectId(projectId)) {
    throw new Error(
      'Invalid project ID format. Project ID must be a valid UUID v4 (e.g., "550e8400-e29b-41d4-a716-446655440000").'
    );
  }
}

/**
 * Extract project ID from URL path and validate
 *
 * Helper for API routes that receive project ID as a path parameter.
 *
 * @param path - URL path containing project ID (e.g., "/api/projects/550e8400-.../generate")
 * @returns Validated project ID or null if invalid
 *
 * @example
 * ```typescript
 * const projectId = extractAndValidateProjectId(req.url);
 * if (!projectId) {
 *   return res.status(400).json({ error: 'Invalid project ID' });
 * }
 * ```
 */
export function extractAndValidateProjectId(path: string): string | null {
  // Extract UUID-like pattern from path
  const uuidMatch = path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

  if (!uuidMatch) {
    return null;
  }

  const projectId = uuidMatch[0];

  return validateProjectId(projectId) ? projectId : null;
}
