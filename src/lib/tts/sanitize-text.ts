/**
 * Text Sanitization for TTS Generation
 *
 * This module provides utilities to clean text before sending to TTS engine.
 * Removes markdown formatting, scene labels, stage directions, and other
 * non-speakable content that would cause TTS to sound unnatural.
 *
 * @module lib/tts/sanitize-text
 */

/**
 * Sanitization result with validation feedback
 */
export interface SanitizationResult {
  /** Whether the text passes sanitization validation */
  valid: boolean;
  /** List of issues found (empty if valid) */
  issues: string[];
}

/**
 * Sanitize text for TTS generation
 *
 * Removes:
 * - Markdown formatting (bold, italic, code, etc.)
 * - Markdown headers (###, ##, #)
 * - Scene labels ("Scene 1:", "Title:")
 * - Stage directions ([action], [emotion], etc.)
 * - Multiple consecutive whitespace
 *
 * Preserves:
 * - Punctuation (periods, commas, exclamation marks, etc.)
 * - Line breaks (collapsed to single space)
 * - Numbers and alphanumeric content
 *
 * @param text - Text to sanitize
 * @returns Sanitized text safe for TTS
 *
 * @example
 * ```typescript
 * const input = "**Scene 1:** This is *important* text.";
 * const output = sanitizeForTTS(input);
 * // Result: "This is important text."
 * ```
 */
export function sanitizeForTTS(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let sanitized = text;

  // ============================================
  // Remove Markdown Formatting
  // ============================================

  // Bold: **text** or __text__
  sanitized = sanitized.replace(/\*\*(.+?)\*\*/g, '$1');
  sanitized = sanitized.replace(/__(.+?)__/g, '$1');

  // Italic: *text* or _text_
  sanitized = sanitized.replace(/\*(.+?)\*/g, '$1');
  sanitized = sanitized.replace(/_(.+?)_/g, '$1');

  // Code: `text`
  sanitized = sanitized.replace(/`(.+?)`/g, '$1');

  // Strikethrough: ~~text~~
  sanitized = sanitized.replace(/~~(.+?)~~/g, '$1');

  // ============================================
  // Remove Markdown Headers
  // ============================================

  // Remove header markers: # Header, ## Header, etc.
  sanitized = sanitized.replace(/^#+\s+/gm, '');

  // ============================================
  // Remove Scene Labels
  // ============================================

  // "Scene 1:", "Scene 2:", etc. (case insensitive)
  sanitized = sanitized.replace(/^Scene\s+\d+:?\s*/gmi, '');

  // "Title:", "Intro:", etc.
  sanitized = sanitized.replace(/^Title:?\s*/gmi, '');
  sanitized = sanitized.replace(/^Intro:?\s*/gmi, '');
  sanitized = sanitized.replace(/^Outro:?\s*/gmi, '');

  // ============================================
  // Remove Stage Directions
  // ============================================

  // [action], [emotion], [pause], etc.
  sanitized = sanitized.replace(/\[([^\]]+)\]/g, '');

  // ============================================
  // Remove URLs
  // ============================================

  // HTTP(S) URLs
  sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '');

  // ============================================
  // Collapse Whitespace
  // ============================================

  // Replace multiple spaces with single space
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Replace multiple line breaks with single line break
  sanitized = sanitized.replace(/\n+/g, '\n');

  // Trim leading/trailing whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validate text after sanitization
 *
 * Checks for common issues that might remain after sanitization:
 * - Markdown formatting characters (* # _ `)
 * - Scene labels (Scene 1, Scene 2, etc.)
 * - Stage directions ([...])
 * - URLs
 *
 * @param text - Text to validate (should be already sanitized)
 * @returns Validation result with list of issues
 *
 * @example
 * ```typescript
 * const text = "This is clean text.";
 * const result = validateSanitization(text);
 * // Result: { valid: true, issues: [] }
 *
 * const badText = "This has *markdown*.";
 * const result2 = validateSanitization(badText);
 * // Result: { valid: false, issues: ['Contains asterisk'] }
 * ```
 */
export function validateSanitization(text: string): SanitizationResult {
  const issues: string[] = [];

  // Check for markdown formatting characters
  if (text.includes('*')) {
    issues.push('Contains asterisk (markdown formatting)');
  }
  if (text.includes('#')) {
    issues.push('Contains hash symbol (markdown header)');
  }
  if (text.includes('_') && /_\w+_/.test(text)) {
    issues.push('Contains underscore (markdown formatting)');
  }
  if (text.includes('`')) {
    issues.push('Contains backtick (code formatting)');
  }

  // Check for scene labels
  if (/Scene\s+\d+/i.test(text)) {
    issues.push('Contains scene label (Scene N)');
  }

  // Check for stage directions
  if (text.includes('[') && text.includes(']')) {
    issues.push('Contains stage directions [...]');
  }

  // Check for URLs
  if (/https?:\/\//i.test(text)) {
    issues.push('Contains URL');
  }

  // Check for excessive whitespace
  if (/\s{2,}/.test(text)) {
    issues.push('Contains multiple consecutive spaces');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Pre-sanitized preview text for voice samples
 *
 * This text is used to generate preview audio for all voice profiles.
 * It is pre-sanitized to ensure consistent, high-quality preview samples.
 *
 * Requirements:
 * - No markdown formatting
 * - No special characters
 * - Clear, natural speech
 * - 20-30 words (optimal for preview length)
 * - Representative of typical narration
 */
export const PREVIEW_TEXT =
  "Hello, I'm your AI video narrator. Let me help bring your story to life with clarity and emotion.";

/**
 * Validate that preview text is properly sanitized
 *
 * This is a safety check to ensure PREVIEW_TEXT constant hasn't been
 * accidentally modified with non-speakable content.
 *
 * @returns Validation result
 */
export function validatePreviewText(): SanitizationResult {
  return validateSanitization(PREVIEW_TEXT);
}

/**
 * Sanitize and validate text in one step
 *
 * Convenience function that sanitizes text and returns both the
 * sanitized text and validation result.
 *
 * @param text - Text to sanitize
 * @returns Object with sanitized text and validation result
 *
 * @example
 * ```typescript
 * const { sanitized, validation } = sanitizeAndValidate("**Scene 1:** Hello");
 * console.log(sanitized);  // "Hello"
 * console.log(validation.valid);  // true
 * ```
 */
export function sanitizeAndValidate(text: string): {
  sanitized: string;
  validation: SanitizationResult;
} {
  const sanitized = sanitizeForTTS(text);
  const validation = validateSanitization(sanitized);
  return { sanitized, validation };
}

/**
 * Estimate speech duration from text
 *
 * Rough estimate based on average speaking rate:
 * - Average: 150 words per minute
 * - Narration: ~130 words per minute (slower for clarity)
 *
 * Note: Actual duration will vary based on voice, punctuation, and content.
 * Use actual TTS-generated duration for accuracy.
 *
 * @param text - Text to estimate duration for
 * @returns Estimated duration in seconds
 *
 * @example
 * ```typescript
 * const text = "This is a test sentence with several words.";
 * const duration = estimateSpeechDuration(text);
 * // Result: ~2-3 seconds
 * ```
 */
export function estimateSpeechDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const wordsPerMinute = 130; // Narration speed
  const minutes = words / wordsPerMinute;
  const seconds = minutes * 60;
  return Math.round(seconds * 10) / 10; // Round to 1 decimal place
}
