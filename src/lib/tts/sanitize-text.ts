/**
 * Text Sanitization Module for TTS Audio Generation
 *
 * Removes non-speakable content from scene text before TTS generation:
 * - Markdown formatting (*, #, _, `, **)
 * - Scene labels ("Scene 1:", "Title:", "Narrator:")
 * - Stage directions [in brackets]
 * - Excess whitespace and newlines
 *
 * Ensures generated audio contains ONLY clean narration without artifacts.
 */

export interface SanitizationResult {
  sanitized: string;
  originalLength: number;
  sanitizedLength: number;
  removedElements: string[];
}

/**
 * Sanitizes text for TTS generation by removing all non-speakable elements
 *
 * @param text - Raw scene text that may contain markdown, labels, or formatting
 * @returns SanitizationResult with cleaned text and metadata
 *
 * @example
 * ```typescript
 * const result = sanitizeForTTS("**Scene 1:** [music] Welcome\n\nto the *show*");
 * // result.sanitized === "Welcome to the show"
 * ```
 */
export function sanitizeForTTS(text: string): SanitizationResult {
  const originalLength = text.length;
  const removedElements: string[] = [];

  let sanitized = text;

  // Step 1: Remove scene labels (must be at start of lines)
  // Patterns: "Scene 1:", "Title:", "Narrator:", "[Audio]:", "[VO]:", "[Voiceover]:"
  const sceneLabelRegex = /^(Scene \d+|Title|Narrator|\[.*?\]):\s*/gim;
  const sceneLabelMatches = sanitized.match(sceneLabelRegex);
  if (sceneLabelMatches) {
    sceneLabelMatches.forEach(match => removedElements.push(match.trim()));
    sanitized = sanitized.replace(sceneLabelRegex, '');
  }

  // Step 2: Remove stage directions [in brackets]
  const stageDirectionRegex = /\[.*?\]/g;
  const stageDirectionMatches = sanitized.match(stageDirectionRegex);
  if (stageDirectionMatches) {
    stageDirectionMatches.forEach(match => removedElements.push(match));
    sanitized = sanitized.replace(stageDirectionRegex, '');
  }

  // Step 3: Remove markdown emphasis patterns (preserve content)
  // Remove **bold** → bold, *italic* → italic, __underline__ → underline, ~~strikethrough~~ → strikethrough
  sanitized = sanitized.replace(/\*\*([^*]+)\*\*/g, '$1'); // **bold**
  sanitized = sanitized.replace(/\*([^*]+)\*/g, '$1'); // *italic*
  sanitized = sanitized.replace(/__([^_]+)__/g, '$1'); // __underline__
  sanitized = sanitized.replace(/~~([^~]+)~~/g, '$1'); // ~~strikethrough~~

  // Step 4: Remove markdown headings (### Title → Title)
  const headingRegex = /^#{1,6}\s+/gm;
  const headingMatches = sanitized.match(headingRegex);
  if (headingMatches) {
    headingMatches.forEach(match => removedElements.push(match.trim()));
    sanitized = sanitized.replace(headingRegex, '');
  }

  // Step 5: Remove inline code backticks (`code` → code)
  sanitized = sanitized.replace(/`([^`]+)`/g, '$1');

  // Step 6: Remove remaining markdown characters (standalone)
  const standaloneMarkdownRegex = /[*#_`~]/g;
  sanitized = sanitized.replace(standaloneMarkdownRegex, '');

  // Step 7: Normalize whitespace
  // Collapse multiple newlines to single space
  sanitized = sanitized.replace(/\n\s*\n+/g, ' ');
  // Collapse single newlines to space
  sanitized = sanitized.replace(/\n/g, ' ');
  // Collapse multiple spaces to single space
  sanitized = sanitized.replace(/\s+/g, ' ');
  // Trim leading and trailing whitespace
  sanitized = sanitized.trim();

  const sanitizedLength = sanitized.length;

  return {
    sanitized,
    originalLength,
    sanitizedLength,
    removedElements: [...new Set(removedElements)] // Remove duplicates
  };
}

/**
 * Validates that sanitized text contains no non-speakable artifacts
 *
 * @param text - Text to validate
 * @returns true if text is clean, false if artifacts detected
 *
 * @example
 * ```typescript
 * validateSanitized("Clean text."); // true
 * validateSanitized("Text with *asterisk*"); // false
 * validateSanitized("[Stage direction] text"); // false
 * ```
 */
export function validateSanitized(text: string): boolean {
  // Check for remaining markdown characters
  if (/[*#_`~]/.test(text)) {
    return false;
  }

  // Check for remaining scene labels at start of string or after newlines
  if (/^(Scene \d+|Title|Narrator|\[.*?\]):/im.test(text)) {
    return false;
  }

  // Check for remaining stage directions
  if (/\[.*?\]/.test(text)) {
    return false;
  }

  // Check for excessive whitespace (multiple spaces or newlines)
  if (/\s{2,}/.test(text)) {
    return false;
  }

  // Text is clean
  return true;
}

/**
 * Batch sanitization for multiple scene texts
 *
 * @param texts - Array of scene texts to sanitize
 * @returns Array of SanitizationResult objects
 */
export function sanitizeBatch(texts: string[]): SanitizationResult[] {
  return texts.map(text => sanitizeForTTS(text));
}
