/**
 * Message Helper Utilities
 *
 * Provides helper functions for message generation and error handling.
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

/**
 * Browser-safe UUID generation with fallback
 *
 * Uses crypto.randomUUID() when available (modern browsers, secure contexts)
 * Falls back to timestamp + random string for older browsers
 *
 * Compatible with:
 * - Chrome 92+, Firefox 95+, Safari 15.4+ (crypto.randomUUID)
 * - All browsers including older versions (fallback)
 */
export function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers or non-secure contexts (HTTP, file://)
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Error code to user-friendly message mapping
 *
 * Maps specific API error codes to actionable user messages.
 * Provides clear guidance for common error scenarios.
 */
export const ERROR_MESSAGES: Record<string, string> = {
  OLLAMA_CONNECTION_ERROR: 'Unable to connect to Ollama. Please ensure it is running at http://localhost:11434',
  INVALID_PROJECT_ID: 'Project not found. Please refresh the page.',
  EMPTY_MESSAGE: 'Message cannot be empty',
  DATABASE_ERROR: 'Failed to save message. Please try again.',
};

/**
 * Get user-friendly error message from error code
 *
 * @param errorCode - Error code from API response
 * @param fallbackMessage - Default message if code not found
 * @returns User-friendly error message
 */
export function getErrorMessage(errorCode: string | undefined, fallbackMessage: string = 'An unexpected error occurred'): string {
  if (!errorCode) return fallbackMessage;
  return ERROR_MESSAGES[errorCode] || fallbackMessage;
}
