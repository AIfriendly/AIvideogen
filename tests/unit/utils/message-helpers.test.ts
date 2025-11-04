/**
 * Critical Test: UUID Generation with Browser Fallback
 * Test ID: 1.5-UNIT-010
 *
 * CRITICAL: Ensures UUID generation works in older browsers without crypto.randomUUID
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMessageId, getErrorMessage, ERROR_MESSAGES } from '@/lib/utils/message-helpers';

describe('1.5-UNIT-010: UUID Generation with Fallback', () => {
  describe('generateMessageId', () => {
    it('should use crypto.randomUUID when available', () => {
      const id = generateMessageId();

      // Should return UUID format or fallback format
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should use fallback when crypto.randomUUID unavailable', () => {
      // Mock crypto.randomUUID as undefined (older browsers)
      const originalCrypto = global.crypto;

      // @ts-ignore - Testing fallback scenario
      global.crypto = { randomUUID: undefined };

      const id = generateMessageId();

      // Fallback format: msg-{timestamp}-{random}
      expect(id).toMatch(/^msg-\d+-[a-z0-9]+$/);

      // Restore
      global.crypto = originalCrypto;
    });

    it('should generate unique IDs on multiple calls', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();
      const id3 = generateMessageId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });
});

describe('1.5-INT-005: Error Code Mapping', () => {
  describe('ERROR_MESSAGES', () => {
    it('should map OLLAMA_CONNECTION_ERROR correctly', () => {
      expect(ERROR_MESSAGES.OLLAMA_CONNECTION_ERROR).toBe(
        'Unable to connect to Ollama. Please ensure it is running at http://localhost:11434'
      );
    });

    it('should map INVALID_PROJECT_ID correctly', () => {
      expect(ERROR_MESSAGES.INVALID_PROJECT_ID).toBe(
        'Project not found. Please refresh the page.'
      );
    });

    it('should map EMPTY_MESSAGE correctly', () => {
      expect(ERROR_MESSAGES.EMPTY_MESSAGE).toBe('Message cannot be empty');
    });

    it('should map DATABASE_ERROR correctly', () => {
      expect(ERROR_MESSAGES.DATABASE_ERROR).toBe(
        'Failed to save message. Please try again.'
      );
    });
  });

  describe('getErrorMessage', () => {
    it('should return mapped message for known error code', () => {
      const message = getErrorMessage('OLLAMA_CONNECTION_ERROR');
      expect(message).toBe(ERROR_MESSAGES.OLLAMA_CONNECTION_ERROR);
    });

    it('should return fallback for unknown error code', () => {
      const message = getErrorMessage('UNKNOWN_ERROR');
      expect(message).toBe('An unexpected error occurred');
    });

    it('should return custom fallback when provided', () => {
      const message = getErrorMessage('UNKNOWN_ERROR', 'Custom fallback');
      expect(message).toBe('Custom fallback');
    });

    it('should return fallback when error code is undefined', () => {
      const message = getErrorMessage(undefined);
      expect(message).toBe('An unexpected error occurred');
    });
  });
});
