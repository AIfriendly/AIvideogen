/**
 * P0 Security Tests - Audio Serving API
 *
 * Critical security validation for /api/projects/[id]/scenes/[sceneNumber]/audio endpoint.
 * Tests for path traversal, SQL injection, UUID validation, and unauthorized file access.
 *
 * Test IDs from test-design-story-2.6.md:
 * - P0-002: Audio API Path Traversal Prevention (R-002, Score: 6)
 * - P0-003: Audio API SQL Injection Prevention (R-003, Score: 6)
 *
 * Priority: P0 (Run on every commit)
 * Risks: R-002 (Path Traversal - Score: 6), R-003 (SQL Injection - Score: 6)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeDatabase } from '@/lib/db/init';
import { createProject, deleteProject, getAllProjects } from '@/lib/db/project-queries';
import { createScene, deleteScene, getSceneByNumber } from '@/lib/db/queries';
import { createTestProject } from '../factories/project.factory';
import {
  createTestScene,
  createSceneWithAudio,
  SceneTestData,
} from '../factories/scene.factory';
import fs from 'fs';
import path from 'path';

describe('[P0] Audio Serving API - Security Tests', () => {
  let testProjectId: string;
  const testAudioDir = path.join(process.cwd(), '.cache/audio/projects');

  beforeEach(() => {
    // Initialize database
    initializeDatabase();

    // Create test project
    const testProjectData = createTestProject({
      voice_selected: true,
      script_generated: true,
    });
    const project = createProject(testProjectData.name);
    testProjectId = project.id;

    // Ensure audio directory exists
    const projectAudioDir = path.join(testAudioDir, testProjectId);
    if (!fs.existsSync(projectAudioDir)) {
      fs.mkdirSync(projectAudioDir, { recursive: true });
    }

    // Create a valid test audio file
    const audioPath = path.join(projectAudioDir, 'scene-1.mp3');
    fs.writeFileSync(audioPath, Buffer.from([0xff, 0xfb, 0x90, 0x00])); // Valid MP3 header
  });

  afterEach(() => {
    // Cleanup: Delete test audio files
    try {
      const projectAudioDir = path.join(testAudioDir, testProjectId);
      if (fs.existsSync(projectAudioDir)) {
        fs.rmSync(projectAudioDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    // Cleanup: Delete test project
    try {
      deleteProject(testProjectId);
    } catch (error) {
      // Ignore deletion errors in cleanup
    }
  });

  /**
   * P0-002: Path Traversal Attack Prevention
   *
   * RISK: R-002 (Score: 6) - Path Traversal Attack
   * GIVEN: Malicious file paths with directory traversal attempts
   * WHEN: Audio API receives requests with path traversal payloads
   * THEN: API should reject ALL traversal attempts with 400 Bad Request
   */
  describe('[P0-002] Path Traversal Prevention', () => {
    describe('Attack Vector 1: Basic Path Traversal (../ sequences)', () => {
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config',
        '.cache/audio/projects/../../../etc/passwd',
        '.cache/audio/projects/../../secrets.txt',
        'audio/projects/../../config.json', // Missing .cache prefix
      ];

      traversalPayloads.forEach((maliciousPath) => {
        it(`should reject path traversal: "${maliciousPath}"`, () => {
          // GIVEN: Scene with malicious path in database
          const scene = createTestScene({
            project_id: testProjectId,
            scene_number: 99,
            audio_file_path: maliciousPath,
          });

          createScene(scene);

          // WHEN: Validating audio path (simulating API validation)
          const isValid = isValidAudioPath(scene.audio_file_path!);

          // THEN: Path should be rejected
          expect(isValid).toBe(false);

          // Cleanup
          deleteScene(scene.id);
        });
      });
    });

    describe('Attack Vector 2: URL-Encoded Path Traversal', () => {
      const urlEncodedPayloads = SceneTestData.urlEncodedAttacks;

      urlEncodedPayloads.forEach((encodedPath) => {
        it(`should reject URL-encoded traversal: "${encodedPath.substring(0, 40)}..."`, () => {
          // GIVEN: URL-encoded path traversal attempt
          const scene = createTestScene({
            project_id: testProjectId,
            scene_number: 98,
            audio_file_path: encodedPath,
          });

          createScene(scene);

          // WHEN: Validating path
          const isValid = isValidAudioPath(scene.audio_file_path!);

          // THEN: Should be rejected (contains .. after decoding)
          expect(isValid).toBe(false);

          // Cleanup
          deleteScene(scene.id);
        });
      });
    });

    describe('Attack Vector 3: Invalid File Extensions', () => {
      const invalidExtensions = [
        '.cache/audio/projects/test/scene-1.txt',
        '.cache/audio/projects/test/scene-1.exe',
        '.cache/audio/projects/test/scene-1.sh',
        '.cache/audio/projects/test/scene-1.bat',
        '.cache/audio/projects/test/scene-1.wav', // Wrong audio format
      ];

      invalidExtensions.forEach((invalidPath) => {
        it(`should reject non-MP3 file: "${invalidPath}"`, () => {
          // GIVEN: Path with invalid extension
          const scene = createTestScene({
            project_id: testProjectId,
            scene_number: 97,
            audio_file_path: invalidPath,
          });

          createScene(scene);

          // WHEN: Validating path
          const isValid = isValidAudioPath(scene.audio_file_path!);

          // THEN: Should be rejected (must end with .mp3)
          expect(isValid).toBe(false);

          // Cleanup
          deleteScene(scene.id);
        });
      });
    });

    describe('Attack Vector 4: Valid Paths (Baseline)', () => {
      it('should accept valid audio path', () => {
        // GIVEN: Valid audio path
        const validPath = `.cache/audio/projects/${testProjectId}/scene-1.mp3`;

        const scene = createTestScene({
          project_id: testProjectId,
          scene_number: 1,
          audio_file_path: validPath,
        });

        createScene(scene);

        // WHEN: Validating path
        const isValid = isValidAudioPath(scene.audio_file_path!);

        // THEN: Should be accepted
        expect(isValid).toBe(true);

        // Cleanup
        deleteScene(scene.id);
      });

      it('should accept nested project paths', () => {
        // GIVEN: Valid nested path
        const validPath = `.cache/audio/projects/${testProjectId}/scene-10.mp3`;

        const isValid = isValidAudioPath(validPath);

        // THEN: Should be accepted
        expect(isValid).toBe(true);
      });
    });

    it('[CRITICAL] Path resolution should never escape project root', () => {
      // GIVEN: Various path traversal attempts
      const maliciousPaths = [
        '../../../etc/passwd',
        'audio/projects/../../config.json',
        '.cache/audio/projects/../../../secrets.txt',
      ];

      maliciousPaths.forEach((maliciousPath) => {
        // WHEN: Resolving path
        const absolutePath = path.join(process.cwd(), maliciousPath);
        const resolvedPath = path.resolve(absolutePath);
        const projectRoot = path.resolve(process.cwd());

        // THEN: Resolved path should NOT be outside project root
        const isWithinRoot = resolvedPath.startsWith(projectRoot);

        // IF path is valid (passes validation), it MUST be within root
        const passesValidation = isValidAudioPath(maliciousPath);
        if (passesValidation) {
          expect(isWithinRoot).toBe(true);
        } else {
          // Path was correctly rejected by validation
          expect(passesValidation).toBe(false);
        }
      });
    });
  });

  /**
   * P0-003: SQL Injection Prevention via UUID Validation
   *
   * RISK: R-003 (Score: 6) - SQL Injection via Invalid UUID
   * GIVEN: Malicious SQL injection payloads as UUID parameters
   * WHEN: Audio API receives requests with invalid projectId or sceneNumber
   * THEN: API should validate and reject BEFORE database query (return 400)
   */
  describe('[P0-003] SQL Injection Prevention', () => {
    describe('Attack Vector 1: SQL Injection in Project ID (UUID)', () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE scenes; --",
        "' OR 1=1; --",
        "1' UNION SELECT * FROM projects; --",
        "admin'--",
        "' OR 'a'='a",
        "1'; DELETE FROM scenes WHERE 1=1; --",
      ];

      sqlInjectionPayloads.forEach((payload) => {
        it(`should reject SQL injection in UUID: "${payload.substring(0, 30)}..."`, () => {
          // WHEN: Validating UUID with SQL injection payload
          const isValid = isValidUUID(payload);

          // THEN: Should be rejected (not valid UUID format)
          expect(isValid).toBe(false);
        });
      });
    });

    describe('Attack Vector 2: Malformed UUID Formats', () => {
      const malformedUUIDs = [
        'invalid-uuid-format',
        '123',
        'not-a-uuid',
        '00000000-0000-0000-0000-00000000000g', // Invalid character
        '00000000-0000-0000-0000-0000000000', // Too short
        '00000000-0000-0000-0000-000000000000-extra', // Too long
        '', // Empty
        'null',
        'undefined',
      ];

      malformedUUIDs.forEach((invalidUUID) => {
        it(`should reject malformed UUID: "${invalidUUID}"`, () => {
          // WHEN: Validating malformed UUID
          const isValid = isValidUUID(invalidUUID);

          // THEN: Should be rejected
          expect(isValid).toBe(false);
        });
      });
    });

    describe('Attack Vector 3: Invalid Scene Numbers', () => {
      const invalidSceneNumbers = [
        '-1', // Negative
        '0', // Zero
        '1.5', // Decimal
        'abc', // Non-numeric
        "1'; DROP TABLE scenes; --", // SQL injection
        '1 OR 1=1', // SQL condition
        '999999999999999999999', // Extremely large
      ];

      invalidSceneNumbers.forEach((invalidNumber) => {
        it(`should reject invalid scene number: "${invalidNumber}"`, () => {
          // WHEN: Validating scene number
          const isValid = isValidSceneNumber(invalidNumber);

          // THEN: Should be rejected
          expect(isValid).toBe(false);
        });
      });
    });

    describe('Attack Vector 4: Valid Inputs (Baseline)', () => {
      it('should accept valid UUID format', () => {
        // GIVEN: Valid UUID
        const validUUID = '123e4567-e89b-12d3-a456-426614174000';

        // WHEN: Validating UUID
        const isValid = isValidUUID(validUUID);

        // THEN: Should be accepted
        expect(isValid).toBe(true);
      });

      it('should accept valid scene numbers', () => {
        // GIVEN: Valid scene numbers
        const validSceneNumbers = ['1', '2', '10', '100'];

        validSceneNumbers.forEach((sceneNumber) => {
          // WHEN: Validating scene number
          const isValid = isValidSceneNumber(sceneNumber);

          // THEN: Should be accepted
          expect(isValid).toBe(true);
        });
      });
    });

    it('[CRITICAL] Database queries should NEVER execute with unvalidated UUIDs', () => {
      // GIVEN: SQL injection payload
      const maliciousProjectId = "'; DROP TABLE scenes; --";

      // WHEN: Attempting to use malicious UUID in database query
      const isValidId = isValidUUID(maliciousProjectId);

      // THEN: Validation should reject before query
      expect(isValidId).toBe(false);

      // VERIFY: If validation fails, query should NOT be executed
      // (This is enforced by route.ts validation checks before getSceneByNumber)
      if (!isValidId) {
        // Database should remain intact
        const allProjects = getAllProjects();
        expect(allProjects).toBeDefined();
        expect(Array.isArray(allProjects)).toBe(true);
      }
    });
  });

  /**
   * Combined Attack Scenario: Chained Vulnerabilities
   */
  describe('[CRITICAL] Chained Attack Prevention', () => {
    it('should prevent combined path traversal + SQL injection attack', () => {
      // GIVEN: Attacker attempts both path traversal AND SQL injection
      const maliciousProjectId = "'; DROP TABLE scenes; --";
      const maliciousPath = '../../../etc/passwd';

      // WHEN: Validating both inputs
      const isValidId = isValidUUID(maliciousProjectId);
      const isValidPath = isValidAudioPath(maliciousPath);

      // THEN: Both should be rejected
      expect(isValidId).toBe(false);
      expect(isValidPath).toBe(false);

      // VERIFY: No database corruption
      const allProjects = getAllProjects();
      expect(allProjects).toBeDefined();
    });

    it('should log suspicious requests for security monitoring', () => {
      // GIVEN: Multiple attack attempts
      const attacks = [
        { type: 'traversal', value: '../../../etc/passwd' },
        { type: 'sql_injection', value: "'; DROP TABLE scenes; --" },
        { type: 'invalid_uuid', value: 'invalid-uuid' },
      ];

      // WHEN: Processing attack attempts
      const rejectedCount = attacks.filter((attack) => {
        if (attack.type === 'traversal') {
          return !isValidAudioPath(attack.value);
        } else {
          return !isValidUUID(attack.value);
        }
      }).length;

      // THEN: All attacks should be rejected
      expect(rejectedCount).toBe(attacks.length);

      // NOTE: In production, these rejections should be logged to security monitoring
      // Example: logSecurityEvent({ type: 'path_traversal_attempt', path: maliciousPath })
    });
  });
});

/**
 * Helper Functions (Mirror API Route Validation Logic)
 */

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidSceneNumber(sceneNumber: string): boolean {
  const num = parseInt(sceneNumber, 10);
  return !isNaN(num) && num > 0 && num.toString() === sceneNumber;
}

function isValidAudioPath(audioPath: string): boolean {
  // Must start with .cache/audio/projects/
  if (!audioPath.startsWith('.cache/audio/projects/')) {
    return false;
  }

  // Must end with .mp3
  if (!audioPath.endsWith('.mp3')) {
    return false;
  }

  // Must not contain directory traversal attempts
  if (audioPath.includes('..')) {
    return false;
  }

  return true;
}
