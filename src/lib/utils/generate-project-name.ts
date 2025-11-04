/**
 * Generate Project Name Utility
 *
 * Generates a project name from the first user message.
 * Truncates to 30 characters max, trimming to last complete word.
 *
 * Rules:
 * - If message < 5 chars: Return "New Project [date]"
 * - If message <= 30 chars: Return as-is
 * - If message > 30 chars: Truncate to last complete word + "..."
 * - If no good break point: Hard truncate to 27 chars + "..."
 *
 * GitHub Repository: https://github.com/AIfriendly/AIvideogen
 */

/**
 * Generate a project name from the first user message
 *
 * @param firstMessage - The first message sent by the user
 * @returns Generated project name (max 30 characters)
 *
 * @example
 * ```typescript
 * generateProjectName("Create a video about space")
 * // Returns: "Create a video about space"
 *
 * generateProjectName("I want to create an amazing video about deep space exploration and the cosmos")
 * // Returns: "Create an amazing video..."
 *
 * generateProjectName("Hi")
 * // Returns: "New Project 11/4/2025"
 * ```
 */
export function generateProjectName(firstMessage: string): string {
  const MAX_LENGTH = 30;
  const MIN_LENGTH = 5;
  const ELLIPSIS = '...';

  // Trim whitespace
  const trimmed = firstMessage.trim();

  // Handle empty or very short messages
  if (trimmed.length < MIN_LENGTH) {
    const date = new Date().toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
    return `New Project ${date}`;
  }

  // If short enough, return as-is
  if (trimmed.length <= MAX_LENGTH) {
    return trimmed;
  }

  // Truncate to MAX_LENGTH
  const truncated = trimmed.substring(0, MAX_LENGTH);

  // Find last space to avoid cutting mid-word
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  // If we have a good break point (not too close to start)
  if (lastSpaceIndex > MIN_LENGTH) {
    return truncated.substring(0, lastSpaceIndex) + ELLIPSIS;
  }

  // No good break point - hard truncate
  const hardTruncateLength = MAX_LENGTH - ELLIPSIS.length;
  return truncated.substring(0, hardTruncateLength) + ELLIPSIS;
}

// TODO: Add unit tests for edge cases:
// - Empty string
// - Only whitespace
// - Very short messages (< 5 chars)
// - Messages exactly 30 chars
// - Messages with no spaces (single long word)
// - Messages with special characters
// - Messages with emoji
