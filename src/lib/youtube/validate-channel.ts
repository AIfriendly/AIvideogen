/**
 * YouTube Channel URL Validation - Security Mitigation R-6.7.04
 *
 * Provides strict validation and sanitization of YouTube channel URLs/IDs
 * to prevent URL injection and API abuse.
 *
 * @see docs/sprint-artifacts/test-design-story-6.7.md - Risk R-6.7.04
 */

/**
 * Supported YouTube channel URL/ID formats:
 * - Channel ID: UC + 22 alphanumeric characters (e.g., UCxxxxxxxxxxxxxxxxxxxxxx)
 * - Handle: @username (3-30 characters, alphanumeric, dots, underscores, hyphens)
 * - Full handle URL: https://youtube.com/@username
 * - Full channel URL: https://youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx
 * - Custom URL: https://youtube.com/c/customname
 * - Legacy user URL: https://youtube.com/user/username
 */

// Strict regex patterns for YouTube channel identification
const YOUTUBE_CHANNEL_PATTERNS = {
  // Channel ID format: UC followed by 22 base64-like characters
  channelId: /^UC[\w-]{22}$/,

  // Handle format: @ followed by 3-30 valid characters
  handle: /^@[\w.-]{3,30}$/,

  // Full URL patterns (anchored, case-insensitive)
  fullHandleUrl: /^https?:\/\/(www\.)?youtube\.com\/@[\w.-]{3,30}\/?$/i,
  fullChannelUrl: /^https?:\/\/(www\.)?youtube\.com\/channel\/UC[\w-]{22}\/?$/i,
  fullCustomUrl: /^https?:\/\/(www\.)?youtube\.com\/c\/[\w.-]{1,100}\/?$/i,
  fullUserUrl: /^https?:\/\/(www\.)?youtube\.com\/user\/[\w.-]{1,100}\/?$/i,
};

// Characters allowed in channel identifiers
const ALLOWED_CHARS = /^[\w.@/-]+$/;

// Maximum input length to prevent DoS
const MAX_INPUT_LENGTH = 256;

export interface ValidationResult {
  valid: boolean;
  type?: 'channelId' | 'handle' | 'url';
  normalizedValue?: string;
  channelId?: string;
  error?: string;
}

/**
 * Validate and sanitize a YouTube channel URL or ID.
 *
 * Security features:
 * - Length limit to prevent buffer overflow/DoS
 * - Strict character whitelist
 * - Protocol validation (http/https only)
 * - No query parameters or fragments allowed
 * - Anchored regex to prevent partial matches
 *
 * @param input - User-provided channel URL or ID
 * @returns Validation result with sanitized value or error
 */
export function validateChannelInput(input: string): ValidationResult {
  // Null/undefined check
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Channel URL or ID is required' };
  }

  // Trim whitespace
  const trimmed = input.trim();

  // Length check (DoS prevention)
  if (trimmed.length === 0) {
    return { valid: false, error: 'Channel URL or ID cannot be empty' };
  }

  if (trimmed.length > MAX_INPUT_LENGTH) {
    return { valid: false, error: `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters` };
  }

  // Block dangerous patterns
  if (containsDangerousPattern(trimmed)) {
    return { valid: false, error: 'Invalid input: contains disallowed characters or patterns' };
  }

  // Try to match each pattern
  // 1. Direct Channel ID (UC...)
  if (YOUTUBE_CHANNEL_PATTERNS.channelId.test(trimmed)) {
    return {
      valid: true,
      type: 'channelId',
      normalizedValue: trimmed,
      channelId: trimmed,
    };
  }

  // 2. Handle (@username)
  if (YOUTUBE_CHANNEL_PATTERNS.handle.test(trimmed)) {
    return {
      valid: true,
      type: 'handle',
      normalizedValue: trimmed,
      // Note: channelId will need to be resolved via YouTube API
    };
  }

  // 3. Full Handle URL
  if (YOUTUBE_CHANNEL_PATTERNS.fullHandleUrl.test(trimmed)) {
    const handle = extractHandleFromUrl(trimmed);
    return {
      valid: true,
      type: 'url',
      normalizedValue: trimmed,
      channelId: handle ? `@${handle}` : undefined,
    };
  }

  // 4. Full Channel URL
  if (YOUTUBE_CHANNEL_PATTERNS.fullChannelUrl.test(trimmed)) {
    const channelId = extractChannelIdFromUrl(trimmed);
    return {
      valid: true,
      type: 'url',
      normalizedValue: trimmed,
      channelId: channelId || undefined,
    };
  }

  // 5. Custom URL (/c/name)
  if (YOUTUBE_CHANNEL_PATTERNS.fullCustomUrl.test(trimmed)) {
    return {
      valid: true,
      type: 'url',
      normalizedValue: trimmed,
      // Note: channelId will need to be resolved via YouTube API
    };
  }

  // 6. Legacy User URL (/user/name)
  if (YOUTUBE_CHANNEL_PATTERNS.fullUserUrl.test(trimmed)) {
    return {
      valid: true,
      type: 'url',
      normalizedValue: trimmed,
      // Note: channelId will need to be resolved via YouTube API
    };
  }

  // No pattern matched
  return {
    valid: false,
    error: 'Invalid YouTube channel URL or ID format. Accepted formats: Channel ID (UCxxxxxx), Handle (@username), or full YouTube URL',
  };
}

/**
 * Check for dangerous patterns that could indicate injection attempts.
 */
function containsDangerousPattern(input: string): boolean {
  const dangerousPatterns = [
    // JavaScript injection
    /javascript:/i,
    /data:/i,
    /vbscript:/i,

    // HTML injection
    /<script/i,
    /<img/i,
    /on\w+=/i,

    // Path traversal
    /\.\./,
    /%2e%2e/i,

    // URL encoding abuse
    /%00/, // Null byte
    /%0a/i, // Line feed
    /%0d/i, // Carriage return

    // SQL injection (paranoid check)
    /['";]/,
    /--/,
    /\/\*/,

    // Command injection
    /[|&;`$]/,
    /\$\(/,
    /`/,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(input));
}

/**
 * Extract handle from a YouTube handle URL.
 */
function extractHandleFromUrl(url: string): string | null {
  const match = url.match(/@([\w.-]{3,30})/);
  return match ? match[1] : null;
}

/**
 * Extract channel ID from a YouTube channel URL.
 */
function extractChannelIdFromUrl(url: string): string | null {
  const match = url.match(/\/channel\/(UC[\w-]{22})/);
  return match ? match[1] : null;
}

/**
 * Sanitize a channel URL for safe logging.
 * Redacts potentially sensitive or dangerous parts.
 */
export function sanitizeForLogging(input: string): string {
  if (!input || typeof input !== 'string') {
    return '[invalid]';
  }

  // Truncate if too long
  const maxLogLength = 100;
  if (input.length > maxLogLength) {
    return input.substring(0, maxLogLength) + '...[truncated]';
  }

  // Replace potentially dangerous characters
  return input.replace(/[<>"']/g, '_');
}

/**
 * Batch validate multiple channel inputs.
 * Useful for Cold Start mode where user selects multiple channels.
 */
export function validateMultipleChannels(
  inputs: string[],
  maxChannels: number = 5
): { valid: ValidationResult[]; invalid: ValidationResult[]; limitExceeded: boolean } {
  const results = {
    valid: [] as ValidationResult[],
    invalid: [] as ValidationResult[],
    limitExceeded: inputs.length > maxChannels,
  };

  // Only validate up to the limit
  const toValidate = inputs.slice(0, maxChannels);

  for (const input of toValidate) {
    const result = validateChannelInput(input);
    if (result.valid) {
      results.valid.push(result);
    } else {
      results.invalid.push(result);
    }
  }

  return results;
}

/**
 * Type guard to check if a string is a valid channel ID format.
 */
export function isChannelId(value: string): boolean {
  return YOUTUBE_CHANNEL_PATTERNS.channelId.test(value);
}

/**
 * Type guard to check if a string is a valid handle format.
 */
export function isHandle(value: string): boolean {
  return YOUTUBE_CHANNEL_PATTERNS.handle.test(value);
}
