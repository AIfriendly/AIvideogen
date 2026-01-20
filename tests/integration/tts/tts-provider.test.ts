/**
 * Integration Tests for TTS Provider
 *
 * Tests the TTS provider implementation including service lifecycle,
 * audio generation, error handling, and persistent model caching.
 *
 * Acceptance Criteria Coverage:
 * - AC1: TTS engine successfully installed and accessible via persistent service
 * - AC4: TTSProvider interface follows Epic 1 Ollama pattern
 * - AC6: TTS connection errors handled with standard error codes
 *
 * Task Coverage: Story 2.1, Task 12 - Integration Tests
 *
 * @module tests/integration/tts/tts-provider.test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getTTSProvider } from '@/lib/tts/factory';
import { TTSProvider, AudioResult } from '@/lib/tts/provider';
import { KokoroProvider } from '@/lib/tts/kokoro-provider';
import { TTSErrorCode } from '@/lib/tts/provider';
import { createMockVoiceProfile } from '../../factories/voice.factory';

describe('TTS Provider Integration Tests', () => {
  let provider: TTSProvider;
  let testOutputDir: string;

  beforeAll(async () => {
    // Create temporary directory for test outputs
    testOutputDir = path.join(process.cwd(), '.cache', 'audio', 'test');
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('AC1: TTS Engine & Persistent Service', () => {
    describe('Service Lifecycle Management', () => {
      let kokoroProvider: KokoroProvider;

      beforeEach(() => {
        kokoroProvider = new KokoroProvider();
      });

      afterEach(async () => {
        await kokoroProvider.cleanup();
      });

      it('should spawn persistent Python service on first request', async () => {
        // Given: No service running initially
        expect(kokoroProvider['service']).toBeNull();
        expect(kokoroProvider['serviceReady']).toBe(false);

        // When: Making first TTS request
        const result = await kokoroProvider.generateAudio('Test text', 'sarah');

        // Then: Service should be running
        expect(kokoroProvider['service']).not.toBeNull();
        expect(kokoroProvider['serviceReady']).toBe(true);
        expect(result).toBeDefined();
      }, 30000); // Allow 30s for cold start

      it('should keep service alive for multiple requests', async () => {
        // Given: First request to start service
        await kokoroProvider.generateAudio('First request', 'sarah');
        const servicePid = kokoroProvider['service']?.pid;

        // When: Making multiple subsequent requests
        const results = await Promise.all([
          kokoroProvider.generateAudio('Second request', 'sarah'),
          kokoroProvider.generateAudio('Third request', 'james'),
          kokoroProvider.generateAudio('Fourth request', 'emma')
        ]);

        // Then: Same service should handle all requests
        expect(kokoroProvider['service']?.pid).toBe(servicePid);
        expect(results).toHaveLength(3);
        results.forEach(r => expect(r.duration).toBeGreaterThan(0));
      });

      it('should gracefully shutdown service on cleanup', async () => {
        // Given: Service is running
        await kokoroProvider.generateAudio('Test', 'sarah');
        const service = kokoroProvider['service'];
        expect(service).not.toBeNull();

        // When: Cleaning up
        await kokoroProvider.cleanup();

        // Then: Service should be stopped
        expect(kokoroProvider['service']).toBeNull();
        expect(kokoroProvider['serviceReady']).toBe(false);
      });

      it('should restart service after crash', async () => {
        // Given: Service is running
        await kokoroProvider.generateAudio('Test', 'sarah');
        const originalPid = kokoroProvider['service']?.pid;

        // When: Service crashes (simulate)
        kokoroProvider['service']?.kill();
        kokoroProvider['service'] = null;
        kokoroProvider['serviceReady'] = false;

        // Wait a bit for process to die
        await new Promise(resolve => setTimeout(resolve, 1000));

        // And: Making new request
        const result = await kokoroProvider.generateAudio('After crash', 'sarah');

        // Then: New service should be spawned
        expect(kokoroProvider['service']).not.toBeNull();
        expect(kokoroProvider['service']?.pid).not.toBe(originalPid);
        expect(result).toBeDefined();
      });
    });

    describe('Audio Generation Validation', () => {
      beforeAll(() => {
        provider = getTTSProvider();
      });

      afterAll(async () => {
        await provider.cleanup();
      });

      it('should generate valid MP3 audio file with correct format', async () => {
        // Given: Test text and voice
        const text = 'This is a test of the TTS system.';
        const voiceId = 'sarah';

        // When: Generating audio
        const result = await provider.generateAudio(text, voiceId);

        // Then: Should produce valid MP3
        expect(result.filePath).toMatch(/\.mp3$/);
        expect(result.audioBuffer).toBeInstanceOf(Uint8Array);
        expect(result.audioBuffer.length).toBeGreaterThan(0);

        // Verify MP3 header (ID3 or MPEG sync)
        const header = result.audioBuffer.slice(0, 3);
        const isID3 = header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33;
        const isMPEG = header[0] === 0xFF && (header[1] & 0xE0) === 0xE0;
        expect(isID3 || isMPEG).toBe(true);
      });

      it('should calculate duration correctly', async () => {
        // Given: Text of known approximate duration
        const shortText = 'Hello.';
        const longText = 'This is a longer text that should take more time to speak than the short one.';

        // When: Generating audio for both
        const shortResult = await provider.generateAudio(shortText, 'sarah');
        const longResult = await provider.generateAudio(longText, 'sarah');

        // Then: Durations should be reasonable
        expect(shortResult.duration).toBeGreaterThan(0);
        expect(shortResult.duration).toBeLessThan(2); // Short text < 2 seconds
        expect(longResult.duration).toBeGreaterThan(shortResult.duration);
        expect(longResult.duration).toBeLessThan(10); // Long text < 10 seconds
      });

      it('should save audio to correct relative path', async () => {
        // Given: Test parameters
        const text = 'Testing file path';
        const voiceId = 'sarah';

        // When: Generating audio
        const result = await provider.generateAudio(text, voiceId);

        // Then: Path should be relative from project root
        expect(path.isAbsolute(result.filePath)).toBe(false);
        expect(result.filePath).toMatch(/^\.cache\/audio\//);

        // Verify file exists at path
        const absolutePath = path.resolve(process.cwd(), result.filePath);
        const stats = await fs.stat(absolutePath);
        expect(stats.isFile()).toBe(true);
        expect(stats.size).toBe(result.fileSize);
      });

      it('should return Uint8Array (not Buffer) for portability', async () => {
        // Given: Test text
        const text = 'Testing array type';

        // When: Generating audio
        const result = await provider.generateAudio(text, 'sarah');

        // Then: Should be Uint8Array, not Buffer
        expect(result.audioBuffer).toBeInstanceOf(Uint8Array);
        expect(result.audioBuffer.constructor.name).toBe('Uint8Array');
        // Ensure it's not a Node.js Buffer
        expect(Buffer.isBuffer(result.audioBuffer)).toBe(false);
      });
    });

    describe('Performance Requirements', () => {
      let provider: KokoroProvider;

      beforeAll(() => {
        provider = new KokoroProvider();
      });

      afterAll(async () => {
        await provider.cleanup();
      });

      it('should complete cold start within 5 seconds', async () => {
        // Given: No service running (cold start)
        expect(provider['service']).toBeNull();

        // When: Making first request
        const startTime = Date.now();
        const result = await provider.generateAudio('Cold start test', 'sarah');
        const duration = Date.now() - startTime;

        // Then: Should complete within 5 seconds
        expect(duration).toBeLessThan(5000);
        expect(result).toBeDefined();
      }, 10000);

      it('should complete warm requests within 2 seconds', async () => {
        // Given: Service already running (warm)
        await provider.generateAudio('Warmup', 'sarah');

        // When: Making subsequent requests
        const startTime = Date.now();
        const result = await provider.generateAudio('Warm request test', 'sarah');
        const duration = Date.now() - startTime;

        // Then: Should complete within 2 seconds
        expect(duration).toBeLessThan(2000);
        expect(result).toBeDefined();
      });

      it('should reuse model across multiple requests (persistent caching)', async () => {
        // Given: First request to load model
        const firstStart = Date.now();
        await provider.generateAudio('First', 'sarah');
        const firstDuration = Date.now() - firstStart;

        // When: Making multiple subsequent requests
        const timings: number[] = [];
        for (let i = 0; i < 5; i++) {
          const start = Date.now();
          await provider.generateAudio(`Request ${i}`, 'sarah');
          timings.push(Date.now() - start);
        }

        // Then: Subsequent requests should be faster (model cached)
        const avgSubsequent = timings.reduce((a, b) => a + b, 0) / timings.length;
        expect(avgSubsequent).toBeLessThan(firstDuration * 0.5); // At least 2x faster
        timings.forEach(t => expect(t).toBeLessThan(2000));
      });
    });
  });

  describe('AC4: TTSProvider Pattern Implementation', () => {
    describe('Factory Pattern', () => {
      it('should return KokoroProvider instance from factory', () => {
        // Given: Factory function
        // When: Getting provider
        const provider = getTTSProvider();

        // Then: Should be KokoroProvider instance
        expect(provider).toBeInstanceOf(KokoroProvider);
        expect(provider).toHaveProperty('generateAudio');
        expect(provider).toHaveProperty('getAvailableVoices');
        expect(provider).toHaveProperty('cleanup');
      });

      it('should use environment configuration for provider selection', () => {
        // Given: Different environment settings
        const originalEnv = process.env.TTS_PROVIDER;

        // When: Setting to kokoro
        process.env.TTS_PROVIDER = 'kokoro';
        const kokoroProvider = getTTSProvider();

        // Then: Should return KokoroProvider
        expect(kokoroProvider).toBeInstanceOf(KokoroProvider);

        // Cleanup
        process.env.TTS_PROVIDER = originalEnv;
      });

      it('should follow Epic 1 LLM provider pattern', () => {
        // Given: Pattern requirements from Epic 1
        const provider = getTTSProvider();

        // Then: Should have matching interface structure
        // TTSProvider.generateAudio ↔ LLMProvider.chat
        expect(typeof provider.generateAudio).toBe('function');

        // TTSProvider.getAvailableVoices ↔ (similar to model listing)
        expect(typeof provider.getAvailableVoices).toBe('function');

        // TTSProvider.cleanup ↔ (connection management)
        expect(typeof provider.cleanup).toBe('function');
      });
    });

    describe('Provider Interface Compliance', () => {
      let provider: TTSProvider;

      beforeEach(() => {
        provider = new KokoroProvider();
      });

      afterEach(async () => {
        await provider.cleanup();
      });

      it('should implement all TTSProvider interface methods', () => {
        // Given: TTSProvider interface requirements
        // Then: Should implement all required methods
        expect(provider).toHaveProperty('generateAudio');
        expect(provider).toHaveProperty('getAvailableVoices');
        expect(provider).toHaveProperty('cleanup');

        // Verify method signatures
        expect(provider.generateAudio).toBeInstanceOf(Function);
        expect(provider.generateAudio.length).toBe(2); // text, voiceId params

        expect(provider.getAvailableVoices).toBeInstanceOf(Function);
        expect(provider.getAvailableVoices.length).toBe(0); // no params

        expect(provider.cleanup).toBeInstanceOf(Function);
        expect(provider.cleanup.length).toBe(0); // no params
      });

      it('should return AudioResult with all required fields', async () => {
        // Given: AudioResult interface requirements
        // When: Generating audio
        const result = await provider.generateAudio('Test', 'sarah');

        // Then: Should have all required fields
        expect(result).toHaveProperty('audioBuffer');
        expect(result).toHaveProperty('duration');
        expect(result).toHaveProperty('filePath');
        expect(result).toHaveProperty('fileSize');

        // Verify field types
        expect(result.audioBuffer).toBeInstanceOf(Uint8Array);
        expect(typeof result.duration).toBe('number');
        expect(typeof result.filePath).toBe('string');
        expect(typeof result.fileSize).toBe('number');
      });

      it('should get available voices correctly', async () => {
        // Given: Provider with voice profiles
        // When: Getting available voices
        const voices = await provider.getAvailableVoices();

        // Then: Should return voice profiles
        expect(Array.isArray(voices)).toBe(true);
        expect(voices.length).toBeGreaterThan(0);

        // Check voice profile structure
        voices.forEach(voice => {
          expect(voice).toHaveProperty('id');
          expect(voice).toHaveProperty('name');
          expect(voice).toHaveProperty('gender');
          expect(voice).toHaveProperty('accent');
          expect(voice).toHaveProperty('tone');
          expect(voice).toHaveProperty('previewUrl');
          expect(voice).toHaveProperty('modelId');
        });
      });
    });
  });

  describe('AC6: Error Handling with Standard Error Codes', () => {
    let provider: KokoroProvider;

    beforeEach(() => {
      provider = new KokoroProvider();
    });

    afterEach(async () => {
      await provider.cleanup();
    });

    it('should handle invalid voice ID with TTS_INVALID_VOICE error', async () => {
      // Given: Invalid voice ID
      const invalidVoiceId = 'nonexistent-voice-123';

      // When: Attempting to generate audio
      // Then: Should throw with correct error code
      await expect(provider.generateAudio('Test', invalidVoiceId))
        .rejects.toThrow(TTSErrorCode.TTS_INVALID_VOICE);
    });

    it('should handle missing KokoroTTS with TTS_NOT_INSTALLED error', async () => {
      // Given: KokoroTTS not installed (mock)
      vi.spyOn(provider as any, 'ensureServiceRunning')
        .mockRejectedValueOnce(new Error('ModuleNotFoundError: kokoro_tts'));

      // When: Attempting to generate audio
      // Then: Should throw with correct error code
      await expect(provider.generateAudio('Test', 'sarah'))
        .rejects.toThrow(TTSErrorCode.TTS_NOT_INSTALLED);
    });

    it('should handle model not found with TTS_MODEL_NOT_FOUND error', async () => {
      // Given: Model file missing (mock)
      vi.spyOn(provider as any, 'ensureServiceRunning')
        .mockRejectedValueOnce(new Error('Model file not found'));

      // When: Attempting to generate audio
      // Then: Should throw with correct error code
      await expect(provider.generateAudio('Test', 'sarah'))
        .rejects.toThrow(TTSErrorCode.TTS_MODEL_NOT_FOUND);
    });

    it('should handle timeout with TTS_TIMEOUT error', async () => {
      // Given: Very long text that might timeout
      const veryLongText = 'Lorem ipsum '.repeat(1000);

      // Mock timeout by delaying service response
      vi.spyOn(provider as any, 'sendRequest')
        .mockImplementation(() => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        }));

      // When: Attempting to generate audio
      // Then: Should throw with correct error code
      await expect(provider.generateAudio(veryLongText, 'sarah'))
        .rejects.toThrow(TTSErrorCode.TTS_TIMEOUT);
    }, 15000);

    it('should handle service crash with TTS_SERVICE_ERROR', async () => {
      // Given: Service crashes during generation
      await provider.generateAudio('Warmup', 'sarah');

      // Kill the service to simulate crash
      provider['service']?.kill();

      // When: Attempting next request
      // Then: Should detect crash and throw error
      await expect(provider.generateAudio('After crash', 'sarah'))
        .rejects.toThrow(TTSErrorCode.TTS_SERVICE_ERROR);
    });

    it('should return errors in standard format', async () => {
      // Given: Various error scenarios
      try {
        await provider.generateAudio('Test', 'invalid-voice');
      } catch (error: any) {
        // Then: Error should have standard format
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('code');
        expect(Object.values(TTSErrorCode)).toContain(error.code);
      }
    });

    it('should provide actionable error messages', async () => {
      // Given: Mock various error scenarios
      const errorScenarios = [
        {
          mockError: 'ModuleNotFoundError: kokoro_tts',
          expectedMessage: /KokoroTTS not installed.*pip install/i,
          expectedCode: TTSErrorCode.TTS_NOT_INSTALLED
        },
        {
          mockError: 'Model file not found',
          expectedMessage: /model not found.*run setup/i,
          expectedCode: TTSErrorCode.TTS_MODEL_NOT_FOUND
        },
        {
          mockError: 'Service not responding',
          expectedMessage: /service not responding.*restart/i,
          expectedCode: TTSErrorCode.TTS_SERVICE_ERROR
        }
      ];

      for (const scenario of errorScenarios) {
        vi.spyOn(provider as any, 'ensureServiceRunning')
          .mockRejectedValueOnce(new Error(scenario.mockError));

        try {
          await provider.generateAudio('Test', 'sarah');
        } catch (error: any) {
          expect(error.message).toMatch(scenario.expectedMessage);
          expect(error.code).toBe(scenario.expectedCode);
        }
      }
    });
  });

  describe('Service Communication Protocol', () => {
    let provider: KokoroProvider;

    beforeEach(() => {
      provider = new KokoroProvider();
    });

    afterEach(async () => {
      await provider.cleanup();
    });

    it('should communicate via JSON protocol over stdin/stdout', async () => {
      // Given: Spy on process communication
      const stdinSpy = vi.spyOn(provider as any, 'sendRequest');

      // When: Making TTS request
      await provider.generateAudio('Test communication', 'sarah');

      // Then: Should send JSON request
      expect(stdinSpy).toHaveBeenCalled();
      const request = stdinSpy.mock.calls[0][0];
      expect(request).toHaveProperty('action', 'synthesize');
      expect(request).toHaveProperty('text', 'Test communication');
      expect(request).toHaveProperty('voiceId', 'sarah');
      expect(request).toHaveProperty('outputPath');
    });

    it('should handle service ready status correctly', async () => {
      // Given: New provider instance
      expect(provider['serviceReady']).toBe(false);

      // When: First request starts service
      await provider.generateAudio('Test', 'sarah');

      // Then: Service should be ready
      expect(provider['serviceReady']).toBe(true);
    });

    it('should handle concurrent requests correctly', async () => {
      // Given: Service is running
      await provider.generateAudio('Warmup', 'sarah');

      // When: Making concurrent requests
      const requests = Array.from({ length: 5 }, (_, i) =>
        provider.generateAudio(`Concurrent ${i}`, 'sarah')
      );

      // Then: All should complete successfully
      const results = await Promise.all(requests);
      expect(results).toHaveLength(5);
      results.forEach(r => {
        expect(r.duration).toBeGreaterThan(0);
        expect(r.audioBuffer).toBeInstanceOf(Uint8Array);
      });
    });
  });
});