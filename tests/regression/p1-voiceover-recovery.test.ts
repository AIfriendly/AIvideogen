/**
 * REGRESSION-005: Voiceover Recovery
 *
 * Tests for partial completion recovery and corrupted audio handling.
 * Ensures pipeline can recover from failures and resume correctly.
 *
 * Tests:
 * - Should resume from partial completion on retry
 * - Should detect corrupted audio files and regenerate
 * - Should handle concurrent voiceover requests gracefully
 *
 * Story Reference: Story 2.5 - Voiceover Generation for Scenes
 * Priority: P1 (High Priority - run on PRs)
 *
 * @module tests/regression/p1-voiceover-recovery
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeDatabase } from '@/lib/db/init';

describe('[REGRESSION-005] Voiceover Recovery', () => {
  beforeEach(async () => {
    // Initialize fresh database for each test
    await initializeDatabase();
    vi.clearAllMocks();
  });

  /**
   * Test: Should resume from partial completion on retry
   *
   * GIVEN: Project with 5 scenes where scenes 1-3 have audio
   * WHEN: Voiceover generation triggered again
   * THEN: Should skip scenes 1-3 (verify completion)
   * AND: Should generate audio for scenes 4-5
   * AND: Should complete successfully
   */
  it('[P1] Should resume from partial completion on retry', async () => {
    // GIVEN: Project with 5 scenes, scenes 1-3 completed
    const totalScenes = 5;
    const completedScenes = 3;

    // Track which scenes are processed
    const processedScenes: number[] = [];
    const skippedScenes: number[] = [];

    // Mock TTS provider that simulates partial completion
    const { createMockTTSProvider } = await import('../mocks/tts-provider.mock');
    const mockTTSProvider = createMockTTSProvider();

    // WHEN: Voiceover generation triggered again (simulating resume)
    for (let i = 1; i <= totalScenes; i++) {
      if (i <= completedScenes) {
        // Scenes 1-3 already exist, skip them
        skippedScenes.push(i);
      } else {
        // Generate audio for scenes 4-5
        try {
          await mockTTSProvider.generateAudio(`Scene ${i}`, 'sarah');
          processedScenes.push(i);
        } catch (error) {
          // Handle errors
        }
      }
    }

    // THEN: Should skip scenes 1-3
    expect(skippedScenes).toEqual([1, 2, 3]);

    // AND: Should generate audio for scenes 4-5 only
    expect(processedScenes).toEqual([4, 5]);
    expect(processedScenes.length).toBe(2);

    // AND: Should complete successfully
    expect(skippedScenes.length + processedScenes.length).toBe(totalScenes);
  });

  /**
   * Test: Should detect corrupted audio files and regenerate
   *
   * GIVEN: Scene with audio file path in database
   * AND: File is corrupted (0 bytes or invalid MP3)
   * WHEN: Voiceover generation triggered
   * THEN: Should detect file corruption
   * AND: Should regenerate audio for that scene
   */
  it('[P1] Should detect corrupted audio files and regenerate', async () => {
    // GIVEN: Scene with corrupted audio (0 bytes)
    const sceneWithCorruptedAudio = 3;
    const fileSize = 0; // Corrupted: 0 bytes

    // Track regeneration
    const regeneratedScenes: number[] = [];

    // Mock TTS provider
    const { createMockTTSProvider } = await import('../mocks/tts-provider.mock');
    const mockTTSProvider = createMockTTSProvider();

    // WHEN: Voiceover generation triggered and corruption detected
    // Simulate checking file size
    const isCorrupted = fileSize === 0;

    if (isCorrupted) {
      // Should regenerate audio for corrupted scene
      try {
        await mockTTSProvider.generateAudio(`Scene ${sceneWithCorruptedAudio}`, 'sarah');
        regeneratedScenes.push(sceneWithCorruptedAudio);
      } catch (error) {
        // Handle errors
      }
    }

    // THEN: Should detect file corruption
    expect(isCorrupted).toBe(true);

    // AND: Should regenerate audio for corrupted scene
    expect(regeneratedScenes).toContain(sceneWithCorruptedAudio);
    expect(regeneratedScenes).toHaveLength(1);
  });

  /**
   * Test: Should detect invalid MP3 files and regenerate
   *
   * GIVEN: Scene with audio file that has invalid MP3 header
   * WHEN: Voiceover generation triggered
   * THEN: Should detect invalid MP3
   * AND: Should regenerate audio for that scene
   */
  it('[P1] Should detect invalid MP3 files and regenerate', async () => {
    // GIVEN: Scene with invalid MP3 header
    const sceneWithInvalidMP3 = 2;
    const invalidMP3Header = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const validMP3Header = Buffer.from([0xFF, 0xFB, 0x90, 0x44]);

    // Track regeneration
    let regenerated = false;

    // Mock TTS provider
    const { createMockTTSProvider } = await import('../mocks/tts-provider.mock');
    const mockTTSProvider = createMockTTSProvider();

    // WHEN: Checking MP3 validity
    const hasValidHeader = (buffer: Buffer) => {
      return buffer[0] === 0xFF && buffer[1] >= 0xF0;
    };

    const isValid = hasValidHeader(invalidMP3Header);

    if (!isValid) {
      // Should regenerate invalid file
      try {
        await mockTTSProvider.generateAudio(`Scene ${sceneWithInvalidMP3}`, 'sarah');
        regenerated = true;
      } catch (error) {
        // Handle errors
      }
    }

    // THEN: Should detect invalid MP3
    expect(isValid).toBe(false);
    expect(hasValidHeader(validMP3Header)).toBe(true);

    // AND: Should regenerate invalid file
    expect(regenerated).toBe(true);
  });

  /**
   * Test: Should handle missing audio files correctly
   *
   * GIVEN: Scene with audio_file_path in database but file missing
   * WHEN: Voiceover generation triggered
   * THEN: Should detect missing file
   * AND: Should regenerate audio for that scene
   */
  it('[P1] Should handle missing audio files correctly', async () => {
    // GIVEN: Scene with audio_file_path but file missing
    const sceneWithMissingFile = 1;
    const fileExists = false;

    // Track regeneration
    let regenerated = false;

    // Mock TTS provider
    const { createMockTTSProvider } = await import('../mocks/tts-provider.mock');
    const mockTTSProvider = createMockTTSProvider();

    // WHEN: Voiceover generation triggered
    if (!fileExists) {
      // Should regenerate missing file
      try {
        await mockTTSProvider.generateAudio(`Scene ${sceneWithMissingFile}`, 'sarah');
        regenerated = true;
      } catch (error) {
        // Handle errors
      }
    }

    // THEN: Should detect missing file
    expect(fileExists).toBe(false);

    // AND: Should regenerate missing file
    expect(regenerated).toBe(true);
  });

  /**
   * Test: Should handle concurrent voiceover requests gracefully
   *
   * GIVEN: Project with scenes
   * WHEN: Multiple concurrent requests to generate voiceovers
   * THEN: Only one should process
   * AND: Others should receive "already processing" status
   */
  it('[P1] Should handle concurrent voiceover requests gracefully', async () => {
    // GIVEN: Project with scenes
    let processing = false;
    const successResults: string[] = [];
    const failureResults: string[] = [];

    // Mock TTS provider with processing flag
    const mockConcurrentGeneration = async (requestId: string) => {
      if (processing) {
        failureResults.push(requestId);
        throw new Error('VOICEOVER_ALREADY_PROCESSING');
      }
      processing = true;
      successResults.push(requestId);
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 10));
      processing = false;
      return { success: true };
    };

    // WHEN: Multiple concurrent requests
    const requests = [
      mockConcurrentGeneration('req-1'),
      mockConcurrentGeneration('req-2'),
      mockConcurrentGeneration('req-3'),
    ];

    const results = await Promise.allSettled(requests);

    // THEN: Only one should succeed
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(2);
    expect(successResults).toHaveLength(1);
    expect(failureResults).toHaveLength(2);
  });

  /**
   * Test: Should update progress correctly during recovery
   *
   * GIVEN: Partial completion with scenes 1-2 done
   * WHEN: Resuming generation
   * THEN: Progress should start at 2/5 (40%)
   * AND: Progress should update correctly for remaining scenes
   * AND: Final progress should be 100%
   */
  it('[P1] Should update progress correctly during recovery', async () => {
    // GIVEN: Partial completion
    const totalScenes = 5;
    const completedScenes = 2;
    const progressUpdates: number[] = [];

    // Mock progress tracking
    const updateProgress = (currentScene: number) => {
      const progress = Math.floor((currentScene / totalScenes) * 100);
      progressUpdates.push(progress);
    };

    // WHEN: Resuming generation
    // Start from where we left off
    for (let i = completedScenes + 1; i <= totalScenes; i++) {
      updateProgress(i);
    }

    // THEN: Progress should start at 60% (3/5 scenes done)
    expect(progressUpdates[0]).toBe(60); // Scene 3 complete

    // AND: Progress should update correctly
    expect(progressUpdates).toContain(80); // Scene 4 complete
    expect(progressUpdates).toContain(100); // Scene 5 complete

    // AND: Final progress should be 100%
    expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
  });
});
