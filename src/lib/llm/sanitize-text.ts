/**
 * Text Sanitization Utilities
 *
 * Cleans script text to ensure it's TTS-ready by removing markdown,
 * meta-labels, and other non-narration content.
 */

/**
 * Sanitize script text for TTS input
 *
 * Removes:
 * - Markdown formatting characters (* # _ ~~ `)
 * - Meta-labels ("Scene 1:", "Narrator:", etc.)
 * - Bracketed instructions ([pause], [music], etc.)
 * - URLs and email addresses
 * - Multiple consecutive spaces
 *
 * Preserves:
 * - Punctuation (periods, commas, exclamation marks, etc.)
 * - Capitalization
 * - Line breaks (as single spaces)
 * - Apostrophes and quotation marks
 *
 * @param text - Raw script text to sanitize
 * @returns Clean text ready for TTS processing
 *
 * @example
 * ```typescript
 * const raw = "**Scene 1:** This is *amazing*! [pause] Check out https://example.com";
 * const clean = sanitizeScriptText(raw);
 * // Returns: "This is amazing! Check out"
 * ```
 */
export function sanitizeScriptText(text: string): string {
  let sanitized = text;

  // Remove markdown bold (**) first
  sanitized = sanitized.replace(/\*\*([^*]+)\*\*/g, '$1');

  // Remove markdown underline bold (__)
  sanitized = sanitized.replace(/__([^_]+)__/g, '$1');

  // Remove markdown links [text](url) BEFORE removing brackets
  sanitized = sanitized.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // Remove meta-labels at start (AFTER removing bold which might contain them)
  sanitized = sanitized.replace(/^(Scene\s+\d+|Narrator|Voice\s*\d*|Audio):\s*/gmi, '');
  sanitized = sanitized.replace(/(Scene\s+\d+|Narrator|Voice\s*\d*|Audio):\s*/gi, ''); // Also mid-text

  // Remove bracketed instructions
  sanitized = sanitized.replace(/\[.*?\]/g, '');

  // Remove markdown italic (* _)
  sanitized = sanitized.replace(/\*([^*]+)\*/g, '$1');
  sanitized = sanitized.replace(/_([^_]+)_/g, '$1');

  // Remove markdown strikethrough (~~)
  sanitized = sanitized.replace(/~~(.*?)~~/g, '$1');

  // Remove markdown code blocks and inline code
  sanitized = sanitized.replace(/```[\s\S]*?```/g, '');
  sanitized = sanitized.replace(/`([^`]+)`/g, '$1');

  // Remove markdown headers (#)
  sanitized = sanitized.replace(/^#+\s+/gm, '');

  // Remove URLs (http://, https://, www.)
  sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '');
  sanitized = sanitized.replace(/www\.[^\s]+/g, '');

  // Remove email addresses
  sanitized = sanitized.replace(/\S+@\S+\.\S+/g, '');

  // Remove remaining stray markdown characters
  sanitized = sanitized.replace(/[*_~`#]/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\n+/g, ' ');           // Line breaks to spaces
  sanitized = sanitized.replace(/\s{2,}/g, ' ');        // Multiple spaces to single
  sanitized = sanitized.replace(/\s+([.,!?;:])/g, '$1'); // Remove space before punctuation

  // Trim leading/trailing whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validate sanitization effectiveness
 *
 * Checks if sanitized text differs significantly from original,
 * which may indicate the script had formatting issues.
 *
 * @param original - Original text
 * @param sanitized - Sanitized text
 * @returns Object with validation result and difference percentage
 */
export function validateSanitization(original: string, sanitized: string): {
  hasSignificantChanges: boolean;
  differencePercentage: number;
  warning?: string;
} {
  const originalLength = original.length;
  const sanitizedLength = sanitized.length;
  const lengthDiff = originalLength - sanitizedLength;
  const differencePercentage = (lengthDiff / originalLength) * 100;

  // If more than 10% of content was removed, it may indicate formatting issues
  const hasSignificantChanges = differencePercentage > 10;

  const result = {
    hasSignificantChanges,
    differencePercentage: Math.round(differencePercentage * 10) / 10,
  };

  if (hasSignificantChanges) {
    return {
      ...result,
      warning: `${result.differencePercentage}% of content removed during sanitization - script may have had excessive formatting`
    };
  }

  return result;
}

/**
 * Check if text contains formatting that needs sanitization
 *
 * @param text - Text to check
 * @returns True if text contains markdown or meta-labels
 */
export function needsSanitization(text: string): boolean {
  // Check for markdown characters
  if (/[*_~`#]/.test(text)) return true;

  // Check for meta-labels
  if (/^(Scene\s+\d+|Narrator|Voice|Audio):/mi.test(text)) return true;

  // Check for bracketed instructions
  if (/\[.*?\]/.test(text)) return true;

  // Check for URLs
  if (/https?:\/\/|www\./i.test(text)) return true;

  return false;
}

/**
 * Remove only dangerous characters that could cause security issues
 * This is for input sanitization (topic text) to prevent prompt injection
 *
 * @param input - User input to sanitize
 * @returns Sanitized input safe for use in prompts
 */
export function sanitizeTopicInput(input: string): string {
  let sanitized = input;

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim and limit length
  sanitized = sanitized.trim();
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500);
  }

  // Remove potentially dangerous patterns for prompt injection
  // Keep most punctuation but be careful with repeated special chars
  sanitized = sanitized.replace(/[{}\[\]<>]/g, ''); // Remove brackets that could break JSON
  sanitized = sanitized.replace(/[`]/g, '');         // Remove backticks
  sanitized = sanitized.replace(/(\n){3,}/g, '\n\n'); // Limit newlines

  return sanitized;
}
