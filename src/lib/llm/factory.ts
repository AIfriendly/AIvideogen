import { OllamaProvider } from './ollama-provider';
import { GeminiProvider } from './gemini-provider';
import type { LLMProvider } from './provider';

/**
 * Factory function to create an LLMProvider instance based on environment configuration
 *
 * This function implements the Factory Pattern, enabling runtime selection of LLM
 * providers based on the LLM_PROVIDER environment variable. It supports multiple
 * providers including Ollama (local), Gemini (Google AI), and extensibility for
 * future providers without modifying calling code.
 *
 * Environment Variables:
 * - LLM_PROVIDER: Provider type (default: 'ollama')
 *
 * Ollama Configuration:
 * - OLLAMA_BASE_URL: Ollama server URL (default: 'http://localhost:11434')
 * - OLLAMA_MODEL: Ollama model name (default: 'llama3.2')
 *
 * Gemini Configuration:
 * - GEMINI_API_KEY: Google AI Studio API key (required)
 * - GEMINI_MODEL: Model name (default: 'gemini-1.5-flash-latest')
 *
 * @returns LLMProvider instance configured from environment variables
 * @throws Error if the provider type is unsupported or configuration is missing
 *
 * @example
 * ```typescript
 * // Ollama (local):
 * // LLM_PROVIDER=ollama
 * // OLLAMA_BASE_URL=http://localhost:11434
 * // OLLAMA_MODEL=llama3.2
 *
 * // Gemini (cloud):
 * // LLM_PROVIDER=gemini
 * // GEMINI_API_KEY=your_api_key
 * // GEMINI_MODEL=gemini-1.5-flash-latest
 *
 * const provider = createLLMProvider();
 * const response = await provider.chat([{ role: 'user', content: 'Hello!' }]);
 * ```
 */
export function createLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'ollama';

  if (provider === 'ollama') {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.2';
    return new OllamaProvider(baseUrl, model);
  }

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY || '';
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
    return new GeminiProvider(apiKey, model);
  }

  // Future providers can be added here:
  // if (provider === 'openai') {
  //   return new OpenAIProvider(process.env.OPENAI_API_KEY);
  // }
  // if (provider === 'anthropic') {
  //   return new AnthropicProvider(process.env.ANTHROPIC_API_KEY);
  // }

  throw new Error(
    `Unsupported LLM provider: ${provider}. ` +
    `Supported providers: ollama, gemini. ` +
    `Check LLM_PROVIDER in .env.local`
  );
}
