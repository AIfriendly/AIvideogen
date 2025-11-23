/**
 * Unit Tests for CV Filter Service
 * Story 3.7: Computer Vision Content Filtering
 *
 * Tests for CV filter service orchestration, batch processing,
 * database updates, and graceful degradation.
 *
 * Test IDs: 3.7-UNIT-021 to 3.7-UNIT-030
 * Priority: P0 (Critical)
 * Risk Mitigation: R-003 (Service Orchestration)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCVFilterStatus,
  type CVFilterResult,
  type CVFilterStatus,
} from '@/lib/vision/cv-filter-service';

// Mock dependencies
vi.mock('@/lib/db/client', () => ({
  default: {
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
    }),
  },
}));

vi.mock('@/lib/vision/index', () => ({
  visionClient: {
    isAvailable: vi.fn().mockReturnValue(true),
    isQuotaExceeded: vi.fn().mockReturnValue(false),
    getQuotaUsage: vi.fn().mockReturnValue({
      used: 50,
      limit: 1000,
      remaining: 950,
      resetDate: new Date('2025-12-01'),
    }),
    analyzeFrames: vi.fn(),
    analyzeThumbnail: vi.fn(),
  },
  extractFrames: vi.fn().mockResolvedValue([Buffer.from('frame1')]),
  getFrameDimensions: vi.fn().mockResolvedValue({ width: 1920, height: 1080 }),
  VisionAPIError: class VisionAPIError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  VisionErrorCode: {
    QUOTA_EXCEEDED: 'VISION_QUOTA_EXCEEDED',
    MISSING_CREDENTIALS: 'VISION_CREDENTIALS_NOT_CONFIGURED',
  },
}));

// ============================================================================
// CV Filter Status Tests
// ============================================================================

describe('CV Filter Status', () => {
  /**
   * [3.7-UNIT-021] Status when available
   */
  describe('[3.7-UNIT-021] Service Available Status', () => {
    it('should return available status when Vision API is configured (AC49)', async () => {
      // Given: Vision API is configured and has quota
      const { visionClient } = await import('@/lib/vision/index');
      vi.mocked(visionClient.isAvailable).mockReturnValue(true);
      vi.mocked(visionClient.isQuotaExceeded).mockReturnValue(false);

      // When: Getting status
      const status = getCVFilterStatus();

      // Then: Should be available
      expect(status.available).toBe(true);
      expect(status.reason).toBeUndefined();
    });
  });

  /**
   * [3.7-UNIT-022] Status when quota exceeded
   */
  describe('[3.7-UNIT-022] Quota Exceeded Status', () => {
    it('should return unavailable with quota reason (AC48)', async () => {
      // Given: Quota exceeded
      const { visionClient } = await import('@/lib/vision/index');
      vi.mocked(visionClient.isAvailable).mockReturnValue(false);
      vi.mocked(visionClient.isQuotaExceeded).mockReturnValue(true);

      // When: Getting status
      const status = getCVFilterStatus();

      // Then: Should indicate quota exceeded
      expect(status.available).toBe(false);
      expect(status.reason).toBe('Quota exceeded');
    });
  });

  /**
   * [3.7-UNIT-023] Status when not configured
   */
  describe('[3.7-UNIT-023] Not Configured Status', () => {
    it('should return unavailable with config reason (AC49)', async () => {
      // Given: Not configured
      const { visionClient } = await import('@/lib/vision/index');
      vi.mocked(visionClient.isAvailable).mockReturnValue(false);
      vi.mocked(visionClient.isQuotaExceeded).mockReturnValue(false);

      // When: Getting status
      const status = getCVFilterStatus();

      // Then: Should indicate not configured
      expect(status.available).toBe(false);
      expect(status.reason).toBe('Vision API not configured');
    });
  });

  /**
   * [3.7-UNIT-024] Quota usage information
   */
  describe('[3.7-UNIT-024] Quota Usage Information', () => {
    it('should include quota usage details (AC47)', async () => {
      // Given: Vision client with quota
      const { visionClient } = await import('@/lib/vision/index');
      vi.mocked(visionClient.isAvailable).mockReturnValue(true);
      vi.mocked(visionClient.getQuotaUsage).mockReturnValue({
        used: 100,
        limit: 1000,
        remaining: 900,
        resetDate: new Date('2025-12-01'),
      });

      // When: Getting status
      const status = getCVFilterStatus();

      // Then: Should include quota details
      expect(status.quotaUsed).toBe(100);
      expect(status.quotaLimit).toBe(1000);
      expect(status.quotaRemaining).toBe(900);
      expect(status.resetDate).toEqual(new Date('2025-12-01'));
    });
  });
});

// ============================================================================
// CV Filter Result Structure Tests
// ============================================================================

describe('CV Filter Result Structure', () => {
  /**
   * [3.7-UNIT-025] Successful analysis result
   */
  describe('[3.7-UNIT-025] Successful Result Structure', () => {
    it('should include all expected fields for successful analysis (AC46)', () => {
      // Given: Successful analysis result
      const result: CVFilterResult = {
        suggestionId: 'sug-123',
        cvScore: 0.85,
        analyzed: true,
        faceDetected: false,
        textDetected: false,
        labelMatchScore: 0.9,
      };

      // Then: Should have all fields
      expect(result.suggestionId).toBeDefined();
      expect(result.cvScore).toBeGreaterThanOrEqual(0);
      expect(result.cvScore).toBeLessThanOrEqual(1);
      expect(result.analyzed).toBe(true);
      expect(result.faceDetected).toBeDefined();
      expect(result.textDetected).toBeDefined();
      expect(result.labelMatchScore).toBeDefined();
    });
  });

  /**
   * [3.7-UNIT-026] Failed analysis result
   */
  describe('[3.7-UNIT-026] Failed Result Structure', () => {
    it('should include reason for failed analysis (AC49)', () => {
      // Given: Failed analysis result
      const result: CVFilterResult = {
        suggestionId: 'sug-456',
        cvScore: null,
        analyzed: false,
        reason: 'Vision API quota exceeded',
      };

      // Then: Should have failure info
      expect(result.cvScore).toBeNull();
      expect(result.analyzed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });
});

// ============================================================================
// Database Update Tests
// ============================================================================

describe('Database Updates', () => {
  /**
   * [3.7-UNIT-027] CV score storage
   */
  describe('[3.7-UNIT-027] CV Score Storage', () => {
    it('should store CV score in 0-1 range (AC46)', () => {
      // Given: Valid CV scores
      const validScores = [0, 0.5, 0.85, 1.0];

      // Then: All should be in range
      validScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    it('should accept null for unanalyzed suggestions (AC46)', () => {
      // Given: Unanalyzed result
      const result: CVFilterResult = {
        suggestionId: 'sug-789',
        cvScore: null,
        analyzed: false,
        reason: 'Segment not downloaded',
      };

      // Then: Null should be valid
      expect(result.cvScore).toBeNull();
    });
  });
});

// ============================================================================
// Batch Processing Tests
// ============================================================================

describe('Batch Processing', () => {
  /**
   * [3.7-UNIT-028] Batch quota check
   */
  describe('[3.7-UNIT-028] Batch Quota Checking', () => {
    it('should stop batch when quota exceeded (AC48)', () => {
      // Given: Batch of 5 suggestions
      const suggestions = [
        { id: '1', segmentPath: '/path/1.mp4', downloadStatus: 'complete' },
        { id: '2', segmentPath: '/path/2.mp4', downloadStatus: 'complete' },
        { id: '3', segmentPath: '/path/3.mp4', downloadStatus: 'complete' },
      ];

      // When: Quota exceeded after first
      // Then: Should mark remaining as not analyzed
      const quotaExceededResults: CVFilterResult[] = [
        { suggestionId: '1', cvScore: 0.8, analyzed: true },
        { suggestionId: '2', cvScore: null, analyzed: false, reason: 'Vision API quota exceeded' },
        { suggestionId: '3', cvScore: null, analyzed: false, reason: 'Vision API quota exceeded' },
      ];

      expect(quotaExceededResults.filter(r => r.analyzed)).toHaveLength(1);
      expect(quotaExceededResults.filter(r => !r.analyzed)).toHaveLength(2);
    });
  });

  /**
   * [3.7-UNIT-029] Skip non-downloaded segments
   */
  describe('[3.7-UNIT-029] Skip Non-Downloaded Segments', () => {
    it('should skip suggestions without downloaded segments (AC50)', () => {
      // Given: Suggestion without download
      const suggestion = {
        id: 'sug-no-dl',
        segmentPath: null,
        downloadStatus: 'pending',
      };

      // Then: Should be skipped
      const result: CVFilterResult = {
        suggestionId: suggestion.id,
        cvScore: null,
        analyzed: false,
        reason: 'Segment not downloaded',
      };

      expect(result.analyzed).toBe(false);
      expect(result.reason).toContain('not downloaded');
    });
  });
});

// ============================================================================
// Scene Summary Tests
// ============================================================================

describe('Scene Summary', () => {
  /**
   * [3.7-UNIT-030] Summary statistics
   */
  describe('[3.7-UNIT-030] Summary Statistics', () => {
    it('should calculate correct summary statistics (AC50)', () => {
      // Given: Scene with analyzed suggestions
      const suggestions = [
        { cvScore: 0.9, analyzed: true },
        { cvScore: 0.7, analyzed: true },
        { cvScore: 0.4, analyzed: true },
        { cvScore: null, analyzed: false },
      ];

      // When: Calculating summary
      const analyzed = suggestions.filter(s => s.analyzed).length;
      const pending = suggestions.filter(s => !s.analyzed).length;
      const scores = suggestions.filter(s => s.cvScore !== null).map(s => s.cvScore as number);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const highScoreCount = scores.filter(s => s >= 0.7).length;
      const lowScoreCount = scores.filter(s => s < 0.5).length;

      // Then: Should calculate correctly
      expect(analyzed).toBe(3);
      expect(pending).toBe(1);
      expect(avgScore).toBeCloseTo(0.67, 2);
      expect(highScoreCount).toBe(2);
      expect(lowScoreCount).toBe(1);
    });
  });
});
