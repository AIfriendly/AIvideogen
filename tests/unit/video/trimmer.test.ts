// Unit tests for Video Trimmer
// Story 5.2: Scene Video Trimming & Preparation

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Trimmer } from '@/lib/video/trimmer';
import { FFmpegClient } from '@/lib/video/ffmpeg';
import { AssemblyScene } from '@/types/assembly';
import * as fs from 'fs';

// Mock fs module with importOriginal
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

// Mock FFmpegClient
vi.mock('@/lib/video/ffmpeg', () => ({
  FFmpegClient: vi.fn().mockImplementation(() => ({
    getVideoDuration: vi.fn(),
    getAudioDuration: vi.fn(),
    trimVideo: vi.fn(),
    loopVideo: vi.fn(),
  })),
}));

// Get reference to the mocked function
const mockExistsSync = vi.mocked(fs.existsSync);

describe('Trimmer [5.2-UNIT]', () => {
  let trimmer: Trimmer;
  let mockFfmpeg: {
    getVideoDuration: ReturnType<typeof vi.fn>;
    getAudioDuration: ReturnType<typeof vi.fn>;
    trimVideo: ReturnType<typeof vi.fn>;
    loopVideo: ReturnType<typeof vi.fn>;
  };

  const createScene = (overrides: Partial<AssemblyScene> = {}): AssemblyScene => ({
    sceneId: 'scene-1',
    sceneNumber: 1,
    scriptText: 'Test script',
    audioFilePath: '/path/to/audio.mp3',
    selectedClipId: 'clip-1',
    videoId: 'video-1',
    clipDuration: 10,
    defaultSegmentPath: '/path/to/video.mp4',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockFfmpeg = {
      getVideoDuration: vi.fn(),
      getAudioDuration: vi.fn(),
      trimVideo: vi.fn(),
      loopVideo: vi.fn(),
    };

    trimmer = new Trimmer(mockFfmpeg as unknown as FFmpegClient);

    // Default: files exist
    mockExistsSync.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('trimScene', () => {
    describe('normal trim operations [P1]', () => {
      it('[5.2-UNIT-001] should trim video longer than audio duration (AC1)', async () => {
        const scene = createScene({ duration: 10 });
        mockFfmpeg.getVideoDuration.mockResolvedValue(30);

        const result = await trimmer.trimScene(scene, '/output');

        expect(mockFfmpeg.trimVideo).toHaveBeenCalledWith(
          scene.video_path,
          10,
          '/output/scene-1-trimmed.mp4'
        );
        expect(result).toBe('/output/scene-1-trimmed.mp4');
      });

      it('[5.2-UNIT-002] should handle exact duration match within tolerance (AC1)', async () => {
        const scene = createScene({ duration: 10 });
        mockFfmpeg.getVideoDuration.mockResolvedValue(10.3); // Within 0.5s tolerance

        await trimmer.trimScene(scene, '/output');

        expect(mockFfmpeg.trimVideo).toHaveBeenCalledWith(
          scene.video_path,
          10,
          '/output/scene-1-trimmed.mp4'
        );
        expect(mockFfmpeg.loopVideo).not.toHaveBeenCalled();
      });

      it('[5.2-UNIT-003] should use correct output path format (AC2)', async () => {
        const scene = createScene({ sceneNumber: 3, clipDuration: 15 });
        mockFfmpeg.getVideoDuration.mockResolvedValue(20);

        const result = await trimmer.trimScene(scene, '/custom/output');

        expect(result).toBe('/custom/output/scene-3-trimmed.mp4');
      });
    });

    describe('edge cases - short videos [P1]', () => {
      it('[5.2-UNIT-004] should loop video when shorter than audio duration (AC5)', async () => {
        const scene = createScene({ clipDuration: 15 });
        mockFfmpeg.getVideoDuration.mockResolvedValue(5);

        await trimmer.trimScene(scene, '/output');

        expect(mockFfmpeg.loopVideo).toHaveBeenCalledWith(
          scene.defaultSegmentPath,
          15,
          5,
          '/output/scene-1-trimmed.mp4'
        );
        expect(mockFfmpeg.trimVideo).not.toHaveBeenCalled();
      });

      it('[5.2-UNIT-005] should handle very short video with multiple loops needed (AC5)', async () => {
        const scene = createScene({ clipDuration: 30 });
        mockFfmpeg.getVideoDuration.mockResolvedValue(2);

        await trimmer.trimScene(scene, '/output');

        expect(mockFfmpeg.loopVideo).toHaveBeenCalledWith(
          scene.defaultSegmentPath,
          30,
          2,
          '/output/scene-1-trimmed.mp4'
        );
      });
    });

    describe('error handling [P0]', () => {
      it('[5.2-UNIT-006] should throw error for missing input file (AC6)', async () => {
        const scene = createScene({ defaultSegmentPath: '/missing/video.mp4' });
        mockExistsSync.mockReturnValue(false);

        await expect(trimmer.trimScene(scene, '/output')).rejects.toThrow(
          'Video file not found: /missing/video.mp4'
        );

        expect(mockFfmpeg.trimVideo).not.toHaveBeenCalled();
      });

      it('[5.2-UNIT-007] should throw error when output not created (AC6)', async () => {
        const scene = createScene({ clipDuration: 10 });
        mockFfmpeg.getVideoDuration.mockResolvedValue(20);

        // Input exists, output doesn't
        mockExistsSync
          .mockReturnValueOnce(true)  // Input check
          .mockReturnValueOnce(false); // Output check

        await expect(trimmer.trimScene(scene, '/output')).rejects.toThrow(
          'Trimmed output not created'
        );
      });

      it('[5.2-UNIT-008] should include scene number in error messages (AC6)', async () => {
        const scene = createScene({ sceneNumber: 5, defaultSegmentPath: '/bad/path.mp4' });
        mockExistsSync.mockReturnValue(false);

        await expect(trimmer.trimScene(scene, '/output')).rejects.toThrow(
          /scene 5/i
        );
      });
    });

    describe('duration validation [P2]', () => {
      it('[5.2-UNIT-009] should validate output duration matches expected', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const scene = createScene({ duration: 10 });
        mockFfmpeg.getVideoDuration
          .mockResolvedValueOnce(30)  // Input duration
          .mockResolvedValueOnce(12); // Output duration (mismatched)

        await trimmer.trimScene(scene, '/output');

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('duration mismatch')
        );

        consoleSpy.mockRestore();
      });

      it('[5.2-UNIT-010] should not warn when output duration is within tolerance', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const scene = createScene({ duration: 10 });
        mockFfmpeg.getVideoDuration
          .mockResolvedValueOnce(30)    // Input duration
          .mockResolvedValueOnce(10.2); // Output duration (within tolerance)

        await trimmer.trimScene(scene, '/output');

        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });
  });

  describe('trimScenes (batch) [P1]', () => {
    it('[5.2-UNIT-011] should trim multiple scenes in sequence (AC3)', async () => {
      const scenes = [
        createScene({ sceneNumber: 1, clipDuration: 10 }),
        createScene({ sceneNumber: 2, clipDuration: 15 }),
        createScene({ sceneNumber: 3, clipDuration: 8 }),
      ];

      mockFfmpeg.getVideoDuration.mockResolvedValue(30);

      const results = await trimmer.trimScenes(scenes, '/output');

      expect(results).toHaveLength(3);
      expect(results[0]).toBe('/output/scene-1-trimmed.mp4');
      expect(results[1]).toBe('/output/scene-2-trimmed.mp4');
      expect(results[2]).toBe('/output/scene-3-trimmed.mp4');
    });

    it('[5.2-UNIT-012] should call progress callback for each scene (AC4)', async () => {
      const scenes = [
        createScene({ sceneNumber: 1 }),
        createScene({ sceneNumber: 2 }),
      ];

      mockFfmpeg.getVideoDuration.mockResolvedValue(30);

      const progressFn = vi.fn();
      await trimmer.trimScenes(scenes, '/output', progressFn);

      expect(progressFn).toHaveBeenCalledTimes(2);
      expect(progressFn).toHaveBeenNthCalledWith(1, 1, 2);
      expect(progressFn).toHaveBeenNthCalledWith(2, 2, 2);
    });
  });

  describe('trimSceneWithDetails [P2]', () => {
    it('[5.2-UNIT-013] should return detailed trim result', async () => {
      const scene = createScene({ clipDuration: 10 });
      mockFfmpeg.getVideoDuration
        .mockResolvedValueOnce(25)  // Original duration
        .mockResolvedValueOnce(10); // Output validation

      const result = await trimmer.trimSceneWithDetails(scene, '/output');

      expect(result).toEqual({
        outputPath: '/output/scene-1-trimmed.mp4',
        originalDuration: 25,
        trimmedDuration: 10,
        wasLooped: false,
      });
    });

    it('[5.2-UNIT-014] should indicate when video was looped (AC5)', async () => {
      const scene = createScene({ clipDuration: 20 });
      mockFfmpeg.getVideoDuration
        .mockResolvedValueOnce(5)   // Original duration (short)
        .mockResolvedValueOnce(20); // Output validation

      const result = await trimmer.trimSceneWithDetails(scene, '/output');

      expect(result.wasLooped).toBe(true);
      expect(result.originalDuration).toBe(5);
    });
  });
});
