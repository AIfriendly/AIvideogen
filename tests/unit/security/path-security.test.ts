/**
 * Path Security Tests
 *
 * Tests path containment verification and scene number validation
 * to prevent path traversal attacks.
 *
 * Security Risk: R-002 (Path Traversal)
 * Priority: P0 (Critical Security)
 *
 * @module tests/unit/security/path-security.test
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import {
  verifyPathContainment,
  assertPathContainment,
  validateSceneNumber,
  assertValidSceneNumber,
  constructSafeAudioPath,
  containsSuspiciousPatterns,
} from '@/lib/utils/path-security';

describe('[R-002] Path Security Tests', () => {
  const baseDir = path.join(process.cwd(), '.cache', 'audio', 'projects');

  describe('[P0] Path Containment Verification', () => {
    it('[SEC-025] [P0] should accept path within base directory', () => {
      // Given: Valid path within base directory
      const safePath = path.join(baseDir, '550e8400-e29b-41d4-a716-446655440000', 'scene-1.mp3');

      // When: Verifying containment
      const result = verifyPathContainment(safePath);

      // Then: Should be accepted
      expect(result).toBe(true);
    });

    it('[SEC-026] [P0] should reject parent directory traversal', () => {
      // Given: Path with parent directory traversal
      const maliciousPath = path.join(baseDir, '../../../etc/passwd');

      // When: Verifying containment
      const result = verifyPathContainment(maliciousPath);

      // Then: Should be rejected
      expect(result).toBe(false);
    });

    it('[SEC-027] [P0] should reject absolute path outside base', () => {
      // Given: Absolute path outside base directory
      const maliciousPath = '/tmp/malicious/scene-1.mp3';

      // When: Verifying containment
      const result = verifyPathContainment(maliciousPath);

      // Then: Should be rejected
      expect(result).toBe(false);
    });

    it('[SEC-028] [P0] should accept base directory itself', () => {
      // Given: The base directory path
      // When: Verifying containment
      const result = verifyPathContainment(baseDir);

      // Then: Should be accepted
      expect(result).toBe(true);
    });

    it('[SEC-029] [P0] should reject path that starts with base but is not contained', () => {
      // Given: Path that starts with base name but escapes
      // e.g., /base vs /base-malicious
      const baseWithSuffix = baseDir + '-malicious';
      const maliciousPath = path.join(baseWithSuffix, 'file.mp3');

      // When: Verifying containment
      const result = verifyPathContainment(maliciousPath);

      // Then: Should be rejected
      expect(result).toBe(false);
    });

    it('[SEC-030] [P0] should handle relative paths correctly', () => {
      // Given: Relative path that would escape base
      const relativePath = '.cache/audio/projects/../../../evil';

      // When: Verifying containment
      const result = verifyPathContainment(relativePath);

      // Then: Should be rejected
      expect(result).toBe(false);
    });
  });

  describe('[P0] Scene Number Validation', () => {
    it('[SEC-031] [P0] should accept valid positive integers', () => {
      // Given: Valid scene numbers
      const validNumbers = [1, 2, 10, 100, '1', '42', '999'];

      // When: Validating each
      // Then: All should be accepted
      validNumbers.forEach(num => {
        expect(validateSceneNumber(num)).toBe(true);
      });
    });

    it('[SEC-032] [P0] should reject zero', () => {
      // Given: Zero (scenes start at 1)
      // When: Validating
      const result = validateSceneNumber(0);

      // Then: Should be rejected
      expect(result).toBe(false);
    });

    it('[SEC-033] [P0] should reject negative numbers', () => {
      // Given: Negative numbers
      const negativeNumbers = [-1, -5, '-10'];

      // When: Validating each
      // Then: All should be rejected
      negativeNumbers.forEach(num => {
        expect(validateSceneNumber(num)).toBe(false);
      });
    });

    it('[SEC-034] [P0] should reject decimal numbers', () => {
      // Given: Decimal numbers
      const decimals = [1.5, '2.3', '10.0'];

      // When: Validating each
      // Then: All should be rejected
      decimals.forEach(num => {
        expect(validateSceneNumber(num)).toBe(false);
      });
    });

    it('[SEC-035] [P0] should reject path traversal in scene number', () => {
      // Given: Scene number with path traversal
      const attacks = ['../evil', '../../tmp', '../../../etc/passwd'];

      // When: Validating each
      // Then: All should be rejected
      attacks.forEach(attack => {
        expect(validateSceneNumber(attack)).toBe(false);
      });
    });

    it('[SEC-036] [P0] should reject special characters', () => {
      // Given: Scene numbers with special characters
      const invalid = ['1;rm -rf /', '2|cat /etc/passwd', '3`whoami`', '4$(ls)'];

      // When: Validating each
      // Then: All should be rejected
      invalid.forEach(num => {
        expect(validateSceneNumber(num)).toBe(false);
      });
    });

    it('[SEC-037] [P0] should reject empty string', () => {
      // Given: Empty string
      // When: Validating
      const result = validateSceneNumber('');

      // Then: Should be rejected
      expect(result).toBe(false);
    });

    it('[SEC-038] [P0] should reject strings with letters', () => {
      // Given: Strings with letters
      const invalid = ['1a', 'scene1', 'one'];

      // When: Validating each
      // Then: All should be rejected
      invalid.forEach(num => {
        expect(validateSceneNumber(num)).toBe(false);
      });
    });
  });

  describe('[P0] assertPathContainment Function', () => {
    it('[SEC-039] [P0] should not throw for safe path', () => {
      // Given: Safe path
      const safePath = path.join(baseDir, 'project-id', 'scene-1.mp3');

      // When/Then: Should not throw
      expect(() => assertPathContainment(safePath)).not.toThrow();
    });

    it('[SEC-040] [P0] should throw for path traversal with descriptive error', () => {
      // Given: Path traversal attempt
      const maliciousPath = path.join(baseDir, '../../../etc/passwd');

      // When: Asserting containment
      // Then: Should throw with security violation message
      expect(() => assertPathContainment(maliciousPath)).toThrow(/Security violation/);
      expect(() => assertPathContainment(maliciousPath)).toThrow(/Path traversal detected/);
    });
  });

  describe('[P0] assertValidSceneNumber Function', () => {
    it('[SEC-041] [P0] should not throw for valid scene number', () => {
      // Given: Valid scene numbers
      const validNumbers = [1, 5, '10', '100'];

      // When/Then: Should not throw
      validNumbers.forEach(num => {
        expect(() => assertValidSceneNumber(num)).not.toThrow();
      });
    });

    it('[SEC-042] [P0] should throw for invalid scene number with clear message', () => {
      // Given: Invalid scene number
      const invalid = '../evil';

      // When: Asserting
      // Then: Should throw with descriptive message
      expect(() => assertValidSceneNumber(invalid)).toThrow(/Invalid scene number/);
      expect(() => assertValidSceneNumber(invalid)).toThrow(/positive integer/);
    });
  });

  describe('[P0] constructSafeAudioPath Function', () => {
    it('[SEC-043] [P0] should construct safe path for valid inputs', () => {
      // Given: Valid project ID and scene number
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const sceneNumber = 1;

      // When: Constructing path
      const result = constructSafeAudioPath(projectId, sceneNumber);

      // Then: Should return safe path
      expect(result).toContain(projectId);
      expect(result).toContain('scene-1.mp3');
      expect(result).toContain('.cache');
      expect(result).toContain('audio');
      expect(result).toContain('projects');
    });

    it('[SEC-044] [P0] should throw for invalid scene number', () => {
      // Given: Valid project ID but invalid scene number
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const invalidScene = '../evil';

      // When: Constructing path
      // Then: Should throw
      expect(() => constructSafeAudioPath(projectId, invalidScene)).toThrow(/Invalid scene number/);
    });

    it('[SEC-045] [P0] should verify containment after construction', () => {
      // Given: Valid inputs
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const sceneNumber = 1;

      // When: Constructing path
      const result = constructSafeAudioPath(projectId, sceneNumber);

      // Then: Path should be contained in base directory
      expect(verifyPathContainment(result)).toBe(true);
    });
  });

  describe('[P1] Suspicious Pattern Detection', () => {
    it('[SEC-046] [P1] should detect parent directory patterns', () => {
      // Given: Paths with parent directory patterns
      const suspicious = [
        '../evil',
        '../../tmp',
        'path/../../../etc/passwd',
      ];

      // When: Checking for suspicious patterns
      // Then: All should be detected
      suspicious.forEach(path => {
        expect(containsSuspiciousPatterns(path)).toBe(true);
      });
    });

    it('[SEC-047] [P1] should detect backslash patterns', () => {
      // Given: Paths with backslashes
      const suspicious = [
        '..\\evil',
        'path\\to\\file',
      ];

      // When: Checking
      // Then: Should be detected
      suspicious.forEach(path => {
        expect(containsSuspiciousPatterns(path)).toBe(true);
      });
    });

    it('[SEC-048] [P1] should detect URL-encoded patterns', () => {
      // Given: URL-encoded traversal
      const suspicious = [
        '%2e%2e%2f',      // ../
        '%2e%2e%5c',      // ..\
        'path%2ffile',    // path/file
      ];

      // When: Checking
      // Then: Should be detected
      suspicious.forEach(path => {
        expect(containsSuspiciousPatterns(path)).toBe(true);
      });
    });

    it('[SEC-049] [P1] should detect absolute paths', () => {
      // Given: Absolute paths
      const suspicious = [
        '/etc/passwd',
        '/tmp/file',
        'C:\\Windows\\System32',
        'D:\\malicious',
      ];

      // When: Checking
      // Then: Should be detected
      suspicious.forEach(path => {
        expect(containsSuspiciousPatterns(path)).toBe(true);
      });
    });

    it('[SEC-050] [P1] should not flag legitimate UUIDs', () => {
      // Given: Legitimate UUID paths
      const legitimate = [
        '550e8400-e29b-41d4-a716-446655440000',
        'scene-1.mp3',
        'audio-projects',
      ];

      // When: Checking
      // Then: Should not be flagged
      legitimate.forEach(path => {
        expect(containsSuspiciousPatterns(path)).toBe(false);
      });
    });

    it('[SEC-051] [P1] should detect null byte injection', () => {
      // Given: Path with null byte
      const suspicious = 'path\0malicious';

      // When: Checking
      const result = containsSuspiciousPatterns(suspicious);

      // Then: Should be detected
      expect(result).toBe(true);
    });
  });

  describe('[P2] Edge Cases', () => {
    it('[SEC-052] [P2] should handle Windows path separators', () => {
      // Given: Windows-style path
      const windowsPath = 'C:\\project\\.cache\\audio\\projects\\uuid\\scene-1.mp3';

      // When: Checking for suspicious patterns
      const result = containsSuspiciousPatterns(windowsPath);

      // Then: Should detect backslashes
      expect(result).toBe(true);
    });

    it('[SEC-053] [P2] should handle mixed path separators', () => {
      // Given: Mixed separators (never should happen, but test defense)
      const mixedPath = 'path/to\\file';

      // When: Checking
      const result = containsSuspiciousPatterns(mixedPath);

      // Then: Should be flagged
      expect(result).toBe(true);
    });

    it('[SEC-054] [P2] should handle scene numbers as strings vs numbers', () => {
      // Given: Scene number as string vs number
      const sceneStr = '42';
      const sceneNum = 42;

      // When: Validating both
      const resultStr = validateSceneNumber(sceneStr);
      const resultNum = validateSceneNumber(sceneNum);

      // Then: Both should be valid
      expect(resultStr).toBe(true);
      expect(resultNum).toBe(true);
    });
  });
});
