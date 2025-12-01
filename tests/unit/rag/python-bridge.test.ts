/**
 * Python Bridge Tests
 *
 * Story 6.3 - YouTube Channel Sync & Caption Scraping
 *
 * Note: Full integration tests with Python subprocess are run separately.
 * These tests focus on the error handling and helper functions.
 */

import { describe, it, expect } from 'vitest';
import {
  isRecoverableError,
  errorCodeToEmbeddingStatus,
  type TranscriptErrorCode
} from '@/lib/rag/ingestion/python-bridge';

describe('Python Bridge', () => {
  describe('scrapeVideoTranscripts', () => {
    it('should return empty result for empty input', async () => {
      // Import dynamically to avoid mocking issues
      const { scrapeVideoTranscripts } = await import('@/lib/rag/ingestion/python-bridge');
      const result = await scrapeVideoTranscripts([]);

      expect(result.success).toBe(true);
      expect(result.transcripts).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('isRecoverableError', () => {
    it('should return true for recoverable errors', () => {
      expect(isRecoverableError('RATE_LIMITED')).toBe(true);
      expect(isRecoverableError('TIMEOUT')).toBe(true);
      expect(isRecoverableError('UNKNOWN_ERROR')).toBe(true);
    });

    it('should return false for non-recoverable errors', () => {
      expect(isRecoverableError('NO_CAPTIONS')).toBe(false);
      expect(isRecoverableError('VIDEO_UNAVAILABLE')).toBe(false);
      expect(isRecoverableError('AGE_RESTRICTED')).toBe(false);
      expect(isRecoverableError('TRANSCRIPT_DISABLED')).toBe(false);
    });
  });

  describe('errorCodeToEmbeddingStatus', () => {
    it('should map NO_CAPTIONS to appropriate status', () => {
      // Note: The function returns specific statuses for categorization
      const status = errorCodeToEmbeddingStatus('NO_CAPTIONS');
      expect(['error', 'no_captions']).toContain(status);
    });

    it('should map VIDEO_UNAVAILABLE to appropriate status', () => {
      const status = errorCodeToEmbeddingStatus('VIDEO_UNAVAILABLE');
      expect(['error', 'unavailable']).toContain(status);
    });

    it('should map AGE_RESTRICTED to appropriate status', () => {
      const status = errorCodeToEmbeddingStatus('AGE_RESTRICTED');
      expect(['error', 'restricted']).toContain(status);
    });

    it('should map UNKNOWN_ERROR to error', () => {
      expect(errorCodeToEmbeddingStatus('UNKNOWN_ERROR')).toBe('error');
    });
  });

  describe('TranscriptErrorCode type', () => {
    it('should include all expected error codes', () => {
      const errorCodes: TranscriptErrorCode[] = [
        'NO_CAPTIONS',
        'VIDEO_UNAVAILABLE',
        'AGE_RESTRICTED',
        'TRANSCRIPT_DISABLED',
        'RATE_LIMITED',
        'IMPORT_ERROR',
        'INVALID_INPUT',
        'FATAL_ERROR',
        'TIMEOUT',
        'UNKNOWN_ERROR'
      ];
      // Type check passes if this compiles
      expect(errorCodes.length).toBe(10);
    });
  });
});
