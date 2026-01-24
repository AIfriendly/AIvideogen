import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, Message } from './provider';
import { rateLimiter, parseRateLimitConfig, type RateLimitConfig } from './rate-limiter';

/**
 * GeminiProvider implements the LLMProvider interface for Google Gemini integration
 *
 * This provider uses the @google/generative-ai package to communicate with
 * Google's Gemini API. It supports both free and paid tiers with configurable
 * rate limiting to prevent quota exhaustion.
 *
 * Rate Limiting:
 * - Default: 1 request per minute for Gemini text models
 * - Configurable via GEMINI_RATE_LIMIT_ENABLED and GEMINI_RATE_LIMIT_REQUESTS_PER_MINUTE
 * - Rate limiting occurs BEFORE API calls (proactive) vs retry logic (reactive)
 *
 * @example
 * ```typescript
 * const provider = new GeminiProvider('your-api-key', 'gemini-2.5-flash');
 * const response = await provider.chat(
 *   [{ role: 'user', content: 'Hello!' }],
 *   'You are a helpful assistant.'
 * );
 * ```
 */
export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;
  private rateLimitConfig: RateLimitConfig;

  // Retry configuration for handling temporary API overload (503 errors)
  // 5 retries with exponential backoff: 1s, 2s, 4s, 8s, 16s (total: 31s max wait)
  private readonly maxRetries: number = 5;
  private readonly baseDelayMs: number = 1000; // 1 second base delay

  /**
   * Creates a new GeminiProvider instance
   *
   * @param apiKey - Google AI Studio API key
   * @param model - The model name to use (default: gemini-2.5-flash)
   */
  constructor(
    apiKey: string,
    model: string = 'gemini-2.5-flash'
  ) {
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      throw new Error(
        'Gemini API key not configured. Please set GEMINI_API_KEY in .env.local\n' +
        'Get your free API key at: https://aistudio.google.com/apikey'
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = model;

    // Load rate limit configuration from environment variables
    this.rateLimitConfig = parseRateLimitConfig(
      'GEMINI_RATE_LIMIT_ENABLED',
      'GEMINI_RATE_LIMIT_REQUESTS_PER_MINUTE',
      true,  // Default: enabled
      1      // Default: 1 request per minute
    );

    if (this.rateLimitConfig.enabled) {
      console.log(
        `[Gemini RateLimit] Rate limiting enabled: ${this.rateLimitConfig.requestsPerMinute} req/min`
      );
    } else {
      console.log('[Gemini RateLimit] Rate limiting disabled');
    }
  }

  /**
   * Send a chat message to Gemini and receive a response
   *
   * This method:
   * 1. Applies rate limiting BEFORE the API call (proactive)
   * 2. Converts our Message format to Gemini's format
   * 3. Handles system prompts by prepending them to the user's first message
   * 4. Implements exponential backoff retry for 503 errors (reactive)
   *
   * Rate Limiting: Occurs BEFORE the retry loop to prevent counting
   * failed retries against the rate limit.
   *
   * @param messages - Array of conversation messages
   * @param systemPrompt - Optional system prompt to prepend
   * @returns Promise resolving to the assistant's response
   * @throws Error with actionable guidance for API key, quota, or network issues
   */
  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    // Apply rate limiting BEFORE API call (proactive)
    // This is separate from retry logic (reactive) and prevents failed retries
    // from counting against the rate limit
    await rateLimiter.wait(
      'gemini',
      this.rateLimitConfig.requestsPerMinute,
      this.rateLimitConfig.enabled
    );

    let lastError: any;

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192, // Gemini Flash supports up to 8K output
          },
        });

        // Convert messages to Gemini format
        // Gemini doesn't have a "system" role, so we prepend system prompt to first user message
        const geminiMessages = this.convertMessages(messages, systemPrompt);

        // Start chat with history
        const chat = model.startChat({
          history: geminiMessages.slice(0, -1), // All messages except the last
        });

        // Send the last message and get response
        const lastMessage = geminiMessages[geminiMessages.length - 1];
        const result = await chat.sendMessage(lastMessage.parts[0].text);
        const response = result.response;

        // Success - log if this was a retry
        if (attempt > 0) {
          console.log(`[Gemini] Request succeeded on attempt ${attempt + 1}/${this.maxRetries}`);
        }

        return response.text();
      } catch (error: any) {
        lastError = error;

        // Log the error for debugging
        console.error('[Gemini] Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack?.split('\n')[0],
          fullError: JSON.stringify(error, null, 2)
        });

        // Check if error is retryable (503 Service Unavailable or network issues)
        const isRetryable = this.isRetryableError(error);

        // If not retryable, or this was the last attempt, throw immediately
        if (!isRetryable || attempt === this.maxRetries - 1) {
          throw this.handleError(error);
        }

        // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delayMs = this.baseDelayMs * Math.pow(2, attempt);
        console.log(
          `[Gemini] API overloaded (503), retrying in ${delayMs}ms ` +
          `(attempt ${attempt + 1}/${this.maxRetries})`
        );

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // This should never be reached due to the throw in the loop, but TypeScript needs it
    throw this.handleError(lastError);
  }

  /**
   * Determine if an error is retryable (temporary issues that might resolve)
   *
   * @param error - The error to check
   * @returns true if the error should trigger a retry
   */
  private isRetryableError(error: any): boolean {
    const errorMessage = error.message || error.toString();

    // 503 Service Unavailable (model overloaded)
    if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
      return true;
    }

    // Network/connection issues (temporary)
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT')) {
      return true;
    }

    // Generic fetch errors (might be temporary)
    if (errorMessage.includes('fetch failed')) {
      return true;
    }

    // NOT retryable:
    // - 401/403 (auth issues - won't fix with retry)
    // - 400/422 (bad request - won't fix with retry)
    // - 429 (rate limit - needs longer backoff, handled separately by rate limiter)
    return false;
  }

  /**
   * Convert our Message format to Gemini's format
   *
   * Gemini uses a different message structure:
   * - role: "user" or "model" (not "assistant")
   * - parts: array of content parts
   *
   * System prompts are prepended to the first user message.
   */
  private convertMessages(messages: Message[], systemPrompt?: string) {
    const geminiMessages: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    let firstUserMessage = true;

    for (const msg of messages) {
      // Skip system messages (already handled in prepend)
      if (msg.role === 'system') {
        continue;
      }

      // Prepend system prompt to first user message
      let content = msg.content;
      if (msg.role === 'user' && firstUserMessage && systemPrompt) {
        content = `${systemPrompt}\n\n${content}`;
        firstUserMessage = false;
      }

      geminiMessages.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: content }],
      });
    }

    return geminiMessages;
  }

  /**
   * Transform Gemini errors into user-friendly error messages with actionable guidance
   *
   * @param error - The original error from Gemini API
   * @returns Error with user-friendly message
   */
  private handleError(error: any): Error {
    const errorMessage = error.message || error.toString();

    // Invalid API key
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid_api_key')) {
      return new Error(
        'Invalid Gemini API key.\n\n' +
        'Please check your GEMINI_API_KEY in .env.local\n' +
        'Get a new API key at: https://aistudio.google.com/apikey'
      );
    }

    // Service overloaded (503) - this shouldn't normally be seen due to retries
    if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
      return new Error(
        'Gemini API is temporarily overloaded.\n\n' +
        `Retried ${this.maxRetries} times with exponential backoff (max wait: 31 seconds).\n` +
        'This is a temporary Google infrastructure issue.\n' +
        'Please wait a few minutes and try again.'
      );
    }

    // Quota exceeded (rate limit)
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return new Error(
        'Gemini API quota exceeded.\n\n' +
        'Free tier limits: 15 requests/minute, 1500 requests/day\n' +
        'Wait a minute and try again, or upgrade to paid tier for higher limits.\n' +
        'You can adjust rate limiting via GEMINI_RATE_LIMIT_REQUESTS_PER_MINUTE environment variable.'
      );
    }

    // Content filter / safety
    if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
      return new Error(
        'Content was blocked by Gemini safety filters.\n\n' +
        'Try rephrasing your topic to avoid potentially sensitive content.\n' +
        'Gemini has stricter content policies than local models.'
      );
    }

    // Model not found (check BEFORE network errors - more specific)
    if (errorMessage.includes('models/') && errorMessage.includes('not found')) {
      return new Error(
        `Model '${this.modelName}' not found.\n\n` +
        'Available models (Gemini 2.5 and 2.0 only):\n' +
        '  - gemini-2.5-flash (recommended, fastest, stable)\n' +
        '  - gemini-2.5-pro (best quality, stable)\n' +
        '  - gemini-flash-latest (auto-updates to latest)\n' +
        '  - gemini-pro-latest (auto-updates to latest)\n' +
        'Note: Gemini 1.5 models are deprecated.\n' +
        'Update GEMINI_MODEL in .env.local'
      );
    }

    // Network / connection issues
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
      return new Error(
        'Network error connecting to Gemini API.\n\n' +
        'Please check your internet connection and try again.\n' +
        'If using a proxy or VPN, ensure it allows access to generativelanguage.googleapis.com'
      );
    }

    // Generic error with original message
    return new Error(`Gemini API error: ${errorMessage}`);
  }
}
