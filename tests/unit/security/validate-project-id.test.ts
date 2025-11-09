/**
 * UUID Validation Security Tests
 *
 * Tests the validateProjectId function to ensure it properly rejects
 * path traversal attempts and malicious inputs while accepting valid UUIDs.
 *
 * Security Risk: R-002 (Path Traversal)
 * Priority: P0 (Critical Security)
 *
 * @module tests/unit/security/validate-project-id.test
 */

import { describe, it, expect } from 'vitest';
import {
  validateProjectId,
  assertValidProjectId,
  extractAndValidateProjectId,
} from '@/lib/utils/validate-project-id';

describe('[R-002] UUID Validation Security Tests', () => {
  describe('[P0] Valid UUID v4 Acceptance', () => {
    it('[SEC-001] [P0] should accept valid UUID v4 format', () => {
      // Given: Valid UUID v4 strings
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        'a3bb189e-8bf9-4888-9912-ace4e6543002',  // UUID v4 format
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ];

      // When: Validating each UUID
      // Then: All should be accepted
      validUUIDs.forEach(uuid => {
        expect(validateProjectId(uuid)).toBe(true);
      });
    });

    it('[SEC-002] [P0] should be case-insensitive', () => {
      // Given: Same UUID in different cases
      const uuid = '550E8400-E29B-41D4-A716-446655440000';

      // When: Validating uppercase UUID
      const result = validateProjectId(uuid);

      // Then: Should be accepted
      expect(result).toBe(true);
    });

    it('[SEC-003] [P0] should accept UUID with lowercase hex digits', () => {
      // Given: UUID with all lowercase hex digits
      const uuid = 'abcdef01-2345-4678-9abc-def012345678';

      // When: Validating
      const result = validateProjectId(uuid);

      // Then: Should be accepted
      expect(result).toBe(true);
    });
  });

  describe('[P0] Path Traversal Attack Prevention', () => {
    it('[SEC-004] [P0] should reject parent directory traversal (Unix)', () => {
      // Given: Unix-style path traversal attempts
      const attacks = [
        '../../../etc/passwd',
        '../../tmp/malicious',
        '../evil',
      ];

      // When: Validating each attack
      // Then: All should be rejected
      attacks.forEach(attack => {
        expect(validateProjectId(attack)).toBe(false);
      });
    });

    it('[SEC-005] [P0] should reject parent directory traversal (Windows)', () => {
      // Given: Windows-style path traversal attempts
      const attacks = [
        '..\\..\\Windows\\System32',
        '..\\..\\..\\boot.ini',
        '..\\evil.exe',
      ];

      // When: Validating each attack
      // Then: All should be rejected
      attacks.forEach(attack => {
        expect(validateProjectId(attack)).toBe(false);
      });
    });

    it('[SEC-006] [P0] should reject absolute paths (Unix)', () => {
      // Given: Absolute path attempts
      const attacks = [
        '/etc/passwd',
        '/tmp/malicious',
        '/var/www/html',
      ];

      // When: Validating each attack
      // Then: All should be rejected
      attacks.forEach(attack => {
        expect(validateProjectId(attack)).toBe(false);
      });
    });

    it('[SEC-007] [P0] should reject absolute paths (Windows)', () => {
      // Given: Windows absolute path attempts
      const attacks = [
        'C:\\Windows\\System32',
        'D:\\malicious',
        'E:\\',
      ];

      // When: Validating each attack
      // Then: All should be rejected
      attacks.forEach(attack => {
        expect(validateProjectId(attack)).toBe(false);
      });
    });

    it('[SEC-008] [P0] should reject URL-encoded path traversal', () => {
      // Given: URL-encoded traversal attempts
      const attacks = [
        '%2e%2e%2f%2e%2e%2f%2e%2e%2ftmp',  // ../../tmp
        '%2e%2e%5c%2e%2e%5c',              // ..\..\\
      ];

      // When: Validating each attack
      // Then: All should be rejected
      attacks.forEach(attack => {
        expect(validateProjectId(attack)).toBe(false);
      });
    });
  });

  describe('[P0] Invalid Format Rejection', () => {
    it('[SEC-009] [P0] should reject null and undefined', () => {
      // Given: Null and undefined inputs
      // When: Validating
      // Then: Should be rejected
      expect(validateProjectId(null)).toBe(false);
      expect(validateProjectId(undefined)).toBe(false);
    });

    it('[SEC-010] [P0] should reject empty string', () => {
      // Given: Empty string
      // When: Validating
      const result = validateProjectId('');

      // Then: Should be rejected
      expect(result).toBe(false);
    });

    it('[SEC-011] [P0] should reject non-string types', () => {
      // Given: Non-string inputs
      const invalidInputs = [
        123,
        true,
        {},
        [],
      ];

      // When: Validating each (TypeScript allows any, so test runtime)
      // Then: All should be rejected
      invalidInputs.forEach(input => {
        expect(validateProjectId(input as any)).toBe(false);
      });
    });

    it('[SEC-012] [P0] should reject strings that are too short', () => {
      // Given: String shorter than 36 characters
      const shortString = '550e8400-e29b-41d4-a716';

      // When: Validating
      const result = validateProjectId(shortString);

      // Then: Should be rejected
      expect(result).toBe(false);
    });

    it('[SEC-013] [P0] should reject strings that are too long', () => {
      // Given: String longer than 36 characters
      const longString = '550e8400-e29b-41d4-a716-446655440000-extra';

      // When: Validating
      const result = validateProjectId(longString);

      // Then: Should be rejected
      expect(result).toBe(false);
    });

    it('[SEC-014] [P0] should reject UUID with wrong version nibble', () => {
      // Given: UUID with version nibble != 4 (UUID v5, v1, etc.)
      const wrongVersion = '550e8400-e29b-51d4-a716-446655440000';  // Version 5

      // When: Validating
      const result = validateProjectId(wrongVersion);

      // Then: Should be rejected (we specifically want v4)
      expect(result).toBe(false);
    });

    it('[SEC-015] [P0] should reject UUID-like strings with invalid characters', () => {
      // Given: UUID-like strings with invalid hex digits
      const invalidChars = [
        '550e8400-e29b-41d4-a716-44665544000g',  // 'g' is not hex
        '550e8400-e29b-41d4-a716-44665544000@',  // '@' is not hex
        '550e8400:e29b:41d4:a716:446655440000',  // Wrong separator (:)
      ];

      // When: Validating each
      // Then: All should be rejected
      invalidChars.forEach(invalid => {
        expect(validateProjectId(invalid)).toBe(false);
      });
    });
  });

  describe('[P1] assertValidProjectId Function', () => {
    it('[SEC-016] [P1] should not throw for valid UUID', () => {
      // Given: Valid UUID
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';

      // When/Then: Should not throw
      expect(() => assertValidProjectId(validUUID)).not.toThrow();
    });

    it('[SEC-017] [P1] should throw for invalid UUID with clear message', () => {
      // Given: Invalid UUID (path traversal)
      const invalidId = '../../../etc/passwd';

      // When: Asserting
      // Then: Should throw with descriptive message
      expect(() => assertValidProjectId(invalidId)).toThrow(/Invalid project ID format/);
      expect(() => assertValidProjectId(invalidId)).toThrow(/UUID v4/);
    });

    it('[SEC-018] [P1] should throw for null/undefined', () => {
      // Given: Null/undefined
      // When/Then: Should throw
      expect(() => assertValidProjectId(null)).toThrow();
      expect(() => assertValidProjectId(undefined)).toThrow();
    });
  });

  describe('[P1] extractAndValidateProjectId Function', () => {
    it('[SEC-019] [P1] should extract valid UUID from path', () => {
      // Given: API path containing UUID
      const path = '/api/projects/550e8400-e29b-41d4-a716-446655440000/generate-voiceovers';

      // When: Extracting and validating
      const result = extractAndValidateProjectId(path);

      // Then: Should return the UUID
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('[SEC-020] [P1] should return null for path with no UUID', () => {
      // Given: Path without UUID
      const path = '/api/projects/invalid/generate';

      // When: Extracting
      const result = extractAndValidateProjectId(path);

      // Then: Should return null
      expect(result).toBeNull();
    });

    it('[SEC-021] [P1] should return null for path with path traversal', () => {
      // Given: Path with traversal attempt
      const path = '/api/projects/../../../etc/passwd';

      // When: Extracting
      const result = extractAndValidateProjectId(path);

      // Then: Should return null
      expect(result).toBeNull();
    });
  });

  describe('[P2] Edge Cases', () => {
    it('[SEC-022] [P2] should handle UUID with extra whitespace', () => {
      // Given: UUID with whitespace
      const uuid = ' 550e8400-e29b-41d4-a716-446655440000 ';

      // When: Validating
      const result = validateProjectId(uuid);

      // Then: Should be rejected (no trimming)
      expect(result).toBe(false);
    });

    it('[SEC-023] [P2] should reject UUID with newline injection', () => {
      // Given: UUID with newline
      const uuid = '550e8400-e29b-41d4-a716-446655440000\n';

      // When: Validating
      const result = validateProjectId(uuid);

      // Then: Should be rejected
      expect(result).toBe(false);
    });

    it('[SEC-024] [P2] should reject null byte injection', () => {
      // Given: UUID with null byte
      const uuid = '550e8400-e29b-41d4-a716-446655440000\0';

      // When: Validating
      const result = validateProjectId(uuid);

      // Then: Should be rejected
      expect(result).toBe(false);
    });
  });
});
