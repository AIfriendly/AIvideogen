/**
 * TTS Provider Abstraction Layer
 *
 * This module defines the interface for Text-to-Speech providers, following
 * the same Strategy Pattern used in Epic 1's LLM provider abstraction.
 *
 * Pattern Correspondence (Epic 1 LLM ↔ Epic 2 TTS):
 * - LLMProvider ↔ TTSProvider
 * - chat() ↔ generateAudio()
 * - OllamaProvider ↔ KokoroProvider
 * - createLLMProvider() ↔ createTTSProvider()
 *
 * @module lib/tts/provider
 * @see lib/llm/provider.ts - Template for this abstraction pattern
 */

/**
 * Result of audio generation
 *
 * @property audioBuffer - Audio data as Uint8Array (portable, not Buffer)
 * @property duration - Audio duration in seconds (e.g., 5.23)
 * @property filePath - Relative path to saved audio file
 * @property fileSize - File size in bytes
 */
export interface AudioResult {
  audioBuffer: Uint8Array;
  duration: number;
  filePath: string;
  fileSize: number;
}

/**
 * Voice profile metadata
 *
 * @property id - Application voice ID (e.g., 'sarah', 'james')
 * @property name - Display name (e.g., 'Sarah - American Female')
 * @property gender - Voice gender
 * @property accent - Accent/region (e.g., 'american', 'british', 'neutral')
 * @property tone - Tone description (e.g., 'warm', 'professional', 'energetic')
 * @property previewUrl - Path to preview audio sample
 * @property modelId - Provider-specific model identifier (e.g., 'af_sky' for KokoroTTS)
 */
export interface VoiceProfile {
  id: string;
  name: string;
  gender: 'male' | 'female';
  accent: string;
  tone: string;
  previewUrl: string;
  modelId: string;
  mvpVoice?: boolean; // Flag for MVP subset (5 voices)
}

/**
 * TTSProvider interface defines the contract for all TTS provider implementations
 *
 * This abstraction enables the application to interact with different TTS services
 * (KokoroTTS, Google TTS, Azure TTS, etc.) through a unified interface, following
 * the Strategy Pattern for runtime provider selection.
 *
 * Implementation Requirements:
 * - Must support persistent model caching for performance
 * - Must handle errors with standard error codes
 * - Must return Uint8Array (not Buffer) for cross-platform portability
 * - Must support graceful cleanup/shutdown
 *
 * @example
 * ```typescript
 * const provider = createTTSProvider();
 * const result = await provider.generateAudio(
 *   'Hello, I am your AI video narrator.',
 *   'sarah'
 * );
 * console.log(`Audio generated: ${result.duration}s, ${result.fileSize} bytes`);
 * ```
 */
export interface TTSProvider {
  /**
   * Generate audio from text using specified voice
   *
   * This is the primary operation of the TTS provider. Implementation should:
   * - Use persistent model caching for performance
   * - Sanitize text input before synthesis
   * - Save audio to file system
   * - Return audio buffer and metadata
   *
   * Performance targets:
   * - Cold start: <5 seconds (includes model loading)
   * - Warm requests: <2 seconds (model already loaded)
   *
   * @param text - Text to synthesize (max 5000 characters)
   * @param voiceId - Voice profile ID (e.g., 'sarah', 'james')
   * @returns Promise resolving to AudioResult with buffer, duration, path, size
   * @throws Error with code TTS_INVALID_VOICE if voice not found
   * @throws Error with code TTS_TIMEOUT if synthesis times out
   * @throws Error with code TTS_SERVICE_ERROR if service unavailable
   */
  generateAudio(text: string, voiceId: string): Promise<AudioResult>;

  /**
   * Get list of available voice profiles
   *
   * @returns Promise resolving to array of VoiceProfile objects
   * @throws Error if provider is unavailable
   */
  getAvailableVoices(): Promise<VoiceProfile[]>;

  /**
   * Cleanup resources and shutdown service gracefully
   *
   * This should:
   * - Send shutdown signal to persistent service
   * - Wait for service to exit gracefully
   * - Clean up any temporary resources
   * - Not throw errors (best-effort cleanup)
   *
   * @returns Promise resolving when cleanup is complete
   */
  cleanup(): Promise<void>;
}

/**
 * Standard TTS error codes
 *
 * These codes are used across all TTS providers for consistent error handling.
 * Each code has a corresponding user-friendly message defined in the error handler.
 */
export enum TTSErrorCode {
  /** TTS model file not found or download failed */
  TTS_MODEL_NOT_FOUND = 'TTS_MODEL_NOT_FOUND',

  /** KokoroTTS package not installed in Python environment */
  TTS_NOT_INSTALLED = 'TTS_NOT_INSTALLED',

  /** TTS service crashed or not responding */
  TTS_SERVICE_ERROR = 'TTS_SERVICE_ERROR',

  /** Synthesis request timed out (>10s warm, >30s cold) */
  TTS_TIMEOUT = 'TTS_TIMEOUT',

  /** Invalid voice ID provided (not in catalog) */
  TTS_INVALID_VOICE = 'TTS_INVALID_VOICE',

  /** Text input validation failed */
  INVALID_TEXT_INPUT = 'INVALID_TEXT_INPUT',

  /** File path validation failed (security) */
  INVALID_FILE_PATH = 'INVALID_FILE_PATH',
}

/**
 * TTS error with code and user-friendly message
 */
export class TTSError extends Error {
  constructor(
    public code: TTSErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'TTSError';
  }
}
