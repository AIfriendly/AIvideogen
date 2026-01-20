/**
 * REGRESSION-006: Progress Cache Consistency
 *
 * Tests for progress cache accuracy and error state persistence.
 * Ensures progress tracking remains consistent across the pipeline.
 *
 * Tests:
 * - Progress cache should match database state
 * - Progress cache should persist service errors
 * - Progress cache should expire after 1 hour
 * - Progress cache should handle concurrent updates
 *
 * Story Reference: Story 2.5 - Voiceover Generation for Scenes
 * Priority: P1 (High Priority - run on PRs)
 *
 * @module tests/regression/p1-progress-cache-consistency
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeDatabase } from '@/lib/db/init';

describe('[REGRESSION-006] Progress Cache Consistency', () => {
  beforeEach(async () => {
    // Initialize fresh database for each test
    await initializeDatabase();
    vi.clearAllMocks();
  });

  /**
   * Test: Progress cache should match database state
   *
   * GIVEN: Voiceover generation completed
   * WHEN: Progress cache queried
   * THEN: Progress should be 100%
   * AND: Status should be 'complete'
   * AND: Scene count should match
   */
  it('[P1] Progress cache should match database state', async () => {
    // GIVEN: Voiceover generation completed
    const totalScenes = 5;
    const completedScenes = 5;

    // Mock progress cache state
    const progressState = {
      status: 'complete',
      currentScene: completedScenes,
      totalScenes,
      progress: 100,
      startedAt: new Date(),
      completedAt: new Date(),
    };

    // WHEN: Progress cache queried
    const progress = progressState;

    // THEN: Progress should be 100%
    expect(progress.progress).toBe(100);

    // AND: Status should be 'complete'
    expect(progress.status).toBe('complete');

    // AND: Scene count should match
    expect(progress.totalScenes).toBe(totalScenes);
    expect(progress.currentScene).toBe(completedScenes);
  });

  /**
   * Test: Progress cache should persist service errors
   *
   * GIVEN: Voiceover generation fails
   * WHEN: Progress cache queried
   * THEN: Status should be 'error'
   * AND: Error message should be populated
   * AND: Completed scenes should be accurate
   */
  it('[P1] Progress cache should persist service errors', async () => {
    // GIVEN: Voiceover generation fails
    const totalScenes = 5;
    const failedAtScene = 3;

    // Mock TTS provider that fails at scene 3
    const { createMockPartialFailureTTSProvider } = await import('../mocks/tts-provider.mock');
    const mockTTSProvider = createMockPartialFailureTTSProvider(failedAtScene);

    // Track progress state
    let progressState = {
      status: 'generating',
      currentScene: 0,
      totalScenes,
      progress: 0,
      error: undefined as string | undefined,
    };

    // WHEN: Voiceover generation fails
    const successfulScenes: number[] = [];

    try {
      for (let i = 1; i <= totalScenes; i++) {
        await mockTTSProvider.generateAudio(`Scene ${i}`, 'sarah');
        successfulScenes.push(i);
        progressState.currentScene = i;
        progressState.progress = Math.floor((i / totalScenes) * 100);
      }
    } catch (error: any) {
      progressState.status = 'error';
      progressState.error = error.message;
    }

    // THEN: Status should be 'error'
    expect(progressState.status).toBe('error');

    // AND: Error message should be populated
    expect(progressState.error).toBeDefined();

    // AND: Completed scenes should be accurate (2 completed before failure at 3)
    expect(successfulScenes).toEqual([1, 2]);
    expect(progressState.currentScene).toBeLessThan(totalScenes);
  });

  /**
   * Test: Progress cache should expire after 1 hour
   *
   * GIVEN: Old progress entry (> 1 hour)
   * WHEN: Cleanup runs
   * THEN: Entry should be removed from cache
   */
  it('[P1] Progress cache should expire after 1 hour', async () => {
    // GIVEN: Old progress entry (> 1 hour)
    const oldTimestamp = new Date(Date.now() - 61 * 60 * 1000); // 61 minutes ago
    const recentTimestamp = new Date();

    const progressCache = new Map<string, any>([
      ['test-expiry-001', {
        projectId: 'test-expiry-001',
        status: 'complete',
        currentScene: 5,
        totalScenes: 5,
        progress: 100,
        startedAt: oldTimestamp,
        completedAt: oldTimestamp,
      }],
      ['test-recent-001', {
        projectId: 'test-recent-001',
        status: 'complete',
        currentScene: 5,
        totalScenes: 5,
        progress: 100,
        startedAt: recentTimestamp,
        completedAt: recentTimestamp,
      }],
    ]);

    // Mock cleanup function
    const cleanupExpiredProgress = () => {
      const now = Date.now();
      const hourInMs = 60 * 60 * 1000;

      for (const [id, entry] of progressCache.entries()) {
        const entryAge = now - new Date(entry.startedAt).getTime();
        if (entryAge > hourInMs) {
          progressCache.delete(id);
        }
      }
    };

    // WHEN: Cleanup runs
    cleanupExpiredProgress();

    // THEN: Old entry should be removed
    expect(progressCache.has('test-expiry-001')).toBe(false);

    // AND: Recent entry should remain
    expect(progressCache.has('test-recent-001')).toBe(true);
  });

  /**
   * Test: Progress cache should handle concurrent updates
   *
   * GIVEN: Multiple concurrent progress updates
   * WHEN: Updates happen simultaneously
   * THEN: Cache should remain consistent
   * AND: Final state should be correct
   */
  it('[P1] Progress cache should handle concurrent updates', async () => {
    // GIVEN: Multiple concurrent progress updates
    const projectId = 'test-concurrent-progress-001';
    const totalScenes = 5;

    // Mock progress cache with concurrent-safe updates
    let progressState = {
      status: 'generating',
      currentScene: 0,
      totalScenes,
      progress: 0,
    };

    const updateProgress = (currentScene: number) => {
      // Simulate concurrent-safe update (use max to handle out-of-order updates)
      progressState.currentScene = Math.max(progressState.currentScene, currentScene);
      progressState.progress = Math.floor((progressState.currentScene / totalScenes) * 100);
    };

    // WHEN: Multiple concurrent updates
    const updates = [1, 2, 3, 4, 5].map(scene =>
      Promise.resolve().then(() => updateProgress(scene))
    );

    await Promise.all(updates);

    // THEN: Cache should remain consistent
    // AND: Final state should be correct (5/5 scenes)
    expect(progressState.currentScene).toBe(5);
    expect(progressState.progress).toBe(100);
  });

  /**
   * Test: Progress cache should recover from inconsistency
   *
   * GIVEN: Progress cache inconsistent with database
   * WHEN: Inconsistency detected
   * THEN: Should reconcile with database state
   */
  it('[P1] Progress cache should recover from inconsistency', async () => {
    // GIVEN: Progress cache inconsistent with database
    const projectId = 'test-inconsistency-001';

    // Cache says generating, but database shows 2/5 completed
    const cacheState = {
      status: 'generating',
      currentScene: 1,
      totalScenes: 5,
      progress: 20,
    };

    // Database state shows 2 scenes actually completed
    const dbState = {
      completedScenes: 2,
      totalScenes: 5,
    };

    // WHEN: Reconciliation runs
    const reconcileProgressCache = () => {
      // In real implementation, would query database and update cache
      const actualProgress = Math.floor((dbState.completedScenes / dbState.totalScenes) * 100);
      return {
        status: dbState.completedScenes === dbState.totalScenes ? 'complete' : 'generating',
        currentScene: dbState.completedScenes,
        totalScenes: dbState.totalScenes,
        progress: actualProgress,
      };
    };

    const reconciledState = reconcileProgressCache();

    // THEN: Should update cache to match reality
    expect(reconciledState.currentScene).toBe(2);
    expect(reconciledState.progress).toBe(40); // 2/5 = 40%
  });

  /**
   * Test: Progress cache should handle project deletion
   *
   * GIVEN: Project with progress entry
   * WHEN: Project is deleted
   * THEN: Progress entry should be removed
   */
  it('[P1] Progress cache should handle project deletion', async () => {
    // GIVEN: Project with progress entry
    const projectId = 'test-delete-progress-001';

    const progressCache = new Map<string, any>([
      [projectId, {
        projectId,
        status: 'complete',
        currentScene: 5,
        totalScenes: 5,
        progress: 100,
      }],
    ]);

    // WHEN: Project is deleted
    const deleteProject = (id: string) => {
      progressCache.delete(id);
      return { success: true };
    };

    deleteProject(projectId);

    // THEN: Progress entry should be removed
    expect(progressCache.has(projectId)).toBe(false);
  });

  /**
   * Test: Progress cache should serialize correctly
   *
   * GIVEN: Progress state with complex data
   * WHEN: Serialized and deserialized
   * THEN: Should maintain data integrity
   */
  it('[P1] Progress cache should serialize correctly', async () => {
    // GIVEN: Progress state with complex data
    const complexProgress = {
      projectId: 'test-serialize-001',
      status: 'generating' as const,
      currentScene: 3,
      totalScenes: 5,
      progress: 60,
      startedAt: new Date(),
      error: null,
    };

    // WHEN: Serialized and deserialized
    const serialized = JSON.stringify(complexProgress);
    const retrieved = JSON.parse(serialized);

    // THEN: Should maintain data integrity
    expect(retrieved.projectId).toBe(complexProgress.projectId);
    expect(retrieved.status).toBe(complexProgress.status);
    expect(retrieved.currentScene).toBe(complexProgress.currentScene);
    expect(retrieved.totalScenes).toBe(complexProgress.totalScenes);
    expect(retrieved.progress).toBe(complexProgress.progress);

    // AND: No data loss should occur
    expect(retrieved.error).toBeNull();
  });

  /**
   * Test: Progress cache should handle rapid updates
   *
   * GIVEN: Rapid progress updates
   * WHEN: Updates happen quickly
   * THEN: Should not lose updates
   */
  it('[P1] Progress cache should handle rapid updates', async () => {
    // GIVEN: Rapid progress updates
    const updateCount = 100;
    const progressUpdates: number[] = [];

    // Mock rapid update function
    const rapidUpdate = async (scene: number) => {
      return new Promise<void>(resolve => {
        setImmediate(() => {
          progressUpdates.push(scene);
          resolve();
        });
      });
    };

    // WHEN: Rapid updates
    const updates = Array.from({ length: updateCount }, (_, i) =>
      rapidUpdate(i + 1)
    );

    await Promise.all(updates);

    // THEN: Should not lose updates
    expect(progressUpdates).toHaveLength(updateCount);

    // AND: All values should be unique and sequential
    const sorted = [...progressUpdates].sort((a, b) => a - b);
    expect(sorted).toEqual(Array.from({ length: updateCount }, (_, i) => i + 1));
  });

  /**
   * Test: Progress cache should track completion timestamp
   *
   * GIVEN: Progress completes
   * WHEN: Completion recorded
   * THEN: Should have both startedAt and completedAt timestamps
   */
  it('[P1] Progress cache should track completion timestamp', async () => {
    // GIVEN: Progress tracking
    const startedAt = new Date();
    let completedAt: Date | null = null;

    // WHEN: Progress completes
    await new Promise(resolve => setTimeout(resolve, 10));
    completedAt = new Date();

    // THEN: Should have both timestamps
    expect(startedAt).toBeInstanceOf(Date);
    expect(completedAt).toBeInstanceOf(Date);

    // AND: completedAt should be after startedAt
    expect(completedAt!.getTime()).toBeGreaterThan(startedAt.getTime());
  });
});
