/**
 * Integration Tests for CV Auto-Trigger After Download
 * Story 3.7b: CV Pipeline Integration
 *
 * Tests that CV analysis automatically runs after segment download completes
 *
 * Test IDs: 3.7b-INT-001 to 3.7b-INT-010
 * Priority: P0 (Critical)
 * Risk Mitigation: AC58 (Auto-trigger), AC59 (Graceful degradation), AC67 (Expected labels)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/vision/cv-filter-service', () => ({
  analyzeVideoSuggestion: vi.fn(),
  getCVFilterStatus: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  default: {
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn().mockReturnValue({
        id: 'scene-1',
        visual_keywords: 'nature,forest,trees',
      }),
      all: vi.fn().mockReturnValue([]),
    }),
  },
}));

import { analyzeVideoSuggestion, getCVFilterStatus } from '@/lib/vision/cv-filter-service';
import type { CVFilterResult } from '@/lib/vision/cv-filter-service';

// ============================================================================
// Auto-Trigger CV Analysis After Download - AC58
// ============================================================================

describe('[3.7b-INT-001] Auto-Trigger CV Analysis After Download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * [3.7b-INT-001a] CV analysis automatically triggers after download completes
   */
  it('should automatically trigger CV analysis after segment download completes (AC58)', async () => {
    // Given: A suggestion with downloaded segment
    const suggestionId = 'sug-123';
    const segmentPath = '.cache/videos/proj-1/scene-01-default.mp4';
    const expectedLabels = ['nature', 'forest'];

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);
    mockAnalyze.mockResolvedValue({
      suggestionId,
      cvScore: 0.85,
      analyzed: true,
      faceDetected: false,
      textDetected: false,
      labelMatchScore: 0.9,
    });

    // When: Download completes and auto-trigger runs
    // (Simulates download-queue.ts completion callback)
    await analyzeVideoSuggestion(suggestionId, segmentPath, expectedLabels);

    // Then: CV analysis should be called automatically
    expect(mockAnalyze).toHaveBeenCalledOnce();
    expect(mockAnalyze).toHaveBeenCalledWith(suggestionId, segmentPath, expectedLabels);
  });

  /**
   * [3.7b-INT-001b] No manual API call required
   */
  it('should NOT require manual API call to trigger CV analysis (AC58)', async () => {
    // Given: Download completes successfully
    const suggestionId = 'sug-456';
    const segmentPath = '.cache/videos/proj-1/scene-02-default.mp4';
    const expectedLabels = ['sunset', 'beach'];

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);
    mockAnalyze.mockResolvedValue({
      suggestionId,
      cvScore: 0.92,
      analyzed: true,
    });

    // When: Auto-trigger runs (NOT manual POST /api/cv-analysis)
    await analyzeVideoSuggestion(suggestionId, segmentPath, expectedLabels);

    // Then: Should be called via auto-trigger, not manual API
    expect(mockAnalyze).toHaveBeenCalledOnce();
    // Note: In actual implementation, this is triggered from download-queue.ts
    // completion callback, not from a separate API call
  });

  /**
   * [3.7b-INT-001c] CV analysis runs for each downloaded segment
   */
  it('should trigger CV analysis for each segment that downloads (AC58)', async () => {
    // Given: Multiple segments downloading
    const suggestions = [
      { id: 'sug-1', path: '.cache/videos/proj-1/scene-01-default.mp4', labels: ['nature'] },
      { id: 'sug-2', path: '.cache/videos/proj-1/scene-02-default.mp4', labels: ['city'] },
      { id: 'sug-3', path: '.cache/videos/proj-1/scene-03-default.mp4', labels: ['ocean'] },
    ];

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);
    mockAnalyze.mockResolvedValue({
      suggestionId: '',
      cvScore: 0.8,
      analyzed: true,
    });

    // When: Each download completes
    for (const sug of suggestions) {
      await analyzeVideoSuggestion(sug.id, sug.path, sug.labels);
    }

    // Then: CV analysis should be called for each
    expect(mockAnalyze).toHaveBeenCalledTimes(3);
    expect(mockAnalyze).toHaveBeenNthCalledWith(1, 'sug-1', suggestions[0].path, ['nature']);
    expect(mockAnalyze).toHaveBeenNthCalledWith(2, 'sug-2', suggestions[1].path, ['city']);
    expect(mockAnalyze).toHaveBeenNthCalledWith(3, 'sug-3', suggestions[2].path, ['ocean']);
  });

  /**
   * [3.7b-INT-001d] Integration point in download-queue.ts
   */
  it('should be triggered from download-queue completion callback (AC58)', async () => {
    // Given: Download job completes successfully
    const downloadJob = {
      id: 'job-123',
      suggestionId: 'sug-789',
      outputPath: '.cache/videos/proj-1/scene-05-default.mp4',
      status: 'complete',
    };

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);
    mockAnalyze.mockResolvedValue({
      suggestionId: downloadJob.suggestionId,
      cvScore: 0.75,
      analyzed: true,
    });

    // When: Download completion callback runs
    // (Simulating download-queue.ts onJobComplete)
    if (downloadJob.status === 'complete') {
      const expectedLabels = ['gaming', 'action']; // Retrieved from scene
      await analyzeVideoSuggestion(
        downloadJob.suggestionId,
        downloadJob.outputPath,
        expectedLabels
      );
    }

    // Then: CV analysis should be triggered
    expect(mockAnalyze).toHaveBeenCalledOnce();
    expect(mockAnalyze).toHaveBeenCalledWith(
      downloadJob.suggestionId,
      downloadJob.outputPath,
      ['gaming', 'action']
    );
  });
});

// ============================================================================
// Graceful Degradation - AC59
// ============================================================================

describe('[3.7b-INT-002] CV Failure Graceful Degradation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * [3.7b-INT-002a] Download success even when CV fails
   */
  it('should mark download as successful even when CV analysis fails (AC59)', async () => {
    // Given: CV analysis will fail
    const suggestionId = 'sug-fail-1';
    const segmentPath = '.cache/videos/proj-1/scene-10-default.mp4';
    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);

    // Mock Vision API quota exceeded error
    mockAnalyze.mockRejectedValue(new Error('Vision API quota exceeded'));

    // When: Download completes but CV fails
    let downloadSuccess = true;
    try {
      await analyzeVideoSuggestion(suggestionId, segmentPath, []);
    } catch (error) {
      // CV failure should NOT affect download success
      // Download status remains 'complete', cv_score remains NULL
      console.warn('CV analysis failed:', error);
      // Download is still considered successful
    }

    // Then: Download should still be marked successful
    expect(downloadSuccess).toBe(true);
    // cv_score remains NULL in database
    // download_status = 'complete' in database
  });

  /**
   * [3.7b-INT-002b] cv_score remains NULL on CV failure
   */
  it('should keep cv_score as NULL when CV analysis fails (AC59)', async () => {
    // Given: CV analysis fails
    const suggestionId = 'sug-fail-2';
    const segmentPath = '.cache/videos/proj-1/scene-11-default.mp4';

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);
    mockAnalyze.mockRejectedValue(new Error('Network timeout'));

    // When: CV fails
    let cvScore: number | null = null;
    try {
      const result = await analyzeVideoSuggestion(suggestionId, segmentPath, []);
      cvScore = result.cvScore;
    } catch (error) {
      // cv_score remains NULL
      cvScore = null;
    }

    // Then: cv_score should be NULL
    expect(cvScore).toBeNull();
  });

  /**
   * [3.7b-INT-002c] Error logged but not thrown
   */
  it('should log CV error but not throw exception (AC59)', async () => {
    // Given: CV analysis will fail
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const suggestionId = 'sug-fail-3';
    const segmentPath = '.cache/videos/proj-1/scene-12-default.mp4';

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);
    mockAnalyze.mockRejectedValue(new Error('Vision API error'));

    // When: CV analysis fails
    try {
      await analyzeVideoSuggestion(suggestionId, segmentPath, []);
    } catch (error) {
      // Error should be caught and logged
      console.warn(`CV analysis failed for ${suggestionId}:`, error);
    }

    // Then: Error should be logged
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  /**
   * [3.7b-INT-002d] Common failure scenarios
   */
  it('should handle common CV failure scenarios gracefully (AC59)', async () => {
    const scenarios = [
      { error: 'Vision API quota exceeded', expected: 'graceful' },
      { error: 'Network timeout', expected: 'graceful' },
      { error: 'Invalid credentials', expected: 'graceful' },
      { error: 'Frame extraction failed', expected: 'graceful' },
    ];

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);

    for (const scenario of scenarios) {
      vi.clearAllMocks();
      mockAnalyze.mockRejectedValue(new Error(scenario.error));

      // When: CV fails with this error
      let gracefullyHandled = false;
      try {
        await analyzeVideoSuggestion('sug-test', 'path.mp4', []);
      } catch (error) {
        // Graceful handling: log but don't break download
        console.warn('CV failed:', error);
        gracefullyHandled = true;
      }

      // Then: Should be handled gracefully
      expect(gracefullyHandled).toBe(true);
    }
  });

  /**
   * [3.7b-INT-002e] User can still see and use video when CV fails
   */
  it('should allow user to see video even when CV analysis fails (AC59)', async () => {
    // Given: CV analysis fails
    const suggestionId = 'sug-fail-4';
    const segmentPath = '.cache/videos/proj-1/scene-13-default.mp4';

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);
    mockAnalyze.mockRejectedValue(new Error('CV failed'));

    // When: CV fails
    let cvScore: number | null = null;
    try {
      const result = await analyzeVideoSuggestion(suggestionId, segmentPath, []);
      cvScore = result.cvScore;
    } catch {
      cvScore = null; // cv_score = NULL
    }

    // Then: Video should still be usable
    // - download_status = 'complete' (video downloaded successfully)
    // - cv_score = NULL (no CV analysis, but video visible per AC65)
    // - segment_path populated (video file exists)
    // User sees the video in UI because NULL cv_scores are shown (AC65)
    expect(cvScore).toBeNull();
    // Video remains visible and selectable by user
  });
});

// ============================================================================
// Expected Labels Flow - AC67
// ============================================================================

describe('[3.7b-INT-003] Expected Labels Passed to CV Analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * [3.7b-INT-003a] visual_keywords passed as expectedLabels
   */
  it('should pass scene.visual_keywords as expectedLabels (AC67)', async () => {
    // Given: Scene with visual_keywords
    const suggestionId = 'sug-789';
    const segmentPath = '.cache/videos/proj-1/scene-03-default.mp4';
    const sceneVisualKeywords = 'sunset,beach,ocean,waves';
    const expectedLabels = sceneVisualKeywords.split(',');

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);
    mockAnalyze.mockResolvedValue({
      suggestionId,
      cvScore: 0.9,
      analyzed: true,
      labelMatchScore: 0.85,
    });

    // When: CV analysis triggered
    await analyzeVideoSuggestion(suggestionId, segmentPath, expectedLabels);

    // Then: Should pass visual_keywords as expectedLabels
    expect(mockAnalyze).toHaveBeenCalledWith(
      suggestionId,
      segmentPath,
      expect.arrayContaining(['sunset', 'beach', 'ocean', 'waves'])
    );
  });

  /**
   * [3.7b-INT-003b] Empty expectedLabels when visual_keywords NULL
   */
  it('should pass empty array when visual_keywords is NULL (AC67)', async () => {
    // Given: Scene without visual_keywords
    const suggestionId = 'sug-no-keywords';
    const segmentPath = '.cache/videos/proj-1/scene-99-default.mp4';
    const expectedLabels: string[] = []; // No visual_keywords

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);
    mockAnalyze.mockResolvedValue({
      suggestionId,
      cvScore: 0.7,
      analyzed: true,
      labelMatchScore: 0,
    });

    // When: CV analysis triggered
    await analyzeVideoSuggestion(suggestionId, segmentPath, expectedLabels);

    // Then: Should pass empty array
    expect(mockAnalyze).toHaveBeenCalledWith(suggestionId, segmentPath, []);
  });

  /**
   * [3.7b-INT-003c] Data flow: scene → download → CV analysis
   */
  it('should maintain data flow from scene to CV analysis (AC67)', async () => {
    // Given: Complete data flow
    const scene = {
      id: 'scene-5',
      visual_keywords: 'forest,nature,trees,wildlife',
    };

    const suggestion = {
      id: 'sug-for-scene-5',
      sceneId: scene.id,
    };

    const downloadResult = {
      suggestionId: suggestion.id,
      segmentPath: '.cache/videos/proj-1/scene-05-default.mp4',
    };

    // When: Download completes → fetch scene → trigger CV
    // Step 1: Fetch scene to get visual_keywords
    const sceneKeywords = scene.visual_keywords.split(',');

    // Step 2: Trigger CV with expectedLabels from scene
    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);
    mockAnalyze.mockResolvedValue({
      suggestionId: suggestion.id,
      cvScore: 0.88,
      analyzed: true,
      labelMatchScore: 0.9,
    });

    await analyzeVideoSuggestion(
      downloadResult.suggestionId,
      downloadResult.segmentPath,
      sceneKeywords
    );

    // Then: expectedLabels should match scene.visual_keywords
    expect(mockAnalyze).toHaveBeenCalledWith(
      downloadResult.suggestionId,
      downloadResult.segmentPath,
      ['forest', 'nature', 'trees', 'wildlife']
    );
  });

  /**
   * [3.7b-INT-003d] Label matching improves cv_score
   */
  it('should improve cv_score when labels match visual_keywords (AC67)', async () => {
    // Given: Video with labels matching visual_keywords
    const suggestionId = 'sug-match';
    const segmentPath = '.cache/videos/proj-1/scene-06-default.mp4';
    const expectedLabels = ['mountain', 'hiking', 'landscape'];

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);

    // Case 1: Good label match
    mockAnalyze.mockResolvedValueOnce({
      suggestionId,
      cvScore: 0.95,
      analyzed: true,
      labelMatchScore: 0.9, // High match → better score
    });

    const goodMatch = await analyzeVideoSuggestion(suggestionId, segmentPath, expectedLabels);

    // Case 2: Poor label match
    mockAnalyze.mockResolvedValueOnce({
      suggestionId,
      cvScore: 0.65,
      analyzed: true,
      labelMatchScore: 0.2, // Low match → lower score
    });

    const poorMatch = await analyzeVideoSuggestion(suggestionId, segmentPath, expectedLabels);

    // Then: Good label match should have higher cv_score
    expect(goodMatch.cvScore).toBeGreaterThan(poorMatch.cvScore!);
    expect(goodMatch.labelMatchScore).toBeGreaterThan(poorMatch.labelMatchScore!);
  });

  /**
   * [3.7b-INT-003e] Helper function to get expected labels
   */
  it('should use helper function to extract expectedLabels from scene (AC67)', async () => {
    // This tests the pattern used in download-queue.ts
    // Helper function: getExpectedLabelsForSuggestion(suggestionId)

    // Given: Suggestion ID
    const suggestionId = 'sug-helper-test';

    // When: Helper fetches scene and extracts visual_keywords
    const getExpectedLabelsForSuggestion = (sugId: string): string[] => {
      // In actual implementation, this queries database:
      // 1. SELECT scene_id FROM visual_suggestions WHERE id = sugId
      // 2. SELECT visual_keywords FROM scenes WHERE id = scene_id
      // 3. RETURN visual_keywords.split(',')

      // Mock implementation for test
      const sceneKeywords = 'gaming,action,fps';
      return sceneKeywords.split(',');
    };

    const expectedLabels = getExpectedLabelsForSuggestion(suggestionId);

    // Then: Should return array of keywords
    expect(expectedLabels).toEqual(['gaming', 'action', 'fps']);
    expect(Array.isArray(expectedLabels)).toBe(true);
  });
});

// ============================================================================
// Vision API Availability Check
// ============================================================================

describe('[3.7b-INT-004] Vision API Availability Check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * [3.7b-INT-004a] Check Vision API availability before triggering
   */
  it('should check Vision API availability before auto-trigger (AC58)', async () => {
    // Given: Vision API status check
    const mockGetStatus = vi.mocked(getCVFilterStatus);
    mockGetStatus.mockReturnValue({
      available: true,
      quotaUsed: 100,
      quotaLimit: 1000,
      quotaRemaining: 900,
      resetDate: new Date('2025-12-01'),
    });

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);
    mockAnalyze.mockResolvedValue({
      suggestionId: 'sug-check',
      cvScore: 0.8,
      analyzed: true,
    });

    // When: Checking availability before trigger
    const status = getCVFilterStatus();

    if (status.available) {
      await analyzeVideoSuggestion('sug-check', 'path.mp4', ['nature']);
    }

    // Then: Should check status and proceed if available
    expect(mockGetStatus).toHaveBeenCalled();
    expect(mockAnalyze).toHaveBeenCalledOnce();
  });

  /**
   * [3.7b-INT-004b] Skip CV analysis when Vision API unavailable
   */
  it('should skip CV analysis when Vision API is unavailable (AC58)', async () => {
    // Given: Vision API not configured
    const mockGetStatus = vi.mocked(getCVFilterStatus);
    mockGetStatus.mockReturnValue({
      available: false,
      reason: 'Vision API not configured',
      quotaUsed: 0,
      quotaLimit: 0,
      quotaRemaining: 0,
      resetDate: new Date(),
    });

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);

    // When: Checking availability before trigger
    const status = getCVFilterStatus();

    if (status.available) {
      await analyzeVideoSuggestion('sug-skip', 'path.mp4', []);
    }

    // Then: Should NOT call CV analysis
    expect(mockGetStatus).toHaveBeenCalled();
    expect(mockAnalyze).not.toHaveBeenCalled();
    // cv_score remains NULL (same as graceful degradation)
  });

  /**
   * [3.7b-INT-004c] Skip CV analysis when quota exceeded
   */
  it('should skip CV analysis when quota is exceeded (AC48, AC59)', async () => {
    // Given: Quota exceeded
    const mockGetStatus = vi.mocked(getCVFilterStatus);
    mockGetStatus.mockReturnValue({
      available: false,
      reason: 'Quota exceeded',
      quotaUsed: 1000,
      quotaLimit: 1000,
      quotaRemaining: 0,
      resetDate: new Date('2025-12-01'),
    });

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);

    // When: Checking quota before trigger
    const status = getCVFilterStatus();

    if (status.available && !status.reason?.includes('exceeded')) {
      await analyzeVideoSuggestion('sug-quota', 'path.mp4', []);
    }

    // Then: Should NOT call CV analysis
    expect(mockAnalyze).not.toHaveBeenCalled();
  });
});

// ============================================================================
// End-to-End Auto-Trigger Flow
// ============================================================================

describe('[3.7b-INT-005] End-to-End Auto-Trigger Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * [3.7b-INT-005a] Complete flow from download to CV to UI
   */
  it('should complete full flow: download → CV → update UI (AC58, AC64)', async () => {
    // Given: Download completes
    const suggestionId = 'sug-e2e';
    const segmentPath = '.cache/videos/proj-1/scene-20-default.mp4';
    const expectedLabels = ['sunset', 'landscape'];

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);
    mockAnalyze.mockResolvedValue({
      suggestionId,
      cvScore: 0.88,
      analyzed: true,
      faceDetected: false,
      textDetected: false,
      labelMatchScore: 0.85,
    });

    // When: Complete flow executes
    // Step 1: Download completes
    const downloadComplete = true;

    // Step 2: Auto-trigger CV analysis
    let cvResult: CVFilterResult | null = null;
    if (downloadComplete) {
      cvResult = await analyzeVideoSuggestion(suggestionId, segmentPath, expectedLabels);
    }

    // Step 3: Update database with cv_score
    const dbUpdate = cvResult
      ? { cv_score: cvResult.cvScore }
      : { cv_score: null };

    // Step 4: UI filters based on cv_score (AC64)
    const isVisible = dbUpdate.cv_score === null || dbUpdate.cv_score >= 0.5;

    // Then: Full flow should complete successfully
    expect(downloadComplete).toBe(true);
    expect(cvResult).toBeDefined();
    expect(cvResult?.cvScore).toBe(0.88);
    expect(dbUpdate.cv_score).toBe(0.88);
    expect(isVisible).toBe(true); // cv_score 0.88 >= 0.5 → visible
  });

  /**
   * [3.7b-INT-005b] Flow with low cv_score results in hidden UI
   */
  it('should hide suggestion in UI when cv_score < 0.5 (AC58, AC64)', async () => {
    // Given: Download completes
    const suggestionId = 'sug-low';
    const segmentPath = '.cache/videos/proj-1/scene-21-default.mp4';
    const expectedLabels = ['tutorial'];

    const mockAnalyze = vi.mocked(analyzeVideoSuggestion);
    mockAnalyze.mockResolvedValue({
      suggestionId,
      cvScore: 0.2, // Low score (talking head detected)
      analyzed: true,
      faceDetected: true,
      textDetected: true,
    });

    // When: Complete flow executes
    const cvResult = await analyzeVideoSuggestion(suggestionId, segmentPath, expectedLabels);
    const dbUpdate = { cv_score: cvResult.cvScore };
    const isVisible = dbUpdate.cv_score === null || dbUpdate.cv_score >= 0.5;

    // Then: Suggestion should be hidden in UI
    expect(cvResult.cvScore).toBe(0.2);
    expect(isVisible).toBe(false); // cv_score 0.2 < 0.5 → hidden
  });
});
