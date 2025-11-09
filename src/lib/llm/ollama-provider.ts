import { Ollama } from 'ollama';
import type { LLMProvider, Message } from './provider';

/**
 * OllamaProvider implements the LLMProvider interface for local Ollama integration
 *
 * This provider uses the ollama npm package (v0.6.2) to communicate with a local
 * Ollama server running at http://localhost:11434. It handles system prompt
 * prepending and provides user-friendly error messages for common failure scenarios.
 *
 * @example
 * ```typescript
 * const provider = new OllamaProvider('http://localhost:11434', 'llama3.2');
 * const response = await provider.chat(
 *   [{ role: 'user', content: 'Hello!' }],
 *   'You are a helpful assistant.'
 * );
 * ```
 */
export class OllamaProvider implements LLMProvider {
  private ollama: Ollama;
  private model: string;
  private baseUrl: string;

  /**
   * Creates a new OllamaProvider instance
   *
   * @param baseUrl - The Ollama server URL (default: http://localhost:11434)
   * @param model - The model name to use (default: llama3.2)
   */
  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3.2') {
    // Remove timeout limit - allow unlimited time for large models like llama3:latest
    // Use custom fetch with no timeout (default is 30 seconds)
    this.ollama = new Ollama({
      host: baseUrl,
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        // Use AbortSignal.timeout with very long duration (20 minutes)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200000); // 20 minutes in ms

        try {
          const response = await fetch(input, {
            ...init,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      },
    });
    this.model = model;
    this.baseUrl = baseUrl;
  }

  /**
   * Send a chat message to Ollama and receive a response
   *
   * This method prepends the system prompt (if provided) to the messages array
   * before sending to Ollama. It handles various error scenarios with user-friendly
   * messages to guide troubleshooting.
   *
   * @param messages - Array of conversation messages
   * @param systemPrompt - Optional system prompt to prepend
   * @returns Promise resolving to the assistant's response
   * @throws Error with actionable guidance for connection, model, or timeout issues
   */
  async chat(messages: Message[], systemPrompt?: string): Promise<string> {
    try {
      // Prepend system prompt if provided
      const chatMessages = systemPrompt
        ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
        : messages;

      const response = await this.ollama.chat({
        model: this.model,
        messages: chatMessages,
      });

      return response.message.content;
    } catch (error: any) {
      // Handle errors with user-friendly messages
      throw this.handleError(error);
    }
  }

  /**
   * Transform Ollama errors into user-friendly error messages with actionable guidance
   *
   * @param error - The original error from Ollama
   * @returns Error with user-friendly message
   */
  private handleError(error: any): Error {
    // Connection refused - Ollama service not running
    if (error.code === 'ECONNREFUSED') {
      return new Error(
        `Could not connect to Ollama service at ${this.baseUrl}.

Please ensure Ollama is running:
1. Start Ollama: Run 'ollama serve' in a terminal
2. Verify the service: Open ${this.baseUrl} in a browser
3. Check OLLAMA_BASE_URL in .env.local matches the running service`
      );
    }

    // Model not found
    if (error.message?.includes('model') && (error.message?.includes('not found') || error.message?.includes('not installed'))) {
      return new Error(
        `Model '${this.model}' not found in Ollama.

Please pull the model:
1. Run: ollama pull ${this.model}
2. Verify: ollama list (to see installed models)
3. Update OLLAMA_MODEL in .env.local if using a different model`
      );
    }

    // Timeout errors
    if (error.message?.includes('timeout') || error.message?.includes('aborted') || error.code === 'ETIMEDOUT') {
      return new Error(
        `Ollama request timed out after 20 minutes.

The model may be overloaded or your system resources are exhausted. Try:
1. Close other applications to free up RAM/CPU
2. Use a smaller model (llama3.2 instead of llama3:latest)
3. Reduce script length (shorter video duration)
4. Restart Ollama service: 'ollama serve'`
      );
    }

    // Generic LLM error with original message
    return new Error(`LLM error: ${error.message || 'Unknown error occurred'}`);
  }
}
