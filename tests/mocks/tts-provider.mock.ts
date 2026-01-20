/**
 * TTS Provider Mock
 *
 * Provides mock implementations of the TTS Provider for testing.
 * Supports configurable failure scenarios, partial failures, and timeouts.
 *
 * Usage:
 *   const mock = createMockTTSProvider({ shouldFail: true, failAtScene: 3 });
 *   vi.mocked(getTTSProvider).mockReturnValue(mock);
 *
 * @module tests/mocks/tts-provider.mock
 */

import { vi, expect } from 'vitest';
import type { TTSProvider, AudioResult } from '@/lib/tts/provider';

/**
 * Mock TTS Provider Options
 *
 * Configures how the mock provider should behave.
 */
export interface MockTTSProviderOptions {
  /** Whether to fail all requests */
  shouldFail?: boolean;
  /** Fail after this many successful requests (1-indexed, 0 = never fail) */
  failAtScene?: number;
  /** Whether requests should timeout (never resolve) */
  timeout?: boolean;
  /** Delay before response (ms) - simulates slow service */
  delay?: number;
  /** Custom error to throw */
  customError?: Error;
  /** Voice IDs to consider invalid */
  invalidVoiceIds?: string[];
  /** Whether to validate input parameters */
  validateInput?: boolean;
}

/**
 * Mock TTS Provider
 *
 * Implements TTSProvider interface with configurable behavior.
 */
export class MockTTSProvider implements TTSProvider {
  private sceneCount: number = 0;
  private readonly options: Required<MockTTSProviderOptions>;

  constructor(options: MockTTSProviderOptions = {}) {
    this.options = {
      shouldFail: options.shouldFail ?? false,
      failAtScene: options.failAtScene ?? 0,
      timeout: options.timeout ?? false,
      delay: options.delay ?? 0,
      customError: options.customError ?? new Error('TTS_SERVICE_ERROR'),
      invalidVoiceIds: options.invalidVoiceIds ?? [],
      validateInput: options.validateInput ?? false,
    };
  }

  /**
   * Generate audio with mock behavior based on options
   *
   * @param text - Text to synthesize
   * @param voiceId - Voice ID to use
   * @returns Promise resolving to audio result or rejecting with error
   */
  async generateAudio(text: string, voiceId: string): Promise<AudioResult> {
    this.sceneCount++;

    // Check for timeout scenario
    if (this.options.timeout) {
      return new Promise(() => {}); // Never resolves
    }

    // Check for invalid voice ID
    if (this.options.invalidVoiceIds.includes(voiceId)) {
      throw new Error(`TTS_INVALID_VOICE: Voice '${voiceId}' not found`);
    }

    // Check for immediate failure
    if (this.options.shouldFail) {
      throw this.options.customError;
    }

    // Check for scene-based failure
    if (this.options.failAtScene > 0 && this.sceneCount >= this.options.failAtScene) {
      throw this.options.customError;
    }

    // Validate input if enabled
    if (this.options.validateInput) {
      if (!text || text.trim().length === 0) {
        throw new Error('TTS_INVALID_PARAMETERS: Text is required');
      }
      if (text.length > 5000) {
        throw new Error('TTS_INVALID_PARAMETERS: Text too long (max 5000 characters)');
      }
    }

    // Simulate delay if configured
    if (this.options.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.options.delay));
    }

    // Return successful result
    const audioBuffer = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const duration = text.length * 0.1; // Rough estimation: 100ms per character
    const filePath = `.cache/audio/test/mock-${this.sceneCount}.mp3`;
    const fileSize = audioBuffer.length;

    return {
      audioBuffer,
      duration,
      filePath,
      fileSize,
    };
  }

  /**
   * Get available voices (mock implementation)
   *
   * @returns Empty array (not typically used in tests)
   */
  async getAvailableVoices() {
    return [];
  }

  /**
   * Cleanup mock provider
   */
  async cleanup(): Promise<void> {
    // No-op for mock
  }

  /**
   * Reset scene counter
   *
   * Useful for testing scenarios that require resetting failure state.
   */
  reset(): void {
    this.sceneCount = 0;
  }

  /**
   * Get current scene count
   *
   * Useful for assertions in tests.
   */
  getSceneCount(): number {
    return this.sceneCount;
  }
}

/**
 * Vitest spy functions for TTS provider methods
 *
 * These spies are pre-configured for common mocking scenarios.
 */
export const mockTTSProviderSpies = {
  generateAudio: vi.fn(),
  getAvailableVoices: vi.fn(),
  cleanup: vi.fn(),
};

/**
 * Create a mock TTS provider with default success behavior
 *
 * @returns Mock TTS provider that always succeeds
 *
 * @example
 * const mock = createMockTTSProvider();
 * await mock.generateAudio('Hello', 'sarah');
 * // Returns: { audioBuffer: Uint8Array, duration: 0.5, ... }
 */
export function createMockTTSProvider(
  options?: MockTTSProviderOptions
): TTSProvider {
  return new MockTTSProvider(options);
}

/**
 * Create a mock TTS provider that always fails
 *
 * @param errorMessage - Custom error message (default: 'TTS_SERVICE_ERROR')
 * @returns Mock TTS provider that always throws
 *
 * @example
 * const mock = createMockFailingTTSProvider('Module not found');
 * await mock.generateAudio('Hello', 'sarah');
 * // Throws: Error('Module not found')
 */
export function createMockFailingTTSProvider(errorMessage?: string): TTSProvider {
  return new MockTTSProvider({
    shouldFail: true,
    customError: new Error(errorMessage ?? 'TTS_SERVICE_ERROR'),
  });
}

/**
 * Create a mock TTS provider that times out
 *
 * Useful for testing timeout and cancellation logic.
 *
 * @returns Mock TTS provider that never resolves
 *
 * @example
 * const mock = createMockTimeoutTTSProvider();
 * const promise = mock.generateAudio('Hello', 'sarah');
 * // Promise never resolves - test timeout behavior
 */
export function createMockTimeoutTTSProvider(): TTSProvider {
  return new MockTTSProvider({ timeout: true });
}

/**
 * Create a mock TTS provider that fails at specific scene
 *
 * Useful for testing partial completion and recovery.
 *
 * @param failAtScene - Scene number to fail at (1-indexed)
 * @returns Mock TTS provider that succeeds until failAtScene
 *
 * @example
 * const mock = createMockPartialFailureTTSProvider(3);
 * await mock.generateAudio('Scene 1', 'sarah'); // Success
 * await mock.generateAudio('Scene 2', 'sarah'); // Success
 * await mock.generateAudio('Scene 3', 'sarah'); // Throws
 */
export function createMockPartialFailureTTSProvider(failAtScene: number): TTSProvider {
  return new MockTTSProvider({
    failAtScene,
    customError: new Error('TTS_SERVICE_ERROR'),
  });
}

/**
 * Create a mock TTS provider with delay
 *
 * Useful for testing progress tracking and loading states.
 *
 * @param delayMs - Delay in milliseconds before response
 * @returns Mock TTS provider with artificial delay
 *
 * @example
 * const mock = createMockSlowTTSProvider(1000);
 * const start = Date.now();
 * await mock.generateAudio('Hello', 'sarah');
 * const duration = Date.now() - start;
 * expect(duration).toBeGreaterThanOrEqual(1000);
 */
export function createMockSlowTTSProvider(delayMs: number): TTSProvider {
  return new MockTTSProvider({ delay: delayMs });
}

/**
 * Mock TTS service installation check
 *
 * Mocks the import check for kokoro_tts module.
 *
 * @param isInstalled - Whether the module is installed
 *
 * @example
 * mockTTSInstallationCheck(false);
 * // Now kokoro_tts import will fail as if not installed
 */
export function mockTTSInstallationCheck(isInstalled: boolean): void {
  if (isInstalled) {
    vi.unmock('kokoro_tts');
  } else {
    vi.doMock('kokoro_tts', () => {
      throw new Error("ModuleNotFoundError: No module named 'kokoro_tts'");
    });
  }
}

/**
 * Mock TTS service crash
 *
 * Configures the mock provider to simulate a service crash.
 * The crash occurs during generateAudio call.
 *
 * @returns Mock TTS provider configured to crash
 *
 * @example
 * const mock = mockTTSCrash();
 * await mock.generateAudio('Hello', 'sarah');
 * // Throws: Error with crash details
 */
export function mockTTSCrash(): TTSProvider {
  return new MockTTSProvider({
    shouldFail: true,
    customError: new Error('TTS_SERVICE_CRASHED: Service exited with code 1'),
  });
}

/**
 * Setup TTS provider mocks for a test suite
 *
 * Configures common mocks used across multiple tests.
 * Call this in beforeEach or at the top of a describe block.
 *
 * @example
 * describe('My tests', () => {
 *   beforeEach(() => {
 *     setupTTSProviderMocks();
 *   });
 *
 *   it('should handle TTS errors', async () => {
 *     // Tests with mocked TTS provider
 *   });
 * });
 */
export function setupTTSProviderMocks(): void {
  // Reset all spies
  mockTTSProviderSpies.generateAudio.mockReset();
  mockTTSProviderSpies.getAvailableVoices.mockReset();
  mockTTSProviderSpies.cleanup.mockReset();

  // Setup default implementations
  mockTTSProviderSpies.generateAudio.mockResolvedValue({
    audioBuffer: new Uint8Array([0, 1, 2, 3]),
    duration: 5.0,
    filePath: '.cache/audio/test.mp3',
    fileSize: 1024,
  });

  mockTTSProviderSpies.getAvailableVoices.mockResolvedValue([]);
  mockTTSProviderSpies.cleanup.mockResolvedValue(undefined);
}

/**
 * Restore TTS provider mocks
 *
 * Restores original implementations after tests.
 * Call this in afterEach or at the end of a describe block.
 *
 * @example
 * afterEach(() => {
 *   restoreTTSProviderMocks();
 * });
 */
export function restoreTTSProviderMocks(): void {
  mockTTSProviderSpies.generateAudio.mockRestore();
  mockTTSProviderSpies.getAvailableVoices.mockRestore();
  mockTTSProviderSpies.cleanup.mockRestore();
}

/**
 * Create a spy for TTS generateAudio calls
 *
 * Returns a Vitest spy that can be used to verify calls.
 *
 * @returns Vitest spy for generateAudio
 *
 * @example
 * const spy = spyOnGenerateAudio();
 * await someFunctionThatCallsTTS();
 * expect(spy).toHaveBeenCalledWith('Hello', 'sarah');
 */
export function spyOnGenerateAudio() {
  return vi.spyOn(mockTTSProviderSpies, 'generateAudio');
}

/**
 * Verify TTS provider was called correctly
 *
 * Assertion helper for verifying TTS calls in tests.
 *
 * @param text - Expected text parameter
 * @param voiceId - Expected voice ID parameter
 * @param times - Expected call count (default: 1)
 *
 * @example
 * await generateVoiceovers(projectId, scenes, 'sarah');
 * verifyTTSCalled('Scene text', 'sarah', 3);
 */
export function verifyTTSCalled(text: string, voiceId: string, times = 1): void {
  expect(mockTTSProviderSpies.generateAudio).toHaveBeenCalledTimes(times);
  expect(mockTTSProviderSpies.generateAudio).toHaveBeenCalledWith(text, voiceId);
}

/**
 * Mock audio result for testing
 *
 * Creates a realistic audio result object for tests.
 *
 * @param options - Audio result options
 * @returns Mock audio result
 *
 * @example
 * const result = createMockAudioResult({ duration: 10.5 });
 * expect(result.duration).toBe(10.5);
 */
export function createMockAudioResult(options?: {
  duration?: number;
  filePath?: string;
  fileSize?: number;
}): AudioResult {
  return {
    audioBuffer: new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    duration: options?.duration ?? 5.0,
    filePath: options?.filePath ?? '.cache/audio/test.mp3',
    fileSize: options?.fileSize ?? 1024,
  };
}
