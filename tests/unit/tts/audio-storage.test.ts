/**
 * Unit Tests for Audio Storage Utilities
 *
 * Tests the audio file path management and validation functions to ensure
 * secure file operations and correct path generation.
 *
 * Acceptance Criteria Coverage:
 * - AC5: Audio files stored with documented schema for Story 2.2
 *
 * Task Coverage: Story 2.1, Task 13 - Unit Tests
 *
 * @module tests/unit/tts/audio-storage.test
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  getPreviewAudioPath,
  getSceneAudioPath,
  ensureAudioDirectories,
  validateAudioPath,
  getAbsoluteAudioPath,
  cleanupOldProjectAudio
} from '@/lib/utils/audio-storage';

describe('Audio Storage - Unit Tests', () => {
  describe('AC5: Audio File Path Management', () => {
    describe('Preview Audio Path Generation', () => {
      it('should generate correct preview audio path', () => {
        // Given: A voice ID
        const voiceId = 'sarah';
        // When: Generating preview path
        const audioPath = getPreviewAudioPath(voiceId);
        // Then: Should follow correct format
        expect(audioPath).toBe('.cache/audio/previews/sarah.mp3');
        expect(audioPath).toMatch(/^\.cache\/audio\/previews\/[a-z]+\.mp3$/);
      });

      it('should handle various voice ID formats', () => {
        // Given: Different voice ID formats
        const voiceIds = ['sarah', 'james-uk', 'voice_123', 'test-voice'];
        // When: Generating paths
        const paths = voiceIds.map(getPreviewAudioPath);
        // Then: All should follow pattern
        paths.forEach((p, i) => {
          expect(p).toBe(`.cache/audio/previews/${voiceIds[i]}.mp3`);
          expect(p).toContain('.cache/audio/previews/');
          expect(p).toEndWith('.mp3');
        });
      });

      it('should use relative paths from project root', () => {
        // Given: Any voice ID
        const voiceId = 'test';
        // When: Getting path
        const audioPath = getPreviewAudioPath(voiceId);
        // Then: Should be relative, not absolute
        expect(path.isAbsolute(audioPath)).toBe(false);
        expect(audioPath).toStartWith('.cache/');
      });
    });

    describe('Scene Audio Path Generation', () => {
      it('should generate correct scene audio path', () => {
        // Given: Project ID and scene number
        const projectId = 'proj-123';
        const sceneNumber = 1;
        // When: Generating scene path
        const audioPath = getSceneAudioPath(projectId, sceneNumber);
        // Then: Should follow correct format
        expect(audioPath).toBe('.cache/audio/projects/proj-123/scene-1.mp3');
      });

      it('should handle different scene numbers correctly', () => {
        // Given: Various scene numbers
        const projectId = 'test-project';
        const sceneNumbers = [1, 2, 10, 99, 100];
        // When: Generating paths
        const paths = sceneNumbers.map(n => getSceneAudioPath(projectId, n));
        // Then: Should have correct numbering
        expect(paths[0]).toBe('.cache/audio/projects/test-project/scene-1.mp3');
        expect(paths[1]).toBe('.cache/audio/projects/test-project/scene-2.mp3');
        expect(paths[2]).toBe('.cache/audio/projects/test-project/scene-10.mp3');
        expect(paths[3]).toBe('.cache/audio/projects/test-project/scene-99.mp3');
        expect(paths[4]).toBe('.cache/audio/projects/test-project/scene-100.mp3');
      });

      it('should handle UUID project IDs', () => {
        // Given: UUID format project ID
        const projectId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
        const sceneNumber = 1;
        // When: Generating path
        const audioPath = getSceneAudioPath(projectId, sceneNumber);
        // Then: Should handle UUID correctly
        expect(audioPath).toBe(`.cache/audio/projects/${projectId}/scene-1.mp3`);
      });

      it('should use 1-indexed scene numbers', () => {
        // Given: Scene numbers starting from 1
        const projectId = 'test';
        // When: Generating paths
        const scene1 = getSceneAudioPath(projectId, 1);
        const scene2 = getSceneAudioPath(projectId, 2);
        // Then: Should use 1-based indexing
        expect(scene1).toContain('scene-1.mp3');
        expect(scene2).toContain('scene-2.mp3');
        // Should not use 0-based indexing
        expect(() => getSceneAudioPath(projectId, 0)).toThrow();
      });
    });

    describe('Path Validation Security', () => {
      it('should validate paths within cache directory', () => {
        // Given: Valid paths within .cache/audio/
        const validPaths = [
          '.cache/audio/previews/voice.mp3',
          '.cache/audio/projects/123/scene-1.mp3',
          '.cache/audio/test.mp3'
        ];
        // When: Validating paths
        // Then: All should be valid
        validPaths.forEach(p => {
          expect(validateAudioPath(p)).toBe(true);
        });
      });

      it('should prevent directory traversal attacks', () => {
        // Given: Malicious paths attempting traversal
        const maliciousPaths = [
          '../../../etc/passwd',
          '.cache/audio/../../sensitive.txt',
          '.cache/audio/../../../root/.ssh/id_rsa',
          '..\\..\\windows\\system32\\config',
          '.cache/audio/previews/../../../etc/hosts'
        ];
        // When: Validating paths
        // Then: All should be rejected
        maliciousPaths.forEach(p => {
          expect(() => validateAudioPath(p)).toThrow(/Invalid audio path/);
        });
      });

      it('should reject absolute paths', () => {
        // Given: Absolute paths
        const absolutePaths = [
          '/etc/passwd',
          'C:\\Windows\\System32\\config',
          '/home/user/.ssh/keys',
          'D:\\sensitive\\data.txt'
        ];
        // When: Validating paths
        // Then: Should be rejected
        absolutePaths.forEach(p => {
          expect(() => validateAudioPath(p)).toThrow(/Invalid audio path/);
        });
      });

      it('should reject paths outside cache directory', () => {
        // Given: Paths outside .cache/audio/
        const outsidePaths = [
          'audio/test.mp3',
          'src/lib/test.mp3',
          'public/audio/test.mp3',
          'test.mp3'
        ];
        // When: Validating paths
        // Then: Should be rejected
        outsidePaths.forEach(p => {
          expect(() => validateAudioPath(p)).toThrow(/Invalid audio path/);
        });
      });

      it('should handle path normalization', () => {
        // Given: Paths with redundant segments
        const paths = [
          '.cache/audio//previews/voice.mp3',
          '.cache/audio/./previews/voice.mp3',
          '.cache\\audio\\previews\\voice.mp3'
        ];
        // When: Validating normalized paths
        // Then: Should be valid after normalization
        paths.forEach(p => {
          expect(validateAudioPath(p)).toBe(true);
        });
      });
    });

    describe('Absolute Path Resolution', () => {
      it('should convert relative to absolute path', () => {
        // Given: Relative path
        const relativePath = '.cache/audio/previews/test.mp3';
        // When: Getting absolute path
        const absolutePath = getAbsoluteAudioPath(relativePath);
        // Then: Should be absolute
        expect(path.isAbsolute(absolutePath)).toBe(true);
        expect(absolutePath).toContain('.cache');
        expect(absolutePath).toContain('audio');
        expect(absolutePath).toContain('previews');
        expect(absolutePath).toContain('test.mp3');
      });

      it('should resolve from current working directory', () => {
        // Given: CWD and relative path
        const cwd = process.cwd();
        const relativePath = '.cache/audio/test.mp3';
        // When: Getting absolute path
        const absolutePath = getAbsoluteAudioPath(relativePath);
        // Then: Should be based on CWD
        expect(absolutePath).toStartWith(cwd);
        expect(absolutePath).toBe(path.resolve(cwd, relativePath));
      });

      it('should validate path before resolving', () => {
        // Given: Invalid relative path
        const invalidPath = '../../../etc/passwd';
        // When: Attempting to get absolute path
        // Then: Should throw validation error
        expect(() => getAbsoluteAudioPath(invalidPath)).toThrow(/Invalid audio path/);
      });
    });

    describe('Directory Creation', () => {
      // Mock fs operations for testing
      const mockDirs: Set<string> = new Set();

      beforeEach(() => {
        // Mock fs.mkdir
        jest.spyOn(fs, 'mkdir').mockImplementation(async (dir: any) => {
          mockDirs.add(dir.toString());
          return undefined;
        });
      });

      afterEach(() => {
        jest.restoreAllMocks();
        mockDirs.clear();
      });

      it('should create required audio directories', async () => {
        // Given: Directory creation requirement
        // When: Ensuring directories exist
        await ensureAudioDirectories();
        // Then: Should create preview and projects directories
        expect(mockDirs.has(path.resolve('.cache/audio/previews'))).toBe(true);
        expect(mockDirs.has(path.resolve('.cache/audio/projects'))).toBe(true);
      });

      it('should create project-specific directory on demand', async () => {
        // Given: A project ID
        const projectId = 'test-project-123';
        // When: Ensuring project directory
        await ensureAudioDirectories(projectId);
        // Then: Should create project directory
        expect(mockDirs.has(path.resolve(`.cache/audio/projects/${projectId}`))).toBe(true);
      });

      it('should handle existing directories gracefully', async () => {
        // Given: Directories might already exist
        // Mock mkdir to simulate EEXIST error
        jest.spyOn(fs, 'mkdir').mockRejectedValueOnce({ code: 'EEXIST' } as any);
        // When: Ensuring directories
        // Then: Should not throw
        await expect(ensureAudioDirectories()).resolves.not.toThrow();
      });
    });

    describe('Schema Compliance', () => {
      it('should follow Story 2.2 schema requirements', () => {
        // Given: Schema requirements from Story 2.1 Task 5
        const projectId = 'abc123';
        const sceneNumber = 1;
        // When: Generating path
        const scenePath = getSceneAudioPath(projectId, sceneNumber);
        // Then: Should match schema format
        // Format: .cache/audio/projects/{projectId}/scene-{sceneNumber}.mp3
        expect(scenePath).toMatch(/^\.cache\/audio\/projects\/[^/]+\/scene-\d+\.mp3$/);
        expect(scenePath).toBe(`.cache/audio/projects/${projectId}/scene-${sceneNumber}.mp3`);
      });

      it('should use relative paths as per schema', () => {
        // Given: Schema requirement for relative paths
        const paths = [
          getPreviewAudioPath('test'),
          getSceneAudioPath('project', 1)
        ];
        // When: Checking paths
        // Then: All should be relative
        paths.forEach(p => {
          expect(path.isAbsolute(p)).toBe(false);
          expect(p).toStartWith('.cache/');
        });
      });

      it('should follow naming conventions', () => {
        // Given: Naming convention requirements
        // When: Generating various paths
        const preview = getPreviewAudioPath('sarah');
        const scene = getSceneAudioPath('proj', 5);
        // Then: Should follow conventions
        expect(preview).toMatch(/previews\/[a-z-]+\.mp3$/);
        expect(scene).toMatch(/scene-\d+\.mp3$/);
      });
    });

    describe('Audio Cleanup Policy', () => {
      it('should never delete preview audio', async () => {
        // Given: Preview audio path
        const previewPath = getPreviewAudioPath('sarah');
        // When: Running cleanup
        const shouldDelete = await cleanupOldProjectAudio(previewPath, 0);
        // Then: Should never delete previews
        expect(shouldDelete).toBe(false);
      });

      it('should identify old project audio for deletion', async () => {
        // Given: Project audio older than 30 days
        const projectPath = getSceneAudioPath('old-project', 1);
        const daysSinceAccess = 31;
        // When: Checking if should delete
        const shouldDelete = await cleanupOldProjectAudio(projectPath, daysSinceAccess);
        // Then: Should mark for deletion
        expect(shouldDelete).toBe(true);
      });

      it('should keep recent project audio', async () => {
        // Given: Project audio accessed recently
        const projectPath = getSceneAudioPath('recent-project', 1);
        const daysSinceAccess = 15;
        // When: Checking if should delete
        const shouldDelete = await cleanupOldProjectAudio(projectPath, daysSinceAccess);
        // Then: Should keep
        expect(shouldDelete).toBe(false);
      });

      it('should use 30-day threshold by default', async () => {
        // Given: Default cleanup policy
        const projectPath = getSceneAudioPath('project', 1);
        // When: Checking with exactly 30 days
        const shouldDelete30 = await cleanupOldProjectAudio(projectPath, 30);
        const shouldDelete31 = await cleanupOldProjectAudio(projectPath, 31);
        // Then: Should delete after 30 days
        expect(shouldDelete30).toBe(false);
        expect(shouldDelete31).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid scene numbers', () => {
      // Given: Invalid scene numbers
      const projectId = 'test';
      // When/Then: Should throw for invalid numbers
      expect(() => getSceneAudioPath(projectId, 0)).toThrow();
      expect(() => getSceneAudioPath(projectId, -1)).toThrow();
      expect(() => getSceneAudioPath(projectId, 0.5)).toThrow();
      expect(() => getSceneAudioPath(projectId, NaN)).toThrow();
    });

    it('should handle empty or invalid IDs', () => {
      // Given: Invalid IDs
      // When/Then: Should throw
      expect(() => getPreviewAudioPath('')).toThrow();
      expect(() => getSceneAudioPath('', 1)).toThrow();
      expect(() => getPreviewAudioPath(null as any)).toThrow();
      expect(() => getSceneAudioPath(undefined as any, 1)).toThrow();
    });

    it('should handle special characters in IDs safely', () => {
      // Given: IDs with special characters
      const voiceId = 'voice-123_test';
      const projectId = 'proj_abc-123';
      // When: Generating paths
      const previewPath = getPreviewAudioPath(voiceId);
      const scenePath = getSceneAudioPath(projectId, 1);
      // Then: Should handle safely
      expect(previewPath).toBe(`.cache/audio/previews/${voiceId}.mp3`);
      expect(scenePath).toBe(`.cache/audio/projects/${projectId}/scene-1.mp3`);
    });
  });
});