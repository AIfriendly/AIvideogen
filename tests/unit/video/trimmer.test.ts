// Unit tests for Video Trimmer
// Story 5.2: Scene Video Trimming & Preparation

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Trimmer } from '../../../lib/video/trimmer';
import { FFmpegClient } from '../../../lib/video/ffmpeg';
import { AssemblyScene } from '../../../src/types/assembly';
import * as fs from 'fs';

// Mock fs module with importOriginal
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

// Get reference to the mocked function
const mockExistsSync = vi.mocked(fs.existsSync);

// Mock FFmpegClient
vi.mock('../../../lib/video/ffmpeg', () => ({
  FFmpegClient: vi.fn().mockImplementation(() => ({
    getVideoDuration: vi.fn(),
    getAudioDuration: vi.fn(),
    trimVideo: vi.fn(),
    loopVideo: vi.fn(),
  })),
}));

describe('Trimmer', () => {
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
    describe('normal trim operations', () => {
      it('should trim video longer than audio duration', async () => {
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

      it('should handle exact duration match within tolerance', async () => {
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

      it('should use correct output path format', async () => {
        const scene = createScene({ sceneNumber: 3, clipDuration: 15 });
        mockFfmpeg.getVideoDuration.mockResolvedValue(20);

        const result = await trimmer.trimScene(scene, '/custom/output');

        expect(result).toBe('/custom/output/scene-3-trimmed.mp4');
      });
    });

    describe('edge cases - short videos', () => {
      it('should loop video when shorter than audio duration', async () => {
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

      it('should handle very short video with multiple loops needed', async () => {
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

    describe('error handling', () => {
      it('should throw error for missing input file', async () => {
        const scene = createScene({ defaultSegmentPath: '/missing/video.mp4' });
        mockExistsSync.mockReturnValue(false);

        await expect(trimmer.trimScene(scene, '/output')).rejects.toThrow(
          'Video file not found: /missing/video.mp4'
        );

        expect(mockFfmpeg.trimVideo).not.toHaveBeenCalled();
      });

      it('should throw error when output not created', async () => {
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

      it('should include scene number in error messages', async () => {
        const scene = createScene({ sceneNumber: 5, defaultSegmentPath: '/bad/path.mp4' });
        mockExistsSync.mockReturnValue(false);

        await expect(trimmer.trimScene(scene, '/output')).rejects.toThrow(
          /scene 5/i
        );
      });
    });

    describe('duration validation', () => {
      it('should validate output duration matches expected', async () => {
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

      it('should not warn when output duration is within tolerance', async () => {
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

  describe('trimScenes (batch)', () => {
    it('should trim multiple scenes in sequence', async () => {
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

    it('should call progress callback for each scene', async () => {
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

  describe('trimSceneWithDetails', () => {
    it('should return detailed trim result', async () => {
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

    it('should indicate when video was looped', async () => {
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
