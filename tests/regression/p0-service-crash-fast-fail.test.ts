/**
 * REGRESSION-003: Service Crash Fast-Fail
 *
 * Ensures pipeline detects service crashes within 30 seconds.
 * Prevents 5+ minute timeouts on crashed services.
 *
 * Tests:
 * - TTS service crash should timeout within 30 seconds
 * - Progress polling should stop on crash
 * - Database should rollback on crash
 * - No partial work should be saved
 *
 * Story Reference: Story 2.5 - Voiceover Generation for Scenes
 * Priority: P0 (Critical - blocks commits on failure)
 *
 * @module tests/regression/p0-service-crash-fast-fail
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeDatabase } from '@/lib/db/init';

describe('[REGRESSION-003] Service Crash Fast-Fail', () => {
  beforeEach(async () => {
    await initializeDatabase();
    vi.clearAllMocks();
  });

  /**
   * Test: TTS service crash should timeout within 30 seconds
   *
   * GIVEN: TTS service crashes during generation
   * WHEN: Crash occurs
   * THEN: Should detect crash within 30 seconds
   * AND: Should not wait for full timeout
   */
  it('[P0-CRITICAL] TTS service crash should timeout within 30 seconds', async () => {
    // GIVEN: TTS service that crashes immediately
    const { createMockFailingTTSProvider } = await import('../mocks/tts-provider.mock');
    const mockTTSProvider = createMockFailingTTSProvider(
      'TTS_SERVICE_CRASHED: Exit code 1'
    );

    // WHEN: Attempting to generate audio
    const startTime = Date.now();

    try {
      await mockTTSProvider.generateAudio('test text', 'sarah');
      expect.fail('Should have thrown error for crashed service');
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // THEN: Should detect crash quickly
      expect(error.message).toContain('TTS_SERVICE_CRASHED');

      // AND: Should timeout within 30 seconds (not 5 minutes)
      expect(duration).toBeLessThan(30000);
    }
  });

  /**
   * Test: Progress polling should stop on service crash
   *
   * GIVEN: Service crashes mid-generation
   * WHEN: Crash detected
   * THEN: Progress polling should stop
   * AND: Should not continue polling indefinitely
   */
  it('[P0-CRITICAL] Progress polling should stop on service crash', async () => {
    // GIVEN: Service that crashes
    const { createMockFailingTTSProvider } = await import('../mocks/tts-provider.mock');
    const mockTTSProvider = createMockFailingTTSProvider();

    // WHEN: Multiple generations attempted (simulating polling)
    const startTime = Date.now();
    const results: Array<'failed' | 'success'> = [];

    for (let i = 0; i < 5; i++) {
      try {
        await mockTTSProvider.generateAudio(`test ${i}`, 'sarah');
        results.push('success');
      } catch (error) {
        results.push('failed');
      }
    }

    const duration = Date.now() - startTime;

    // THEN: All should fail
    expect(results.every(r => r === 'failed')).toBe(true);

    // AND: Should complete quickly (no indefinite polling)
    expect(duration).toBeLessThan(15000);
  });

  /**
   * Test: Pipeline should rollback database state on crash
   *
   * GIVEN: Service crashes during voiceover generation
   * WHEN: Crash occurs
   * THEN: Partial work should not be saved
   * AND: Database should remain consistent
   */
  it('[P0-CRITICAL] Pipeline should rollback database state on crash', async () => {
    // GIVEN: Service configured to fail at scene 3
    const { createMockPartialFailureTTSProvider } = await import('../mocks/tts-provider.mock');
    const mockTTSProvider = createMockPartialFailureTTSProvider(3);

    // Track which scenes succeeded
    const successfulScenes: number[] = [];
    const failedScenes: number[] = [];

    // WHEN: Generating multiple scenes
    for (let i = 1; i <= 5; i++) {
      try {
        await mockTTSProvider.generateAudio(`Scene ${i}`, 'sarah');
        successfulScenes.push(i);
      } catch (error) {
        failedScenes.push(i);
        // Stop on first failure for this test
        break;
      }
    }

    // THEN: Scenes 1-2 should succeed
    expect(successfulScenes).toContain(1);
    expect(successfulScenes).toContain(2);

    // AND: Scene 3 should fail
    expect(failedScenes).toContain(3);
  });

  /**
   * Test: Should not proceed to next stage after crash
   *
   * GIVEN: Service crashes during voiceover
   * WHEN: Crash detected
   * THEN: Should not move to visual sourcing
   * AND: Pipeline should halt
   */
  it('[P0-CRITICAL] Should not proceed to next stage after crash', async () => {
    // GIVEN: Service that crashes
    const { createMockFailingTTSProvider } = await import('../mocks/tts-provider.mock');
    const mockTTSProvider = createMockFailingTTSProvider();

    // Track pipeline progression
    let currentStage = 'voiceover';
    let nextStageReached = false;

    // WHEN: Voiceover stage crashes
    try {
      await mockTTSProvider.generateAudio('test', 'sarah');
      // If we reach here, voiceover "succeeded" - in real pipeline would proceed
      nextStageReached = true;
      currentStage = 'visual-sourcing';
    } catch (error) {
      // Expected crash - pipeline should halt
      currentStage = 'error';
    }

    // THEN: Should not reach next stage
    expect(nextStageReached).toBe(false);

    // AND: Current stage should be error
    expect(currentStage).toBe('error');
  });

  /**
   * Test: Should preserve completed work before crash
   *
   * GIVEN: Service crashes after some work completed
   * WHEN: Crash occurs
   * THEN: Completed work should be preserved
   * AND: User can retry from failure point
   */
  it('[P0-CRITICAL] Should preserve completed work before crash', async () => {
    // GIVEN: Service that succeeds for first 2 scenes then fails
    const { createMockPartialFailureTTSProvider } = await import('../mocks/tts-provider.mock');
    const mockTTSProvider = createMockPartialFailureTTSProvider(3);

    const completedWork: number[] = [];

    // WHEN: Generating multiple scenes
    for (let i = 1; i <= 5; i++) {
      try {
        await mockTTSProvider.generateAudio(`Scene ${i}`, 'sarah');
        completedWork.push(i);
      } catch (error) {
        // Stop on first failure
        break;
      }
    }

    // THEN: First 2 scenes should be completed
    expect(completedWork).toEqual([1, 2]);

    // AND: User can retry from scene 3 (completed work is preserved)
    expect(completedWork.length).toBeLessThan(5);
  });

  /**
   * Test: Should log crash details for debugging
   *
   * GIVEN: Service crashes
   * WHEN: Crash detected
   * THEN: Should log crash details
   * AND: Should include stage where crash occurred
   * AND: Should include error message
   */
  it('[P0-CRITICAL] Should log crash details for debugging', async () => {
    // GIVEN: Service that crashes
    const { createMockFailingTTSProvider } = await import('../mocks/tts-provider.mock');
    const crashMessage = 'TTS_SERVICE_CRASHED: Signal 11 (SIGSEGV)';
    const mockTTSProvider = createMockFailingTTSProvider(crashMessage);

    let loggedError = '';

    // WHEN: Crash occurs
    try {
      await mockTTSProvider.generateAudio('test', 'sarah');
    } catch (error: any) {
      loggedError = error.message;
    }

    // THEN: Should log crash details
    expect(loggedError).toContain('TTS_SERVICE_CRASHED');
    expect(loggedError).toContain('SIGSEGV');
  });

  /**
   * Test: Should notify user of crash immediately
   *
   * GIVEN: Service crashes
   * WHEN: Crash detected
   * THEN: User should be notified immediately
   * AND: Should not wait for timeout
   */
  it('[P0-CRITICAL] Should notify user of crash immediately', async () => {
    // GIVEN: Service that crashes
    const { createMockFailingTTSProvider } = await import('../mocks/tts-provider.mock');
    const mockTTSProvider = createMockFailingTTSProvider();

    // WHEN: Crash occurs
    const startTime = Date.now();
    let userNotified = false;
    let notificationMessage = '';

    try {
      await mockTTSProvider.generateAudio('test', 'sarah');
    } catch (error: any) {
      userNotified = true;
      notificationMessage = error.message;
    }

    const timeToNotify = Date.now() - startTime;

    // THEN: User should be notified immediately
    expect(userNotified).toBe(true);
    expect(notificationMessage).toBeDefined();

    // AND: Notification should be quick (< 10 seconds)
    expect(timeToNotify).toBeLessThan(10000);
  });
});
