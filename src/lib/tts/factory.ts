/**
 * TTS Provider Factory
 *
 * This module implements the Factory Pattern for TTS providers, enabling runtime
 * selection based on environment configuration. Follows the same pattern as
 * Epic 1's LLM provider factory.
 *
 * Pattern Correspondence:
 * - createLLMProvider() ↔ createTTSProvider()
 * - OllamaProvider ↔ KokoroProvider
 * - Environment-based selection ↔ Environment-based selection
 *
 * @module lib/tts/factory
 * @see lib/llm/factory.ts - Template for this factory pattern
 */

import { KokoroProvider } from './kokoro-provider';
import type { TTSProvider } from './provider';

/**
 * Factory function to create a TTSProvider instance based on environment configuration
 *
 * This function implements the Factory Pattern, enabling runtime selection of TTS
 * providers based on the TTS_PROVIDER environment variable. It supports future
 * extensibility to add Google TTS, Azure TTS, or other providers without modifying
 * the calling code.
 *
 * Environment Variables:
 * - TTS_PROVIDER: Provider type (default: 'kokoro')
 * - TTS_TIMEOUT_MS_COLD: Cold start timeout in ms (default: 30000)
 * - TTS_TIMEOUT_MS_WARM: Warm request timeout in ms (default: 10000)
 * - TTS_MODEL_PATH: Optional custom model path
 * - TTS_AUDIO_FORMAT: Audio format (default: 'mp3')
 * - TTS_AUDIO_BITRATE: Audio bitrate (default: 128)
 * - TTS_AUDIO_SAMPLE_RATE: Sample rate (default: 44100)
 * - TTS_AUDIO_CHANNELS: Audio channels (default: 1 for mono)
 *
 * @returns TTSProvider instance configured from environment variables
 * @throws Error if the provider type is unsupported
 *
 * @example
 * ```typescript
 * // In .env.local:
 * // TTS_PROVIDER=kokoro
 * // TTS_TIMEOUT_MS_COLD=30000
 * // TTS_TIMEOUT_MS_WARM=10000
 *
 * const provider = createTTSProvider();
 * const audio = await provider.generateAudio('Hello, world!', 'sarah');
 * console.log(`Generated: ${audio.duration}s`);
 * ```
 */
export function createTTSProvider(): TTSProvider {
  const provider = process.env.TTS_PROVIDER || 'kokoro';

  if (provider === 'kokoro') {
    return new KokoroProvider();
  }

  // Future providers can be added here:
  // if (provider === 'google') {
  //   return new GoogleTTSProvider(process.env.GOOGLE_TTS_API_KEY);
  // }
  // if (provider === 'azure') {
  //   return new AzureTTSProvider(
  //     process.env.AZURE_TTS_KEY,
  //     process.env.AZURE_TTS_REGION
  //   );
  // }
  // if (provider === 'elevenlabs') {
  //   return new ElevenLabsProvider(process.env.ELEVENLABS_API_KEY);
  // }

  throw new Error(
    `Unsupported TTS provider: ${provider}. ` +
      `Supported providers: kokoro. ` +
      `Check TTS_PROVIDER in .env.local`
  );
}

/**
 * Singleton instance for application-wide use
 *
 * Reusing the same provider instance enables:
 * - Persistent service across requests (performance)
 * - Shared model caching (memory efficiency)
 * - Consistent error handling
 *
 * @example
 * ```typescript
 * import { getTTSProvider } from '@/lib/tts/factory';
 *
 * const provider = getTTSProvider();
 * const audio = await provider.generateAudio('Hello', 'sarah');
 * ```
 */
let providerInstance: TTSProvider | null = null;

/**
 * Get singleton TTS provider instance
 *
 * This returns the same provider instance across all calls, ensuring:
 * - Persistent service connection
 * - Shared model caching
 * - Optimal performance
 *
 * @returns TTSProvider singleton instance
 */
export function getTTSProvider(): TTSProvider {
  if (!providerInstance) {
    providerInstance = createTTSProvider();
  }
  return providerInstance;
}

/**
 * Reset singleton instance (for testing)
 *
 * This is useful in tests to ensure a clean slate between test cases.
 * Should NOT be used in production code.
 */
export function resetTTSProvider(): void {
  if (providerInstance) {
    providerInstance.cleanup().catch(console.error);
    providerInstance = null;
  }
}
